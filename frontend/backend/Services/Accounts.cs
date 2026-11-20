using CampusMate.Models;
using System.Net.Mail;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using CampusMate.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    static string Email(JsonObject body)
    {
        var email = Text(body, "email", 254);
        Need(MailAddress.TryCreate(email, out var address) && address.Address == email && !email.Contains(".."), "Enter a valid email address.", 400); return email;
    }
    static string PersonName(JsonObject b, string field)
    {
        var s = Text(b, field, 100); Need(Regex.IsMatch(s, @"^[\p{L}\p{M}][\p{L}\p{M} '\-]*$"), "Enter a valid " + field + ".", 400); return s;
    }
    static string Phone(JsonObject b)
    {
        var phone = Text(b, "phone", 32); Need(Regex.IsMatch(phone, @"^(?:0|\+962|00962)7[789]\d{7}$"), "Enter a valid Jordanian mobile number.", 400); return phone;
    }
    static string Password(JsonObject b, string field)
    {
        var p = Text(b, field, 128); Need(p.Length >= 8 && p.Any(char.IsUpper) && p.Any(char.IsLower) && p.Any(char.IsDigit), "Password must contain at least 8 characters, uppercase, lowercase and a number.", 400); return p;
    }
    public async Task<UserAccount> Register(JsonObject body)
    {
        var role = Choice(body, "role", "tenant", "landlord"); var email = Email(body); var normal = email.ToUpperInvariant();
        Need(!await db.Users.AnyAsync(x => x.NormalizedEmail == normal), "This email is already registered.");
        var u = new UserAccount
        {
            Role = role,
            FirstName = PersonName(body, "firstName"),
            LastName = PersonName(body, "lastName"),
            Email = email,
            NormalizedEmail = normal,
            Phone = Phone(body),
            City = Text(body, "city", 100),
            Occupation = Text(body, "occupation", 150, false),
            Destination = Text(body, "destination", 200, false),
            SecurityStamp = Id()
        };
        u.PasswordHash = hasher.HashPassword(u, Password(body, "password")); db.Users.Add(u); await Save(); return u;
    }
    public async Task<UserAccount> Login(JsonObject body)
    {
        var normal = Email(body).ToUpperInvariant(); var password = Text(body, "password", 128); var u = await db.Users.SingleOrDefaultAsync(x => x.NormalizedEmail == normal);
        // Perform a hash verification for unknown accounts as well.
        var dummy = new UserAccount(); var hash = u?.PasswordHash ?? hasher.HashPassword(dummy, "DummyPassword123!");
        var result = hasher.VerifyHashedPassword(u ?? dummy, hash, password);
        Need(u is not null && result != PasswordVerificationResult.Failed, "Email or password is incorrect.", 401);
        if (result == PasswordVerificationResult.SuccessRehashNeeded) { u!.PasswordHash = hasher.HashPassword(u, password); await Save(); }
        return u!;
    }
    public async Task<UserAccount> UpdateProfile(JsonObject b)
    {
        var u = await Me(); var email = Email(b); var normal = email.ToUpperInvariant();
        Need(!await db.Users.AnyAsync(x => x.Id != u.Id && x.NormalizedEmail == normal), "This email is already registered.");
        u.FirstName = PersonName(b, "firstName"); u.LastName = PersonName(b, "lastName"); u.Email = email; u.NormalizedEmail = normal; u.Phone = Phone(b); u.City = Text(b, "city", 100);
        if (u.Role != "admin") { u.Occupation = Text(b, "occupation", 150, false); u.Destination = Text(b, "destination", 200, false); }
        Log("Profile updated"); await Save(); return u;
    }
    public async Task<UserAccount> ChangePassword(JsonObject b)
    {
        var u = await Me(); var current = Text(b, "currentPassword", 128); var next = Password(b, "newPassword");
        Need(hasher.VerifyHashedPassword(u, u.PasswordHash, current) != PasswordVerificationResult.Failed, "Your current password is incorrect.", 400);
        Need(current != next, "Choose a different password.", 400); u.PasswordHash = hasher.HashPassword(u, next); u.SecurityStamp = Id(); Log("Account password changed"); await Save(); return u;
    }
    public async Task<object?> Preferences()
    {
        var u = await Me("tenant"); var p = await db.Preferences.SingleOrDefaultAsync(x => x.UserId == u.Id); return p is null ? null : PreferenceDto(p);
    }
    public async Task<object> SavePreferences(JsonObject b)
    {
        var u = await Me("tenant"); var p = await db.Preferences.SingleOrDefaultAsync(x => x.UserId == u.Id);
        if (p is null) { p = new HousingPreference { UserId = u.Id }; db.Preferences.Add(p); }
        p.MinBudget = Number(b, "minBudget"); p.MaxBudget = Number(b, "maxBudget"); Need(p.MaxBudget >= p.MinBudget, "Maximum budget must not be less than minimum budget.", 400);
        p.AreasJson = ListJson(b, "areas"); p.HabitsJson = ListJson(b, "habits"); p.Destination = Text(b, "destination", 200, false); p.Commute = Integer(b, "commute", 0, 240);
        p.Housing = Choice(b, "housing", "Apartment", "Studio", "Private room", "Shared room"); p.Furnishing = Choice(b, "furnishing", "Furnished", "Partly furnished", "Unfurnished");
        var billing = Choice(b, "billing", "Monthly", "Daily", "Daily / short stay"); p.Billing = billing == "Monthly" ? "Monthly" : "Daily";
        var count = Text(b, "roommates", 3); Need(new[] { "0", "1", "2", "3+" }.Contains(count), "Choose a roommate count.", 400);
        p.Roommates = count != "0"; p.RoommatesCount = count; p.Sleep = Choice(b, "sleep", "Early bird", "Flexible", "Night owl"); p.Schedule = Choice(b, "schedule", "Daytime", "Evenings", "Flexible");
        p.Noise = (byte)Integer(b, "noise", 1, 5); p.Cleanliness = (byte)Integer(b, "cleanliness", 1, 5); p.Smoking = Choice(b, "smoking", "Not allowed", "Outside only", "Fine with it");
        var profile = await db.RoommateProfiles.SingleOrDefaultAsync(x => x.UserId == u.Id);
        if (profile is null && p.Roommates) { profile = new RoommateProfile { UserId = u.Id }; db.RoommateProfiles.Add(profile); }
        if (profile is not null) { profile.Available = p.Roommates; profile.Area = Arr(p.AreasJson).FirstOrDefault()?.ToString() ?? u.City; profile.MinBudget = p.MinBudget; profile.MaxBudget = p.MaxBudget; profile.Sleep = p.Sleep; profile.Schedule = p.Schedule; profile.Noise = p.Noise.Value; profile.Cleanliness = p.Cleanliness.Value; profile.Smoking = p.Smoking; profile.HabitsJson = p.HabitsJson; }
        Log("Housing preferences saved"); await Save(); return PreferenceDto(p);
    }
    public async Task DeletePreferences()
    {
        var u = await Me("tenant"); var p = await db.Preferences.SingleOrDefaultAsync(x => x.UserId == u.Id); if (p is not null) db.Preferences.Remove(p);
        var profile = await db.RoommateProfiles.SingleOrDefaultAsync(x => x.UserId == u.Id); if (profile is not null) profile.Available = false; await Save();
    }
}
