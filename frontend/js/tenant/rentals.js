/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, status, esc, photo, url, money, date, demo, heading, action, empty } =
        window.CampusFlowUI;
    async function rentals() {
        const items = await api.getRentals();
        if (!items.length)
            return empty('My rentals', 'Your rentals will appear here after confirming the direct arrangement');
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
    window.CampusFlowUI.render({ rentals: rentals });
})();
