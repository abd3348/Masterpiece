using CampusMate.Models;
using System.Text.Json.Nodes;
using CampusMate.Data;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    public object MediaDto(MediaFile m) => new
    {
        m.Id,
        m.Name,
        url = m.StorageKey.StartsWith("seed:")
        ? "https://images.unsplash.com/" + m.StorageKey[5..] + "?auto=format&fit=crop&w=1200&q=80" : "/api/media/" + m.Id
    };
    public async Task<JsonObject> PropertyDto(PropertyListing p)
    {
        var u = await db.Users.SingleAsync(x => x.Id == p.OwnerId);
        var links = await db.PropertyMedia.Where(x => x.PropertyId == p.Id).OrderBy(x => x.SortOrder).ToListAsync();
        var media = await db.Media.Where(x => links.Select(l => l.MediaId).Contains(x.Id)).ToListAsync();
        var photos = links.Where(x => x.Kind == "photo").Select(l => MediaDto(media.Single(m => m.Id == l.MediaId))).ToArray();
        var vid = links.FirstOrDefault(x => x.Kind == "video");
        var reviews = await db.Reviews.Where(x => x.PropertyId == p.Id).Join(db.Users, r => r.AuthorId, a => a.Id, (r, a) => new { name = a.FirstName, r.Rating, r.Text }).ToListAsync();
        var fee = await db.ListingFees.SingleOrDefaultAsync(x => x.PropertyId == p.Id);
        var history = await db.ModerationHistory.Where(x => x.PropertyId == p.Id).OrderByDescending(x => x.ReviewedAt).ToListAsync();
        object Decision(ModerationDecision m) => new { m.Decision, m.Reason, m.Notes, m.ReviewedBy, m.ReviewedAt };
        return (JsonObject)Node(new
        {
            p.Id,
            p.Title,
            p.City,
            p.Area,
            p.Price,
            p.Period,
            p.Beds,
            p.Baths,
            p.Size,
            p.Type,
            p.Furnished,
            p.Status,
            p.ReviewStatus,
            p.OwnerWantsPublished,
            reviewRevision = Convert.ToBase64String(p.Version),
            p.Description,
            ownerId = u.Id,
            landlord = FullName(u),
            amenities = Arr(p.AmenitiesJson),
            availableFrom = Date(p.AvailableFrom),
            availableTo = Date(p.AvailableTo),
            p.Commute,
            p.Noise,
            p.Cleanliness,
            p.Smoking,
            photos,
            photo = (string?)null,
            video = vid is null ? null : MediaDto(media.Single(m => m.Id == vid.MediaId)),
            reviews,
            risk = p.Risk ?? 0,
            riskReasons = Arr(p.RiskReasonsJson),
            moderationAnalysis = p.ModerationAnalysisJson is null ? null : Obj(p.ModerationAnalysisJson),
            moderation = history.Count == 0 ? null : Decision(history[0]),
            moderationHistory = history.Skip(1).Select(Decision),
            listingFee = fee is null ? null : FeeDto(fee)
        })!;
    }
    static object FeeDto(ListingFee f) => new { f.Amount, f.Currency, f.Status, f.Simulated, date = f.PaidAt };
    public async Task<object> RoommateDto(RoommateProfile p)
    {
        var u = await db.Users.SingleAsync(x => x.Id == p.UserId);
        return new { p.Id, p.UserId, name = FullName(u), u.Occupation, u.Destination, p.Area, p.MinBudget, p.MaxBudget, p.Sleep, p.Schedule, p.Noise, p.Cleanliness, p.Smoking, habits = Arr(p.HabitsJson) };
    }
    public object PreferenceDto(HousingPreference p) => new { p.MinBudget, p.MaxBudget, areas = Arr(p.AreasJson), p.Destination, p.Commute, p.Housing, p.Furnishing, billing = p.Billing == "Daily" ? "Daily / short stay" : "Monthly", roommates = p.RoommatesCount, p.Sleep, p.Schedule, p.Noise, p.Cleanliness, p.Smoking, habits = Arr(p.HabitsJson) };
    public async Task<JsonObject> RequestDto(RentalRequest r)
    {
        var u = await db.Users.SingleAsync(x => x.Id == r.TenantId);
        var profile = r.RoommateId is null ? null : await db.RoommateProfiles.SingleOrDefaultAsync(x => x.Id == r.RoommateId);
        var roommate = profile is null ? null : await db.Users.SingleAsync(x => x.Id == profile.UserId);
        var inspection = await db.Inspections.SingleOrDefaultAsync(x => x.RequestId == r.Id);
        var negotiation = await db.RentNegotiations.Where(x => x.RequestId == r.Id).OrderByDescending(x => x.ProposedAt).FirstOrDefaultAsync();
        return (JsonObject)Node(new
        {
            r.Id,
            r.PropertyId,
            r.TenantId,
            tenantName = FullName(u),
            roommate = r.RoommateId is not null,
            r.RoommateId,
            r.RoommateUserId,
            r.WorkflowVersion,
            r.TermsVersion,
            invitationStatus = InvitationExpired(r) ? "expired" : r.InvitationStatus,
            r.InvitationExpiresAt,
            r.RoommateAccepted,
            roommateName = roommate is null ? null : FullName(roommate),
            r.Message,
            startDate = Date(r.StartDate),
            endDate = Date(r.EndDate),
            r.Duration,
            status = EffectiveRequestStatus(r),
            r.CreatedAt,
            r.AgreedPrice,
            r.Deposit,
            r.Total,
            r.LandlordAccepted,
            r.TenantAccepted,
            property = Obj(r.PropertySnapshotJson),
            inspection = inspection is null ? null : new { items = Arr(inspection.ItemsJson), inspection.Notes },
            negotiation = negotiation is null ? null : new { negotiation.Price, negotiation.Status, negotiation.ProposedAt }
        })!;
    }
    public async Task<object> RentalDto(Rental r)
    {
        var reports = await db.ConditionReports.Where(x => x.RentalId == r.Id).ToListAsync();
        async Task<object?> Condition(string phase)
        {
            var report = reports.SingleOrDefault(x => x.Phase == phase); if (report is null) return null;
            var media = report.VideoId is null ? null : await db.Media.SingleAsync(x => x.Id == report.VideoId);
            return new { items = Arr(report.ItemsJson), report.Notes, video = media is null ? null : MediaDto(media), date = report.RecordedAt };
        }
        return new
        {
            r.Id,
            request = await RequestDto(await db.RentalRequests.SingleAsync(x => x.Id == r.RequestId)),
            r.Status,
            endDate = Date(r.EndDate),
            payments = Array.Empty<object>(),
            r.PaymentMethod,
            r.MoveInComplete,
            conditions = new { initial = await Condition("initial"), final = await Condition("final") }
        };
    }
    public async Task<JsonObject> OfferDto(PartialOffer o)
    {
        var r = await db.Rentals.SingleAsync(x => x.Id == o.RentalId); var req = await db.RentalRequests.SingleAsync(x => x.Id == r.RequestId); var p = await Property(req.PropertyId);
        var full = await PropertyDto(p);
        var publicHome = new { p.Id, p.Title, p.City, p.Area, photos = full["photos"]?.DeepClone(), photo = (string?)null, p.Furnished, amenities = Arr(p.AmenitiesJson) };
        return (JsonObject)Node(new
        {
            o.Id,
            tenantId = req.TenantId,
            o.RentalId,
            propertyId = p.Id,
            propertyTitle = p.Title,
            p.Area,
            o.RoomNumber,
            roomLabel = "Room " + o.RoomNumber,
            o.Occupancy,
            duration = o.EndDate.DayNumber - o.StartDate.DayNumber,
            startDate = Date(o.StartDate),
            endDate = Date(o.EndDate),
            o.Price,
            o.Notes,
            o.Status,
            property = publicHome
        })!;
    }
    public async Task<object> PartialRequestDto(PartialRequest pr)
    {
        var offer = await db.PartialOffers.SingleAsync(x => x.Id == pr.ListingId); var r = await db.Rentals.SingleAsync(x => x.Id == offer.RentalId); var req = await db.RentalRequests.SingleAsync(x => x.Id == r.RequestId);
        var owner = await db.Users.SingleAsync(x => x.Id == req.TenantId); var u = await db.Users.SingleAsync(x => x.Id == pr.TenantId);
        return new
        {
            pr.Id,
            pr.ListingId,
            ownerTenantId = owner.Id,
            ownerTenantName = FullName(owner),
            pr.TenantId,
            tenantName = FullName(u),
            tenantEmail = u.Email,
            startDate = Date(pr.StartDate),
            endDate = Date(pr.EndDate),
            duration = pr.EndDate.DayNumber - pr.StartDate.DayNumber,
            pr.Status,
            pr.CreatedAt
        };
    }
    public async Task<object> MeetingDto(Meeting m)
    {
        var creator = await db.Users.SingleAsync(x => x.Id == m.CreatorId); var recipient = await db.Users.SingleAsync(x => x.Id == m.RecipientId);
        object? targetId = m.Kind == "property" ? m.PropertyId : m.Kind == "roommate" ? m.RoommateId : m.PartialRequestId;
        var subject = m.PropertyId is not null ? (await Property(m.PropertyId.Value)).Title : m.RoommateId is not null ? FullName(recipient) : "Partial rental meeting";
        return new
        {
            m.Id,
            m.Kind,
            targetId,
            subject,
            m.Title,
            m.StartsAt,
            m.Duration,
            m.CreatorId,
            creatorName = FullName(creator),
            m.RecipientId,
            recipientName = FullName(recipient),
            participants = new[] { m.CreatorId, m.RecipientId },
            m.Status,
            m.CreatedAt
        };
    }
    async Task<object> ContactDto(RoommateContact c)
    {
        var p = await db.RoommateProfiles.SingleAsync(x => x.Id == c.PersonId); var u = await db.Users.SingleAsync(x => x.Id == c.UserId);
        return new { c.Id, c.PersonId, c.UserId, recipientId = p.UserId, senderName = FullName(u), c.Status };
    }
    async Task<object> ReportDto(Report r)
    {
        var p = await Property(r.PropertyId); var u = await db.Users.SingleAsync(x => x.Id == r.ReporterId);
        var actions = await db.ModerationHistory.Where(m => m.PropertyId == r.PropertyId && m.Decision != "approved" && m.ReviewedAt >= r.CreatedAt && (r.ResolvedAt == null || m.ReviewedAt <= r.ResolvedAt)).OrderBy(m => m.ReviewedAt).Select(m => new { m.Decision, m.Reason, m.Notes, m.ReviewedBy, m.ReviewedAt }).ToListAsync();
        return new { r.Id, r.PropertyId, title = p.Title, r.Reason, r.Notes, r.Status, name = FullName(u), date = r.CreatedAt, r.Resolution, r.ResolutionNotes, r.ActionTakenAt, actions, r.ResolvedBy, r.ResolvedAt };
    }
    static object NotificationDto(Notification n) => new { n.Id, n.RecipientId, n.PropertyId, n.PropertyTitle, n.Type, n.Text, n.Route, read = n.IsRead, date = n.CreatedAt };
    public async Task<object> Bootstrap(string? csrfToken)
    {
        var me = CurrentId is null ? null : await Me();
        var admin = me?.Role == "admin";
        var now = DateTimeOffset.UtcNow;
        var props = await db.Properties.Where(p => p.Status == "published" && p.ReviewStatus == "approved" && db.Users.Any(u => u.Id == p.OwnerId && (u.Active || u.SuspendedUntil <= now)) || (me != null && (admin || p.OwnerId == me.Id))).ToListAsync();
        var users = admin ? (await db.Users.ToListAsync()).Select(PublicUser).ToArray() : [];
        var roommates = await db.RoommateProfiles.Where(p => p.Available && (me == null || p.UserId != me.Id)).Join(db.Users, p => p.UserId, u => u.Id, (p, u) => new { p, u.Active, u.SuspendedUntil }).Where(x => x.Active || x.SuspendedUntil <= now).Select(x => x.p).ToListAsync();
        var requests = me is null ? [] : await VisibleRequests(me).ToListAsync();
        var requestIds = requests.Select(r => r.Id).ToArray();
        var rentals = me is null ? [] : await db.Rentals.Where(r => requestIds.Contains(r.RequestId)).ToListAsync();
        var pref = me is null ? null : await db.Preferences.SingleOrDefaultAsync(p => p.UserId == me.Id);
        var contacts = me is null ? [] : await db.RoommateContacts.Where(c => c.UserId == me.Id || db.RoommateProfiles.Any(p => p.Id == c.PersonId && p.UserId == me.Id)).ToListAsync();
        var meetings = me is null ? [] : await db.Meetings.Where(m => m.CreatorId == me.Id || m.RecipientId == me.Id).ToListAsync();
        var reports = admin ? await db.Reports.ToListAsync() : [];
        var activity = me is null ? [] : await db.Activity.Where(a => admin || a.ActorId == me.Id).OrderByDescending(a => a.CreatedAt).Take(100).ToListAsync();
        var saved = me is null ? [] : await db.Favorites.Where(f => f.UserId == me.Id).Select(f => f.PropertyId).ToListAsync();
        var savedRoommates = me is null ? [] : await db.RoommateFavorites.Where(f => f.UserId == me.Id).Select(f => f.RoommateId).ToListAsync();
        var notifications = me is null ? [] : await db.Notifications.Where(n => n.RecipientId == me.Id).OrderByDescending(n => n.CreatedAt).ToListAsync();
        return new
        {
            schemaVersion = 1,
            currentUser = me is null ? null : PublicUser(me),
            preferences = pref is null ? null : PreferenceDto(pref),
            csrfToken,
            users,
            properties = await ProjectionList.Map(props, PropertyDto),
            roommates = await ProjectionList.Map(roommates, RoommateDto),
            requests = await ProjectionList.Map(requests, RequestDto),
            rentals = await ProjectionList.Map(rentals, RentalDto),
            contacts = await ProjectionList.Map(contacts, ContactDto),
            meetings = await ProjectionList.Map(meetings, MeetingDto),
            reports = await ProjectionList.Map(reports, ReportDto),
            activity = activity.Select(a => new { a.Id, a.Text, date = a.CreatedAt }),
            saved,
            savedRoommates,
            notifications = notifications.Select(NotificationDto),
            subletListings = me is null ? [] : await MyOffers(),
            subletRequests = me is null ? [] : await MyPartialRequests()
        };
    }
}

// EF contexts cannot run concurrent queries. Keep projection queries sequential.
internal static class ProjectionList
{
    public static async System.Threading.Tasks.Task<List<TResult>> Map<T, TResult>(IEnumerable<T> items, Func<T, System.Threading.Tasks.Task<TResult>> projection)
    {
        var result = new List<TResult>(); foreach (var item in items) result.Add(await projection(item)); return result;
    }
}

