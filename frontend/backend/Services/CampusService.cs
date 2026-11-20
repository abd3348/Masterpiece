using CampusMate.Models;
using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using CampusMate.Data;
using CampusMate.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Services;

public sealed partial class CampusService(AppDbContext db, PasswordHasher<UserAccount> hasher, IHttpContextAccessor accessor, IConfiguration config, IWebHostEnvironment env)
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static string Id() => Guid.NewGuid().ToString("N");
    public static JsonNode? Node(object? value) => JsonSerializer.SerializeToNode(value, Json);
    static JsonObject Obj(string json) => JsonNode.Parse(json) as JsonObject ?? new();
    static JsonArray Arr(string? json) => string.IsNullOrWhiteSpace(json) ? new() : JsonNode.Parse(json) as JsonArray ?? new();
    static string Text(JsonObject b, string key, int max = 2000, bool required = true)
    {
        var value = b[key]?.ToString().Trim() ?? "";
        Need(value.Length <= max && (!required || value.Length > 0), $"Enter a valid {key} (maximum {max} characters).", 400);
        return value;
    }
    static decimal Number(JsonObject b, string key, decimal min = 0, decimal max = 999999999m)
    {
        Need(decimal.TryParse(b[key]?.ToString(), NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var value) && value >= min && value <= max && decimal.Round(value, 3) == value, $"Enter a valid {key}.", 400);
        return value;
    }
    static int Integer(JsonObject b, string key, int min, int max)
    {
        var n = Number(b, key, min, max); Need(n == decimal.Truncate(n), $"{key} must be an integer.", 400); return (int)n;
    }
    static bool Flag(JsonObject b, string key)
    {
        Need(b[key] is JsonValue val && val.TryGetValue<bool>(out _), $"{key} must be true or false.", 400);
        return b[key]!.GetValue<bool>();
    }
    static DateOnly Day(JsonObject b, string key)
    {
        Need(DateOnly.TryParseExact(b[key]?.ToString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var value), $"Enter a valid {key}.", 400); return value;
    }
    static string Choice(JsonObject b, string key, params string[] options)
    {
        var value = Text(b, key, 100); Need(options.Contains(value), $"Choose a valid {key}.", 400); return value;
    }
    static string ListJson(JsonObject b, string key, int max = 30)
    {
        Need(b[key] is JsonArray a && a.Count <= max && a.All(v => v is JsonValue j && j.TryGetValue<string>(out var s) && s.Length <= 200), $"Enter a valid {key} list.", 400);
        return b[key]!.ToJsonString();
    }
    static void Need(bool test, string message, int status = 409) { if (!test) throw new DomainException(status, message); }
    public string? CurrentId => accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
    public async Task<UserAccount> Me(params string[] roles)
    {
        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == CurrentId);
        Need(user is not null, "Sign in to continue.", 401);
        Need(roles.Length == 0 || roles.Contains(user!.Role), "This action is unavailable for your role.", 403);
        return user!;
    }
    public async Task<PropertyListing> Property(int id, bool owner = false)
    {
        var p = await db.Properties.SingleOrDefaultAsync(x => x.Id == id);
        Need(p is not null, "Property not found.", 404);
        if (owner) Need(p!.OwnerId == (await Me("landlord")).Id, "Choose your own property.", 403);
        return p!;
    }
    public async Task<RentalRequest> Request(string id, string? role = null)
    {
        var u = await Me(role is null ? [] : [role]); var r = await db.RentalRequests.SingleOrDefaultAsync(x => x.Id == id);
        Need(r is not null, "Rental request not found.", 404);
        Need(await VisibleRequests(u).AnyAsync(x => x.Id == id), "This request belongs to another account.", 403);
        return r!;
    }
    IQueryable<RentalRequest> VisibleRequests(UserAccount user)
    {
        var now = DateTimeOffset.UtcNow;
        return db.RentalRequests.Where(r => user.Role == "admin"
            || user.Role == "tenant" && (r.TenantId == user.Id || r.RoommateUserId == user.Id
                && (r.InvitationStatus == "accepted" || r.InvitationStatus == "pending" && r.Status == "waiting-roommate" && r.InvitationExpiresAt > now))
            || user.Role == "landlord" && r.Status != "waiting-roommate" && r.Status != "draft" && db.Properties.Any(p => p.Id == r.PropertyId && p.OwnerId == user.Id));
    }
    public async Task<Rental> RentalFor(string id, string? role = null)
    {
        var rental = await db.Rentals.SingleOrDefaultAsync(x => x.Id == id); Need(rental is not null, "Rental not found.", 404);
        await Request(rental!.RequestId, role); return rental;
    }
    void Log(string text) => db.Activity.Add(new ActivityEntry { ActorId = CurrentId, Text = text });
    async Task Save() => await db.SaveChangesAsync();
    public static bool AccountActive(UserAccount u) => u.Active || u.SuspendedUntil <= DateTimeOffset.UtcNow;
    public static object PublicUser(UserAccount u) => new { u.Id, u.Role, u.FirstName, u.LastName, u.Email, u.Phone, u.City, u.Occupation, u.Destination, active = AccountActive(u), u.SuspensionReason, u.SuspendedUntil };
    void Notify(string recipient, string type, string text, string route, PropertyListing? property = null)
        => db.Notifications.Add(new Notification { RecipientId = recipient, Type = type, Text = text, Route = route, PropertyId = property?.Id, PropertyTitle = property?.Title });
    void NotifyTenants(RentalRequest request, string text)
    {
        var route = "tenant/requests.html?id=" + request.Id;
        Notify(request.TenantId, "rental-update", text, route);
        if (request.RoommateUserId is not null && request.InvitationStatus == "accepted") Notify(request.RoommateUserId, "rental-update", text, route);
    }
    async Task<string> UpdatesRoute(string userId) => (await db.Users.SingleAsync(u => u.Id == userId)).Role == "landlord" ? "landlord/dashboard.html?tab=notifications" : "tenant/requests.html";
    async Task RequireBookable(PropertyListing property)
    {
        Need(property.Status == "published" && property.ReviewStatus == "approved" && AccountActive(await db.Users.SingleAsync(u => u.Id == property.OwnerId)), "This listing is unavailable for new rental arrangements.");
    }
    async Task RequireApplicantsActive(RentalRequest request)
    {
        Need(AccountActive(await db.Users.SingleAsync(u => u.Id == request.TenantId)), "The lead tenant is currently restricted. New rental steps are paused.");
        if (request.RoommateUserId is not null)
            Need(AccountActive(await db.Users.SingleAsync(u => u.Id == request.RoommateUserId)), "The invited tenant is currently restricted. Restore access or revise the participants before proceeding.");
    }
    static string FullName(UserAccount u) => u.FirstName + " " + u.LastName;
    static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Asia/Amman")).Date);
    static string Date(DateOnly d) => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
