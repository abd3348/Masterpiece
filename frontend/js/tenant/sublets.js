(() => {
    'use strict';
    const { api, app, status, esc, money, heading } = window.CampusFeatureUI;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman' }).format(new Date());
    async function render() {
        const rentals = (await api.getRentals()).filter((item) => item.status === 'active');
        const listings = await api.getSubletListings();
        const requests = await api.getSubletRequests();
        if (!rentals.length) {
            app.innerHTML = heading('Partial rentals', 'This feature unlocks after you have an active rental.') + '<section class="panel"><h2>Rent a room short-term after moving in</h2><p>Confirm an active rental first, then return here to offer a private or shared room.</p><a class="primary" href="rentals.html">Open my rentals</a></section>';
            return;
        }
        app.innerHTML = '<div class="sublets-page">' + heading('Partial rentals', 'Offer a room for a fixed date range and manage requests yourself.') + `<section class="panel"><div class="page-heading"><div><h2>Create a partial rental offer</h2><p>The room must belong to one of your active rentals. Offers are visible only for the dates you choose.</p></div><span class="badge">JD 5 publishing fee</span></div><form id="sublet-create"><div class="form-grid"><label class="field">Rented home<select name="rentalId" required>${rentals.map((item) => `<option value="${item.id}" data-start="${item.request.startDate}" data-end="${item.endDate}">${esc(item.request.property.title)} · ${esc(item.request.property.area)}</option>`).join('')}</select></label><label class="field">Room<select name="roomNumber" required>${Array.from({length: Math.max(1, Number(rentals[0].request.property.beds) || 1)}, (_, i) => `<option value="${i+1}">Room ${i+1}</option>`).join('')}</select></label><label class="field">Type<select name="occupancy"><option value="private">Private room</option><option value="shared">Shared room</option></select></label><label class="field">Daily price (JD)<input name="price" type="number" min="1" step="0.5" required></label><label class="field">Available from<input name="startDate" type="date" min="${today}" required></label><label class="field">Available until<input name="endDate" type="date" required></label></div><label class="field">Notes<textarea name="notes" maxlength="500" placeholder="Room details, amenities and house rules"></textarea></label><p class="notice">The dates must stay inside your own rental period. Another accepted request cannot overlap these dates.</p><button class="primary" type="submit">Pay JD 5 & publish offer</button><p id="create-status" role="status"></p></form></section><section class="panel"><h2>Your offers</h2>${listings.length ? `<div class="tile-grid">${listings.map((item) => `<article class="feature-card"><span class="badge">${esc(item.status)}</span><h3>${esc(item.roomLabel)} · ${item.occupancy === 'private' ? 'Private' : 'Shared'}</h3><p>${esc(item.propertyTitle)} · ${esc(item.startDate)} → ${esc(item.endDate)}</p><p>${money(item.price)}/day</p><div class="row-actions"><button class="secondary" data-edit="${item.id}">Edit offer</button><button class="secondary danger" data-delete="${item.id}">Delete</button></div></article>`).join('')}</div>` : '<p>No offers yet.</p>'}</section><section class="panel"><h2>Requests and meetings</h2>${requests.length ? requests.map((item) => { const owner = item.ownerTenantId === api.user().id; return `<article class="request-row"><div><span class="badge">${esc(item.status)}</span><h3>${esc(owner ? item.tenantName : item.ownerTenantName)}</h3><p>${owner ? esc(item.tenantEmail) : 'Your request'} · ${esc(item.startDate)} → ${esc(item.endDate || '')}</p></div>${owner && item.status === 'pending' ? `<div class="row-actions"><button class="primary" data-review="${item.id}" data-approved="true">Accept</button><button class="secondary" data-review="${item.id}" data-approved="false">Decline</button></div>` : ''}${item.status === 'approved' ? `<form class="sublet-meeting-form" data-meeting="${item.id}"><label>Date<input name="date" type="date" min="${today}" required></label><label>Time<input name="time" type="time" required></label><button class="secondary" type="submit">Arrange meeting</button><p role="status"></p></form>` : ''}</article>`; }).join('') : '<p>No partial rental requests yet.</p>'}</section></div>`;
        bind(rentals);
    }
    function bind(rentals) {
        document.getElementById('sublet-create').addEventListener('submit', async (event) => {
            event.preventDefault(); const message = document.getElementById('create-status');
            try { const item = await api.createSubletListing(Object.fromEntries(new FormData(event.target))); await api.paySubletListingFee(item.id); message.textContent = 'JD 5 paid in preview. Offer published.'; await render(); } catch (error) { message.textContent = error.message; }
        });
        document.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', async () => { try { await api.reviewSubletRequest(button.dataset.review, button.dataset.approved === 'true'); await render(); } catch (error) { status.textContent = error.message; } }));
        document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', async () => {
            try {
                const item = (await api.getSubletListings()).find((entry) => entry.id === button.dataset.edit);
                const rental = rentals.find((r) => r.id === item.rentalId);
                const locked = (await api.getSubletRequests()).some((request) => request.listingId === item.id && request.status === 'approved');
                document.getElementById('edit-offer-dialog')?.remove();
                app.insertAdjacentHTML('beforeend', '<dialog id="edit-offer-dialog" class="offer-editor"><form id="edit-offer-form"><div class="page-heading"><div><span class="eyebrow">PARTIAL RENTAL</span><h2>Edit your offer</h2></div><button type="button" class="secondary" id="close-offer" aria-label="Close offer editor">×</button></div><p>' + esc(item.propertyTitle) + ' · ' + esc(item.roomLabel) + ' · ' + (item.occupancy === 'private' ? 'Private room' : 'Shared room') + '</p><p class="form-help">' + (locked ? 'An accepted request locks the price and dates. You can still update notes.' : 'Dates must stay inside your rental. Offers can last 1–30 days.') + '</p><div class="form-grid"><label class="field">Daily price (JD)<input name="price" type="number" min="0.01" max="99999" step="0.01" required value="' + esc(item.price) + '" ' + (locked ? 'readonly' : '') + '><small data-error="price" class="field-error"></small></label><label class="field">Duration<output id="edit-duration"></output></label><label class="field">Available from<input name="startDate" type="date" required min="' + esc(rental.request.startDate) + '" max="' + esc(rental.endDate) + '" value="' + esc(item.startDate) + '" ' + (locked ? 'readonly' : '') + '><small data-error="startDate" class="field-error"></small></label><label class="field">Available until<input name="endDate" type="date" required min="' + esc(rental.request.startDate) + '" max="' + esc(rental.endDate) + '" value="' + esc(item.endDate) + '" ' + (locked ? 'readonly' : '') + '><small data-error="endDate" class="field-error"></small></label></div><label class="field">Notes<textarea name="notes" maxlength="500">' + esc(item.notes || '') + '</textarea></label><p id="edit-offer-status" role="alert"></p><div class="row-actions"><button class="secondary" type="button" id="cancel-offer">Cancel</button><button class="primary" type="submit">Save changes</button></div></form></dialog>');
                const dialog = document.getElementById('edit-offer-dialog');
                const form = document.getElementById('edit-offer-form');
                const close = () => dialog.close();
                document.getElementById('close-offer').onclick = close;
                document.getElementById('cancel-offer').onclick = close;
                const validate = () => {
                    const duration = Math.round((new Date(form.elements.endDate.value) - new Date(form.elements.startDate.value)) / 86400000);
                    form.elements.endDate.setCustomValidity(Number.isInteger(duration) && duration >= 1 && duration <= 30 ? '' : 'Choose a date range of 1–30 days.');
                    document.getElementById('edit-duration').textContent = Number.isFinite(duration) && duration > 0 ? duration + ' days' : 'Select valid dates';
                    for (const name of ['price', 'startDate', 'endDate']) {
                        const field = form.elements[name];
                        const error = form.querySelector('[data-error="' + name + '"]');
                        error.textContent = field.validationMessage;
                        field.setAttribute('aria-invalid', String(!field.validity.valid));
                    }
                    return duration;
                };
                form.addEventListener('input', validate);
                form.addEventListener('invalid', validate, true);
                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    const duration = validate();
                    if (!form.reportValidity()) return;
                    const save = form.querySelector('[type="submit"]'); save.disabled = true;
                    try { await api.editSubletListing(item.id, { ...Object.fromEntries(new FormData(form)), duration }); dialog.close(); await render(); status.textContent = 'Offer updated.'; }
                    catch (error) { document.getElementById('edit-offer-status').textContent = error.message; }
                    finally { save.disabled = false; }
                });
                validate(); dialog.showModal();
            } catch (error) { status.textContent = error.message; }
        }));
        document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => { if (!confirm('Delete this partial rental offer?')) return; try { await api.deleteSubletListing(button.dataset.delete); await render(); } catch (error) { status.textContent = error.message; } }));
        document.querySelectorAll('[data-meeting]').forEach((form) => form.addEventListener('submit', async (event) => { event.preventDefault(); const data = new FormData(form); try { await api.createMeeting({ kind:'sublet', targetId:form.dataset.meeting, title:'Partial rental meeting', startsAt:new Date(`${data.get('date')}T${data.get('time')}:00+03:00`).toISOString(), duration:30 }); form.querySelector('[role="status"]').textContent = 'Meeting invitation sent.'; } catch (error) { form.querySelector('[role="status"]').textContent = error.message; } }));
    }
    window.CampusFlowUI.render({ sublets: render });
})();
