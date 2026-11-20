using CampusMate.Models;
using System.Text.Json.Nodes;
using CampusMate.Services;
using Microsoft.AspNetCore.Mvc;
namespace CampusMate.Controllers;

[ApiController]
[Route("api")]
public sealed class RentalsController(CampusService s) : ControllerBase
{
    [HttpGet("rental-requests")][HttpGet("me/rent-negotiations")] public async Task<IActionResult> List() => Ok(await s.Requests());
    [HttpGet("rental-requests/{id}")] public async Task<IActionResult> Get(string id) => Ok(await s.RequestDto(await s.Request(id)));
    [HttpPost("rental-requests")] public async Task<IActionResult> Create(JsonObject b) => Ok(await s.CreateRequest(b));
    [HttpPut("rental-requests/{id}")] public async Task<IActionResult> Edit(string id, JsonObject b) => Ok(await s.EditRentalRequest(id, b));
    [HttpPost("rental-requests/{id}/roommate-response")] public async Task<IActionResult> RoommateResponse(string id, JsonObject b) => Ok(await s.RespondRoommateInvitation(id, b));
    [HttpPost("rental-requests/{id}/cancel-invitation")] public async Task<IActionResult> CancelInvitation(string id, JsonObject b) => Ok(await s.CancelRoommateInvitation(id, b));
    [HttpPost("rental-requests/{id}/review")] public async Task<IActionResult> Review(string id, JsonObject b) => Ok(await s.ReviewRequest(id, b));
    [HttpPost("rental-requests/{id}/agreement")] public async Task<IActionResult> Agreement(string id, JsonObject b) => Ok(await s.SignAgreement(id, b));
    [HttpPost("rental-requests/{id}/inspection")] public async Task<IActionResult> Inspection(string id, JsonObject b) => Ok(await s.Inspect(id, b));
    [HttpPost("rental-requests/{id}/confirm-arrangement")] public async Task<IActionResult> Confirm(string id) => Ok(await s.ConfirmArrangement(id));
    [HttpGet("rentals")] public async Task<IActionResult> Rentals() => Ok(await s.Rentals());
    [HttpGet("rental-amendments")] public async Task<IActionResult> Amendments() => Ok(await s.MyRentalAmendments());
    [HttpPost("rentals/{id}/amendments")] public async Task<IActionResult> ProposeAmendment(string id, JsonObject b) => Ok(await s.ProposeRentalAmendment(id,b));
    [HttpPost("rental-amendments/{id}/response")] public async Task<IActionResult> AmendmentResponse(string id, JsonObject b) => Ok(await s.RespondRentalAmendment(id,b));
    [HttpPost("rentals/{id}/move-in")] public async Task<IActionResult> MoveIn(string id, JsonObject b) => Ok(await s.MoveIn(id, b));
    [HttpPut("rentals/{id}/conditions/{phase}")] public async Task<IActionResult> Condition(string id, string phase, JsonObject b) => Ok(await s.SaveCondition(id, phase, b));
    [HttpPost("rentals/{id}/close")] public async Task<IActionResult> Close(string id, JsonObject b) => Ok(await s.CloseRental(id, b));
    [HttpPut("rental-requests/{id}/rent-proposal")] public async Task<IActionResult> Propose(string id, JsonObject b) => Ok(await s.ProposeRent(id, b));
    [HttpPost("rental-requests/{id}/rent-proposal/review")] public async Task<IActionResult> ReviewRent(string id, JsonObject b) => Ok(await s.ReviewRent(id, b));
}
