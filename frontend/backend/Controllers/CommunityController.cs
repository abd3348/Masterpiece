using CampusMate.Models;
using System.Text.Json.Nodes;
using CampusMate.Services;
using Microsoft.AspNetCore.Mvc;
namespace CampusMate.Controllers;

[ApiController]
[Route("api")]
public sealed class CommunityController(CampusService s) : ControllerBase
{
    [HttpGet("meetings")] public async Task<IActionResult> Meetings() => Ok(await s.Meetings());
    [HttpPost("meetings")] public async Task<IActionResult> Create(JsonObject b) => Ok(await s.CreateMeeting(b));
    [HttpPost("meetings/{id}/response")] public async Task<IActionResult> Respond(string id, JsonObject b) => Ok(await s.RespondMeeting(id, b));
    [HttpPost("meetings/{id}/cancel")] public async Task<IActionResult> Cancel(string id) => Ok(await s.CancelMeeting(id));
    [HttpGet("meetings/{id}/room")] public async Task<IActionResult> Room(string id) => Ok(await s.MeetingRoom(id));
    [HttpPost("roommate-contacts")] public async Task<IActionResult> Contact(JsonObject b) => Ok(await s.Contact(b));
    [HttpPost("roommate-contacts/{id}/accept")] public async Task<IActionResult> Accept(string id) => Ok(await s.AcceptContact(id));
    [HttpGet("me/notifications")] public async Task<IActionResult> Notifications() => Ok(await s.Notifications());
    [HttpPost("me/notifications/{id}/read")] public async Task<IActionResult> Read(string id) => Ok(await s.ReadNotification(id));
    [HttpPost("assistant/messages")] public IActionResult Assistant(JsonObject b) => Ok(s.Assistant(b));
    [HttpPost("support-requests")][Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("support")] public async Task<IActionResult> Support(JsonObject b) => Ok(await s.SubmitSupport(b));
    [HttpGet("partial-offers")] public async Task<IActionResult> Offers() => Ok(await s.PublicOffers());
    [HttpGet("partial-offers/{id}")] public async Task<IActionResult> Offer(string id) => Ok(await s.PublicOffer(id));
    [HttpGet("me/partial-offers")] public async Task<IActionResult> Mine() => Ok(await s.MyOffers());
    [HttpGet("me/partial-requests")] public async Task<IActionResult> MyRequests() => Ok(await s.MyPartialRequests());
    [HttpPost("partial-offers")] public async Task<IActionResult> CreateOffer(JsonObject b) => Ok(await s.CreateOffer(b));
    [HttpPut("partial-offers/{id}")] public async Task<IActionResult> Edit(string id, JsonObject b) => Ok(await s.EditOffer(id, b));
    [HttpDelete("partial-offers/{id}")] public async Task<IActionResult> Delete(string id) => Ok(await s.DeleteOffer(id));
    [HttpPost("partial-offers/{id}/requests")] public async Task<IActionResult> RequestRoom(string id, JsonObject b) => Ok(await s.CreatePartialRequest(id, b));
    [HttpPost("partial-requests/{id}/review")] public async Task<IActionResult> Review(string id, JsonObject b) => Ok(await s.ReviewPartialRequest(id, b));
}
