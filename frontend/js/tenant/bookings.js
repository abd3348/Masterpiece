/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, status, esc, money, date, link, labels, heading, empty } =
        window.CampusFeatureUI;
    async function bookings() {
        const items = (await api.getRequests()).filter((r) =>
            ['approved', 'inspection', 'payment', 'active', 'closed'].includes(r.status)
        );
        app.innerHTML =
            heading('Your bookings', 'Dates, reservations and confirmed stays in one place.') +
            (items.length
                ? items
                      .map(
                          (r) =>
                              `<section class="panel"><div class="request-row"><div><span class="badge">${labels[r.status]}</span><h2>${esc(r.property.title)}</h2><p>${date(r.startDate)} → ${date(r.endDate)} · ${money(r.total)} quoted rent and deposit &middot; paid directly</p><p>${r.status === 'active' ? 'Direct arrangement confirmed' : r.status === 'closed' ? 'Stay complete' : 'Agree directly with the landlord, then confirm your arrangement'}</p></div><a class="primary" href="${link({ approved: 'agreement', inspection: 'inspection', payment: 'payment', active: 'rentals', closed: 'rentals' }[r.status], r.id)}">View booking ↗</a></div></section>`
                      )
                      .join('')
                : empty(
                      'No bookings yet',
                      '<p>Accepted requests appear here. A booking is confirmed after confirming the direct arrangement.</p><a class="primary" href="properties.html">Find your place</a>'
                  ));
    }
    window.CampusFeatureUI.render({ bookings: bookings });
})();
