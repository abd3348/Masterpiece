using CampusMate.Models;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Data;

public static class DevelopmentDataSeeder
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static async Task Initialize(IServiceProvider services, IWebHostEnvironment env, IConfiguration config)
    {
        var db = services.GetRequiredService<AppDbContext>();
        if (!env.IsDevelopment() || !config.GetValue<bool>("Campus:SeedDevelopmentData")) return;
        var password = config["Campus:DevelopmentPassword"];
        if (string.IsNullOrWhiteSpace(password)) throw new InvalidOperationException("Set Campus:DevelopmentPassword before enabling development seed data.");
        await using var tx = await db.Database.BeginTransactionAsync();
        await db.Database.ExecuteSqlRawAsync("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource=N'CampusMate:write', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=15000; IF @r<0 THROW 51000,'Database initialization lock unavailable',1;");
        if (await db.Users.AnyAsync()) { await tx.CommitAsync(); return; }
        var source = JsonNode.Parse(await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "App_Data/campus-seed.json")))!.AsObject();
        var hasher = services.GetRequiredService<PasswordHasher<UserAccount>>();
        foreach (var item in source["users"]!.AsArray())
        {
            var u = item!.Deserialize<UserAccount>(Json)!; u.NormalizedEmail = u.Email.ToUpperInvariant(); u.SecurityStamp = Guid.NewGuid().ToString("N"); u.PasswordHash = hasher.HashPassword(u, password); db.Users.Add(u);
        }
        foreach (var item in source["roommates"]!.AsArray())
        {
            var name = item!["name"]!.ToString(); var id = "account-" + item["id"]!.ToString();
            var user = new UserAccount { Id = id, Role = "tenant", FirstName = name, LastName = "Sample", Email = name.ToLowerInvariant() + "@campus.test", Phone = "0791234567", City = "Amman", Occupation = item["occupation"]!.ToString(), Destination = item["destination"]!.ToString(), SecurityStamp = Guid.NewGuid().ToString("N") };
            user.NormalizedEmail = user.Email.ToUpperInvariant(); user.PasswordHash = hasher.HashPassword(user, password); db.Users.Add(user);
            var p = item.Deserialize<RoommateProfile>(Json)!; p.UserId = id; p.HabitsJson = item["habits"]!.ToJsonString(); db.RoommateProfiles.Add(p);
        }
        await db.SaveChangesAsync();
        await db.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT dbo.Properties ON");
        foreach (var item in source["properties"]!.AsArray())
        {
            var p = item!.Deserialize<PropertyListing>(Json)!; p.AmenitiesJson = item!["amenities"]!.ToJsonString(); p.RiskReasonsJson = item["riskReasons"]?.ToJsonString() ?? "[]"; p.ModerationAnalysisJson = item["moderationAnalysis"]?.ToJsonString();
            p.ReviewStatus = p.Status == "deleted" ? "suspended" : p.Status == "pending" ? "pending" : "approved";
            p.OwnerWantsPublished = p.Status != "archived";
            db.Properties.Add(p);
        }
        await db.SaveChangesAsync(); await db.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT dbo.Properties OFF");
        foreach (var item in source["properties"]!.AsArray())
        {
            var id = item!["id"]!.GetValue<int>(); var owner = item["ownerId"]!.ToString(); var photo = item["photo"]?.ToString();
            if (!string.IsNullOrEmpty(photo))
            {
                var media = new MediaFile { UploadedBy = owner, Name = "Sample interior", StorageKey = "seed:" + photo, ContentType = "image/jpeg", SizeBytes = 1 }; db.Media.Add(media); await db.SaveChangesAsync(); db.PropertyMedia.Add(new PropertyMedia { PropertyId = id, MediaId = media.Id, Kind = "photo" });
            }
            var f = item["listingFee"]; var paid = f?["status"]?.ToString() == "paid";
            db.ListingFees.Add(new ListingFee { PropertyId = id, Amount = 20, Currency = "JOD", Status = paid ? "paid" : "unpaid", Simulated = true, PaidAt = paid ? DateTimeOffset.UtcNow : null });
            foreach (var review in item["reviews"]?.AsArray() ?? new JsonArray()) db.Reviews.Add(new Review { PropertyId = id, AuthorId = "tenant-1", Rating = (byte)review!["rating"]!.GetValue<int>(), Text = review["text"]!.ToString() });
            if (item["moderation"] is JsonObject m) db.ModerationHistory.Add(new ModerationDecision { PropertyId = id, ReviewedBy = "admin-1", Decision = m["decision"]?.ToString() ?? "removed", Reason = m["reason"]?.ToString(), Notes = m["notes"]?.ToString() });
        }
        foreach (var item in source["notifications"]?.AsArray() ?? new JsonArray())
        {
            var n = item!.Deserialize<Notification>(Json)!; n.IsRead = item!["read"]?.GetValue<bool>() ?? false; db.Notifications.Add(n);
        }
        db.Activity.Add(new ActivityEntry { Text = "Development sample data initialized; all seeded accounts are test accounts." });
        await db.SaveChangesAsync(); await tx.CommitAsync();
    }
}
