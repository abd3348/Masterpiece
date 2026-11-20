const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {base}=require('./helpers/backend-client.cjs');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const fixture=JSON.parse(fs.readFileSync('tests/artifacts/workflow/integration.json'));
const output='tests/artifacts/pagination';fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CAMPUS_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[],checks=[];
 try{
  async function session(email,password){
   const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/#auth%2Flogin.html',{waitUntil:'domcontentloaded'});const frame=page.frameLocator('#campus-page');
   await frame.locator('#email').fill(email);await frame.locator('#password').fill(password);await frame.locator('#login-form [type=submit]').click();
   await page.waitForFunction(()=>{const f=document.getElementById('campus-page');return window.CampusState?.currentUser&&f?.contentDocument?.readyState==='complete'&&!f.contentDocument.getElementById('login-form')&&f.contentWindow.CampusRoute===CampusRoute;});
   const navigate=async route=>{await page.evaluate(r=>CampusNavigate(r),route);await page.waitForFunction(r=>{const f=document.getElementById('campus-page');return f?.contentDocument?.readyState==='complete'&&f.contentWindow.CampusRoute===r;},route);};
   return {page,frame,navigate};
  }
  const admin=await session('admin@campus.test','Campus123');
  for(const tab of ['users','properties','reports','ai','activity','overview']){
   await admin.navigate('admin/dashboard.html?tab='+tab);
   const groups=admin.frame.locator('[data-admin-pagination]');
   for(let i=0;i<await groups.count();i++){
    const group=groups.nth(i),rows=group.locator('[data-page-row]'),total=await rows.count();if(!total)continue;
    const key=await group.getAttribute('data-admin-pagination'),size=Number(await group.getAttribute('data-page-size')||6),nav=group.locator('.admin-pagination');
    await nav.waitFor({state:'visible'});
    const visible=()=>group.locator('[data-page-row]:visible').count();
    assert.equal(await visible(),Math.min(size,total),tab+'/'+key+' first page');
    assert(await nav.locator('[data-page-action=previous]').isDisabled());
    const pages=Math.ceil(total/size);
    if(pages>1){
     await nav.locator('[data-page-action=next]').click();assert.match(await nav.innerText(),/Page 2 of/);assert.equal(await visible(),Math.min(size,total-size));
     await nav.getByRole('button',{name:'Page '+pages,exact:true}).click();assert(await nav.locator('[data-page-action=next]').isDisabled());assert.equal(await visible(),total-(pages-1)*size);
    }
    const search=group.locator('input[type=search]');await search.fill('zz__no_matching_admin_rows__');assert.equal(await visible(),0);assert(await group.locator('.pagination-empty').isVisible());
    assert.match(await nav.innerText(),/Page 1 of 1/);await search.fill('');assert.equal(await visible(),Math.min(size,total));
    checks.push(tab+'/'+key+': bounded pages, previous/next boundaries, numbered pages, empty search and reset');
   }
  }
  await admin.navigate('admin/dashboard.html?tab=users');const users=admin.frame.locator('[data-admin-pagination=users]');
  const last=users.locator('[data-admin-row]').last(),email=await last.locator('td').nth(1).innerText();
  await users.locator('#admin-search').fill(email);assert.equal(await users.locator('[data-admin-row]:visible').count(),1);assert(await last.isVisible());
  const manage=last.locator('[data-user]');if(await manage.count()){await manage.click();await admin.frame.locator('#account-decision').waitFor({state:'visible'});await admin.frame.locator('#feature-dialog-close').click();}
  await users.locator('#admin-search').fill('');await users.locator('[data-page-action=next]').click();
  await admin.page.screenshot({path:output+'/admin-desktop.png'});
  await admin.page.setViewportSize({width:390,height:844});await admin.frame.locator('.dashboard-sidebar').waitFor({state:'hidden'});assert.equal(await admin.frame.locator('body').evaluate(el=>el.scrollWidth>innerWidth+1),false);await users.locator('.admin-pagination').scrollIntoViewIfNeeded();await admin.page.screenshot({path:output+'/admin-phone.png'});
  checks.push('Users: search finds records from later pages; action dialog still opens; phone layout remains contained');
  const tenant=await session(fixture.accounts.lead.email,'TestingPass123');await tenant.navigate('tenant/rentals.html?id='+fixture.ids.rental);
  const details=tenant.frame.locator('#rental-'+fixture.ids.rental+' .rental-agreement'),summary=details.locator('summary');await summary.waitFor({state:'visible'});
  assert.equal(await summary.evaluate(el=>getComputedStyle(el).listStyleType),'none');await summary.click();assert(await details.locator('.agreement-content').isVisible());assert.equal(await summary.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 61, 54)');
  await summary.focus();await tenant.page.keyboard.press('Space');assert.equal(await details.getAttribute('open'),null);await tenant.page.keyboard.press('Enter');assert(await details.locator('.agreement-content').isVisible());
  await tenant.page.waitForTimeout(180);await tenant.page.screenshot({path:output+'/agreement-desktop.png'});await tenant.page.setViewportSize({width:390,height:844});assert.equal(await tenant.frame.locator('body').evaluate(el=>el.scrollWidth>innerWidth+1),false);await tenant.page.screenshot({path:output+'/agreement-phone.png'});
  checks.push('Agreement disclosure: styled document button opens/closes by click and keyboard, with accessible phone layout');
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/report.json',JSON.stringify({passed:checks.length,checks,errors},null,2));console.log('SUCCESS: '+checks.length+' pagination and agreement browser checks.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
