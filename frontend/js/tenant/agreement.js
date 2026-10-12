/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, esc, url, money, date, heading, progress, summary, bindForm, stageRequest } =
        window.CampusFlowUI;
    async function agreement() {
        const r = await stageRequest('approved');
        if (!r) return;
        app.innerHTML =
            heading(
                'Review your agreement',
                'Both parties confirm these sample terms before continuing.'
            ) +
            progress(r) +
            `<div class="flow-layout"><section class="panel"><form id="agreement-form"><div class="agreement-copy"><h2>Sample rental agreement</h2><p><strong>${esc(r.property.title)} · ${esc(r.property.area)}</strong></p><p>Landlord: ${esc(r.property.landlord)}<br>Tenant: ${esc(r.tenantName)}<br>${r.roommate ? 'Roommate: ' + esc(r.roommateName || api.state.roommates.find((p) => p.id === r.roommateId)?.name || 'Selected roommate') : 'Occupancy: renting alone'}</p><span class="badge">Landlord terms accepted ✓</span><h3>1. Rental period</h3><p>${date(r.startDate)} → ${date(r.endDate)} · ${r.duration} ${r.property.period === 'Daily' ? 'nights' : 'months'}.</p><h3>2. Rent and deposit</h3><p>Rent: ${money(r.property.price)} per ${r.property.period === 'Daily' ? 'night' : 'month'}. Security deposit: ${money(r.deposit)}. Quoted rent and deposit (paid directly): ${money(r.total)}.</p><p>The sample deposit is refundable subject to the agreed condition and outstanding charges.</p><h3>3. Condition and handover</h3><p>Review the pre-handover checklist, then record a move-in walkthrough after confirming the direct arrangement. At the end of your stay, record the move-out walkthrough and compare both reports.</p><h3>4. Sample terms</h3><p>The landlord and tenant agree final terms and pay rent and deposits directly. Campus Mate does not collect or verify rent or deposits. This preview records sample acceptance and does not create a real lease.</p></div><label class="check"><input type="checkbox" required>I read and accept this sample rental agreement.</label><button type="submit" class="primary full">Accept sample agreement & inspect ↗</button></form></section>${summary(r.property, r)}</div>`;
        bindForm('agreement-form', async () => {
            await api.signAgreement(r.id);
            window.CampusNavigate(url('inspection', r.id));
        });
    }
    window.CampusFlowUI.render({ agreement: agreement });
})();
