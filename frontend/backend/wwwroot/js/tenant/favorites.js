/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, state, app, esc, money, link, reasons, heading, empty, action } =
        window.CampusFeatureUI;
    async function favorites() {
        const items = (await api.getProperties()).filter((p) => state.saved.includes(p.id));
        app.innerHTML =
            heading('Your saved places', 'Keep the spaces you like together while exploring.') +
            (items.length
                ? `<div class="tile-grid">${items.map((p) => `<article class="feature-card"><img class="cover" src="${api.photo(p)}" alt="${esc(p.title)}"><h3>${esc(p.title)}</h3><p>${esc(p.area)} · ${money(p.price)} / ${p.period === 'Daily' ? 'night' : 'month'}</p>${reasons(api.propertyMatch(p))}<div class="row-actions"><a class="primary" href="${link('property', p.id)}">View home ↗</a><button class="secondary" data-unsave="${p.id}">Remove</button></div></article>`).join('')}</div>`
                : empty(
                      'No saved homes yet',
                      '<p>Save homes from your dashboard or catalog.</p><a class="primary" href="properties.html">Explore homes</a>'
                  ));
        action('[data-unsave]', async (button) => {
            await api.setFavorite(Number(button.dataset.unsave), false);
            await favorites();
        });
        if (!api.isDemo) {
            const people=state.roommates.filter(person=>(state.savedRoommates||[]).includes(person.id));
            app.insertAdjacentHTML('beforeend',`<section class="panel"><h2>Saved roommates</h2><p>These profiles appear first when you choose a roommate for a rental.</p>${people.map(person=>`<article class="report-row"><div><h3>${esc(person.name)}</h3><p>${esc(person.area)}</p><div class="row-actions"><a class="secondary" href="messages.html?roommate=${encodeURIComponent(person.id)}">Book a meeting</a><button class="secondary" data-unsave-roommate="${esc(person.id)}">Remove favorite</button></div></div></article>`).join('')||'<p>No saved roommates yet.</p>'}<a class="secondary" href="roommates.html">Browse roommates</a></section>`);
            action('[data-unsave-roommate]',async button=>{await api.setRoommateFavorite(button.dataset.unsaveRoommate,false);await favorites();});
        }
    }
    window.CampusFeatureUI.render({ favorites: favorites });
})();
