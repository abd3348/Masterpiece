const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const examples = JSON.parse(fs.readFileSync('data/api-examples.json', 'utf8'));
const seed = JSON.parse(fs.readFileSync('data/campus-seed.json', 'utf8'));
function setup(handler, config = {}) {
    const calls = [];
    let snapshot = structuredClone(examples.bootstrap);
    const win = {
        CampusConfig: {
            mode: 'api',
            apiBaseUrl: 'https://api.example.test/api',
            credentials: 'include',
            timeoutMs: 1000,
            csrfHeader: 'X-CSRF-TOKEN',
            ...config
        },
        FormData
    };
    win.parent = win;
    const context = {
        window: win,
        location: { href: 'https://frontend.example.test/index.html', protocol: 'https:' },
        crypto: { randomUUID },
        URL,
        URLSearchParams,
        FormData,
        AbortController,
        setTimeout,
        clearTimeout,
        Date
    };
    context.fetch = async (url, options) => {
        calls.push({ url, options });
        if (url.endsWith('/bootstrap'))
            return new Response(JSON.stringify(snapshot), { status: 200 });
        return handler
            ? handler(url, options, {
                  get snapshot() {
                      return snapshot;
                  },
                  set snapshot(value) {
                      snapshot = value;
                  }
              })
            : new Response(null, { status: 204 });
    };
    vm.createContext(context);
    for (const name of ['validation', 'seed', 'data', 'http', 'routes', 'access'])
        vm.runInContext(fs.readFileSync('js/' + name + '.js', 'utf8'), context);
    win.CampusState = win.CampusCreateState({ users: [], properties: [], roommates: [] });
    win.CampusTransport.applySnapshot(win.CampusState, snapshot);
    vm.runInContext(fs.readFileSync('js/api.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/remote.js', 'utf8'), context);
    return {
        api: win.CampusAPI,
        transport: win.CampusTransport,
        calls,
        context,
        state: win.CampusState
    };
}
test('API JSON writes use credentials, CSRF, typed fields and a refreshed server snapshot', async () => {
    const { api, calls, state } = setup((url, options, server) => {
        assert.equal(url, 'https://api.example.test/api/rental-requests');
        const body = JSON.parse(options.body);
        assert.deepEqual(Object.keys(body).sort(), [
            'duration',
            'message',
            'propertyId',
            'roommate',
            'roommateId',
            'startDate'
        ]);
        server.snapshot.requests[0].status = 'approved';
        return new Response(JSON.stringify(server.snapshot.requests[0]), { status: 201 });
    });
    const reference = state.requests[0];
    const result = await api.createRequest({
        ...examples.createRequest,
        tenantId: 'forged-user',
        total: 1,
        status: 'active'
    });
    assert.equal(result.status, 'approved');
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    assert.equal(calls[0].options.headers['X-CSRF-TOKEN'], 'example-csrf-token');
    assert.equal(calls[0].options.credentials, 'include');
    assert.ok(calls[1].url.endsWith('/bootstrap'));
    assert.equal(state.requests[0], reference);
    assert.equal(reference.status, 'approved');
    assert.equal(api.isDemo, false);
});
test('direct rental confirmation never opens checkout; only owners use listing fee checkout', async () => {
    const { api, calls, state } = setup((url) => new Response(JSON.stringify(
        url.endsWith('/confirm-arrangement') ? examples.arrangementResponse : examples.checkoutResponse
    ), { status: 200 }));
    const result = await api.confirmArrangement(state.requests[0].id);
    assert.equal(result.rentalId, examples.arrangementResponse.rentalId);
    assert.ok(calls[0].url.endsWith('/confirm-arrangement'));
    assert.equal(calls[0].options.body, undefined);
    const tenant = state.currentUser;
    assert.throws(() => api.payListingFee(124), /account role/);
    state.currentUser = structuredClone(seed.users.find((u) => u.role === 'landlord'));
    await api.payListingFee(124);
    assert.ok(calls.find((c) => c.url.endsWith('/properties/124/listing-fee/checkout')));
    state.currentUser = tenant;
});

test('profile writes exclude role, id, password and computed fields', async () => {
    const { api, calls } = setup(
        () => new Response(JSON.stringify(examples.currentUser), { status: 200 })
    );
    await api.updateProfile({
        ...examples.currentUser,
        role: 'admin',
        password: 'do-not-send',
        total: 0
    });
    const body = JSON.parse(calls[0].options.body);
    for (const name of ['role', 'password', 'id', 'total', 'active'])
        assert.equal(Object.hasOwn(body, name), false);
});
test('ASP.NET validation ProblemDetails is displayed without altering cached data', async () => {
    const { api, calls, state } = setup(
        () => new Response(JSON.stringify(examples.validationError), { status: 400 })
    );
    const before = state.preferences;
    await assert.rejects(
        api.savePreferences(examples.preferences),
        (error) =>
            error.status === 400 &&
            error.message.includes('email: Enter a valid email') &&
            error.message.includes('phone:')
    );
    assert.equal(state.preferences, before);
    assert.equal(calls.length, 1);
});
test('HTTP handles 204, invalid JSON, unauthorized responses and request timeout', async () => {
    const empty = setup();
    assert.equal(await empty.transport.request('/empty'), null);
    const invalid = setup(() => new Response('<html>not JSON</html>', { status: 200 }));
    await assert.rejects(invalid.api.getProperties(), /invalid JSON/);
    const unauthorized = setup(
        () =>
            new Response(JSON.stringify({ title: 'Please sign in', status: 401 }), { status: 401 })
    );
    await assert.rejects(
        unauthorized.api.getRequests(),
        (error) => error.status === 401 && error.message === 'Please sign in'
    );
    const timed = setup(
        (url, options) =>
            new Promise((resolve, reject) =>
                options.signal.addEventListener('abort', () =>
                    reject(new DOMException('aborted', 'AbortError'))
                )
            ),
        { timeoutMs: 5 }
    );
    await assert.rejects(timed.api.getProperties(), /timed out/);
});
test('media files go through FormData before the JSON listing; blob URLs never reach the API', async () => {
    const { api, calls, state } = setup((url, options, server) => {
        if (url.endsWith('/media')) {
            assert.ok(options.body instanceof FormData);
            assert.equal(options.body.get('file').name, 'room.png');
            assert.equal(options.headers['Content-Type'], undefined);
            return new Response(JSON.stringify({ ...examples.mediaResponse, name: 'room.png' }), {
                status: 201
            });
        }
        const body = JSON.parse(options.body);
        assert.equal(typeof body.price, 'number');
        assert.equal(typeof body.beds, 'number');
        assert.equal(body.photos[0].id, 'media-example');
        assert.equal(options.body.includes('blob:'), false);
        assert.equal(Object.hasOwn(body, 'ownerId'), false);
        assert.equal(Object.hasOwn(body.photos[0], 'file'), false);
        return new Response(JSON.stringify(seed.properties[0]), { status: 201 });
    });
    state.currentUser = structuredClone(seed.users.find((u) => u.role === 'landlord'));
    await api.addProperty({
        ...seed.properties[0],
        price: '190',
        beds: '2',
        ownerId: 'forged-owner',
        photos: [
            {
                name: 'room.png',
                url: 'blob:local-only',
                file: new File(['image'], 'room.png', { type: 'image/png' })
            }
        ]
    });
    assert.ok(calls[0].url.endsWith('/media'));
    assert.ok(calls[1].url.endsWith('/properties'));
});
test('same-origin ASP.NET /api configuration resolves uploaded media URLs', async () => {
    const { api, calls, state } = setup(
        (url, options) => {
            if (url.endsWith('/media'))
                return new Response(
                    JSON.stringify({
                        id: 'media-relative',
                        url: '/uploads/room.png',
                        name: 'room.png'
                    }),
                    { status: 201 }
                );
            const body = JSON.parse(options.body);
            assert.equal(body.photos[0].url, 'https://frontend.example.test/uploads/room.png');
            return new Response(JSON.stringify(seed.properties[0]), { status: 201 });
        },
        { apiBaseUrl: '/api' }
    );
    state.currentUser = structuredClone(seed.users.find((u) => u.role === 'landlord'));
    await api.addProperty({
        ...seed.properties[0],
        photos: [{ name: 'room.png', file: new File(['image'], 'room.png', { type: 'image/png' }) }]
    });
    assert.equal(calls[0].url, 'https://frontend.example.test/api/media');
});
test('refuses browser-only media and simulated replies; role switching and demo approval are absent', async () => {
    const { api, calls } = setup();
    await assert.rejects(
        api.saveCondition('rental-1', 'initial', {
            items: [],
            notes: '',
            video: { id: 'media-1', name: 'video.mp4', url: 'blob:not-a-server-url' }
        }),
        /blob URLs/
    );
    assert.equal(calls.length, 0);
    assert.equal(api.previewRole, undefined);
    assert.equal(api.demoApprove, undefined);
    assert.throws(() => api.sampleReply('chat-1'), /other account/);
});
test('bootstrap keeps role-scoped arrays, rejects incompatible contracts and strips passwords', () => {
    const { state, transport } = setup();
    const snapshot = structuredClone(examples.bootstrap);
    snapshot.currentUser.password = 'should-not-be-cached';
    snapshot.users = [{ ...examples.currentUser, password: 'hidden' }];
    transport.applySnapshot(state, snapshot);
    assert.equal(state.currentUser.password, undefined);
    assert.equal(state.users[0].password, undefined);
    assert.throws(() => transport.applySnapshot(state, { schemaVersion: 2 }), /schemaVersion/);
    assert.throws(
        () =>
            transport.applySnapshot(state, {
                schemaVersion: 1,
                currentUser: null,
                preferences: null
            }),
        /missing users/
    );
});
test('generated offline seed matches the JSON source, without plaintext passwords in JSON', () => {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync('js/seed.js', 'utf8'), context);
    assert.deepEqual(JSON.parse(JSON.stringify(context.window.CampusSeed)), seed);
    for (const user of seed.users) assert.equal(Object.hasOwn(user, 'password'), false);
});
test('JSON examples match the published DTOs and all local OpenAPI references resolve', () => {
    const spec = JSON.parse(fs.readFileSync('docs/openapi.json', 'utf8'));
    function validate(value, schema, path = 'value') {
        if (schema.$ref)
            return validate(value, spec.components.schemas[schema.$ref.split('/').pop()], path);
        if (value === null) {
            assert.equal(schema.nullable, true, path + ' should allow null');
            return;
        }
        if (schema.allOf) {
            for (const part of schema.allOf) validate(value, part, path);
            return;
        }
        if (schema.type === 'object') {
            assert.equal(typeof value, 'object', path);
            assert.equal(Array.isArray(value), false, path);
            for (const key of schema.required || [])
                assert.ok(Object.hasOwn(value, key), path + '.' + key + ' is required');
            for (const [key, item] of Object.entries(value)) {
                if (schema.properties?.[key])
                    validate(item, schema.properties[key], path + '.' + key);
                else if (schema.additionalProperties === false)
                    assert.fail(path + '.' + key + ' is not in the DTO');
            }
        }
        if (schema.type === 'array') {
            assert.ok(Array.isArray(value), path);
            value.forEach((item, i) => validate(item, schema.items, path + '[' + i + ']'));
        }
        if (schema.type === 'string') assert.equal(typeof value, 'string', path);
        if (schema.type === 'number') assert.equal(typeof value, 'number', path);
        if (schema.type === 'integer') assert.ok(Number.isInteger(value), path);
        if (schema.type === 'boolean') assert.equal(typeof value, 'boolean', path);
        if (schema.enum) assert.ok(schema.enum.includes(value), path + ' should match its enum');
    }
    for (const [name, schema] of Object.entries({
        register: 'Register',
        login: 'Login',
        currentUser: 'User',
        preferences: 'Preferences',
        createRequest: 'RequestInput',
        createRequestWithRoommate: 'RequestInput',
        requestResponse: 'RentalRequest',
        bootstrap: 'Bootstrap',
        mediaResponse: 'Media',
        conditionInput: 'ConditionInput',
        checkoutResponse: 'Checkout',
        arrangementResponse: 'ArrangementConfirmation',
        validationError: 'ProblemDetails'
    }))
        validate(examples[name], spec.components.schemas[schema], name);
    function refs(value) {
        if (!value || typeof value !== 'object') return;
        if (value.$ref) assert.ok(spec.components.schemas[value.$ref.split('/').pop()], value.$ref);
        Object.values(value).forEach(refs);
    }
    refs(spec);
    assert.equal(
        spec.paths['/media'].post.requestBody.content['multipart/form-data'].schema.properties.file
            .format,
        'binary'
    );
});
