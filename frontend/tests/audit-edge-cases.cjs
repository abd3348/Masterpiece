// Investigative checks against the isolated records created by backend-integration.cjs.
// Records observed behavior without changing real users or deleting database rows.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CAMPUS_BASE_URL || 'http://localhost:5080';
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'artifacts/backend/integration.json')));
let chromium;
try { ({chromium} = require('playwright')); }
catch { ({chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const evidence = [];
class Client {
    cookies = new Map(); token = '';
    async call(method, url, body, expected = 200) {
        const headers = { Cookie: [...this.cookies].map(([k,v]) => k+'='+v).join('; ') };
        if (this.token) headers['X-CSRF-TOKEN'] = this.token;
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const r = await fetch(base+url, {method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect:'manual'});
        for (const c of r.headers.getSetCookie()) { const pair=c.split(';')[0], i=pair.indexOf('='); this.cookies.set(pair.slice(0,i), pair.slice(i+1)); }
        const raw=await r.text(); let data=raw; try { data=JSON.parse(raw); } catch {}
        assert.equal(r.status, expected, method+' '+url+' '+raw.slice(0,400));
        if(url==='/api/bootstrap') this.token=data.csrfToken;
        return data;
    }
    async login(email, password) { await this.call('GET','/api/bootstrap'); await this.call('POST','/api/auth/login',{email,password}); return this.call('GET','/api/bootstrap'); }
}
async function main() {
    const owner=new Client(), tenant=new Client(), admin=new Client(), guest=new Client();
    await owner.login(`landlord.owner.${fixture.run}@campus.test`,'TestingPass123');
    const snapshot=await tenant.login(`tenant.tenant.${fixture.run}@campus.test`,'ChangedPass123');
    await admin.login('admin@campus.test','Campus123');
    const id=fixture.ids.property;
    const catalogSource=fs.readFileSync(path.join(__dirname,'../backend/ViewModels/ScreenViewModel.cs'),'utf8');
    const routes=[...catalogSource.matchAll(/\["([a-z]+\/[^"]+)"\] = new/g)].map(m=>m[1]);
    for(const route of routes) {
        const client=route.startsWith('admin/')?admin:route.startsWith('landlord/')?owner:route.startsWith('tenant/')?tenant:guest;
        const html=await client.call('GET','/html/'+route+'.html');
        assert.match(html,/<!doctype html>/i);
    }
    evidence.push({check:'All registered Razor routes return full HTML for the authorized role',passed:routes.length});
    const self=snapshot.roommates.find(p=>p.userId===fixture.ids.tenant);
    evidence.push({check:'Own profile appears among roommate candidates', observed:!!self, profileId:self?.id});
    await owner.call('PUT',`/api/properties/${id}/status`,{status:'published'});
    await admin.call('PUT',`/api/admin/users/${fixture.ids.owner}/status`,{active:false});
    try {
        const detail=await guest.call('GET',`/api/properties/${id}`);
        const catalog=await guest.call('GET','/api/properties');
        evidence.push({check:'Suspended owner listing remains publicly accessible', detailStatus:detail.status, inCatalog:catalog.some(p=>p.id===id)});
    } finally { await admin.call('PUT',`/api/admin/users/${fixture.ids.owner}/status`,{active:true}); }
    await owner.login(`landlord.owner.${fixture.run}@campus.test`,'TestingPass123');
    const start=new Date(); start.setUTCFullYear(start.getUTCFullYear()+1); const startDate=start.toISOString().slice(0,10);
    const request=await tenant.call('POST','/api/rental-requests',{propertyId:id,startDate,duration:3,roommate:false,roommateId:null,message:'Isolated audit request'});
    await admin.call('POST',`/api/admin/properties/${id}/analysis`,{});
    await admin.call('POST',`/api/admin/properties/${id}/review`,{keep:false,reason:'Other policy concern',notes:'Isolated audit removal; verify existing request cannot proceed.'});
    const approval=await owner.call('POST',`/api/rental-requests/${request.id}/review`,{approved:true,acceptedTerms:true});
    await tenant.call('POST',`/api/rental-requests/${request.id}/agreement`,{accepted:true});
    await tenant.call('POST',`/api/rental-requests/${request.id}/inspection`,{items:[{name:'Walls',condition:'Good'}],notes:'Audit'});
    const rental=await tenant.call('POST',`/api/rental-requests/${request.id}/confirm-arrangement`,{});
    await tenant.call('POST',`/api/rentals/${rental.rentalId}/move-in`,{confirmed:true});
    evidence.push({check:'Request can be approved and activated after administrator removed listing', approval:approval.status, rentalId:rental.rentalId});
    const browser=await chromium.launch({headless:true,executablePath:process.env.CAMPUS_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    try {
        async function session(email,password) {
            const context=await browser.newContext({viewport:{width:1440,height:1000}});
            await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
            const page=await context.newPage(); page.setDefaultTimeout(20000);
            await page.goto(base+'/#auth%2Flogin.html',{waitUntil:'domcontentloaded'});
            const frame=page.frameLocator('#campus-page');
            await frame.locator('#email').fill(email); await frame.locator('#password').fill(password);
            await frame.locator('#login-form button[type=submit]').click();
            await page.waitForFunction(()=>window.CampusState?.currentUser?.role==='tenant');
            return {context,page,frame};
        }
        const t=await session(`tenant.tenant.${fixture.run}@campus.test`,'ChangedPass123');
        await t.page.evaluate(r=>window.CampusNavigate('tenant/condition.html?id='+r),rental.rentalId);
        await t.frame.locator('#condition-video-file').setInputFiles(path.join(__dirname,'fixtures/condition-walkthrough.mp4'));
        await t.frame.locator('#condition-form input[type=checkbox]').check();
        await t.frame.locator('#condition-form button[type=submit]').click();
        await t.frame.locator('#feature-status').filter({hasText:'Existing media must include its server id.'}).waitFor();
        evidence.push({check:'New condition video cannot be saved through real UI',error:await t.frame.locator('#feature-status').innerText()});
        await t.page.screenshot({path:path.join(__dirname,'artifacts/backend/audit-condition-upload.png')});
        await t.page.evaluate(r=>window.CampusNavigate('tenant/condition.html?id='+r),fixture.ids.rental);
        await t.frame.locator('#feature-app').filter({hasText:'This page could not be opened'}).waitFor();
        evidence.push({check:'Valid API report with fewer than six checklist entries crashes UI',error:await t.frame.locator('#feature-status').innerText()});
        await t.context.close();
        const p=await session(`tenant.peer.${fixture.run}@campus.test`,'TestingPass123');
        const counts=await p.page.evaluate(()=>({rentals:CampusState.rentals.length,requests:CampusState.subletRequests.length}));
        await p.page.evaluate(()=>CampusNavigate('tenant/sublets.html'));
        await p.frame.locator('#feature-app h1').waitFor();
        const text=await p.frame.locator('#feature-app').innerText();
        evidence.push({check:'Guest of partial rental cannot see accepted requests without own primary rental',...counts,requestsSectionVisible:text.includes('Requests and meetings'),text});
        await p.page.screenshot({path:path.join(__dirname,'artifacts/backend/audit-partial-request-hidden.png')});
        await p.context.close();
    } finally { await browser.close(); }
    fs.writeFileSync(path.join(__dirname,'artifacts/backend/audit-edge-cases.json'),JSON.stringify({date:new Date().toISOString(),evidence},null,2));
    for(const e of evidence) console.log(JSON.stringify(e));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
