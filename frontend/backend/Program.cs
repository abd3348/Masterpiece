using CampusMate.Models;
using CampusMate.Data;
using CampusMate.Infrastructure;
using CampusMate.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("CampusMate")));
builder.Services.AddScoped<CampusService>();
builder.Services.AddScoped<WriteTransactionFilter>();
builder.Services.AddScoped<PasswordHasher<UserAccount>>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.Name = "CampusMate.Csrf"; o.Cookie.SameSite = SameSiteMode.Strict; });
builder.Services.AddControllersWithViews(o =>
{
    o.Filters.Add<Microsoft.AspNetCore.Mvc.AutoValidateAntiforgeryTokenAttribute>();
    o.Filters.AddService<WriteTransactionFilter>();
}).AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 105 * 1024 * 1024);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 105 * 1024 * 1024);
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "CampusMate.Auth"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    o.ExpireTimeSpan = TimeSpan.FromHours(8); o.SlidingExpiration = false;
    o.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; },
        OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; },
        OnValidatePrincipal = async ctx =>
        {
            var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var id = ctx.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var stamp = ctx.Principal?.FindFirst("security_stamp")?.Value;
            var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id);
            if (user is null || stamp != user.SecurityStamp)
            {
                ctx.RejectPrincipal();
                await ctx.HttpContext.SignOutAsync();
            }
        }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("auth", context => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new() { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("support", context => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new() { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
var keys = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "keys");
Directory.CreateDirectory(keys);
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keys)).SetApplicationName("CampusMate");
var app = builder.Build();
if (args.Contains("--baseline-existing-database"))
{
    using var scope = app.Services.CreateScope();
    await ExistingDatabaseBaseline.AdoptAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    return;
}
app.UseMiddleware<ProblemMiddleware>();
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.XContentTypeOptions = "nosniff";
    ctx.Response.Headers["Referrer-Policy"] = "same-origin";
    if (ctx.Request.Path.StartsWithSegments("/api"))
    {
        ctx.Response.Headers.CacheControl = "no-cache, no-store";
        ctx.Response.Headers.Pragma = "no-cache";
    }
    await next();
});
// Standalone-only scripts stay out of the MVC app; config.js is served by HomeController.
var standaloneScripts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "/js/config.js", "/js/pages.js", "/js/seed.js", "/js/demo-showcase.js"
};
app.UseWhen(ctx => !standaloneScripts.Contains(ctx.Request.Path.Value ?? ""), branch => branch.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context => context.Context.Response.Headers.CacheControl = "no-cache"
}));
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}");
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if ((await db.Database.GetPendingMigrationsAsync()).Any())
        throw new InvalidOperationException("Database migrations are pending. Use dotnet ef database update; for the existing MasterDB first run --baseline-existing-database. See backend/README.md.");
    await DevelopmentDataSeeder.Initialize(scope.ServiceProvider, app.Environment, app.Configuration);
    await db.Database.CanConnectAsync();
}
app.Run();
