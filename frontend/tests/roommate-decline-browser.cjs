const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Client,checkout,base}=require('./helpers/backend-client.cjs');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const fixture=JSON.parse(fs.readFileSync('tests/artifacts/workflow/integration.json'));
async function main(){
 const ownerApi=new Client(),leadApi=new Client(),peerApi=new Client();
 for(const [client,user] of [[ownerApi,fixture.accounts.owner],[leadApi,fixture.accounts.lead],[peerApi,fixture.accounts.peer]])await client.login(user.email,'TestingPass123');
 const original=await ownerApi.request('GET','/api/properties/'+fixture.ids.home);
 const home=await ownerApi.request('POST','/api/properties',{...original,title:'Decline recovery home '+Date.now(),area:'Jubeiha',description:'A complete home for testing invitation rejection and recovery.'});
 await checkout(ownerApi,`/api/properties/${home.id}/listing-fee/checkout`);
 const request=await leadApi.request('POST','/api/rental-requests',{propertyId:home.id,startDate:'2029-02-01',duration:2,roommate:true,roommateId:fixture.ids.roommate,message:'Please join this home.'});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CAMPUS_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[];
 try{
  async function session(user){
   const context=await browser.newContext({viewport:{width:1440,height:1000}});
   await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/#auth%2Flogin.html',{waitUntil:'domcontentloaded'});const frame=page.frameLocator('#campus-page');
   await frame.locator('#email').fill(user.email);await frame.locator('#password').fill('TestingPass123');await frame.locator('#login-form [type=submit]').click();
   await page.waitForFunction(()=>{const f=document.getElementById('campus-page');return window.CampusState?.currentUser&&f?.contentDocument?.readyState==='complete'&&f.contentWindow.CampusRoute==='tenant/home.html';});
   const navigate=async route=>{await page.evaluate(r=>CampusNavigate(r),route);await page.waitForFunction(r=>{const f=document.getElementById('campus-page');return f?.contentDocument?.readyState==='complete'&&f.contentWindow.CampusRoute===r;},route);};
   return {page,frame,navigate};
  }
  const peer=await session(fixture.accounts.peer),lead=await session(fixture.accounts.lead);
  assert.equal(await peer.frame.locator('#rental-title').innerText(),home.title+', '+home.area);
  await peer.navigate('tenant/requests.html');
  await peer.frame.locator('#request-'+request.id+' [data-answer][data-accepted=false]').click();
  await peer.frame.locator('#request-'+request.id).waitFor({state:'hidden'});
  assert(!(await peerApi.bootstrap()).requests.some(r=>r.id===request.id));
  await peerApi.request('GET','/api/rental-requests/'+request.id,undefined,403);
  assert(!(await peerApi.request('GET','/api/me/notifications')).some(n=>n.type==='roommate-invitation'&&n.route?.endsWith(request.id)&&!n.read));
  await peer.navigate('tenant/home.html');assert.notEqual(await peer.frame.locator('#rental-title').innerText(),home.title+', '+home.area);
  await lead.navigate('tenant/requests.html');const card=lead.frame.locator('#request-'+request.id);
  await card.getByText('Roommate declined',{exact:true}).waitFor({state:'visible'});
  assert.match(await card.innerText(),/Workflow Peer declined your invitation/);
  assert(await card.getByRole('link',{name:'Apply alone instead',exact:true}).isVisible());
  await card.getByRole('link',{name:'Choose another roommate',exact:true}).click();
  await lead.frame.locator('#roommate-selection').waitFor({state:'visible'});
  assert.match(await lead.frame.locator('#roommate-selection').innerText(),new RegExp(home.title));
  const route=await lead.page.evaluate(()=>CampusRoute);assert(new URLSearchParams(route.split('?')[1]).get('edit')===request.id);
  await lead.navigate('tenant/home.html');await lead.frame.locator('#apply-alone-instead').waitFor({state:'visible'});
  assert.equal(await lead.frame.locator('#rental .timeline').isVisible(),false);
  assert.match(await lead.frame.locator('#rental-description').innerText(),/Workflow Peer declined/);
  await lead.page.screenshot({path:'tests/artifacts/workflow/decline-lead.png'});
  await lead.frame.locator('#apply-alone-instead').click();await lead.frame.locator('#request-form').waitFor({state:'visible'});
  assert.equal(await lead.frame.locator('#roommate-choice').inputValue(),'alone');
  await lead.frame.locator('#request-form [type=submit]').click();
  await lead.frame.locator('#request-'+request.id).getByText('Application sent to the landlord.',{exact:true}).waitFor({state:'visible'});
  const submitted=(await ownerApi.request('GET','/api/rental-requests')).find(r=>r.id===request.id);assert.equal(submitted.status,'submitted');assert.equal(submitted.roommateUserId,null);
  assert(!(await peerApi.bootstrap()).requests.some(r=>r.id===request.id));assert.deepEqual(errors,[]);
  const checks=['Declined invitations disappear immediately from the invitee’s requests, bootstrap and home; direct access is revoked.','The applicant sees the named rejection and can open another roommate selection with the original property and dates.','The applicant can apply alone from the recovery home card; the landlord receives a solo application without the rejected roommate.'];
  fs.writeFileSync('tests/artifacts/workflow/decline-browser.json',JSON.stringify({passed:checks.length,checks,errors},null,2));console.log('SUCCESS: '+checks.length+' roommate-decline browser scenarios.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
