/* Page behavior for landlord/dashboard.js. Shared UI helpers live in shared/features.js. */
(() => {
    'use strict';
    const {
        api,
        state,
        rules,
        app,
        status,
        params,
        esc,
        money,
        date,
        link,
        labels,
        heading,
        empty,
        stats,
        form,
        action,
        dialog,
        input,
        select,
        activity
    } = window.CampusFeatureUI;
    async function landlord() {
        const me = api.user(),
            owned = state.properties.filter((p) => p.ownerId === me.id && p.status !== 'deleted'),
            requests = state.requests.filter((r) => r.property.ownerId === me.id),
            rentals = state.rentals.filter((r) => r.request.property.ownerId === me.id),
            tab = document.body.dataset.tab || params.get('tab') || 'overview';
        const title =
            { requests: 'Your rental requests', bookings: 'Rental arrangements', notifications: 'Notifications' }[tab] ||
            'Manage your properties';
        const copy =
            {
                requests: 'Review tenant requests and their chosen roommates.',
                bookings: 'Follow tenant arrangements and rental dates. Rent is paid directly to you.',
                notifications: 'Updates about your listings, rental requests and negotiated offers.'
            }[tab] || 'Publish each property for JD 20. Tenants pay rent and deposits directly to you.';
        const heroAction =
            tab === 'overview'
                ? '<a class="secondary" href="../landlord/add-property.html">+ Add a property</a>'
                : tab === 'requests'
                  ? '<a class="secondary" href="../landlord/bookings.html">View bookings</a>'
                  : '<a class="secondary" href="../landlord/requests.html">Review requests</a>';
        const intro = heading(title, copy, heroAction);
        const notifications = ['overview', 'notifications'].includes(tab) ? await api.getNotifications() : [];
        app.innerHTML =
            (['overview', 'notifications'].includes(tab) ? `<section class="${tab === 'overview' ? 'panel owner-notifications' : 'panel owner-notifications notifications-page'}"><div class="section-heading"><h2>Notifications</h2><span class="badge">${notifications.filter((n) => !n.read).length} unread</span></div>${notifications.length ? notifications.map((n) => `<article class="notification-card ${n.read ? '' : 'unread'}"><span class="badge warning-badge">${n.read ? 'Read' : 'New'} · Listing update</span><h3>${esc(n.propertyTitle || 'Property notification')}</h3><p>${esc(n.text)}</p><small>${date(n.date)}</small>${!n.read ? `<button class="secondary" data-read-notification="${esc(n.id)}">Mark as read</button>` : ''}</article>`).join('') : '<p>No listing notifications yet.</p>'}</section>` : '') +
            (tab === 'overview'
                ? stats([
                      ['Your properties', owned.length],
                      ['Awaiting review', requests.filter((r) => r.status === 'submitted').length],
                      ['Active rentals', rentals.filter((r) => r.status === 'active').length],
                      [
                          'Listing fees',
                          money(
                              owned.reduce((n, p) => n + (p.listingFee?.status === 'paid' ? p.listingFee.amount : 0), 0)
                          )
                      ]
                  ])
                : '') +
            (tab === 'requests'
                ? ownerRequests(requests)
                : tab === 'bookings'
                  ? ownerBookings(rentals)
                  : tab === 'notifications'
                    ? ''
                    : `<div class="split-grid"><section><div class="section-heading"><h2>Your spaces</h2><a href="market.html">Compare market rents ↗</a></div>${owned.length ? owned.map((p) => `<section class="panel"><div class="summary-photo"><img src="${api.photo(p, 400)}" alt="${esc(p.title)}"><div><h3>${esc(p.title)}</h3><p>${esc(p.area)} · ${money(p.price)} / ${p.period === 'Daily' ? 'night' : 'month'}</p></div></div><span class="badge ${p.status === 'pending' ? 'warning-badge' : ''}">${labels[p.status]}</span><p>${p.listingFee ? `Listing fee: ${money(p.listingFee.amount)} &middot; ${p.listingFee.status}${p.listingFee.simulated ? ' (demo)' : ''}` : 'Existing sample listing'}</p><p>Rule-based risk: ${p.risk}/100 · ${p.riskReasons.map(esc).join(' · ')}</p><div class="row-actions"><a class="secondary" href="${link('property', p.id)}">Preview listing</a><a class="secondary" href="${link('add-property', p.id)}">Edit listing</a>${p.listingFee?.status === 'unpaid' ? `<button class="primary" data-listing-fee="${p.id}">Pay listing fee &middot; JD 20</button>` : ''}<button class="secondary" data-listing="${p.id}" ${['pending', 'awaiting-fee'].includes(p.status) ? 'disabled' : ''}>${p.status === 'archived' ? 'Publish' : 'Pause listing'}</button><button class="secondary" data-owner-analysis="${p.id}">Sample analysis</button></div></section>`).join('') : empty('Your first property starts here', '<a href="add-property.html" class="primary">Add a property</a>')}</section><div><section class="panel"><h2>Latest requests</h2>${ownerRequests(requests.slice(0, 3))}</section><section class="panel"><h2>Session activity</h2>${activity()}</section></div></div>`);
        action('[data-read-notification]', async (b) => {
            await api.markNotificationRead(b.dataset.readNotification);
            await landlord();
        });
        action('[data-approve-request]', async (b) => {
            await api.reviewRequest(b.dataset.approveRequest, true);
            await landlord();
        });
        action('[data-reject-request]', async (b) => {
            await api.reviewRequest(b.dataset.rejectRequest, false);
            await landlord();
        });
        action('[data-listing-fee]', async (b) => {
            await payFee(b.dataset.listingFee);
            if (api.isDemo) await landlord();
        });
        action('[data-listing]', async (b) => {
            const p = owned.find((p) => String(p.id) === b.dataset.listing);
            await api.setListingStatus(p.id, p.status === 'archived' ? 'published' : 'archived');
            await landlord();
        });
        action('[data-owner-analysis]', (b) =>
            analysis(owned.find((p) => String(p.id) === b.dataset.ownerAnalysis))
        );
        action('[data-tenant-chat]', (b) => {
            const r = requests.find(r => r.id === b.dataset.tenantChat);
            window.CampusNavigate('messages.html?owner=' + encodeURIComponent(r.propertyId) + '&tenant=' + encodeURIComponent(r.tenantId));
        });
    }
    function ownerRequests(items) {
        return items.length
            ? items
                  .map(
                      (r) =>
                          `<section class="panel"><span class="badge">${labels[r.status]}</span><h3>${esc(r.tenantName)} · ${esc(r.property.title)}</h3><p>${r.roommate ? 'With roommate: ' + esc(r.roommateName || state.roommates.find((p) => p.id === r.roommateId)?.name || 'Selected roommate') : 'Renting alone'}</p><p>${date(r.startDate)} · ${r.duration} ${r.property.period === 'Daily' ? 'nights' : 'months'}</p><p>${esc(r.message)}</p><p>Effective rent: ${money(r.agreedPrice ?? r.property.price)}${r.negotiation ? " · Proposed rent: " + money(r.negotiation.price) + " (" + esc(r.negotiation.status) + ")" : ""}</p>${r.negotiation?.status === "pending" ? '<a class="secondary" href="profile.html#negotiated-rent">Review proposed rent in profile</a>' : ""}<div class="row-actions">${r.status === 'submitted' ? `<button class="primary" data-approve-request="${r.id}">Accept & approve sample terms</button><button class="secondary danger" data-reject-request="${r.id}">Decline</button>` : ''}<button class="secondary" data-tenant-chat="${r.id}">Book a meeting</button>${r.landlordAccepted ? '<span class="badge">Landlord terms accepted</span>' : ''}</div></section>`
                  )
                  .join('')
            : empty('No rental requests yet');
    }
    function ownerBookings(items) {
        return items.length
            ? `<section class="panel"><h2>Rental arrangements</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Tenant / property</th><th>Dates</th><th>Rent payment</th><th>Status</th><th>Condition</th></tr></thead><tbody>${items.map((r) => `<tr><td>${esc(r.request.tenantName)}<small>${esc(r.request.property.title)}</small></td><td>${date(r.request.startDate)}<small>Until ${date(r.endDate)}</small></td><td>Direct to landlord<small>Not collected or verified by Campus Mate</small></td><td><span class="badge">${labels[r.status]}</span></td><td><a class="secondary" href="${link('condition', r.id)}">Reports & comparison</a></td></tr>`).join('')}</tbody></table></div></section>`
            : empty('Arrangements appear after tenants confirm directly agreed terms');
    }
    function analysis(p) {
        const report = api.estimate(p);
        dialog(
            'Sample property analysis',
            `<p class="sample-note">Illustrative report. Photos are previewed; no AI image analysis is performed. Prices use sample listings and a rule-based estimate.</p><div class="report-row"><span>Visible condition</span><strong>${report.condition}</strong></div><div class="report-row"><span>Furniture</span><strong>${esc(report.furnishing)}</strong></div><div class="report-row"><span>Maintenance</span><span>${report.maintenance}</span></div><div class="report-row"><span>Estimated range</span><strong>${money(report.low)}–${money(report.high)}</strong></div><div class="report-row"><span>Requested rent</span><strong>${money(p.price)}</strong></div><p>${p.price >= report.low && p.price <= report.high ? 'Within the sample price range' : 'Outside the sample price range'}</p><h3>Listing risk · ${p.risk}/100</h3><p>${p.riskReasons.map(esc).join('<br>')}</p>`
        );
    }
    async function payFee(id) {
        if (api.isDemo) {
            const accepted = await new Promise((resolve) => {
                dialog('Listing fee - JD 20', '<p>Pay once to publish this property advertisement. Rent is paid directly to the landlord.</p><p class="sample-note">Demo confirmation only. No money is charged.</p><button class="primary full" id="confirm-listing-fee">Simulate listing fee &middot; JD 20</button>');
                const modal = document.getElementById('feature-dialog');
                modal.addEventListener('close', () => resolve(false), { once: true });
                document.getElementById('confirm-listing-fee').addEventListener('click', () => { resolve(true); modal.close(); }, { once: true });
            });
            if (!accepted) return;
            await api.payListingFee(id);
        } else {
            const result = await api.payListingFee(id);
            const target = new URL(result.checkoutUrl);
            if (target.protocol !== 'https:') throw Error('Listing fee checkout must use HTTPS.');
            window.parent.location.assign(target.href);
        }
    }

    async function addProperty() {
        const existing = params.get('id') ? await api.getProperty(params.get('id')) : null;
        if (existing && existing.ownerId !== api.user().id)
            throw Error('Choose one of your own properties.');
        app.innerHTML =
            heading(
                'A new place, a new possibility',
                existing ? 'Update your advertisement. Editing the same paid listing has no additional posting fee.' : 'Share your home for JD 20 per advertisement. Rent and deposits are paid directly to you.'
            ) +
            `<div class="split-grid"><section class="panel"><form id="property-form">${input('title', 'Listing title', '', 'title', 'text', 'maxlength="100" placeholder="Bright apartment in Jubeiha"')}<div class="form-row">${select('city', 'City', ['Amman', 'Irbid', 'Zarqa', 'Aqaba'])}${select('area', 'Area', ['Jubeiha', 'Shafa Badran', 'Sweileh', 'Amman Center', 'Irbid university district', 'Zarqa', 'Aqaba'])}</div><div class="form-grid">${select('type', 'Housing type', ['Apartment', 'Studio', 'Private room', 'Shared room'])}${select('period', 'Rental period', ['Monthly', 'Daily'])}${select('furnished', 'Furniture', ['Furnished', 'Partly furnished', 'Unfurnished'])}</div><div class="form-grid">${input('price', 'Rent (JD)', '', 'money', 'number', 'min="1" max="99999" step="0.01" placeholder="190"')}${input('beds', 'Bedrooms', 2, 'integer', 'number', 'min="1" max="20"')}${input('baths', 'Bathrooms', 1, 'integer', 'number', 'min="1" max="20"')}${input('size', 'Size (m²)', 85, 'integer', 'number', 'min="5" max="9999"')}${input('availableFrom', 'Available from', window.CampusToday(), 'date', 'date')}${input('availableTo', 'Available until', '2030-12-31', 'date', 'date')}</div><label class="field">Description<textarea name="description" data-regex="text" required minlength="10" maxlength="3000" placeholder="Describe the home, transport and facilities."></textarea></label><h3>Amenities</h3><div class="check-grid">${['Wi-Fi', 'Air conditioning', 'Kitchen', 'Parking', 'Balcony', 'Washing machine'].map((a) => `<label><input type="checkbox" name="amenities" value="${a}" ${a === 'Wi-Fi' ? 'checked' : ''}>${a}</label>`).join('')}</div><label class="field">Property photos<input type="file" id="property-photos" accept="image/jpeg,image/png,image/webp,image/gif" multiple required><small class="form-help">Up to 6 photos · JPG, PNG, WEBP, GIF · 10 MB each</small></label><div id="photo-previews" class="media-previews"></div><label class="field">Walkthrough video (optional)<input type="file" id="property-video" accept="video/mp4,video/webm,video/quicktime"><small class="form-help">MP4, WEBM or MOV · up to 100 MB</small></label><div id="video-preview" class="media-previews"></div><button type="submit" class="primary full">Continue to listing fee &middot; JD 20</button></form></section><aside><section class="panel"><h2>A clear listing builds trust</h2><p>Include accurate prices, dates, furniture and useful photos.</p><p class="sample-note">Sample image analysis is shown after adding your home. Suspicious pricing or payment language flags it for admin review.</p><p>Files are previewed locally. Refreshing clears your listing and media.</p></section><section class="panel"><h2>Listing fee &middot; JD 20</h2><p>One fee for each new property advertisement. Editing an existing paid advertisement does not charge another fee. Rent and deposits are agreed and paid directly between landlord and tenant.</p><p class="sample-note">${api.isDemo ? 'Demo: the fee confirmation is simulated; no money is charged.' : 'Payment is handled by the listing fee provider. Publication requires server confirmation.'}</p><h2>What happens next?</h2><div class="score-reasons"><span>1. Validate the listing fields</span><span>2. Preview your media</span><span>3. Calculate a sample risk score</span><span>4. Pay the JD 20 listing fee</span><span>5. Publish or wait for admin review, then receive requests</span></div></section></aside></div>`;
        let photos = existing
                ? existing.photos.length
                    ? existing.photos
                    : [{ name: 'Sample interior', url: api.photo(existing) }]
                : [],
            video = existing?.video || null;
        if (existing) {
            const f = document.getElementById('property-form');
            for (const name of [
                'title',
                'city',
                'area',
                'type',
                'period',
                'furnished',
                'price',
                'beds',
                'baths',
                'size',
                'availableFrom',
                'availableTo',
                'description'
            ])
                f.elements[name].value = existing[name];
            f.querySelectorAll('[name=amenities]').forEach(
                (input) => (input.checked = existing.amenities.includes(input.value))
            );
            document.getElementById('property-photos').required = !photos.length;
            document.getElementById('photo-previews').innerHTML = photos
                .map((p) => '<img src="' + p.url + '" alt="' + esc(p.name) + '">')
                .join('');
            if (video)
                document.getElementById('video-preview').innerHTML =
                    '<video controls preload="metadata" src="' + video.url + '"></video>';
            f.querySelector('[type=submit]').textContent = 'Save listing changes';
        }
        document.getElementById('property-photos').addEventListener('change', (event) => {
            try {
                const files = [...event.target.files];
                if (files.length > 6) throw Error('Choose at most six photos.');
                files.forEach((f) => rules.media(f, 'image'));
                photos
                    .filter((p) => !existing?.photos.includes(p))
                    .forEach((p) => window.CampusMedia.revoke(p.url));
                photos = files.map((f) => ({
                    name: f.name,
                    url: window.CampusMedia.create(f),
                    file: f
                }));
                event.target.setCustomValidity('');
                status.textContent = '';
                document.getElementById('photo-previews').innerHTML = photos
                    .map((p) => `<img src="${esc(p.url)}" alt="${esc(p.name)}">`)
                    .join('');
            } catch (error) {
                event.target.setCustomValidity(error.message);
                status.textContent = error.message;
            }
        });
        document.getElementById('property-video').addEventListener('change', (event) => {
            try {
                if (!event.target.files.length) {
                    if (video && video.url !== existing?.video?.url)
                        window.CampusMedia.revoke(video.url);
                    video = null;
                    event.target.setCustomValidity('');
                    document.getElementById('video-preview').innerHTML = '';
                    return;
                }
                const file = event.target.files[0];
                rules.media(file, 'video');
                if (video && video.url !== existing?.video?.url)
                    window.CampusMedia.revoke(video.url);
                video = { name: file.name, url: window.CampusMedia.create(file), file };
                event.target.setCustomValidity('');
                document.getElementById('video-preview').innerHTML =
                    `<video controls preload="metadata" src="${esc(video.url)}"></video>`;
            } catch (error) {
                event.target.setCustomValidity(error.message);
                status.textContent = error.message;
            }
        });
        let pendingListing = null;
        form('property-form', async (data) => {
            if (!photos.length) throw Error('Choose at least one photo.');
            const values = {
                ...Object.fromEntries(data),
                amenities: data.getAll('amenities'),
                photos,
                video
            };
            if (existing) await api.editProperty(existing.id, values);
            else {
                if (!pendingListing) pendingListing = await api.addProperty(values);
                else await api.editProperty(pendingListing.id, values);
                await payFee(pendingListing.id);
                if (!api.isDemo) return;
            }
            window.CampusNavigate('landlord.html');
        });
    }

    Object.assign(window.CampusFeatureUI, { landlord, addProperty });
})();
