using System.Security.Claims;
using CampusMate.ViewModels;
using Microsoft.AspNetCore.Mvc;
namespace CampusMate.Controllers;

public sealed class ScreensController : Controller
{
    [HttpGet("/html/{section}/{page}.html")]
    public IActionResult Screen(string section, string page)
    {
        if (!ScreenCatalog.Screens.TryGetValue(section + "/" + page, out var screen)) return NotFound();
        if (section is "tenant" or "landlord" or "admin")
        {
            if (User.Identity?.IsAuthenticated != true) return Redirect("/#auth%2Flogin.html");
            if (User.FindFirstValue(ClaimTypes.Role) != section) return Forbid();
        }
        Response.Headers.CacheControl = "no-store";
        return View("~/Views/" + screen.View + ".cshtml", screen);
    }
}
