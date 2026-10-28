/* Admin-only listing decisions shared by Reports and the listing inspection page. */
(() => {
    'use strict';
    async function review({ id, reportId, onComplete, allowApproval = true }) {
        const ui = window.CampusFeatureUI || window.CampusFlowUI;
        const { api, esc } = ui;
        if (api.user().role !== 'admin') throw Error('Only administrators can review listings.');
        const report = reportId ? api.state.reports.find((r) => r.id === reportId && String(r.propertyId) === String(id)) : null;
        if (reportId && !report) throw Error('The report does not belong to this listing.');
        const screening = await api.reviewListingAnalysis(id);
        const p = api.state.properties.find((p) => String(p.id) === String(id));
        if (!p || p.status === 'deleted') throw Error('This listing has already been removed.');
        document.getElementById('moderation-dialog')?.remove();
        const dialog = document.createElement('dialog');
        dialog.id = 'moderation-dialog';
        dialog.className = 'moderation-dialog';
        dialog.innerHTML = `<button class="close" type="button" id="close-moderation" aria-label="Close review">×</button><h2>Review listing · ${esc(p.title)}</h2>${report ? `<p><strong>Reported concern:</strong> ${esc(report.reason)}</p><p>${esc(report.notes)}</p>` : ''}<div class="moderation-screening"><span class="badge">${screening.source === 'prepared-example' ? 'Prepared example report · No AI used' : screening.demo ? 'Screening preview · rules only' : 'AI screening report'}</span><h3>Risk score: ${screening.risk}/100</h3><ul>${screening.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><p>${esc(screening.summary)}</p></div><form id="moderation-form"><label class="field">Removal reason<select name="reason" required><option value="">Choose a reason</option><option>Suspected fraud</option><option>Misleading information</option><option>Suspicious pricing</option><option>Other policy concern</option></select></label><label class="field">Message to the property owner<textarea name="notes" minlength="10" maxlength="1000" required placeholder="Explain why the listing is being removed."></textarea></label><p>Deleting hides the listing, notifies the owner and marks its open reports solved.</p><p id="moderation-status" role="alert"></p><div class="row-actions">${allowApproval ? `<button class="secondary" type="button" id="approve-reviewed" ${p.listingFee?.status === 'unpaid' ? 'disabled' : ''}>Approve listing</button>` : ''}${report?.status === 'open' ? '<button class="secondary" type="button" id="solve-reviewed">Mark solved</button>' : ''}<button class="primary danger" type="submit">Delete listing & notify owner</button></div></form>`;
        document.body.append(dialog);
        document.getElementById('close-moderation').addEventListener('click', () => dialog.close());
        const form = document.getElementById('moderation-form');
        const decide = async (decision) => {
            const buttons = [...form.querySelectorAll('button')];
            buttons.forEach((b) => b.disabled = true);
            try {
                if (decision === 'solved') await api.resolveReport(report.id);
                else {
                    const data = new FormData(form);
                    await api.moderateProperty(p.id, decision === 'approve', data.get('reason') || '', data.get('notes') || '');
                }
                dialog.close();
                await onComplete?.(decision);
            } catch (error) { document.getElementById('moderation-status').textContent = error.message; }
            finally { buttons.forEach((b) => b.disabled = false); }
        };
        document.getElementById('approve-reviewed')?.addEventListener('click', () => decide('approve'));
        document.getElementById('solve-reviewed')?.addEventListener('click', () => decide('solved'));
        form.addEventListener('submit', (event) => { event.preventDefault(); if (form.reportValidity()) decide('delete'); });
        dialog.showModal();
    }
    window.CampusModeration = { review };
})();
