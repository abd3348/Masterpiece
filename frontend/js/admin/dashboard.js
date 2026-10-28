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
        activity,
        dialog
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
                  ? adminProperties(properties) + removedListings()
                  : tab === 'reports'
                    ? adminReports()
                    : tab === 'ai'
                      ? adminAnalysis(properties)
                      : tab === 'activity'
                        ? `<section class="panel"><h2>Platform activity</h2>${activity()}</section>`
                        : `<div class="split-grid"><section class="panel"><h2>Listings needing a closer look</h2>${adminProperties(pending)}<a class="secondary" href="admin.html?tab=properties">Manage all properties</a></section><div><section class="panel"><h2>Community activity</h2>${activity()}</section><section class="panel"><h2>Understand the rental market</h2><p>Compare illustrative area rents, property counts and rental trends.</p><a class="primary" href="market.html">Open market dashboard ↗</a></section></div></div>`);
        action('[data-moderate]', async (b) => {
            await reviewListing(b.dataset.moderate);
        });
        action('[data-report-delete]', (b) => reviewListing(b.dataset.property, b.dataset.reportDelete));
        action('[data-user]', async (b) => {
            await api.toggleUser(b.dataset.user);
            await admin();
        });
        action('[data-risk]', (b) => reviewListing(b.dataset.risk));
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
        return items.length ? '<section class="panel"><h2>Listing review queue</h2><p>Screen the listing, inspect the findings, then choose a decision. Suspected fraud requires an admin review.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Property / owner</th><th>Price</th><th>Risk</th><th>Status</th><th>Review</th></tr></thead><tbody>' + items.map((p) => '<tr><td>' + esc(p.title) + '<small>' + esc(p.landlord) + ' · ' + esc(p.area) + '</small></td><td>' + money(p.price) + '</td><td>' + p.risk + '/100</td><td><span class="badge">' + esc(labels[p.status] || p.status) + '</span></td><td><button class="secondary" data-moderate="' + p.id + '">✳ AI · Review listing</button></td></tr>').join('') + '</tbody></table></div></section>' : '<section class="panel"><h2>No listings awaiting review</h2></section>';
    }
    function removedListings() {
        const items = state.properties.filter((p) => p.status === 'deleted' && p.moderation?.decision === 'removed');
        return '<section class="panel"><h2>Removed listings · owner notified</h2>' + (items.length ? items.map((p) => '<article class="moderation-record"><span class="badge warning-badge">Removed</span><h3>' + esc(p.title) + '</h3><p><strong>' + esc(p.moderation.reason) + '</strong> · ' + esc(p.moderation.notes) + '</p><p>Decision recorded ' + date(p.moderation.reviewedAt) + ' · Notification saved for ' + esc(p.landlord) + '</p></article>').join('') : '<p>Removed listings and their recorded reasons will appear here.</p>') + '</section>';
    }
    async function reviewListing(id, reportId) {
        return window.CampusModeration.review({ id, reportId, allowApproval: !reportId, onComplete: async (decision) => {
            await admin(); status.textContent = decision === 'delete' ? 'Listing deleted, owner notified and open reports marked solved.' : decision === 'solved' ? 'Report marked solved. The listing stays published.' : 'Listing approved.';
        } });
    }
    function adminReports() {
        return '<section class="panel"><h2>Community reports</h2><p>Inspect a concern, delete the listing when justified, or mark the report solved without removing the listing.</p>' + (state.reports.length ? state.reports.map((r) => {
            const removed = state.properties.find((p) => p.id === r.propertyId)?.status === 'deleted';
            return '<article class="panel"><span class="badge">' + (r.status === 'resolved' ? 'Solved' : 'Open') + '</span><h3>' + esc(r.title) + '</h3><p>' + esc(r.reason) + ' · ' + esc(r.name) + ' · ' + date(r.date) + '</p><p>' + esc(r.notes) + '</p><div class="row-actions">' + (!removed ? '<a class="secondary" href="' + link('property', r.propertyId) + '&report=' + encodeURIComponent(r.id) + '">Inspect details</a>' : '<span class="badge">Listing deleted</span>') + (r.status === 'open' ? (!removed ? '<button class="primary danger" data-report-delete="' + esc(r.id) + '" data-property="' + r.propertyId + '">Delete listing</button>' : '') + '<button class="secondary" data-resolve="' + esc(r.id) + '">Mark solved</button>' : '') + '</div></article>';
        }).join('') : empty('No reports submitted', '<p>Reports from property details appear here.</p>')) + '</section>';
    }
    function adminAnalysis(items) {
        return `<p class="sample-note">Risk checks use listing prices, completeness and Regex matches in descriptions. They do not identify fraud or analyze images and video.</p><div class="tile-grid">${items.map((p) => `<article class="feature-card"><span class="badge ${p.risk >= 60 ? 'warning-badge' : ''}">${p.risk >= 60 ? 'High' : 'Low'} rule-based risk</span><h3>${esc(p.title)}</h3><p>Risk score: ${p.risk}/100</p><p>${p.riskReasons.map(esc).join('<br>')}</p><button class="secondary" data-risk="${p.id}">View sample analysis</button></article>`).join('')}</div>`;
    }

    window.CampusFeatureUI.render({ admin });
})();
