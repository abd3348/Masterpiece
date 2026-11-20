using CampusMate.Models;
using System.Text.Json.Nodes;
using CampusMate.Data;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    async Task<PartialOffer> Offer(string id, bool owner = false)
    {
        var o = await db.PartialOffers.SingleOrDefaultAsync(x => x.Id == id); Need(o is not null, "Room offer not found.", 404);
        if (owner) { var r = await RentalFor(o!.RentalId, "tenant"); var req = await db.RentalRequests.SingleAsync(x => x.Id == r.RequestId); Need(req.TenantId == CurrentId, "Choose your own room offer.", 403); }
        return o!;
    }
    public async Task<List<JsonObject>> MyOffers()
    {
        var u = await Me(); if (u.Role != "tenant") return [];
        var offers = await db.PartialOffers.Where(o => o.Status != "deleted" && db.Rentals.Any(r => r.Id == o.RentalId && db.RentalRequests.Any(q => q.Id == r.RequestId && q.TenantId == u.Id))).ToListAsync(); return await ProjectionList.Map(offers, OfferDto);
    }
    public async Task<List<object>> MyPartialRequests()
    {
        var u = await Me(); if (u.Role != "tenant") return [];
        var rows = await db.PartialRequests.Where(q => q.TenantId == u.Id || db.PartialOffers.Any(o => o.Id == q.ListingId && db.Rentals.Any(r => r.Id == o.RentalId && db.RentalRequests.Any(a => a.Id == r.RequestId && a.TenantId == u.Id)))).ToListAsync(); return await ProjectionList.Map(rows, PartialRequestDto);
    }
    async Task OfferAvailable(PartialOffer o)
    {
        var r = await db.Rentals.SingleAsync(x => x.Id == o.RentalId); var req = await db.RentalRequests.SingleAsync(x => x.Id == r.RequestId); var p = await Property(req.PropertyId);
        Need(o.Status == "published" && o.EndDate > Today && r.Status == "active" && p.Status == "published", "This room offer is unavailable.", 404);
    }
    public async Task<List<JsonObject>> PublicOffers()
    {
        var rows = await db.PartialOffers.Where(o => o.Status == "published" && o.EndDate > Today && db.Rentals.Any(r => r.Id == o.RentalId && r.Status == "active" && db.RentalRequests.Any(q => q.Id == r.RequestId && db.Properties.Any(p => p.Id == q.PropertyId && p.Status == "published")))).ToListAsync(); return await ProjectionList.Map(rows, OfferDto);
    }
    public async Task<object> PublicOffer(string id)
    {
        var o = await Offer(id); await OfferAvailable(o); var r = await db.Rentals.SingleAsync(x => x.Id == o.RentalId); var req = await db.RentalRequests.SingleAsync(x => x.Id == r.RequestId);
        var p = await PropertyDto(await Property(req.PropertyId));
        p["status"] = "partial"; p["title"] = p["title"]!.ToString() + " - Room " + o.RoomNumber; p["price"] = o.Price; p["period"] = "Daily"; p["beds"] = 1; p["type"] = o.Occupancy == "private" ? "Private room" : "Shared room";
        p["availableFrom"] = Date(o.StartDate); p["availableTo"] = Date(o.EndDate); p["description"] = o.Notes ?? p["description"]!.ToString(); p["partialOffer"] = await OfferDto(o); return p;
    }
    async Task FillOffer(PartialOffer o, JsonObject b)
    {
        var rental = await RentalFor(o.RentalId, "tenant"); Need(rental.Status == "active" && rental.MoveInComplete, "Confirm move-in to an active rental first."); var req = await db.RentalRequests.SingleAsync(x => x.Id == rental.RequestId); Need(req.TenantId == CurrentId, "Only the lead tenant manages room offers.", 403); var snapshot = Obj(req.PropertySnapshotJson);
        var start = Day(b, "startDate"); var end = Day(b, "endDate"); var price = Number(b, "price", .001m, 999999m);
        Need(start >= Today && start >= req.StartDate && end <= rental.EndDate && end.DayNumber - start.DayNumber is >= 1 and <= 30, "Choose a 1-30 day range inside your active rental.", 400);
        var room = b.ContainsKey("roomNumber") ? Integer(b, "roomNumber", 1, snapshot["beds"]!.GetValue<int>()) : o.RoomNumber;
        var occupancy = b.ContainsKey("occupancy") ? Choice(b, "occupancy", "private", "shared") : o.Occupancy;
        Need(!await db.PartialOffers.AnyAsync(x => x.Id != o.Id && x.RentalId == o.RentalId && x.RoomNumber == room && x.Status == "published" && x.StartDate < end && x.EndDate > start), "Another published offer overlaps these room dates.");
        if (await db.PartialRequests.AnyAsync(q => q.ListingId == o.Id && q.Status == "approved")) Need(price == o.Price && start == o.StartDate && end == o.EndDate && room == o.RoomNumber && occupancy == o.Occupancy, "Price, dates and room are locked after an accepted request.");
        o.StartDate = start; o.EndDate = end; o.Price = price; o.RoomNumber = room; o.Occupancy = occupancy; o.Notes = Text(b, "notes", 500, false);
    }
    public async Task<object> CreateOffer(JsonObject b)
    {
        await Me("tenant"); var o = new PartialOffer { RentalId = Text(b, "rentalId", 64), Status = "awaiting-fee" }; await FillOffer(o, b); db.PartialOffers.Add(o); await Save(); db.ListingFees.Add(new ListingFee { PartialOfferId = o.Id, Amount = 5, Currency = "JOD", Status = "unpaid" }); await Save(); return await OfferDto(o);
    }
    public async Task<object> EditOffer(string id, JsonObject b) { var o = await Offer(id, true); Need(o.Status != "deleted", "This offer is deleted."); await FillOffer(o, b); await Save(); return await OfferDto(o); }
    public async Task<object> DeleteOffer(string id) { var o = await Offer(id, true); Need(!await db.PartialRequests.AnyAsync(q => q.ListingId == id && q.Status == "approved"), "An accepted request prevents deleting this offer."); o.Status = "deleted"; await Save(); return await OfferDto(o); }
    public async Task<object> CreatePartialRequest(string id, JsonObject b)
    {
        var u = await Me("tenant"); var o = await Offer(id); await OfferAvailable(o); var r = await db.Rentals.SingleAsync(x => x.Id == o.RentalId); var req = await db.RentalRequests.SingleAsync(x => x.Id == r.RequestId); Need(req.TenantId != u.Id, "You cannot request your own room offer.", 400);
        var start = Day(b, "startDate"); var end = Day(b, "endDate"); Need(start >= Today && start >= o.StartDate && end <= o.EndDate && end > start, "Choose dates inside the room offer.", 400);
        var existing = await db.PartialRequests.SingleOrDefaultAsync(q => q.ListingId == id && q.TenantId == u.Id && q.Status == "pending"); if (existing is not null) return await PartialRequestDto(existing);
        var q = new PartialRequest { ListingId = id, TenantId = u.Id, StartDate = start, EndDate = end, Status = "pending", OfferSnapshotJson = (await OfferDto(o)).ToJsonString() }; db.PartialRequests.Add(q); await Save(); return await PartialRequestDto(q);
    }
    public async Task<object> ReviewPartialRequest(string id, JsonObject b)
    {
        await Me("tenant"); var q = await db.PartialRequests.SingleOrDefaultAsync(x => x.Id == id); Need(q is not null, "Room request not found.", 404); var o = await Offer(q!.ListingId, true); Need(q.Status == "pending", "This room request was already reviewed."); var approve = Flag(b, "approved");
        if (approve) { await OfferAvailable(o); Need(q.StartDate >= Today && q.StartDate >= o.StartDate && q.EndDate <= o.EndDate, "The requested dates are no longer available."); Need(!await db.PartialRequests.AnyAsync(x => x.Id != id && x.ListingId == q.ListingId && x.Status == "approved" && x.StartDate < q.EndDate && x.EndDate > q.StartDate), "These dates overlap an accepted request."); }
        q.Status = approve ? "approved" : "rejected"; await Save(); return await PartialRequestDto(q);
    }
}
