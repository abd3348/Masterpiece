// In-memory HTTP fixture used only by browser-flow.cjs --api.
const fs = require('fs');
const seed = JSON.parse(fs.readFileSync('data/campus-seed.json', 'utf8'));
const examples = JSON.parse(fs.readFileSync('data/api-examples.json', 'utf8'));
const db = {
    currentUser: null,
    preferences: null,
    saved: [],
    requests: [],
    rentals: [],
    conversations: [],
    meetings: [],
    contacts: [],
    reports: [],
    activity: []
};
const calls = [];
function snapshot() {
    const me = db.currentUser;
    return {
        schemaVersion: 1,
        currentUser: me,
        csrfToken: 'test-csrf',
        preferences: me ? db.preferences : null,
        users: me?.role === 'admin' ? seed.users : [],
        properties:
            me?.role === 'landlord' || me?.role === 'admin'
                ? seed.properties
                : seed.properties.filter((p) => p.status === 'published'),
        roommates: seed.roommates,
        requests: me
            ? db.requests.filter((r) =>
                  me.role === 'landlord' ? r.property.ownerId === me.id : r.tenantId === me.id
              )
            : [],
        rentals: me ? db.rentals : [],
        conversations: me ? db.conversations.filter((c) => c.participants.includes(me.id)) : [],
        meetings: me ? (db.meetings || []).filter(m => m.participants.includes(me.id)) : [],
        contacts: me
            ? db.contacts.filter(
                  (c) => c.userId === me.id || c.recipientId === me.id || c.personId === me.id
              )
            : [],
        reports: [],
        activity: [],
        saved: me ? db.saved : [],
        notifications: []
    };
}
function send(res, value, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(status === 204 ? '' : JSON.stringify(value));
}
function problem(res, status, message, errors) {
    res.writeHead(status, { 'Content-Type': 'application/problem+json' });
    res.end(JSON.stringify({ title: message, status, ...(errors ? { errors } : {}) }));
}
async function handle(req, res) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = {};
    try {
        body = raw ? JSON.parse(raw) : {};
    } catch (_) {
        return problem(res, 400, 'Invalid JSON');
    }
    const path = new URL(req.url, 'http://localhost').pathname;
    calls.push({ path, method: req.method, body, headers: req.headers });
    if (req.method !== 'GET' && req.headers['x-csrf-token'] !== 'test-csrf')
        return problem(res, 400, 'CSRF header missing');
    if (path === '/api/bootstrap') return send(res, snapshot());
    if (path === '/api/auth/login') {
        const user = seed.users.find((u) => u.email === body.email);
        if (!user || body.password !== 'Campus123') return problem(res, 401, 'Incorrect sign-in');
        db.currentUser = user;
        res.setHeader('Set-Cookie', 'campus-test=active; HttpOnly; SameSite=Lax; Path=/');
        return send(res, user);
    }
    if (path === '/api/auth/logout') {
        db.currentUser = null;
        res.setHeader('Set-Cookie', 'campus-test=; Max-Age=0; Path=/');
        return send(res, null, 204);
    }
    if (path === '/api/properties')
        return send(
            res,
            seed.properties.filter((p) => p.status === 'published')
        );
    if (/^\/api\/properties\/\d+$/.test(path))
        return send(
            res,
            seed.properties.find((p) => p.id === Number(path.split('/').pop()))
        );
    if (!db.currentUser || !req.headers.cookie?.includes('campus-test=active'))
        return problem(res, 401, 'Sign in required');
    if (path === '/api/me/rent-negotiations')
        return send(res, snapshot().requests);
    if (path === '/api/me/notifications') return send(res, (db.notifications || []).filter((n) => n.recipientId === db.currentUser.id));
    if (path === '/api/me/preferences') {
        if (req.method === 'PUT') {
            db.preferences = body;
            return send(res, body);
        }
        if (req.method === 'DELETE') {
            db.preferences = null;
            return send(res, null, 204);
        }
        return send(res, db.preferences);
    }
    if (path.startsWith('/api/me/favorites/')) {
        const id = Number(path.split('/').pop());
        db.saved = db.saved.filter((n) => n !== id);
        if (req.method === 'PUT') db.saved.push(id);
        return send(res, null, 204);
    }
    if (path === '/api/me/profile') {
        if (body.email === 'rejected@example.com')
            return problem(res, 400, 'Validation failed', {
                email: ['This email is reserved in the server test.']
            });
        Object.assign(db.currentUser, body);
        return send(res, db.currentUser);
    }
    if (path === '/api/rental-requests') {
        if (req.method === 'GET') return send(res, snapshot().requests);
        const p = seed.properties.find((p) => p.id === body.propertyId);
        const item = {
            ...examples.requestResponse,
            ...body,
            roommateName: body.roommate
                ? seed.roommates.find((p) => p.id === body.roommateId)?.name || null
                : null,
            id: 'request-server-1',
            tenantId: db.currentUser.id,
            tenantName: db.currentUser.firstName + ' ' + db.currentUser.lastName,
            property: p
        };
        db.requests.push(item);
        return send(res, item, 201);
    }
    if (/\/rental-requests\/[^/]+\/review$/.test(path)) {
        const item = db.requests.find((r) => r.id === path.split('/')[3]);
        if (db.currentUser.role !== 'landlord' || item.property.ownerId !== db.currentUser.id)
            return problem(res, 403, 'Only the owner can review this request');
        item.status = body.approved ? 'approved' : 'rejected';
        item.landlordAccepted = body.approved;
        return send(res, item);
    }
    if (/^\/api\/rental-requests\/[^/]+$/.test(path))
        return send(
            res,
            db.requests.find((r) => r.id === path.split('/').pop())
        );
    if (path === '/api/meetings') {
        if (req.method === 'GET') return send(res, snapshot().meetings);
        const person = seed.roommates.find(p => p.id === body.targetId);
        const p = seed.properties.find(p => p.id === body.targetId);
        const item = { ...body, id: 'meeting-server-' + (db.meetings.length + 1), subject: person?.name || p?.title,
            creatorId: db.currentUser.id, creatorName: db.currentUser.firstName,
            recipientId: person?.userId || person?.id || p?.ownerId, recipientName: person?.name || p?.landlord,
            participants: [db.currentUser.id, person?.userId || person?.id || p?.ownerId],
            status: 'pending', createdAt: new Date().toISOString() };
        db.meetings.push(item);
        return send(res, item, 201);
    }
    if (/\/meetings\/[^/]+\/(response|cancel|room)$/.test(path)) {
        const m = db.meetings.find(m => m.id === path.split('/')[3]);
        if (!m || !m.participants.includes(db.currentUser.id)) return problem(res, 403, 'Meeting access denied');
        if (path.endsWith('/response')) {
            if (m.recipientId !== db.currentUser.id || m.status !== 'pending') return problem(res, 403, 'Only the invited recipient can respond');
            m.status = body.accepted ? 'accepted' : 'declined';
        } else if (path.endsWith('/cancel')) m.status = 'cancelled';
        else {
            if (m.status !== 'accepted') return problem(res, 409, 'Meeting is not accepted');
            return send(res, { roomName: 'CampusMate-TestRoom-' + m.id, displayName: db.currentUser.firstName });
        }
        return send(res, m);
    }
    if (path === '/api/roommate-contacts') {
        const item = {
            id: 'contact-server-1',
            personId: body.personId,
            userId: db.currentUser.id,
            status: 'pending'
        };
        db.contacts.push(item);
        return send(res, item, 201);
    }
    if (/\/roommate-contacts\/[^/]+\/accept$/.test(path)) {
        const contact = db.contacts.find((c) => c.id === path.split('/')[3]);
        if (!contact) return problem(res, 404, 'Contact not found');
        if (contact.recipientId !== db.currentUser.id && contact.personId !== db.currentUser.id)
            return problem(res, 403, 'Only the recipient can accept');
        contact.status = 'accepted';
        const item = {
            id: 'conversation-incoming-1',
            peerId: contact.userId,
            peerName: contact.senderName,
            kind: 'roommate',
            participants: [db.currentUser.id, contact.userId],
            messages: []
        };
        db.conversations.push(item);
        return send(res, item, 201);
    }
    if (path === '/api/conversations') {
        let item = db.conversations.find((c) => c.participants.includes(body.peerId));
        if (!item) {
            item = {
                id: 'conversation-server-1',
                peerId: body.peerId,
                peerName: 'Ahmad',
                kind: body.kind,
                participants: [db.currentUser.id, body.peerId],
                messages: []
            };
            db.conversations.push(item);
        }
        return send(res, item, 201);
    }
    if (/\/conversations\/[^/]+\/messages$/.test(path)) {
        const item = db.conversations.find((c) => c.id === path.split('/')[3]);
        item.messages.push({
            id: 'message-server-1',
            name: db.currentUser.firstName,
            senderId: db.currentUser.id,
            text: body.text,
            date: '2026-10-09T12:00:00Z'
        });
        return send(res, item, 201);
    }
    if (path === '/api/assistant/messages')
        return send(res, {
            text: 'Backend assistant reply: use the property catalog to find a home.'
        });
    return problem(res, 404, 'The test fixture does not implement ' + path);
}
module.exports = { handle, db, calls };
