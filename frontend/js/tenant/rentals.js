/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, status, esc, photo, url, money, date, demo, heading, action, empty } =
        window.CampusFlowUI;
    async function rentals() {
        const items = await api.getRentals();
        if (!items.length)
            return empty('My rentals', 'Your rentals will appear here after confirming the direct arrangement');
        const sublets = await api.getSubletListings();
        const subletRequests = await api.getSubletRequests();
        app.innerHTML =
            heading(
                'My rentals',
                'Your dates, direct arrangements and condition reports in one place.'
            ) +
            items
                .map((item) => {
                    const r = item.request;
                    return `<section class="panel rental-card"><img src="${photo(r.property, 600)}" alt="${esc(r.property.title)}"><div><span class="badge">${item.status === 'closed' ? 'Rental closed' : item.moveInComplete ? 'Moved in' : 'Active rental · Move-in pending'}</span><h2>${esc(r.property.title)}</h2><p>${esc(r.property.area)} · ${esc(r.property.landlord)}</p><dl class="summary-list"><div><dt>Lease dates</dt><dd>${date(r.startDate)} → ${date(item.endDate)}</dd></div><div><dt>Duration</dt><dd>${r.duration} ${r.property.period === 'Daily' ? 'nights' : 'months'}</dd></div><div><dt>Rent</dt><dd>${money(r.property.price)}</dd></div></dl><div class="row-actions"><button class="secondary" data-document="${item.id}">Agreement & checklist</button><a class="secondary" href="messages.html?owner=${r.propertyId}">Book a meeting</a><a class="primary" href="${url('condition', item.id)}">Condition reports ↗</a></div></div></section><div class="flow-layout"><section class="panel"><h2>Direct rental payment</h2><p>Agree rent and deposit payments directly with your landlord. Campus Mate does not collect or verify these payments and does not issue rental receipts. Ask your landlord for a receipt.</p><h3>Video documentation</h3><div class="report-row"><span>Move-in report</span><span>${item.conditions.initial ? 'Recorded ✓' : 'Not recorded'}</span></div><div class="report-row"><span>Move-out report</span><span>${item.conditions.final ? 'Recorded ✓' : 'Not recorded'}</span></div><a class="secondary full" href="${url('condition', item.id)}&phase=${item.conditions.initial ? 'final' : 'initial'}">${item.conditions.initial ? 'Record move-out & compare' : 'Record move-in walkthrough'}</a></section><section class="panel"><h2>Moving in</h2><p>Agree a handover date, inspect the space and collect your keys.</p><div class="notice">${item.status === 'closed' ? 'Rental complete · final comparison available' : item.moveInComplete ? '✓ Keys received · Move-in confirmed' : '1. Agree a date<br>2. Check the apartment<br>3. Receive keys & confirm'}</div>${!item.moveInComplete && item.status !== 'closed' ? `<label class="check"><input type="checkbox" id="keys-${item.id}">I received the keys and checked the apartment.</label><button class="primary full" data-move="${item.id}">Confirm move-in</button>` : ''}</section></div>`;
                })
                .join('') +
            '<dialog id="rental-document"><button class="close" id="close-document" aria-label="Close">×</button><div id="document-copy"></div></dialog>';
        app.insertAdjacentHTML('beforeend', '<p><a class="secondary" href="sublets.html">Open Partial rentals page ↗</a></p>');
        document.querySelectorAll('[data-move]').forEach((button) =>
            button.addEventListener('click', () =>
                action(button, async () => {
                    if (!document.getElementById('keys-' + button.dataset.move).checked)
                        throw Error(
                            'Confirm that you received the keys and checked the apartment.'
                        );
                    await api.completeMoveIn(button.dataset.move);
                    await rentals();
                })
            )
        );
        document.querySelectorAll('[data-document]').forEach((button) =>
            button.addEventListener('click', () => {
                const r = items.find((i) => i.id === button.dataset.document).request;
                document.getElementById('document-copy').innerHTML =
                    `<h2>Sample agreement & checklist</h2><p>${esc(r.property.title)} · ${date(r.startDate)} → ${date(r.endDate)}</p><p>Landlord: ${esc(r.property.landlord)}<br>Tenant: ${esc(r.tenantName)}</p><p>Rent: ${money(r.property.price)} · Deposit: ${money(r.deposit)}</p><p>Accepted by landlord ${r.landlordAccepted ? '✓' : '—'} · Accepted by tenant ${r.tenantAccepted ? '✓' : '—'}</p><h3>pre-handover condition</h3>${r.inspection.items.map((i) => `<div class="report-row"><span>${esc(i.name)}</span><span>${esc(i.condition)}</span></div>`).join('')}<p>${esc(r.inspection.notes || 'No additional notes.')}</p>${demo}`;
                document.getElementById('rental-document').showModal();
            })
        );
        document
            .getElementById('close-document')
            .addEventListener('click', () => document.getElementById('rental-document').close());

    }
    function subletFeature(items, sublets, subletRequests) {
        const active = items.filter((item) => item.status === 'active');
        if (!active.length) return '';
        const listingCards = sublets.length
            ? `<div class="tile-grid">${sublets.map((item) => `<article class="feature-card"><span class="badge">${item.status === 'published' ? 'Published' : 'Awaiting JD 5 fee'}</span><h3>${esc(item.roomLabel)} · ${item.occupancy === 'private' ? 'Private' : 'Shared'}</h3><p>${esc(item.propertyTitle)} · ${item.duration} day${item.duration === 1 ? '' : 's'} · ${money(item.price)}/day</p><p>${esc(item.notes || 'No additional notes.')}</p>${item.status === 'awaiting-fee' ? `<button class="primary" data-sublet-pay="${item.id}">Pay JD 5 & publish</button>` : `<button class="secondary" data-sublet-edit="${item.id}">Edit offer</button>`}</article>`).join('')}</div>`
            : '<p>No short-term room offers yet.</p>';
        const roomOptions = (property) => Array.from({ length: Math.max(1, Number(property.beds) || 1) }, (_, i) => `<option value="${i + 1}">Room ${i + 1}</option>`).join('');
        const requests = subletRequests.length ? `<h3>Partial rental requests</h3><div class="request-list">${subletRequests.map((item) => { const owner = item.ownerTenantId === api.user().id; const person = owner ? item.tenantName : item.ownerTenantName; return `<article class="request-row"><div><span class="badge">${esc(item.status)}</span><h3>${esc(person)}</h3><p>${owner ? esc(item.tenantEmail) : 'Your request'} · Starts ${esc(item.startDate)} · ${item.duration} days</p></div>${owner && item.status === 'pending' ? `<div class="row-actions"><button class="primary" data-sublet-review="${item.id}" data-approved="true">Accept</button><button class="secondary" data-sublet-review="${item.id}" data-approved="false">Decline</button></div>` : ''}${item.status === 'approved' ? `<form class="sublet-meeting-form" data-sublet-meeting-form="${item.id}"><input name="date" type="date" required><input name="time" type="time" required><button class="secondary" type="submit">Arrange meeting</button><p role="status"></p></form>` : ''}</article>`; }).join('')}</div>` : '<p>No partial rental requests yet.</p>';
        return `<section class="panel sublet-panel"><div class="page-heading"><div><span class="eyebrow">TENANT-TO-TENANT</span><h2>Offer your rented room short-term</h2><p>Rent the room privately or share it with another verified tenant for 1 day to 1 month.</p></div><span class="badge">Unlocked with an active rental</span></div><div class="notice">Only rooms and home details from your active rental can be offered. A simulated JD 5 publishing fee is required before the offer is visible. You review and accept every request.</div><form id="sublet-form"><div class="form-grid"><label class="field">Rented home<select name="rentalId" required>${active.map((item) => `<option value="${item.id}" data-rooms="${Math.max(1, Number(item.request.property.beds) || 1)}">${esc(item.request.property.title)} · ${esc(item.request.property.area)}</option>`).join('')}</select></label><label class="field">Room<select name="roomNumber" required>${roomOptions(active[0].request.property)}</select></label><label class="field">Occupancy<select name="occupancy" required><option value="private">Private room</option><option value="shared">Shared room</option></select></label><label class="field">Duration in days<input name="duration" type="number" min="1" max="30" value="7" required><small>1–30 days</small></label><label class="field">Daily price (JD)<input name="price" type="number" min="1" step="0.5" required placeholder="10"></label></div><label class="field">Notes<textarea name="notes" maxlength="500" placeholder="Describe the room, included amenities or house rules."></textarea></label><button class="primary" type="submit">Continue to JD 5 payment</button><p id="sublet-status" role="status"></p></form><h3>Your room offers</h3>${listingCards}${requests}</section>`;
    }
    function bindSubletFeature() {
        const form = document.getElementById('sublet-form');
        const roomSelect = form?.elements.roomNumber;
        form?.elements.rentalId.addEventListener('change', (event) => {
            const rooms = Number(event.target.selectedOptions[0].dataset.rooms) || 1;
            roomSelect.innerHTML = Array.from({ length: rooms }, (_, i) => `<option value="${i + 1}">Room ${i + 1}</option>`).join('');
        });
        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const message = document.getElementById('sublet-status');
            try {
                const listing = await api.createSubletListing(Object.fromEntries(new FormData(form)));
                await api.paySubletListingFee(listing.id);
                message.textContent = 'JD 5 paid in preview. Your room offer is now published to verified tenants.';
                await rentals();
            } catch (error) { message.textContent = error.message; }
        });
        document.querySelectorAll('[data-sublet-pay]').forEach((button) =>
            button.addEventListener('click', async () => {
                try { await api.paySubletListingFee(button.dataset.subletPay); await rentals(); }
                catch (error) { status.textContent = error.message; }
            })
        );
        document.querySelectorAll('[data-sublet-review]').forEach((button) =>
            button.addEventListener('click', async () => {
                try {
                    await api.reviewSubletRequest(button.dataset.subletReview, button.dataset.approved === 'true');
                    await rentals();
                } catch (error) { status.textContent = error.message; }
            })
        );
        document.querySelectorAll('[data-sublet-edit]').forEach((button) =>
            button.addEventListener('click', async () => {
                const listing = sublets.find((item) => item.id === button.dataset.subletEdit);
                const price = prompt('Daily price (JD)', listing.price);
                if (price === null) return;
                const duration = prompt('Duration in days (1-30)', listing.duration);
                if (duration === null) return;
                const notes = prompt('Notes', listing.notes || '');
                try { await api.editSubletListing(listing.id, { price, duration, notes }); await rentals(); }
                catch (error) { status.textContent = error.message; }
            })
        );
        document.querySelectorAll('[data-sublet-meeting-form]').forEach((form) =>
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const data = new FormData(form);
                try {
                    await api.createMeeting({ kind: 'sublet', targetId: form.dataset.subletMeetingForm, title: 'Partial rental meeting', startsAt: new Date(`${data.get('date')}T${data.get('time')}:00+03:00`).toISOString(), duration: 30 });
                    form.querySelector('[role="status"]').textContent = 'Meeting invitation sent.';
                } catch (error) { form.querySelector('[role="status"]').textContent = error.message; }
            })
        );
    }
    window.CampusFlowUI.render({ rentals: rentals });
})();
