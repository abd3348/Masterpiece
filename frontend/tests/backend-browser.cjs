const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const base=process.env.CAMPUS_BASE_URL||'http://localhost:5080';
const executablePath=process.env.CAMPUS_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dir=path.join(__dirname,'artifacts/backend');fs.mkdirSync(dir,{recursive:true});
const results=[],errors=[];
async function main(){
 const browser=await chromium.launch({headless:true,executablePath});
 try{
  for(const [role,email,routes] of [
   ['tenant','tenant@campus.test',['tenant/home.html','tenant/preferences.html','tenant/roommates.html','tenant/favorites.html','public/properties.html','public/property.html?id=124','tenant/request.html?id=124','tenant/requests.html','tenant/rentals.html','tenant/sublets.html','tenant/messages.html','tenant/profile.html']],
   ['landlord','owner@campus.test',['landlord/dashboard.html','landlord/requests.html','landlord/bookings.html','landlord/add-property.html','landlord/messages.html','landlord/profile.html']],
   ['admin','admin@campus.test',['admin/dashboard.html','admin/dashboard.html?tab=properties','admin/dashboard.html?tab=users','admin/dashboard.html?tab=reports','admin/profile.html']]
  ]){
   if(process.env.CAMPUS_TEST_ROLE && process.env.CAMPUS_TEST_ROLE!==role)continue;
   const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const page=await ctx.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(15000);
   await ctx.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   page.on('pageerror',e=>errors.push({role,message:e.message}));
   // External photos/fonts are allowed; do not wait for network-idle to finish.
   page.on('response',r=>{if(r.url().startsWith(base+'/api/')&&r.status()>=400)errors.push({role,status:r.status(),url:r.url()});});
   await page.goto(base+'/#auth%2Flogin.html',{waitUntil:'domcontentloaded'});
   const frame=page.frameLocator('#campus-page');await frame.locator('#email').fill(email);await frame.locator('#password').fill('Campus123');
   await frame.locator('#login-form button[type=submit]').click();
   await page.waitForFunction(r=>window.CampusState?.currentUser?.role===r,role);
   if(role==='tenant' || role==='landlord'){
    await frame.locator('.nav nav a[aria-current="page"]').filter({hasText:role==='tenant'?'Home':'My properties'}).waitFor({state:'visible'});
    const target=role==='tenant'?'tenant/roommates.html':'public/market.html';
    const label=role==='tenant'?'Roommates':'Market';
    // Cover native iframe navigation too: old tabs and browser history can bypass CampusNavigate.
    await page.locator('#campus-page').evaluate((f,r)=>{f.src='/html/'+r;},target);
    await frame.locator('.nav nav a[aria-current="page"]').filter({hasText:label}).waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>CampusRoute),target);
    assert.equal(await page.evaluate(()=>decodeURIComponent(location.hash.slice(1))),target);
    assert.equal(await frame.locator('.nav nav a.active').count(),1);
    assert.equal(await frame.locator('.nav nav a.active').evaluate(a=>getComputedStyle(a).backgroundColor),'rgb(23, 61, 54)');
    await page.reload({waitUntil:'domcontentloaded'});
    await frame.locator('.nav nav a[aria-current="page"]').filter({hasText:label}).waitFor({state:'visible'});
    await frame.locator('.nav nav').getByRole('link',{name:role==='tenant'?'Home':'My properties',exact:true}).click();
    await frame.locator('.nav nav a[aria-current="page"]').filter({hasText:role==='tenant'?'Home':'My properties'}).waitFor({state:'visible'});
    await frame.locator('.nav nav').getByRole('link',{name:label,exact:true}).click();
    await frame.locator('.nav nav a[aria-current="page"]').filter({hasText:label}).waitFor({state:'visible'});
    await page.goBack();
    await frame.locator('.nav nav a[aria-current="page"]').filter({hasText:role==='tenant'?'Home':'My properties'}).waitFor({state:'visible'});
    results.push({role,action:label+' remains the green active tab after native iframe navigation and reload; browser Back restores the previous tab'});
   }
   if(role==='landlord'){
    await frame.locator('.nav nav a', {hasText:'Notifications'}).click();
    await frame.locator('.notifications-page').waitFor({state:'visible'});
    assert.equal(await frame.locator('.nav nav a[aria-current="page"]').innerText(),'Notifications');
    assert.equal(await frame.locator('.nav nav a.active').count(),1);
    assert.equal(await frame.locator('.nav nav a.active').evaluate(a=>getComputedStyle(a).backgroundColor),'rgb(23, 61, 54)');
    await page.reload({waitUntil:'domcontentloaded'});
    await frame.locator('.notifications-page').waitFor({state:'visible'});
    assert.equal(await frame.locator('.nav nav a[aria-current="page"]').innerText(),'Notifications');
    assert.equal(await frame.locator('.nav nav a.active').evaluate(a=>getComputedStyle(a).backgroundColor),'rgb(23, 61, 54)');
    for(const [label,route] of [['My properties','landlord/dashboard.html'],['Requests','landlord/requests.html'],['Arrangements','landlord/bookings.html'],['Add property','landlord/add-property.html'],['Meetings','landlord/messages.html'],['Market','public/market.html']]){
     await frame.locator('.nav nav').getByRole('link',{name:label,exact:true}).click();
     await page.waitForFunction(r=>window.CampusRoute===r,route);
     await frame.locator('.nav nav a[aria-current="page"]').filter({hasText:label}).waitFor({state:'visible'});
     assert.equal(await frame.locator('.nav nav a.active').count(),1);
    }
    results.push({role,action:'real menu clicks update content and a single green active tab; Notifications survives reload'});
   }
   for(const route of process.env.CAMPUS_TEST_NAV_ONLY ? [] : routes){
    console.log('CHECK '+role+' '+route);
    await page.evaluate(r=>window.CampusNavigate(r),route);
    const expected=route.split('?')[0].split('/');const screen=expected[1].replace('.html','');
    await page.waitForFunction(({section,screen,query})=>{const f=document.getElementById('campus-page');return f?.contentDocument?.body?.dataset.section===section&&f.contentDocument.body.dataset.screen===screen&&f.contentWindow.location.search===query;},{section:expected[0],screen,query:route.includes('?')?'?'+route.split('?')[1]:''});
    try{await frame.locator('main h1, main h2').first().waitFor({state:'visible'});}catch(e){console.log(await frame.locator('body').innerText());console.log(JSON.stringify(errors));await page.screenshot({path:path.join(dir,'failure.png')});throw e;}
    await page.waitForTimeout(180);
    const text=await frame.locator('body').innerText();assert(!text.includes('This page could not be opened'),role+' '+route+' failed: '+text.slice(-400));
    const status=await frame.locator('#feature-status').textContent().catch(()=>'');assert(!status?.trim(),route+' '+status);
    results.push({role,route});
    if(route===routes[0])await page.screenshot({path:path.join(dir,role+'-desktop.png')});
   }
   if(role==='admin'){
    await page.evaluate(()=>window.CampusNavigate('admin/dashboard.html?tab=properties'));
    await frame.locator('[data-moderate], [data-risk]').first().waitFor({state:'visible'});
    await frame.locator('[data-moderate], [data-risk]').first().click();
    await frame.locator('#moderation-dialog[open]').waitFor({state:'visible'});
    assert.match(await frame.locator('#moderation-dialog').innerText(),/Server screening|Prepared example/);
    results.push({role,action:'admin listing review dialog'});
   }
   await page.setViewportSize({width:390,height:844});await page.evaluate(r=>window.CampusNavigate(r),routes[0]);
   await frame.locator('main h1, main h2').first().waitFor({state:'visible'});await page.waitForTimeout(200);await page.screenshot({path:path.join(dir,role+'-mobile.png')});
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(r=>window.CampusState?.currentUser?.role===r,role);results.push({role,action:'session restored on full reload'});
   await ctx.close();
  }
  assert.deepEqual(errors,[],'Browser errors: '+JSON.stringify(errors));
  fs.writeFileSync(path.join(dir,'browser.json'),JSON.stringify({passed:results.length,checks:results,errors},null,2));console.log(`SUCCESS: ${results.length} Razor/browser checks across all account roles.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);fs.writeFileSync(path.join(dir,'browser-error.json'),JSON.stringify({error:e.message,checks:results,errors},null,2));process.exitCode=1;});
