const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Client,checkout,base}=require('./helpers/backend-client.cjs');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const fixture=JSON.parse(fs.readFileSync('tests/artifacts/workflow/integration.json'));
const out='tests/artifacts/workflow',results=[],errors=[];fs.mkdirSync(out,{recursive:true});
async function main(){
 const ownerApi=new Client(),leadApi=new Client(),peerApi=new Client(),adminApi=new Client(),otherApi=new Client();
 for(const [client,user] of [[ownerApi,fixture.accounts.owner],[leadApi,fixture.accounts.lead],[peerApi,fixture.accounts.peer],[otherApi,fixture.accounts.other]])await client.login(user.email,'TestingPass123');
 await adminApi.login('admin@campus.test');
 if((await adminApi.bootstrap()).users.find(u=>u.id===fixture.accounts.peer.id)?.active===false)
  await adminApi.request('PUT',`/api/admin/users/${fixture.accounts.peer.id}/status`,{active:true,reason:'Restore the isolated test account after an interrupted browser check.'});
 const original=await ownerApi.request('GET','/api/properties/'+fixture.ids.home);
 const home=await ownerApi.request('POST','/api/properties',{...original,area:'Jubeiha',title:'Browser workflow home '+Date.now(),description:'A complete browser workflow property with accurate details.'});
 await checkout(ownerApi,`/api/properties/${home.id}/listing-fee/checkout`);
 const browser=await chromium.launch({headless:true,executablePath:process.env.CAMPUS_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const contexts=[];
 try{
  async function session(user,password='TestingPass123'){
   const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);
   await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/#auth%2Flogin.html',{waitUntil:'domcontentloaded'});
   const frame=page.frameLocator('#campus-page');await frame.locator('#email').fill(user.email);await frame.locator('#password').fill(password);await frame.locator('#login-form button[type=submit]').click();
   for(let attempt=0;attempt<3;attempt++){
    await page.waitForFunction(()=>{
     const doc=document.getElementById('campus-page')?.contentDocument;
     return window.CampusState?.currentUser || !doc?.querySelector('#login-form button[type=submit]')?.disabled && doc?.getElementById('message')?.textContent;
    });
    if(await page.evaluate(()=>Boolean(window.CampusState?.currentUser))){
     await page.waitForFunction(()=>{const f=document.getElementById('campus-page');return f?.contentDocument?.readyState==='complete'&&!f.contentDocument.getElementById('login-form')&&f.contentWindow.CampusRoute===window.CampusRoute;});
     await frame.locator('.nav nav').waitFor({state:'visible'});break;
    }
    const message=await frame.locator('#message').innerText();
    if(!message.includes('429')||attempt===2)throw Error('Login failed: '+message);
    console.log('Waiting for the local browser-login rate-limit window…');await page.waitForTimeout(30000);await frame.locator('#login-form button[type=submit]').click();
   }
   async function navigate(route){await page.evaluate(r=>CampusNavigate(r),route);await page.waitForFunction(r=>{const f=document.getElementById('campus-page');return f?.contentWindow?.CampusRoute===r&&f.contentDocument?.readyState==='complete';},route);}
   return {context,page,frame,navigate};
  }
  const lead=await session(fixture.accounts.lead),peer=await session(fixture.accounts.peer),owner=await session(fixture.accounts.owner),admin=await session({email:'admin@campus.test'},'Campus123');
  await lead.navigate('tenant/request.html?id='+home.id);
  await lead.frame.locator('[name=startDate]').fill('2027-10-01');await lead.frame.locator('[name=duration]').fill('3');await lead.frame.locator('[name=message]').fill('Please join me at this home.');
  await lead.frame.locator('#roommate-choice').selectOption('with');
  await lead.frame.locator('#roommate-grid').waitFor({state:'visible'});
  assert.match(await lead.frame.locator('#roommate-selection').innerText(),/Browser workflow home/);
  const card=lead.frame.locator(`[data-roommate-card="${fixture.ids.roommate}"]`);
  await card.waitFor({state:'visible'});
  const firstProfile=await lead.frame.locator('[data-roommate-card]').first().getAttribute('data-roommate-card');
  assert((await leadApi.bootstrap()).savedRoommates.includes(firstProfile));
  assert.equal(await card.locator('[data-save-roommate]').getAttribute('aria-pressed'),'true');
  assert(await card.getByRole('link',{name:'Book a meeting'}).isVisible());
  await card.locator('[data-invite-roommate]').click();
  await lead.frame.locator('#request-form').waitFor({state:'visible'});
  assert.equal(await lead.frame.locator('[name=startDate]').inputValue(),'2027-10-01');
  assert.match(await lead.frame.locator('#chosen-roommate').innerText(),/Workflow Peer/);
  await lead.frame.locator('#request-form button[type=submit]').click();
  await lead.page.waitForFunction(id=>CampusState.requests.some(r=>r.propertyId===id&&r.status==='waiting-roommate'),home.id);
  let request=(await leadApi.request('GET','/api/rental-requests')).find(r=>r.propertyId===home.id);assert.equal(request.status,'waiting-roommate');
  await lead.frame.locator(`[data-cancel="${request.id}"]`).waitFor({state:'visible'});
  assert(!(await ownerApi.request('GET','/api/rental-requests')).some(r=>r.id===request.id));
  results.push('Choosing shared occupancy opens roommate profiles with saved people first and preserves home/dates/message.');
  await peer.navigate('tenant/requests.html?id='+request.id);
  const incoming=peer.frame.locator('#request-'+request.id);await incoming.locator('[data-answer][data-accepted=true]').waitFor({state:'visible'});
  assert.match(await incoming.innerText(),/Workflow Lead/);assert.match(await incoming.innerText(),/Whole-home rent/);assert.match(await incoming.innerText(),/190/);
  await incoming.locator('[data-answer][data-accepted=true]').click();
  await incoming.getByText('Application sent to the landlord.',{exact:true}).waitFor({state:'visible'});
  await owner.navigate('landlord/requests.html');await owner.frame.locator(`[data-approve-request="${request.id}"]`).click();
  await owner.page.waitForFunction(id=>CampusState.requests.find(r=>r.id===id)?.status==='inspection',request.id);
  await peer.navigate('tenant/home.html');await peer.frame.locator('#rental-description').filter({hasText:'Waiting for Workflow Lead to inspect'}).waitFor({state:'visible'});
  await peer.frame.locator('#review').click();await peer.frame.locator('#request-'+request.id).waitFor({state:'visible'});
  assert.equal(await peer.frame.locator('#inspection-form').count(),0);
  async function peerStatusOnly(route){
   const entering=peer.page.waitForEvent('framenavigated',frame=>frame.url()===base+'/html/'+route);
   await peer.page.evaluate(r=>CampusNavigate(r),route);
   await entering;
   await peer.page.waitForFunction(id=>document.getElementById('campus-page')?.contentWindow?.CampusRoute==='tenant/rentals.html?id='+id,request.id);
   await peer.frame.locator('#request-'+request.id).waitFor({state:'visible'});
   assert.equal(await peer.frame.locator('#inspection-form, #checkout, #request-form').count(),0);
   assert.equal(await peer.frame.locator('#page-status').innerText(),'');
  }
  await peerStatusOnly('tenant/inspection.html?id='+request.id);
  await peerStatusOnly('tenant/request.html?edit='+request.id);
  await lead.navigate('tenant/inspection.html?id='+request.id);
  await lead.frame.locator('#inspection-form input[type=checkbox]').check();await lead.frame.locator('#inspection-form button[type=submit]').click();
  await lead.frame.locator('#consent-'+request.id).waitFor({state:'visible'});
  await lead.frame.locator('#consent-'+request.id+' input[type=checkbox]').check();await lead.frame.locator('#consent-'+request.id+' button[type=submit]').click();
  await lead.frame.getByText('Your acceptance is saved. Waiting for the other tenant to accept the same version.',{exact:true}).waitFor({state:'visible'});
  await peer.navigate('tenant/rentals.html?id='+request.id);await peer.frame.locator('#consent-'+request.id+' input[type=checkbox]').check();await peer.frame.locator('#consent-'+request.id+' button[type=submit]').click();
  await peer.frame.getByText('All agreement approvals are complete. Waiting for the lead tenant to confirm the arrangement.',{exact:true}).waitFor({state:'visible'});
  await peer.navigate('tenant/home.html');await peer.frame.locator('#rental-description').filter({hasText:'Waiting for Workflow Lead to confirm the direct arrangement'}).waitFor({state:'visible'});
  await peer.frame.locator('#review').click();await peer.frame.locator('#request-'+request.id).waitFor({state:'visible'});
  await peerStatusOnly('tenant/payment.html?id='+request.id);
  await peer.navigate('tenant/requests.html');await peer.frame.locator('#request-'+request.id).getByRole('link',{name:'View status'}).click();
  await peer.frame.locator('#request-'+request.id).waitFor({state:'visible'});
  assert.equal(await peer.frame.locator('#checkout').count(),0);
  results.push('Co-tenants see waiting status on home and requests; direct inspection, plan-edit and arrangement URLs show status without forbidden forms or ownership errors.');
  results.push('Invitation and final agreement are separate; each tenant accepts for themselves after owner review and inspection.');
  await lead.navigate('tenant/payment.html?id='+request.id);await lead.frame.locator('#payment-consent').check();await lead.frame.locator('#checkout').click();
  await lead.frame.getByText('Confirmed · awaiting key handover',{exact:true}).waitFor({state:'visible'});
  const rental=(await leadApi.request('GET','/api/rentals')).find(r=>r.request.id===request.id);assert.equal(rental.status,'upcoming');
  await lead.frame.locator('#keys-'+rental.id).check();await lead.frame.locator('[data-move="'+rental.id+'"]').click();
  await lead.frame.locator('#rental-'+rental.id).getByText('Active · moved in',{exact:true}).waitFor({state:'visible'});
  await lead.frame.locator('#rental-'+rental.id).getByRole('link',{name:'Record move-in report',exact:true}).click();
  await lead.frame.locator('#condition-video-file').setInputFiles(path.join(__dirname,'fixtures/condition-walkthrough.mp4'));
  await lead.frame.locator('#condition-form input[type=checkbox]').check();await lead.frame.locator('#condition-form button[type=submit]').click();
  await lead.frame.locator('#condition-success').filter({hasText:'Condition report saved.'}).waitFor({state:'visible'});
  await peer.navigate('tenant/rentals.html?id='+rental.id);await peer.frame.locator('#rental-'+rental.id).getByText('Active · moved in',{exact:true}).waitFor({state:'visible'});
  await peer.frame.locator('#rental-'+rental.id).getByRole('link',{name:'View condition reports',exact:true}).click();
  await peer.frame.locator('#condition-form').waitFor({state:'visible'});assert(await peer.frame.locator('#condition-form button[type=submit]').isDisabled());
  results.push('Confirmed rental waits for key handover; video reports upload successfully and co-tenants can view but not overwrite them.');
  await lead.navigate('tenant/rentals.html?id='+rental.id);
  await lead.frame.locator(`[data-amend="${rental.id}"]`).click();
  const proposalDialog=lead.frame.locator('dialog[open]');await proposalDialog.locator('[name=price]').fill('185');await proposalDialog.locator('[name=notes]').fill('Agree a revised full-home rent while retaining both tenants.');await proposalDialog.locator('[name=accepted]').check();await proposalDialog.getByRole('button',{name:'Send change proposal'}).click();
  await proposalDialog.waitFor({state:'hidden'});
  const amendment=(await leadApi.request('GET','/api/rental-amendments')).find(a=>a.rentalId===rental.id&&a.status==='pending');assert(amendment);
  assert.equal((await leadApi.request('GET','/api/rentals')).find(r=>r.id===rental.id).request.agreedPrice,190);
  await owner.navigate('landlord/bookings.html');await owner.frame.locator('#amendment-'+amendment.id).getByRole('button',{name:'Accept proposed changes'}).click();
  await owner.frame.locator('#amendment-'+amendment.id).getByRole('button',{name:'Accept proposed changes'}).waitFor({state:'hidden'});
  assert.equal((await leadApi.request('GET','/api/rentals')).find(r=>r.id===rental.id).request.agreedPrice,190);
  await peer.navigate('tenant/rentals.html?id='+rental.id);await peer.frame.locator('#amendment-'+amendment.id).getByRole('button',{name:'Accept proposed changes'}).click();
  await peer.frame.locator('#amendment-'+amendment.id).getByText('approved',{exact:true}).waitFor({state:'visible'});
  assert.equal((await leadApi.request('GET','/api/rentals')).find(r=>r.id===rental.id).request.agreedPrice,185);
  results.push('Confirmed rental change dialog preserves the agreement until both tenants and the owner approve the same proposed full rent.');
  const report=await otherApi.request('POST',`/api/properties/${home.id}/reports`,{reason:'Check amenities',notes:'Please verify the listed amenities for this browser test.'});
  await admin.navigate('admin/dashboard.html?tab=properties');await admin.frame.locator('[data-pagination-search=properties]').fill(home.title);await admin.frame.locator(`[data-moderate="${home.id}"]`).click();
  await admin.frame.locator('#moderation-dialog[open]').waitFor({state:'visible'});await admin.frame.locator('#moderation-form [name=decision]').selectOption('request-changes');await admin.frame.locator('#moderation-form [name=reason]').selectOption('Other policy concern');await admin.frame.locator('#moderation-form [name=notes]').fill('Please clarify which amenities are actually included.');await admin.frame.locator('#moderation-form [type=submit]').click();
  await admin.frame.locator('#moderation-dialog[open]').waitFor({state:'hidden'});
  await admin.navigate('admin/dashboard.html?tab=reports');await admin.frame.locator('[data-pagination-search=reports]').fill(home.title);
  const reportCard=admin.frame.locator('.feature-card').filter({hasText:home.title});await reportCard.getByText('Investigation open',{exact:true}).waitFor({state:'visible'});assert.match(await reportCard.innerText(),/Action taken/);
  await admin.frame.locator(`[data-resolve="${report.id}"]`).click();await admin.frame.locator('#report-resolution-dialog [name=outcome]').selectOption('substantiated');await admin.frame.locator('#report-resolution-dialog [name=notes]').fill('The amenities description needs the corrections requested.');await admin.frame.locator('#report-resolution-dialog button[type=submit]').click();
  await reportCard.getByText('Investigation closed',{exact:true}).waitFor({state:'visible'});
  await owner.navigate('landlord/dashboard.html?tab=notifications');assert.match(await owner.frame.locator('.notifications-page').innerText(),/Changes requested/);
  const edit=owner.frame.locator('.notification-card').filter({hasText:home.title}).getByRole('link',{name:'Edit listing'});await edit.click();await owner.frame.locator('#property-form').waitFor({state:'visible'});
  await owner.frame.locator('#property-form [name=description]').fill('Corrected advertisement: the kitchen and Wi-Fi amenities are included as described.');
  await owner.frame.locator('#property-form button[type=submit]').click();
  await owner.page.waitForFunction(id=>CampusState.properties.find(p=>p.id===id)?.reviewStatus==='pending',home.id);
  await owner.frame.locator(`[data-listing="${home.id}"]`).click();
  await owner.page.waitForFunction(id=>CampusState.properties.find(p=>p.id===id)?.ownerWantsPublished===false,home.id);
  await admin.navigate('admin/dashboard.html?tab=properties');await admin.frame.locator('[data-pagination-search=properties]').fill(home.title);await admin.frame.locator(`[data-moderate="${home.id}"]`).click();
  await admin.frame.locator('#moderation-form [name=decision]').selectOption('approve');await admin.frame.locator('#moderation-form button[type=submit]').click();
  await admin.page.waitForFunction(id=>CampusState.properties.find(p=>p.id===id)?.status==='archived',home.id);
  assert.equal((await ownerApi.request('GET','/api/properties/'+home.id)).listingFee.status,'paid');
  results.push('Administrator requests corrections separately from report resolution, and owner notifications lead to the existing paid advertisement editor.');
  await admin.navigate('admin/dashboard.html?tab=users');await admin.frame.locator('#admin-search').fill(fixture.accounts.peer.email);const row=admin.frame.locator('[data-admin-row]').filter({hasText:fixture.accounts.peer.email});await row.locator('[data-user]').click();
  await admin.frame.locator('#account-decision [name=reason]').fill('Reviewing the test account for a documented concern.');await admin.frame.locator('#account-decision [name=days]').selectOption('7');await admin.frame.locator('#account-decision [name=acknowledged]').check();await admin.frame.locator('#account-decision button[type=submit]').click();await row.getByText('Suspended',{exact:true}).waitFor({state:'visible'});
  const restricted=await session(fixture.accounts.peer);await restricted.navigate('tenant/rentals.html');await restricted.frame.locator('.account-restriction').waitFor({state:'visible'});await restricted.frame.getByText('Active · moved in',{exact:true}).first().waitFor({state:'visible'});
  await row.locator('[data-user]').click();await admin.frame.locator('#account-decision [name=reason]').fill('Test investigation is complete; restore the account.');await admin.frame.locator('#account-decision button[type=submit]').click();await row.getByText('Active',{exact:true}).waitFor({state:'visible'});
  results.push('Account suspension requires explanation, duration and impact acknowledgement; restricted users retain read-only rental access.');
  for(const [name,session] of [['lead',lead],['owner',owner],['admin',admin]]){await session.page.setViewportSize({width:390,height:844});await session.page.waitForTimeout(150);assert.equal(await session.frame.locator('body').evaluate(body=>body.scrollWidth>innerWidth+1),false,name+' mobile page overflows');await session.page.screenshot({path:path.join(out,name+'-mobile.png')});}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({passed:results.length,checks:results,errors},null,2));console.log('SUCCESS: '+results.length+' end-to-end workflow browser scenarios.');
 }catch(e){
  const pages=[];for(const context of contexts)for(const page of context.pages())pages.push(await page.evaluate(()=>({hash:location.hash,route:window.CampusRoute,frame:document.getElementById('campus-page')?.contentWindow?.location.href,frameRoute:document.getElementById('campus-page')?.contentWindow?.CampusRoute})).catch(()=>({closed:true})));
  fs.writeFileSync(path.join(out,'browser-error.json'),JSON.stringify({error:e.message,checks:results,errors,pages},null,2));throw e;
 }
 finally{
  if((await adminApi.bootstrap()).users.find(u=>u.id===fixture.accounts.peer.id)?.active===false)await adminApi.request('PUT',`/api/admin/users/${fixture.accounts.peer.id}/status`,{active:true,reason:'Restore the isolated test account after browser verification.'});
  for(const context of contexts)await context.close();await browser.close();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
