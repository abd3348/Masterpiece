using CampusMate.Models;
using CampusMate.Data;
using CampusMate.Infrastructure;
using CampusMate.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Controllers;

[ApiController]
[Route("api/media")]
public sealed class MediaController(AppDbContext db, CampusService service, IConfiguration configuration, IWebHostEnvironment env) : ControllerBase
{
    string UploadRoot => Path.GetFullPath(Path.Combine(env.ContentRootPath, configuration["Campus:UploadDirectory"] ?? "App_Data/uploads"));
    [HttpPost]
    [RequestSizeLimit(105 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        var u = await service.Me("tenant", "landlord");
        if (file.Length <= 0 || file.Length > 100 * 1024 * 1024) throw new DomainException(400, "Choose a file up to 100 MB.");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var types = new Dictionary<string, string> { { ".jpg", "image/jpeg" }, { ".jpeg", "image/jpeg" }, { ".png", "image/png" }, { ".webp", "image/webp" }, { ".gif", "image/gif" }, { ".mp4", "video/mp4" }, { ".webm", "video/webm" }, { ".mov", "video/quicktime" } };
        if (!types.TryGetValue(ext, out var type)) throw new DomainException(400, "Unsupported file type.");
        if (type.StartsWith("image/") && file.Length > 10 * 1024 * 1024) throw new DomainException(400, "Choose an image up to 10 MB.");
        await using var input = file.OpenReadStream(); var signature = new byte[16]; var count = await input.ReadAsync(signature);
        bool ascii(int start, string value) => count >= start + value.Length && System.Text.Encoding.ASCII.GetString(signature, start, value.Length) == value;
        var valid = ext switch
        {
            ".jpg" or ".jpeg" => count >= 3 && signature[0] == 255 && signature[1] == 216 && signature[2] == 255,
            ".png" => signature.AsSpan(0, Math.Min(count, 8)).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
            ".gif" => ascii(0, "GIF87a") || ascii(0, "GIF89a"),
            ".webp" => ascii(0, "RIFF") && ascii(8, "WEBP"),
            ".mp4" or ".mov" => ascii(4, "ftyp"),
            ".webm" => count >= 4 && signature.AsSpan(0, 4).SequenceEqual(new byte[] { 0x1a, 0x45, 0xdf, 0xa3 }),
            _ => false
        };
        if (!valid) throw new DomainException(400, "File contents do not match the extension.");
        var id = CampusService.Id(); var key = id + ext; Directory.CreateDirectory(UploadRoot); var path = Path.Combine(UploadRoot, key);
        try
        {
            await using (var output = System.IO.File.Create(path)) { await output.WriteAsync(signature.AsMemory(0, count)); await input.CopyToAsync(output); }
            var m = new MediaFile { Id = id, UploadedBy = u.Id, Name = Path.GetFileName(file.FileName)[..Math.Min(255, Path.GetFileName(file.FileName).Length)], StorageKey = key, ContentType = type, SizeBytes = file.Length }; db.Media.Add(m); await db.SaveChangesAsync(); return Ok(service.MediaDto(m));
        }
        catch { if (System.IO.File.Exists(path)) System.IO.File.Delete(path); throw; }
    }
    [HttpGet("{id}")]
    public async Task<IActionResult> Download(string id)
    {
        var m = await db.Media.SingleOrDefaultAsync(x => x.Id == id); if (m is null) return NotFound();
        var actor = service.CurrentId;
        var now = DateTimeOffset.UtcNow;
        var visible = actor == m.UploadedBy || await db.PropertyMedia.AnyAsync(pm => pm.MediaId == id && db.Properties.Any(p => p.Id == pm.PropertyId && (p.Status == "published" && p.ReviewStatus == "approved" && db.Users.Any(u => u.Id == p.OwnerId && (u.Active || u.SuspendedUntil <= now)) || p.OwnerId == actor)))
            || (actor is not null && await db.PropertyMedia.AnyAsync(pm => pm.MediaId == id && db.RentalRequests.Any(q => q.PropertyId == pm.PropertyId && (q.Status == "confirmed" || q.Status == "active" || q.Status == "closed") && (q.TenantId == actor || q.RoommateUserId == actor && q.InvitationStatus == "accepted"))))
            || (actor is not null && (await service.Me()).Role == "admin")
            || (actor is not null && await db.ConditionReports.AnyAsync(cr => cr.VideoId == id && db.Rentals.Any(r => r.Id == cr.RentalId && db.RentalRequests.Any(q => q.Id == r.RequestId && (q.TenantId == actor || q.RoommateUserId == actor && q.InvitationStatus == "accepted" || db.Properties.Any(p => p.Id == q.PropertyId && p.OwnerId == actor))))));
        if (!visible) return StatusCode(403);
        if (m.StorageKey.StartsWith("seed:")) return Redirect("https://images.unsplash.com/" + m.StorageKey[5..] + "?auto=format&fit=crop&w=1200&q=80");
        var path = Path.GetFullPath(Path.Combine(UploadRoot, m.StorageKey));
        if (!path.StartsWith(UploadRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(path)) return NotFound();
        return PhysicalFile(path, m.ContentType, enableRangeProcessing: true);
    }
}
