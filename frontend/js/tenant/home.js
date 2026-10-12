'use strict';
(async () => {
    const api = window.CampusAPI;
    const esc = (value) =>
        String(value ?? '').replace(
            /[&<>"']/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
        );
    const listings = (await api.getProperties())
        .map((p) => ({ ...p, tags: [p.furnished, p.type], match: api.propertyMatch(p) }))
        .sort((a, b) => b.match.score - a.match.score);
    let saved = window.CampusState.saved;
    let preferences = {};
    preferences = api.profile();
    if (window.CampusState.firstName)
        document.getElementById('user-name').textContent = ', ' + window.CampusState.firstName;
    document.getElementById('year').textContent = new Date().getFullYear();
    const profile = document.getElementById('profile');
    const profileRows = [
        [
            'Budget',
            preferences.minBudget != null
                ? `JD ${preferences.minBudget} – ${preferences.maxBudget}`
                : 'JD 150 – 200'
        ],
        [
            'Areas',
            Array.isArray(preferences.areas) && preferences.areas.length
                ? preferences.areas.join(', ')
                : 'Jubeiha, Shafa Badran, Sweileh'
        ],
        ['Work / study', preferences.destination || 'University of Jordan'],
        [
            'Lifestyle',
            [
                preferences.sleep || 'Quiet evenings',
                preferences.cleanliness != null
                    ? `Tidiness ${preferences.cleanliness}/5`
                    : 'Very tidy'
            ].join(', ')
        ],
        ['Smoking', preferences.smoking || 'Non-smoker'],
        [
            'Housing',
            [preferences.furnishing || 'Furnished', preferences.housing || 'Apartment'].join(' ')
        ]
    ];
    profileRows.forEach(([label, value]) => {
        const row = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        profile.append(row);
    });
    let period = 'All';
    let favoritesOnly = false;
    const search = document.getElementById('search');
    function render() {
        const query = search.value.trim().toLowerCase();
        const filtered = listings.filter(
            (item) =>
                (period === 'All' || item.period === period) &&
                (!favoritesOnly || saved.includes(item.id)) &&
                `${item.title} ${item.area}`.toLowerCase().includes(query)
        );
        document.getElementById('property-grid').innerHTML = filtered
            .map(
                (item) =>
                    `<article class="property"><div class="photo"><a href="property.html?id=${encodeURIComponent(item.id)}"><img src="${api.photo(item, 800)}" alt="${esc(item.title)} interior" loading="lazy"></a><span class="period">${esc(item.period)}</span><button class="save" data-save="${esc(item.id)}" aria-pressed="${saved.includes(item.id)}" aria-label="Save ${esc(item.title)}">${saved.includes(item.id) ? '♥' : '♡'}</button></div><div class="property-info"><h3><a href="property.html?id=${encodeURIComponent(item.id)}">${esc(item.title)} ↗</a></h3><p>⌖ ${esc(item.area)}</p><span class="price">JD ${Number(item.price)} <small>/ ${item.period === 'Daily' ? 'night' : 'month'}</small></span><span class="score-pill">${item.match.score}% compatibility</span><div class="score-reasons">${item.match.reasons
                        .filter((r) => r.matched)
                        .slice(0, 3)
                        .map((r) => `<span class="matched">✓ ${r.text}</span>`)
                        .join(
                            ''
                        )}</div><div class="tags">${item.tags.map((tag) => `<span>✓ ${esc(tag)}</span>`).join('')}</div></div><div class="property-foot">${item.period === 'Daily' ? '◷ Flexible short stays' : '☀ Explore a place that fits you'}</div></article>`
            )
            .join('');
        document.getElementById('empty').hidden = filtered.length > 0;
        document.getElementById('listing-status').textContent =
            `${filtered.length} ${favoritesOnly ? 'saved' : api.isDemo ? 'sample' : 'available'} homes`;
    }
    search.addEventListener('input', render);
    document.addEventListener('keydown', (event) => {
        if (
            event.key === '/' &&
            !event.ctrlKey &&
            !event.metaKey &&
            !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
        ) {
            event.preventDefault();
            search.focus();
        }
    });
    document.querySelectorAll('[data-period]').forEach((button) =>
        button.addEventListener('click', () => {
            period = button.dataset.period;
            document.querySelectorAll('[data-period]').forEach((item) => {
                const active = item === button;
                item.classList.toggle('selected', active);
                item.setAttribute('aria-pressed', String(active));
            });
            render();
        })
    );
    document.getElementById('favorites').addEventListener('click', (event) => {
        favoritesOnly = !favoritesOnly;
        event.currentTarget.classList.toggle('active', favoritesOnly);
        event.currentTarget.setAttribute('aria-pressed', String(favoritesOnly));
        document.getElementById('properties').scrollIntoView();
        render();
    });
    document.getElementById('property-grid').addEventListener('click', async (event) => {
        const button = event.target.closest('[data-save]');
        if (!button) return;
        const id = listings.find((item) => String(item.id) === button.dataset.save)?.id;
        if (id == null) return;
        try {
            button.disabled = true;
            await api.setFavorite(id, !saved.includes(id));
            saved = api.state.saved;
            render();
        } catch (error) {
            document.getElementById('listing-status').textContent = error.message;
        } finally {
            button.disabled = false;
        }
    });
    const dialog = document.getElementById('dialog');
    function openDialog(title, content) {
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-body').innerHTML = content;
        dialog.showModal();
    }
    document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
    let rentalDestination = 'properties.html';
    document
        .getElementById('review')
        .addEventListener('click', () => window.CampusNavigate(rentalDestination));
    document
        .getElementById('message-landlord')
        .addEventListener('click', () =>
            window.CampusNavigate('messages.html?owner=' + (current?.propertyId || 124))
        );
    document
        .querySelectorAll('[data-person]')
        .forEach((button) =>
            button.addEventListener('click', () => window.CampusNavigate('roommates.html'))
        );

    render();
    const requests = await api.getRequests();
    const current =
        requests.find((r) =>
            ['submitted', 'approved', 'inspection', 'payment'].includes(r.status)
        ) || requests[0];
    const rental = document.getElementById('rental');
    rental.hidden = false;
    if (!current) {
        document.getElementById('rental-title').textContent =
            'Your next chapter starts with a place';
        document.getElementById('rental-description').textContent =
            'Explore homes and send a request. Your rental progress will appear here.';
        rental.querySelector('.eyebrow').textContent = 'YOUR RENTAL JOURNEY';
        rental.querySelector('dl').hidden = true;
        rental.querySelector('.timeline').hidden = true;
        document.getElementById('message-landlord').hidden = true;
        document.getElementById('review').textContent = 'Find a place ↗';
    } else {
        const descriptions = {
            submitted: 'Your request was sent. Waiting for the landlord to review it.',
            approved: 'The landlord approved your request. Review your agreement to continue.',
            inspection: 'Your agreement is accepted. Check and document the apartment condition.',
            payment: 'Your condition report is saved. Confirm your direct arrangement with the landlord.',
            active: 'Your rental is active. Arrange handover and confirm receipt of your keys.'
        };
        const destinations = {
            submitted: 'requests',
            approved: 'agreement',
            inspection: 'inspection',
            payment: 'payment',
            active: 'rentals',
            closed: 'rentals',
            rejected: 'requests'
        };
        rentalDestination = `${destinations[current.status] || 'requests'}.html?id=${encodeURIComponent(current.id)}`;
        document.getElementById('rental-title').textContent =
            `${current.property.title}, ${current.property.area}`;
        document.getElementById('rental-description').textContent =
            descriptions[current.status] || 'View your request for the latest update.';
        rental.querySelector('.eyebrow').textContent = api.isDemo
            ? 'ACTIVE APPLICATION · DEMO'
            : 'ACTIVE APPLICATION';
        const values = [
            current.startDate,
            `${current.duration} ${current.property.period === 'Daily' ? 'nights' : 'months'}`,
            `JD ${current.property.price}`
        ];
        rental.querySelectorAll('dd').forEach((item, index) => (item.textContent = values[index]));
        const stageIndex = ['submitted', 'approved', 'inspection', 'payment', 'active'].indexOf(
            current.status
        );
        rental.querySelector('.timeline').innerHTML = [
            'Landlord review',
            'Agreement',
            'Condition report',
            'Direct arrangement',
            'Move-in check'
        ]
            .map(
                (label, index) =>
                    `<li class="${index < stageIndex ? 'done' : index === stageIndex ? 'current' : ''}" ${index === stageIndex ? 'aria-current="step"' : ''}><span class="step">${index < stageIndex ? '✓' : index + 1}</span><strong>${label}</strong><small>${index < stageIndex ? 'Completed' : index === stageIndex ? 'Current step' : 'Upcoming'}</small></li>`
            )
            .join('');
        document.getElementById('review').textContent =
            current.status === 'submitted' ? 'View request ↗' : 'Continue rental ↗';
        if (current.status === 'active') {
            const rentals = await api.getRentals();
            const activeRental = rentals.find((item) => item.request.id === current.id);
            if (activeRental?.moveInComplete) {
                document.getElementById('rental-description').textContent =
                    'Your rental is active and your move-in is confirmed. Welcome to your new place.';
                rental.querySelectorAll('.timeline li').forEach((item) => {
                    item.className = 'done';
                    item.removeAttribute('aria-current');
                    item.querySelector('.step').textContent = '✓';
                    item.querySelector('small').textContent = 'Completed';
                });
            }
        }
    }
    document.querySelector('.preview').textContent =
        'Frontend demo · Matching uses your preferences';
    const roommatesSection = document.getElementById('roommates');
    roommatesSection.innerHTML =
        '<div class="section-heading"><div><h2>Roommates for you</h2><p>Compatibility based on budget, sleep, work, noise, cleanliness and smoking.</p></div><a href="roommates.html">Explore people ↗</a></div>' +
        api.state.roommates
            .map((person) => ({ person, match: api.roommateMatch(person) }))
            .sort((a, b) => b.match.score - a.match.score)
            .map(
                ({ person, match }) =>
                    '<article class="person"><span class="avatar">' +
                    esc(person.name[0]) +
                    '</span><div><h3>' +
                    esc(person.name) +
                    ' <small>· ' +
                    esc(person.occupation) +
                    '</small></h3><p>' +
                    esc(person.area) +
                    ' · ' +
                    match.score +
                    '% compatibility</p></div><a class="contact" href="roommates.html">Meet them ↗</a></article>'
            )
            .join('');
    const messagesPanel = document.getElementById('messages');
    messagesPanel.innerHTML =
        '<h2>Stay connected</h2><p>Book a video meeting with a landlord or your future roommate.</p><a class="secondary" href="messages.html">View meetings ↗</a>';
})().catch((error) => {
    const message = document.createElement('p');
    message.className = 'note';
    message.setAttribute('role', 'alert');
    message.textContent = `Could not load the dashboard: ${error.message}`;
    document.querySelector('main').prepend(message);
});
