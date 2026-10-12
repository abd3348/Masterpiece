/* Page behavior for admin/dashboard.js. Shared UI helpers live in shared/features.js. */
(() => {
    'use strict';
    const {
        api,
        state,
        app,
        status,
        params,
        esc,
        money,
        date,
        link,
        labels,
        heading,
        empty,
        stats,
        action,
        activity
    } = window.CampusFeatureUI;
    async function admin() {
        const tab = params.get('tab') || 'overview',
            properties = state.properties.filter((p) => p.status !== 'deleted'),
            pending = properties.filter((p) => p.status === 'pending');
        app.innerHTML =
            heading(
                'A thoughtful view of the community',
                'Review people, spaces, reported listings and platform activity.'
            ) +
            stats([
                ['Community members', state.users.length],
                ['Live properties', properties.filter((p) => p.status === 'published').length],
                ['Needs review', pending.length],
                ['Open reports', state.reports.filter((r) => r.status === 'open').length],
                ['Listing fee confirmations', money(state.properties.reduce((sum, p) => sum + (p.listingFee?.status === 'paid' ? p.listingFee.amount : 0), 0)), 'JD 20 per advertisement; demo confirmations are simulated']
            ]) +
            (tab === 'users'
                ? adminUsers()
                : tab === 'properties'
                  ? adminProperties(properties)
                  : tab === 'reports'
                    ? adminReports()
                    : tab === 'ai'
                      ? adminAnalysis(properties)
                      : tab === 'activity'
                        ? `<section class="panel"><h2>Platform activity</h2>${activity()}</section>`
                        : `<div class="split-grid"><section class="panel"><h2>Listings needing a closer look</h2>${adminProperties(pending)}<a class="secondary" href="admin.html?tab=properties">Manage all properties</a></section><div><section class="panel"><h2>Community activity</h2>${activity()}</section><section class="panel"><h2>Understand the rental market</h2><p>Compare illustrative area rents, property counts and rental trends.</p><a class="primary" href="market.html">Open market dashboard ↗</a></section></div></div>`);
        action('[data-moderate]', async (b) => {
            await api.moderateProperty(b.dataset.moderate, b.dataset.keep === 'true');
            await admin();
        });
        action('[data-user]', async (b) => {
            await api.toggleUser(b.dataset.user);
            await admin();
        });
        action('[data-risk]', (b) =>
            analysis(state.properties.find((p) => String(p.id) === b.dataset.risk))
        );
        action('[data-resolve]', async (b) => {
            await api.resolveReport(b.dataset.resolve);
            await admin();
        });
        const search = document.getElementById('admin-search');
        if (search)
            search.addEventListener('input', () =>
                document
                    .querySelectorAll('[data-admin-row]')
                    .forEach(
                        (row) =>
                            (row.hidden = !row.textContent
                                .toLowerCase()
                                .includes(search.value.toLowerCase().trim()))
                    )
            );
    }
    function adminUsers() {
        return `<section class="panel"><h2>Community members</h2><div class="catalog-controls"><input id="admin-search" type="search" placeholder="Name, email or role" aria-label="Search users"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Manage</th></tr></thead><tbody>${state.users.map((u) => `<tr data-admin-row><td>${esc(u.firstName + ' ' + u.lastName)}<small>${esc(u.city)}</small></td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td><span class="badge">${u.active ? 'Active' : 'Suspended'}</span></td><td>${u.role === 'admin' ? '<span>Preview admin</span>' : `<button class="secondary ${u.active ? 'danger' : ''}" data-user="${u.id}">${u.active ? 'Suspend' : 'Restore'}</button>`}</td></tr>`).join('')}</tbody></table></div></section>`;
    }
    function adminProperties(items) {
        return items.length
            ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Property / owner</th><th>Price</th><th>Risk</th><th>Status</th><th>Review</th></tr></thead><tbody>${items.map((p) => `<tr><td><a href="${link('property', p.id)}">${esc(p.title)}</a><small>${esc(p.landlord)} · ${esc(p.area)}</small></td><td>${money(p.price)}<small>${p.period}</small></td><td><button class="secondary ${p.risk >= 60 ? 'danger' : ''}" data-risk="${p.id}">${p.risk}/100</button></td><td><span class="badge">${labels[p.status]}</span></td><td><div class="row-actions">${p.status !== 'published' ? `<button class="secondary" data-moderate="${p.id}" data-keep="true" ${p.listingFee?.status === 'unpaid' ? 'disabled title="Listing fee must be paid first"' : ''}>Approve</button>` : '<span class="badge">Published</span>'}<button class="secondary danger" data-moderate="${p.id}" data-keep="false">Remove</button></div></td></tr>`).join('')}</tbody></table></div>`
            : '<p>No listings awaiting review.</p>';
    }
    function adminReports() {
        return `<section class="panel"><h2>Community reports</h2>${state.reports.length ? state.reports.map((r) => `<section class="panel"><span class="badge">${esc(r.status)}</span><h3>${esc(r.title)}</h3><p>${esc(r.reason)} · ${esc(r.name)} · ${date(r.date)}</p><p>${esc(r.notes)}</p><div class="row-actions"><a class="secondary" href="${link('property', r.propertyId)}">Review listing</a>${r.status === 'open' ? `<button class="primary" data-resolve="${r.id}">Mark resolved</button>` : ''}</div></section>`).join('') : empty('No reports submitted', '<p>Reports from property details appear here.</p>')}</section>`;
    }
    function adminAnalysis(items) {
        return `<p class="sample-note">Risk checks use listing prices, completeness and Regex matches in descriptions. They do not identify fraud or analyze images and video.</p><div class="tile-grid">${items.map((p) => `<article class="feature-card"><span class="badge ${p.risk >= 60 ? 'warning-badge' : ''}">${p.risk >= 60 ? 'High' : 'Low'} rule-based risk</span><h3>${esc(p.title)}</h3><p>Risk score: ${p.risk}/100</p><p>${p.riskReasons.map(esc).join('<br>')}</p><button class="secondary" data-risk="${p.id}">View sample analysis</button></article>`).join('')}</div>`;
    }

    window.CampusFeatureUI.render({ admin });
})();
