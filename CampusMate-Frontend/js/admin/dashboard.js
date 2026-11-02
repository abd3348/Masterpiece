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
            (tab === 'overview' ? adminCharts() : '') +
            (tab === 'users'
                ? adminUsers()
                : tab === 'properties'
                  ? adminProperties(properties) + removedListings()
                  : tab === 'reports'
                    ? adminReports()
                    : tab === 'ai'
                      ? adminAnalysis(properties) + removedListings()
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
        action('[data-request-corrections]', (b) => reviewListing(b.dataset.requestCorrections));
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
    function distribution(items, categories) {
        const groups = categories.map(([label, values, color]) => ({
            label, color, value: items.filter((item) => values.includes(item)).length
        }));
        const other = items.length - groups.reduce((sum, group) => sum + group.value, 0);
        if (other) groups.push({ label: 'Other', value: other, color: '#8c8494' });
        return groups;
    }
    function chartSummary(groups) {
        return groups.map((group) => group.label + ': ' + group.value).join(', ');
    }
    function adminCharts() {
        const users = distribution(state.users.map((user) => user.role), [
            ['Tenants', ['tenant'], '#173d36'],
            ['Landlords', ['landlord'], '#dfa375'],
            ['Admins', ['admin'], '#91a58b']
        ]);
        const listings = distribution(state.properties.map((property) => property.status), [
            ['Live', ['published'], '#173d36'],
            ['Review', ['pending'], '#dfa375'],
            ['Fee due', ['awaiting-fee'], '#d7bd83'],
            ['Paused', ['archived'], '#91a58b'],
            ['Removed', ['deleted'], '#ba7968']
        ]);
        const requests = distribution((state.requests || []).map((request) => request.status), [
            ['Awaiting landlord', ['submitted'], '#dfa375'],
            ['In progress', ['approved', 'inspection', 'payment'], '#91a58b'],
            ['Active', ['active'], '#173d36'],
            ['Closed or declined', ['closed', 'rejected'], '#ba7968']
        ]);
        const totalUsers = state.users.length;
        const circumference = 2 * Math.PI * 58;
        let offset = 0;
        const slices = users.filter((group) => group.value > 0).map((group) => {
            const length = group.value / totalUsers * circumference;
            const slice = `<circle cx="80" cy="80" r="58" fill="none" stroke="${group.color}" stroke-width="22" stroke-dasharray="${length} ${circumference}" stroke-dashoffset="${-offset}"><title>${esc(group.label)}: ${group.value}</title></circle>`;
            offset += length;
            return slice;
        }).join('');
        const legend = users.map((group) => `<li><span class="chart-swatch" style="background:${group.color}"></span><span>${esc(group.label)}</span><strong>${group.value}</strong><small>${totalUsers ? Math.round(group.value / totalUsers * 100) : 0}%</small></li>`).join('');
        const ceiling = Math.max(2, Math.ceil(Math.max(...listings.map((group) => group.value)) / 2) * 2);
        const slot = 420 / listings.length;
        const columns = listings.map((group, index) => {
            const height = group.value / ceiling * 120;
            const x = 10 + slot * (index + .5);
            return `<g><rect x="${x - 18}" y="${164 - height}" width="36" height="${height}" rx="6" fill="${group.color}"><title>${esc(group.label)}: ${group.value}</title></rect><text x="${x}" y="${154 - height}" class="chart-value">${group.value}</text><text x="${x}" y="193" class="chart-axis-label">${esc(group.label)}</text></g>`;
        }).join('');
        const grid = [0, ceiling / 2, ceiling].map((value) => {
            const y = 164 - value / ceiling * 120;
            return `<line x1="10" x2="430" y1="${y}" y2="${y}" class="chart-grid-line"/><text x="5" y="${y - 7}" class="chart-tick">${value}</text>`;
        }).join('');
        const maxRequests = Math.max(1, ...requests.map((group) => group.value));
        const totalRequests = (state.requests || []).length;
        return `<section class="admin-charts" aria-label="Platform analytics">
            <article class="panel admin-chart-card"><div class="chart-card-heading"><div><span class="eyebrow">THE COMMUNITY</span><h2>Who’s here</h2></div><a href="admin.html?tab=users">View users ↗</a></div><p>Members by account role</p><div class="donut-layout"><div class="admin-donut" role="img" aria-label="${esc(chartSummary(users))}"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="58" fill="none" stroke="#eeeade" stroke-width="22"/><g transform="rotate(-90 80 80)">${slices}</g></svg><div class="donut-total"><strong>${totalUsers}</strong><span>members</span></div></div><ul class="chart-legend">${legend}</ul></div>${!totalUsers ? '<p class="chart-empty">No members yet.</p>' : ''}</article>
            <article class="panel admin-chart-card"><div class="chart-card-heading"><div><span class="eyebrow">YOUR LISTINGS</span><h2>Spaces at a glance</h2></div><a href="admin.html?tab=properties">View listings ↗</a></div><p>All listings by status, including removed listings</p><svg class="admin-column-chart" viewBox="0 0 440 214" role="img" aria-label="${esc(chartSummary(listings))}">${grid}${columns}</svg>${!state.properties.length ? '<p class="chart-empty">No listings yet.</p>' : ''}</article>
            <article class="panel admin-chart-card request-chart-card"><div class="chart-card-heading"><div><span class="eyebrow">THE RENTAL JOURNEY</span><h2>From request to move-in</h2></div><span class="chart-total">${totalRequests} request${totalRequests === 1 ? '' : 's'}</span></div><p>Current request stages. In progress includes agreement, inspection and direct arrangement.</p><div class="request-chart-bars">${requests.map((group) => `<div class="request-chart-row"><div><span>${esc(group.label)}</span><strong>${group.value}</strong></div><div class="request-chart-track" role="img" aria-label="${esc(group.label)}: ${group.value} requests"><span style="width:${group.value / maxRequests * 100}%;background:${group.color}"></span></div></div>`).join('')}</div>${!totalRequests ? '<p class="chart-empty">No rental requests yet.</p>' : ''}</article>
        </section>`;
    }
    function adminUsers() {
        return `<section class="panel"><h2>Community members</h2><div class="catalog-controls"><input id="admin-search" type="search" placeholder="Name, email or role" aria-label="Search users"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Manage</th></tr></thead><tbody>${state.users.map((u) => `<tr data-admin-row><td>${esc(u.firstName + ' ' + u.lastName)}<small>${esc(u.city)}</small></td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td><span class="badge">${u.active ? 'Active' : 'Suspended'}</span></td><td>${u.role === 'admin' ? '<span>Preview admin</span>' : `<button class="secondary ${u.active ? 'danger' : ''}" data-user="${u.id}">${u.active ? 'Suspend' : 'Restore'}</button>`}</td></tr>`).join('')}</tbody></table></div></section>`;
    }
    function adminProperties(items) {
        return items.length ? '<section class="panel"><h2>Listing review queue</h2><p>Screen the listing, inspect the findings, then choose a decision. Suspected fraud requires an admin review.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Property / owner</th><th>Price</th><th>Risk</th><th>Status</th><th>Review</th></tr></thead><tbody>' + items.map((p) => '<tr><td>' + esc(p.title) + '<small>' + esc(p.landlord) + ' · ' + esc(p.area) + '</small></td><td>' + money(p.price) + '</td><td>' + p.risk + '/100</td><td><span class="badge">' + esc(labels[p.status] || p.status) + '</span></td><td><button class="secondary" data-moderate="' + p.id + '">✳ AI · Review listing</button></td></tr>').join('') + '</tbody></table></div></section>' : '<section class="panel"><h2>No listings awaiting review</h2></section>';
    }
    function removedListings() {
        const items = state.properties.filter((p) => p.status === 'deleted' && p.moderation?.decision === 'removed');
        return '<section class="panel removed-listings"><h2>Removed listings · awaiting owner corrections</h2><p>Listings are retained here. Owners can edit and resubmit the same advertisement without paying the listing fee again.</p>' + (items.length ? items.map((p) => '<article class="moderation-record"><span class="badge warning-badge">Removed</span><h3>' + esc(p.title) + '</h3><p><strong>' + esc(p.moderation.reason) + '</strong> · ' + esc(p.moderation.notes) + '</p><p>Decision recorded ' + date(p.moderation.reviewedAt) + ' · Notification saved for ' + esc(p.landlord) + '</p><p>Listing fee: ' + (p.listingFee?.status === 'paid' ? money(p.listingFee.amount) + ' paid · retained for this listing' : 'Not paid') + '</p><button class="secondary" data-request-corrections="' + p.id + '">Send / update correction instructions</button></article>').join('') : '<p>Removed listings and their recorded reasons will appear here.</p>') + '</section>';
    }
    async function reviewListing(id, reportId) {
        return window.CampusModeration.review({ id, reportId, allowApproval: !reportId, onComplete: async (decision) => {
            await admin(); status.textContent = decision === 'delete' ? 'Listing hidden and owner notified. The owner can edit and resubmit without another posting fee.' : decision === 'solved' ? 'Report marked solved. The listing stays published.' : 'Listing approved.';
        } });
    }
    function adminReports() {
        return '<section class="panel"><h2>Community reports</h2><p>Inspect a concern, delete the listing when justified, or mark the report solved without removing the listing.</p>' + (state.reports.length ? state.reports.map((r) => {
            const removed = state.properties.find((p) => p.id === r.propertyId)?.status === 'deleted';
            return '<article class="panel"><span class="badge">' + (r.status === 'resolved' ? 'Solved' : 'Open') + '</span><h3>' + esc(r.title) + '</h3><p>' + esc(r.reason) + ' · ' + esc(r.name) + ' · ' + date(r.date) + '</p><p>' + esc(r.notes) + '</p><div class="row-actions">' + (!removed ? '<a class="secondary" href="' + link('property', r.propertyId) + '&report=' + encodeURIComponent(r.id) + '">Inspect details</a>' : '<span class="badge">Listing deleted</span>') + (r.status === 'open' ? (!removed ? '<button class="primary danger" data-report-delete="' + esc(r.id) + '" data-property="' + r.propertyId + '">Delete listing</button>' : '') + '<button class="secondary" data-resolve="' + esc(r.id) + '">Mark solved</button>' : '') + '</div></article>';
        }).join('') : empty('No reports submitted', '<p>Reports from property details appear here.</p>')) + '</section>';
    }
    function adminAnalysis(items) {
        return `<p class="sample-note">Risk checks use listing prices, completeness and Regex matches in descriptions. They do not identify fraud or analyze images and video.</p><div class="tile-grid">${items.map((p) => `<article class="feature-card"><span class="badge ${p.risk >= 60 ? 'warning-badge' : ''}">${p.risk >= 60 ? 'High' : 'Low'} rule-based risk</span><h3>${esc(p.title)}</h3>${p.moderation?.resubmittedAt ? '<span class="badge">Corrected · awaiting admin review</span><p>Previous instructions: ' + esc(p.moderation.notes) + '</p>' : ''}<p>Risk score: ${p.risk}/100</p><p>${p.riskReasons.map(esc).join('<br>')}</p><button class="secondary" data-risk="${p.id}">View sample analysis</button></article>`).join('')}</div>`;
    }

    window.CampusFeatureUI.render({ admin });
})();
