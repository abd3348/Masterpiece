/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, esc, photo, url, heading, progress, bindForm, stageRequest } =
        window.CampusFlowUI;
    async function inspection() {
        const r = await stageRequest('inspection');
        if (!r) return;
        app.innerHTML =
            heading(
                'Check the apartment',
                'Review the condition and document anything that needs attention.'
            ) +
            progress(r) +
            `<div class="notice">This pre-handover checklist is followed by video documentation after the rental activates.</div><div class="flow-layout"><div><section class="panel"><h2>A first look at your new home</h2><img class="walkthrough" src="${photo(r.property)}" alt="${esc(r.property.title)} interior"></section><section class="panel"><h2>Tips for a clear report</h2><p>✓ Check each room, doors and windows.</p><p>✓ Inspect walls, floors, water fittings and appliances.</p><p>✓ Record existing damage for the handover.</p></section></div><section class="panel"><form id="inspection-form"><h2>pre-handover condition checklist</h2>${['Walls', 'Floors', 'Doors and windows', 'Furniture', 'Water fittings', 'Appliances'].map((name, i) => `<label class="report-row">${name}<select name="condition${i}" aria-label="${name} condition"><option>Good</option><option>Needs attention</option></select></label>`).join('')}<label class="field">Damage or maintenance notes<textarea name="notes" data-regex="text" maxlength="3000" placeholder="Describe any existing damage."></textarea></label><label class="check"><input type="checkbox" required>I reviewed the condition checklist.</label><button class="primary full" type="submit">Save checklist & confirm arrangement ↗</button></form></section></div>`;
        bindForm('inspection-form', async (data) => {
            await api.saveInspection(r.id, {
                items: [
                    'Walls',
                    'Floors',
                    'Doors and windows',
                    'Furniture',
                    'Water fittings',
                    'Appliances'
                ].map((name, i) => ({ name, condition: data.get('condition' + i) })),
                notes: data.get('notes')
            });
            window.CampusNavigate(url('payment', r.id));
        });
    }
    window.CampusFlowUI.render({ inspection: inspection });
})();
