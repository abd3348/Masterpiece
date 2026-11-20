/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, status, params, esc, url, money, date, labels, heading, progress, next, empty } =
        window.CampusFlowUI;
    async function requests() {
        if (api.isDemo === false) return modernRequests();
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
    async function modernRequests() {
        const items = await api.getRequests();
        const me = api.user();
        const notifications = (await api.getNotifications()).filter(n => !n.read);
        app.innerHTML = heading('My requests & updates', 'Invitation approval, landlord review and individual agreement acceptance are separate steps.') +
            (notifications.length ? `<section class="panel"><h2>Updates · ${notifications.length} unread</h2>${notifications.map(n => `<article class="report-row"><div><strong>${esc(n.propertyTitle || 'Account update')}</strong><p>${esc(n.text)}</p><div class="row-actions">${n.route ? `<a class="secondary" href="../${esc(n.route)}">View details</a>` : ''}<button class="secondary" data-read="${esc(n.id)}">Mark as read</button></div></div></article>`).join('')}</section>` : '') +
            (items.length ? items.map(r => {
                const creator = r.tenantId === me.id;
                const canAnswer = !creator && r.invitationStatus === 'pending' && r.status === 'waiting-roommate';
                const canEdit = creator && ['draft','waiting-roommate','submitted','approved','inspection','agreement','payment'].includes(r.status);
                const outgoing = creator && r.status === 'waiting-roommate';
                const attention = creator && r.status === 'draft';
                const invitationLabels = {declined:'Roommate declined',cancelled:'Invitation cancelled',expired:'Invitation expired'};
                const waitingForLead = !creator && ['inspection','payment','confirmed'].includes(r.status);
                const badge = attention ? invitationLabels[r.invitationStatus] || 'Choose a roommate or apply alone' : waitingForLead ? 'Waiting for your roommate' : labels[r.status] || r.status;
                const recovery = 'roommates.html?' + new URLSearchParams({edit:r.id,propertyId:String(r.propertyId),startDate:r.startDate,duration:String(r.duration),message:r.message||''});
                const explanation = r.invitationStatus === 'declined' ? `${esc(r.roommateName || 'The invited roommate')} declined your invitation. Choose another roommate or apply alone. The landlord has not received this application.` : r.invitationStatus === 'cancelled' ? 'You cancelled this invitation. Choose another roommate or apply alone.' : 'This invitation expired. Choose another roommate or apply alone.';
                return `<section class="panel" id="request-${esc(r.id)}"><span class="badge">${esc(badge)}</span><h2>${esc(r.property.title)} · ${esc(r.property.area)}</h2><p>Lead tenant: <strong>${esc(r.tenantName)}</strong>${r.roommateName ? ' · Invited roommate: <strong>'+esc(r.roommateName)+'</strong>' : ' · Renting alone'}</p><p>${date(r.startDate)} → ${date(r.endDate)}</p><p>Whole-home rent: <strong>${money(r.agreedPrice)}</strong> / ${r.property.period === 'Daily' ? 'night' : 'month'} · Deposit: <strong>${money(r.deposit)}</strong>. Not a per-person price.</p><p>Terms version ${r.termsVersion || 1}${r.invitationStatus ? ' · Invitation: '+esc(r.invitationStatus) : ''}${r.invitationExpiresAt && r.invitationStatus === 'pending' ? ' · Expires '+esc(new Date(r.invitationExpiresAt).toLocaleString()) : ''}</p>${canAnswer ? '<p>'+esc(r.tenantName)+' invited you to apply for this home together. Accepting sends one joint application to the landlord; it does not accept the final rental agreement.</p>' : ''}${waitingForLead ? '<p class="notice">Waiting for '+esc(r.tenantName)+' to '+({inspection:'inspect the home and record the checklist',payment:'confirm the direct arrangement',confirmed:'confirm key handover'}[r.status])+'. You can follow updates here.</p>' : ''}<div class="row-actions">${canAnswer ? `<button class="primary" data-answer="${esc(r.id)}" data-accepted="true" data-version="${r.termsVersion}">Accept invitation</button><button class="secondary" data-answer="${esc(r.id)}" data-accepted="false" data-version="${r.termsVersion}">Decline invitation</button>` : ''}${outgoing ? `<button class="secondary" data-cancel="${esc(r.id)}" data-version="${r.termsVersion}">Cancel invitation</button>` : ''}${canEdit ? `<a class="${attention ? 'primary' : 'secondary'}" href="${attention ? esc(recovery) : 'request.html?edit='+encodeURIComponent(r.id)}">${attention ? 'Choose another roommate' : 'Change dates or roommate'}</a><a class="secondary" href="request.html?edit=${encodeURIComponent(r.id)}&alone=1">Apply alone instead</a>` : ''}${['inspection','agreement','payment','confirmed','active','closed','approved'].includes(r.status) ? `<a class="primary" href="${next(r)}">${waitingForLead ? 'View status' : 'Continue'} ↗</a>` : ''}${r.roommateId && !attention ? `<a class="secondary" href="messages.html?owner=${r.propertyId}&tenant=${encodeURIComponent(creator ? r.roommateUserId : r.tenantId)}">Book a roommate meeting</a>` : ''}<a class="secondary" href="messages.html?owner=${r.propertyId}">Book a landlord meeting</a></div>${outgoing ? '<p>Waiting for your roommate. This application is not visible to the landlord yet.</p>' : r.status === 'draft' ? '<p class="notice">'+explanation+'</p>' : r.status === 'submitted' ? '<p>Application sent to the landlord.</p>' : ''}</section>`;
            }).join('') : '<section class="panel"><h2>No rental requests yet</h2><a class="primary" href="properties.html">Explore homes</a></section>');
        function run(button, work) { button.disabled=true; status.textContent=''; Promise.resolve().then(work).then(modernRequests).catch(e=>status.textContent=e.message).finally(()=>button.disabled=false); }
        document.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>run(button,()=>api.respondRoommateInvitation(button.dataset.answer,button.dataset.accepted==='true',Number(button.dataset.version)))));
        document.querySelectorAll('[data-cancel]').forEach(button=>button.addEventListener('click',()=>run(button,()=>api.cancelRoommateInvitation(button.dataset.cancel,Number(button.dataset.version)))));
        document.querySelectorAll('[data-read]').forEach(button=>button.addEventListener('click',()=>run(button,()=>api.markNotificationRead(button.dataset.read))));
        if(params.get('id')) document.getElementById('request-'+params.get('id'))?.scrollIntoView({block:'start'});
    }
    window.CampusFlowUI.render({ requests: requests });
})();
