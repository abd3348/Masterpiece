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
    }

    window.CampusFeatureUI.profile = profile;
})();
