/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const {
        api,
        app,
        status,
        params,
        esc,
        photo,
        url,
        money,
        date,
        heading,
        summary,
        bindForm,
        matching
    } = window.CampusFlowUI;
    async function property() {
        const p = await api.getProperty(params.get('id') || 124),
            report = api.estimate(p);
        const photos = p.photos.length
            ? p.photos.map((p) => p.url)
            : [
                  photo(p),
                  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=85',
                  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=600&q=85'
              ];
        app.innerHTML =
            heading(p.title, `${p.area}, ${p.city} · A space for your next chapter.`) +
            `<div class="gallery">${photos
                .slice(0, 3)
                .map((src, i) => `<img src="${esc(src)}" alt="${esc(p.title)} photo ${i + 1}">`)
                .join(
                    ''
                )}</div><div class="flow-layout"><div><section class="panel"><span class="badge">${p.status === 'published' ? 'Available listing' : 'Preview · ' + esc(p.status)}</span><h2>${esc(p.title)}</h2><div class="facts"><span>${p.beds}<small>Bedrooms</small></span><span>${p.baths}<small>Bathrooms</small></span><span>${p.size} m²<small>Size</small></span><span>${esc(p.furnished)}<small>${esc(p.type)}</small></span></div></section><section class="panel"><h2>About this place</h2><p>${esc(p.description)}</p><p>${date(p.availableFrom)} → ${date(p.availableTo)} · ${p.period === 'Daily' ? 'Short stays welcome' : 'Monthly rental'}</p>${matching(p)}<p class="sample-note">Matching uses your housing preferences and browser rules. Sample commute estimates are illustrative.</p></section><section class="panel"><h2>What's included</h2><div class="amenities">${p.amenities.map((a) => `<span>✓ ${esc(a)}</span>`).join('')}</div></section><section class="panel"><h2>Property walkthrough</h2>${p.video ? `<video class="condition-video" controls preload="metadata" src="${esc(p.video.url)}"></video>` : '<div class="media-placeholder">No walkthrough uploaded for this sample home. Landlords can add a video with a new listing.</div>'}</section><section class="panel"><h2>Sample property analysis</h2><p class="sample-note">Illustrative condition report · no AI image processing. Price range is calculated from sample listings.</p><div class="report-row"><span>Visible condition</span><span>${report.condition}</span></div><div class="report-row"><span>Furniture</span><span>${esc(report.furnishing)}</span></div><div class="report-row"><span>Maintenance</span><span>Review in person</span></div><div class="report-row"><span>Estimated rent</span><strong>${money(report.low)}–${money(report.high)}</strong></div><p>Requested: ${money(p.price)} · ${p.price >= report.low && p.price <= report.high ? 'Within' : 'Outside'} the sample range</p><p>Listing risk: ${p.risk}/100 · ${p.riskReasons.map(esc).join(' · ')}</p></section><section class="panel"><h2>Your landlord</h2><h3>${esc(p.landlord)}</h3><p>Discuss the home, agreement and handover arrangements.</p><a class="secondary" href="messages.html?owner=${p.id}">Book a meeting</a></section><section class="panel"><h2>Reviews</h2><div id="property-reviews"></div><form id="review-form"><label class="field">Your rating<select name="rating" aria-label="Your rating"><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Average</option><option value="2">2 · Fair</option><option value="1">1 · Poor</option></select></label><label class="field">Your experience<textarea name="text" required data-regex="text" maxlength="1000" placeholder="Share a short review."></textarea></label><button class="secondary" type="submit">${api.isDemo ? 'Add demo review' : 'Add review'}</button></form></section><section class="panel"><h2>Report a concern</h2><form id="report-form"><label class="field">Reason<select name="reason"><option>Suspicious pricing</option><option>Misleading photos</option><option>Incorrect details</option><option>Other concern</option></select></label><label class="field">Details<textarea name="notes" data-regex="text" required maxlength="1500" placeholder="Describe the concern for the admin."></textarea></label><button class="secondary" type="submit">Submit report</button><p id="report-success" role="status"></p></form></section></div>${summary(p, null, p.status === 'published' ? `<a class="primary full" href="${url('request', p.id)}">Request to rent ↗</a>` : '<p>Listing is not accepting rental requests.</p>')}</div>`;
        const renderReviews = () =>
            (document.getElementById('property-reviews').innerHTML = p.reviews
                .map(
                    (r) =>
                        `<div class="report-row"><div><strong>${esc(r.name)} · ${r.rating}/5</strong><p>${esc(r.text)}</p></div></div>`
                )
                .join(''));
        renderReviews();
        bindForm('review-form', async (data) => {
            const updated = await api.addReview(p.id, Object.fromEntries(data));
            p.reviews = updated.reviews;
            document.getElementById('review-form').reset();
            renderReviews();
        });
        bindForm('report-form', async (data) => {
            await api.reportProperty(p.id, Object.fromEntries(data));
            document.getElementById('report-success').textContent = api.isDemo
                ? 'Report submitted to the admin preview.'
                : 'Report submitted.';
            document.getElementById('report-form').reset();
        });
    }
    window.CampusFlowUI.render({ property: property });
})();
