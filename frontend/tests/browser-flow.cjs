// Dependency-free browser smoke test. Requires a local Chrome/Edge installation.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const apiMode = process.argv.includes('--api');
const mockApi = apiMode ? require('./mock-api.cjs') : null;
const browserPath = [
    process.env.CAMPUS_BROWSER,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
]
    .filter(Boolean)
    .find((p) => fs.existsSync(p));
if (!browserPath) throw Error('Set CAMPUS_BROWSER to your Chrome/Edge executable.');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const server = http.createServer((req, res) => {
    if (apiMode && req.url.startsWith('/api/')) {
        mockApi.handle(req, res).catch((error) => {
            res.writeHead(500).end(error.message);
        });
        return;
    }
    if (apiMode && ['/js/config.js', '/backend/wwwroot/js/config.js'].includes(req.url)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(
            'window.CampusConfig={mode:"api",apiBaseUrl:"http://127.0.0.1:' +
                server.address().port +
                '/api",credentials:"include",timeoutMs:5000,csrfHeader:"X-CSRF-TOKEN"};'
        );
        return;
    }
    const file = path.resolve(
        root,
        '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    );
    if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
    }
    fs.readFile(file, (error, data) => {
        if (error) {
            res.writeHead(404).end();
            return;
        }
        res.setHeader(
            'Content-Type',
            {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.png': 'image/png',
                '.svg': 'image/svg+xml',
                '.mp4': 'video/mp4',
                '.json': 'application/json'
            }[path.extname(file)] || 'application/octet-stream'
        );
        res.end(data);
    });
});
let browser, ws;
const errors = [];
async function main() {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin =
        process.env.CAMPUS_FILE || process.argv.includes('--file')
            ? require('node:url')
                  .pathToFileURL(root + '/')
                  .href.replace(/\/$/, '')
            : `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'campus-flow-browser-'));
    browser = spawn(
        browserPath,
        [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--remote-debugging-port=0',
            '--user-data-dir=' + profile,
            'about:blank'
        ],
        { windowsHide: true, stdio: 'ignore' }
    );
    browser.on('error', (error) => errors.push(error.message));
    let port;
    for (let i = 0; i < 100; i++) {
        try {
            port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
            break;
        } catch {}
        await delay(100);
    }
    if (!port) throw Error('Browser did not start: ' + errors.join('\n'));
    const target = await (
        await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    ).json();
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve);
        ws.addEventListener('error', reject);
    });
    let seq = 0;
    const pending = new Map();
    ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id) {
            const promise = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) promise.reject(Error(msg.error.message));
            else promise.resolve(msg.result);
        } else if (msg.method === 'Runtime.exceptionThrown')
            errors.push(
                msg.params.exceptionDetails.exception?.description ||
                    msg.params.exceptionDetails.text
            );
    });
    const send = (method, params = {}) =>
        new Promise((resolve, reject) => {
            const id = ++seq;
            const timeout = setTimeout(() => {
                pending.delete(id);
                reject(Error('Browser command timed out: ' + method));
            }, 20000);
            pending.set(id, {
                resolve: (value) => {
                    clearTimeout(timeout);
                    resolve(value);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
            ws.send(JSON.stringify({ id, method, params }));
        });
    await send('Runtime.enable');
    await send('Page.enable');
    // External assets are not needed to verify the rental workflow.
    await send('Network.enable');
    await send('Network.setBlockedURLs', {
        urls: [
            'https://fonts.googleapis.com/*',
            'https://fonts.gstatic.com/*',
            'https://images.unsplash.com/*'
        ]
    });
    const evaluate = async (expression) => {
        const value = await send('Runtime.evaluate', {
            expression: `document.getElementById("campus-page").contentWindow.eval(${JSON.stringify(expression)})`,
            returnByValue: true,
            awaitPromise: true
        });
        if (value.exceptionDetails)
            throw Error(
                value.exceptionDetails.exception?.description || value.exceptionDetails.text
            );
        return value.result.value;
    };
    const waitFor = async (expression) => {
        for (let i = 0; i < 150; i++) {
            try {
                if (await evaluate(expression)) return;
            } catch (_) {}
            await delay(100);
        }
        let details = '';
        try {
            details = JSON.stringify(
                await evaluate(
                    '({route:window.CampusRoute,title:document.title,status:document.querySelector("[role=alert]")?.textContent,message:document.getElementById("message")?.textContent,invalidFields:Array.from(document.querySelectorAll("input,select")).filter(field=>!field.validity.valid).map(field=>({id:field.id,value:field.value,message:field.validationMessage})),text:document.body.textContent.slice(0,1000)})'
                )
            );
        } catch (_) {}
        throw Error('Timed out: ' + expression + '\n' + details + '\n' + errors.join('\n'));
    };
    await send('Page.navigate', { url: origin + '/index.html' });
    await delay(500);
    const navigate = async (page) => {
        await send('Runtime.evaluate', {
            expression: 'window.CampusNavigate(' + JSON.stringify(page) + ')'
        });
        await delay(250);
        await waitFor('document.readyState === "complete"');
    };
    await waitFor(
        'window.CampusRoute==="public/index.html" && !!document.getElementById("assistant-toggle")'
    );
    assert.equal(await evaluate('document.querySelector(".preview-toolbar")'), null);
    assert.equal(
        await evaluate('!!document.querySelector("header.premium-nav .auth-register")'),
        true
    );
    assert.equal(
        await evaluate('!!document.querySelector("body > .assistant-widget #assistant-toggle")'),
        true
    );
    await send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    await delay(100);
    await evaluate('document.getElementById("menu-button").click()');
    assert.equal(
        await evaluate(
            'document.getElementById("assistant-toggle").getBoundingClientRect().width>0'
        ),
        true
    );
    await evaluate('document.getElementById("assistant-toggle").click()');
    assert.equal(
        await evaluate(
            'document.getElementById("assistant-panel").getBoundingClientRect().width>0'
        ),
        true
    );
    await evaluate('document.getElementById("menu-button").click()');
    await evaluate('document.getElementById("assistant-close").click()');
    assert.equal(await evaluate('document.activeElement.id'), 'assistant-toggle');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".assistant-widget")).position'), 'fixed');
    assert.equal(await evaluate('Math.round(innerWidth-document.getElementById("assistant-toggle").getBoundingClientRect().right)'), 16);
    await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
    assert.equal(await evaluate('Math.round(innerWidth-document.getElementById("assistant-toggle").getBoundingClientRect().right)'), 16);
    await evaluate('window.scrollTo(0, 0)');
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
    assert.equal(
        await evaluate('getComputedStyle(document.querySelector(".footer-links")).position'),
        'static'
    );
    assert.equal(
        await evaluate(
            'document.querySelector(".footer-links").getBoundingClientRect().top>=document.querySelector("footer").getBoundingClientRect().top'
        ),
        true
    );
    assert.equal(
        await evaluate(
            'document.querySelector(".footer-links a[href=\\"https://www.google.com/\\"]").target'
        ),
        '_blank'
    );
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false
    });

    await evaluate(
        'document.querySelector("header.premium-nav a[href=\\"../public/about.html\\"]").click()'
    );
    await waitFor('window.CampusRoute==="public/about.html" && !!document.getElementById("team")');
    assert.equal(
        await evaluate('document.querySelector(".team-role").textContent'),
        'OWNER & DEVELOPER'
    );
    await evaluate('document.querySelector("footer a[href=\\"../public/support.html\\"]").click()');
    await waitFor(
        'window.CampusRoute==="public/support.html" && !!document.getElementById("support-form")'
    );
    await evaluate(
        `const supportForm=document.getElementById('support-form');supportForm.elements.name.value='Sara123';supportForm.elements.email.value='help@example.com';supportForm.elements.topic.value='Account access';supportForm.elements.message.value='Please help with my rental request.';supportForm.requestSubmit();`
    );
    assert.equal(
        await evaluate('document.querySelector("[name=name]").validity.customError'),
        true
    );
    assert.equal(await evaluate('document.getElementById("support-status").textContent'), '');
    await evaluate(
        `document.querySelector('[name=name]').value='Sara Test';document.querySelector('[name=name]').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('support-form').requestSubmit();`
    );
    assert.equal(
        await evaluate(
            'document.getElementById("support-status").textContent.includes("has not been sent")'
        ),
        true
    );
    await evaluate('document.querySelector("a[href=\\"../public/faq.html\\"]").click()');
    await waitFor(
        'window.CampusRoute==="public/faq.html" && !!document.getElementById("faq-search")'
    );
    await evaluate(
        `document.getElementById('faq-search').value='no-matching-answer';document.getElementById('faq-search').dispatchEvent(new Event('input'));`
    );
    assert.equal(await evaluate('document.getElementById("faq-empty").hidden'), false);
    await evaluate(
        `document.getElementById('faq-search').value='Can I choose my roommate';document.getElementById('faq-search').dispatchEvent(new Event('input'));document.querySelector('.faq-item:not([hidden]) summary').click();`
    );
    assert.equal(await evaluate('document.querySelectorAll(".faq-item:not([hidden])").length'), 1);
    assert.equal(await evaluate('document.querySelector(".faq-item:not([hidden])").open'), true);
    for (const page of ['privacy', 'terms']) {
        await navigate('public/' + page + '.html');
        await waitFor('!!document.querySelector(".policy-copy")');
    }

    if (apiMode) {
        console.log('Checking API mode against the local JSON contract fixture…');
        assert.equal(await evaluate('document.getElementById("preview-role")'), null);
        assert.equal(
            await evaluate('window.CampusState.users.length'),
            0,
            'API starts without fake accounts'
        );
        async function signIn(email) {
            await navigate('auth/login.html');
            await waitFor('!!document.getElementById("login-form")');
            await evaluate(
                'document.getElementById("email").value=' +
                    JSON.stringify(email) +
                    ';document.getElementById("password").value="Campus123";document.getElementById("login-form").requestSubmit()'
            );
            await waitFor(
                'window.CampusState.currentUser!==null && window.CampusRoute!=="auth/login.html"'
            );
        }
        await signIn('tenant@campus.test');
        await waitFor('!!document.getElementById("property-grid")');
        await waitFor('document.getElementById("review")?.textContent==="Find a place ↗"');
        await navigate('admin.html');
        await waitFor(
            'window.CampusRoute==="tenant/home.html" && !!document.getElementById("property-grid")'
        );
        assert.equal(
            await evaluate('document.getElementById("preview-role")'),
            null,
            'Account role is not selectable'
        );
        assert.equal(await evaluate('window.CampusState.currentUser.password'), undefined);
        await navigate('properties.html');
        await waitFor('document.querySelectorAll(".catalog-card").length===4');
        await evaluate('document.querySelector("[data-save=\\"124\\"]").click()');
        await waitFor('window.CampusState.saved.includes(124)');
        assert.ok(
            mockApi.calls.some((c) => c.path === '/api/me/favorites/124' && c.method === 'PUT')
        );
        await navigate('favorites.html');
        await waitFor('document.querySelectorAll(".feature-card").length===1');
        await navigate('profile.html');
        await waitFor('!!document.getElementById("profile-form")');
        await evaluate(
            'document.querySelector("[name=email]").value="rejected@example.com";document.getElementById("profile-form").requestSubmit()'
        );
        await waitFor(
            'document.getElementById("feature-status").textContent.includes("reserved in the server test")'
        );
        assert.equal(mockApi.db.currentUser.email, 'tenant@campus.test');
        await navigate('roommates.html');
        await waitFor('!!document.querySelector("[data-roommate-meeting]")');
        await evaluate('document.querySelector("[data-choose-roommate]").click()');
        await waitFor('!!document.getElementById("clear-roommate")');
        const chosenId = await evaluate('window.CampusAPI.selectedRoommate().id');
        await evaluate('document.querySelector("[data-roommate-meeting]").click()');
        await waitFor('!!document.getElementById("meeting-form")');
        await evaluate("(()=>{const f=document.getElementById('meeting-form');const t=new Date(Date.now()+5*60000+3*3600000).toISOString();f.elements.date.value=t.slice(0,10);f.elements.time.value=t.slice(11,16);f.requestSubmit();})()");
        await waitFor('window.CampusState.meetings.length===1');
        assert.equal(await evaluate('document.querySelector("[data-meeting-simulate]")===null'), true);
        mockApi.db.meetings[0].status = 'accepted';
        await navigate('messages.html');
        await waitFor('!!document.querySelector("[data-meeting-join]")');
        assert.equal(await evaluate('document.getElementById("message-form")===null'), true);
        await evaluate(
            'document.getElementById("assistant-toggle").click();document.getElementById("assistant-input").value="Find a home";document.getElementById("assistant-form").requestSubmit()'
        );
        await waitFor(
            'document.getElementById("assistant-feed").textContent.includes("Backend assistant reply")'
        );
        mockApi.db.meetings.push({
            id: 'meeting-incoming-1', kind: 'roommate', targetId: 'tenant-1', subject: 'Roommate introduction', title: 'Meet a roommate',
            startsAt: new Date(Date.now()+3600000).toISOString(), duration: 15,
            creatorId: 'roommate-incoming', creatorName: 'Incoming roommate', recipientId: 'tenant-1', recipientName: 'Tenant',
            participants: ['roommate-incoming', 'tenant-1'], status: 'pending', createdAt: new Date().toISOString()
        });
        await navigate('messages.html');
        await waitFor('!!document.querySelector("[data-meeting-accept]")');
        await evaluate('document.querySelector("[data-meeting-accept]").click()');
        await waitFor('window.CampusState.meetings.find(m=>m.id==="meeting-incoming-1").status==="accepted"');
        assert.equal(mockApi.db.meetings.find(m=>m.id==='meeting-incoming-1').status, 'accepted');
        await navigate('../tenant/request.html?id=124');
        await waitFor('!!document.getElementById("request-form")');
        assert.equal(
            await evaluate('document.getElementById("roommate-field").hidden'),
            true,
            'Renting alone is the default'
        );
        await evaluate(
            'document.getElementById("roommate-choice").value="with";document.getElementById("roommate-choice").dispatchEvent(new Event("change"));document.getElementById("request-roommate").value="";document.querySelector("[name=message]").value="Sharing the home with a roommate.";document.getElementById("request-form").requestSubmit()'
        );
        assert.equal(mockApi.db.requests.length, 0, 'A roommate must be explicitly selected');
        await evaluate(
            'document.getElementById("request-roommate").value=' + JSON.stringify(chosenId)
        );
        await evaluate(
            'document.querySelector("[name=startDate]").value="2026-11-01";document.querySelector("[name=message]").value="Interested in a six month lease.";document.getElementById("request-form").requestSubmit()'
        );
        await waitFor(
            'window.CampusRoute.startsWith("tenant/requests.html") && window.CampusState.requests.length===1'
        );
        assert.equal(
            await evaluate('document.querySelector("[data-approve]")===null'),
            true,
            'No fake landlord approval'
        );
        const requestCall = mockApi.calls.find(
            (c) => c.path === '/api/rental-requests' && c.method === 'POST'
        );
        assert.deepEqual(Object.keys(requestCall.body).sort(), [
            'duration',
            'message',
            'propertyId',
            'roommate',
            'roommateId',
            'startDate'
        ]);
        assert.equal(requestCall.body.roommate, true);
        assert.equal(requestCall.body.roommateId, chosenId);
        assert.equal(Object.hasOwn(requestCall.body, 'roommateName'), false);
        await evaluate('document.getElementById("preview-signout").click()');
        await waitFor('window.CampusRoute==="auth/login.html"');
        await signIn('owner@campus.test');
        await waitFor(
            'window.CampusRoute==="landlord/dashboard.html" && !!document.querySelector(".role-hero")'
        );
        assert.equal(
            await evaluate(
                'Array.from(document.querySelectorAll(".nav nav a")).some(a=>a.getAttribute("href").includes("tenant/"))'
            ),
            false,
            'Owner has an independent navigation menu'
        );
        await navigate('landlord/profile.html');
        await waitFor('!!document.getElementById("profile-form")');
        assert.equal(await evaluate('document.querySelector("[name=firstName]").value'), 'Tariq');
        await navigate('landlord/messages.html');
        await waitFor('!!document.getElementById("meeting-list")');
        assert.equal(
            await evaluate(
                'Array.from(document.querySelectorAll("script")).some(s=>s.getAttribute("src")?.includes("/tenant/"))'
            ),
            false,
            'Tenant behavior is not loaded in owner pages'
        );
        await navigate('landlord/bookings.html');
        await waitFor(
            'document.querySelector(".section-intro h1")?.textContent==="Rental arrangements"'
        );
        assert.equal(await evaluate('document.body.dataset.tab'), 'bookings');
        await navigate('landlord.html?tab=requests');
        await waitFor('!!document.querySelector("[data-approve-request]")');
        assert.equal(await evaluate('window.CampusRoute'), 'landlord/requests.html');
        assert.ok(
            await evaluate(
                'document.getElementById("feature-app").textContent.includes("With roommate:")'
            )
        );
        await evaluate('document.querySelector("[data-approve-request]").click()');
        await waitFor('window.CampusState.requests[0]?.status==="approved"');
        assert.equal(mockApi.db.requests[0].landlordAccepted, true);
        await evaluate('document.getElementById("preview-signout").click()');
        await waitFor('window.CampusRoute==="auth/login.html"');
        await signIn('tenant@campus.test');
        await navigate('requests.html');
        await waitFor('!!document.querySelector("a[href^=\\"../tenant/rentals.html\\"]")');
        await send('Page.reload');
        await delay(300);
        await waitFor('window.CampusState.currentUser?.id==="tenant-1"');
        assert.equal(
            await evaluate('window.CampusState.requests[0].status'),
            'approved',
            'Reload restores server data'
        );
        assert.ok(
            mockApi.calls
                .filter((c) => c.method !== 'GET')
                .every((c) => c.headers['x-csrf-token'] === 'test-csrf')
        );
        await send('Page.navigate', { url: origin + '/html/landlord/requests.html' });
        await delay(300);
        await waitFor(
            'window.CampusRoute==="tenant/home.html" && !!document.getElementById("review")'
        );
        assert.deepEqual(errors, [], 'No browser runtime errors in API mode');
        console.log(
            'PASS: API JSON source, authenticated cookie/CSRF, favorites, ProblemDetails, contacts/chat, assistant, landlord approval and server restoration after reload.'
        );

        return;
    }
    const role = async (name) => {
        const email = {
                tenant: 'sara@example.com',
                landlord: 'owner@campus.test',
                admin: 'admin@campus.test'
            }[name],
            password = name === 'tenant' ? 'TestingPass1' : 'Campus123';
        await evaluate('document.getElementById("preview-signout").click()');
        await waitFor('window.CampusRoute==="auth/login.html"');
        await waitFor('!!document.getElementById("login-form")');
        await evaluate(
            'document.getElementById("email").value=' +
                JSON.stringify(email) +
                ';document.getElementById("password").value=' +
                JSON.stringify(password) +
                ';document.getElementById("login-form").requestSubmit()'
        );
        await waitFor(
            'window.CampusState.currentUser?.role===' +
                JSON.stringify(name) +
                ' && window.CampusRoute!=="auth/login.html"'
        );
    };
    console.log('Headless browser connected. Testing the rental flow…');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 768, deviceScaleFactor: 1, mobile: false });
    await navigate('register.html');
    assert.equal(await evaluate('document.documentElement.scrollHeight<=innerHeight'), true);
    await evaluate('document.getElementById("register-next").click()');
    assert.equal(await evaluate('document.querySelector(".register-step:not([hidden])").dataset.step'), '0');
    assert.ok(await evaluate('document.getElementById("message").textContent.length>0'));
    await evaluate(
        `document.getElementById('firstName').value='Sara';document.getElementById('lastName').value='Test';document.getElementById('email').value='sara@example.com';document.getElementById('phone').value='0791234567';document.getElementById('city').value='Amman';document.getElementById('university').value='University of Jordan';document.getElementById('password').value='TestingPass1';document.getElementById('confirmPassword').value='TestingPass1';document.getElementById('terms').checked=true;document.getElementById('register-next').click();document.getElementById('register-back').click();`
    );
    assert.equal(await evaluate('document.getElementById("email").value'), 'sara@example.com');
    for (const step of [1, 2]) {
        await evaluate('document.getElementById("register-next").click()');
        assert.equal(await evaluate('Number(document.querySelector(".register-step:not([hidden])").dataset.step)'), step);
        assert.equal(await evaluate('document.documentElement.scrollHeight<=innerHeight'), true, 'Registration step fits the viewport');
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        assert.equal(await evaluate('document.documentElement.scrollHeight<=innerHeight'), true, 'Registration step fits mobile without scrolling');
        const stepShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.mkdirSync(path.join(root, 'tests/artifacts/register-laptop'), { recursive: true });
        fs.writeFileSync(path.join(root, 'tests/artifacts/register-laptop', 'step-' + (step + 1) + '-390.png'), Buffer.from(stepShot.data, 'base64'));
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 768, deviceScaleFactor: 1, mobile: false });
    }
    await evaluate('document.getElementById("register-form").requestSubmit()');
    await waitFor(
        `window.CampusRoute.split('?')[0] === 'tenant/preferences.html' && !!document.getElementById('preferences-form')`
    );
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(
        `document.querySelector('[name=areas]').checked=true;document.getElementById('destination').value='University of Jordan';document.getElementById('preference-next').click();document.getElementById('preference-next').click();document.getElementById('preference-next').click();`
    );
    await waitFor(
        `window.CampusRoute.split('?')[0] === 'tenant/home.html' && document.getElementById('review')?.textContent === 'Find a place ↗'`
    );
    assert.equal(await evaluate(`document.getElementById('user-name').textContent`), ', Sara');
    await navigate('properties.html');
    await waitFor(`document.querySelectorAll('.catalog-card').length===4`);
    await evaluate(
        `document.getElementById('filter-query').value='Jubeiha';document.getElementById('filter-query').dispatchEvent(new Event('input'));`
    );
    assert.equal(await evaluate(`document.querySelectorAll('.catalog-card').length`), 1);
    await navigate('property.html?id=124');
    await waitFor(`!!document.querySelector('a[href="../tenant/request.html?id=124"]')`);
    if (process.env.CAMPUS_CAPTURE || process.argv.includes('--capture')) {
        fs.mkdirSync(path.join(root, 'tests/artifacts'), { recursive: true });
        await send('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 1000,
            deviceScaleFactor: 1,
            mobile: false
        });
        const screenshot = await send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false
        });
        fs.writeFileSync(
            path.join(root, 'tests/artifacts/property-desktop.png'),
            Buffer.from(screenshot.data, 'base64')
        );
    }
    await evaluate(`document.querySelector('a[href="../tenant/request.html?id=124"]').click()`);
    await waitFor(`!!document.getElementById('request-form')`);
    assert.equal(await evaluate('document.getElementById("roommate-field").hidden'), true);
    await evaluate(
        'document.getElementById("roommate-choice").value="with";document.getElementById("roommate-choice").dispatchEvent(new Event("change"));document.getElementById("request-roommate").value="roommate-2"'
    );
    await evaluate(
        `document.querySelector('[name=message]').value='I would like to move in near campus.';document.getElementById('request-form').requestSubmit();`
    );
    await waitFor(
        `window.CampusRoute.split('?')[0] === 'tenant/requests.html' && window.CampusState.requests.length===1`
    );
    assert.equal(await evaluate('window.CampusState.requests[0].roommateId'), 'roommate-2');
    assert.equal(await evaluate('document.querySelector("[data-approve]")'), null);
    await role('landlord');
    await waitFor('!!document.querySelector(".owner-notification-summary")');
    assert.equal(await evaluate('document.querySelectorAll(".notification-card").length'), 0, 'Overview shows a compact notice instead of notification details');
    const unreadNotifications = await evaluate('(async()=> (await window.CampusAPI.getNotifications()).filter(n=>!n.read).length)()');
    assert.ok(unreadNotifications > 0);
    await evaluate('document.querySelector(".owner-notification-summary").click()');
    await waitFor('!!document.querySelector("[data-read-notification]")');
    const notificationEditRoute = await evaluate('document.querySelector("[data-edit-notification]").getAttribute("href")');
    await evaluate('document.querySelector("[data-edit-notification]").click()');
    await waitFor('!!document.getElementById("property-form")');
    assert.equal(await evaluate('window.CampusRoute'), await evaluate('window.CampusRoutes.resolve(' + JSON.stringify(notificationEditRoute) + ', "landlord")'));
    assert.equal(await evaluate('(async()=> (await window.CampusAPI.getNotifications()).filter(n=>!n.read).length)()'), unreadNotifications, 'Opening the editor does not mark the notification as read');
    await navigate('landlord/dashboard.html?tab=notifications');
    await waitFor('!!document.querySelector("[data-read-notification]")');
    for (let remaining = unreadNotifications - 1; remaining >= 0; remaining--) {
        await evaluate('document.querySelector("[data-read-notification]").click()');
        await waitFor('document.querySelectorAll("[data-read-notification]").length===' + remaining);
    }
    assert.equal(await evaluate('document.querySelectorAll(".notification-card").length'), 0, 'Read notifications disappear');
    assert.ok(await evaluate('document.querySelector(".notifications-empty").textContent.includes("No unread notifications")'));
    await navigate('landlord.html');
    await waitFor('!document.querySelector(".loading")');
    assert.equal(await evaluate('document.querySelector(".owner-notification-summary")'), null, 'No dashboard notice after all notifications are read');
    await navigate('landlord.html?tab=requests');
    await waitFor('!!document.querySelector("[data-approve-request]")');
    await evaluate('document.querySelector("[data-approve-request]").click()');
    await waitFor('window.CampusState.requests[0].status==="approved"');
    await role('tenant');
    await navigate('requests.html');
    await waitFor(`!!document.querySelector('a[href^="../tenant/rentals.html?id="]')`);
    await evaluate(`document.querySelector('a[href^="../tenant/rentals.html?id="]').click()`);
    await waitFor(`!!document.querySelector('form[id^=agreement-]')`);
    await evaluate(
        `document.querySelector('form[id^=agreement-] input[type=checkbox]').checked=true;document.querySelector('form[id^=agreement-]').requestSubmit();`
    );
    await waitFor(`!!document.getElementById('inspection-form')`);
    await evaluate(
        `document.querySelector('#inspection-form input[type=checkbox]').checked=true;document.querySelector('[name=notes]').value='Existing mark near the door.';document.getElementById('inspection-form').requestSubmit();`
    );
    await waitFor(`!!document.getElementById('checkout')`);
    await evaluate(
        `document.getElementById('payment-consent').checked=true;document.getElementById('checkout').click();`
    );
    await waitFor(
        `window.CampusRoute.split('?')[0] === 'tenant/rentals.html' && !!document.querySelector('[data-move]')`
    );
    await navigate('home.html');
    await waitFor('document.getElementById("rental-description")?.textContent.includes("rental is active")');
    assert.equal(await evaluate('document.getElementById("offer-partial-rental").hidden'), true, 'Home offers partial rentals after move-in is confirmed');
    assert.equal(await evaluate('document.getElementById("move-in-arrival")'), null, 'Arrival animation appears only after move-in');
    await navigate('rentals.html');
    await waitFor('!!document.querySelector("[data-move]")');
    await evaluate(
        `document.querySelector('input[id^="keys-"]').checked=true;document.querySelector('[data-move]').click();`
    );
    await waitFor(`document.querySelector('.rental-card .badge')?.textContent === 'Moved in'`);
    // Reproduce an already-open session holding the old template while loading new page JS.
    await evaluate(String.raw`window.parent.__homeTemplateBeforeUpdate=window.parent.CampusPages['tenant/home.html'];window.parent.CampusPages['tenant/home.html']=window.parent.__homeTemplateBeforeUpdate.replace(/<a[^>]*id="offer-partial-rental"[^>]*>[^<]*<\/a>/,'').replace(/<p[^>]*id="partial-rental-help"[^>]*>[^<]*<\/p>/,'')`);
    await navigate('home.html');
    await waitFor(
        `document.getElementById('rental-description')?.textContent.includes('rental is active')`
    );
    await waitFor('document.getElementById("review").textContent==="View my rental ↗"');
    assert.equal(await evaluate('document.querySelectorAll("#rental .timeline li.done").length'), 5, 'Every move-in step is complete even with the old cached template');
    assert.equal(await evaluate('document.querySelectorAll("#rental .timeline li.current").length'), 0);
    assert.equal(await evaluate('document.querySelector("#rental .timeline").hidden'), true);
    assert.equal(await evaluate('!!document.querySelector("#move-in-arrival .arrival-walker")'), true);
    await evaluate("window.parent.CampusPages['tenant/home.html']=window.parent.__homeTemplateBeforeUpdate;delete window.parent.__homeTemplateBeforeUpdate");
    const completedRentalId = await evaluate('window.CampusState.rentals[0].id');
    const existingOfferCount = await evaluate('window.CampusState.subletListings.length');
    assert.equal(await evaluate('document.getElementById("offer-partial-rental").hidden'), false);
    await evaluate('document.getElementById("review").click()');
    await waitFor('!!document.querySelector(".rental-card")');
    assert.equal(await evaluate('new URLSearchParams(window.CampusRoute.split("?")[1]).get("id")'), completedRentalId);
    await navigate('home.html');
    await waitFor('!document.getElementById("offer-partial-rental").hidden');
    await evaluate('document.getElementById("offer-partial-rental").click()');
    await waitFor('!!document.getElementById("sublet-create")');
    assert.equal(await evaluate('document.getElementById("sublet-create").elements.rentalId.value'), completedRentalId);
    assert.equal(await evaluate('document.getElementById("sublet-create").elements.roomNumber.options.length'), await evaluate('window.CampusState.rentals[0].request.property.beds'));
    assert.equal(await evaluate('document.getElementById("sublet-create").elements.endDate.max'), await evaluate('window.CampusState.rentals[0].endDate'));
    assert.equal(await evaluate('window.CampusState.subletListings.length'), existingOfferCount, 'The home shortcut opens the offer form without publishing or charging');
    await navigate('home.html');
    await waitFor('document.getElementById("review").textContent==="View my rental ↗"');
    fs.mkdirSync(path.join(root, 'tests/artifacts/completed-rental'), { recursive: true });
    for (const width of [1440, 390]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: width === 1440 ? 1000 : 844, deviceScaleFactor: 1, mobile: width === 390 });
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
        assert.equal(await evaluate('document.querySelectorAll("#move-in-arrival video, #move-in-arrival canvas, #move-in-arrival img").length'), 0, 'The original simple illustration uses only SVG');
        assert.ok(await evaluate('document.querySelector(".arrival-leg").getAnimations().length>0'));
        const arrivalBounds = await evaluate(`(async()=>{
            const walker=document.querySelector('.arrival-walker');
            const animation=walker.getAnimations().find(a=>a.animationName==='arrive-home');
            const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}};
            animation.pause();animation.currentTime=0;await new Promise(requestAnimationFrame);
            const start=rect(walker);
            animation.currentTime=4800;await new Promise(requestAnimationFrame);
            const end=rect(walker),track=rect(document.querySelector('.arrival-illustration')),house=rect(document.querySelector('.arrival-house-scene'));
            animation.currentTime=3500;
            return {start,end,track,house};
        })()`);
        assert.ok(Math.abs(arrivalBounds.start.left-arrivalBounds.track.left)<arrivalBounds.track.width*.15, 'Character starts near the left edge of the simple illustration');
        assert.ok(arrivalBounds.end.right>=arrivalBounds.house.left && arrivalBounds.end.right<=arrivalBounds.house.right, 'Character reaches the house at the right end');
        if (width===1440) {
            assert.ok(arrivalBounds.end.left-arrivalBounds.start.left>100, 'The simple character walks toward the house');
            assert.equal(await evaluate('document.querySelector(".arrival-copy").getBoundingClientRect().left>document.querySelector(".arrival-illustration").getBoundingClientRect().right'), true, 'Welcome home sits beside the illustration');
        }
        const completedShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(root, 'tests/artifacts/completed-rental', 'home-' + width + '.png'), Buffer.from(completedShot.data, 'base64'));
        await evaluate("document.querySelector('.arrival-walker').getAnimations().forEach(a=>a.play())");
    }
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".arrival-walker")).animationName'), 'none');
    await send('Emulation.setEmulatedMedia', { features: [] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    if (process.env.CAMPUS_CAPTURE || process.argv.includes('--capture')) {
        const screenshot = await send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false
        });
        fs.writeFileSync(
            path.join(root, 'tests/artifacts/home-desktop.png'),
            Buffer.from(screenshot.data, 'base64')
        );
    }
    await send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    for (const page of [
        'home.html',
        'properties.html',
        'property.html?id=124',
        'requests.html',
        'rentals.html'
    ]) {
        await navigate(page);
        await waitFor(`!document.querySelector('.loading')`);
        assert.equal(
            await evaluate(`document.documentElement.scrollWidth <= innerWidth`),
            true,
            'Mobile overflow: ' + page
        );
        if (
            (process.env.CAMPUS_CAPTURE || process.argv.includes('--capture')) &&
            page === 'home.html'
        ) {
            const screenshot = await send('Page.captureScreenshot', {
                format: 'png',
                captureBeyondViewport: false
            });
            fs.writeFileSync(
                path.join(root, 'tests/artifacts/home-mobile.png'),
                Buffer.from(screenshot.data, 'base64')
            );
        }
    }
    console.log('Checking the full frontend feature set…');
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false
    });
    // Save a property, then read it from a different page.
    await navigate('properties.html');
    await waitFor(`!!document.querySelector('[data-save="231"]')`);
    await evaluate(`document.querySelector('[data-save="231"]').click()`);
    await navigate('favorites.html');
    await waitFor(`document.querySelectorAll('.feature-card').length===1`);
    assert.equal(
        await evaluate(`document.querySelector('.feature-card h3').textContent`),
        'Apartment #231'
    );
    // Roommate communication uses a scheduled invitation and video meeting.
    await navigate('roommates.html');
    await waitFor("document.querySelectorAll('[data-roommate-meeting]').length===3");
    await evaluate("document.querySelector('[data-roommate-meeting]').click()");
    await waitFor("!!document.getElementById('meeting-form')");
    await evaluate("(()=>{const f=document.getElementById('meeting-form');const time=new Date(Date.now()+5*60000+3*3600000).toISOString();f.elements.date.value=time.slice(0,10);f.elements.time.value=time.slice(11,16);f.requestSubmit();})()");
    await waitFor("!!document.querySelector('[data-meeting-simulate]')");
    assert.equal(await evaluate("document.getElementById('message-form')===null"), true);
    await evaluate("document.querySelector('[data-meeting-simulate]').click()");
    await waitFor("!!document.querySelector('[data-meeting-join]:not(:disabled)')");
    // Mock only the provider to verify embedding and cleanup without sending media.
    await evaluate("window.JitsiMeetExternalAPI=class{constructor(domain,options){window.__meetingOptions=options;document.getElementById('meeting-video').textContent='Test video';}addListener(){}dispose(){window.__meetingDisposed=true;}};document.querySelector('[data-meeting-join]').click()");
    await waitFor("!!window.__meetingOptions");
    assert.ok(await evaluate("window.__meetingOptions.roomName.startsWith('CampusMate-')"));
    await evaluate("document.getElementById('leave-meeting').click()");
    await waitFor("window.__meetingDisposed===true");
    await evaluate("document.querySelector('[data-meeting-cancel]').click()");
    await waitFor("document.querySelector('.meeting-card .badge').textContent==='cancelled'");
    // Assistant is a working rule-based frontend widget.
    await evaluate(
        `document.getElementById('assistant-toggle').click();document.getElementById('assistant-input').value='How to book a home?';document.getElementById('assistant-form').requestSubmit();`
    );
    await waitFor(`document.querySelectorAll('#assistant-feed p').length===2`);
    assert.ok(
        await evaluate(`document.getElementById('assistant-feed').textContent.includes('landlord')`)
    );
    // Video uploads are kept locally. Reports compare entered condition data.
    const rentalId = await evaluate(`window.CampusState.rentals[0].id`);
    await navigate('condition.html?id=' + rentalId);
    await waitFor(`!!document.getElementById('condition-form')`);
    const videoInput = `const transfer=new DataTransfer();transfer.items.add(new File(['demo video'],'walkthrough.mp4',{type:'video/mp4'}));const video=document.getElementById('condition-video-file');video.files=transfer.files;video.dispatchEvent(new Event('change'));document.querySelector('#condition-form input[type=checkbox]').checked=true;document.getElementById('condition-form').requestSubmit();`;
    await evaluate(`(()=>{${videoInput}})()`);
    await waitFor(`window.CampusState.rentals[0].conditions.initial!==null`);
    await navigate('condition.html?id=' + rentalId + '&phase=final');
    await waitFor(`!!document.querySelector('[name=condition3]')`);
    assert.equal(
        await evaluate(
            `fetch(window.CampusState.rentals[0].conditions.initial.video.url).then(r=>r.text())`
        ),
        'demo video',
        'Video remains readable after navigation'
    );
    await evaluate(
        `(()=>{document.querySelector('[name=condition3]').value='Needs repair';${videoInput}})()`
    );
    await waitFor(
        `document.getElementById('comparison-report').textContent.includes('1 changed entry')`
    );
    await evaluate(
        `document.getElementById('close-rental-consent').checked=true;document.getElementById('close-rental').click()`
    );
    assert.equal(await evaluate(`window.CampusState.rentals[0].status`), 'closed');
    // A listing report is visible to the admin.
    await navigate('property.html?id=124');
    await waitFor(`!!document.getElementById('report-form')`);
    await evaluate(
        `document.querySelector('#report-form textarea').value='Please review these property details.';document.getElementById('report-form').requestSubmit()`
    );
    await waitFor(`window.CampusState.reports.length===1`);
    // The landlord sees requests belonging to their properties.
    await role('landlord');
    await navigate('landlord.html?tab=bookings');
    await waitFor(`document.querySelector('.data-table')?.textContent.includes('Sara')`);
    await navigate('add-property.html');
    await waitFor(`!!document.getElementById('property-form')`);
    await evaluate(
        `(()=>{const form=document.getElementById('property-form');form.elements.title.value='New property demo';form.elements.price.value='20';form.elements.description.value='Urgent deposit. Pay before viewing.';const t=new DataTransfer();const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j+j8AAAAASUVORK5CYII='),c=>c.charCodeAt(0));t.items.add(new File([bytes],'room.png',{type:'image/png'}));const input=document.getElementById('property-photos');input.files=t.files;input.dispatchEvent(new Event('change'));form.requestSubmit();})()`
    );
    await waitFor(`!!document.getElementById('confirm-listing-fee')`);
    await evaluate(`document.getElementById('confirm-listing-fee').click()`);
    await waitFor(
        `window.CampusRoute==='landlord/dashboard.html' && window.CampusState.properties.some(p=>p.title==='New property demo'&&p.status==='pending'&&p.listingFee.status==='paid')`
    );
    await role('admin');
    await waitFor(`!!document.querySelector('[data-moderate]')`);
    const newPropertyId = await evaluate(
        `window.CampusState.properties.find(p=>p.title==='New property demo').id`
    );
    await evaluate(
        `document.querySelector('[data-moderate="${newPropertyId}"]').click()`
    );
    await waitFor('!!document.getElementById("approve-reviewed")');
    await evaluate('document.getElementById("approve-reviewed").click()');
    await waitFor(
        `window.CampusState.properties.find(p=>p.id===${newPropertyId}).status==='published'`
    );
    await navigate('property.html?id=' + newPropertyId);
    await waitFor(`document.querySelector('.gallery img')?.naturalWidth===1`);
    await navigate('admin.html?tab=reports');
    await waitFor(`!!document.querySelector('[data-resolve]')`);
    await evaluate(`document.querySelector('[data-resolve]').click()`);
    await waitFor(`window.CampusState.reports[0].status==='resolved'`);
    await navigate('admin.html?tab=users');
    await waitFor(`document.querySelectorAll('[data-user]').length===window.CampusState.users.filter(user=>user.role!=='admin').length`);
    await evaluate(`document.querySelector('[data-user]').click()`);
    await waitFor(`document.querySelector('.data-table').textContent.includes('Suspended')`);
    await evaluate(`document.querySelector('[data-user]').click()`);
    // All admin pages retain the same sidebar, including shared public pages.
    const adminShots = path.join(root, 'tests/artifacts/admin-sidebar');
    fs.mkdirSync(adminShots, { recursive: true });
    for (const target of ['admin/dashboard.html', 'admin/profile.html', 'public/market.html', 'public/support.html']) {
        await navigate(target);
        await waitFor("!!document.querySelector('.dashboard-sidebar .preview-toolbar') && !document.querySelector('.loading')");
        assert.equal(await evaluate("document.body.classList.contains('dashboard-layout')"), true);
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.dashboard-sidebar')).position"), 'fixed');
        assert.equal(await evaluate("document.querySelectorAll('.dashboard-sidebar [aria-current=page]').length"), 1);
        assert.equal(await evaluate("document.querySelectorAll('.dashboard-sidebar nav .sidebar-icon').length"), 7);
        assert.equal(await evaluate("document.querySelectorAll('.preview-toolbar').length"), 1);
        const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(adminShots, target.replace('/', '-').replace('.html', '.png')), Buffer.from(capture.data, 'base64'));
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await waitFor("getComputedStyle(document.querySelector('.dashboard-sidebar')).visibility==='hidden'");
    await evaluate("document.getElementById('menu-toggle').click()");
    await waitFor("getComputedStyle(document.querySelector('.dashboard-sidebar')).visibility==='visible'");
    assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"), true);
    await evaluate("document.getElementById('menu-toggle').click()");
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    // Role return preserves the previously registered tenant.
    await role('tenant');
    await waitFor(`document.getElementById('user-name')?.textContent===', Sara'`);
    await navigate('profile.html');
    await waitFor(`!!document.getElementById('profile-form')`);
    await evaluate(
        `const name=document.querySelector('[name=firstName]');name.value='Sara123';name.dispatchEvent(new Event('input'));document.getElementById('profile-form').requestSubmit()`
    );
    assert.equal(await evaluate(`window.CampusState.currentUser.firstName`), 'Sara');
    assert.equal(
        await evaluate(`document.querySelector('[name=firstName]').checkValidity()`),
        false
    );
    // Real landlord controls review two tenant requests in this same session.
    await navigate('request.html?id=231');
    await waitFor('!!document.getElementById("request-form")');
    await evaluate(
        'document.querySelector("[name=message]").value="Interested in a six month lease.";document.getElementById("request-form").requestSubmit()'
    );
    await waitFor(
        'window.CampusState.requests.some(r=>r.propertyId===231&&r.status==="submitted")'
    );
    const approvalId = await evaluate('window.CampusState.requests.find(r=>r.propertyId===231).id');
    await role('landlord');
    await navigate('landlord.html?tab=requests');
    await waitFor('!!document.querySelector("[data-approve-request]")');
    await evaluate('document.querySelector("[data-approve-request]").click()');
    await waitFor('window.CampusState.requests.find(r=>r.propertyId===231).status==="approved"');
    await role('tenant');
    await navigate('../tenant/rentals.html?id=' + approvalId);
    await waitFor('!!document.querySelector("form[id^=agreement-]")');
    assert.ok(
        await evaluate(
            'document.querySelector(".agreement-copy").textContent.includes("Landlord terms accepted")'
        )
    );
    await navigate('request.html?id=92');
    await waitFor('!!document.getElementById("request-form")');
    await evaluate(
        'document.querySelector("[name=duration]").value="3";document.querySelector("[name=duration]").dispatchEvent(new Event("change"));document.querySelector("[name=message]").value="Looking for a short stay."'
    );
    assert.equal(await evaluate('document.getElementById("summary-total").textContent'), 'JD 60');
    await evaluate('document.getElementById("request-form").requestSubmit()');
    await waitFor('window.CampusState.requests.some(r=>r.propertyId===92&&r.status==="submitted")');
    await role('landlord');
    await navigate('landlord.html?tab=requests');
    await waitFor('!!document.querySelector("[data-reject-request]")');
    await evaluate('document.querySelector("[data-reject-request]").click()');
    await waitFor('window.CampusState.requests.find(r=>r.propertyId===92).status==="rejected"');
    await navigate('add-property.html?id=124');
    await waitFor('document.querySelector("[name=title]")?.value==="Apartment #124"');
    await evaluate(
        'document.querySelector("[name=price]").value="200";document.getElementById("property-form").requestSubmit()'
    );
    await waitFor('window.CampusState.properties.find(p=>p.id===124).price===200');
    assert.equal(
        await evaluate('window.CampusState.rentals[0].request.property.price'),
        190,
        'An edited listing does not change the agreed rental price'
    );
    // Each new screen should fit a mobile viewport.
    await send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true
    });
    for (const screen of [
        'roommates.html',
        'messages.html',
        'favorites.html',
        'bookings.html',
        'profile.html',
        'landlord.html',
        'landlord.html?tab=requests',
        'landlord.html?tab=bookings',
        'add-property.html',
        'landlord/messages.html',
        'landlord/profile.html',
        'landlord/condition.html?id=' + rentalId,
        'admin.html',
        'admin.html?tab=users',
        'admin.html?tab=properties',
        'admin.html?tab=reports',
        'admin.html?tab=ai',
        'admin/profile.html',
        'market.html',
        'condition.html?id=' + rentalId
    ]) {
        const account = /^(?:landlord|add-property)/.test(screen)
            ? 'landlord'
            : /^admin/.test(screen)
              ? 'admin'
              : 'tenant';
        if ((await evaluate('window.CampusState.currentUser.role')) !== account)
            await role(account);
        await navigate(screen);
        await waitFor(`!document.querySelector('.loading')`);
        assert.equal(
            await evaluate('window.CampusRoute'),
            await evaluate(
                'window.CampusRoutes.resolve(' +
                    JSON.stringify(screen) +
                    ',window.CampusState.currentUser.role)'
            ),
            'The intended private page was opened'
        );
        assert.equal(
            await evaluate('document.querySelector(".status-message")?.textContent||""'),
            '',
            'The page loaded successfully: ' + screen
        );
        assert.equal(
            await evaluate(`document.documentElement.scrollWidth <= innerWidth`),
            true,
            'Mobile overflow: ' + screen
        );
    }
    if (process.argv.includes('--capture')) {
        await send('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 1000,
            deviceScaleFactor: 1,
            mobile: false
        });
        for (const page of ['landlord.html', 'admin.html', 'market.html', 'roommates.html']) {
            const account =
                page === 'landlord.html' ? 'landlord' : page === 'admin.html' ? 'admin' : 'tenant';
            if ((await evaluate('window.CampusState.currentUser.role')) !== account)
                await role(account);
            await navigate(page);
            await waitFor('!document.querySelector(".loading")');
            const capture = await send('Page.captureScreenshot', {
                format: 'png',
                captureBeyondViewport: false
            });
            fs.writeFileSync(
                path.join(root, 'tests/artifacts', page.replace('.html', '-desktop.png')),
                Buffer.from(capture.data, 'base64')
            );
        }
    }
    // Removed paid advertisements remain editable and return through admin review.
    await role('admin');
    await navigate('admin.html?tab=ai');
    await waitFor('!!document.querySelector("[data-request-corrections]")');
    const correctionId = await evaluate('document.querySelector("[data-request-corrections]").dataset.requestCorrections');
    const retainedFee = await evaluate('JSON.stringify(window.CampusState.properties.find(p=>String(p.id)===' + JSON.stringify(correctionId) + ').listingFee)');
    await evaluate('document.querySelector("[data-request-corrections]").click()');
    await waitFor('!!document.getElementById("moderation-form")');
    await evaluate('document.getElementById("moderation-form").elements.notes.value="Please correct the description and use an accurate rental price.";document.getElementById("moderation-form").requestSubmit()');
    await waitFor('!document.getElementById("moderation-dialog").open');
    await role('landlord');
    await waitFor('!!document.querySelector(".owner-corrections")');
    await navigate('landlord/add-property.html?id=' + correctionId);
    await waitFor('!!document.querySelector(".correction-instructions")');
    await evaluate('document.getElementById("property-form").elements.title.value="Corrected apartment listing";document.getElementById("property-form").elements.title.dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("property-form").elements.price.value="190";document.getElementById("property-form").elements.description.value="A furnished home with clear photos, accurate pricing and useful transport links.";document.getElementById("property-form").requestSubmit()');
    await waitFor('window.CampusRoute==="landlord/dashboard.html" && window.CampusState.properties.find(p=>String(p.id)===' + JSON.stringify(correctionId) + ').status==="pending"');
    assert.equal(await evaluate('JSON.stringify(window.CampusState.properties.find(p=>String(p.id)===' + JSON.stringify(correctionId) + ').listingFee)'), retainedFee);
    await role('admin');
    await navigate('admin.html?tab=ai');
    await waitFor('Array.from(document.querySelectorAll("[data-risk]")).some(b=>b.dataset.risk===' + JSON.stringify(correctionId) + ')');
    await evaluate('Array.from(document.querySelectorAll("[data-risk]")).find(b=>b.dataset.risk===' + JSON.stringify(correctionId) + ').click()');
    await waitFor('!!document.getElementById("approve-reviewed")');
    await evaluate('document.getElementById("approve-reviewed").click()');
    await waitFor('window.CampusState.properties.find(p=>String(p.id)===' + JSON.stringify(correctionId) + ').status==="published"');
    assert.equal(await evaluate('JSON.stringify(window.CampusState.properties.find(p=>String(p.id)===' + JSON.stringify(correctionId) + ').listingFee)'), retainedFee);
    // Each role has the same password dialog; admin profiles omit work/study fields.
    for (const accountRole of ['tenant', 'landlord', 'admin']) {
        await role(accountRole);
        await navigate('profile.html');
        await waitFor('!!document.getElementById("reset-password")');
        assert.equal(await evaluate('!!document.querySelector("[name=destination]")'), accountRole !== 'admin');
        assert.equal(await evaluate('!!document.querySelector("[name=occupation]")'), accountRole !== 'admin');
        await evaluate('document.getElementById("reset-password").click()');
        await waitFor('document.getElementById("feature-dialog").open');
        assert.equal(await evaluate('document.activeElement.name'), 'currentPassword');
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
        const modalShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.mkdirSync(path.join(root, 'tests/artifacts/profile-security'), { recursive: true });
        fs.writeFileSync(path.join(root, 'tests/artifacts/profile-security', accountRole + '-password-390.png'), Buffer.from(modalShot.data, 'base64'));
        await evaluate('const passwordForm=document.getElementById("password-reset-form");passwordForm.elements.currentPassword.value="WrongPass1";passwordForm.elements.newPassword.value="UpdatedPass1";passwordForm.elements.confirmPassword.value="UpdatedPass1";passwordForm.requestSubmit()');
        await waitFor('document.getElementById("password-reset-message").textContent.includes("current password is incorrect")');
        const oldPassword = accountRole === 'tenant' ? 'TestingPass1' : 'Campus123';
        await evaluate('document.getElementById("password-reset-form").elements.currentPassword.value=' + JSON.stringify(oldPassword) + ';document.getElementById("password-reset-form").requestSubmit()');
        await waitFor('!document.getElementById("feature-dialog").open && document.getElementById("profile-success").textContent.includes("Password updated")');
        await evaluate('window.CampusAPI.changePassword({currentPassword:"UpdatedPass1",newPassword:' + JSON.stringify(oldPassword) + '})');
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    }
    // Refreshing the main document resets all user-created data.
    await send('Page.reload');
    await delay(400);
    await waitFor(`window.CampusState && window.CampusState.requests.length===0`);
    assert.equal(await evaluate(`window.CampusState.users.length`), JSON.parse(fs.readFileSync(path.join(root, 'data/campus-seed.json'), 'utf8')).users.length);
    await send('Page.navigate', { url: origin + '/html/landlord/requests.html' });
    await delay(300);
    await waitFor(
        'window.CampusRoute==="auth/login.html" && !!document.getElementById("login-form")'
    );
    console.log(
        'PASS: favorites, chosen roommate, contact/chat, assistant, videos/comparison, landlord uploads, moderation/reports, separate account sign-ins, Regex rejection and refresh reset.'
    );
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log(
        'PASS: register → preferences → home → search → property → request → approval → agreement → inspection → payment → rental → move-in. Mobile overflow checks passed.'
    );
}
main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => {
        if (ws) ws.close();
        if (browser) browser.kill();
        server.close();
    });
