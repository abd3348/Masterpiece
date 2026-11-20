/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, params, esc, photo, url, money, heading, action } = window.CampusFlowUI;
    async function catalog() {
        const properties = await api.getProperties();
        app.innerHTML =
            heading(
                'Find a place',
                'Filter homes around your plans, preferences and everyday routine.'
            ) +
            `<div class="catalog-controls"><input id="filter-query" type="search" placeholder="Search city, area or home" aria-label="Search homes" value="${esc(params.get('q') || '')}"><select id="filter-period" aria-label="Rental period"><option value="">Any period</option><option>Monthly</option><option>Daily</option></select><select id="filter-budget" aria-label="Maximum budget"><option value="99999">Any budget</option><option value="175">Up to JD 175</option><option value="200">Up to JD 200</option><option value="300">Up to JD 300</option></select><select id="filter-type" aria-label="Housing type"><option value="">Any type</option><option>Apartment</option><option>Studio</option><option>Private room</option><option>Shared room</option></select><select id="filter-beds" aria-label="Minimum bedrooms"><option value="0">Any rooms</option><option value="1">1+ bedrooms</option><option value="2">2+ bedrooms</option><option value="3">3+ bedrooms</option></select><select id="filter-furnished" aria-label="Furniture"><option value="">Any furniture</option><option>Furnished</option><option>Partly furnished</option><option>Unfurnished</option></select><select id="filter-amenity" aria-label="Amenity"><option value="">Any amenity</option><option>Wi-Fi</option><option>Parking</option><option>Air conditioning</option><option>Balcony</option></select><label class="field">From<input id="filter-start" type="date" aria-label="Availability start"></label><label class="field">Until<input id="filter-end" type="date" aria-label="Availability end"></label><select id="sort" aria-label="Sort homes"><option value="recommended">Best compatibility</option><option value="price">Price: low to high</option></select><button id="reset-filters" class="secondary">Reset filters</button></div><p id="catalog-error" role="status"></p><div class="catalog"><section><p id="catalog-count" class="listing-status" aria-live="polite"></p><div id="catalog-list"></div></section><section class="area-guide" aria-label="Area guide"><p><strong>Explore your areas</strong><br>Illustrative locations · Amman, Jordan</p>${properties
                .slice(0, 3)
                .map(
                    (p) =>
                        `<a href="${url('property', p.id)}">${esc(p.area)} · ${money(p.price)}</a>`
                )
                .join(
                    ''
                )}<p>Explore housing for study, work, training and a new chapter.</p><a href="market.html">View rental market ↗</a></section></div>`;
        const get = (id) => document.getElementById(id).value;
        function render() {
            const query = get('filter-query').toLowerCase().trim(),
                period = get('filter-period'),
                budget = Number(get('filter-budget')),
                start = get('filter-start'),
                end = get('filter-end');
            if ((start && !end) || (!start && end) || (start && end <= start)) {
                document.getElementById('catalog-error').textContent =
                    'Choose both dates, with the end after the start.';
            } else document.getElementById('catalog-error').textContent = '';
            const items = properties
                .filter(
                    (p) =>
                        `${p.title} ${p.area} ${p.city}`.toLowerCase().includes(query) &&
                        (!period || p.period === period) &&
                        p.price <= budget &&
                        (!get('filter-type') || p.type === get('filter-type')) &&
                        p.beds >= Number(get('filter-beds')) &&
                        (!get('filter-furnished') || p.furnished === get('filter-furnished')) &&
                        (!get('filter-amenity') || p.amenities.includes(get('filter-amenity'))) &&
                        (!start || !end || end <= start || api.available(p, start, end))
                )
                .sort((a, b) =>
                    get('sort') === 'price'
                        ? a.price - b.price
                        : api.propertyMatch(b).score - api.propertyMatch(a).score
                );
            document.getElementById('catalog-count').textContent =
                items.length + ' places to explore';
            document.getElementById('catalog-list').innerHTML =
                items
                    .map(
                        (p) =>
                            `<article class="catalog-card"><a href="${url('property', p.id)}"><img src="${photo(p, 500)}" alt="${esc(p.title)}" loading="lazy"></a><div class="catalog-copy"><span class="badge">${p.period}</span><h2><a href="${url('property', p.id)}">${esc(p.title)}</a></h2><p>⌖ ${esc(p.area)}, ${esc(p.city)}</p><p>${p.beds} bedrooms · ${p.baths} bathroom · ${p.size} m² · ${esc(p.furnished)}</p><span class="score-pill">${api.propertyMatch(p).score}% compatibility</span><div class="bottom"><strong>${money(p.price)} <small>/ ${p.period === 'Daily' ? 'night' : 'month'}</small></strong><button class="secondary" data-save="${p.id}" aria-pressed="${api.state.saved.includes(p.id)}">${api.state.saved.includes(p.id) ? '♥ Saved' : '♡ Save'}</button><a class="primary" href="${url('property', p.id)}">View details ↗</a></div></div></article>`
                    )
                    .join('') || '<section class="panel">No homes match your filters.</section>';
            document.querySelectorAll('[data-save]').forEach((button) =>
                button.addEventListener('click', () =>
                    action(button, async () => {
                        const id = Number(button.dataset.save);
                        await api.setFavorite(id, !api.state.saved.includes(id));
                        render();
                    })
                )
            );
        }
        [
            'filter-query',
            'filter-period',
            'filter-budget',
            'filter-type',
            'filter-beds',
            'filter-furnished',
            'filter-amenity',
            'filter-start',
            'filter-end',
            'sort'
        ].forEach((id) =>
            document
                .getElementById(id)
                .addEventListener(id === 'filter-query' ? 'input' : 'change', render)
        );
        document.getElementById('reset-filters').addEventListener('click', () => {
            document.querySelectorAll('.catalog-controls input').forEach((i) => (i.value = ''));
            document
                .querySelectorAll('.catalog-controls select')
                .forEach((s) => (s.selectedIndex = 0));
            render();
        });
        render();
    }
    window.CampusFlowUI.render({ properties: catalog });
})();
