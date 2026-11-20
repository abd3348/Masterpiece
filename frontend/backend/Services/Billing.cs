using CampusMate.Models;
using CampusMate.Data;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    async Task<ListingFee> FeeFor(string id)
    {
        var u = await Me("landlord", "tenant"); var f = await db.ListingFees.SingleOrDefaultAsync(x => x.Id == id); Need(f is not null, "Publishing fee not found.", 404);
        if (f!.PropertyId is int property) await Property(property, true); else await Offer(f.PartialOfferId!, true);
        return f;
    }
    public async Task<object> CheckoutProperty(int id)
    {
        await Property(id, true); var fee = await db.ListingFees.SingleAsync(f => f.PropertyId == id); return await Checkout(fee);
    }
    public async Task<object> CheckoutOffer(string id)
    {
        await Offer(id, true); var fee = await db.ListingFees.SingleAsync(f => f.PartialOfferId == id); return await Checkout(fee);
    }
    async Task<object> Checkout(ListingFee f)
    {
        Need(f.Status != "paid", "This publishing fee is already paid.");
        Need(env.IsDevelopment(), "A production payment provider has not been configured. No charge was made.", 503);
        var origin = config["Campus:PublicOrigin"]?.TrimEnd('/') ?? "http://localhost:5080";
        Need(Uri.TryCreate(origin, UriKind.Absolute, out var url) && url.IsLoopback, "Development checkout requires a localhost PublicOrigin.", 503);
        return new { checkoutUrl = origin + "/billing/development/" + f.Id };
    }
    public async Task<object> DevelopmentFee(string id)
    {
        Need(env.IsDevelopment(), "Not found.", 404); var f = await FeeFor(id); return new { f.Id, f.Amount, f.Currency, f.Status };
    }
    public async Task<string> ConfirmDevelopmentFee(string id)
    {
        Need(env.IsDevelopment(), "Development payments are disabled.", 404); var f = await FeeFor(id);
        if (f.Status != "paid")
        {
            f.Status = "paid"; f.PaidAt = DateTimeOffset.UtcNow; f.Simulated = true; f.Provider = "development"; f.ProviderPaymentId = "development-" + f.Id;
            db.PaymentEvents.Add(new PaymentEvent { Provider = "development", EventId = f.Id, FeeId = f.Id });
            if (f.PropertyId is int property) { var p = await Property(property); Need(p.Status is "awaiting-fee" or "pending", "This listing is not awaiting a fee."); UpdateListingVisibility(p, f); }
            else { var o = await Offer(f.PartialOfferId!, true); Need(o.Status == "awaiting-fee", "This room offer is not awaiting a fee."); var r = await RentalFor(o.RentalId, "tenant"); Need(r.Status == "active", "The parent rental has ended."); Need(!await db.PartialOffers.AnyAsync(x => x.Id != o.Id && x.RentalId == o.RentalId && x.RoomNumber == o.RoomNumber && x.Status == "published" && x.StartDate < o.EndDate && x.EndDate > o.StartDate), "Another offer overlaps these dates."); o.Status = "published"; }
            Log("Development publishing fee confirmed (no real money)"); await Save();
        }
        return f.PropertyId is not null ? "landlord/dashboard.html" : "tenant/sublets.html";
    }
}
