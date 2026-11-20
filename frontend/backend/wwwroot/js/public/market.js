/* Page behavior for public/market.js. Shared UI helpers live in shared/features.js. */
(() => {
    'use strict';
    const { state, app, status, esc, money, heading, stats } = window.CampusFeatureUI;
    async function market() {
        app.innerHTML =
            heading(
                'A little perspective on the market',
                'Compare rent levels and activity across the areas you care about.'
            ) +
            `<p class="sample-note">All market data is illustrative. Area averages use listings in this preview; the trend chart uses sample historical figures.</p><div class="catalog-controls"><select id="market-period" aria-label="Rental period"><option>Monthly</option><option>Daily</option></select><select id="market-area" aria-label="Area for trend chart"><option>Jubeiha</option><option>Shafa Badran</option><option>Sweileh</option><option>Amman Center</option></select></div><div id="market-content"></div>`;
        function render() {
            const period = document.getElementById('market-period').value,
                area = document.getElementById('market-area').value,
                properties = state.properties.filter(
                    (p) => p.status === 'published' && p.period === period
                ),
                areas = [...new Set(properties.map((p) => p.area))];
            const values = areas.map((area) => {
                const homes = properties.filter((p) => p.area === area);
                return {
                    area,
                    count: homes.length,
                    average: homes.reduce((n, p) => n + p.price, 0) / homes.length,
                    demand: state.requests.filter(
                        (r) => r.property.area === area && r.property.period === period
                    ).length
                };
            });
            const max = Math.max(1, ...values.map((v) => v.average)),
                target =
                    values.find((v) => v.area === area)?.average || (period === 'Daily' ? 18 : 190),
                trend = [0.93, 0.96, 0.94, 0.99, 1.02, 1].map((n) => Math.round(target * n)),
                high = Math.max(...trend) * 1.1,
                low = Math.min(...trend) * 0.9,
                points = trend.map(
                    (n, i) => `${50 + i * 88},${180 - ((n - low) / (high - low)) * 130}`
                ),
                months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
            document.getElementById('market-content').innerHTML =
                stats([
                    ['Listed properties', properties.length],
                    [
                        'Average rent',
                        money(
                            properties.length
                                ? properties.reduce((n, p) => n + p.price, 0) / properties.length
                                : 0
                        ),
                        period === 'Daily' ? 'Per night' : 'Per month'
                    ],
                    [
                        'Housing seekers',
                        state.users.filter((u) => u.role === 'tenant' && u.active).length
                    ],
                    ['Rental requests', state.requests.length]
                ]) +
                `<div class="split-grid"><section class="panel"><h2>Rent by area</h2><div class="market-bars">${values.map((v) => `<div class="market-bar"><div class="label"><span>${esc(v.area)} · ${v.count} homes</span><strong>${money(v.average)}</strong></div><div class="track"><div class="fill" style="width:${(v.average / max) * 100}%"></div></div></div>`).join('') || '<p>No published listings for this period.</p>'}</div><div class="table-wrap"><table class="data-table"><caption>Area activity</caption><thead><tr><th>Area</th><th>Properties</th><th>Requests</th><th>Average rent</th></tr></thead><tbody>${values.map((v) => `<tr><td>${esc(v.area)}</td><td>${v.count}</td><td>${v.demand}</td><td>${money(v.average)}</td></tr>`).join('')}</tbody></table></div></section><div><section class="panel"><h2>${esc(area)} rent trend</h2><svg class="trend-chart" viewBox="0 0 540 230" role="img" aria-label="Illustrative rent trend from May to October"><title>Sample rent: ${trend.join(', ')} JD</title><path d="M50 185H500 M50 120H500 M50 55H500" fill="none" stroke="#e3ded2"/><polyline points="${points.join(' ')}" fill="none" stroke="#52785a" stroke-width="3"/>${trend.map((n, i) => `<circle cx="${50 + i * 88}" cy="${points[i].split(',')[1]}" r="5" fill="#dfa375"/><text x="${50 + i * 88}" y="215" text-anchor="middle" fill="#6d7972" font-size="11">${months[i]}</text><text x="${50 + i * 88}" y="${Number(points[i].split(',')[1]) - 12}" text-anchor="middle" fill="#173d36" font-size="11">${n}</text>`).join('')}</svg><p>Sample historical series · ${period === 'Daily' ? 'nightly' : 'monthly'} JD</p></section><section class="panel"><h2>Popular housing types</h2>${['Apartment', 'Studio', 'Private room', 'Shared room'].map((type) => `<div class="report-row"><span>${type}</span><strong>${properties.filter((p) => p.type === type).length}</strong></div>`).join('')}<p>Most requested area: ${values.sort((a, b) => b.demand - a.demand)[0]?.demand ? esc(values[0].area) : 'No requests yet'}</p><p>Confirmed stays: ${state.rentals.length} · New session listings: ${state.properties.filter((p) => p.id > 1000).length}</p></section></div></div>`;
        }
        ['market-period', 'market-area'].forEach((id) =>
            document.getElementById(id).addEventListener('change', render)
        );
        render();
    }

    window.CampusFeatureUI.render({ market });
})();
