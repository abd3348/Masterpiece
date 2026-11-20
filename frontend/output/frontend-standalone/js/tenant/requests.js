/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, status, esc, url, date, labels, heading, progress, next, empty } =
        window.CampusFlowUI;
    async function requests() {
        const items = await api.getRequests();
        if (!items.length) return empty('My requests', 'No rental requests yet');
        app.innerHTML =
            heading('My requests', 'Follow the journey from landlord review to your move-in day.') +
            items
                .map(
                    (r) =>
                        `<section class="panel"><div class="request-row"><div><span class="badge">${labels[r.status]}</span><h2>${esc(r.property.title)} · ${esc(r.property.area)}</h2><p>${r.roommate ? 'With roommate: ' + esc(r.roommateName || api.state.roommates.find((p) => p.id === r.roommateId)?.name || 'Selected roommate') : 'Renting alone'}</p><p>${date(r.startDate)} → ${date(r.endDate)} · ${r.duration} ${r.property.period === 'Daily' ? 'nights' : 'months'}</p></div><a class="primary" href="${r.status === 'submitted' || r.status === 'rejected' ? url('property', r.propertyId) : next(r)}">${r.status === 'submitted' || r.status === 'rejected' ? 'View property' : r.status === 'active' ? 'View rental' : 'Continue'} ↗</a></div>${r.status === 'rejected' ? '<p>The landlord declined this request. Explore another home or discuss alternatives.</p>' : progress(r)}${r.status === 'submitted' ? '<p>Waiting for the property owner to review your request.</p>' : ''}</section>`
                )
                .join('');
    }
    window.CampusFlowUI.render({ requests: requests });
})();
