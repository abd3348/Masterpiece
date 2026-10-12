(() => {
    'use strict';
    const api = window.CampusAPI,
        state = api.state,
        rules = window.CampusValidation;
    const app = document.getElementById('feature-app'),
        status = document.getElementById('feature-status');
    const page = document.body.dataset.page,
        params = new URLSearchParams(window.CampusRoute.split('?')[1] || '');
    // Escape user-provided values before inserting them into dynamic HTML.
    const esc = (value) =>
        String(value ?? '').replace(
            /[&<>"']/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
        );
    const money = (value) =>
        'JD ' + Number(value).toLocaleString('en-JO', { maximumFractionDigits: 2 });
    const date = (value) =>
        new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    const link = (name, key) =>
        window.CampusRoutes.href(
            name + '.html' + (key ? '?id=' + encodeURIComponent(key) : ''),
            api.user().role
        );
    const labels = {
        submitted: 'Awaiting review',
        approved: 'Agreement ready',
        inspection: 'Inspection',
        payment: 'Confirm direct arrangement',
        active: 'Active',
        rejected: 'Declined',
        closed: 'Closed',
        published: 'Published',
        'awaiting-fee': 'Listing fee due - JD 20',
        pending: 'Admin review',
        archived: 'Archived',
        deleted: 'Removed'
    };
    const reasons = (match) =>
        `<span class="score-pill">${match.score}% compatibility</span><div class="score-reasons">${match.reasons.map((r) => `<span class="${r.matched ? 'matched' : ''}">${r.matched ? '✓' : '○'} ${esc(r.text)}</span>`).join('')}</div>`;
    const heading = (title, copy, action = '') => {
        document.title = title + ' — Campus Mate';
        return `<div class="section-intro"><div><p class="eyebrow">CAMPUS MATE · YOUR NEXT CHAPTER</p><h1>${esc(title)}</h1><p>${esc(copy)}</p></div>${action}</div>`;
    };
    const empty = (copy, action = '') =>
        `<section class="panel empty-feature"><h2>${esc(copy)}</h2>${action}</section>`;
    const stats = (items) =>
        `<div class="stats-grid">${items.map(([label, value, note]) => `<div class="stat-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note || 'In this preview session')}</small></div>`).join('')}</div>`;
    // Keep validation and async error handling consistent across page forms.
    function form(id, onSubmit) {
        const element = document.getElementById(id);
        rules.bind(element);
        element.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!rules.check(element)) return;
            const button = element.querySelector('[type=submit]');
            if (button) button.disabled = true;
            status.textContent = '';
            Promise.resolve()
                .then(() => onSubmit(new FormData(element), element))
                .catch((error) => {
                    status.textContent = error.message;
                    status.scrollIntoView({ block: 'nearest' });
                })
                .finally(() => {
                    if (button) button.disabled = false;
                });
        });
    }
    function action(selector, onClick) {
        document.querySelectorAll(selector).forEach((button) =>
            button.addEventListener('click', () => {
                status.textContent = '';
                Promise.resolve()
                    .then(() => onClick(button))
                    .catch((error) => {
                        status.textContent = error.message;
                        status.scrollIntoView({ block: 'nearest' });
                    });
            })
        );
    }
    function dialog(title, content) {
        document.getElementById('feature-dialog-content').innerHTML =
            `<h2>${esc(title)}</h2>${content}`;
        document.getElementById('feature-dialog').showModal();
    }
    function input(name, label, value = '', rule = 'text', type = 'text', extra = '') {
        return `<label class="field">${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" data-regex="${rule}" required ${extra}></label>`;
    }
    function select(name, label, values, value = '') {
        return `<label class="field">${label}<select name="${name}">${values.map((item) => `<option ${item === value ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select></label>`;
    }
    function activity() {
        return `<ul class="activity-list">${
            state.activity
                .slice(0, 8)
                .map((a) => `<li>${esc(a.text)}<small>${date(a.date)}</small></li>`)
                .join('') || '<li>No activity yet. Explore a home or add a listing.</li>'
        }</ul>`;
    }

    function render(views) {
        document.getElementById('year').textContent = new Date().getFullYear();
        document
            .getElementById('feature-dialog-close')
            .addEventListener('click', () => document.getElementById('feature-dialog').close());
        document.getElementById('global-search').addEventListener('keydown', (event) => {
            if (event.key === 'Enter')
                window.CampusNavigate(
                    'properties.html?q=' + encodeURIComponent(event.target.value)
                );
        });
        Promise.resolve()
            .then(() => views[page]())
            .catch((error) => {
                status.textContent = error.message;
                app.innerHTML = empty(
                    'This page could not be opened',
                    '<a href="' +
                        window.CampusAccess.dashboard(api.user().role) +
                        '" class="primary">Return to dashboard</a>'
                );
            });
    }
    window.CampusFeatureUI = {
        api,
        state,
        rules,
        app,
        status,
        page,
        params,
        esc,
        money,
        date,
        link,
        labels,
        reasons,
        heading,
        empty,
        stats,
        form,
        action,
        dialog,
        input,
        select,
        activity,
        render
    };
})();
