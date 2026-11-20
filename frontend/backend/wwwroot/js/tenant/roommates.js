/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, state, app, status, params, esc, money, link, reasons, empty, action } =
        window.CampusFeatureUI;
    async function roommates() {
        if (api.isDemo === false) return modernRoommates();
        document.title = 'Find your kind of people — Campus Mate';
        app.innerHTML = document.getElementById('roommates-page-template').innerHTML;
        function render() {
            const selected = api.selectedRoommate();
            document.getElementById('roommate-selection').innerHTML = selected
                ? '<section class="panel"><h2>Your chosen roommate: ' +
                  esc(selected.name) +
                  '</h2><p>You can include this person when submitting a rental request. You still choose whether to rent alone or together.</p><div class="row-actions"><a class="primary" href="properties.html">Choose a home</a><button class="secondary" id="clear-roommate">Clear selection</button></div></section>'
                : '';
            document.getElementById('clear-roommate')?.addEventListener('click', () => {
                api.chooseRoommate(null);
                render();
            });
            document.getElementById('contact-inbox').innerHTML = '';
            const query = document.getElementById('roommate-search').value.toLowerCase().trim(),
                smoking = document.getElementById('roommate-smoking').value;
            const people = state.roommates
                .filter(
                    (p) =>
                        `${p.name} ${p.area} ${p.occupation}`.toLowerCase().includes(query) &&
                        (!smoking || p.smoking === smoking)
                )
                .map((p) => ({ ...p, match: api.roommateMatch(p) }))
                .sort((a, b) =>
                    document.getElementById('roommate-sort').value === 'budget'
                        ? a.minBudget - b.minBudget
                        : b.match.score - a.match.score
                );
            document.getElementById('roommate-count').textContent =
                people.length + ' people to meet';
            document.getElementById('roommate-grid').innerHTML =
                people
                    .map((p) => {
                        return `<article class="feature-card"><div class="person-heading"><span class="avatar-circle">${esc(p.name[0])}</span><div><h3>${esc(p.name)}</h3><p>${esc(p.occupation)} · ${esc(p.area)}</p></div></div><p>${money(p.minBudget)}–${money(p.maxBudget)} · ${esc(p.destination)}</p>${reasons(p.match)}<p>${esc(p.sleep)} · ${esc(p.schedule)} · ${esc(p.smoking)}</p><div class="tags">${p.habits.map((h) => `<span>${esc(h)}</span>`).join('')}</div><div class="row-actions"><button class="secondary" data-choose-roommate="${esc(p.id)}" ${selected?.id === p.id ? 'disabled' : ''}>${selected?.id === p.id ? 'Selected ✓' : 'Choose for rental'}</button><a class="primary" data-roommate-meeting="${esc(p.id)}" href="messages.html?roommate=${encodeURIComponent(p.id)}">Book a meeting</a></div></article>`;
                    })
                    .join('') || empty('No roommates match these filters.');
            action('[data-choose-roommate]', (b) => {
                api.chooseRoommate(b.dataset.chooseRoommate);
                render();
            });

        }
        ['roommate-search', 'roommate-sort', 'roommate-smoking'].forEach((id) =>
            document
                .getElementById(id)
                .addEventListener(id === 'roommate-search' ? 'input' : 'change', render)
        );
        render();
    }
    async function modernRoommates() {
        app.innerHTML = document.getElementById('roommates-page-template').innerHTML;
        document.querySelector('.sample-note').textContent = 'Save people you would like to meet. Saved roommates appear first when choosing someone for a rental. Meetings do not require a rental invitation.';
        const propertyId = params.get('propertyId');
        const home = propertyId ? await api.getProperty(propertyId) : null;
        const plan = params.get('edit') ? await api.getRequest(params.get('edit')) : null;
        const info = document.getElementById('roommate-selection');
        if (home) info.innerHTML = `<section class="panel"><h2>Invite someone to ${esc(home.title)}</h2><p>${esc(params.get('startDate'))} · ${esc(params.get('duration'))} ${home.period === 'Daily' ? 'nights' : 'months'}</p><p>Whole-home rent: <strong>${money(plan?.agreedPrice ?? home.price)}</strong> / ${home.period === 'Daily' ? 'night' : 'month'} · Deposit: ${money(plan?.deposit ?? home.price)}.</p><p>The person you invite will see your name, this home and the full terms before accepting or declining.</p></section>`;
        function renderPeople() {
            const saved = state.savedRoommates || [];
            const query = document.getElementById('roommate-search').value.toLowerCase().trim();
            const smoking = document.getElementById('roommate-smoking').value;
            const people = state.roommates.filter(p => p.userId !== api.user().id && `${p.name} ${p.area} ${p.occupation}`.toLowerCase().includes(query) && (!smoking || p.smoking === smoking)).map(p => ({...p,match:api.roommateMatch(p)})).sort((a,b) => Number(saved.includes(b.id)) - Number(saved.includes(a.id)) || (document.getElementById('roommate-sort').value === 'budget' ? a.minBudget-b.minBudget : b.match.score-a.match.score));
            document.getElementById('roommate-count').textContent = people.length + ' people to meet · favorites first';
            document.getElementById('roommate-grid').innerHTML = people.map(p => `<article class="feature-card" data-roommate-card="${esc(p.id)}"><div class="person-heading"><span class="avatar-circle">${esc(p.name[0])}</span><div><h3>${esc(p.name)}</h3><p>${esc(p.occupation)} · ${esc(p.area)}</p></div></div><p>${money(p.minBudget)}–${money(p.maxBudget)} · ${esc(p.destination)}</p>${reasons(p.match)}<div class="row-actions"><button class="secondary" data-save-roommate="${esc(p.id)}" aria-pressed="${saved.includes(p.id)}">${saved.includes(p.id) ? '♥ Saved' : '♡ Save roommate'}</button><a class="secondary" href="messages.html?roommate=${encodeURIComponent(p.id)}">Book a meeting</a>${home ? `<button class="primary" data-invite-roommate="${esc(p.id)}">Invite to join this rental ↗</button>` : '<a class="primary" href="properties.html">Choose a home to invite ↗</a>'}</div></article>`).join('') || empty('No roommates match these filters.');
            action('[data-save-roommate]',async button => { await api.setRoommateFavorite(button.dataset.saveRoommate,!saved.includes(button.dataset.saveRoommate)); renderPeople(); });
            action('[data-invite-roommate]',button => {
                const query = new URLSearchParams({id:String(home.id),roommateId:button.dataset.inviteRoommate,startDate:params.get('startDate'),duration:params.get('duration'),message:params.get('message') || ''});
                if(params.get('edit')) query.set('edit',params.get('edit'));
                window.CampusNavigate('tenant/request.html?' + query);
            });
        }
        for(const id of ['roommate-search','roommate-sort','roommate-smoking']) document.getElementById(id).addEventListener(id === 'roommate-search' ? 'input' : 'change',renderPeople);
        renderPeople();
    }
    window.CampusFeatureUI.render({ roommates: roommates });
})();
