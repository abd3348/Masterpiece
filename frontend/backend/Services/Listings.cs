using CampusMate.Models;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using CampusMate.Data;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    async Task<bool> Available(PropertyListing p, DateOnly start, DateOnly end, string? except = null)
    {
        if (start < p.AvailableFrom || end > p.AvailableTo || end <= start) return false;
        return !await db.RentalRequests.AnyAsync(r => r.PropertyId == p.Id && r.Id != except && (r.Status == "active" || r.Status == "confirmed" || r.Status == "closed") && r.StartDate < end && r.EndDate > start);
    }
    public async Task<List<JsonObject>> Properties()
    {
        var now = DateTimeOffset.UtcNow;
        var props = await db.Properties.Where(p => p.Status == "published" && p.ReviewStatus == "approved" && db.Users.Any(u => u.Id == p.OwnerId && (u.Active || u.SuspendedUntil <= now))).ToListAsync();
        var result = new List<JsonObject>();
        foreach (var p in props)
        {
            if (!await db.Rentals.AnyAsync(r => (r.Status == "active" || r.Status == "upcoming") && r.EndDate > Today && db.RentalRequests.Any(q => q.Id == r.RequestId && q.PropertyId == p.Id))) result.Add(await PropertyDto(p));
        }
        return result;
    }
    public async Task<JsonObject> PublicProperty(int id)
    {
        var p = await Property(id); var u = CurrentId is null ? null : await Me();
        var ownerActive = AccountActive(await db.Users.SingleAsync(a => a.Id == p.OwnerId));
        var participant = u is not null && await db.RentalRequests.AnyAsync(r => r.PropertyId == id && (r.Status == "confirmed" || r.Status == "active" || r.Status == "closed") && (r.TenantId == u.Id || r.RoommateUserId == u.Id && r.InvitationStatus == "accepted"));
        Need(p.Status == "published" && p.ReviewStatus == "approved" && ownerActive || u?.Role == "admin" || p.OwnerId == u?.Id || participant, "Property not found.", 404);
        return await PropertyDto(p);
    }
    async Task CheckMedia(JsonNode? node, string kind, bool required)
    {
        if (node is null) { Need(!required, "Choose a " + kind + " file.", 400); return; }
        Need(node is JsonObject, "Choose valid media.", 400); var mediaId = Text((JsonObject)node, "id", 64);
        var media = await db.Media.SingleOrDefaultAsync(m => m.Id == mediaId); var me = await Me();
        Need(media is not null && media.UploadedBy == me.Id, "Choose media uploaded by your own account.", 403);
        Need(kind == "photo" ? media!.ContentType.StartsWith("image/") : media!.ContentType.StartsWith("video/"), "Media type does not match the field.", 400);
    }
    async Task FillListing(PropertyListing p, JsonObject b)
    {
        p.Title = Text(b, "title", 200); p.City = Text(b, "city", 100); p.Area = Text(b, "area", 100);
        p.Type = Choice(b, "type", "Apartment", "Studio", "Private room", "Shared room"); p.Period = Choice(b, "period", "Monthly", "Daily");
        p.Furnished = Choice(b, "furnished", "Furnished", "Partly furnished", "Unfurnished"); p.Price = Number(b, "price", .001m, 999999m);
        p.Beds = Integer(b, "beds", 1, 20); p.Baths = Integer(b, "baths", 1, 20); p.Size = Number(b, "size", 5, 9999);
        p.Description = Text(b, "description", 10000); p.AvailableFrom = Day(b, "availableFrom"); p.AvailableTo = Day(b, "availableTo");
        Need(p.AvailableTo > p.AvailableFrom, "Availability end must follow its start.", 400); p.AmenitiesJson = ListJson(b, "amenities");
        Need(b["photos"] is JsonArray photos && photos.Count is > 0 and <= 6, "Choose between one and six photos.", 400);
        var ids = new HashSet<string>();
        foreach (var photo in (JsonArray)b["photos"]!) { await CheckMedia(photo, "photo", true); Need(ids.Add(photo!["id"]!.ToString()), "Duplicate photo.", 400); }
        await CheckMedia(b["video"], "video", false);
        var average = await db.Properties.Where(x => x.Id != p.Id && x.Area == p.Area && x.Period == p.Period && x.Status == "published").Select(x => (decimal?)x.Price).AverageAsync() ?? (p.Period == "Daily" ? 18 : 180);
        var risk = 5; var reasons = new List<string>();
        if (p.Price < average * .55m) { risk += 50; reasons.Add("Price far below the area listing average"); }
        if (Regex.IsMatch(p.Description, "advance.payment|urgent.transfer|wire.money|pay.before|تحويل عاجل|دفع مقدم", RegexOptions.IgnoreCase)) { risk += 30; reasons.Add("Advance-payment or urgent-transfer language"); }
        p.Risk = (byte)Math.Min(100, risk); p.RiskReasonsJson = Node(reasons.Count == 0 ? ["No rule-based warning found"] : reasons)!.ToJsonString(); p.ModerationAnalysisJson = null;
    }
    async Task SetPropertyMedia(PropertyListing p, JsonObject b)
    {
        db.PropertyMedia.RemoveRange(await db.PropertyMedia.Where(x => x.PropertyId == p.Id).ToListAsync()); await Save();
        var i = 0; foreach (var item in (JsonArray)b["photos"]!) db.PropertyMedia.Add(new PropertyMedia { PropertyId = p.Id, MediaId = item!["id"]!.ToString(), Kind = "photo", SortOrder = i++ });
        if (b["video"] is JsonObject video) db.PropertyMedia.Add(new PropertyMedia { PropertyId = p.Id, MediaId = video["id"]!.ToString(), Kind = "video" });
        await Save();
    }
    public async Task<object> CreateProperty(JsonObject b)
    {
        var u = await Me("landlord"); var p = new PropertyListing { OwnerId = u.Id, Status = "awaiting-fee" }; await FillListing(p, b); db.Properties.Add(p); await Save();
        p.ReviewStatus = p.Risk >= 60 ? "pending" : "approved";
        db.ListingFees.Add(new ListingFee { PropertyId = p.Id, Amount = 20, Currency = "JOD", Status = "unpaid" }); await SetPropertyMedia(p, b);
        Log("Listing created: " + p.Title); await Save(); return await PropertyDto(p);
    }
    public async Task<object> EditProperty(int id, JsonObject b)
    {
        var p = await Property(id, true); var requiresReview = p.ReviewStatus != "approved" || p.Status is "deleted" or "pending";
        await FillListing(p, b);
        var active = await db.RentalRequests.Where(r => r.PropertyId == id && (r.Status == "active" || r.Status == "confirmed" || r.Status == "approved" || r.Status == "inspection" || r.Status == "agreement" || r.Status == "payment")).ToListAsync();
        Need(active.All(r => r.StartDate >= p.AvailableFrom && r.EndDate <= p.AvailableTo), "Availability cannot exclude an existing accepted rental.");
        var fee = await db.ListingFees.SingleAsync(f => f.PropertyId == id);
        p.ReviewStatus = requiresReview || p.Risk >= 60 ? "pending" : "approved";
        UpdateListingVisibility(p, fee);
        if (p.ReviewStatus == "pending")
        {
            Notify(p.OwnerId, "listing-resubmitted", "Your updated advertisement is awaiting a fresh administrator review. Your paid posting fee is retained.", "landlord/dashboard.html", p);
            foreach (var admin in await db.Users.Where(u => u.Role == "admin" && u.Active).ToListAsync()) Notify(admin.Id, "listing-resubmitted", "A corrected advertisement needs review: " + p.Title, "admin/dashboard.html?tab=properties", p);
        }
        await SetPropertyMedia(p, b); Log("Listing updated: " + p.Title); await Save(); return await PropertyDto(p);
    }
    public async Task<object> SetPropertyStatus(int id, JsonObject b)
    {
        var p = await Property(id, true); var status = Choice(b, "status", "published", "archived");
        p.OwnerWantsPublished = status == "published";
        UpdateListingVisibility(p, await db.ListingFees.SingleAsync(f => f.PropertyId == id));
        Log("Owner visibility preference: " + status); await Save(); return await PropertyDto(p);
    }
    public async Task Favorite(int id, bool saved)
    {
        var u = await Me("tenant"); await PublicProperty(id); var f = await db.Favorites.SingleOrDefaultAsync(x => x.UserId == u.Id && x.PropertyId == id);
        if (saved && f is null) db.Favorites.Add(new Favorite { UserId = u.Id, PropertyId = id }); else if (!saved && f is not null) db.Favorites.Remove(f); await Save();
    }
    public async Task<object> AddReview(int id, JsonObject b)
    {
        var u = await Me("tenant"); await PublicProperty(id); var review = new Review { PropertyId = id, AuthorId = u.Id, Rating = (byte)Integer(b, "rating", 1, 5), Text = Text(b, "text", 1000) };
        db.Reviews.Add(review); await Save(); return new { name = u.FirstName, review.Rating, review.Text };
    }
    public async Task<object> AnalyzeListing(int id)
    {
        await Me("admin"); var p = await Property(id);
        var analysis = new { demo = false, risk = p.Risk ?? 0, reasons = Arr(p.RiskReasonsJson), completedAt = DateTimeOffset.UtcNow, summary = "Rule-based listing review. Uploaded image and video content was not analyzed.", source = "server-rules" };
        p.ModerationAnalysisJson = Node(analysis)!.ToJsonString(); await Save(); return analysis;
    }
    public async Task<object> Moderate(int id, JsonObject b)
    {
        var u = await Me("admin"); var p = await Property(id);
        var decision = b.ContainsKey("decision") ? Choice(b, "decision", "approve", "request-changes", "suspend") : Flag(b, "keep") ? "approve" : "suspend";
        var keep = decision == "approve";
        if (b["reviewRevision"] is not null) Need(Text(b, "reviewRevision", 100) == Convert.ToBase64String(p.Version), "The advertisement changed after you opened it. Refresh the screening before deciding.");
        Need(p.ModerationAnalysisJson is not null, "Analyze the listing before making a moderation decision.");
        if (keep) Need(p.ReviewStatus is not "suspended" and not "changes-requested", "The owner must edit and resubmit the listing first.");
        var reason = keep ? "" : Choice(b, "reason", "Suspected fraud", "Misleading information", "Suspicious pricing", "Other policy concern"); var notes = keep ? "" : Text(b, "notes", 1000);
        Need(keep || notes.Length >= 10, "Explain the decision in at least 10 characters.", 400);
        p.ReviewStatus = keep ? "approved" : decision == "request-changes" ? "changes-requested" : "suspended";
        UpdateListingVisibility(p, await db.ListingFees.SingleAsync(f => f.PropertyId == id));
        db.ModerationHistory.Add(new ModerationDecision { PropertyId = id, ReviewedBy = u.Id, Decision = keep ? "approved" : decision == "request-changes" ? "changes-requested" : "removed", Reason = reason, Notes = notes });
        Notify(p.OwnerId, "listing-" + decision, keep ? $"Your advertisement was approved. {(p.OwnerWantsPublished ? p.Status == "awaiting-fee" ? "Confirm the posting fee to publish it." : "It is published." : "It stays paused because you chose to hide it.")}" : $"{(decision == "request-changes" ? "Changes requested" : "Advertisement suspended")}: {reason}. {notes} Edit and resubmit this same advertisement. Your paid posting fee is retained.", "landlord/dashboard.html?tab=notifications", p);
        if (!keep)
        {
            foreach (var r in await db.Reports.Where(r => r.PropertyId == id && r.Status == "open").ToListAsync())
            {
                r.ActionTakenAt = DateTimeOffset.UtcNow;
                Notify(r.ReporterId, "report-action", "An administrator acted on the advertisement you reported. Your report remains open until its investigation is recorded.", await UpdatesRoute(r.ReporterId), p);
            }
            foreach (var request in await db.RentalRequests.Where(r => r.PropertyId == id && r.Status != "active" && r.Status != "confirmed" && r.Status != "closed" && r.Status != "rejected" && r.Status != "cancelled").ToListAsync())
                NotifyTenants(request, "This advertisement is under administrator review. New rental steps are paused until it is approved again.");
        }
        Log("Listing moderation: " + p.Status); await Save(); return await PropertyDto(p);
    }
    public async Task<object> ReportProperty(int id, JsonObject b)
    {
        var u = await Me("tenant", "landlord"); await PublicProperty(id); var r = new Report { PropertyId = id, ReporterId = u.Id, Reason = Text(b, "reason", 200), Notes = Text(b, "notes", 1500), Status = "open" }; db.Reports.Add(r); await Save(); return await ReportDto(r);
    }
    public async Task<object> ResolveReport(string id, JsonObject body)
    {
        var u = await Me("admin"); var r = await db.Reports.SingleOrDefaultAsync(x => x.Id == id); Need(r is not null, "Report not found.", 404);
        Need(r!.Status == "open", "This report already has a recorded decision.");
        r.Resolution = Choice(body, "outcome", "substantiated", "unsubstantiated", "duplicate");
        r.ResolutionNotes = Text(body, "notes", 1000); Need(r.ResolutionNotes.Length >= 10, "Explain the decision in at least 10 characters.", 400);
        r.Status = "resolved"; r.ResolvedBy = u.Id; r.ResolvedAt = DateTimeOffset.UtcNow;
        Notify(r.ReporterId, "report-resolved", $"Your report was reviewed: {r.Resolution}. {r.ResolutionNotes}", await UpdatesRoute(r.ReporterId), await Property(r.PropertyId));
        Log("Report " + id + " resolved: " + r.Resolution + ". " + r.ResolutionNotes); await Save(); return await ReportDto(r);
    }
    public async Task<object> SetUserStatus(string id, JsonObject b)
    {
        var admin = await Me("admin"); var u = await db.Users.SingleOrDefaultAsync(x => x.Id == id); Need(u is not null, "User not found.", 404); Need(u!.Role != "admin", "Administrator accounts cannot be suspended here.");
        var active = Flag(b, "active");
        var reason = Text(b, "reason", 1000); Need(reason.Length >= 10, "Record a reason in at least 10 characters.", 400);
        DateTimeOffset? until = null;
        if (!active)
        {
            var days = Integer(b, "days", 0, 365); if (days > 0) until = DateTimeOffset.UtcNow.AddDays(days);
            Need(Flag(b, "acknowledged"), "Confirm the impact on listings and requests.", 400);
        }
        u.Active = active; u.SuspensionReason = reason; u.SuspendedUntil = until; u.SuspendedBy = admin.Id; u.SecurityStamp = Id();
        Notify(u.Id, "account-status", active ? "Your account access was restored. " + reason : $"Your account is restricted {(until is null ? "until an administrator restores it" : "until " + until.Value.ToString("u"))}. {reason} Existing agreements and rentals remain available to view.", u.Role == "landlord" ? "landlord/dashboard.html?tab=notifications" : "tenant/requests.html");
        Log($"Account {u.Id} {(active ? "restored" : "suspended")}: {reason}; until {until?.ToString("u") ?? "manual restoration"}"); await Save(); return PublicUser(u);
    }
    static void UpdateListingVisibility(PropertyListing property, ListingFee fee)
    {
        property.Status = property.ReviewStatus switch
        {
            "suspended" => "deleted",
            "changes-requested" or "pending" => "pending",
            _ => fee.Status != "paid" ? "awaiting-fee" : property.OwnerWantsPublished ? "published" : "archived"
        };
    }
}
