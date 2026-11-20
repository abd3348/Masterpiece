using CampusMate.Models;
using System.Security.Claims;
using System.Text.Json.Nodes;
using CampusMate.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CampusMate.Controllers;

[ApiController]
[Route("api")]
public sealed class AccountController(CampusService service, IAntiforgery antiforgery) : ControllerBase
{
    async Task SignIn(CampusMate.Models.UserAccount u)
    {
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, u.Id), new Claim(ClaimTypes.Role, u.Role), new Claim(ClaimTypes.Name, u.FirstName), new Claim("security_stamp", u.SecurityStamp) }, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    }
    [HttpGet("bootstrap")] public async Task<IActionResult> Bootstrap() => Ok(await service.Bootstrap(antiforgery.GetAndStoreTokens(HttpContext).RequestToken));
    [HttpPost("auth/register")][EnableRateLimiting("auth")] public async Task<IActionResult> Register(JsonObject b) { var u = await service.Register(b); await SignIn(u); return Ok(CampusService.PublicUser(u)); }
    [HttpPost("auth/login")][EnableRateLimiting("auth")] public async Task<IActionResult> Login(JsonObject b) { var u = await service.Login(b); await SignIn(u); return Ok(CampusService.PublicUser(u)); }
    [HttpPost("auth/logout")] public async Task<IActionResult> Logout() { await HttpContext.SignOutAsync(); return NoContent(); }
    [HttpPut("me/profile")] public async Task<IActionResult> Profile(JsonObject b) => Ok(CampusService.PublicUser(await service.UpdateProfile(b)));
    [HttpPut("me/roommate-favorites/{id}")] public async Task<IActionResult> FavoriteRoommate(string id) { await service.FavoriteRoommate(id, true); return NoContent(); }
    [HttpDelete("me/roommate-favorites/{id}")] public async Task<IActionResult> UnfavoriteRoommate(string id) { await service.FavoriteRoommate(id, false); return NoContent(); }
    [HttpPut("me/password")] public async Task<IActionResult> Password(JsonObject b) { var u = await service.ChangePassword(b); await SignIn(u); return Ok(new { changed = true }); }
    [HttpGet("me/preferences")] public async Task<IActionResult> Preferences() => new JsonResult(await service.Preferences());
    [HttpPut("me/preferences")] public async Task<IActionResult> SavePreferences(JsonObject b) => Ok(await service.SavePreferences(b));
    [HttpDelete("me/preferences")] public async Task<IActionResult> DeletePreferences() { await service.DeletePreferences(); return NoContent(); }
}
