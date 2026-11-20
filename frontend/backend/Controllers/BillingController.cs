using CampusMate.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
namespace CampusMate.Controllers;

public sealed class BillingController(CampusService s) : Controller
{
    [HttpPost("api/properties/{id:int}/listing-fee/checkout")] public async Task<IActionResult> PropertyCheckout(int id) => Ok(await s.CheckoutProperty(id));
    [HttpPost("api/partial-offers/{id}/listing-fee/checkout")] public async Task<IActionResult> OfferCheckout(string id) => Ok(await s.CheckoutOffer(id));
    [HttpGet("billing/development/{id}")] public async Task<IActionResult> Development(string id) { var fee = await s.DevelopmentFee(id); ViewData["Fee"] = JsonSerializer.SerializeToElement(fee, new JsonSerializerOptions(JsonSerializerDefaults.Web)); return View(); }
    [HttpPost("billing/development/{id}")] public async Task<IActionResult> Confirm(string id) { var route = await s.ConfirmDevelopmentFee(id); return Redirect("/#" + Uri.EscapeDataString(route)); }
}
