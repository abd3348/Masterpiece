using CampusMate.Models;
using System.Globalization;
using System.Text.Json.Nodes;
using CampusMate.Data;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    public async Task<List<object>> Meetings()
    {
        var u = await Me("tenant", "landlord"); return await ProjectionList.Map(await db.Meetings.Where(m => m.CreatorId == u.Id || m.RecipientId == u.Id).OrderBy(m => m.StartsAt).ToListAsync(), MeetingDto);
    }
    public async Task<object> CreateMeeting(JsonObject b)
    {
        var u = await Me("tenant", "landlord"); var kind = Choice(b, "kind", "property", "roommate", "sublet"); var duration = Integer(b, "duration", 15, 60); Need(new[] { 15, 30, 60 }.Contains(duration), "Choose 15, 30 or 60 minutes.", 400);
        var raw = Text(b, "startsAt", 50); Need(raw.EndsWith('Z') || System.Text.RegularExpressions.Regex.IsMatch(raw, @"[+-]\d{2}:\d{2}$"), "Include the timezone in startsAt.", 400);
        Need(DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var startsAt) && startsAt > DateTimeOffset.UtcNow, "Choose a future meeting time.", 400);
        var m = new Meeting { CreatorId = u.Id, Kind = kind, Title = Text(b, "title", 100), StartsAt = startsAt.ToUniversalTime(), Duration = duration, Status = "pending", RoomName = "CampusMate-" + Id() };
        if (kind == "property")
        {
            var p = await Property(Integer(b, "targetId", 1, int.MaxValue)); m.PropertyId = p.Id;
            if (u.Role == "landlord") { Need(p.OwnerId == u.Id, "Choose your own property.", 403); m.RecipientId = Text(b, "peerId", 64); Need(await db.RentalRequests.AnyAsync(r => r.PropertyId == p.Id && (r.TenantId == m.RecipientId || r.RoommateUserId == m.RecipientId && r.InvitationStatus == "accepted") && r.Status != "waiting-roommate" && r.Status != "draft"), "Choose a tenant who applied for this property.", 403); }
            else
            {
                var peer = Text(b, "peerId", 64, false);
                if (peer.Length > 0)
                {
                    Need(await db.RentalRequests.AnyAsync(r => r.PropertyId == p.Id && (r.TenantId == u.Id && r.RoommateUserId == peer || r.TenantId == peer && r.RoommateUserId == u.Id) && (r.InvitationStatus == "accepted" || r.InvitationStatus == "pending" && r.InvitationExpiresAt > DateTimeOffset.UtcNow)), "Choose a participant in your rental invitation.", 403);
                    m.RecipientId = peer;
                }
                else
                {
                    Need(p.Status == "published" || await db.RentalRequests.AnyAsync(r => r.PropertyId == p.Id && (r.Status == "active" || r.Status == "confirmed") && (r.TenantId == u.Id || r.RoommateUserId == u.Id && r.InvitationStatus == "accepted")), "Choose a published listing or one of your confirmed rentals."); m.RecipientId = p.OwnerId;
                }
            }
        }
        else if (kind == "roommate")
        {
            Need(u.Role == "tenant", "Only tenants can invite roommates.", 403); var id = Text(b, "targetId", 64); var p = await db.RoommateProfiles.SingleOrDefaultAsync(x => x.Id == id && x.Available); Need(p is not null, "Roommate not found.", 404); m.RoommateId = id; m.RecipientId = p!.UserId;
        }
        else
        {
            Need(u.Role == "tenant", "Only tenants can arrange room meetings.", 403); var id = Text(b, "targetId", 64); var q = await db.PartialRequests.SingleOrDefaultAsync(x => x.Id == id && x.Status == "approved"); Need(q is not null, "Choose an accepted room request.", 404);
            var o = await db.PartialOffers.SingleAsync(x => x.Id == q!.ListingId); var rental = await db.Rentals.SingleAsync(x => x.Id == o.RentalId); var req = await db.RentalRequests.SingleAsync(x => x.Id == rental.RequestId);
            Need(o.Status == "published" && rental.Status == "active" && (u.Id == q!.TenantId || u.Id == req.TenantId), "Only participants may arrange a meeting.", 403); m.PartialRequestId = id; m.RecipientId = u.Id == q!.TenantId ? req.TenantId : q.TenantId;
        }
        Need(m.RecipientId != u.Id, "You cannot invite yourself.", 400); Need(AccountActive(await db.Users.SingleAsync(x => x.Id == m.RecipientId)), "The invited account is unavailable.");
        db.Meetings.Add(m); Log("Meeting invitation sent: " + m.Title); await Save(); return await MeetingDto(m);
    }
    async Task<Meeting> MeetingFor(string id)
    {
        var u = await Me("tenant", "landlord"); var m = await db.Meetings.SingleOrDefaultAsync(x => x.Id == id); Need(m is not null, "Meeting not found.", 404); Need(m!.CreatorId == u.Id || m.RecipientId == u.Id, "This meeting belongs to another account.", 403); return m;
    }
    public async Task<object> RespondMeeting(string id, JsonObject b)
    {
        var u = await Me(); var m = await MeetingFor(id); Need(m.RecipientId == u.Id, "Only the invited person may respond.", 403); Need(m.Status == "pending" && m.StartsAt > DateTimeOffset.UtcNow, "The invitation is no longer pending."); var accepted = Flag(b, "accepted");
        if (accepted) { var end = m.StartsAt.AddMinutes(m.Duration); var others = await db.Meetings.Where(o => o.Id != id && o.Status == "accepted" && (o.CreatorId == m.CreatorId || o.RecipientId == m.CreatorId || o.CreatorId == m.RecipientId || o.RecipientId == m.RecipientId)).ToListAsync(); Need(!others.Any(o => o.StartsAt < end && o.StartsAt.AddMinutes(o.Duration) > m.StartsAt), "This time overlaps another accepted meeting."); }
        m.Status = accepted ? "accepted" : "declined"; await Save(); return await MeetingDto(m);
    }
    public async Task<object> CancelMeeting(string id) { var m = await MeetingFor(id); Need(m.Status is "pending" or "accepted", "This meeting is already closed."); m.Status = "cancelled"; await Save(); return await MeetingDto(m); }
    public async Task<object> MeetingRoom(string id)
    {
        var u = await Me(); var m = await MeetingFor(id); var now = DateTimeOffset.UtcNow; Need(m.Status == "accepted" && now >= m.StartsAt.AddMinutes(-10) && now <= m.StartsAt.AddMinutes(m.Duration), "Join an accepted meeting from 10 minutes before its start until its end.", 403); return new { m.RoomName, displayName = FullName(u) };
    }
    public async Task<object> Contact(JsonObject b)
    {
        var u = await Me("tenant"); var id = Text(b, "personId", 64); var p = await db.RoommateProfiles.SingleOrDefaultAsync(x => x.Id == id && x.Available); Need(p is not null && p.UserId != u.Id, "Choose another available roommate.", 400);
        var c = await db.RoommateContacts.SingleOrDefaultAsync(x => x.PersonId == id && x.UserId == u.Id); if (c is null) { c = new RoommateContact { PersonId = id, UserId = u.Id, Status = "pending" }; db.RoommateContacts.Add(c); await Save(); }
        return await ContactDto(c);
    }
    public async Task<object> AcceptContact(string id)
    {
        var u = await Me("tenant"); var c = await db.RoommateContacts.SingleOrDefaultAsync(x => x.Id == id); Need(c is not null, "Contact not found.", 404); var p = await db.RoommateProfiles.SingleAsync(x => x.Id == c!.PersonId); Need(p.UserId == u.Id, "Only the recipient can accept.", 403); Need(c!.Status == "pending", "This contact was already reviewed."); c.Status = "accepted"; await Save(); return await ContactDto(c);
    }
    public async Task<object> Notifications() { var u = await Me(); return (await db.Notifications.Where(n => n.RecipientId == u.Id).OrderByDescending(n => n.CreatedAt).ToListAsync()).Select(NotificationDto); }
    public async Task<object> ReadNotification(string id) { var u = await Me(); var n = await db.Notifications.SingleOrDefaultAsync(x => x.Id == id && x.RecipientId == u.Id); Need(n is not null, "Notification not found.", 404); n!.IsRead = true; await Save(); return NotificationDto(n); }
    public async Task<object> SubmitSupport(JsonObject b)
    {
        var name = Text(b, "name", 60); var email = Email(b); var topic = Choice(b, "topic", "Account access", "Property listing", "Rental request", "Roommate selection", "Listing fee", "Other"); var message = Text(b, "message", 1200);
        var entry = new ActivityEntry { ActorId = CurrentId, Text = $"SUPPORT | {topic} | {name} | {email} | {message}" }; db.Activity.Add(entry); await Save(); return new { reference = entry.Id, saved = true };
    }
    public object Assistant(JsonObject b)
    {
        var text = Text(b, "text", 500).ToLowerInvariant(); var arabic = System.Text.RegularExpressions.Regex.IsMatch(text, @"\p{IsArabic}");
        var answer = arabic ? "أستطيع إرشادك للبحث عن السكن والتفضيلات وطلبات الإيجار واللقاءات. هذا مساعد إرشادي بقواعد ثابتة وليس تحليل ذكاء اصطناعي." : "I can guide you through housing search, preferences, rental requests and meetings. This is a rule-based guide, not an AI analysis service.";
        if (text.Contains("دفع") || text.Contains("pay") || text.Contains("rent")) answer = arabic ? "الإيجار والتأمين مباشرة بينك وبين المالك. المنصة تسجل الاتفاق فقط. رسوم نشر إعلان العقار عشرون دينارًا وعرض الغرفة خمسة دنانير." : "Rent and deposits are paid directly to the landlord. Publishing a property costs JOD 20; a room offer costs JOD 5. Local development checkout is a test only.";
        else if (text.Contains("لقاء") || text.Contains("meeting")) answer = arabic ? "افتح صفحة العقار أو زميل السكن واختر حجز لقاء. يجب أن يقبل المستلم الدعوة؛ الانضمام يفتح قبل البداية بعشر دقائق." : "Open a property or roommate profile and choose Book a meeting. The recipient must accept; joining opens ten minutes before the start.";
        else if (text.Contains("بحث") || text.Contains("search") || text.Contains("budget") || text.Contains("ميزاني")) answer = arabic ? "حدد ميزانيتك والمناطق ونوع السكن من التفضيلات، ثم افتح العقارات واستخدم الفلاتر. التوافق يعتمد على قواعد المقارنة." : "Save your budget, areas and housing type in Preferences, then use the property filters. Compatibility is calculated using matching rules.";
        return new { text = answer };
    }
}
