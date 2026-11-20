using Microsoft.AspNetCore.Mvc;
namespace CampusMate.Controllers;

public sealed class HomeController : Controller
{
    [HttpGet("/")][HttpGet("/index.html")] public IActionResult Index() => View();
    [HttpGet("/js/config.js")] public IActionResult Config() => Content("window.CampusConfig=Object.freeze({mode:'api',renderMode:'mvc',apiBaseUrl:'/api',credentials:'include',timeoutMs:15000,csrfHeader:'X-CSRF-TOKEN'});", "text/javascript");
    [HttpGet("/health")] public IActionResult Health() => Ok(new { status = "running" });
}
