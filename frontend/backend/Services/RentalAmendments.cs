using CampusMate.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Nodes;

namespace CampusMate.Services;

public sealed partial class CampusService
{
    public async Task<object> MyRentalAmendments()
    {
        var user=await Me("tenant","landlord");
        var needle="\""+user.Id+"\"";
        return await ProjectionList.Map(await db.RentalAmendments.Where(a=>a.RequiredApproversJson.Contains(needle)).OrderByDescending(a=>a.CreatedAt).ToListAsync(),AmendmentDto);
    }
    async Task<object> AmendmentDto(RentalAmendment amendment)
    {
        var ids=Arr(amendment.RequiredApproversJson).Select(x=>x!.ToString()).ToArray();
        var approved=Arr(amendment.ApprovedByJson).Select(x=>x!.ToString()).ToArray();
        var people=await db.Users.Where(u=>ids.Contains(u.Id)).ToListAsync();
        var rental=await db.Rentals.SingleAsync(r=>r.Id==amendment.RentalId);
        var request=await db.RentalRequests.SingleAsync(r=>r.Id==rental.RequestId);
        return new {amendment.Id,amendment.RentalId,amendment.ProposedBy,amendment.Status,amendment.BaseTermsVersion,amendment.CreatedAt,
            propertyTitle=Obj(request.PropertySnapshotJson)["title"]?.ToString(),original=Obj(amendment.OriginalTermsJson),proposed=Obj(amendment.ProposedTermsJson),
            approvers=people.Select(u=>new {u.Id,name=FullName(u),u.Role,accepted=approved.Contains(u.Id)})};
    }
    public async Task<object> ProposeRentalAmendment(string rentalId,JsonObject body)
    {
        var actor=await Me("tenant","landlord");var rental=await RentalFor(rentalId);
        Need(rental.Status is "active" or "upcoming","Only confirmed or active rentals can be amended.");
        var request=await db.RentalRequests.SingleAsync(r=>r.Id==rental.RequestId);CheckTermsVersion(request,body);
        var home=await Property(request.PropertyId);
        var start=Day(body,"startDate");var duration=Integer(body,"duration",1,request.Period=="Daily"?365:36);
        var end=request.Period=="Daily"?start.AddDays(duration):start.AddMonths(duration);
        Need(rental.Status=="active"?start==request.StartDate:start>=Today,"An active rental keeps its original start date; choose a valid future start for an upcoming rental.",400);
        Need(end>Today&&await Available(home,start,end,request.Id),"The proposed dates conflict with another rental or the advertised availability.");
        var price=Number(body,"price",.001m,999999m);var deposit=Number(body,"deposit",.001m,999999m);
        var profileId=Text(body,"roommateId",64,false);string? nextUser=null;
        if(profileId.Length>0)
        {
            var profile=await db.RoommateProfiles.SingleOrDefaultAsync(p=>p.Id==profileId&&(p.Available||p.Id==request.RoommateId));
            Need(profile is not null&&profile.UserId!=request.TenantId,"Choose another available roommate.",400);nextUser=profile!.UserId;
            Need(AccountActive(await db.Users.SingleAsync(u=>u.Id==nextUser)),"The proposed roommate is restricted.");
        }
        var required=new HashSet<string>{request.TenantId,home.OwnerId};
        var previousUser=request.RoommateUserId;
        if(previousUser is null&&request.RoommateId is not null)previousUser=(await db.RoommateProfiles.SingleOrDefaultAsync(p=>p.Id==request.RoommateId))?.UserId;
        if(previousUser is not null)required.Add(previousUser);
        if(nextUser is not null)required.Add(nextUser);
        foreach(var user in await db.Users.Where(u=>required.Contains(u.Id)).ToListAsync())Need(AccountActive(user),"All affected participants must have active accounts before proposing an amendment.");
        Need(Flag(body,"accepted"),"Confirm your own approval of the proposed terms.",400);
        var amendment=new RentalAmendment{RentalId=rental.Id,ProposedBy=actor.Id,BaseTermsVersion=request.TermsVersion,
            OriginalTermsJson=(await RequestDto(request)).ToJsonString(),
            ProposedTermsJson=Node(new {startDate=Date(start),endDate=Date(end),duration,price,deposit,tenantName=FullName(await db.Users.SingleAsync(u=>u.Id==request.TenantId)),roommateName=nextUser is null?null:FullName(await db.Users.SingleAsync(u=>u.Id==nextUser)),roommateId=profileId.Length==0?null:profileId,roommateUserId=nextUser,note=Text(body,"notes",1000),period=request.Period})!.ToJsonString(),
            RequiredApproversJson=Node(required.ToArray())!.ToJsonString(),ApprovedByJson=Node(new[]{actor.Id})!.ToJsonString()};
        db.RentalAmendments.Add(amendment);
        foreach(var user in required)Notify(user,"rental-change","A change to a confirmed rental needs every affected participant's approval. The current rental stays unchanged until all approve.",user==home.OwnerId?"landlord/bookings.html":"tenant/rentals.html?id="+rental.Id,home);
        Log("Confirmed rental amendment proposed: "+amendment.Id);await Save();return await AmendmentDto(amendment);
    }
    public async Task<object> RespondRentalAmendment(string id,JsonObject body)
    {
        var actor=await Me("tenant","landlord");var amendment=await db.RentalAmendments.SingleOrDefaultAsync(a=>a.Id==id);Need(amendment is not null,"Amendment not found.",404);
        var required=Arr(amendment!.RequiredApproversJson).Select(x=>x!.ToString()).ToArray();Need(required.Contains(actor.Id),"Only affected participants may respond.",403);
        Need(amendment.Status=="pending","This amendment is already closed.");
        var rental=await db.Rentals.SingleAsync(r=>r.Id==amendment.RentalId);var request=await db.RentalRequests.SingleAsync(r=>r.Id==rental.RequestId);
        Need((rental.Status is "active" or "upcoming")&&request.TermsVersion==amendment.BaseTermsVersion,"The rental or its terms changed. Create a new proposal.");
        var approved=Arr(amendment.ApprovedByJson).Select(x=>x!.ToString()).ToHashSet();
        if(!Flag(body,"accepted"))amendment.Status="rejected";
        else
        {
            approved.Add(actor.Id);amendment.ApprovedByJson=Node(approved.ToArray())!.ToJsonString();
            if(required.All(approved.Contains))
            {
                var terms=Obj(amendment.ProposedTermsJson);var start=Day(terms,"startDate");var end=Day(terms,"endDate");var home=await Property(request.PropertyId);
                foreach(var user in await db.Users.Where(u=>required.Contains(u.Id)).ToListAsync())Need(AccountActive(user),"An affected participant is restricted; the amendment cannot take effect.");
                Need(await Available(home,start,end,request.Id),"These dates are no longer available.");
                Need(!await db.PartialOffers.AnyAsync(o=>o.RentalId==rental.Id&&o.Status=="published"&&(o.StartDate<start||o.EndDate>end)),"The revised dates exclude a published room offer.");
                Need(!await db.PartialRequests.AnyAsync(q=>q.Status=="approved"&&(q.StartDate<start||q.EndDate>end)&&db.PartialOffers.Any(o=>o.Id==q.ListingId&&o.RentalId==rental.Id)),"The revised dates exclude an accepted room booking.");
                request.StartDate=start;request.EndDate=end;request.Duration=Integer(terms,"duration",1,365);request.AgreedPrice=Number(terms,"price",.001m);request.Deposit=Number(terms,"deposit",.001m);
                request.Total=request.AgreedPrice*(request.Period=="Daily"?request.Duration:1)+request.Deposit;
                request.RoommateId=terms["roommateId"]?.ToString();request.RoommateUserId=terms["roommateUserId"]?.ToString();request.InvitationStatus=request.RoommateUserId is null?null:"accepted";request.InvitationExpiresAt=null;
                request.TermsVersion++;request.WorkflowVersion=2;request.LandlordAccepted=request.TenantAccepted=true;request.RoommateAccepted=request.RoommateUserId is not null;
                request.AgreementSnapshotJson=Node(new {request.TermsVersion,request.TenantId,request.RoommateUserId,request.AgreedPrice,request.Deposit,request.Total,startDate=Date(start),endDate=Date(end),amendmentId=amendment.Id,approvedBy=approved.ToArray()})!.ToJsonString();
                rental.EndDate=end;amendment.Status="approved";
                foreach(var other in await db.RentalAmendments.Where(a=>a.RentalId==rental.Id&&a.Id!=id&&a.Status=="pending").ToListAsync())other.Status="cancelled";
            }
        }
        if(amendment.Status!="pending")foreach(var user in required)Notify(user,"rental-change",amendment.Status=="approved"?"Every affected participant approved the amendment. The revised rental terms are now effective; the previous terms remain in amendment history.":"A participant rejected the amendment. Your current rental terms remain unchanged.",await UpdatesRoute(user));
        Log("Rental amendment response: "+id+" / "+amendment.Status);await Save();return await AmendmentDto(amendment);
    }
}
