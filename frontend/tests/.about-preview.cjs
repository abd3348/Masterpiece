// Responsive visual audit. External images/fonts are blocked to exercise local fallbacks.
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
    if (apiMode && req.url === '/js/config.js') {
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
                '.json': 'application/json',
                '.svg': 'image/svg+xml'
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
                    '({route:window.CampusRoute,title:document.title,status:document.querySelector("[role=alert]")?.textContent,text:document.body.textContent.slice(0,1000)})'
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
    const phase = process.argv.includes('--after') ? 'after' : 'before';
    const outputName =
        process.argv.find((value) => value.startsWith('--output='))?.slice(9) || 'design-' + phase;
    assert.match(outputName, /^[a-z0-9-]+$/, 'Output must be a simple folder name.');
    const output = path.join(root, 'tests/artifacts', outputName);
    fs.mkdirSync(output, { recursive: true });
    const login = async (role) => {
        await navigate('auth/login.html');
        await waitFor('!!document.getElementById("login-form")');
        await evaluate('window.CampusAPI.logout()');
        const email = {
            tenant: 'tenant@campus.test',
            landlord: 'owner@campus.test',
            admin: 'admin@campus.test'
        }[role];
        await evaluate(
            'window.CampusAPI.login({email:' + JSON.stringify(email) + ',password:"Campus123"})'
        );
    };
    const requests = [];
    const report = [];
    const registry = { window: {}, URLSearchParams };
    require('node:vm').runInNewContext(
        fs.readFileSync(path.join(root, 'js/pages.js'), 'utf8'),
        registry
    );
    const registeredRoutes = Object.keys(registry.window.CampusPages).concat(
        ['users', 'properties', 'reports', 'ai', 'activity'].map(
            (tab) => 'admin/dashboard.html?tab=' + tab
        )
    );
    const routeOption = process.argv.find((value) => value.startsWith('--routes='));
    const routes = routeOption ? routeOption.slice(9).split(',') : registeredRoutes;
    assert.ok(
        routes.length && routes.every((route) => registeredRoutes.includes(route)),
        'Unknown audit route.'
    );
    const widthOption = process.argv.find((value) => value.startsWith('--widths='));
    const widths = widthOption
        ? widthOption.slice(9).split(',').map(Number)
        : phase === 'after'
          ? [390, 1440, 768, 360]
          : [1440, 390];
    assert.ok(
        widths.length && widths.every((width) => [360, 390, 768, 1440].includes(width)),
        'Widths must be 360, 390, 768 or 1440.'
    );
    for (const width of widths) {
        await send('Emulation.setDeviceMetricsOverride', {
            width,
            height: width === 1440 ? 1050 : 844,
            deviceScaleFactor: 1,
            mobile: width < 600
        });
        for (const route of routes) {
            if (process.argv.includes('--verbose')) console.log(width + 'px ' + route);
            const section = route.split('/')[0];
            if (['tenant', 'landlord', 'admin'].includes(section)) {
                if ((await evaluate('window.CampusState.currentUser?.role')) !== section)
                    await login(section);
            } else if (await evaluate('!!window.CampusState.currentUser'))
                await evaluate('window.CampusAPI.logout()');
            let target = route;
            if (route.endsWith('/agreement.html')) target += '?id=' + requests[0];
            if (route.endsWith('/inspection.html')) target += '?id=' + requests[1];
            if (route.endsWith('/payment.html')) target += '?id=' + requests[2];
            if (route.endsWith('/condition.html')) target += '?id=' + requests[3];
            await navigate(target);
            await waitFor('!document.querySelector(".loading")');
            await delay(450);
            await evaluate(
                'document.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=1000;})'
            );
            const name =
                route.replaceAll('/', '-').replace('.html', '').replace('?tab=', '-') + '-' + width;
            if ([1440, 390].includes(width)) {
                const screen = await send('Page.captureScreenshot', {
                    format: 'png',
                    captureBeyondViewport: false
                });
                fs.writeFileSync(
                    path.join(output, name + '.png'),
                    Buffer.from(screen.data, 'base64')
                );
            }
            const measurements = await evaluate(`(()=>{
                const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
                const controls=Array.from(document.querySelectorAll('button,input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea')).filter(visible);
                const main=document.querySelector('main'),nav=document.querySelector('.nav'),bar=document.querySelector('.preview-toolbar');
                const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
                const layout=Array.from(document.querySelectorAll('body *')).filter(visible).map(e=>{const s=getComputedStyle(e);return {tag:e.tagName,id:e.id,className:e.getAttribute('class')||'',rect:rect(e),color:s.color,background:s.backgroundColor,font:s.font,padding:s.padding,margin:s.margin,display:s.display};});
                return {layout,overflow:document.documentElement.scrollWidth>innerWidth,main:rect(main),nav:rect(nav),bar:rect(bar),smallControls:controls.filter(e=>e.getBoundingClientRect().height<40).map(e=>({text:e.textContent?.trim().slice(0,50)||e.name||e.id,height:e.getBoundingClientRect().height})),alerts:Array.from(document.querySelectorAll('[role=alert]')).map(e=>e.textContent.trim()).filter(Boolean),brokenImages:Array.from(document.images).filter(e=>e.complete&&!e.naturalWidth).map(e=>e.alt),heading:document.querySelector('h1')?.textContent,route:window.CampusRoute};
            })()`);
            report.push({ route: target, width, ...measurements });
            if (width === 390 && measurements.overflow) console.log('OVERFLOW ' + route);
            if (phase === 'after' && width < 800) {
                const menu = await evaluate(
                    'document.getElementById("menu-toggle")?.id || document.getElementById("menu-button")?.id'
                );
                if (menu) {
                    await evaluate('document.getElementById(' + JSON.stringify(menu) + ').click()');
                    assert.equal(
                        await evaluate(
                            'document.getElementById(' +
                                JSON.stringify(menu) +
                                ').getAttribute("aria-expanded")'
                        ),
                        'true'
                    );
                    assert.equal(
                        await evaluate('document.documentElement.scrollWidth>innerWidth'),
                        false,
                        'Open menu overflow: ' + route + ' at ' + width
                    );
                    if (
                        width === 390 &&
                        ['tenant/home.html', 'admin/dashboard.html', 'public/index.html'].includes(
                            route
                        )
                    ) {
                        const screen = await send('Page.captureScreenshot', {
                            format: 'png',
                            captureBeyondViewport: false
                        });
                        fs.writeFileSync(
                            path.join(output, name + '-menu.png'),
                            Buffer.from(screen.data, 'base64')
                        );
                    }
                    await evaluate('document.getElementById(' + JSON.stringify(menu) + ').click()');
                }
            }
            if (phase === 'after' && ['tenant/home.html', 'public/index.html'].includes(route)) {
                await evaluate('document.getElementById("assistant-toggle").click()');
                assert.equal(
                    await evaluate('document.getElementById("assistant-panel").hidden'),
                    false
                );
                assert.equal(
                    await evaluate('document.documentElement.scrollWidth>innerWidth'),
                    false,
                    'Assistant overflow at ' + width
                );
                if ([1440, 390].includes(width)) {
                    const screen = await send('Page.captureScreenshot', {
                        format: 'png',
                        captureBeyondViewport: false
                    });
                    fs.writeFileSync(
                        path.join(output, name + '-assistant.png'),
                        Buffer.from(screen.data, 'base64')
                    );
                }
                await evaluate('document.getElementById("assistant-close").click()');
            }
            if (
                phase === 'after' &&
                [1440, 390].includes(width) &&
                (await evaluate('document.documentElement.scrollHeight>innerHeight+200'))
            ) {
                await evaluate(
                    'document.documentElement.style.scrollBehavior="auto";window.scrollTo(0,document.documentElement.scrollHeight)'
                );
                await waitFor(
                    'Math.abs(window.scrollY-(document.documentElement.scrollHeight-innerHeight))<3'
                );
                report[report.length - 1].bottomCaptured = true;
                // Lazy map embeds begin loading when the footer enters the viewport.
                if (await evaluate('!!document.querySelector(".footer-map")')) await delay(2000);
                const screen = await send('Page.captureScreenshot', {
                    format: 'png',
                    captureBeyondViewport: false
                });
                fs.writeFileSync(
                    path.join(output, name + '-bottom.png'),
                    Buffer.from(screen.data, 'base64')
                );
                await evaluate('window.scrollTo(0,0)');
            }
        }
        console.log('Reviewed ' + routes.length + ' page views at ' + width + 'px.');
    }
    await navigate('public/about.html');
    assert.equal(await evaluate('document.querySelector(".social-linkedin").href'),'https://www.linkedin.com/in/abdallah-mdalal/');
    assert.equal(await evaluate('document.querySelector(".social-github").href'),'https://github.com/abd3348');
    assert.equal(await evaluate('document.querySelector(".social-email").href'),'mailto:abdallahmdalal@gmail.com');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".portrait-orbit")).animationPlayState'),'paused');
    await evaluate('document.querySelector(".social-linkedin").focus()');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".portrait-orbit")).animationPlayState'),'running');
    await delay(800);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".team-portrait")).filter'),'grayscale(0)');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(output,'portrait-focus.png'),Buffer.from(shot.data,'base64'));
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".portrait-orbit")).animationName'),'none');
    console.log('LinkedIn, GitHub and email destinations, keyboard portrait interaction and reduced motion passed.');
    const reportPath = path.join(output, 'report.json');
    if ((widthOption || routeOption) && fs.existsSync(reportPath)) {
        const previous = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const key = (page) =>
            page.width +
            '|' +
            page.route.split('?')[0] +
            '|' +
            (new URLSearchParams(page.route.split('?')[1] || '').get('tab') || '');
        const combined = new Map(previous.pages.map((page) => [key(page), page]));
        for (const page of report) combined.set(key(page), page);
        report.splice(0, report.length, ...combined.values());
        errors.push(...previous.errors.filter((error) => !errors.includes(error)));
    }
    fs.writeFileSync(
        reportPath,
        JSON.stringify({ externalAssetsBlocked: true, pages: report, errors }, null, 2)
    );
    console.log('Design audit written to ' + output);
    if (phase === 'after') {
        assert.deepEqual(errors, [], 'Browser runtime errors');
        for (const page of report) {
            assert.equal(
                page.overflow,
                false,
                'Page overflow: ' + page.route + ' at ' + page.width
            );
            assert.deepEqual(page.alerts, [], 'Page alerts: ' + page.route + ' at ' + page.width);
            assert.deepEqual(
                page.brokenImages,
                [],
                'Missing fallback images: ' + page.route + ' at ' + page.width
            );
            assert.deepEqual(
                page.smallControls,
                [],
                'Controls too small: ' + page.route + ' at ' + page.width
            );
        }
        console.log('Responsive layouts, mobile menus, local images and runtime checks passed.');
    }
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
