using CampusMate.Models;
using System.Text.Json.Nodes;
using CampusMate.Data;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    public async Task<List<JsonObject>> Requests()
    {
        var u = await Me("tenant", "landlord"); var rows = await VisibleRequests(u).OrderByDescending(r => r.CreatedAt).ToListAsync();
        return await ProjectionList.Map(rows, RequestDto);
    }
    public async Task<object> CreateRequest(JsonObject b)
    {
        var u = await Me("tenant"); var p = await Property(Integer(b, "propertyId", 1, int.MaxValue)); Need(p.Status == "published", "This listing is not published."); Need(p.OwnerId != u.Id, "You cannot request your own property.");
        await RequireBookable(p);
        var start = Day(b, "startDate"); var duration = Integer(b, "duration", 1, p.Period == "Daily" ? 365 : 36); var end = p.Period == "Daily" ? start.AddDays(duration) : start.AddMonths(duration);
        Need(start >= Today && await Available(p, start, end), "The property is unavailable for those dates.");
        var shared = Flag(b, "roommate"); string? roommateId = null;
        if (shared) { roommateId = Text(b, "roommateId", 64); var roommate = await db.RoommateProfiles.SingleOrDefaultAsync(x => x.Id == roommateId && x.Available); Need(roommate is not null && roommate.UserId != u.Id, "Choose an available roommate.", 400); Need(AccountActive(await db.Users.SingleAsync(x => x.Id == roommate!.UserId)), "The roommate account is unavailable.", 400); }
        else Need(b["roommateId"] is null, "A roommate ID requires sharing to be enabled.", 400);
        var existing = await db.RentalRequests.FirstOrDefaultAsync(r => r.PropertyId == p.Id && r.TenantId == u.Id && new[] { "draft", "waiting-roommate", "submitted", "approved", "inspection", "agreement", "payment", "confirmed" }.Contains(r.Status));
        if (existing is not null)
        {
            Need(existing.StartDate == start && existing.Duration == duration && existing.RoommateId == roommateId, "You already have an open plan for this home. Open My requests and edit that plan so previous approvals are reset correctly.");
            return await RequestDto(existing);
        }
        var r = new RentalRequest
        {
            PropertyId = p.Id,
            TenantId = u.Id,
            RoommateId = roommateId,
            Message = Text(b, "message", 2000),
            StartDate = start,
            EndDate = end,
            Duration = duration,
            Period = p.Period,
            Status = "submitted",
            PropertySnapshotJson = (await PropertyDto(p)).ToJsonString(),
            AgreedPrice = p.Price,
            Deposit = p.Price,
            Total = p.Price * (p.Period == "Daily" ? duration : 1) + p.Price
        };
        await SetRoommate(r, roommateId);
        r.Status = shared ? "waiting-roommate" : "submitted";
        db.RentalRequests.Add(r);
        if (shared) await SendInvitation(r);
        else Notify(p.OwnerId, "rental-request", "A new rental request is ready for review.", "landlord/requests.html", p);
        Log("Rental requested: " + p.Title); await Save(); return await RequestDto(r);
    }
    public async Task<object> ReviewRequest(string id, JsonObject b)
    {
        var r = await Request(id, "landlord"); Need(r.Status == "submitted", "This request was already reviewed."); var approve = Flag(b, "approved");
        if (approve) Need(r.RoommateId is null || r.WorkflowVersion >= 2, "This older shared application needs the lead tenant to edit it and send a roommate invitation first.");
        CheckTermsVersion(r, b);
        if (approve) { await RequireApplicantsActive(r); await RequireBookable(await Property(r.PropertyId)); Need(r.RoommateUserId is null || r.InvitationStatus == "accepted", "Wait for the roommate's approval."); }
        if (approve) { Need(Flag(b, "acceptedTerms"), "Accept the rental terms.", 400); Need(r.StartDate >= Today && await Available(await Property(r.PropertyId), r.StartDate, r.EndDate, r.Id), "The requested dates are no longer available."); }
        r.Status = approve ? r.WorkflowVersion >= 2 ? "inspection" : "approved" : "rejected";
        r.LandlordAccepted = approve;
        NotifyTenants(r, approve ? "The landlord approved your application. Inspect the home before each tenant accepts the final agreement." : "The landlord declined this application.");
        Log("Rental request " + r.Status); await Save(); return await RequestDto(r);
    }
    public async Task<object> SignAgreement(string id, JsonObject b)
    {
        var r = await Request(id, "tenant"); Need(Flag(b, "accepted"), "Accept the agreement.", 400);
        Need(r.RoommateId is null || r.WorkflowVersion >= 2, "Edit this older shared application to request the roommate's consent first.");
        CheckTermsVersion(r, b);
        await RequireBookable(await Property(r.PropertyId));
        await RequireApplicantsActive(r);
        Need(r.Status == (r.WorkflowVersion >= 2 ? "agreement" : "approved") && r.LandlordAccepted, "Complete landlord approval and inspection first.");
        Need(!await db.RentNegotiations.AnyAsync(n => n.RequestId == id && n.Status == "pending"), "Wait for the pending rent proposal to be reviewed.");
        if (r.TenantId == CurrentId) r.TenantAccepted = true;
        else { Need(r.RoommateUserId == CurrentId && r.InvitationStatus == "accepted", "You are not an accepted participant.", 403); r.RoommateAccepted = true; }
        if (r.WorkflowVersion < 2) r.Status = "inspection";
        else if (r.TenantAccepted && (r.RoommateUserId is null || r.RoommateAccepted)) r.Status = "payment";
        r.AgreementSnapshotJson = Node(new { r.TermsVersion, r.PropertyId, r.TenantId, r.RoommateUserId, r.RoommateId, r.AgreedPrice, r.Deposit, r.Total, r.TenantAccepted, r.RoommateAccepted, startDate = Date(r.StartDate), endDate = Date(r.EndDate), acceptedAt = DateTimeOffset.UtcNow, property = Obj(r.PropertySnapshotJson) })!.ToJsonString();
        NotifyTenants(r, r.Status == "payment" ? "All tenants accepted the final agreement. The lead tenant can confirm the direct arrangement." : "A participant accepted the agreement. Each tenant must accept for themselves.");
        Log("Rental agreement accepted"); await Save(); return await RequestDto(r);
    }
    static string Checklist(JsonObject b)
    {
        Need(b["items"] is JsonArray a && a.Count is > 0 and <= 30, "Record the condition checklist.", 400);
        var seen = new HashSet<string>();
        foreach (var node in (JsonArray)b["items"]!) { Need(node is JsonObject, "Invalid checklist entry.", 400); var item = (JsonObject)node!; Need(seen.Add(Text(item, "name", 100)), "Duplicate checklist item.", 400); Choice(item, "condition", "Good", "Minor wear", "Needs repair"); }
        return b["items"]!.ToJsonString();
    }
    public async Task<object> Inspect(string id, JsonObject b)
    {
        var r = await Request(id, "tenant"); Need(r.TenantId == CurrentId, "The lead tenant records the pre-handover checklist.", 403);
        CheckTermsVersion(r, b);
        await RequireBookable(await Property(r.PropertyId));
        await RequireApplicantsActive(r);
        Need(r.Status == "inspection" && (r.WorkflowVersion >= 2 ? r.LandlordAccepted : r.TenantAccepted), "Complete landlord approval before inspection.");
        db.Inspections.Add(new Inspection { RequestId = id, ItemsJson = Checklist(b), Notes = Text(b, "notes", 4000, false) }); r.Status = r.WorkflowVersion >= 2 ? "agreement" : "payment";
        NotifyTenants(r, "The inspection checklist is ready. Review it and accept the final agreement individually.");
        await Save(); return await RequestDto(r);
    }
    public async Task<object> ConfirmArrangement(string id)
    {
        var r = await Request(id, "tenant"); Need(r.Status == "payment" && r.TenantAccepted && r.LandlordAccepted && await db.Inspections.AnyAsync(x => x.RequestId == id), "Complete agreement and inspection first.");
        Need(r.RoommateId is null || r.WorkflowVersion >= 2, "An older shared application cannot activate without a fresh roommate invitation.");
        Need(r.TenantId == CurrentId, "The lead tenant confirms the direct arrangement.", 403);
        Need(r.RoommateUserId is null || r.InvitationStatus == "accepted" && r.RoommateAccepted, "Every tenant must accept the final agreement.");
        await RequireBookable(await Property(r.PropertyId));
        await RequireApplicantsActive(r);
        Need(await Available(await Property(r.PropertyId), r.StartDate, r.EndDate, id), "These dates have already been booked.");
        r.Status = r.WorkflowVersion >= 2 ? "confirmed" : "active"; var rental = new Rental { RequestId = id, Status = r.WorkflowVersion >= 2 ? "upcoming" : "active", EndDate = r.EndDate, PaymentMethod = "direct-to-landlord" }; db.Rentals.Add(rental);
        NotifyTenants(r, "Your rental is confirmed and awaiting key handover. Confirm move-in after receiving the keys.");
        Notify((await Property(r.PropertyId)).OwnerId, "rental-confirmed", "The rental arrangement is confirmed. Arrange key handover with the tenants.", "landlord/bookings.html");
        Log("Direct rental arrangement confirmed"); await Save(); return new { rentalId = rental.Id };
    }
    public async Task<List<object>> Rentals()
    {
        var u = await Me("tenant", "landlord"); var rows = await db.Rentals.Where(r => db.RentalRequests.Any(q => q.Id == r.RequestId && (q.TenantId == u.Id || q.RoommateUserId == u.Id && q.InvitationStatus == "accepted" || db.Properties.Any(p => p.Id == q.PropertyId && p.OwnerId == u.Id)))).ToListAsync();
        return await ProjectionList.Map(rows, RentalDto);
    }
    public async Task<object> MoveIn(string id, JsonObject b)
    {
        var r = await RentalFor(id, "tenant"); var request = await db.RentalRequests.SingleAsync(q => q.Id == r.RequestId);
        Need(request.TenantId == CurrentId, "The lead tenant confirms key handover.", 403);
        Need(r.Status is "active" or "upcoming", "The rental is closed."); Need(Flag(b, "confirmed"), "Confirm keys and move-in.", 400); r.MoveInComplete = true; r.Status = "active"; request.Status = "active";
        NotifyTenants(request, "Key handover is confirmed. Your rental is now active.");
        Log("Move-in confirmed"); await Save(); return await RentalDto(r);
    }
    public async Task<object> SaveCondition(string id, string phase, JsonObject b)
    {
        var u = await Me("tenant", "landlord"); var r = await RentalFor(id); Need(r.Status == "active" && r.MoveInComplete, "Confirm move-in before recording reports."); Need(phase is "initial" or "final", "Invalid report phase.", 400);
        Need(u.Role == "landlord" || (await db.RentalRequests.SingleAsync(q => q.Id == r.RequestId)).TenantId == u.Id, "Only the lead tenant and property owner can update condition reports.", 403);
        if (phase == "final") Need(await db.ConditionReports.AnyAsync(x => x.RentalId == id && x.Phase == "initial"), "Record the initial report first.");
        var items = Checklist(b); await CheckMedia(b["video"], "video", true);
        var initial = await db.ConditionReports.SingleOrDefaultAsync(x => x.RentalId == id && x.Phase == "initial");
        if (phase == "final" && initial is not null) { var names = Arr(initial.ItemsJson).Select(x => x!["name"]!.ToString()).Order().ToArray(); Need(names.SequenceEqual(Arr(items).Select(x => x!["name"]!.ToString()).Order()), "Initial and final reports must use the same checklist items.", 400); }
        if (phase == "initial") Need(!await db.ConditionReports.AnyAsync(x => x.RentalId == id && x.Phase == "final"), "Initial report is locked after the final report.");
        var report = await db.ConditionReports.SingleOrDefaultAsync(x => x.RentalId == id && x.Phase == phase); if (report is null) { report = new ConditionReport { RentalId = id, Phase = phase }; db.ConditionReports.Add(report); }
        report.SubmittedBy = u.Id; report.ItemsJson = items; report.Notes = Text(b, "notes", 4000, false); report.VideoId = b["video"]!["id"]!.ToString(); report.RecordedAt = DateTimeOffset.UtcNow; Log("Condition report saved: " + phase); await Save(); return await RentalDto(r);
    }
    public async Task<object> CloseRental(string id, JsonObject b)
    {
        var r = await RentalFor(id); Need(r.Status == "active" && Flag(b, "confirmed"), "Confirm closing an active rental."); Need(await db.ConditionReports.CountAsync(x => x.RentalId == id) == 2, "Save both initial and final reports first.");
        var actor = await Me(); Need(actor.Role == "landlord" || (await db.RentalRequests.SingleAsync(q => q.Id == r.RequestId)).TenantId == actor.Id, "A co-tenant cannot close the entire rental.", 403);
        Need(!await db.PartialRequests.AnyAsync(q => q.Status == "approved" && q.EndDate > Today && db.PartialOffers.Any(o => o.Id == q.ListingId && o.RentalId == id)), "This rental has an accepted room booking that has not ended.");
        r.Status = "closed"; r.ClosedAt = DateTimeOffset.UtcNow; var req = await db.RentalRequests.SingleAsync(x => x.Id == r.RequestId); req.Status = "closed";
        foreach (var amendment in await db.RentalAmendments.Where(x => x.RentalId == id && x.Status == "pending").ToListAsync()) amendment.Status = "cancelled";
        foreach (var offer in await db.PartialOffers.Where(x => x.RentalId == id && x.Status != "deleted").ToListAsync()) offer.Status = "archived";
        Log("Rental closed"); await Save(); return await RentalDto(r);
    }
    public async Task<object> ProposeRent(string id, JsonObject b)
    {
        var r = await Request(id, "tenant"); Need(r.TenantId == CurrentId, "Only the lead tenant can propose a new whole-home rent.", 403); Need((r.Status is "submitted" or "approved" or "inspection" or "agreement" or "payment") && !await db.Rentals.AnyAsync(x => x.RequestId == id), "The rental price is locked."); Need(!await db.RentNegotiations.AnyAsync(n => n.RequestId == id && n.Status == "pending"), "Wait for the pending proposal.");
        await RequireBookable(await Property(r.PropertyId)); await RequireApplicantsActive(r);
        db.RentNegotiations.Add(new RentNegotiation { RequestId = id, Price = Number(b, "price", .001m, 999999m), Status = "pending" }); await Save(); return await RequestDto(r);
    }
    public async Task<object> ReviewRent(string id, JsonObject b)
    {
        var r = await Request(id, "landlord"); Need((r.Status is "submitted" or "approved" or "inspection" or "agreement" or "payment") && !await db.Rentals.AnyAsync(x => x.RequestId == id), "The rental price is locked."); var n = await db.RentNegotiations.SingleOrDefaultAsync(n => n.RequestId == id && n.Status == "pending"); Need(n is not null, "There is no pending proposal."); var accepted = Flag(b, "accepted");
        n!.Status = accepted ? "confirmed" : "declined"; n.ReviewedAt = DateTimeOffset.UtcNow;
        if (accepted) { await RequireBookable(await Property(r.PropertyId)); await RequireApplicantsActive(r); }
        if (accepted) { r.AgreedPrice = n.Price; r.Deposit = n.Price; r.Total = n.Price * (r.Period == "Daily" ? r.Duration : 1) + n.Price;
            if (r.WorkflowVersion >= 2) { await ResetRequestApprovals(r); if (r.RoommateUserId is not null) await SendInvitation(r); NotifyTenants(r, "The whole-home rent changed. Previous approvals were reset; review the new version."); }
        }
        await Save(); return await RequestDto(r);
    }
}
