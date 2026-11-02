/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, state, app, status, esc, money, link, reasons, empty, action } =
        window.CampusFeatureUI;
    async function roommates() {
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
    window.CampusFeatureUI.render({ roommates: roommates });
})();
