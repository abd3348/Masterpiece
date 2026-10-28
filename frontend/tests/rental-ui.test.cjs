const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise page rendering and async actions without launching a browser.
function pageHarness(file, api, page) {
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, {
            innerHTML: '', textContent: '', hidden: false, disabled: false, attributes: {}, listeners: {},
            addEventListener(name, callback) { this.listeners[name] = callback; },
            setAttribute(name, value) { this.attributes[name] = value; },
            insertAdjacentHTML(_, html) { this.innerHTML += html; }
        });
        return elements.get(id);
    }
    let rendering;
    const forms = new Map(), navigations = [];
    const ui = {
        api, app: element('app'), status: element('status'), params: new URLSearchParams('id=124'),
        esc: (value) => String(value ?? '').replace(/</g, '&lt;'),
        money: (value) => 'JD ' + value, date: (value) => value, photo: () => 'home.jpg',
        url: (name, id) => name + '.html?id=' + id, heading: (name) => '<h1>' + name + '</h1>',
        matching: () => '', summary: () => '<aside>Rental summary</aside>',
        bindForm: (id, callback) => forms.set(id, callback),
        empty: () => { element('app').innerHTML = 'No rentals yet'; },
        render: (views) => { rendering = views[page](); }
    };
    const context = {
        window: { CampusFlowUI: ui, CampusNavigate: (route) => navigations.push(route) },
        document: { getElementById: element, querySelectorAll: () => [] },
        requestAnimationFrame: (callback) => callback()
    };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
    return { rendering, ui, element, forms, navigations };
}

const property = {
    id: 124, title: 'Test apartment', status: 'published', area: 'Amman', city: 'Amman',
    photos: [], amenities: [], reviews: [], beds: 2, baths: 1, size: 80,
    furnished: 'Furnished', price: 190, period: 'Monthly', risk: 8
};

test('property report stays hidden until requested and supports failure followed by retry', async () => {
    let attempts = 0;
    const api = {
        isDemo: true, getProperty: async () => ({ ...property, video: { url: 'video.mp4' } }),
        estimate: () => ({ low: 160, high: 200 }),
        analyzePropertyVideo: async () => {
            if (++attempts === 1) throw Error('Analysis unavailable');
            return { demo: true, summary: 'Listing-based demo', condition: 'Not assessed', furniture: 'Furnished', maintenance: 'Inspect in person', limitations: 'No video analysis' };
        }
    };
    const h = pageHarness('js/public/property.js', api, 'property');
    await h.rendering;
    assert.match(h.ui.app.innerHTML, /id="video-analysis-result" hidden/);
    assert.equal(attempts, 0);
    assert.match(h.ui.app.innerHTML, /✳ AI · Analyze property video/);
    const button = h.element('analyze-video');
    await button.listeners.click({ currentTarget: button });
    assert.equal(h.element('video-analysis-result').hidden, true);
    assert.equal(h.element('video-analysis-status').textContent, 'Analysis unavailable');
    assert.equal(button.disabled, false);
    assert.equal(button.textContent, '✳ AI · Retry analysis');
    await button.listeners.click({ currentTarget: button });
    assert.equal(h.element('video-analysis-result').hidden, false);
    assert.equal(button.attributes['aria-expanded'], 'true');
    assert.equal(button.textContent, '✳ AI · Analyze again');
    assert.match(h.element('video-analysis-result').innerHTML, /No video content was analyzed/);
});

test('analysis action is unavailable when no walkthrough was uploaded', async () => {
    const h = pageHarness('js/public/property.js', { isDemo: true, getProperty: async () => property }, 'property');
    await h.rendering;
    assert.match(h.ui.app.innerHTML, /aria-expanded="false" disabled>✳ AI · Analyze property video/);
    assert.match(h.ui.app.innerHTML, /must be uploaded before analysis/);
});

test('admin listing inspection exposes delete and solved controls instead of tenant rental actions', async () => {
    const report = { id: 'report-1', propertyId: 124, status: 'open', reason: 'Misleading photos', notes: 'Photos do not match the description.' };
    const h = pageHarness('js/public/property.js', {
        isDemo: true, user: () => ({ role: 'admin' }), state: { reports: [report] },
        getProperty: async () => property
    }, 'property');
    await h.rendering;
    assert.match(h.ui.app.innerHTML, /Delete listing/);
    assert.match(h.ui.app.innerHTML, /Mark solved/);
    assert.match(h.ui.app.innerHTML, /Photos do not match/);
    assert.doesNotMatch(h.ui.app.innerHTML, /Request to rent|Request this room|Book a meeting|review-form|report-form/);
    assert.equal(h.forms.has('review-form'), false);
    assert.equal(h.forms.has('report-form'), false);
});

test('unified rentals shows an agreement before activation and continues to inspection', async () => {
    const request = { id: 'request-1', property, status: 'approved', landlordAccepted: true, startDate: '2026-10-26', endDate: '2027-04-26', duration: 6, deposit: 190, total: 365.5, agreedPrice: 175.5 };
    const signed = [];
    const h = pageHarness('js/tenant/rentals.js', {
        getRentals: async () => [], getRequests: async () => [request],
        state: { roommates: [] }, signAgreement: async (id) => signed.push(id)
    }, 'rentals');
    await h.rendering;
    assert.match(h.ui.app.innerHTML, /My rentals &amp; arrangements|My rentals & arrangements/);
    assert.match(h.ui.app.innerHTML, /Sample rental agreement/);
    assert.match(h.ui.app.innerHTML, /JD 175.5/);
    await h.forms.get('agreement-request-1')();
    assert.deepEqual(signed, ['request-1']);
    assert.deepEqual(h.navigations, ['inspection.html?id=request-1']);
});
