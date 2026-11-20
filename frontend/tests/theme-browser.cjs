const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {base}=require('./helpers/backend-client.cjs');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const fixture=JSON.parse(fs.readFileSync('tests/artifacts/workflow/integration.json'));
const output='tests/artifacts/theme';fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CAMPUS_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[],checks=[];
 try{
  async function pageFor(options={}){
   const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'no-preference',...options});
   await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   const frame=page.frameLocator('#campus-page');
   const navigate=async route=>{const committed=page.waitForEvent('framenavigated',f=>f.url()===base+'/html/'+route);await page.evaluate(r=>CampusNavigate(r),route);await committed;await page.waitForFunction(r=>{const f=document.getElementById('campus-page');return f?.contentDocument?.readyState==='complete'&&f.contentWindow.CampusRoute===r;},route);await frame.locator('.theme-toggle').waitFor({state:'attached'});await frame.locator('.loading').waitFor({state:'hidden'});if(route.startsWith('public/index'))await page.waitForTimeout(900);};
   return {context,page,frame,navigate};
  }
  async function waitTheme(session,mode){await session.page.waitForFunction(m=>CampusTheme.mode===m&&!CampusTheme.switching,mode);assert.equal(await session.frame.locator('html').getAttribute('data-theme'),mode);}
  const publicView=await pageFor();await publicView.page.goto(base+'/#auth%2Flogin.html',{waitUntil:'domcontentloaded'});await publicView.frame.locator('.theme-toggle').waitFor({state:'visible'});
  await publicView.frame.locator('#email').fill('preview@campus.test');
  await publicView.frame.locator('.theme-toggle').click();
  await publicView.page.waitForFunction(()=>document.documentElement.getAnimations({subtree:true}).some(a=>a.effect?.getKeyframes().some(k=>k.clipPath?.startsWith('circle('))));
  const animation=await publicView.page.evaluate(()=>{const a=document.documentElement.getAnimations({subtree:true}).find(a=>a.effect?.getKeyframes().some(k=>k.clipPath?.startsWith('circle(')));window.themeTestAnimation=a;a.pause();a.currentTime=280;return a.effect.getKeyframes().map(k=>k.clipPath);});
  assert.match(animation[0],/^circle\(0px at/);assert.match(animation[1],/^circle\([\d.]+px at/);
  await publicView.page.screenshot({path:output+'/bubble.png'});await publicView.page.evaluate(()=>window.themeTestAnimation.play());await waitTheme(publicView,'dark');
  assert.equal(await publicView.frame.locator('#email').inputValue(),'preview@campus.test');assert.equal(await publicView.page.evaluate(()=>localStorage.getItem('campus-theme')),'dark');
  assert.equal(await publicView.frame.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 27, 24)');
  await publicView.page.screenshot({path:output+'/login-dark.png'});checks.push('The circular reveal animates from the toggle; mode and form input stay intact across the shell and iframe.');
  await publicView.page.reload({waitUntil:'domcontentloaded'});await publicView.frame.locator('.theme-toggle').waitFor({state:'visible'});await waitTheme(publicView,'dark');
  await publicView.navigate('auth/register.html');assert.equal(await publicView.frame.locator('.role input:checked + span').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(44, 73, 57)');await publicView.page.screenshot({path:output+'/register-dark.png'});
  await publicView.navigate('public/index.html');await publicView.page.screenshot({path:output+'/landing-dark.png'});
  await publicView.frame.locator('.theme-toggle').click();await waitTheme(publicView,'light');assert.equal(await publicView.page.evaluate(()=>localStorage.getItem('campus-theme')),'light');
  checks.push('Preference survives reload and navigation; toggling back restores the light theme.');
  for(const [role,user,routes] of [
   ['tenant',fixture.accounts.lead,['tenant/home.html','tenant/rentals.html?id='+fixture.ids.rental,'tenant/requests.html','tenant/sublets.html','tenant/profile.html','public/properties.html','tenant/messages.html']],
   ['landlord',fixture.accounts.owner,['landlord/dashboard.html','landlord/requests.html','landlord/bookings.html','landlord/add-property.html','landlord/profile.html']],
   ['admin',{email:'admin@campus.test'},['admin/dashboard.html?tab=users','admin/dashboard.html?tab=properties','admin/dashboard.html?tab=reports','admin/dashboard.html?tab=ai','admin/dashboard.html?tab=activity','admin/profile.html']]
  ]){
   const s=await pageFor();await s.page.goto(base+'/#auth%2Flogin.html',{waitUntil:'domcontentloaded'});await s.frame.locator('.theme-toggle').click();await waitTheme(s,'dark');
   await s.frame.locator('#email').fill(user.email);await s.frame.locator('#password').fill(role==='admin'?'Campus123':'TestingPass123');await s.frame.locator('#login-form [type=submit]').click();
   await s.page.waitForFunction(r=>{const f=document.getElementById('campus-page');return CampusState?.currentUser?.role===r&&f?.contentDocument?.readyState==='complete'&&!f.contentDocument.getElementById('login-form');},role);
   for(const route of routes){await s.navigate(route);assert.equal(await s.frame.locator('html').getAttribute('data-theme'),'dark');assert.equal(await s.frame.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 27, 24)');assert.equal(await s.frame.locator('body').evaluate(el=>el.scrollWidth>innerWidth+1),false,route+' overflows');}
   const capture=role==='tenant'?'tenant/rentals.html?id='+fixture.ids.rental:role==='admin'?'admin/dashboard.html?tab=users':'landlord/dashboard.html';await s.navigate(capture);await s.page.screenshot({path:output+'/'+role+'-dark.png'});
   await s.page.setViewportSize({width:390,height:844});await s.page.waitForTimeout(220);if(role==='admin'){await s.frame.locator('#menu-toggle').click();}await s.frame.locator('.theme-toggle').waitFor({state:'visible'});assert.equal(await s.frame.locator('body').evaluate(el=>el.scrollWidth>innerWidth+1),false,role+' phone overflows');
   await s.page.screenshot({path:output+'/'+role+'-phone.png'});checks.push(role+': dark mode applies throughout role pages and the toggle remains accessible on phones.');
  }
  const reduced=await pageFor({reducedMotion:'reduce',colorScheme:'dark'});await reduced.page.goto(base+'/#auth%2Flogin.html');await reduced.frame.locator('.theme-toggle').waitFor({state:'visible'});await waitTheme(reduced,'dark');await reduced.frame.locator('.theme-toggle').click();await waitTheme(reduced,'light');assert.equal(await reduced.page.evaluate(()=>document.documentElement.getAnimations({subtree:true}).length),0);checks.push('System preference is respected; reduced motion switches immediately without the bubble.');
  const fallback=await pageFor();await fallback.page.addInitScript(()=>{document.startViewTransition=undefined;});await fallback.page.goto(base+'/#auth%2Flogin.html');await fallback.frame.locator('.theme-toggle').click();await waitTheme(fallback,'dark');assert.equal(await fallback.page.locator('.theme-reveal-overlay').count(),0);checks.push('A circular overlay fallback works when View Transitions is unavailable and cleans itself up.');
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/report.json',JSON.stringify({passed:checks.length,checks,errors},null,2));console.log('SUCCESS: '+checks.length+' dark/light theme browser scenarios.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
