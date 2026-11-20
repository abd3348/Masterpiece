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
        const p = params.get('offer') ? await api.getSubletOffer(params.get('offer')) : await api.getProperty(params.get('id') || 124);
        const isAdmin = api.user?.()?.role === 'admin';
        if (isAdmin) {
            const footerLink = document.querySelector?.('footer a');
            if (footerLink) { footerLink.href = '../admin/dashboard.html?tab=reports'; footerLink.textContent = 'Back to reports'; }
        }
        const reports = isAdmin ? (api.state?.reports || []).filter((r) => String(r.propertyId) === String(p.id)) : [];
        const reportId = reports.find((r) => r.id === params.get('report'))?.id;
        const adminSummary = isAdmin ? '<aside class="panel sticky admin-listing-review"><span class="badge">Administration · Listing review</span><h2>Review this listing</h2><p>' + esc(p.title) + ' · ' + esc(p.landlord) + '</p><p>Asking rent: ' + money(p.price) + ' · Listing risk: ' + esc(p.risk) + '/100</p>' + reports.map((r) => '<article><span class="badge">' + (r.status === 'open' ? 'Open report' : 'Solved') + '</span><h3>' + esc(r.reason) + '</h3><p>' + esc(r.notes) + '</p>' + (r.status === 'open' ? '<button class="secondary full" data-admin-solve="' + esc(r.id) + '">Mark solved</button>' : '') + '</article>').join('') + '<button id="admin-delete-listing" type="button" class="primary danger full">Delete listing</button><a class="secondary full" href="../admin/dashboard.html?tab=reports">Back to reports</a><p id="admin-review-status" role="status"></p></aside>' : '';
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
                )}</div><div class="flow-layout"><div><section class="panel"><span class="badge">${p.status === 'published' ? 'Available listing' : 'Preview · ' + esc(p.status)}</span><h2>${esc(p.title)}</h2><div class="facts"><span>${p.beds}<small>Bedrooms</small></span><span>${p.baths}<small>Bathrooms</small></span><span>${p.size} m²<small>Size</small></span><span>${esc(p.furnished)}<small>${esc(p.type)}</small></span></div></section><section class="panel"><h2>About this place</h2><p>${esc(p.description)}</p><p>${date(p.availableFrom)} → ${date(p.availableTo)} · ${p.period === 'Daily' ? 'Short stays welcome' : 'Monthly rental'}</p>${isAdmin ? '' : matching(p) + '<p class="sample-note">Matching uses your housing preferences and browser rules. Sample commute estimates are illustrative.</p>'}</section><section class="panel"><h2>What's included</h2><div class="amenities">${p.amenities.map((a) => `<span>✓ ${esc(a)}</span>`).join('')}</div></section><section class="panel"><h2>Property walkthrough</h2>${p.video ? `<video class="condition-video" controls preload="metadata" src="${esc(p.video.url)}"></video>` : '<div class="media-placeholder">No walkthrough uploaded for this sample home. Landlords can add a video with a new listing.</div>'}</section><section class="panel"><h2>Video analysis</h2><button class="primary" id="analyze-video" type="button" aria-controls="video-analysis-result" aria-expanded="false" ${p.video?.url ? "" : "disabled"}>✳ AI · Analyze property video</button><p id="video-analysis-status" role="status">${p.video?.url ? "Request a report about the uploaded walkthrough." : "A walkthrough video must be uploaded before analysis is available."}</p><div id="video-analysis-result" hidden></div></section><section class="panel"><h2>${isAdmin ? 'Listing owner' : 'Your landlord'}</h2><h3>${esc(p.landlord)}</h3>${isAdmin ? '<p>Inspect the listing and manage any reported concerns.</p>' : `<p>Discuss the home, agreement and handover arrangements.</p><a class="secondary" href="messages.html?owner=${p.id}">Book a meeting</a>`}</section><section class="panel"><h2>Reviews</h2><div id="property-reviews"></div>${isAdmin ? '' : `<form id="review-form"><label class="field">Your rating<select name="rating" aria-label="Your rating"><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Average</option><option value="2">2 · Fair</option><option value="1">1 · Poor</option></select></label><label class="field">Your experience<textarea name="text" required data-regex="text" maxlength="1000" placeholder="Share a short review."></textarea></label><button class="secondary" type="submit">${api.isDemo ? 'Add demo review' : 'Add review'}</button></form>`}</section>${isAdmin ? '' : `<section class="panel"><h2>Report a concern</h2><form id="report-form"><label class="field">Reason<select name="reason"><option>Suspicious pricing</option><option>Misleading photos</option><option>Incorrect details</option><option>Other concern</option></select></label><label class="field">Details<textarea name="notes" data-regex="text" required maxlength="1500" placeholder="Describe the concern for the admin."></textarea></label><button class="secondary" type="submit">Submit report</button><p id="report-success" role="status"></p></form></section>`}</div>${isAdmin ? adminSummary : summary(p, null, p.status === 'published' ? `<a class="primary full" href="${url('request', p.id)}">Request to rent ↗</a>` : p.status === 'partial' ? '<a class="primary full" href="#partial-request-form">Request this room ↗</a>' : '<p>Listing is not accepting rental requests.</p>')}</div>`;
        document.getElementById('analyze-video').addEventListener('click', async (event) => {
            const button = event.currentTarget;
            const result = document.getElementById('video-analysis-result');
            const message = document.getElementById('video-analysis-status');
            button.disabled = true;
            button.textContent = api.isDemo ? '✳ AI · Preparing demo report…' : '✳ AI · Analyzing video…';
            result.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            result.setAttribute('aria-busy', 'true');
            message.textContent = api.isDemo ? 'Preparing demo report…' : 'Analyzing video…';
            try {
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const report = await api.analyzePropertyVideo(p.id);
                result.innerHTML = '<p class="sample-note">' + esc(report.demo ? 'Demo report · No video content was analyzed.' : 'AI generated observations · Review against the video and an in-person inspection.') + '</p><p>' + esc(report.summary) + '</p>' +
                    [['Visible condition', report.condition], ['Furniture', report.furniture], ['Maintenance', report.maintenance], ['Limitations', report.limitations]].map(([label, value]) => '<div class="report-row"><span>' + label + '</span><span>' + esc(value || 'Not assessed') + '</span></div>').join('');
                const estimate = api.estimate(p);
                result.insertAdjacentHTML('beforeend', '<div class="report-row"><span>Sample rent range (listing data)</span><strong>' + money(estimate.low) + '–' + money(estimate.high) + '</strong></div><p>Asking rent: ' + money(p.price) + '</p><p>Rule-based listing risk: ' + esc(p.risk) + '/100</p>');
                result.hidden = false;
                button.setAttribute('aria-expanded', 'true');
                message.textContent = report.demo ? 'Demo report ready.' : 'Analysis complete.';
                button.textContent = '✳ AI · Analyze again';
            } catch (error) {
                message.textContent = error.message;
                button.textContent = '✳ AI · Retry analysis';
            } finally {
                button.disabled = false;
                result.setAttribute('aria-busy', 'false');
            }
        });
        if (p.status === 'partial' && api.user().role === 'tenant') {
            app.insertAdjacentHTML('beforeend', `<section class="panel partial-request-panel"><h2>Request this partial rental</h2><p>The current tenant reviews and accepts your request.</p><form id="partial-request-form"><label class="field">Start date<input name="startDate" type="date" min="${esc(p.availableFrom > window.CampusToday() ? p.availableFrom : window.CampusToday())}" max="${esc(p.availableTo)}" value="${esc(p.availableFrom > window.CampusToday() ? p.availableFrom : window.CampusToday())}" required></label><label class="field">End date<input name="endDate" type="date" min="${esc(p.availableFrom)}" max="${esc(p.availableTo)}" value="${esc(p.availableTo)}" required></label><button class="primary" type="submit">Send request to current tenant</button><p id="partial-request-status" role="status"></p></form></section>`);
            bindForm('partial-request-form', async (data) => {
                await api.createSubletRequest(p.partialOffer.id, Object.fromEntries(data));
                document.getElementById('partial-request-status').textContent = 'Request sent. The current tenant must accept it.';
            });
        }
        const renderReviews = () =>
            (document.getElementById('property-reviews').innerHTML = p.reviews
                .map(
                    (r) =>
                        `<div class="report-row"><div><strong>${esc(r.name)} · ${r.rating}/5</strong><p>${esc(r.text)}</p></div></div>`
                )
                .join(''));
        renderReviews();
        if (isAdmin) {
            const message = document.getElementById('admin-review-status');
            document.getElementById('admin-delete-listing').addEventListener('click', async (event) => {
                const button = event.currentTarget; button.disabled = true;
                try { await window.CampusModeration.review({ id: p.id, reportId, allowApproval: false, onComplete: () => window.CampusNavigate('admin/dashboard.html?tab=reports') }); }
                catch (error) { message.textContent = error.message; }
                finally { button.disabled = false; }
            });
            document.querySelectorAll('[data-admin-solve]').forEach((button) => button.addEventListener('click', async () => {
                button.disabled = true;
                try { await api.resolveReport(button.dataset.adminSolve); await property(); document.getElementById('admin-review-status').textContent = 'Report marked solved. The listing has been kept.'; }
                catch (error) { message.textContent = error.message; button.disabled = false; }
            }));
            return;
        }
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
