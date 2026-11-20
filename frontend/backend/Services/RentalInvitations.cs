using CampusMate.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Nodes;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    static readonly string[] EditableRequestStates = ["draft", "waiting-roommate", "submitted", "approved", "inspection", "agreement", "payment"];
    static bool InvitationExpired(RentalRequest r) => r.InvitationStatus == "pending" && r.InvitationExpiresAt <= DateTimeOffset.UtcNow;
    static string EffectiveRequestStatus(RentalRequest r) => InvitationExpired(r) ? "draft" : r.Status;
    static void CheckTermsVersion(RentalRequest r, JsonObject body)
    {
        if (r.WorkflowVersion < 2) return;
        Need(body["version"] is JsonValue value && value.TryGetValue<int>(out var version) && version == r.TermsVersion,
            "The rental terms changed. Refresh and review the latest version before responding.");
    }
    async Task SetRoommate(RentalRequest request, string? profileId)
    {
        var previousProfile = request.RoommateId;
        var previousUser = request.RoommateUserId;
        request.RoommateId = profileId;
        request.RoommateUserId = null;
        request.InvitationStatus = null;
        request.InvitationExpiresAt = null;
        if (profileId is null) return;
        var profile = await db.RoommateProfiles.SingleOrDefaultAsync(p => p.Id == profileId && (p.Available || p.Id == previousProfile && previousUser != null));
        Need(profile is not null && profile.UserId != request.TenantId, "Choose another available roommate.", 400);
        var person = await db.Users.SingleAsync(u => u.Id == profile!.UserId);
        Need(AccountActive(person), "This roommate is unavailable.");
        request.RoommateUserId = person.Id;
        request.InvitationStatus = "pending";
        request.InvitationExpiresAt = DateTimeOffset.UtcNow.AddHours(48);
    }
    async Task SendInvitation(RentalRequest request)
    {
        if (!await db.RoommateFavorites.AnyAsync(f => f.UserId == request.TenantId && f.RoommateId == request.RoommateId))
            db.RoommateFavorites.Add(new RoommateFavorite { UserId = request.TenantId, RoommateId = request.RoommateId! });
        var home = await Property(request.PropertyId);
        var sender = await db.Users.SingleAsync(u => u.Id == request.TenantId);
        Notify(request.RoommateUserId!, "roommate-invitation",
            $"{FullName(sender)} invited you to share {home.Title}, {Date(request.StartDate)} to {Date(request.EndDate)}. Whole-home rent: JOD {request.AgreedPrice}; deposit: JOD {request.Deposit}. Review and respond within 48 hours.",
            "tenant/requests.html?id=" + request.Id, home);
    }
    public async Task FavoriteRoommate(string id, bool save)
    {
        var me = await Me("tenant");
        var favorite = await db.RoommateFavorites.SingleOrDefaultAsync(f => f.UserId == me.Id && f.RoommateId == id);
        if (save)
        {
            var profile = await db.RoommateProfiles.SingleOrDefaultAsync(p => p.Id == id && p.Available);
            Need(profile is not null && profile.UserId != me.Id, "Choose another available roommate.", 400);
            Need(AccountActive(await db.Users.SingleAsync(u => u.Id == profile!.UserId)), "This roommate is unavailable.");
            if (favorite is null) db.RoommateFavorites.Add(new RoommateFavorite { UserId = me.Id, RoommateId = id });
        }
        else if (favorite is not null) db.RoommateFavorites.Remove(favorite);
        await Save();
    }
    public async Task<object> RespondRoommateInvitation(string id, JsonObject body)
    {
        var me = await Me("tenant");
        var request = await db.RentalRequests.SingleOrDefaultAsync(r => r.Id == id);
        Need(request is not null, "Rental request not found.", 404);
        Need(request!.RoommateUserId == me.Id, "Only the invited roommate can respond.", 403);
        CheckTermsVersion(request, body);
        Need(request.Status == "waiting-roommate" && request.InvitationStatus == "pending" && !InvitationExpired(request), "This invitation was answered, cancelled or expired.");
        var accepted = Flag(body, "accepted");
        if (accepted)
        {
            await RequireBookable(await Property(request.PropertyId));
            await RequireApplicantsActive(request);
            Need(request.StartDate >= Today && await Available(await Property(request.PropertyId), request.StartDate, request.EndDate, id), "These dates are no longer available.");
        }
        request.InvitationStatus = accepted ? "accepted" : "declined";
        request.Status = accepted ? "submitted" : "draft";
        await ClearInvitationNotifications(request, me.Id);
        Notify(request.TenantId, "roommate-response", $"{FullName(me)} {(accepted ? "accepted" : "declined")} your shared rental invitation.{(accepted ? "" : " Choose another roommate or apply alone.")}", "tenant/requests.html?id=" + id);
        if (accepted)
        {
            var home = await Property(request.PropertyId);
            Notify(home.OwnerId, "rental-request", "A shared rental request is ready for your review. Both tenants agreed to apply.", "landlord/requests.html", home);
        }
        await Save();
        return await RequestDto(request);
    }
    public async Task<object> CancelRoommateInvitation(string id, JsonObject body)
    {
        var request = await Request(id, "tenant");
        Need(request.TenantId == CurrentId, "Only the request creator can cancel the invitation.", 403);
        CheckTermsVersion(request, body);
        Need(request.Status == "waiting-roommate" && request.InvitationStatus == "pending", "This invitation cannot be cancelled.");
        request.InvitationStatus = "cancelled";
        request.Status = "draft";
        await ClearInvitationNotifications(request, request.RoommateUserId!);
        Notify(request.RoommateUserId!, "roommate-cancelled", "The sender cancelled your shared rental invitation.", "tenant/requests.html?id=" + id);
        await Save();
        return await RequestDto(request);
    }
    async Task ClearInvitationNotifications(RentalRequest request, string recipientId)
    {
        var route = "tenant/requests.html?id=" + request.Id;
        foreach (var notification in await db.Notifications.Where(n => n.RecipientId == recipientId && n.Type == "roommate-invitation" && n.Route == route && !n.IsRead).ToListAsync())
            notification.IsRead = true;
    }
    public async Task<object> EditRentalRequest(string id, JsonObject body)
    {
        var request = await Request(id, "tenant");
        Need(request.TenantId == CurrentId, "Only the request creator can change the rental plan.", 403);
        Need(EditableRequestStates.Contains(request.Status) && !await db.Rentals.AnyAsync(r => r.RequestId == id), "Confirmed rental participants and dates are locked. Discuss a new arrangement with all parties.");
        CheckTermsVersion(request, body);
        request.WorkflowVersion = 2;
        var home = await Property(request.PropertyId);
        await RequireBookable(home);
        var start = Day(body, "startDate");
        var duration = Integer(body, "duration", 1, home.Period == "Daily" ? 365 : 36);
        var end = home.Period == "Daily" ? start.AddDays(duration) : start.AddMonths(duration);
        Need(start >= Today && await Available(home, start, end, id), "Choose available dates.");
        if (request.RoommateUserId is not null)
            Notify(request.RoommateUserId, "rental-terms-changed", "The rental plan changed. Your previous invitation and agreement approvals no longer apply.", "tenant/requests.html?id=" + id);
        var previouslySent = request.LandlordAccepted || request.Status == "submitted";
        request.StartDate = start; request.EndDate = end; request.Duration = duration;
        if (request.Period != home.Period) { request.AgreedPrice = home.Price; request.Deposit = home.Price; }
        request.Period = home.Period;
        request.PropertySnapshotJson = (await PropertyDto(home)).ToJsonString();
        request.Message = Text(body, "message", 2000);
        await SetRoommate(request, Flag(body, "roommate") ? Text(body, "roommateId", 64) : null);
        await ResetRequestApprovals(request);
        if (request.RoommateUserId is not null) await SendInvitation(request);
        if (previouslySent) Notify(home.OwnerId, "rental-terms-changed", "A rental request changed. Previous approvals are invalid; wait for the updated application.", "landlord/requests.html", home);
        await Save();
        return await RequestDto(request);
    }
    async Task ResetRequestApprovals(RentalRequest request)
    {
        request.TermsVersion++;
        request.LandlordAccepted = request.TenantAccepted = request.RoommateAccepted = false;
        request.AgreementSnapshotJson = null;
        request.Total = request.AgreedPrice * (request.Period == "Daily" ? request.Duration : 1) + request.Deposit;
        db.Inspections.RemoveRange(await db.Inspections.Where(i => i.RequestId == request.Id).ToListAsync());
        foreach (var proposal in await db.RentNegotiations.Where(n => n.RequestId == request.Id && n.Status == "pending").ToListAsync()) proposal.Status = "declined";
        if (request.RoommateUserId is not null)
        {
            request.InvitationStatus = "pending";
            request.InvitationExpiresAt = DateTimeOffset.UtcNow.AddHours(48);
            request.Status = "waiting-roommate";
        }
        else request.Status = "submitted";
    }
}
