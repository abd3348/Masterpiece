(() => {
    'use strict';
    const { api, app, esc, money, date, heading, link } = window.CampusFeatureUI;
    async function offers() {
        const items = await api.getPublicSubletListings();
        app.innerHTML = heading('Partial rental offers', 'Browse private and shared rooms offered by current tenants. Choose a stay of 1–30 days.') +
            '<div class="catalog-controls"><label class="field">Area<input id="offer-area" type="search" placeholder="Search by area or home"></label><label class="field">Room type<select id="offer-type"><option value="">All rooms</option><option value="private">Private room</option><option value="shared">Shared room</option></select></label><a class="secondary" href="../tenant/sublets.html">Manage my offers ↗</a></div><p id="offer-count" role="status"></p><div id="public-offer-list" class="tile-grid"></div>';
        const render = () => {
            const query = document.getElementById('offer-area').value.toLowerCase().trim();
            const type = document.getElementById('offer-type').value;
            const visible = items.filter((s) => (!type || s.occupancy === type) && `${s.propertyTitle} ${s.area} ${s.property.city}`.toLowerCase().includes(query));
            document.getElementById('offer-count').textContent = `${visible.length} available offer${visible.length === 1 ? '' : 's'}`;
            document.getElementById('public-offer-list').innerHTML = visible.length ? visible.map((s) => `<article class="feature-card partial-offer-card"><img class="cover" src="${esc(api.photo(s.property))}" alt="${esc(s.propertyTitle)}"><span class="badge">${s.occupancy === 'private' ? 'Private room' : 'Shared room'}</span><h2>${esc(s.roomLabel)} · ${esc(s.propertyTitle)}</h2><p>${esc(s.area)}, ${esc(s.property.city)}</p><p>${date(s.startDate)} → ${date(s.endDate)} · ${s.duration} days</p><strong>${money(s.price)} / day</strong><p>${esc(s.notes || 'A room offered by the current tenant.')}</p><a class="primary" href="${link('property', s.propertyId)}&offer=${encodeURIComponent(s.id)}">View offer & request ↗</a></article>`).join('') : '<section class="panel"><h2>No matching offers</h2><p>Try another area or room type. Only published offers within an active rental appear here.</p></section>';
        };
        document.getElementById('offer-area').addEventListener('input', render);
        document.getElementById('offer-type').addEventListener('change', render);
        render();
    }
    window.CampusFeatureUI.render({ 'partial-offers': offers });
})();
