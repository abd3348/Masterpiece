/* Admin-only listing decisions shared by Reports and the listing inspection page. */
(() => {
    'use strict';
    async function review({ id, reportId, onComplete, allowApproval = true }) {
        const ui = window.CampusFeatureUI || window.CampusFlowUI;
        const { api, esc } = ui;
        if (!api.isDemo) return modernReview({id,reportId,onComplete,allowApproval},ui);
        if (api.user().role !== 'admin') throw Error('Only administrators can review listings.');
        const report = reportId ? api.state.reports.find((r) => r.id === reportId && String(r.propertyId) === String(id)) : null;
        if (reportId && !report) throw Error('The report does not belong to this listing.');
        const screening = await api.reviewListingAnalysis(id);
        const p = api.state.properties.find((p) => String(p.id) === String(id));
        if (!p) throw Error('Listing not found.');
        const removed = p.status === 'deleted';
        document.getElementById('moderation-dialog')?.remove();
        const dialog = document.createElement('dialog');
        dialog.id = 'moderation-dialog';
        dialog.className = 'moderation-dialog';
        dialog.innerHTML = `<button class="close" type="button" id="close-moderation" aria-label="Close review">×</button><h2>${removed ? 'Correction instructions' : 'Review listing'} · ${esc(p.title)}</h2>${report ? `<p><strong>Reported concern:</strong> ${esc(report.reason)}</p><p>${esc(report.notes)}</p>` : ''}<div class="moderation-screening"><span class="badge">${screening.source === 'prepared-example' ? 'Prepared example report · No AI used' : screening.source === 'server-rules' ? 'Server screening · rules only' : screening.demo ? 'Screening preview · rules only' : 'Screening report'}</span><h3>Risk score: ${screening.risk}/100</h3><ul>${screening.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><p>${esc(screening.summary)}</p></div><form id="moderation-form"><label class="field">Removal reason<select name="reason" required><option value="">Choose a reason</option><option>Suspected fraud</option><option>Misleading information</option><option>Suspicious pricing</option><option>Other policy concern</option></select></label><label class="field">Message to the property owner<textarea name="notes" minlength="10" maxlength="1000" required placeholder="Explain what the owner needs to correct before resubmitting."></textarea></label><p>Removal hides the listing and notifies the owner. The owner can edit and resubmit this same listing for review; any paid posting fee is retained.</p><p id="moderation-status" role="alert"></p><div class="row-actions">${allowApproval && !removed ? `<button class="secondary" type="button" id="approve-reviewed" ${p.listingFee?.status === 'unpaid' ? 'disabled' : ''}>Approve listing</button>` : ''}${report?.status === 'open' ? '<button class="secondary" type="button" id="solve-reviewed">Mark solved</button>' : ''}<button class="primary danger" type="submit">${removed ? 'Send updated instructions' : 'Remove & request corrections'}</button></div></form>`;
        document.body.append(dialog);
        document.getElementById('close-moderation').addEventListener('click', () => dialog.close());
        const form = document.getElementById('moderation-form');
        if (removed) {
            form.elements.reason.value = p.moderation?.reason || '';
            form.elements.notes.value = p.moderation?.notes || '';
        }
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
    async function modernReview({id,reportId,onComplete,allowApproval},ui) {
        const {api,esc}=ui;
        const screening=await api.reviewListingAnalysis(id);
        const p=api.state.properties.find(p=>String(p.id)===String(id));
        const report=reportId?api.state.reports.find(r=>r.id===reportId):null;
        document.getElementById('moderation-dialog')?.remove();
        const modal=document.createElement('dialog');modal.id='moderation-dialog';modal.className='moderation-dialog';
        const canApprove=allowApproval&&!['changes-requested','suspended'].includes(p.reviewStatus);
        modal.innerHTML=`<button class="close" type="button" aria-label="Close review">×</button><h2>Review ${esc(p.title)}</h2><p>Review status: <strong>${esc(p.reviewStatus)}</strong> · Owner visibility: <strong>${p.ownerWantsPublished?'Wants to publish':'Paused by owner'}</strong></p><p>Paid posting fee: ${p.listingFee?.status==='paid'?'Retained for this advertisement':'Not paid'}</p>${report?`<section class="notice"><strong>Reported concern: ${esc(report.reason)}</strong><p>${esc(report.notes)}</p></section>`:''}<section class="moderation-screening"><span class="badge">Server screening · rules only</span><h3>Risk score: ${screening.risk}/100</h3><ul>${screening.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul><p>${esc(screening.summary)}</p><a class="secondary" href="../public/property.html?id=${p.id}" target="_blank">Inspect listing, photos & video ↗</a></section><form id="moderation-form"><label class="field">Decision<select name="decision" required><option value="">Choose a decision</option>${canApprove?'<option value="approve">Approve advertisement</option>':''}<option value="request-changes">Return for corrections</option><option value="suspend">Suspend advertisement</option></select></label><div id="decision-reason"><label class="field">Reason<select name="reason"><option value="">Choose a reason</option><option>Misleading information</option><option>Suspicious pricing</option><option>Suspected fraud</option><option>Other policy concern</option></select></label><label class="field">Instructions to the owner<textarea name="notes" minlength="10" maxlength="1000"></textarea></label></div><p>Corrections and suspension hide this advertisement and pause unfinished rental steps. Confirmed rentals stay available. Related reports remain open until their individual decisions are recorded.</p><p id="moderation-status" role="alert"></p><button class="primary" type="submit">Record decision & notify owner</button></form>`;
        document.body.append(modal);
        modal.querySelector('.close').addEventListener('click',()=>modal.close());
        const form=modal.querySelector('form');
        form.elements.decision.addEventListener('change',()=>{
            const details=form.elements.decision.value!=='approve';document.getElementById('decision-reason').hidden=!details;
            form.elements.reason.required=details;form.elements.notes.required=details;
        });
        form.addEventListener('submit',async event=>{
            event.preventDefault();if(!form.reportValidity())return;
            const button=form.querySelector('[type=submit]');button.disabled=true;
            try{await api.reviewListingDecision(p.id,{...Object.fromEntries(new FormData(form)),reviewRevision:p.reviewRevision});modal.close();await onComplete?.(form.elements.decision.value);}
            catch(e){document.getElementById('moderation-status').textContent=e.message;}
            finally{button.disabled=false;}
        });
        modal.showModal();
    }
    async function resolveReport(id,onComplete) {
        const ui=window.CampusFeatureUI||window.CampusFlowUI,{api,esc}=ui;
        if(api.isDemo){await api.resolveReport(id);await onComplete?.();return;}
        const report=api.state.reports.find(r=>r.id===id);
        document.getElementById('report-resolution-dialog')?.remove();
        const modal=document.createElement('dialog');modal.id='report-resolution-dialog';modal.className='moderation-dialog';
        modal.innerHTML=`<button class="close" type="button" aria-label="Close">×</button><h2>Record report outcome</h2><p>${esc(report?.title)} · ${esc(report?.reason)}</p><form><label class="field">Investigation outcome<select name="outcome" required><option value="">Choose an outcome</option><option value="substantiated">Concern substantiated</option><option value="unsubstantiated">Concern not substantiated</option><option value="duplicate">Duplicate report</option></select></label><label class="field">Decision explanation<textarea name="notes" required minlength="10" maxlength="1000"></textarea></label><p>This closes only this report and notifies its author. Advertisement visibility is a separate decision.</p><p role="alert"></p><button type="submit" class="primary">Close report & notify author</button></form>`;
        document.body.append(modal);modal.querySelector('.close').onclick=()=>modal.close();
        modal.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const form=e.target;if(!form.reportValidity())return;const button=form.querySelector('button');button.disabled=true;try{await api.resolveReport(id,Object.fromEntries(new FormData(form)));modal.close();await onComplete?.();}catch(error){form.querySelector('[role=alert]').textContent=error.message;}finally{button.disabled=false;}});
        modal.showModal();
    }
    window.CampusModeration = { review, resolveReport };
})();
