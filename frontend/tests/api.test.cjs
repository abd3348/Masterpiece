const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
function setup(existing, signedIn = true) {
    const context = { window: {}, crypto: { randomUUID }, URL, URLSearchParams, Date };
    vm.createContext(context);
    for (const name of ['validation', 'seed', 'data', 'routes', 'access'])
        vm.runInContext(fs.readFileSync('js/' + name + '.js', 'utf8'), context);
    context.window.CampusState = existing || context.window.CampusCreateState();
    vm.runInContext(fs.readFileSync('js/api.js', 'utf8'), context);
    if (signedIn && !existing)
        context.window.CampusAPI.login({ email: 'tenant@campus.test', password: 'Campus123' });
    return {
        access: context.window.CampusAccess,
        api: context.window.CampusAPI,
        rules: context.window.CampusValidation,
        state: context.window.CampusState,
        today: context.window.CampusToday()
    };
}
async function approve(api, key) {
    const tenant = { email: api.user().email, password: api.user().password };
    api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    await api.reviewRequest(key, true);
    api.logout();
    await api.login(tenant);
}
async function activate(api, today, propertyId = 124, duration = 6) {
    const r = await api.createRequest({
        propertyId,
        startDate: today,
        duration,
        message: 'I am interested in renting this property.',
        roommate: false
    });
    await approve(api, r.id);
    await api.signAgreement(r.id);
    await api.saveInspection(r.id, {
        items: [{ name: 'Walls', condition: 'Good' }],
        notes: 'Existing scuff.'
    });
    await api.confirmArrangement(r.id);
    return r;
}
test('Regex handles Arabic and English names, Jordan phones, email and calendar dates', () => {
    const { rules } = setup();
    for (const name of ['عبدالله أحمد', 'Sara', 'Jean-Luc', "O'Connor"])
        assert.equal(rules.valid('name', name), true, name);
    for (const name of ['123', 'Sara<script>', ' ', 'A'])
        assert.equal(rules.valid('name', name), false, name);
    for (const number of ['0791234567', '+962 78 123 4567', '00962771234567'])
        assert.equal(rules.valid('phone', number), true, number);
    for (const number of ['0791234', '0801234567', '+15551234567'])
        assert.equal(rules.valid('phone', number), false, number);
    for (const email of ['name@example.com', 'first.last+tag@uni.edu.jo'])
        assert.equal(rules.valid('email', email), true);
    for (const email of [
        'a..b@example.com',
        '.a@example.com',
        'x@',
        'x@example',
        '<x>@example.com'
    ])
        assert.equal(rules.valid('email', email), false, email);
    assert.equal(rules.valid('date', '2028-02-29'), true);
    assert.equal(rules.valid('date', '2027-02-29'), false);
    assert.equal(rules.valid('date', '2026-04-31'), false);
    assert.equal(rules.valid('password', 'TestingPass1'), true);
    for (const p of ['testingpass1', 'TestingPass', 'Test1', 'Testing Pass1'])
        assert.equal(rules.valid('password', p), false);
    assert.equal(rules.valid('text', '<script>alert(1)</script>'), false);
    assert.equal(rules.valid('money', '190.50'), true);
    assert.equal(rules.valid('money', '1e3'), false);
});
test('full rental flow enforces stages, retains reports in shared memory and resets on refresh', async () => {
    const { api, state, today } = setup();
    const data = {
        propertyId: 124,
        startDate: today,
        duration: 6,
        message: 'I would like to rent this home.'
    };
    const r = await api.createRequest(data);
    assert.equal((await api.createRequest(data)).id, r.id);
    await assert.rejects(api.confirmArrangement(r.id), /inspection/);
    await assert.rejects(api.signAgreement(r.id), /approval/);
    await approve(api, r.id);
    await api.signAgreement(r.id);
    await api.saveInspection(r.id, {
        items: [{ name: 'Walls', condition: 'Good' }],
        notes: 'Small scuff'
    });
    await api.confirmArrangement(r.id);
    await assert.rejects(api.confirmArrangement(r.id), /inspection/);
    await api.completeMoveIn(r.id);
    const rentals = await setup(state).api.getRentals();
    assert.equal(rentals[0].moveInComplete, true);
    assert.equal(rentals[0].payments.length, 0);
    assert.equal(rentals[0].paymentMethod, 'direct-to-landlord');
    assert.equal(rentals[0].request.inspection.notes, 'Small scuff');
    assert.equal((await setup().api.getRentals()).length, 0);
});
test('register/login, duplicate emails, Regex enforcement, suspension and returning to the same account', async () => {
    const { api } = setup();
    const account = await api.register({
        role: 'tenant',
        firstName: 'Sara',
        lastName: 'Test',
        phone: '0791234567',
        email: 'sara@example.com',
        password: 'TestingPass1',
        city: 'Amman'
    });
    await api.savePreferences({ minBudget: 50, maxBudget: 150, areas: ['Sweileh'] });
    api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    api.logout();
    await api.login({ email: account.email, password: 'TestingPass1' });
    assert.equal(api.user().id, account.id);
    assert.equal((await api.getPreferences()).maxBudget, 150);
    await assert.rejects(
        api.register({ role: 'tenant', firstName: 'Bad1', lastName: 'Test' }),
        /letters/
    );
    await assert.rejects(
        api.register({ ...account, email: 'SARA@example.com' }),
        /already registered/
    );
    await assert.rejects(api.login({ email: account.email, password: 'wrong' }), /incorrect/);
    assert.equal(
        (await api.login({ email: account.email, password: 'TestingPass1' })).id,
        account.id
    );
    api.logout();
    await api.login({ email: 'admin@campus.test', password: 'Campus123' });
    api.toggleUser(account.id);
    await assert.rejects(
        api.login({ email: account.email, password: 'TestingPass1' }),
        /suspended/
    );
    api.toggleUser(account.id);
});
test('daily rent covers all nights and excludes overlapping confirmed bookings', async () => {
    const { api, today } = setup();
    const r = await activate(api, today, 92, 3);
    assert.equal(r.total, 60);
    assert.equal(r.endDate, api.endDate(today, 3, 'Daily'));
    const p = await api.getProperty(92);
    assert.equal(api.available(p, r.startDate, r.endDate), false);
    assert.equal(api.available(p, r.endDate, api.endDate(r.endDate, 2, 'Daily')), true);
    await assert.rejects(
        api.createRequest({
            propertyId: 92,
            startDate: today,
            duration: 1,
            message: 'Another request'
        }),
        /not available/
    );
    assert.equal(api.endDate('2027-01-31', 1, 'Monthly'), '2027-02-28');
});
test('move-in/out comparison changes only the recorded checklist and requires both reports', async () => {
    const { api, today, state } = setup();
    const r = await activate(api, today);
    assert.throws(() => api.compare(r.id), /both/);
    const initial = {
        video: { name: 'initial.mp4', url: 'blob:initial' },
        items: [
            { name: 'Walls', condition: 'Good' },
            { name: 'Furniture', condition: 'Minor wear' }
        ],
        notes: 'Existing wear'
    };
    api.saveCondition(r.id, 'initial', initial);
    api.saveCondition(r.id, 'final', {
        ...initial,
        video: { name: 'final.mp4', url: 'blob:final' },
        items: [
            { name: 'Walls', condition: 'Good' },
            { name: 'Furniture', condition: 'Needs repair' }
        ]
    });
    assert.equal(api.compare(r.id).filter((i) => i.changed).length, 1);
    api.closeRental(r.id);
    assert.equal(state.rentals[0].status, 'closed');
    assert.equal(api.available(r.property, r.startDate, r.endDate), true);
});
test('landlord listing risk, admin review and reports share the same state', async () => {
    const { api, state, today } = setup();
    api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    const p = api.addProperty({
        title: 'Suspicious apartment',
        description: 'Pay before viewing. Urgent deposit.',
        price: '20',
        area: 'Jubeiha',
        city: 'Amman',
        type: 'Apartment',
        period: 'Monthly',
        beds: 2,
        baths: 1,
        size: 85,
        furnished: 'Furnished',
        availableFrom: today,
        availableTo: '2030-12-31',
        photos: [{ name: 'room.png', url: 'blob:room' }],
        amenities: ['Wi-Fi']
    });
    assert.ok(p.risk >= 60);
    assert.equal(p.status, 'awaiting-fee');
    assert.equal(p.listingFee.amount, 20);
    await assert.rejects(api.setListingStatus(p.id, 'published'), /listing fee/);
    api.editProperty(p.id, { ...p, title: 'Updated suspicious apartment', listingFee: { amount: 20, currency: 'JOD', status: 'paid' } });
    assert.equal(p.status, 'awaiting-fee');
    assert.equal(p.listingFee.status, 'unpaid');
    api.logout();
    await api.login({ email: 'admin@campus.test', password: 'Campus123' });
    assert.throws(() => api.moderateProperty(p.id, true), /listing fee/);
    api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    api.payListingFee(p.id);
    assert.equal(p.status, 'pending');
    assert.throws(() => api.payListingFee(p.id), /already paid/);
    api.reportProperty(p.id, {
        reason: 'Suspicious pricing',
        notes: 'This price needs a closer look.'
    });
    api.logout();
    await api.login({ email: 'admin@campus.test', password: 'Campus123' });
    api.moderateProperty(p.id, true);
    assert.equal(p.status, 'published');
    assert.equal(state.reports.length, 1);
    api.moderateProperty(p.id, false);
    assert.equal(p.status, 'deleted');
});
test('meeting invitations enforce recipient consent, schedules, membership and cancellation', async () => {
    const { api, state } = setup();
    const tenantId = api.user().id;
    const soon = new Date(Date.now() + 5 * 60000).toISOString();
    const later = new Date(Date.now() + 3 * 3600000).toISOString();
    await assert.rejects(api.createMeeting({ kind: 'roommate', targetId: state.roommates[0].id, title: 'Meet a roommate', startsAt: '2000-01-01T10:00:00Z', duration: 30 }), /future/);
    const m = await api.createMeeting({ kind: 'property', targetId: 124, title: 'View the apartment', startsAt: soon, duration: 30 });
    await assert.rejects(api.getMeetingRoom(m.id), /accepted/);
    await assert.rejects(api.reviewMeeting(m.id, true), /invited person/);
    await assert.rejects(api.simulateMeetingResponse(m.id, true), /sample roommate/);
    api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    await api.reviewMeeting(m.id, true);
    const room = await api.getMeetingRoom(m.id);
    assert.match(room.roomName, /^CampusMate-/);
    assert.ok(room.displayName.includes(api.user().firstName));
    await assert.rejects(api.reviewMeeting(m.id, false), /already/);
    api.logout();
    await api.login({ email: 'tenant@campus.test', password: 'Campus123' });
    const roommate = await api.createMeeting({ kind: 'roommate', targetId: state.roommates[0].id, title: 'Roommate introduction', startsAt: soon, duration: 30 });
    await assert.rejects(api.simulateMeetingResponse(roommate.id, true), /overlaps/);
    await api.cancelMeeting(m.id);
    await assert.rejects(api.getMeetingRoom(m.id), /accepted/);
    await api.simulateMeetingResponse(roommate.id, true);
    assert.equal(api.user().id, tenantId);
    assert.equal(roommate.simulatedResponse, true);
    const future = await api.createMeeting({ kind: 'roommate', targetId: state.roommates[1].id, title: 'Future roommate introduction', startsAt: later, duration: 15 });
    await api.simulateMeetingResponse(future.id, true);
    await assert.rejects(api.getMeetingRoom(future.id), /10 minutes/);
    api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    assert.equal((await api.getMeetings()).length, 1);
    await assert.rejects(api.cancelMeeting(roommate.id), /another account/);
    await assert.rejects(api.getMeetingRoom(roommate.id), /another account/);
});

test('matching changes when preferences change; accepted roommate contact enables a conversation', async () => {
    const { api, state } = setup();
    const person = state.roommates[0],
        p = await api.getProperty(124),
        before = api.propertyMatch(p).score;
    await api.savePreferences({
        minBudget: 1,
        maxBudget: 30,
        areas: ['Aqaba'],
        sleep: 'Night owl',
        schedule: 'Evenings',
        cleanliness: 1,
        noise: 5,
        smoking: 'Outside only'
    });
    assert.ok(api.propertyMatch(p).score < before);
    assert.ok(api.roommateMatch(person).score < 80);
    const contact = api.contact(person.id);
    assert.equal(contact.status, 'pending');
    const chat = api.acceptContact(contact.id);
    api.sendMessage(chat.id, 'Hello, shall we discuss the room?');
    assert.equal(chat.messages.length, 1);
    api.sampleReply(chat.id);
    assert.equal(chat.messages.length, 2);
    assert.equal(api.contact(person.id).id, contact.id);
});
test('file checks reject renamed files, unsupported types and excessive sizes', () => {
    const { rules } = setup();
    assert.equal(rules.media({ name: 'room.PNG', type: 'image/png', size: 100 }, 'image'), true);
    assert.throws(
        () => rules.media({ name: 'room.png', type: 'text/plain', size: 100 }, 'image'),
        /supported/
    );
    assert.throws(
        () =>
            rules.media(
                { name: 'walkthrough.mp4', type: 'video/mp4', size: 101 * 1024 * 1024 },
                'video'
            ),
        /100 MB/
    );
});
test('three seeded roles require sign-in; role changes and owner/admin actions cannot be invoked by the tenant', async () => {
    const { api, state, access, today } = setup(undefined, false);
    assert.equal(state.users.length, 3);
    assert.deepEqual(Array.from(state.users, (u) => u.role).sort(), [
        'admin',
        'landlord',
        'tenant'
    ]);
    assert.equal(api.user().role, 'guest');
    assert.equal(api.previewRole, undefined);
    assert.equal(api.demoApprove, undefined);
    assert.equal(access.route('admin.html', null), 'auth/login.html');
    assert.equal(access.route('properties.html', null), 'public/properties.html');
    await assert.rejects(api.createRequest({}), /Sign in/);
    await api.login({ email: 'tenant@campus.test', password: 'Campus123' });
    assert.equal(access.route('admin.html', api.user()), 'tenant/home.html');
    assert.equal(access.route('landlord.html', api.user()), 'tenant/home.html');
    const r = await api.createRequest({
        propertyId: 124,
        startDate: today,
        duration: 6,
        roommate: false,
        message: 'I want to rent this home.'
    });
    await assert.rejects(api.reviewRequest(r.id, true), /account role/);
    assert.throws(() => api.moderateProperty(124, true), /account role/);
    await api.updateProfile({ ...api.user(), role: 'admin', id: 'admin-1' });
    assert.equal(api.user().role, 'tenant');
    assert.equal(api.user().id, 'tenant-1');
    api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    await api.reviewRequest(r.id, true);
    assert.equal(r.status, 'approved');
    assert.equal(access.route('request.html?id=124', api.user()), 'landlord/dashboard.html');
});
test('tenant explicitly chooses a roommate or rents alone; request snapshots preserve that choice', async () => {
    const { api, state, today } = setup();
    const person = state.roommates[1];
    assert.equal(api.selectedRoommate(), null);
    api.chooseRoommate(person.id);
    assert.equal(api.selectedRoommate().id, person.id);
    const draft = {
        propertyId: 124,
        startDate: today,
        duration: 6,
        message: 'Sharing a home with my chosen roommate.',
        roommate: true
    };
    await assert.rejects(api.createRequest(draft), /Choose the roommate/);
    await assert.rejects(
        api.createRequest({ ...draft, roommateId: 'unknown' }),
        /Choose the roommate/
    );
    assert.equal(state.requests.length, 0);
    const shared = await api.createRequest({ ...draft, roommateId: person.id });
    assert.equal(shared.roommateId, person.id);
    assert.equal(shared.roommateName, person.name);
    api.chooseRoommate(state.roommates[0].id);
    assert.equal(
        shared.roommateId,
        person.id,
        'Editing the selection cannot change a submitted request'
    );
    const alone = await api.createRequest({
        ...draft,
        propertyId: 231,
        roommate: false,
        roommateId: person.id
    });
    assert.equal(alone.roommateId, null);
    assert.equal(alone.roommateName, null);
    api.logout();
    assert.equal(api.selectedRoommate(), null);
    await api.login({ email: 'tenant@campus.test', password: 'Campus123' });
    assert.equal(api.selectedRoommate().id, state.roommates[0].id);
});
