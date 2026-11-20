/* Confirmed terms change only after every affected party accepts an immutable proposal. */
(() => {
    'use strict';
    async function mount(app, rentals, refresh) {
        const api=window.CampusAPI;
        if(api.isDemo!==false) return;
        const {esc,money,date}=window.CampusFlowUI||window.CampusFeatureUI,me=api.user();
        const amendments=await api.getRentalAmendments();
        const section=document.createElement('section');section.className='panel';section.id='rental-amendments';
        const people=(ids)=>ids.map(id=>esc(api.state.roommates.find(p=>p.id===id)?.name||'Co-tenant')).join(', ');
        const terms=(t,original=false)=>`<p>${date(t.startDate)} → ${date(t.endDate)} · ${t.duration} ${t.period==='Daily'||t.property?.period==='Daily'?'nights':'months'}<br><strong>Whole-home rent: ${money(original?t.agreedPrice:t.price)}</strong> / ${t.period==='Daily'||t.property?.period==='Daily'?'night':'month'}<br>Deposit: ${money(t.deposit)}<br>Lead tenant: ${esc(t.tenantName||'Unchanged')}; co-tenant: ${esc(t.roommateName||'')|| (t.roommateId?people([t.roommateId]):'Renting alone')}</p>`;
        section.innerHTML='<h2>Changes to confirmed rentals</h2><p>Your current agreement stays effective until the landlord and every affected tenant approve the same proposal. Replacing a co-tenant also needs the outgoing and incoming tenants’ approval.</p>'+
            rentals.filter(r=>['active','upcoming'].includes(r.status)).map(r=>`<p><button class="secondary" data-amend="${esc(r.id)}">Propose a change · ${esc(r.request.property.title)}</button></p>`).join('')+
            amendments.map(a=>`<article class="moderation-record" id="amendment-${esc(a.id)}"><span class="badge">${esc(a.status)}</span><h3>${esc(a.propertyTitle)}</h3><details><summary>Compare the current and proposed terms</summary><h4>Previous agreement · version ${a.baseTermsVersion}</h4>${terms(a.original,true)}<h4>Proposed terms</h4>${terms(a.proposed)}<p>${esc(a.proposed.note)}</p></details><p>${a.approvers.map(p=>`${esc(p.name)} (${esc(p.role)}): ${p.accepted?'Accepted ✓':'Awaiting approval'}`).join('<br>')}</p>${a.status==='pending'&&a.approvers.some(p=>p.id===me.id)?`<div class="row-actions">${!a.approvers.find(p=>p.id===me.id).accepted?`<button class="primary" data-amend-response="${esc(a.id)}" data-accepted="true">Accept proposed changes</button>`:''}<button class="secondary" data-amend-response="${esc(a.id)}" data-accepted="false">Reject / withdraw proposal</button></div>`:''}</article>`).join('')+
            (!amendments.length?'<p>No proposed changes yet.</p>':'');
        app.append(section);
        const message=(error)=>{const el=document.getElementById('page-status')||document.getElementById('feature-status');el.textContent=error.message;};
        section.querySelectorAll('[data-amend-response]').forEach(button=>button.addEventListener('click',async()=>{
            button.disabled=true;try{await api.respondRentalAmendment(button.dataset.amendResponse,button.dataset.accepted==='true');await refresh();}catch(error){message(error);button.disabled=false;}
        }));
        section.querySelectorAll('[data-amend]').forEach(button=>button.addEventListener('click',()=>{
            const rental=rentals.find(r=>r.id===button.dataset.amend),r=rental.request;
            const saved=new Set(api.state.savedRoommates||[]);
            const profiles=api.state.roommates.filter(p=>p.userId!==r.tenantId).sort((a,b)=>Number(saved.has(b.id))-Number(saved.has(a.id)));
            if(r.roommateId&&!profiles.some(p=>p.id===r.roommateId))profiles.unshift({id:r.roommateId,name:r.roommateName||'Current co-tenant'});
            const modal=document.createElement('dialog');
            modal.innerHTML=`<button type="button" class="close" aria-label="Close">×</button><h2>Propose revised rental terms</h2><p>${esc(r.property.title)} · the existing agreement stays unchanged while approvals are pending.</p><form><label class="field">Start date<input name="startDate" type="date" value="${esc(r.startDate)}" ${rental.status==='active'?'readonly':''} required></label><label class="field">Duration (${r.property.period==='Daily'?'nights':'months'})<input name="duration" type="number" min="1" max="${r.property.period==='Daily'?365:36}" value="${r.duration}" required></label><div class="form-row"><label class="field">Whole-home rent (JD / ${r.property.period==='Daily'?'night':'month'})<input name="price" type="number" min="0.01" max="999999" step="0.01" value="${r.agreedPrice}" required></label><label class="field">Deposit (JD)<input name="deposit" type="number" min="0.01" max="999999" step="0.01" value="${r.deposit}" required></label></div><label class="field">Co-tenant<select name="roommateId"><option value="">Renting alone</option>${profiles.map(p=>`<option value="${esc(p.id)}" ${p.id===r.roommateId?'selected':''}>${saved.has(p.id)?'★ ':''}${esc(p.name)}</option>`).join('')}</select></label><label class="field">Reason / notes<textarea name="notes" maxlength="1000" required></textarea></label><label class="check"><input type="checkbox" name="accepted" required>I accept these revised terms for myself and request approval from every affected party.</label><p role="alert" class="status-message"></p><button class="primary" type="submit">Send change proposal</button></form>`;
            document.body.append(modal);modal.querySelector('.close').onclick=()=>modal.close();modal.addEventListener('close',()=>modal.remove());modal.showModal();
            modal.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const submit=modal.querySelector('[type=submit]');submit.disabled=true;
                try{const data=Object.fromEntries(new FormData(event.target));await api.proposeRentalAmendment(rental.id,{...data,duration:Number(data.duration),price:Number(data.price),deposit:Number(data.deposit),accepted:data.accepted==='on',version:r.termsVersion});modal.close();await refresh();}
                catch(error){modal.querySelector('[role=alert]').textContent=error.message;submit.disabled=false;}
            });
        }));
    }
    window.CampusAmendmentsUI={mount};
})();
