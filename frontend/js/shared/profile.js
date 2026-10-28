/* Page behavior for shared/profile.js. Shared UI helpers live in shared/features.js. */
(() => {
    'use strict';
    const { api, app, esc, heading, form, input, select, activity } = window.CampusFeatureUI;
    async function profile() {
        const me = api.user();
        app.innerHTML =
            heading(
                'Your profile',
                'Your contact details, work or study life, and housing preferences.'
            ) +
            `<div class="split-grid"><section class="panel"><form id="profile-form"><div class="form-row">${input('firstName', 'First name', me.firstName, 'name')}${input('lastName', 'Last name', me.lastName, 'name')}</div>${input('email', 'Email', me.email, 'email', 'email')}${input('phone', 'Jordanian mobile', me.phone, 'phone', 'tel')}<div class="form-row">${select('city', 'City', ['Amman', 'Irbid', 'Zarqa', 'Aqaba', 'Other'], me.city)}${select('occupation', 'Occupation', ['Student', 'Employee', 'Intern', 'Expatriate', 'Moving to a new city', 'Other'], me.occupation || 'Employee')}</div><label class="field">Work / study destination<input name="destination" data-regex="title" maxlength="100" value="${esc(me.destination || '')}"></label><button type="submit" class="primary full">Save profile</button><p id="profile-success" role="status"></p></form></section><div><section class="panel"><span class="avatar-circle">${esc(me.firstName[0])}</span><h2>${esc(me.firstName)} ${esc(me.lastName)}</h2><span class="badge">${esc(me.role)}</span><p>Account changes exist only in this preview session.</p>${me.role === 'tenant' ? '<a class="secondary" href="../tenant/preferences.html">Edit housing profile</a>' : '<a class="secondary" href="../' + window.CampusAccess.dashboard(me.role) + '">Back to dashboard</a>'}</section><section class="panel"><h2>Your activity</h2>${activity()}</section></div></div>`;
        form('profile-form', async (data) => {
            await api.updateProfile(Object.fromEntries(data));
            document.getElementById('profile-success').textContent = api.isDemo
                ? 'Profile updated for this session.'
                : 'Profile updated.';
            document.getElementById('profile-success').className = 'success-message';
        });
        if (['tenant', 'landlord'].includes(me.role)) {
            const requests = await api.getNegotiations();
            app.insertAdjacentHTML('beforeend', `<section class="panel" id="negotiated-rent"><h2>Agreed rental price</h2><p>Record the rent discussed with your landlord. A proposed price becomes effective after the landlord confirms it, before the agreement is accepted. Rent and deposits are paid directly.</p><div id="rent-proposals"></div><p id="rent-proposal-status" role="status"></p></section>`);
            const money = (value) => 'JD ' + Number(value).toLocaleString('en-JO');
            document.getElementById('rent-proposals').innerHTML = requests.length ? requests.map((r) => {
                const n = r.negotiation;
                const editable = ['submitted', 'approved'].includes(r.status) && !r.tenantAccepted;
                return `<article class="rent-proposal-card"><h3>${esc(r.property.title)}</h3><p>${esc(r.startDate)} → ${esc(r.endDate)} · ${r.property.period === 'Daily' ? 'Daily rent' : 'Monthly rent'}</p><dl class="summary-list"><div><dt>Advertised rent</dt><dd>${money(r.property.price)}</dd></div><div><dt>Effective rent</dt><dd>${money(r.agreedPrice ?? r.property.price)}</dd></div>${n ? `<div><dt>Latest proposed rent</dt><dd>${money(n.price)} · ${esc(n.status)}</dd></div>` : ''}</dl>${editable && me.role === 'tenant' && n?.status !== 'pending' ? `<form data-rent-proposal="${esc(r.id)}"><label class="field">Proposed rent (JD)<input name="price" type="number" min="0.01" max="99999" step="0.01" required value="${esc(r.agreedPrice ?? r.property.price)}"></label><button class="primary" type="submit">Send price for confirmation</button></form>` : ''}${editable && me.role === 'landlord' && n?.status === 'pending' ? `<div class="row-actions"><button class="primary" data-rent-review="${esc(r.id)}" data-accepted="true">Confirm proposed rent</button><button class="secondary" data-rent-review="${esc(r.id)}" data-accepted="false">Decline proposed rent</button></div>` : ''}${!editable ? '<p class="form-help">The price is locked after agreement acceptance or request closure.</p>' : n?.status === 'pending' ? '<p class="form-help">Awaiting landlord confirmation before agreement acceptance.</p>' : ''}</article>`;
            }).join('') : '<p>Your rental requests and negotiated prices will appear here.</p>';
            document.querySelectorAll('[data-rent-proposal]').forEach((element) => element.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (!element.reportValidity()) return;
                const button = element.querySelector('button'); button.disabled = true;
                try { await api.proposeRent(element.dataset.rentProposal, new FormData(element).get('price')); await profile(); }
                catch (error) { document.getElementById('rent-proposal-status').textContent = error.message; }
                finally { button.disabled = false; }
            }));
            document.querySelectorAll('[data-rent-review]').forEach((button) => button.addEventListener('click', async () => {
                button.disabled = true;
                try { await api.reviewRent(button.dataset.rentReview, button.dataset.accepted === 'true'); await profile(); }
                catch (error) { document.getElementById('rent-proposal-status').textContent = error.message; }
                finally { button.disabled = false; }
            }));
        }
    }

    window.CampusFeatureUI.profile = profile;
})();
