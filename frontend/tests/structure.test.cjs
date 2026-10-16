const { test } = require('node:test');
const assert = require('node:assert/strict'),
    fs = require('node:fs'),
    path = require('node:path'),
    vm = require('node:vm');
const context = { window: {}, URLSearchParams };
for (const name of ['routes', 'access', 'pages'])
    vm.runInNewContext(fs.readFileSync('js/' + name + '.js', 'utf8'), context);
const { CampusRoutes: routes, CampusAccess: access, CampusPages: pages } = context.window;
test('bootstrap gives formatted pages a base URL for disk navigation', async () => {
    const frame = { addEventListener() {} };
    const rootUrl = require('node:url').pathToFileURL(path.resolve('index.html')).href;
    const bootstrapContext = {
        window: {
            ...context.window,
            CampusConfig: { mode: 'demo' },
            CampusCreateState: () => ({ currentUser: null }),
            CampusLoadSeed: async () => ({ currentUser: null }),
            addEventListener() {}
        },
        document: { getElementById: () => frame },
        location: { href: rootUrl, hash: '#auth%2Fregister.html' },
        URL
    };
    vm.runInNewContext(fs.readFileSync('js/index.js', 'utf8'), bootstrapContext);
    await new Promise((resolve) => setImmediate(resolve));
    const base = frame.srcdoc.match(/<base href="([^"]+)"\s*\/?\s*>/);
    assert.ok(base, 'Each generated document needs a base URL to load local files.');
    assert.equal(base[1], new URL('html/auth/', rootUrl).href);
    const registrationScript = new URL('../../js/auth/register.js', base[1]);
    assert.ok(fs.existsSync(require('node:url').fileURLToPath(registrationScript)));
});

test('all registered role pages and local resource links exist after organization', () => {
    assert.equal(routes.paths.size, 35);
    assert.equal(Object.keys(pages).length, routes.paths.size);
    for (const route of routes.paths) {
        const source = path.resolve('html', route),
            html = fs.readFileSync(source, 'utf8');
        assert.equal(pages[route], html.replace(/\r\n?/g, '\n'));
        for (const [, link] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
            if (/^(?:https?:|mailto:|tel:|data:|#)/.test(link)) continue;
            const target = path.resolve(path.dirname(source), link.split(/[?#]/)[0]);
            assert.ok(fs.existsSync(target), route + ' has a broken link: ' + link);
        }
    }
});
test('each page loads matching CSS and JavaScript entry files', () => {
    for (const route of routes.paths) {
        const html = fs.readFileSync(path.join('html', route), 'utf8');
        for (const extension of ['css', 'js']) {
            const resource = route.replace(/\.html$/, '.' + extension);
            assert.ok(fs.existsSync(path.join(extension, resource)), resource);
            assert.ok(
                html.includes('../../' + extension + '/' + resource),
                route + ' must load ' + resource
            );
        }
    }
});

test('relative CSS imports and local asset URLs resolve after moving styles', () => {
    function checkFolder(folder) {
        for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
            const file = path.join(folder, entry.name);
            if (entry.isDirectory()) {
                checkFolder(file);
                continue;
            }
            if (!file.endsWith('.css')) continue;
            const css = fs.readFileSync(file, 'utf8');
            const references = [
                ...css.matchAll(/@import\s+['"]([^'"]+)['"]/g),
                ...css.matchAll(/url\(\s*['"]?([^\s'"\)]+)['"]?\s*\)/g)
            ];
            for (const [, reference] of references) {
                if (/^(?:https?:|data:|#)/.test(reference)) continue;
                assert.ok(
                    fs.existsSync(path.resolve(folder, reference.split(/[?#]/)[0])),
                    file + ': ' + reference
                );
            }
        }
    }
    checkFolder('css');
});

test('owner and tenant each have their own private pages; legacy routes preserve parameters', () => {
    const tenant = { id: 'tenant-1', role: 'tenant' },
        owner = { id: 'owner-1', role: 'landlord' };
    assert.equal(access.route('landlord/requests.html', tenant), 'tenant/home.html');
    assert.equal(access.route('tenant/messages.html', owner), 'landlord/dashboard.html');
    assert.equal(access.route('landlord/profile.html', null), 'auth/login.html');
    assert.equal(
        access.route('landlord/condition.html?id=rental-1', owner),
        'landlord/condition.html?id=rental-1'
    );
    assert.equal(
        routes.resolve('landlord.html?tab=requests&id=request-1', 'landlord'),
        'landlord/requests.html?id=request-1'
    );
    assert.equal(
        routes.resolve('landlord.html?tab=bookings', 'landlord'),
        'landlord/bookings.html'
    );
    assert.equal(
        routes.resolve('messages.html?id=chat-1', 'landlord'),
        'landlord/messages.html?id=chat-1'
    );
    assert.equal(
        routes.resolve('messages.html?id=chat-1', 'tenant'),
        'tenant/messages.html?id=chat-1'
    );
    assert.equal(
        routes.resolve('../public/property.html?id=124#reviews', 'tenant'),
        'public/property.html?id=124#reviews'
    );
    assert.equal(routes.resolve('profile.html', 'admin'), 'admin/profile.html');
    for (const [route] of routes.menu('landlord')) assert.ok(!route.startsWith('tenant/'));
    for (const [route] of routes.menu('tenant')) assert.ok(!route.startsWith('landlord/'));
});
