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

test('negotiated rent needs owner confirmation, preserves asking rent and locks at agreement acceptance', async () => {
    const { api, today } = setup();
    const r = await api.createRequest({ propertyId: 124, startDate: today, duration: 6, message: 'Interested in this apartment.', roommate: false });
    const asking = r.property.price;
    await approve(api, r.id);
    await assert.rejects(api.proposeRent(r.id, -1), /valid rent/);
    await api.proposeRent(r.id, 175.5);
    await assert.rejects(api.signAgreement(r.id), /review the proposed rent/);
    await assert.rejects(api.proposeRent(r.id, 160), /still reviewing/);
    await assert.rejects(api.reviewRent(r.id, true), /account role/);
    await api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    assert.equal((await api.getNegotiations()).some((item) => item.id === r.id), true);
    await api.reviewRent(r.id, true);
    assert.equal(r.agreedPrice, 175.5);
    assert.equal(r.property.price, asking);
    assert.equal(r.total, 175.5 + r.deposit);
    await api.logout();
    await api.login({ email: 'tenant@campus.test', password: 'Campus123' });
    await api.signAgreement(r.id);
    await assert.rejects(api.proposeRent(r.id, 160), /before agreement/);
});

test('declining a proposed rent retains the original quote and tenant ownership is enforced', async () => {
    const { api, state, today } = setup();
    const r = await api.createRequest({ propertyId: 124, startDate: today, duration: 2, message: 'Interested in this apartment.', roommate: false });
    const total = r.total;
    await api.proposeRent(r.id, 150);
    const tenantId = r.tenantId;
    r.tenantId = 'another-tenant';
    await assert.rejects(api.proposeRent(r.id, 160), /another tenant/);
    assert.equal((await api.getNegotiations()).length, 0);
    r.tenantId = tenantId;
    await approve(api, r.id);
    await api.logout();
    await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    const ownerId = r.property.ownerId;
    r.property.ownerId = 'another-owner';
    await assert.rejects(api.reviewRent(r.id, true), /Only this property owner/);
    r.property.ownerId = ownerId;
    await api.reviewRent(r.id, false);
    assert.equal(r.total, total);
    assert.equal(r.agreedPrice, undefined);
    assert.equal(state.requests[0].negotiation.status, 'declined');
});

test('video report rejects missing video and honestly identifies demo results', async () => {
    const { api, state } = setup();
    await assert.rejects(api.analyzePropertyVideo(124), /walkthrough video/);
    state.properties.find((p) => p.id === 124).video = { name: 'walkthrough.mp4', url: 'blob:demo' };
    const report = await api.analyzePropertyVideo(124);
    assert.equal(report.demo, true);
    assert.match(report.summary, /has not been analyzed/);
});

test('partial offer updates validate actual date duration and preserve accepted request prices and dates', async () => {
    const { api, state, today } = setup();
    const r = await activate(api, today);
    const end = new Date(today + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + 7);
    const listing = await api.createSubletListing({ rentalId: r.id, roomNumber: 1, occupancy: 'private', startDate: today, endDate: end.toISOString().slice(0, 10), price: 10, notes: 'Room details' });
    assert.throws(() => api.editSubletListing(listing.id, { price: 11, startDate: listing.startDate, endDate: listing.endDate, duration: 6 }), /Duration must match/);
    state.subletRequests.push({ listingId: listing.id, status: 'approved' });
    assert.throws(() => api.editSubletListing(listing.id, { price: 11, duration: 7 }), /locked/);
    api.editSubletListing(listing.id, { price: 10, duration: 7, notes: 'Updated notes' });
    assert.equal(listing.notes, 'Updated notes');
});
test('moderation requires screening and a reason, removes the listing and notifies only its owner', async () => {
    const { api, state } = setup();
    await assert.rejects(api.reviewListingAnalysis(124), /account role/);
    await api.logout(); await api.login({ email: 'admin@campus.test', password: 'Campus123' });
    assert.throws(() => api.moderateProperty(124, false, 'Suspected fraud', 'Requests payment before viewing.'), /Analyze and review/);
    const report = await api.reviewListingAnalysis(124);
    assert.equal(report.demo, true);
    assert.throws(() => api.moderateProperty(124, false), /removal reason/);
    assert.throws(() => api.moderateProperty(124, false, 'Suspected fraud', 'short'), /10–1000/);
    api.moderateProperty(124, false, 'Suspected fraud', 'Requests payment before viewing; details need correction.');
    assert.equal((await api.getProperties()).some((p) => p.id === 124), false);
    assert.equal(state.properties.find((p) => p.id === 124).moderation.decision, 'removed');
    const notification = state.notifications[0];
    assert.equal((await api.getNotifications()).length, 0);
    await assert.rejects(api.markNotificationRead(notification.id), /not found/);
    await api.logout(); await api.login({ email: 'owner@campus.test', password: 'Campus123' });
    assert.equal((await api.getNotifications()).filter((n) => n.propertyId === 124).length, 1);
    assert.match(notification.text, /Suspected fraud/);
    await api.markNotificationRead(notification.id);
    assert.equal(notification.read, true);
});

test('solving a report keeps its listing, while deleting the listing solves its remaining open reports', async () => {
    const { api, state } = setup();
    const first = api.reportProperty(124, { reason: 'Incorrect details', notes: 'A detail needs checking.' });
    const second = api.reportProperty(124, { reason: 'Misleading photos', notes: 'Photos do not match the description.' });
    const unrelated = api.reportProperty(231, { reason: 'Other concern', notes: 'An unrelated issue to inspect.' });
    await api.logout(); await api.login({ email: 'admin@campus.test', password: 'Campus123' });
    await api.resolveReport(first.id);
    assert.equal(first.status, 'resolved');
    assert.equal(state.properties.find((p) => p.id === 124).status, 'published');
    await api.reviewListingAnalysis(124);
    api.moderateProperty(124, false, 'Misleading information', 'The property photos do not match the advertised details.');
    assert.equal(second.status, 'resolved');
    assert.equal(second.resolution, 'listing-removed');
    assert.equal(first.resolution, 'solved');
    assert.equal(unrelated.status, 'open');
});

test('public partial offers expose each published room and specific details, excluding expired or removed homes', async () => {
    const { api, state, today } = setup();
    const r = await activate(api, today);
    for (const room of [1, 2]) {
        const offer = api.createSubletListing({ rentalId: r.id, roomNumber: room, occupancy: room === 1 ? 'private' : 'shared', duration: 7, price: room === 1 ? 12 : 7 });
        api.paySubletListingFee(offer.id);
    }
    const publicOffers = await api.getPublicSubletListings();
    assert.equal(publicOffers.length, 2);
    assert.equal(publicOffers[0].property.ownerId, undefined);
    const shared = publicOffers.find((s) => s.occupancy === 'shared');
    const detail = await api.getSubletOffer(shared.id);
    assert.equal(detail.partialOffer.id, shared.id);
    assert.equal(detail.price, 7);
    state.subletListings[0].endDate = '2000-01-01';
    assert.equal((await api.getPublicSubletListings()).length, 1);
    state.properties.find((p) => p.id === 124).status = 'deleted';
    assert.equal((await api.getPublicSubletListings()).length, 0);
    await assert.rejects(api.getSubletOffer(shared.id), /no longer available/);
});

test('the review example and owner notification are always seeded without an AI service', async () => {
    const { api, state } = setup();
    const p = state.properties.find((p) => p.id === 9901);
    assert.equal(p.status, 'pending');
    assert.equal(p.moderationAnalysis.source, 'prepared-example');
    assert.equal(state.notifications.some((n) => n.propertyId === 9902), true);
    await api.logout(); await api.login({ email: 'admin@campus.test', password: 'Campus123' });
    const report = await api.reviewListingAnalysis(9901);
    assert.equal(report.risk, 90);
    assert.equal(report.completedAt, p.moderationAnalysis.completedAt);
    assert.match(report.summary, /No AI service was called/);
    api.moderateProperty(9901, false, 'Suspected fraud', 'Prepared example: urgent payment request before viewing.');
    const fresh = setup();
    assert.equal(fresh.state.properties.find((p) => p.id === 9901).status, 'pending');
});

test('presentation fixtures are opt-in and disabled in API mode', () => {
    const { state, today } = setup();
    const win = { CampusConfig: { mode: 'demo' }, CampusToday: () => today };
    const context = { window: win, location: { search: '' }, URLSearchParams, Date };
    vm.runInNewContext(fs.readFileSync('js/demo-showcase.js', 'utf8'), context);
    win.CampusSetupShowcase(state);
    assert.equal(state.showcaseEnabled, undefined);
    context.location.search = '?demo=review'; win.CampusConfig.mode = 'api';
    win.CampusSetupShowcase(state);
    assert.equal(state.showcaseEnabled, undefined);
    win.CampusConfig.mode = 'demo'; win.CampusSetupShowcase(state);
    assert.equal(state.showcaseEnabled, true);
    assert.equal(state.currentUser.role, 'admin');
    assert.equal(state.subletListings.filter((s) => s.status === 'published').length, 2);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.properties.find((p) => p.id === 9901).status, 'pending');
});

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
    assert.throws(() => api.moderateProperty(p.id, true), /Analyze and review/);
    await api.reviewListingAnalysis(p.id);
    api.moderateProperty(p.id, true);
    assert.equal(p.status, 'published');
    assert.equal(state.reports.length, 1);
    api.moderateProperty(p.id, false, 'Suspected fraud', 'The listing requests payment before viewing and uses misleading pricing.');
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
    assert.equal(state.users.length, 4);
    assert.deepEqual(Array.from(state.users, (u) => u.role).sort(), [
        'admin',
        'landlord',
        'tenant',
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
