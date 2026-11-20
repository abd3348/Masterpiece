const fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const base=process.env.CAMPUS_BASE_URL||'http://localhost:5080',out='tests/artifacts/theme-audit';fs.mkdirSync(out,{recursive:true});
async function main(){const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report=[];
try{for(const role of ['public','tenant','landlord','admin']){
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await ctx.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await ctx.addInitScript(()=>localStorage.setItem('campus-theme','dark'));
 const page=await ctx.newPage();page.setDefaultTimeout(12000);const frame=page.frameLocator('#campus-page');await page.goto(base+'/#auth%2Flogin.html');await frame.locator('.theme-toggle').waitFor();
 if(role!=='public'){await frame.locator('#email').fill(({tenant:'tenant',landlord:'owner',admin:'admin'})[role]+'@campus.test');await frame.locator('#password').fill('Campus123');await frame.locator('#login-form [type=submit]').click();await page.waitForFunction(r=>CampusState.currentUser?.role===r,role);}
 const routes=role==='public'?[...fs.readdirSync('html/public').map(n=>'public/'+n),'auth/login.html','auth/register.html']:fs.readdirSync('html/'+role).map(n=>role+'/'+n);
 if(role==='landlord')routes.push('landlord/dashboard.html?tab=notifications');if(role==='admin')for(const t of ['users','properties','reports','ai','activity','market'])routes.push('admin/dashboard.html?tab='+t);
 for(const route of routes){try{const target=await page.evaluate(r=>CampusRoutes.resolve(r,CampusState.currentUser?.role),route);await page.evaluate(r=>CampusNavigate(r),route);await page.waitForFunction(r=>{const f=document.getElementById('campus-page');return f.contentDocument?.readyState==='complete'&&f.contentWindow.CampusRoute===r;},target);await page.waitForTimeout(400);
 const scan=await frame.locator('body').evaluate(el=>{const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);return [...el.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),c=rgb(s.backgroundColor);return r.width>30&&r.height>20&&r.width*r.height>1200&&s.display!=='none'&&c.length>2&&(c[3]??1)>.65&&Math.min(...c.slice(0,3))>150&&!['IMG','SVG','IFRAME','CANVAS'].includes(e.tagName);}).map(e=>({tag:e.tagName,classes:e.className,bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,text:e.textContent.trim().slice(0,45)}));});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);const phoneOverflow=await frame.locator('body').evaluate(el=>el.scrollWidth>innerWidth+1);await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(80);
 report.push({route,light:scan,phoneOverflow});
 if(route==='public/index.html')for(const selector of ['#homes','#roommates','.cta','.landing-footer']){await frame.locator(selector).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/landing-'+selector.replace(/[^a-z]/g,'')+'.png'});}
 if(['public/about.html','public/support.html','admin/dashboard.html','tenant/home.html'].includes(route))await page.screenshot({path:out+'/'+route.replace(/[^a-z]/g,'')+'.png'});
 }catch(e){report.push({route,error:e.message.split('\n')[0]});}}
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);report.push({role,phoneOverflow:await frame.locator('body').evaluate(el=>el.scrollWidth>innerWidth+1)});await ctx.close();
}fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.filter(r=>r.error||r.light?.length||r.phoneOverflow),null,2));}finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
