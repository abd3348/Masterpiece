/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, params, esc, url, money, date, heading, summary, bindForm } =
        window.CampusFlowUI;
    async function request() {
        if (api.isDemo === false) return modernRequest();
        const p = await api.getProperty(params.get('id') || 124),
            today = window.CampusToday();
        app.innerHTML =
            heading(
                'Rental request',
                'Introduce yourself and choose the dates for your next chapter.'
            ) +
            `<div class="flow-layout"><section class="panel"><form id="request-form"><div class="form-row"><label class="field">Start date<input type="date" name="startDate" data-regex="date" required min="${today}" value="${p.availableFrom > today ? p.availableFrom : today}"></label><label class="field">Duration (${p.period === 'Daily' ? 'nights' : 'months'})<select name="duration">${(p.period === 'Daily' ? [1, 3, 7, 14, 30] : [3, 6, 12]).map((n) => `<option value="${n}" ${n === 6 ? 'selected' : ''}>${n} ${p.period === 'Daily' ? 'nights' : 'months'}</option>`).join('')}</select></label></div><p>Rental type: ${p.period} · Available until ${date(p.availableTo)}</p><label class="field">Who will live in the home?<select name="roommateChoice" id="roommate-choice"><option value="alone">I will rent alone</option><option value="with">I will rent with a roommate</option></select></label><label class="field" id="roommate-field" hidden>Choose your roommate<select name="roommateId" id="request-roommate" disabled><option value="">Choose a person</option>${api.state.roommates
                .filter((person) => person.id !== api.user().id && person.userId !== api.user().id)
                .map(
                    (person) =>
                        `<option value="${esc(person.id)}" ${api.selectedRoommate()?.id === person.id ? 'selected' : ''}>${esc(person.name)} · ${esc(person.area)}</option>`
                )
                .join(
                    ''
                )}</select><small>You choose the person yourself. <a href="roommates.html">Browse roommate profiles</a></small></label><label class="field">Message to the landlord<textarea name="message" data-regex="text" required maxlength="2000" placeholder="Introduce yourself and your plans."></textarea></label><p>Your contact details and request will appear in the landlord dashboard.</p><div class="request-total"><span>Quoted rent + deposit<small>Paid directly to landlord</small></span><strong id="request-total"></strong></div><button type="submit" class="primary full">Send rental request ↗</button></form></section>${summary(p, null)}</div>`;
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
    async function modernRequest() {
        const editing = params.get('edit') || api.state.requests.find(r=>String(r.propertyId)===params.get('id') && r.tenantId===api.user().id && ['draft','waiting-roommate','submitted','inspection','agreement','payment'].includes(r.status))?.id;
        const previous = editing ? await api.getRequest(editing) : null;
        if (previous && previous.tenantId !== api.user().id) {
            window.CampusNavigate(window.CampusFlowUI.next(previous));
            return;
        }
        const p = await api.getProperty(previous?.propertyId || params.get('id') || 124);
        const selectedId = params.get('roommateId') || previous?.roommateId || '';
        const selected = api.state.roommates.find(person => person.id === selectedId) || (previous?.roommateId === selectedId ? {id:selectedId,name:previous.roommateName} : null);
        const alone = params.get('alone') === '1';
        const start = params.get('startDate') || previous?.startDate || (p.availableFrom > window.CampusToday() ? p.availableFrom : window.CampusToday());
        const duration = Number(params.get('duration') || previous?.duration || (p.period === 'Daily' ? 3 : 6));
        const message = params.get('message') ?? previous?.message ?? '';
        app.innerHTML = heading(editing ? 'Update your rental plan' : 'Rental request', 'Choose dates, then apply alone or invite a roommate. Every tenant approves for themselves.') + `<div class="flow-layout"><section class="panel"><form id="request-form"><div class="form-row"><label class="field">Start date<input type="date" name="startDate" required min="${window.CampusToday()}" value="${esc(start)}"></label><label class="field">Duration (${p.period === 'Daily' ? 'nights' : 'months'})<input type="number" name="duration" min="1" max="${p.period === 'Daily' ? 365 : 36}" required value="${duration}"></label></div><label class="field">Who will live in the home?<select name="roommateChoice" id="roommate-choice"><option value="alone">I will rent alone</option><option value="with" ${selected && !alone ? 'selected' : ''}>I will rent with a roommate</option></select></label><div id="chosen-roommate" ${selected && !alone ? '' : 'hidden'}><p><strong>Invite ${esc(selected?.name || '')}</strong></p><p>This person must accept the invitation before the landlord receives the application.</p><button type="button" class="secondary" id="browse-roommates">Choose another roommate</button></div><label class="field">Introduce yourself<textarea name="message" required maxlength="2000">${esc(message)}</textarea></label><div class="notice">Whole-home rent: <strong>${money(previous?.agreedPrice ?? p.price)} / ${p.period === 'Daily' ? 'night' : 'month'}</strong>. Deposit: <strong>${money(previous?.deposit ?? p.price)}</strong>. These are the full amounts for the home, not a per-person price.</div>${editing ? '<p>Changes create a new version. Previous roommate, landlord and agreement approvals will be reset.</p>' : ''}<button type="submit" class="primary full">${selected && !alone ? 'Send roommate invitation' : editing ? 'Resubmit rental plan' : 'Send rental request'} ↗</button></form></section>${summary(p, previous)}</div>`;
        const form = document.getElementById('request-form');
        const browse = () => {
            if (!form.elements.startDate.reportValidity() || !form.elements.duration.reportValidity()) return;
            const query = new URLSearchParams({propertyId:String(p.id),startDate:form.elements.startDate.value,duration:form.elements.duration.value,message:form.elements.message.value});
            if (editing) query.set('edit', editing);
            window.CampusNavigate('tenant/roommates.html?' + query);
        };
        document.getElementById('browse-roommates').addEventListener('click', browse);
        document.getElementById('roommate-choice').addEventListener('change', event => {
            if (event.target.value === 'with') browse();
            else { document.getElementById('chosen-roommate').hidden = true; form.querySelector('[type=submit]').textContent = editing ? 'Resubmit rental plan ↗' : 'Send rental request ↗'; }
        });
        bindForm('request-form', async data => {
            const together = data.get('roommateChoice') === 'with';
            if (together && !selected) { browse(); return; }
            const body = {propertyId:p.id,startDate:data.get('startDate'),duration:Number(data.get('duration')),message:String(data.get('message')).trim(),roommate:together,roommateId:together ? selected.id : null};
            const result = editing ? await api.editRentalRequest(editing,{...body,version:previous.termsVersion}) : await api.createRequest(body);
            window.CampusNavigate(url('requests',result.id));
        });
    }
    window.CampusFlowUI.render({ request: request });
})();
