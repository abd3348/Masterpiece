/* Meetings replace the legacy message screens; old URLs remain valid. */
(() => {
    'use strict';
    const { api, state, app, params, esc, heading, form, action } = window.CampusFeatureUI;
    const format = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    let conference = null;
    let joinTimer = null;
    window.addEventListener('pagehide', () => { clearInterval(joinTimer); conference?.dispose(); }, { once: true });
    async function messages() {
        clearInterval(joinTimer);
        const me = api.user();
        const items = await api.getMeetings();
        let target = null;
        if (params.get('roommate')) {
            const person = state.roommates.find(p => p.id === params.get('roommate'));
            if (!person || me.role !== 'tenant') throw Error('Choose an available roommate profile.');
            target = { kind: 'roommate', targetId: person.id, name: person.name };
        } else if (params.get('owner')) {
            const p = await api.getProperty(params.get('owner'));
            target = { kind: 'property', targetId: p.id, peerId: params.get('tenant') || undefined, name: me.role === 'landlord' ? state.requests.find(r => r.propertyId === p.id && r.tenantId === params.get('tenant'))?.tenantName || 'Tenant' : p.landlord };
        }
        app.innerHTML = heading('Meetings', 'Meet your future roommate or landlord by video. Dates and times are shown in Jordan time.', '<button class="secondary" id="refresh-meetings">Refresh invitations</button>') +
            '<p class="sample-note">' + (api.isDemo ? 'Preview: invitations stay in this session and reset on refresh. Sample roommate responses can be simulated.' : 'Invitations are saved to your account. The invited person must accept.') + '</p>' +
            (target ? '<section class="panel meeting-request"><h2>Request a meeting with ' + esc(target.name) + '</h2><form id="meeting-form"><label class="field">Meeting title<input name="title" data-regex="title" required minlength="3" maxlength="100" value="' + (target.kind === 'roommate' ? 'Roommate introduction' : 'Discuss the property') + '"></label><div class="form-row"><label class="field">Date<input type="date" name="date" required min="' + new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + '"></label><label class="field">Time (Jordan)<input type="time" name="time" required></label><label class="field">Duration<select name="duration"><option value="15">15 minutes</option><option value="30" selected>30 minutes</option><option value="60">60 minutes</option></select></label></div><button class="primary" type="submit">Send meeting invitation</button></form></section>' : '<div class="row-actions">' + (me.role === 'tenant' ? '<a class="secondary" href="roommates.html">Meet a roommate</a><a class="secondary" href="properties.html">Meet a landlord</a>' : '<a class="secondary" href="requests.html">Invite a tenant from their request</a>') + '</div>') +
            '<div id="meeting-list" class="meeting-list">' + (items.map(m => {
                const mine = m.creatorId === me.id;
                const start = new Date(m.startsAt).getTime(), now = Date.now();
                const ended = now > start + m.duration * 60000;
                const canJoin = m.status === 'accepted' && now >= start - 10 * 60000 && !ended;
                return '<section class="panel meeting-card"><div class="section-heading"><div><span class="badge">' + esc(ended && ['accepted', 'pending'].includes(m.status) ? 'Time passed' : m.status) + '</span><h2>' + esc(m.title) + '</h2><p>' + esc(m.subject) + ' &middot; ' + esc(mine ? m.recipientName : m.creatorName) + '</p></div><span>' + esc(format(m.startsAt)) + ' &middot; ' + m.duration + ' min</span></div><div class="row-actions">' +
                (!mine && m.status === 'pending' && !ended ? '<button class="primary" data-meeting-accept="' + esc(m.id) + '">Accept</button><button class="secondary" data-meeting-decline="' + esc(m.id) + '">Decline</button>' : '') +
                (api.isDemo && mine && m.kind === 'roommate' && !state.users.some(u => u.id === m.recipientId) && m.status === 'pending' && !ended ? '<button class="secondary" data-meeting-simulate="' + esc(m.id) + '">Simulate roommate acceptance</button>' : '') +
                (m.status === 'accepted' && !ended ? '<button class="primary" data-meeting-join="' + esc(m.id) + '" ' + (canJoin ? '' : 'disabled') + '>Join meeting</button>' : '') +
                (['pending', 'accepted'].includes(m.status) ? '<button class="secondary" data-meeting-cancel="' + esc(m.id) + '">Cancel</button>' : '') + '</div>' +
                (m.status === 'accepted' && !ended ? '<p class="sample-note">Join opens 10 minutes before the meeting. Video is provided by Jitsi; your display name is shared when you join. The host may need to sign in to Jitsi.</p>' : '') + '</section>';
            }).join('') || '<section class="panel"><h2>No meetings yet</h2><p>Request a meeting from a property or roommate profile.</p></section>') + '</div>' +
            '<dialog id="meeting-room-dialog" class="meeting-room-dialog"><div class="row-actions"><h2>Video meeting</h2><button class="secondary" id="leave-meeting">Leave meeting</button></div><p id="meeting-room-status" role="status"></p><div id="meeting-video"></div></dialog>';
        if (target) form('meeting-form', async data => {
            await api.createMeeting({ kind: target.kind, targetId: target.targetId, peerId: target.peerId, title: data.get('title'), startsAt: new Date(data.get('date') + 'T' + data.get('time') + ':00+03:00').toISOString(), duration: Number(data.get('duration')) });
            await messages();
        });
        action('#refresh-meetings', messages);
        action('[data-meeting-accept]', async b => { await api.reviewMeeting(b.dataset.meetingAccept, true); await messages(); });
        action('[data-meeting-decline]', async b => { await api.reviewMeeting(b.dataset.meetingDecline, false); await messages(); });
        action('[data-meeting-cancel]', async b => { await api.cancelMeeting(b.dataset.meetingCancel); await messages(); });
        action('[data-meeting-simulate]', async b => { await api.simulateMeetingResponse(b.dataset.meetingSimulate, true); await messages(); });
        action('[data-meeting-join]', async b => {
            const room = await api.getMeetingRoom(b.dataset.meetingJoin);
            const modal = document.getElementById('meeting-room-dialog');
            modal.showModal();
            document.getElementById('meeting-room-status').textContent = 'Loading Jitsi...';
            try {
                if (!window.JitsiMeetExternalAPI) await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://meet.jit.si/external_api.js';
                    const timer = setTimeout(() => { script.remove(); reject(Error('Jitsi did not load. Check your internet connection and try again.')); }, 15000);
                    script.onload = () => { clearTimeout(timer); resolve(); };
                    script.onerror = () => { clearTimeout(timer); script.remove(); reject(Error('Could not load Jitsi. Please try again.')); };
                    document.head.appendChild(script);
                });
                if (!modal.open) return;
                if (!window.JitsiMeetExternalAPI) throw Error('Jitsi is unavailable. Please try again.');
                conference = new window.JitsiMeetExternalAPI('meet.jit.si', { roomName: room.roomName, width: '100%', height: '100%', parentNode: document.getElementById('meeting-video'), userInfo: { displayName: room.displayName }, configOverwrite: { prejoinConfig: { enabled: true } } });
                conference.addListener('readyToClose', () => modal.close());
                document.getElementById('meeting-room-status').textContent = '';
            } catch (error) { document.getElementById('meeting-room-status').textContent = error.message; }
        });
        const modal = document.getElementById('meeting-room-dialog');
        document.getElementById('leave-meeting').addEventListener('click', () => modal.close());
        modal.addEventListener('close', () => { conference?.dispose(); conference = null; document.getElementById('meeting-video').replaceChildren(); });
        joinTimer = setInterval(() => {
            document.querySelectorAll('[data-meeting-join]').forEach(button => {
                const m = items.find(m => m.id === button.dataset.meetingJoin);
                const start = new Date(m.startsAt).getTime();
                button.disabled = m.status !== 'accepted' || Date.now() < start - 600000 || Date.now() > start + m.duration * 60000;
            });
        }, 15000);
    }
    window.CampusFeatureUI.messages = messages;
})();
