/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, params, esc, url, money, date, heading, summary, bindForm } =
        window.CampusFlowUI;
    async function request() {
        const p = await api.getProperty(params.get('id') || 124),
            today = window.CampusToday();
        app.innerHTML =
            heading(
                'Rental request',
                'Introduce yourself and choose the dates for your next chapter.'
            ) +
            `<div class="flow-layout"><section class="panel"><form id="request-form"><div class="form-row"><label class="field">Start date<input type="date" name="startDate" data-regex="date" required min="${today}" value="${p.availableFrom > today ? p.availableFrom : today}"></label><label class="field">Duration (${p.period === 'Daily' ? 'nights' : 'months'})<select name="duration">${(p.period === 'Daily' ? [1, 3, 7, 14, 30] : [3, 6, 12]).map((n) => `<option value="${n}" ${n === 6 ? 'selected' : ''}>${n} ${p.period === 'Daily' ? 'nights' : 'months'}</option>`).join('')}</select></label></div><p>Rental type: ${p.period} · Available until ${date(p.availableTo)}</p><label class="field">Who will live in the home?<select name="roommateChoice" id="roommate-choice"><option value="alone">I will rent alone</option><option value="with">I will rent with a roommate</option></select></label><label class="field" id="roommate-field" hidden>Choose your roommate<select name="roommateId" id="request-roommate" disabled><option value="">Choose a person</option>${api.state.roommates
                .filter((person) => person.id !== api.user().id)
                .map(
                    (person) =>
                        `<option value="${esc(person.id)}" ${api.selectedRoommate()?.id === person.id ? 'selected' : ''}>${esc(person.name)} · ${esc(person.area)}</option>`
                )
                .join(
                    ''
                )}</select><small>You choose the person yourself. <a href="roommates.html">Browse roommate profiles</a></small></label><label class="field">Message to the landlord<textarea name="message" data-regex="text" required maxlength="2000" placeholder="Introduce yourself and your plans."></textarea></label><p>Your preview contact details and request will appear in the landlord dashboard.</p><div class="request-total"><span>Quoted rent + deposit<small>Paid directly to landlord</small></span><strong id="request-total"></strong></div><button type="submit" class="primary full">Send rental request ↗</button></form></section>${summary(p, null)}</div>`;
        const duration = document.querySelector('[name=duration]');
        const updateTotal = () => {
            const total = money(
                p.price * (p.period === 'Daily' ? Number(duration.value) : 1) + p.price
            );
            document.getElementById('summary-total').textContent = total;
            document.getElementById('request-total').textContent = total;
        };
        duration.addEventListener('change', updateTotal);
        updateTotal();
        const choice = document.getElementById('roommate-choice'),
            roommateField = document.getElementById('roommate-field'),
            roommateSelect = document.getElementById('request-roommate');
        const toggleRoommate = () => {
            const together = choice.value === 'with';
            roommateField.hidden = !together;
            roommateSelect.disabled = !together;
            roommateSelect.required = together;
        };
        choice.addEventListener('change', toggleRoommate);
        toggleRoommate();
        bindForm('request-form', async (data) => {
            const r = await api.createRequest({
                propertyId: p.id,
                startDate: data.get('startDate'),
                duration: Number(data.get('duration')),
                roommate: data.get('roommateChoice') === 'with',
                roommateId: data.get('roommateChoice') === 'with' ? data.get('roommateId') : null,
                message: String(data.get('message')).trim()
            });
            window.CampusNavigate(url('requests', r.id));
        });
    }
    window.CampusFlowUI.render({ request: request });
})();
