/* Interactive frontend services. All data and files exist only in page memory. */
(() => {
    'use strict';
    const state = window.CampusState;
    const rules = window.CampusValidation;
    const id = () =>
        globalThis.crypto?.randomUUID?.() ||
        'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const fail = (text) => {
        throw new Error(text);
    };
    const log = (text) =>
        state.activity.unshift({ id: id(), text, date: new Date().toISOString() });
    const user = () =>
        state.currentUser || {
            id: null,
            role: 'guest',
            firstName: 'Guest',
            lastName: '',
            email: '',
            phone: '',
            city: 'Amman'
        };
    function selectUser(account) {
        state.currentUser = account;
        state.firstName = account.firstName;
        state.preferences = state.preferencesByUser[account.id] || null;
        state.saved = state.savedByUser[account.id] || (state.savedByUser[account.id] = []);
        return account;
    }
    const property = (key) =>
        state.properties.find((p) => String(p.id) === String(key) && p.status !== 'deleted') ||
        fail('Property not found.');
    const request = (key) =>
        state.requests.find((r) => r.id === key) || fail('Rental request not found.');
    const rental = (key) => state.rentals.find((r) => r.id === key) || fail('Rental not found.');
    const requireText = (rule, value) => {
        if (!rules.valid(rule, value)) fail(rules.errors[rule]);
    };
    const defaults = {
        minBudget: 150,
        maxBudget: 220,
        areas: ['Jubeiha', 'Shafa Badran', 'Sweileh'],
        destination: 'University of Jordan',
        housing: 'Apartment',
        furnishing: 'Furnished',
        billing: 'Monthly',
        sleep: 'Early bird',
        schedule: 'Daytime',
        noise: 2,
        cleanliness: 4,
        smoking: 'Not allowed',
        commute: 30,
        habits: []
    };
    function profile() {
        return { ...defaults, ...state.preferences };
    }
    function score(checks) {
        const total = checks.reduce((n, c) => n + c.weight, 0);
        return {
            score: Math.round((checks.reduce((n, c) => n + c.weight * c.value, 0) / total) * 100),
            reasons: checks.map((c) => ({ text: c.text, matched: c.value >= 0.75 }))
        };
    }
    function propertyMatch(p) {
        const pref = profile();
        return score([
            {
                weight: 30,
                value:
                    p.price >= pref.minBudget && p.price <= pref.maxBudget
                        ? 1
                        : p.price <= pref.maxBudget
                          ? 0.8
                          : Math.max(0, 1 - (p.price - pref.maxBudget) / pref.maxBudget),
                text: 'Within your budget'
            },
            { weight: 25, value: pref.areas.includes(p.area) ? 1 : 0.3, text: 'Preferred area' },
            {
                weight: 15,
                value: p.type === pref.housing ? 1 : 0.4,
                text: 'Preferred housing type'
            },
            {
                weight: 10,
                value: p.furnished === pref.furnishing ? 1 : 0.3,
                text: 'Preferred furnishing'
            },
            {
                weight: 10,
                value: p.period === (pref.billing === 'Monthly' ? 'Monthly' : 'Daily') ? 1 : 0.2,
                text: 'Preferred rental period'
            },
            {
                weight: 10,
                value: p.commute <= Number(pref.commute) ? 1 : 0.4,
                text: 'Sample commute fits your limit'
            }
        ]);
    }
    function roommateMatch(person) {
        const pref = profile();
        return score([
            {
                weight: 25,
                value:
                    Math.max(pref.minBudget, person.minBudget) <=
                    Math.min(pref.maxBudget, person.maxBudget)
                        ? 1
                        : 0.2,
                text: 'Budgets overlap'
            },
            {
                weight: 15,
                value: pref.areas.includes(person.area) ? 1 : 0.3,
                text: 'Preferred area'
            },
            {
                weight: 15,
                value: pref.sleep === person.sleep ? 1 : person.sleep === 'Flexible' ? 0.7 : 0.2,
                text: 'Similar sleep schedule'
            },
            {
                weight: 10,
                value:
                    pref.schedule === person.schedule
                        ? 1
                        : person.schedule === 'Flexible'
                          ? 0.7
                          : 0.3,
                text: 'Similar work or study hours'
            },
            {
                weight: 15,
                value: 1 - Math.abs(pref.cleanliness - person.cleanliness) / 4,
                text: 'Similar cleanliness habits'
            },
            {
                weight: 10,
                value: 1 - Math.abs(pref.noise - person.noise) / 4,
                text: 'Similar noise preferences'
            },
            {
                weight: 10,
                value: pref.smoking === person.smoking ? 1 : 0.2,
                text: 'Compatible smoking preferences'
            }
        ]);
    }
    function endDate(start, duration, period) {
        const date = new Date(start + 'T12:00:00');
        if (period === 'Daily') date.setDate(date.getDate() + duration);
        else {
            const day = date.getDate();
            date.setDate(1);
            date.setMonth(date.getMonth() + duration);
            date.setDate(
                Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate())
            );
        }
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    function available(p, start, end) {
        return (
            start >= p.availableFrom &&
            end <= p.availableTo &&
            !state.rentals.some(
                (item) =>
                    item.status !== 'closed' &&
                    item.request.propertyId === p.id &&
                    start < item.endDate &&
                    end > item.request.startDate
            )
        );
    }
    function estimate(p) {
        const peers = state.properties.filter(
            (item) =>
                item.status === 'published' &&
                item.area === p.area &&
                item.period === p.period &&
                item.id !== p.id
        );
        const average = peers.length
            ? peers.reduce((n, item) => n + item.price, 0) / peers.length
            : p.period === 'Daily'
              ? 18
              : 180;
        return {
            low: Math.round(average * 0.9),
            high: Math.round(average * 1.1),
            average,
            condition: 'Sample: good',
            furnishing: p.furnished,
            maintenance: 'Example report only; inspect the space',
            sample: true
        };
    }
    function risk(p) {
        const report = estimate(p);
        let value = 5;
        const reasons = [];
        if (p.price < report.average * 0.55) {
            value += 50;
            reasons.push('Price far below the sample area average');
        }
        if (rules.patterns.suspicious.test(p.description)) {
            value += 30;
            reasons.push('Advance-payment or urgent-transfer language');
        }
        if (!p.photos.length) {
            value += 15;
            reasons.push('No property photos supplied');
        }
        return {
            risk: Math.min(100, value),
            riskReasons: reasons.length ? reasons : ['No rule-based warning found']
        };
    }
    function validateListing(data) {
        requireText('title', data.title);
        requireText('text', data.description);
        requireText('money', data.price);
        requireText('date', data.availableFrom);
        requireText('date', data.availableTo);
        if (Number(data.price) <= 0) fail('Rent must be greater than zero.');
        for (const field of ['beds', 'baths', 'size']) {
            requireText('integer', data[field]);
            const n = Number(data[field]);
            if (n < (field === 'size' ? 5 : 1) || n > (field === 'size' ? 9999 : 20))
                fail('Choose a valid ' + field + '.');
        }
        if (data.availableTo <= data.availableFrom)
            fail('Availability end must be after the start.');
        if (!data.photos?.length) fail('Choose at least one property photo.');
    }
    function conversation(peerId, peerName, kind = 'landlord') {
        const me = user();
        let item = state.conversations.find(
            (c) =>
                c.kind === kind && c.participants.includes(me.id) && c.participants.includes(peerId)
        );
        if (!item) {
            item = {
                id: id(),
                peerName,
                peerId,
                kind,
                participants: [me.id, peerId],
                messages: []
            };
            state.conversations.push(item);
        }
        return item;
    }
    const api = {
        isDemo: true,
        state,
        user,
        profile,
        propertyMatch,
        roommateMatch,
        estimate,
        risk,
        endDate,
        available,
        id,
        log,
        photo: (p, width = 900) => {
            if (p.photos?.[0]?.url) {
                try {
                    const base = new URL(
                        window.CampusConfig?.apiBaseUrl || '/',
                        window.parent?.location?.href || 'https://localhost/'
                    );
                    const url = new URL(p.photos[0].url, base);
                    if (['http:', 'https:', 'blob:'].includes(url.protocol))
                        return url.href.replace(/["'<>]/g, encodeURIComponent);
                } catch (_) {}
            }
            return `https://images.unsplash.com/${encodeURIComponent(p.photo || 'photo-1600210492486-724fe5c67fb0')}?auto=format&fit=crop&w=${width}&q=85`;
        },
        selectedRoommate() {
            return (
                state.roommates.find((p) => p.id === state.selectedRoommateByUser[user().id]) ||
                null
            );
        },
        chooseRoommate(key) {
            const person = key
                ? state.roommates.find((p) => p.id === key && p.id !== user().id)
                : null;
            if (key && !person) fail('Choose a valid roommate.');
            state.selectedRoommateByUser[user().id] = person?.id || null;
            return person;
        },
        validateRoommate(data) {
            if (data.roommate !== true) return null;
            return (
                state.roommates.find((p) => p.id === data.roommateId && p.id !== user().id) ||
                fail('Choose the roommate who will move in with you.')
            );
        },
        async register(data) {
            for (const field of ['firstName', 'lastName']) requireText('name', data[field]);
            requireText('email', data.email);
            requireText('phone', data.phone);
            requireText('password', data.password);
            if (!['tenant', 'landlord'].includes(data.role)) fail('Choose tenant or landlord.');
            if (state.users.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase()))
                fail('This email is already registered in this preview.');
            const account = {
                id: id(),
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                email: data.email.trim().toLowerCase(),
                phone: data.phone.trim(),
                password: data.password,
                role: data.role,
                city: data.city,
                occupation: data.occupation,
                destination: data.university,
                active: true
            };
            state.users.push(account);
            selectUser(account);
            log('New ' + account.role + ' account: ' + account.firstName);
            return account;
        },
        async login(data) {
            requireText('email', data.email);
            const account = state.users.find(
                (u) =>
                    u.email.toLowerCase() === data.email.trim().toLowerCase() &&
                    u.password === data.password
            );
            if (!account)
                fail(
                    'Email or password is incorrect. Use a preview account or register in this session.'
                );
            if (!account.active) fail('This preview account has been suspended.');
            selectUser(account);
            log(account.firstName + ' signed in');
            return account;
        },
        async resetPreferences() {
            state.preferences = null;
            state.preferencesByUser[user().id] = null;
        },
        async openContactChat(key) {
            const contact =
                state.contacts.find((c) => c.id === key) || fail('Contact request not found.');
            if (contact.status !== 'accepted') fail('Wait for contact acceptance before chatting.');
            const person = state.roommates.find((p) => p.id === contact.personId);
            return api.conversation(contact.personId, person?.name || 'Roommate', 'roommate');
        },
        async setFavorite(key, saved) {
            const p = property(key);
            const index = state.saved.indexOf(p.id);
            if (index >= 0) state.saved.splice(index, 1);
            if (saved) state.saved.push(p.id);
            return state.saved;
        },
        async addReview(key, data) {
            requireText('text', data.text);
            const p = property(key);
            p.reviews.push({
                name: user().firstName,
                rating: Number(data.rating),
                text: data.text
            });
            return p;
        },
        async setListingStatus(key, status) {
            const p = property(key);
            if (!['archived', 'published'].includes(status)) fail('Choose a valid listing status.');
            if (status === 'published' && p.listingFee?.status === 'unpaid') fail('Pay the listing fee before publishing.');
            if (status === 'published' && p.risk >= 60) fail('This listing requires admin review.');
            p.status = status;
            log(p.title + ' ' + status);
            return p;
        },
        async resolveReport(key) {
            const report = state.reports.find((r) => r.id === key) || fail('Report not found.');
            report.status = 'resolved';
            log('Report resolved: ' + report.title);
            return report;
        },
        logout() {
            state.currentUser = null;
            state.firstName = '';
            state.preferences = null;
            state.saved = [];
        },
        async getPreferences() {
            return state.preferences;
        },
        async savePreferences(data) {
            state.preferences = data;
            state.preferencesByUser[user().id] = data;
            return data;
        },
        async getProperties() {
            return state.properties.filter((p) => p.status === 'published');
        },
        async getProperty(key) {
            return property(key);
        },
        async getRequests() {
            return state.requests.filter((r) => r.tenantId === user().id);
        },
        async getRequest(key) {
            return request(key);
        },
        async createRequest(data) {
            const p = property(data.propertyId);
            const person = api.validateRoommate(data);
            if (p.status !== 'published') fail('This property is awaiting review.');
            const existing = state.requests.find(
                (r) =>
                    r.propertyId === p.id &&
                    r.tenantId === user().id &&
                    ['submitted', 'approved', 'inspection', 'payment'].includes(r.status)
            );
            if (existing) return existing;
            requireText('date', data.startDate);
            requireText('text', data.message);
            if (
                !Number.isInteger(data.duration) ||
                data.duration < 1 ||
                data.duration > (p.period === 'Daily' ? 365 : 36)
            )
                fail('Choose a valid rental duration.');
            const finish = endDate(data.startDate, data.duration, p.period);
            if (data.startDate < window.CampusToday() || !available(p, data.startDate, finish))
                fail('The property is not available for those dates.');
            const item = {
                ...data,
                roommate: data.roommate === true,
                roommateId: person?.id || null,
                roommateName: person?.name || null,
                id: id(),
                tenantId: user().id,
                tenantName: user().firstName + ' ' + user().lastName,
                property: { ...p },
                propertyId: p.id,
                status: 'submitted',
                createdAt: new Date().toISOString(),
                deposit: p.price,
                total: p.price * (p.period === 'Daily' ? data.duration : 1) + p.price,
                endDate: finish,
                landlordAccepted: false
            };
            state.requests.unshift(item);
            log('Rental request for ' + p.title);
            return item;
        },
        async reviewRequest(key, approved) {
            const r = request(key);
            if (r.status !== 'submitted') fail('This request is already reviewed.');
            r.status = approved ? 'approved' : 'rejected';
            r.landlordAccepted = approved;
            log((approved ? 'Approved: ' : 'Rejected: ') + r.property.title);
            return r;
        },
        async signAgreement(key) {
            const r = request(key);
            if (r.status !== 'approved' || !r.landlordAccepted)
                fail('Wait for landlord approval before signing.');
            r.tenantAccepted = true;
            r.status = 'inspection';
            log('Agreement accepted for ' + r.property.title);
            return r;
        },
        async saveInspection(key, data) {
            const r = request(key);
            if (r.status !== 'inspection') fail('Complete the agreement before inspection.');
            r.inspection = data;
            r.status = 'payment';
            return r;
        },
        async confirmArrangement(key) {
            const r = request(key);
            if (r.status !== 'payment') fail('Complete inspection before confirming the arrangement.');
            if (!available(r.property, r.startDate, r.endDate))
                fail('These dates are already booked. Choose another rental period.');
            r.status = 'active';
            const item = {
                id: r.id,
                request: r,
                status: 'active',
                endDate: r.endDate,
                payments: [],
                paymentMethod: 'direct-to-landlord',
                moveInComplete: false,
                conditions: { initial: null, final: null }
            };
            state.rentals.unshift(item);
            log('Direct rental arrangement confirmed for ' + r.property.title);
            return { rentalId: r.id };
        },
        async getRentals() {
            return state.rentals.filter((r) => r.request.tenantId === user().id);
        },
        async completeMoveIn(key) {
            const item = rental(key);
            item.moveInComplete = true;
            log('Move-in confirmed for ' + item.request.property.title);
            return item;
        },
        saveCondition(key, phase, report) {
            const item = rental(key);
            if (item.status === 'closed') fail('This rental is already closed.');
            if (
                !Array.isArray(report.items) ||
                !report.items.length ||
                report.items.some(
                    (i) => !['Good', 'Minor wear', 'Needs repair'].includes(i.condition)
                )
            )
                fail('Record a valid condition checklist.');
            if (!['initial', 'final'].includes(phase)) fail('Unknown report type.');
            if (phase === 'final' && !item.conditions.initial)
                fail('Record the initial condition first.');
            if (!report.video) fail('Choose a walkthrough video.');
            if (
                item.conditions[phase]?.video?.url !== report.video.url &&
                item.conditions[phase]?.video?.url
            )
                window.CampusMedia.revoke(item.conditions[phase].video.url);
            item.conditions[phase] = { ...report, date: new Date().toISOString() };
            log(
                (phase === 'initial' ? 'Move-in' : 'Move-out') +
                    ' report saved for ' +
                    item.request.property.title
            );
            return item;
        },
        compare(key) {
            const item = rental(key);
            if (!item.conditions.initial || !item.conditions.final)
                fail('Save both walkthrough reports before comparing.');
            return item.conditions.initial.items.map((before, i) => ({
                name: before.name,
                before: before.condition,
                after: item.conditions.final.items[i].condition,
                changed: before.condition !== item.conditions.final.items[i].condition
            }));
        },
        closeRental(key) {
            const item = rental(key);
            api.compare(key);
            item.status = 'closed';
            item.request.status = 'closed';
            log('Rental closed for ' + item.request.property.title);
        },
        addProperty(data) {
            validateListing(data);
            const p = {
                ...data,
                id: Date.now(),
                ownerId: user().id,
                landlord: user().firstName + ' ' + user().lastName,
                price: Number(data.price),
                beds: Number(data.beds),
                baths: Number(data.baths),
                size: Number(data.size),
                commute: 20,
                noise: 2,
                cleanliness: 4,
                smoking: 'Not allowed',
                reviews: [],
                photo: 'photo-1600210492486-724fe5c67fb0'
            };
            Object.assign(p, risk(p));
            p.status = 'awaiting-fee';
            p.listingFee = { amount: 20, currency: 'JOD', status: 'unpaid' };
            state.properties.unshift(p);
            log('New listing: ' + p.title + ' (' + p.status + ')');
            return p;
        },
        payListingFee(key) {
            const p = property(key);
            if (p.ownerId !== user().id) fail('Choose one of your own properties.');
            if (p.listingFee?.status === 'paid') fail('This listing fee is already paid.');
            if (p.status !== 'awaiting-fee') fail('This listing is not awaiting a fee.');
            p.listingFee = { amount: 20, currency: 'JOD', status: 'paid', simulated: true, date: new Date().toISOString() };
            p.status = p.risk >= 60 ? 'pending' : 'published';
            log('Simulated listing fee: JD 20 for ' + p.title);
            return p;
        },
        editProperty(key, data) {
            validateListing(data);
            const p = property(key);
            if (p.ownerId !== user().id) fail('Choose one of your own properties.');
            const updated = {
                ...p,
                ...data,
                id: p.id,
                ownerId: p.ownerId,
                landlord: p.landlord,
                listingFee: p.listingFee,
                price: Number(data.price),
                beds: Number(data.beds),
                baths: Number(data.baths),
                size: Number(data.size)
            };
            Object.assign(updated, risk(updated));
            updated.status =
                p.listingFee?.status === 'unpaid' ? 'awaiting-fee' : updated.risk >= 60 ? 'pending' : p.status === 'archived' ? 'archived' : 'published';
            Object.assign(p, updated);
            log('Listing updated: ' + p.title);
            return p;
        },
        conditionScore(report) {
            return Math.round(
                report.items.reduce(
                    (n, item) =>
                        n +
                        ({ 'Good': 100, 'Minor wear': 85, 'Needs repair': 55 }[item.condition] ||
                            0),
                    0
                ) / report.items.length
            );
        },
        moderateProperty(key, keep) {
            const p = property(key);
            if (keep && p.listingFee?.status === 'unpaid') fail('The owner must pay the listing fee before publication.');
            p.status = keep ? 'published' : 'deleted';
            log((keep ? 'Published: ' : 'Removed: ') + p.title);
        },
        reportProperty(key, data) {
            requireText('text', data.notes);
            const p = property(key);
            const report = {
                id: id(),
                propertyId: p.id,
                title: p.title,
                reason: data.reason,
                notes: data.notes,
                status: 'open',
                name: user().firstName,
                date: new Date().toISOString()
            };
            state.reports.unshift(report);
            log('Listing reported: ' + p.title);
            return report;
        },
        toggleUser(key) {
            const account = state.users.find((u) => u.id === key) || fail('User not found.');
            if (account.role === 'admin') fail('The preview administrator stays active.');
            account.active = !account.active;
            log((account.active ? 'Restored: ' : 'Suspended: ') + account.firstName);
        },
        async getMeetings() {
            return (state.meetings || []).filter((m) => m.participants.includes(user().id));
        },
        async createMeeting(data) {
            requireText('title', data.title);
            const start = new Date(data.startsAt).getTime();
            const duration = Number(data.duration);
            if (!Number.isFinite(start) || start <= Date.now()) fail('Choose a future meeting time.');
            if (![15, 30, 60].includes(duration)) fail('Choose 15, 30 or 60 minutes.');
            let peerId, peerName, subject;
            if (data.kind === 'roommate') {
                if (user().role !== 'tenant') fail('Only tenants can request roommate meetings.');
                const person = state.roommates.find((p) => p.id === data.targetId) || fail('Roommate not found.');
                peerId = person.userId || person.id;
                peerName = person.name;
                subject = 'Roommate introduction';
            } else if (data.kind === 'property') {
                const p = property(data.targetId);
                if (user().role === 'landlord') {
                    if (p.ownerId !== user().id) fail('Choose your own property.');
                    const r = state.requests.find((r) => r.propertyId === p.id && r.tenantId === data.peerId);
                    if (!r) fail('Choose a tenant who requested this property.');
                    peerId = r.tenantId;
                    peerName = r.tenantName;
                } else {
                    if (p.status !== 'published') fail('Choose a published property.');
                    peerId = p.ownerId;
                    peerName = p.landlord;
                }
                subject = p.title;
            } else fail('Choose a property or roommate meeting.');
            if (peerId === user().id) fail('You cannot invite yourself.');
            const item = {
                id: id(), kind: data.kind, targetId: data.targetId, subject,
                title: data.title.trim(), startsAt: new Date(start).toISOString(), duration,
                creatorId: user().id, creatorName: user().firstName + ' ' + user().lastName,
                recipientId: peerId, recipientName: peerName,
                participants: [user().id, peerId], status: 'pending',
                roomName: 'CampusMate-' + id(), createdAt: new Date().toISOString()
            };
            state.meetings ||= [];
            state.meetings.unshift(item);
            log('Meeting invitation: ' + item.title);
            return item;
        },
        async reviewMeeting(key, accepted) {
            const m = state.meetings?.find((m) => m.id === key) || fail('Meeting not found.');
            if (m.recipientId !== user().id) fail('Only the invited person can respond.');
            if (m.status !== 'pending') fail('This invitation has already been answered.');
            if (new Date(m.startsAt).getTime() <= Date.now()) fail('This meeting time has passed. Request a new time.');
            if (accepted) {
                const start = new Date(m.startsAt).getTime(), end = start + m.duration * 60000;
                if (state.meetings.some((other) => other.id !== m.id && other.status === 'accepted' &&
                    other.participants.some((p) => m.participants.includes(p)) &&
                    start < new Date(other.startsAt).getTime() + other.duration * 60000 && end > new Date(other.startsAt).getTime()))
                    fail('This time overlaps another accepted meeting.');
            }
            m.status = accepted ? 'accepted' : 'declined';
            log('Meeting ' + m.status + ': ' + m.title);
            return m;
        },
        async simulateMeetingResponse(key, accepted) {
            const m = state.meetings?.find((m) => m.id === key) || fail('Meeting not found.');
            if (m.creatorId !== user().id || m.kind !== 'roommate' || state.users.some((u) => u.id === m.recipientId))
                fail('Simulation is only available for sample roommate profiles.');
            if (m.status !== 'pending') fail('This invitation has already been answered.');
            const start = new Date(m.startsAt).getTime(), end = start + m.duration * 60000;
            if (start <= Date.now()) fail('This meeting time has passed.');
            if (accepted && state.meetings.some((other) => other.id !== m.id && other.status === 'accepted' &&
                other.participants.some((p) => m.participants.includes(p)) &&
                start < new Date(other.startsAt).getTime() + other.duration * 60000 && end > new Date(other.startsAt).getTime()))
                fail('This time overlaps another accepted meeting.');
            m.status = accepted ? 'accepted' : 'declined';
            m.simulatedResponse = true;
            return m;
        },
        async cancelMeeting(key) {
            const m = state.meetings?.find((m) => m.id === key) || fail('Meeting not found.');
            if (!m.participants.includes(user().id)) fail('This meeting belongs to another account.');
            if (!['pending', 'accepted'].includes(m.status)) fail('This meeting is already closed.');
            m.status = 'cancelled';
            return m;
        },
        async getMeetingRoom(key) {
            const m = state.meetings?.find((m) => m.id === key) || fail('Meeting not found.');
            if (!m.participants.includes(user().id)) fail('This meeting belongs to another account.');
            if (m.status !== 'accepted') fail('The invitation must be accepted before joining.');
            const now = Date.now(), start = new Date(m.startsAt).getTime();
            if (now < start - 10 * 60000 || now > start + m.duration * 60000)
                fail('Join from 10 minutes before the meeting until its scheduled end.');
            return { roomName: m.roomName, displayName: user().firstName + ' ' + user().lastName };
        },
        contact(personId) {
            const person =
                state.roommates.find((p) => p.id === personId) || fail('Roommate not found.');
            let item = state.contacts.find(
                (c) => c.personId === personId && c.userId === user().id
            );
            if (!item) {
                item = { id: id(), personId, userId: user().id, status: 'pending' };
                state.contacts.push(item);
                log('Contact request to ' + person.name);
            }
            return item;
        },
        acceptContact(key) {
            const item =
                state.contacts.find((c) => c.id === key) || fail('Contact request not found.');
            item.status = 'accepted';
            const person = state.roommates.find((p) => p.id === item.personId);
            return conversation(person.id, person.name, 'roommate');
        },
        conversation,
        sendMessage(key, text) {
            requireText('text', text);
            const item =
                state.conversations.find((c) => c.id === key) || fail('Conversation not found.');
            if (!item.participants.includes(user().id))
                fail('Choose a conversation for this account.');
            item.messages.push({
                id: id(),
                senderId: user().id,
                name: user().firstName,
                text: text.trim(),
                date: new Date().toISOString()
            });
            return item;
        },
        sampleReply(key) {
            const item =
                state.conversations.find((c) => c.id === key) || fail('Conversation not found.');
            const peerId = item.participants.find((p) => p !== user().id);
            item.messages.push({
                id: id(),
                senderId: peerId,
                name: item.peerName,
                text: 'Sample reply: thanks! We can discuss the dates, budget and handover here.',
                date: new Date().toISOString()
            });
        },
        async updateProfile(data) {
            for (const field of ['firstName', 'lastName']) requireText('name', data[field]);
            requireText('email', data.email);
            requireText('phone', data.phone);
            if (
                state.users.some(
                    (u) =>
                        u.id !== user().id &&
                        u.email.toLowerCase() === data.email.trim().toLowerCase()
                )
            )
                fail('Another preview account uses this email.');
            const fields = [
                'firstName',
                'lastName',
                'email',
                'phone',
                'city',
                'occupation',
                'destination'
            ];
            Object.assign(
                user(),
                Object.fromEntries(
                    fields.filter((k) => data[k] !== undefined).map((k) => [k, data[k]])
                )
            );
            state.firstName = data.firstName;
            return user();
        }
    };
    window.CampusAccess.install(api);
    window.CampusAPI = api;
})();
