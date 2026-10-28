(() => {
    'use strict';
    const api = window.CampusAPI,
        page = document.body.dataset.page,
        app = document.getElementById('app'),
        status = document.getElementById('page-status');
    const params = new URLSearchParams(window.CampusRoute.split('?')[1] || '');
    const esc = (value) =>
        String(value ?? '').replace(
            /[&<>"']/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
        );
    const photo = api.photo,
        url = (name, id) =>
            window.CampusRoutes.href(name + '.html?id=' + encodeURIComponent(id), api.user().role),
        money = (value) => `JD ${Number(value).toLocaleString('en-JO')}`;
    const date = (value) =>
        value
            ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString(
                  'en-GB',
                  { day: 'numeric', month: 'short', year: 'numeric' }
              )
            : '—';
    const stages = ['submitted', 'approved', 'inspection', 'payment', 'active'];
    const labels = {
        submitted: 'Waiting for landlord',
        approved: 'Agreement ready',
        inspection: 'Inspect the apartment',
        payment: 'Confirm direct arrangement',
        active: 'Rental active',
        rejected: 'Request declined',
        closed: 'Rental closed'
    };
    const demo = api.isDemo
        ? '<p class="demo-label">Preview session · Changes reset on refresh. Rent and deposits are paid directly to the landlord.</p>'
        : '<p class="demo-label">CONNECTED API</p>';
    function heading(title, subtitle = '') {
        document.title = title + ' — Campus Mate';
        return `<div class="breadcrumb"><a href="${window.CampusRoutes.href(api.state.currentUser ? window.CampusAccess.dashboard(api.user().role) : 'public/index.html', api.user().role)}">Home</a> / ${esc(title)}</div>${demo}<div class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></div>`;
    }
    function progress(r) {
        const active = stages.indexOf(r.status);
        return `<div class="progress-strip" aria-label="Rental progress">${['Request sent', 'Agreement', 'Inspection', 'Direct arrangement', 'Move in'].map((label, i) => `<span class="${i < active ? 'complete' : i === active ? 'now' : ''}" ${i === active ? 'aria-current="step"' : ''}>${i < active ? '✓' : i + 1} ${label}</span>`).join('')}</div>`;
    }
    function summary(p, r, action = '') {
        if (p.status === 'partial') return `<section class="panel sticky"><div class="summary-photo"><img src="${photo(p, 400)}" alt="${esc(p.title)}"><div><h3>${esc(p.title)}</h3><p>${esc(p.area)} · ${esc(p.type)}</p></div></div><div class="cost">${money(p.price)}<small> / day</small></div>${action}<dl class="summary-list"><div><dt>Available from</dt><dd>${date(p.availableFrom)}</dd></div><div><dt>Available until</dt><dd>${date(p.availableTo)}</dd></div></dl><p>Choose your dates below. The current tenant reviews your request. Agree any deposit and payment directly with them.</p></section>`;
        const total = r ? r.total : p.price * 2;
        return `<section class="panel sticky"><div class="summary-photo"><img src="${photo(p, 400)}" alt="${esc(p.title)} interior"><div><h3>${esc(p.title)}</h3><p>${esc(p.area)} · ${esc(p.furnished)}</p></div></div><div class="cost">${money(r?.agreedPrice ?? p.price)}<small> / ${p.period === 'Daily' ? 'night' : 'month'}</small></div>${action}<dl class="summary-list"><div><dt>Rental period</dt><dd>${r ? `${r.duration} ${p.period === 'Daily' ? 'nights' : 'months'}` : 'Choose duration'}</dd></div><div><dt>Start date</dt><dd>${r ? date(r.startDate) : 'Choose move-in date'}</dd></div>${r ? `<div><dt>End date</dt><dd>${date(r.endDate)}</dd></div>` : ''}<div><dt>Security deposit</dt><dd>${money(r?.deposit ?? p.price)}</dd></div><div><dt>Tenant platform fee</dt><dd>None</dd></div><div class="total"><dt>Quoted rent + deposit</dt><dd id="summary-total">${money(total)}</dd></div></dl><p>${p.period === 'Daily' ? 'Stay rent' : 'First rental period'} + refundable deposit. Paid directly to the landlord. Campus Mate does not collect or verify rental payments.</p></section>`;
    }
    function next(r) {
        return url(
            {
                submitted: 'requests',
                approved: 'rentals',
                inspection: 'inspection',
                payment: 'payment',
                active: 'rentals',
                closed: 'rentals',
                rejected: 'requests'
            }[r.status] || 'requests',
            r.id
        );
    }
    async function action(button, fn) {
        status.textContent = '';
        button.disabled = true;
        try {
            await fn();
        } catch (error) {
            status.textContent = error.message;
            status.scrollIntoView({ block: 'nearest' });
        } finally {
            button.disabled = false;
        }
    }
    function bindForm(id, fn) {
        const form = document.getElementById(id);
        window.CampusValidation.bind(form);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!window.CampusValidation.check(form)) return;
            action(form.querySelector('[type=submit]'), () => fn(new FormData(form)));
        });
    }
    function empty(title, copy) {
        app.innerHTML =
            heading(title) +
            `<section class="panel empty-panel"><h2>${esc(copy)}</h2><p>Find a space you like and send a rental request to get started.</p><a class="primary" href="properties.html">Find a place ↗</a></section>`;
    }
    function matching(p) {
        const match = api.propertyMatch(p);
        return `<span class="score-pill">${match.score}% compatibility</span><div class="score-reasons">${match.reasons.map((r) => `<span class="${r.matched ? 'matched' : ''}">${r.matched ? '✓' : '○'} ${r.text}</span>`).join('')}</div>`;
    }

    async function stageRequest(expected) {
        const r = await api.getRequest(params.get('id'));
        if (r.status !== expected) {
            window.CampusNavigate(next(r));
            return null;
        }
        return r;
    }

    function render(views) {
        document.getElementById('year').textContent = new Date().getFullYear();
        document.getElementById('global-search').addEventListener('keydown', (event) => {
            if (event.key === 'Enter')
                window.CampusNavigate(
                    'properties.html?q=' + encodeURIComponent(event.target.value)
                );
        });
        views[page]().catch((error) => {
            status.textContent = error.message;
            app.innerHTML =
                '<section class="panel empty-panel"><h2>This page could not be loaded</h2><a class="secondary" href="' +
                window.CampusAccess.dashboard(api.user().role) +
                '">Dashboard</a> <a class="primary" href="properties.html">Explore homes</a></section>';
        });
    }
    window.CampusFlowUI = {
        api,
        page,
        app,
        status,
        params,
        esc,
        photo,
        url,
        money,
        date,
        stages,
        labels,
        demo,
        heading,
        progress,
        summary,
        next,
        action,
        bindForm,
        empty,
        matching,
        stageRequest,
        render
    };
})();
