using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using CampusMate.Data;
using System.Data;
using System.Text.Json;
using System.Security.Claims;
using CampusMate.Services;

namespace CampusMate.Infrastructure;

public sealed class DomainException(int status, string message) : Exception(message) { public int Status { get; } = status; }

public sealed class ProblemMiddleware(RequestDelegate next, ILogger<ProblemMiddleware> logger)
{
    public async Task Invoke(HttpContext context)
    {
        try { await next(context); }
        catch (Exception ex)
        {
            if (context.Response.HasStarted) throw;
            var status = ex is DomainException domain ? domain.Status : ex is DbUpdateConcurrencyException ? 409 : ex is JsonException or FormatException ? 400 : 500;
            if (status == 500) logger.LogError(ex, "Request failed: {Path}", context.Request.Path);
            context.Response.Clear(); context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = status,
                Title = status == 500 ? "The request could not be completed." : ex.Message,
                Detail = status == 500 ? "Check the server log and database connection." : ex.Message
            }, options: (JsonSerializerOptions?)null, contentType: "application/problem+json", cancellationToken: context.RequestAborted);
        }
    }
}

// Database-scoped application lock serializes writes across all app instances.
// Availability and meeting overlap checks therefore run in the same transaction
// as the corresponding state transition, rather than trusting browser state.
public sealed class WriteTransactionFilter(AppDbContext db) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (HttpMethods.IsGet(context.HttpContext.Request.Method) || HttpMethods.IsHead(context.HttpContext.Request.Method)) { await next(); return; }
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        await db.Database.ExecuteSqlRawAsync("DECLARE @r int; EXEC @r = sys.sp_getapplock @Resource=N'CampusMate:write', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=15000; IF @r < 0 THROW 51000, 'Could not acquire application lock', 1;");
        var actorId = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        var actor = actorId is null ? null : await db.Users.SingleOrDefaultAsync(u => u.Id == actorId);
        var path = context.HttpContext.Request.Path.Value ?? "";
        if (actor is not null && !CampusService.AccountActive(actor)
            && path is not "/api/auth/logout" and not "/api/me/password" and not "/api/support-requests"
            && !(path.StartsWith("/api/me/notifications/") && path.EndsWith("/read")))
            throw new DomainException(403, "Your account is restricted to viewing existing records. " + actor.SuspensionReason);
        var result = await next();
        var status = (result.Result as ObjectResult)?.StatusCode ?? (result.Result as StatusCodeResult)?.StatusCode ?? 200;
        if (result.Exception is null && status < 400) await tx.CommitAsync();
        else await tx.RollbackAsync();
    }
}
