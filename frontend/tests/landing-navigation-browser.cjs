const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const base=process.env.CAMPUS_BASE_URL||'http://localhost:5080',output='tests/artifacts/landing-navigation';fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CAMPUS_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[],checks=[];
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:'reduce'});await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/#public%2Findex.html');const frame=page.frameLocator('#campus-page');await frame.locator('.nav-links').waitFor({state:'attached'});
   async function click(label){if(mobile)await frame.locator('#menu-button').click();await frame.locator('.nav-links').getByRole('link',{name:label,exact:true}).click();}
   for(const [label,id] of [['Find a home','homes'],['Roommates','roommates'],['How it works','how-it-works'],['Home','home']]){
    // Start at the end of the long pinned tour, as in the reported screenshot.
    await frame.locator('#home').evaluate(el=>scrollTo({top:el.offsetHeight-innerHeight,behavior:'instant'}));
    await click(label);
    await page.waitForFunction(id=>{const w=document.getElementById('campus-page').contentWindow;const box=w.document.getElementById(id)?.getBoundingClientRect();return w.location.pathname==='/html/public/index.html'&&box&&box.top>=-1&&box.top<200;},id);
    assert.equal(await page.evaluate(()=>document.getElementById('campus-page').contentWindow.location.hash),'#'+id);
    assert.equal(await page.evaluate(()=>CampusRoute),'public/index.html#'+id);
    await frame.locator('.nav-links a[href="#'+id+'"][aria-current="location"]').waitFor({state:'attached'});
    if(mobile)assert.equal(await frame.locator('#menu-button').getAttribute('aria-expanded'),'false');
    checks.push((mobile?'Phone':'Desktop')+': '+label+' scrolls to its section without leaving the landing document');
   }
   await click('Find a home');await click('Roommates');await page.goBack();await page.waitForFunction(()=>document.getElementById('campus-page').contentWindow?.CampusRoute==='public/index.html#homes');await frame.locator('#property-grid').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>document.getElementById('campus-page').contentWindow.location.pathname),'/html/public/index.html');
   await page.reload();await page.waitForFunction(()=>document.getElementById('campus-page').contentWindow?.CampusRoute==='public/index.html#homes');
   await click('About us');await page.waitForFunction(()=>document.getElementById('campus-page').contentDocument?.body?.dataset.screen==='about');await frame.locator('main h1').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>CampusRoute),'public/about.html');
   checks.push((mobile?'Phone':'Desktop')+': section history and refresh retain the section; About us opens its page');
   await page.screenshot({path:output+'/'+(mobile?'phone':'desktop')+'.png'});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/report.json',JSON.stringify({passed:checks.length,checks,errors},null,2));console.log('SUCCESS: '+checks.length+' landing navigation browser checks.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
