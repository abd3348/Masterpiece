const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client,checkout,preferences}=require('./helpers/backend-client.cjs');
const run=Date.now().toString(36),results=[];
async function check(label,work){await work();results.push(label);console.log('PASS '+label);}
async function main(){
 const owner=new Client(),lead=new Client(),peer=new Client(),stranger=new Client(),admin=new Client(),guest=new Client();
 let ownerUser,leadUser,peerUser,otherUser,home,media,request,rental,peerProfile,meeting,report;
 const checklist=['Walls','Floors','Doors and windows','Furniture','Water fittings','Appliances'].map(name=>({name,condition:'Good'}));
 await check('Register independent actors; favorites persist and do not imply consent',async()=>{
  ownerUser=await owner.register('landlord','Owner',run);leadUser=await lead.register('tenant','Lead',run);peerUser=await peer.register('tenant','Peer',run);otherUser=await stranger.register('tenant','Other',run);await admin.login('admin@campus.test');
  await lead.request('PUT','/api/me/preferences',preferences);await peer.request('PUT','/api/me/preferences',preferences);
  const snapshot=await lead.bootstrap();assert(!snapshot.roommates.some(p=>p.userId===leadUser.id));peerProfile=snapshot.roommates.find(p=>p.userId===peerUser.id);
  await lead.request('PUT','/api/me/roommate-favorites/'+peerProfile.id,undefined,204);assert((await lead.bootstrap()).savedRoommates.includes(peerProfile.id));
 });
 await check('A roommate meeting can be requested without a rental invitation',async()=>{
  meeting=await lead.request('POST','/api/meetings',{kind:'roommate',targetId:peerProfile.id,title:'Meet before choosing a home',startsAt:new Date(Date.now()+3600000).toISOString(),duration:15});
  assert.equal(meeting.recipientId,peerUser.id);await peer.request('POST',`/api/meetings/${meeting.id}/response`,{accepted:true});
 });
 await check('Create and publish an independent test home',async()=>{
  media=await owner.upload('room.png','image/png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6tXcAAAAASUVORK5CYII=','base64'));
  home=await owner.request('POST','/api/properties',{title:'Shared workflow home '+run,city:'Amman',area:'Workflow district',type:'Apartment',period:'Monthly',furnished:'Furnished',price:190,beds:2,baths:1,size:80,description:'Complete independent test home for the shared rental workflow.',availableFrom:'2026-01-01',availableTo:'2030-12-31',amenities:['Wi-Fi'],photos:[media],video:null});
  await checkout(owner,`/api/properties/${home.id}/listing-fee/checkout`);home=await owner.request('GET','/api/properties/'+home.id);assert.equal(home.status,'published');
 });
 await check('Pending invitations show full terms to the invitee and stay private from the landlord',async()=>{
  request=await lead.request('POST','/api/rental-requests',{propertyId:home.id,startDate:'2027-04-01',duration:3,roommate:true,roommateId:peerProfile.id,message:'Please join this shared home.'});
  assert.equal(request.status,'waiting-roommate');assert.equal(request.agreedPrice,190);assert.equal(request.deposit,190);assert.equal(request.tenantAccepted,false);assert.equal(request.roommateAccepted,false);
  assert(!(await owner.request('GET','/api/rental-requests')).some(r=>r.id===request.id));await owner.request('GET','/api/rental-requests/'+request.id,undefined,403);await stranger.request('GET','/api/rental-requests/'+request.id,undefined,403);
  const incoming=await peer.request('GET','/api/rental-requests/'+request.id);assert.equal(incoming.tenantName,'Workflow Lead');assert.equal(incoming.property.id,home.id);assert(new Date(incoming.invitationExpiresAt)>Date.now());
  assert((await peer.request('GET','/api/me/notifications')).some(n=>n.type==='roommate-invitation'&&n.route.includes(request.id)));
 });
 await check('Only the invitee can answer the latest version; acceptance sends one group application',async()=>{
  await lead.request('POST',`/api/rental-requests/${request.id}/roommate-response`,{accepted:true,version:1},403);
  await peer.request('POST',`/api/rental-requests/${request.id}/roommate-response`,{accepted:true,version:0},409);
  request=await peer.request('POST',`/api/rental-requests/${request.id}/roommate-response`,{accepted:true,version:1});assert.equal(request.status,'submitted');assert.equal(request.roommateAccepted,false);
  assert.equal((await owner.request('GET','/api/rental-requests')).filter(r=>r.id===request.id).length,1);
 });
 await check('Landlord review precedes inspection; both tenants accept individually after inspection',async()=>{
  request=await owner.request('POST',`/api/rental-requests/${request.id}/review`,{approved:true,acceptedTerms:true,version:1});assert.equal(request.status,'inspection');
  await lead.request('POST',`/api/rental-requests/${request.id}/agreement`,{accepted:true,version:1},409);
  await peer.request('POST',`/api/rental-requests/${request.id}/inspection`,{items:checklist,notes:'Peer cannot record for group',version:1},403);
  request=await lead.request('POST',`/api/rental-requests/${request.id}/inspection`,{items:checklist,notes:'All rooms checked',version:1});assert.equal(request.status,'agreement');
  request=await lead.request('POST',`/api/rental-requests/${request.id}/agreement`,{accepted:true,version:1,userId:peerUser.id});assert.equal(request.roommateAccepted,false);assert.equal(request.status,'agreement');
  request=await peer.request('POST',`/api/rental-requests/${request.id}/agreement`,{accepted:true,version:1});assert.equal(request.status,'payment');
 });
 await check('A changed rent invalidates every approval and stale pages cannot consent',async()=>{
  await lead.request('PUT',`/api/rental-requests/${request.id}/rent-proposal`,{price:180});
  request=await owner.request('POST',`/api/rental-requests/${request.id}/rent-proposal/review`,{accepted:true});assert.equal(request.status,'waiting-roommate');assert.equal(request.termsVersion,2);assert(!request.landlordAccepted&&!request.tenantAccepted&&!request.roommateAccepted);assert.equal(request.inspection,null);
  await peer.request('POST',`/api/rental-requests/${request.id}/roommate-response`,{accepted:true,version:1},409);
  await lead.request('POST',`/api/rental-requests/${request.id}/agreement`,{accepted:true,version:1},409);
  await peer.request('POST',`/api/rental-requests/${request.id}/roommate-response`,{accepted:true,version:2});
  await owner.request('POST',`/api/rental-requests/${request.id}/review`,{approved:true,acceptedTerms:true,version:2});
  await lead.request('POST',`/api/rental-requests/${request.id}/inspection`,{items:checklist,notes:'Updated version inspected',version:2});
  await lead.request('POST',`/api/rental-requests/${request.id}/agreement`,{accepted:true,version:2});await peer.request('POST',`/api/rental-requests/${request.id}/agreement`,{accepted:true,version:2});
 });
 await check('Confirmation creates an upcoming rental visible to both; only key handover activates it',async()=>{
  await peer.request('POST',`/api/rental-requests/${request.id}/confirm-arrangement`,{},403);
  const result=await lead.request('POST',`/api/rental-requests/${request.id}/confirm-arrangement`,{});rental=(await lead.request('GET','/api/rentals')).find(r=>r.id===result.rentalId);assert.equal(rental.status,'upcoming');assert.equal(rental.request.status,'confirmed');assert((await peer.request('GET','/api/rentals')).some(r=>r.id===rental.id));
  await lead.request('PUT',`/api/rental-requests/${request.id}`,{startDate:'2027-05-01',duration:3,message:'Unilateral change',roommate:false,version:2},409);
  await peer.request('POST',`/api/rentals/${rental.id}/move-in`,{confirmed:true},403);rental=await lead.request('POST',`/api/rentals/${rental.id}/move-in`,{confirmed:true});assert.equal(rental.status,'active');
  await stranger.request('POST','/api/rental-requests',{propertyId:home.id,startDate:'2027-04-02',duration:1,roommate:false,roommateId:null,message:'Overlapping'},409);
 });
 await check('Declines, cancellation and replacement preserve a recoverable rental plan',async()=>{
  let plan=await lead.request('POST','/api/rental-requests',{propertyId:home.id,startDate:'2028-01-01',duration:1,roommate:true,roommateId:peerProfile.id,message:'A later shared stay.'});
  plan=await peer.request('POST',`/api/rental-requests/${plan.id}/roommate-response`,{accepted:false,version:plan.termsVersion});assert.equal(plan.status,'draft');
  assert(!(await peer.request('GET','/api/rental-requests')).some(r=>r.id===plan.id));
  assert(!(await peer.bootstrap()).requests.some(r=>r.id===plan.id));
  await peer.request('GET','/api/rental-requests/'+plan.id,undefined,403);
  assert.equal((await lead.request('GET','/api/rental-requests/'+plan.id)).invitationStatus,'declined');
  assert((await lead.request('GET','/api/me/notifications')).some(n=>n.type==='roommate-response'&&n.text.includes('Choose another roommate or apply alone')));
  plan=await lead.request('PUT',`/api/rental-requests/${plan.id}`,{startDate:plan.startDate,duration:1,roommate:true,roommateId:peerProfile.id,message:'Try a new invitation',version:plan.termsVersion});assert.equal(plan.status,'waiting-roommate');
  plan=await lead.request('POST',`/api/rental-requests/${plan.id}/cancel-invitation`,{version:plan.termsVersion});assert.equal(plan.invitationStatus,'cancelled');
  assert(!(await peer.bootstrap()).requests.some(r=>r.id===plan.id));
  plan=await lead.request('PUT',`/api/rental-requests/${plan.id}`,{startDate:plan.startDate,duration:1,roommate:false,roommateId:null,message:'Apply alone instead',version:plan.termsVersion});assert.equal(plan.status,'submitted');assert.equal(plan.roommateUserId,null);
 });
 await check('Corrections and suspension are distinct; reports remain open until an explained outcome',async()=>{
  report=await stranger.request('POST',`/api/properties/${home.id}/reports`,{reason:'Listing details',notes:'Please investigate the details of this test home.'});
  await admin.request('POST',`/api/admin/properties/${home.id}/analysis`,{});
  home=await admin.request('POST',`/api/admin/properties/${home.id}/review`,{decision:'request-changes',reason:'Other policy concern',notes:'Please clarify which amenities are provided.'});assert.equal(home.reviewStatus,'changes-requested');assert.equal(home.status,'pending');assert.equal(home.listingFee.status,'paid');
  let snapshot=await admin.bootstrap();let row=snapshot.reports.find(r=>r.id===report.id);assert.equal(row.status,'open');assert(row.actionTakenAt);assert(row.actions.some(a=>a.decision==='changes-requested'&&a.notes.includes('amenities')));
  await admin.request('POST',`/api/admin/reports/${report.id}/resolve`,{},400);
  await admin.request('POST',`/api/admin/reports/${report.id}/resolve`,{outcome:'substantiated',notes:'The listed amenities need correction.'});
  assert((await stranger.request('GET','/api/me/notifications')).some(n=>n.type==='report-resolved'));
  assert((await peer.request('GET','/api/rentals')).some(r=>r.id===rental.id));await peer.request('GET','/api/media/'+media.id);
 });
 await check('Owner corrections require fresh review; approval preserves owner pause and the paid fee',async()=>{
  await admin.request('POST',`/api/admin/properties/${home.id}/review`,{decision:'approve'},409);
  await owner.request('PUT',`/api/properties/${home.id}/status`,{status:'archived'});
  home=await owner.request('PUT',`/api/properties/${home.id}`,{...home,description:'Corrected amenities and accurate details for this test home.'});assert.equal(home.reviewStatus,'pending');
  await admin.request('POST',`/api/admin/properties/${home.id}/review`,{decision:'approve'},409);
  await admin.request('POST',`/api/admin/properties/${home.id}/analysis`,{});home=await admin.request('POST',`/api/admin/properties/${home.id}/review`,{decision:'approve'});assert.equal(home.status,'archived');assert.equal(home.ownerWantsPublished,false);assert.equal(home.listingFee.status,'paid');
  await owner.request('POST',`/api/properties/${home.id}/listing-fee/checkout`,{},409);
  home=await owner.request('PUT',`/api/properties/${home.id}/status`,{status:'published'});assert.equal(home.status,'published');assert((await owner.request('GET','/api/me/notifications')).some(n=>n.type==='listing-approve'));
 });
 await check('Account suspension needs reason and impact consent; existing rentals remain readable',async()=>{
  await admin.request('PUT',`/api/admin/users/${ownerUser.id}/status`,{active:false},400);
  await admin.request('PUT',`/api/admin/users/${ownerUser.id}/status`,{active:false,reason:'Investigating repeated listing concerns.',days:7,acknowledged:false},400);
  await admin.request('PUT',`/api/admin/users/${ownerUser.id}/status`,{active:false,reason:'Investigating repeated listing concerns.',days:7,acknowledged:true});
  const restricted=new Client();const user=await restricted.login(ownerUser.email,'TestingPass123');assert.equal(user.active,false);assert(user.suspendedUntil);assert((await restricted.request('GET','/api/rentals')).some(r=>r.id===rental.id));
  await restricted.request('PUT',`/api/properties/${home.id}/status`,{status:'published'},403);await guest.request('GET','/api/properties/'+home.id,undefined,404);
  await admin.request('PUT',`/api/admin/users/${ownerUser.id}/status`,{active:true,reason:'Investigation completed and access restored.'});await guest.request('GET','/api/properties/'+home.id);await owner.login(ownerUser.email,'TestingPass123');
 });
 await check('Suspended advertisements cannot activate old unfinished requests; active rentals survive',async()=>{
  const plan=(await owner.request('GET','/api/rental-requests')).find(r=>r.status==='submitted');assert(plan);
  const pending=await stranger.request('POST','/api/rental-requests',{propertyId:home.id,startDate:'2029-04-01',duration:1,roommate:true,roommateId:peerProfile.id,message:'Invitation may be declined even if the advertisement is later suspended.'});
  await admin.request('POST',`/api/admin/properties/${home.id}/analysis`,{});home=await admin.request('POST',`/api/admin/properties/${home.id}/review`,{decision:'suspend',reason:'Other policy concern',notes:'Suspended during an additional investigation.'});assert.equal(home.status,'deleted');assert.equal(home.reviewStatus,'suspended');
  await owner.request('POST',`/api/rental-requests/${plan.id}/review`,{approved:true,acceptedTerms:true,version:plan.termsVersion},409);
  assert.equal((await peer.request('POST',`/api/rental-requests/${pending.id}/roommate-response`,{accepted:false,version:pending.termsVersion})).invitationStatus,'declined');
  assert((await lead.request('GET','/api/rentals')).some(r=>r.id===rental.id));
 });
 fs.mkdirSync('tests/artifacts/workflow',{recursive:true});fs.writeFileSync('tests/artifacts/workflow/integration.json',JSON.stringify({run,passed:results.length,checks:results,accounts:{owner:ownerUser,lead:leadUser,peer:peerUser,other:otherUser},ids:{home:home.id,request:request.id,rental:rental.id,roommate:peerProfile.id}},null,2));
 console.log(`SUCCESS: ${results.length} shared-rental and moderation workflow checks.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
