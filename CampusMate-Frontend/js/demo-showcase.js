/* Explicit, opt-in presentation fixtures. Never enabled in connected API mode. */
(() => {
    'use strict';
    window.CampusSetupShowcase = (state) => {
        if (window.CampusConfig?.mode !== 'demo' || new URLSearchParams(location.search).get('demo') !== 'review') return;
        const owner = state.users.find((u) => u.role === 'landlord');
        const host = state.users.find((u) => u.role === 'tenant');
        const admin = state.users.find((u) => u.role === 'admin');
        const source = state.properties.find((p) => p.id === 124) || state.properties[0];
        if (!owner || !host || !admin || !source) return;
        const today = window.CampusToday();
        const future = (days) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
        const request = { id: 'showcase-rental', tenantId: host.id, tenantName: `${host.firstName} ${host.lastName}`, propertyId: source.id, property: { ...source }, startDate: today, endDate: future(90), duration: 3, status: 'active', landlordAccepted: true, tenantAccepted: true, deposit: source.price, total: source.price * 2, inspection: { items: [{ name: 'Walls', condition: 'Good' }], notes: '' } };
        state.requests.push(request);
        state.rentals.push({ id: request.id, request, status: 'active', endDate: request.endDate, conditions: { initial: null, final: null }, payments: [], paymentMethod: 'direct-to-landlord', moveInComplete: true });
        for (const [i, occupancy, price] of [[1, 'private', 12], [2, 'shared', 7]]) state.subletListings.push({ id: 'showcase-offer-' + i, tenantId: host.id, rentalId: request.id, propertyId: source.id, propertyTitle: source.title, area: source.area, roomNumber: i, roomLabel: 'Room ' + i, occupancy, price, startDate: future(1), endDate: future(15), duration: 14, notes: occupancy === 'private' ? 'Presentation example · furnished private room near campus. Wi-Fi included.' : 'Presentation example · shared room with a current tenant. Close to public transport.', fee: { amount: 5, status: 'paid', simulated: true }, status: 'published', createdAt: new Date().toISOString() });
        const listing = { ...state.properties[0], id: 9901, title: 'Demo · Luxury apartment for JD 20', ownerId: owner.id, landlord: `${owner.firstName} ${owner.lastName}`, price: 20, description: 'Pay before viewing. Urgent deposit. Transfer payment immediately to reserve this apartment.', status: 'pending', risk: 90, riskReasons: ['Unusually low monthly rent', 'Pressure to pay before viewing'], listingFee: { amount: 20, status: 'paid', currency: 'JOD', simulated: true }, moderationAnalysis: null, availableFrom: today, availableTo: future(365) };
        if (!state.properties.some((p) => p.id === listing.id)) state.properties.push(listing);
        if (!state.reports.some((r) => r.id === 'showcase-report')) state.reports.push({ id: 'showcase-report', propertyId: listing.id, title: listing.title, reason: 'Suspicious pricing', name: 'Demo tenant', notes: 'The advertisement requests urgent payment before viewing and lists a monthly price far below comparable homes.', status: 'open', date: new Date().toISOString() });
        const removed = { ...listing, id: 9902, title: 'Demo · Previously removed advertisement', status: 'deleted', moderation: { decision: 'removed', reason: 'Misleading information', notes: 'The property details conflict with the supplied description. Please correct the information before submitting a new listing.', reviewedBy: admin.id, reviewedAt: new Date().toISOString() } };
        if (!state.properties.some((p) => p.id === removed.id)) state.properties.push(removed);
        if (!state.notifications.some((n) => n.id === 'showcase-notification')) state.notifications.push({ id: 'showcase-notification', recipientId: owner.id, propertyId: removed.id, propertyTitle: removed.title, type: 'listing-removed', text: 'Your advertisement was removed after admin review. Reason: Misleading information. ' + removed.moderation.notes, read: false, date: new Date().toISOString() });
        state.showcaseEnabled = true;
        state.currentUser = admin;
        state.firstName = admin.firstName;
    };
    window.CampusMountShowcase = (doc, api) => {
        if (!api.isDemo || !api.state.showcaseEnabled) return;
        const bar = doc.createElement('section');
        bar.className = 'demo-showcase';
        bar.setAttribute('aria-label', 'Presentation example controls');
        bar.innerHTML = '<div><strong>مثال جاهز للعرض · Demo</strong><small>بيانات تجريبية — الحساب الحالي: <b></b> · لا تُرسل رسائل خارج الموقع</small></div><div class="row-actions"><button class="secondary" data-demo-view="admin">1. مراجعة الأدمن</button><button class="secondary" data-demo-view="landlord">2. إشعار صاحب الشقة</button><button class="secondary" data-demo-view="tenant">3. عروض الإيجار الجزئي</button></div><p role="status"></p>';
        bar.querySelector('b').textContent = api.user().role;
        const main = doc.querySelector('main'); if (!main) return;
        main.prepend(bar);
        bar.querySelectorAll('[data-demo-view]').forEach((button) => button.addEventListener('click', async () => {
            const role = button.dataset.demoView;
            const accounts = { admin: 'admin@campus.test', landlord: 'owner@campus.test', tenant: 'tenant@campus.test' };
            const routes = { admin: 'admin/dashboard.html?tab=properties', landlord: 'landlord/dashboard.html', tenant: 'public/partial-offers.html' };
            button.disabled = true;
            try { await api.logout(); await api.login({ email: accounts[role], password: 'Campus123' }); window.CampusNavigate(routes[role]); }
            catch (error) { bar.querySelector('[role="status"]').textContent = error.message; button.disabled = false; }
        }));
    };
})();
