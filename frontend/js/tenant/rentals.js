/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, status, esc, photo, url, money, date, demo, heading, action, empty, summary, bindForm } =
        window.CampusFlowUI;
    function agreementCard(r) { return `<div class="flow-layout"><section class="panel"><form id="agreement-${esc(r.id)}"><div class="agreement-copy"><h2>Sample rental agreement</h2><p><strong>${esc(r.property.title)} · ${esc(r.property.area)}</strong></p><p>Landlord: ${esc(r.property.landlord)}<br>Tenant: ${esc(r.tenantName)}<br>${r.roommate ? 'Roommate: ' + esc(r.roommateName || api.state.roommates.find((p) => p.id === r.roommateId)?.name || 'Selected roommate') : 'Occupancy: renting alone'}</p><span class="badge">Landlord terms accepted ✓</span><h3>1. Rental period</h3><p>${date(r.startDate)} → ${date(r.endDate)} · ${r.duration} ${r.property.period === 'Daily' ? 'nights' : 'months'}.</p><h3>2. Rent and deposit</h3><p>Rent: ${money(r.agreedPrice ?? r.property.price)} per ${r.property.period === 'Daily' ? 'night' : 'month'}. Security deposit: ${money(r.deposit)}. Quoted rent and deposit (paid directly): ${money(r.total)}.</p><p>The sample deposit is refundable subject to the agreed condition and outstanding charges.</p><h3>3. Condition and handover</h3><p>Review the pre-handover checklist, then record a move-in walkthrough after confirming the direct arrangement. At the end of your stay, record the move-out walkthrough and compare both reports.</p><h3>4. Sample terms</h3><p>The landlord and tenant agree final terms and pay rent and deposits directly. Campus Mate does not collect or verify rent or deposits. This preview records sample acceptance and does not create a real lease.</p></div>${r.negotiation?.status === 'pending' ? '<p class="notice">A proposed rent is awaiting landlord confirmation. Review it in your profile before accepting.</p>' : ''}${r.tenantAccepted ? '<p class="badge">Agreement accepted ✓</p>' : `<label class="check"><input type="checkbox" required>I read and accept this sample rental agreement.</label><button type="submit" class="primary full" ${r.negotiation?.status === 'pending' ? 'disabled' : ''}>Accept sample agreement & inspect ↗</button>`}</form></section>${summary(r.property, r)}</div>`; }
    async function rentals() {
        const items = await api.getRentals();
        const requests = (await api.getRequests()).filter((r) => ['approved', 'inspection', 'payment'].includes(r.status));
        if (!items.length && !requests.length)
            return empty('My rentals & arrangements', 'Accepted requests, rental arrangements and active stays will appear here');
        app.innerHTML =
            heading(
                'My rentals & arrangements',
                'Your accepted requests, arrangements, agreements and rental stays in one place.'
            ) +
            '<div class="rental-overview" aria-label="Rental overview"><span>' + requests.length + ' arrangements in progress</span><span>' + items.filter((item) => item.status === 'active').length + ' active rentals</span><span>' + items.filter((item) => item.status === 'closed').length + ' completed stays</span></div>' +
            requests.map((r) => '<section class="panel rental-pending"><span class="badge">' + esc({approved:'Agreement ready', inspection:'Inspection pending', payment:'Confirm direct arrangement'}[r.status]) + '</span><h2>' + esc(r.property.title) + '</h2><p>' + date(r.startDate) + ' → ' + date(r.endDate) + ' · ' + money(r.total) + ' quoted rent and deposit · paid directly</p>' + (r.status === 'approved' ? agreementCard(r) : '<details><summary>View accepted agreement</summary>' + agreementCard(r) + '</details><p>Your agreement is accepted. Continue the next step to activate your rental.</p><a class="primary" href="' + url(r.status === 'inspection' ? 'inspection' : 'payment', r.id) + '">Continue rental setup ↗</a>') + '</section>').join('') +
            items
                .map((item) => {
                    const r = item.request;
                    return `<section class="panel rental-card"><img src="${photo(r.property, 600)}" alt="${esc(r.property.title)}"><div><span class="badge">${item.status === 'closed' ? 'Rental closed' : item.moveInComplete ? 'Moved in' : 'Active rental · Move-in pending'}</span><h2>${esc(r.property.title)}</h2><p>${esc(r.property.area)} · ${esc(r.property.landlord)}</p><dl class="summary-list"><div><dt>Lease dates</dt><dd>${date(r.startDate)} → ${date(item.endDate)}</dd></div><div><dt>Duration</dt><dd>${r.duration} ${r.property.period === 'Daily' ? 'nights' : 'months'}</dd></div><div><dt>Rent</dt><dd>${money(r.agreedPrice ?? r.property.price)}</dd></div><div><dt>Security deposit</dt><dd>${money(r.deposit)}</dd></div><div><dt>Quoted rent + deposit</dt><dd>${money(r.total)}</dd></div></dl><div class="row-actions"><button class="secondary" data-document="${item.id}">Agreement & checklist</button><a class="secondary" href="messages.html?owner=${r.propertyId}">Book a meeting</a><a class="primary" href="${url('condition', item.id)}">Condition reports ↗</a></div></div></section><div class="flow-layout"><section class="panel"><h2>Direct rental payment</h2><p>Agree rent and deposit payments directly with your landlord. Campus Mate does not collect or verify these payments and does not issue rental receipts. Ask your landlord for a receipt.</p><h3>Video documentation</h3><div class="report-row"><span>Move-in report</span><span>${item.conditions.initial ? 'Recorded ✓' : 'Not recorded'}</span></div><div class="report-row"><span>Move-out report</span><span>${item.conditions.final ? 'Recorded ✓' : 'Not recorded'}</span></div><a class="secondary full" href="${url('condition', item.id)}&phase=${item.conditions.initial ? 'final' : 'initial'}">${item.conditions.initial ? 'Record move-out & compare' : 'Record move-in walkthrough'}</a></section><section class="panel"><h2>Moving in</h2><p>Agree a handover date, inspect the space and collect your keys.</p><div class="notice">${item.status === 'closed' ? 'Rental complete · final comparison available' : item.moveInComplete ? '✓ Keys received · Move-in confirmed' : '1. Agree a date<br>2. Check the apartment<br>3. Receive keys & confirm'}</div>${!item.moveInComplete && item.status !== 'closed' ? `<label class="check"><input type="checkbox" id="keys-${item.id}">I received the keys and checked the apartment.</label><button class="primary full" data-move="${item.id}">Confirm move-in</button>` : ''}</section></div>`;
                })
                .join('') +
            '<dialog id="rental-document"><button class="close" id="close-document" aria-label="Close">×</button><div id="document-copy"></div></dialog>';
        app.insertAdjacentHTML('beforeend', '<p><a class="secondary" href="sublets.html">Open Partial rentals page ↗</a></p>');
        requests.filter((r) => r.status === 'approved').forEach((r) => bindForm('agreement-' + r.id, async () => {
            await api.signAgreement(r.id);
            window.CampusNavigate(url('inspection', r.id));
        }));
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
                    `${agreementCard(r)}<h2>Agreement & checklist</h2><p>${esc(r.property.title)} · ${date(r.startDate)} → ${date(r.endDate)}</p><p>Landlord: ${esc(r.property.landlord)}<br>Tenant: ${esc(r.tenantName)}</p><p>Rent: ${money(r.agreedPrice ?? r.property.price)} · Deposit: ${money(r.deposit)}</p><p>Accepted by landlord ${r.landlordAccepted ? '✓' : '—'} · Accepted by tenant ${r.tenantAccepted ? '✓' : '—'}</p><h3>pre-handover condition</h3>${(r.inspection?.items || []).map((i) => `<div class="report-row"><span>${esc(i.name)}</span><span>${esc(i.condition)}</span></div>`).join('')}<p>${esc(r.inspection?.notes || 'No additional notes.')}</p>${demo}`;
                document.getElementById('rental-document').showModal();
            })
        );
        document
            .getElementById('close-document')
            .addEventListener('click', () => document.getElementById('rental-document').close());

    }
    window.CampusFlowUI.render({ rentals: rentals });
})();
