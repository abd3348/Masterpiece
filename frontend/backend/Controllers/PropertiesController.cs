using CampusMate.Models;
using System.Text.Json.Nodes;
using CampusMate.Services;
using Microsoft.AspNetCore.Mvc;
namespace CampusMate.Controllers;

[ApiController]
[Route("api")]
public sealed class PropertiesController(CampusService s) : ControllerBase
{
    [HttpGet("properties")] public async Task<IActionResult> List() => Ok(await s.Properties());
    [HttpGet("properties/{id:int}")] public async Task<IActionResult> Get(int id) => Ok(await s.PublicProperty(id));
    [HttpPost("properties")] public async Task<IActionResult> Create(JsonObject b) => Ok(await s.CreateProperty(b));
    [HttpPut("properties/{id:int}")] public async Task<IActionResult> Edit(int id, JsonObject b) => Ok(await s.EditProperty(id, b));
    [HttpPut("properties/{id:int}/status")] public async Task<IActionResult> Status(int id, JsonObject b) => Ok(await s.SetPropertyStatus(id, b));
    [HttpPut("me/favorites/{id:int}")] public async Task<IActionResult> Favorite(int id) { await s.Favorite(id, true); return NoContent(); }
    [HttpDelete("me/favorites/{id:int}")] public async Task<IActionResult> Unfavorite(int id) { await s.Favorite(id, false); return NoContent(); }
    [HttpPost("properties/{id:int}/reviews")] public async Task<IActionResult> Review(int id, JsonObject b) => Ok(await s.AddReview(id, b));
    [HttpPost("properties/{id:int}/reports")] public async Task<IActionResult> Report(int id, JsonObject b) => Ok(await s.ReportProperty(id, b));
    [HttpPost("admin/properties/{id:int}/analysis")] public async Task<IActionResult> Analyze(int id) => Ok(await s.AnalyzeListing(id));
    [HttpPost("admin/properties/{id:int}/review")] public async Task<IActionResult> Moderate(int id, JsonObject b) => Ok(await s.Moderate(id, b));
    [HttpPost("admin/reports/{id}/resolve")] public async Task<IActionResult> Resolve(string id, JsonObject b) => Ok(await s.ResolveReport(id, b));
    [HttpPut("admin/users/{id}/status")] public async Task<IActionResult> UserStatus(string id, JsonObject b) => Ok(await s.SetUserStatus(id, b));
    [HttpPost("properties/{id:int}/video-analysis")] public async Task<IActionResult> Video(int id) { var p = await s.PublicProperty(id); if (p["video"] is null) return BadRequest(new { title = "This property has no video." }); return Ok(new { demo = false, summary = "No AI video analysis provider is configured. Inspect the uploaded video directly.", condition = "Not analyzed", furniture = "Not analyzed", maintenance = "Not analyzed", limitations = "No video-content analysis has been performed." }); }
}
