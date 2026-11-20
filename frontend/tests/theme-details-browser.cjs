const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const base=process.env.CAMPUS_BASE_URL||'http://localhost:5080',out='tests/artifacts/theme-details';fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),checks=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await context.addInitScript(()=>localStorage.setItem('campus-theme','dark'));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);await page.goto(base+'/#auth%2Fregister.html');
  const frame=page.frameLocator('#campus-page');
  async function navigate(route){await page.evaluate(r=>CampusNavigate(r),route);await page.waitForFunction(r=>{const f=document.getElementById('campus-page');return f.contentWindow.CampusRoute===r&&f.contentDocument.readyState==='complete';},route);await frame.locator('.theme-toggle').waitFor();}
  await frame.locator('.auth-header-actions').waitFor();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const layout=await frame.locator('.auth-header-actions').evaluate(el=>{const b=el.getBoundingClientRect(),back=el.querySelector('.back').getBoundingClientRect(),toggle=el.querySelector('button').getBoundingClientRect();return {overflow:document.body.scrollWidth>innerWidth+1,within:b.right<=innerWidth,adjacent:toggle.left-back.right<24};});
   assert.deepEqual(layout,{overflow:false,within:true,adjacent:true});
   assert.equal(await frame.locator('.register-progress').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
   assert.equal(await frame.locator('.role').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
   await page.screenshot({path:`${out}/register-${width}.png`});checks.push(`Register ${width}: grouped header actions, transparent progress and role containers, no overflow`);
  }
  await page.setViewportSize({width:1440,height:1000});await navigate('auth/login.html');
  assert.equal(await frame.locator('.input-wrap').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await frame.locator('.auth-theme-row .back').evaluate(el=>getComputedStyle(el).borderRadius),'999px');
  await page.screenshot({path:out+'/login-dark.png'});checks.push('Login: rounded back button and no square input wrapper backgrounds');
  await frame.locator('#email').fill('owner@campus.test');await frame.locator('#password').fill('Campus123');await frame.locator('#login-form [type=submit]').click();
  await page.waitForFunction(()=>CampusState.currentUser?.role==='landlord');
  // Empty notification state is a browser-only fixture; no notifications are marked read.
  await context.route('**/api/me/notifications',r=>r.fulfill({json:[]}));
  await navigate('landlord/dashboard.html?tab=notifications');await frame.locator('.notifications-empty').waitFor();
  const empty=await frame.locator('.notifications-empty').evaluate(el=>{const c=getComputedStyle(el);return {radius:c.borderRadius,padding:c.paddingLeft};});assert.equal(empty.radius,'16px');assert.equal(empty.padding,'22px');
  await page.screenshot({path:out+'/notifications-dark.png'});checks.push('Notifications: padded and rounded empty state');
  await frame.locator('#preview-signout').click();await frame.locator('#login-form').waitFor();
  await frame.locator('#email').fill('tenant@campus.test');await frame.locator('#password').fill('Campus123');await frame.locator('#login-form [type=submit]').click();
  await page.waitForFunction(()=>CampusState.currentUser?.role==='tenant');await navigate('tenant/home.html');
  const kbd=frame.locator('.search kbd');await kbd.waitFor();assert.equal(await kbd.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(52, 79, 65)');assert.equal(await kbd.evaluate(el=>getComputedStyle(el).color),'rgb(211, 223, 213)');
  await page.screenshot({path:out+'/tenant-dark.png'});checks.push('Search shortcut: readable dark background and light text');
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log('SUCCESS: '+checks.length+' focused visual checks.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
