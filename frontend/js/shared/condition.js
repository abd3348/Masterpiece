/* Page behavior for shared/condition.js. Shared UI helpers live in shared/features.js. */
(() => {
    'use strict';
    const { api, state, rules, app, status, params, esc, date, link, heading, empty, form } =
        window.CampusFeatureUI;
    async function condition() {
        const rental = state.rentals.find((r) => r.id === params.get('id'));
        if (!rental) {
            app.innerHTML =
                heading(
                    'Condition reports',
                    'Document the home at the beginning and end of your stay.'
                ) +
                empty(
                    'Choose an active rental first',
                    api.user().role === 'landlord'
                        ? '<a class="primary" href="../landlord/bookings.html">View bookings</a>'
                        : '<a class="primary" href="../tenant/rentals.html">My rentals</a>'
                );
            return;
        }
        const phase = params.get('phase') === 'final' ? 'final' : 'initial',
            saved = rental.conditions[phase],
            areas = [
                'Walls',
                'Floors',
                'Doors and windows',
                'Furniture',
                'Water fittings',
                'Appliances'
            ];
        app.innerHTML =
            heading(
                'Every detail, documented',
                'Move-in and move-out walkthroughs for ' + rental.request.property.title,
                `<a class="secondary" href="${api.user().role === 'landlord' ? 'landlord.html?tab=bookings' : 'rentals.html'}">Back to rentals</a>`
            ) +
            `<p class="sample-note">Videos are previewed locally. Reports use your checklist entries; comparison highlights changes. AI video analysis is a demonstration, with no automatic visual inspection.</p><div class="feature-nav"><a class="${phase === 'initial' ? 'active' : ''}" href="${link('condition', rental.id)}">1. Move-in report ${rental.conditions.initial ? '✓' : ''}</a><a class="${phase === 'final' ? 'active' : ''}" href="${link('condition', rental.id)}&phase=final">2. Move-out report ${rental.conditions.final ? '✓' : ''}</a></div><div class="split-grid"><section class="panel"><form id="condition-form"><h2>${phase === 'initial' ? 'Move-in' : 'Move-out'} walkthrough</h2><label class="field">Walkthrough video<input id="condition-video-file" type="file" accept="video/mp4,video/webm,video/quicktime" ${saved ? '' : 'required'}><small class="form-help">MP4, WEBM, MOV · 100 MB maximum · preview only</small></label><div id="condition-preview">${saved ? `<video class="condition-video" controls preload="metadata" src="${esc(saved.video.url)}"></video>` : '<div class="media-placeholder">Your video will appear here.</div>'}</div>${areas.map((name, i) => `<label class="report-row">${name}<select name="condition${i}" aria-label="${name} condition">${['Good', 'Minor wear', 'Needs repair'].map((c) => `<option ${saved?.items[i].condition === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>`).join('')}<label class="field">Existing damage / changes<textarea name="notes" data-regex="text" maxlength="3000" placeholder="Describe what you observed.">${esc(saved?.notes || '')}</textarea></label><label class="check"><input type="checkbox" required>I reviewed the video and recorded the visible condition.</label><button type="submit" class="primary full" ${rental.status === 'closed' ? 'disabled' : ''}>Save ${phase === 'initial' ? 'move-in' : 'move-out'} report</button></form><p id="condition-success" role="status"></p></section><div><section class="panel"><h2>Your report history</h2>${[
                'initial',
                'final'
            ]
                .map((type) => {
                    const report = rental.conditions[type];
                    return `<div class="report-row"><span>${type === 'initial' ? 'Move-in' : 'Move-out'}</span><strong data-condition-phase="${type}">${report ? 'Checklist ' + api.conditionScore(report) + '% · ' + date(report.date) : 'Not recorded'}</strong></div>`;
                })
                .join(
                    ''
                )}<p>Reports are linked to this rental, its agreement and payment record.</p><p>${date(rental.request.startDate)} → ${date(rental.endDate)}</p></section><section class="panel"><h2>Compare the condition</h2><div id="comparison-report"></div></section></div></div>`;
        let video = saved?.video || null;
        document.getElementById('condition-video-file').addEventListener('change', (event) => {
            try {
                if (!event.target.files.length) {
                    video = saved?.video || null;
                    event.target.setCustomValidity('');
                    return;
                }
                const file = event.target.files[0];
                rules.media(file, 'video');
                if (video && video.url !== saved?.video.url) window.CampusMedia.revoke(video.url);
                video = { name: file.name, url: window.CampusMedia.create(file) };
                event.target.setCustomValidity('');
                status.textContent = '';
                document.getElementById('condition-preview').innerHTML =
                    `<video class="condition-video" controls preload="metadata" src="${esc(video.url)}"></video>`;
            } catch (error) {
                event.target.setCustomValidity(error.message);
                status.textContent = error.message;
            }
        });
        form('condition-form', async (data) => {
            await api.saveCondition(rental.id, phase, {
                video,
                items: areas.map((name, i) => ({ name, condition: data.get('condition' + i) })),
                notes: String(data.get('notes') || '').trim()
            });
            video = rental.conditions[phase].video;
            document.getElementById('condition-success').textContent = api.isDemo
                ? 'Condition report saved in this session.'
                : 'Condition report saved.';
            document.getElementById('condition-success').className = 'success-message';
            document.querySelector('[data-condition-phase="' + phase + '"]').textContent =
                'Checklist ' +
                api.conditionScore(rental.conditions[phase]) +
                '% · ' +
                date(rental.conditions[phase].date);
            renderComparison();
        });
        function renderComparison() {
            const target = document.getElementById('comparison-report');
            if (!rental.conditions.initial || !rental.conditions.final) {
                target.innerHTML = '<p>Record both videos and checklists to compare your stay.</p>';
                return;
            }
            const rows = api.compare(rental.id),
                changed = rows.filter((r) => r.changed).length;
            target.innerHTML = `<span class="score-pill">${changed} changed ${changed === 1 ? 'entry' : 'entries'}</span><p>Checklist score: ${api.conditionScore(rental.conditions.initial)}% → ${api.conditionScore(rental.conditions.final)}%</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Area</th><th>Move-in</th><th>Move-out</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.changed ? '⚠' : '✓'} ${r.name}</td><td>${r.before}</td><td>${r.after}</td></tr>`).join('')}</tbody></table></div><p>${
                rows
                    .filter((r) => r.changed)
                    .map((r) => r.name + ': ' + r.before + ' → ' + r.after)
                    .join('<br>') || 'No checklist changes recorded.'
            }</p><p>This comparison supports discussion; it does not determine responsibility for damage.</p>${rental.status === 'closed' ? '<span class="badge">Rental closed</span>' : '<label class="check"><input id="close-rental-consent" type="checkbox">I reviewed both reports and completed the handover.</label><button id="close-rental" class="primary full">Close rental</button>'}`;
            document.getElementById('close-rental')?.addEventListener('click', async () => {
                if (!document.getElementById('close-rental-consent').checked) {
                    status.textContent = 'Confirm the reports and handover first.';
                    return;
                }
                try {
                    await api.closeRental(rental.id);
                    renderComparison();
                } catch (error) {
                    status.textContent = error.message;
                }
            });
        }
        renderComparison();
    }

    window.CampusFeatureUI.condition = condition;
})();
