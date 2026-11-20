// Real SQL/API consent checks. Uses the isolated workflow fixture only.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {Client,preferences}=require('./helpers/backend-client.cjs');
const fixture=JSON.parse(fs.readFileSync('tests/artifacts/workflow/integration.json'));
async function main(){
 const clients={};for(const name of ['owner','lead','peer','other']){clients[name]=new Client();await clients[name].login(fixture.accounts[name].email,'TestingPass123');}
 const {owner,lead,peer,other}=clients,guest=new Client();await guest.bootstrap();
 await other.request('PUT','/api/me/preferences',preferences);
 const profile=(await lead.bootstrap()).roommates.find(p=>p.userId===fixture.accounts.other.id);assert(profile);
 let rental=(await lead.request('GET','/api/rentals')).find(r=>r.id===fixture.ids.rental),r=rental.request;
 const proposal={version:r.termsVersion,startDate:r.startDate,duration:r.duration,price:r.agreedPrice-5,deposit:r.deposit,roommateId:profile.id,notes:'Propose a co-tenant replacement and revised full rent.',accepted:true};
 await guest.request('POST',`/api/rentals/${rental.id}/amendments`,proposal,401);
 const a=await lead.request('POST',`/api/rentals/${rental.id}/amendments`,proposal);assert.equal(a.status,'pending');assert.equal(a.approvers.length,4);
 assert.equal((await other.request('GET','/api/rental-amendments')).find(x=>x.id===a.id).proposed.roommateName,'Workflow Other');
 assert(!(await other.request('GET','/api/rentals')).some(x=>x.id===rental.id));
 await owner.request('POST',`/api/rental-amendments/${a.id}/response`,{accepted:true});
 await other.request('POST',`/api/rental-amendments/${a.id}/response`,{accepted:true});
 let unchanged=(await lead.request('GET','/api/rentals')).find(x=>x.id===rental.id);assert.equal(unchanged.request.agreedPrice,r.agreedPrice);assert.equal(unchanged.request.roommateUserId,fixture.accounts.peer.id);
 await peer.request('POST',`/api/rental-amendments/${a.id}/response`,{accepted:false});
 assert.equal((await lead.request('GET','/api/rentals')).find(x=>x.id===rental.id).request.termsVersion,r.termsVersion);
 const b=await owner.request('POST',`/api/rentals/${rental.id}/amendments`,proposal),stale=await lead.request('POST',`/api/rentals/${rental.id}/amendments`,proposal);
 for(const client of [lead,peer])await client.request('POST',`/api/rental-amendments/${b.id}/response`,{accepted:true});
 const applied=await other.request('POST',`/api/rental-amendments/${b.id}/response`,{accepted:true});assert.equal(applied.status,'approved');
 r=(await lead.request('GET','/api/rentals')).find(x=>x.id===rental.id).request;assert.equal(r.agreedPrice,proposal.price);assert.equal(r.termsVersion,proposal.version+1);assert.equal(r.roommateUserId,fixture.accounts.other.id);
 assert((await other.request('GET','/api/rentals')).some(x=>x.id===rental.id));assert(!(await peer.request('GET','/api/rentals')).some(x=>x.id===rental.id));
 assert((await peer.request('GET','/api/rental-amendments')).some(x=>x.id===b.id&&x.original.roommateUserId===fixture.accounts.peer.id));
 await lead.request('POST',`/api/rental-amendments/${stale.id}/response`,{accepted:true},409);
 await owner.request('POST',`/api/rentals/${rental.id}/amendments`,proposal,409);
 // Restore the original participants through another unanimous change, preserving test fixture reuse.
 const restore=await lead.request('POST',`/api/rentals/${rental.id}/amendments`,{...proposal,version:r.termsVersion,price:a.original.agreedPrice,roommateId:fixture.ids.roommate,notes:'Restore original test participants after consent verification.'});
 for(const client of [owner,other,peer])await client.request('POST',`/api/rental-amendments/${restore.id}/response`,{accepted:true});
 const solo=await lead.request('POST',`/api/rentals/${rental.id}/amendments`,{...proposal,version:r.termsVersion+1,roommateId:'',notes:'Check an unrelated user cannot approve a proposal.'});
 await other.request('POST',`/api/rental-amendments/${solo.id}/response`,{accepted:true},403);
 await lead.request('POST',`/api/rental-amendments/${solo.id}/response`,{accepted:false});
 const checks=['Existing terms stay unchanged while any approval is missing; a rejection retains the agreement.','Owner, lead, outgoing and incoming co-tenants must all consent before replacement takes effect.','Stale proposals and unrelated approvals are rejected; outgoing tenants retain agreement amendment history.'];
 fs.writeFileSync('tests/artifacts/workflow/amendments.json',JSON.stringify({passed:checks.length,checks},null,2));console.log('SUCCESS: '+checks.length+' confirmed-rental amendment scenarios.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
