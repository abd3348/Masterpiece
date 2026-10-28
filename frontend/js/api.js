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
    function publicProperty(source) {
        const activeRental = state.rentals.find(
            (item) => item.status === 'active' && item.request.propertyId === source.id
        );
        if (!activeRental) return source;
        if (activeRental.request.tenantId === user().id) return null;
        const partial = state.subletListings.find(
            (item) => item.propertyId === source.id && item.status === 'published'
        );
        if (!partial) return null;
        return {
            ...source,
            status: 'partial',
            title: `${source.title} · Partial rental`,
            price: partial.price,
            period: 'Daily',
            type: partial.occupancy === 'private' ? 'Private room' : 'Shared room',
            beds: 1,
            availableFrom: partial.startDate,
            availableTo: partial.endDate,
            partialOffer: partial,
            description: partial.notes || 'A room offered short-term by a current tenant.'
        };
    }
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
            if (report.status === 'resolved') return report;
            report.status = 'resolved';
            report.resolution = 'solved';
            report.resolvedAt = new Date().toISOString();
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
            return state.properties
                .filter((p) => p.status === 'published')
                .map(publicProperty)
                .filter(Boolean);
        },
        async getProperty(key) {
            const p = property(key);
            if (user().role === 'admin') return p;
            const activeRental = state.rentals.find(
                (item) => item.status === 'active' && item.request.propertyId === p.id
            );
            if (
                activeRental &&
                (activeRental.request.tenantId === user().id || p.ownerId === user().id)
            )
                return p;
            return publicProperty(p) || fail('This property is no longer available.');
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
            if (r.negotiation?.status === 'pending') fail('Wait for the landlord to review the proposed rent before accepting the agreement.');
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
        async getSubletListings() {
            return state.subletListings.filter((item) => item.tenantId === user().id && item.status !== 'deleted');
        },
        async getSubletRequests() {
            return state.subletRequests.filter(
                (item) => item.ownerTenantId === user().id || item.tenantId === user().id
            );
        },
        createSubletRequest(listingId, data = {}) {
            const listing = state.subletListings.find(
                (item) => item.id === listingId && item.status === 'published'
            );
            if (!listing) fail('This partial rental is no longer available.');
            if (!state.rentals.some((r) => r.id === listing.rentalId && r.status === 'active') ||
                !state.properties.some((p) => p.id === listing.propertyId && p.status === 'published'))
                fail('This partial rental is no longer available.');
            if (listing.tenantId === user().id) fail('You cannot request your own room offer.');
            const existing = state.subletRequests.find(
                (item) => item.listingId === listingId && item.tenantId === user().id && item.status === 'pending'
            );
            if (existing) return existing;
            const requestItem = {
                id: id(), listingId, ownerTenantId: listing.tenantId,
                ownerTenantName: state.users.find((u) => u.id === listing.tenantId)?.firstName || 'Tenant',
                tenantId: user().id,
                tenantName: user().firstName + ' ' + user().lastName, tenantEmail: user().email,
                startDate: String(data.startDate || '').trim(),
                endDate: String(data.endDate || '').trim(),
                duration: listing.duration, status: 'pending',
                createdAt: new Date().toISOString()
            };
            if (!requestItem.startDate || !requestItem.endDate || !rules.valid('date', requestItem.startDate) || !rules.valid('date', requestItem.endDate) || requestItem.startDate >= requestItem.endDate)
                fail('Choose a valid request date range.');
            if (requestItem.startDate < listing.startDate || requestItem.endDate > listing.endDate)
                fail('Choose dates inside the partial rental offer.');
            if (requestItem.startDate < window.CampusToday()) fail('Choose a current or future start date.');
            if (state.subletRequests.some((r) => r.listingId === listingId && r.status === 'approved' && requestItem.startDate < r.endDate && requestItem.endDate > r.startDate))
                fail('These dates overlap an accepted request.');
            requestItem.duration = Math.round((new Date(requestItem.endDate) - new Date(requestItem.startDate)) / 86400000);
            state.subletRequests.unshift(requestItem);
            log('Partial rental request sent for ' + listing.propertyTitle);
            return requestItem;
        },
        reviewSubletRequest(key, approved) {
            const requestItem = state.subletRequests.find((item) => item.id === key);
            if (!requestItem || requestItem.ownerTenantId !== user().id)
                fail('Only the tenant who rented this apartment can review the request.');
            if (requestItem.status !== 'pending') fail('This partial rental request is already reviewed.');
            if (approved && state.subletRequests.some((item) => item.id !== key && item.listingId === requestItem.listingId && item.status === 'approved' && requestItem.startDate < item.endDate && requestItem.endDate > item.startDate))
                fail('These dates overlap another accepted partial rental request.');
            requestItem.status = approved ? 'approved' : 'rejected';
            log((approved ? 'Approved' : 'Rejected') + ' partial rental request for ' + requestItem.listingId);
            return requestItem;
        },
        createSubletListing(data) {
            const activeRental = state.rentals.find(
                (item) =>
                    item.id === data.rentalId &&
                    item.request.tenantId === user().id &&
                    item.status === 'active'
            );
            if (!activeRental) fail('Choose one of your active rentals.');
            const source = activeRental.request.property;
            const roomCount = Math.max(1, Number(source.beds) || 1);
            const roomNumber = Number(data.roomNumber);
            const startDate = data.startDate || activeRental.request.startDate;
            const endDateValue = data.endDate || endDate(startDate, Number(data.duration) || 1, 'Daily');
            const duration = Math.round((new Date(endDateValue) - new Date(startDate)) / 86400000);
            if (!Number.isInteger(roomNumber) || roomNumber < 1 || roomNumber > roomCount)
                fail('Choose a room included in your rented home.');
            if (!['private', 'shared'].includes(data.occupancy))
                fail('Choose private or shared occupancy.');
            if (!startDate || !endDateValue || !rules.valid('date', startDate) || !rules.valid('date', endDateValue) || startDate >= endDateValue)
                fail('Choose a valid date range.');
            if (startDate < activeRental.request.startDate || endDateValue > activeRental.endDate)
                fail('The offer dates must stay inside your active rental dates.');
            if (!Number.isInteger(duration) || duration < 1 || duration > 30)
                fail('Short-term stays must be between 1 and 30 days.');
            if (state.subletListings.some((item) => item.propertyId === source.id && item.roomNumber === roomNumber && item.status === 'published' && startDate < item.endDate && endDateValue > item.startDate))
                fail('This room already has a published offer during part of those dates.');
            if (!Number.isFinite(Number(data.price)) || Number(data.price) <= 0)
                fail('Enter a valid daily price.');
            const listing = {
                id: id(), tenantId: user().id, rentalId: activeRental.id, propertyId: source.id,
                propertyTitle: source.title, area: source.area,
                homeSpecs: { type: source.type, furnished: source.furnished, beds: source.beds, baths: source.baths, size: source.size, amenities: source.amenities || [] },
                roomNumber,
                roomLabel: `Room ${roomNumber}`, occupancy: data.occupancy, duration, startDate, endDate: endDateValue,
                price: Number(data.price), notes: String(data.notes || '').trim().slice(0, 500),
                fee: { amount: 5, currency: 'JOD', status: 'unpaid' },
                status: 'awaiting-fee', createdAt: new Date().toISOString()
            };
            state.subletListings.unshift(listing);
            log('Short-term room offer created for ' + source.title + ' (awaiting JD 5 fee)');
            return listing;
        },
        paySubletListingFee(key) {
            const listing = state.subletListings.find((item) => item.id === key);
            if (!listing || listing.tenantId !== user().id) fail('Choose one of your own room offers.');
            if (listing.fee.status === 'paid') fail('This room offer fee is already paid.');
            listing.fee = { amount: 5, currency: 'JOD', status: 'paid', simulated: true, date: new Date().toISOString() };
            listing.status = 'published';
            log('Simulated room offer fee: JD 5 for ' + listing.propertyTitle);
            return listing;
        },
        editSubletListing(key, data) {
            const listing = state.subletListings.find((item) => item.id === key);
            if (!listing || listing.tenantId !== user().id)
                fail('Only the tenant who rented the apartment can edit this offer.');
            const duration = Number(data.duration), price = Number(data.price);
            const startDate = data.startDate || listing.startDate;
            const endDateValue = data.endDate || listing.endDate;
            if (!Number.isInteger(duration) || duration < 1 || duration > 30)
                fail('Short-term stays must be between 1 and 30 days.');
            if (!Number.isFinite(price) || price <= 0) fail('Enter a valid daily price.');
            if (!rules.valid('date', startDate) || !rules.valid('date', endDateValue) || startDate >= endDateValue)
                fail('Choose a valid date range.');
            const activeRental = state.rentals.find((item) => item.id === listing.rentalId && item.status === 'active');
            if (!activeRental || startDate < activeRental.request.startDate || endDateValue > activeRental.endDate)
                fail('The offer dates must stay inside your active rental dates.');
            const actualDuration = Math.round((new Date(endDateValue) - new Date(startDate)) / 86400000);
            if (duration !== actualDuration) fail('Duration must match the selected dates.');
            if (state.subletRequests.some((item) => item.listingId === key && item.status === 'approved') &&
                (price !== listing.price || startDate !== listing.startDate || endDateValue !== listing.endDate))
                fail('Price and dates are locked because this offer has an accepted request.');
            listing.duration = duration;
            listing.price = price;
            listing.startDate = startDate;
            listing.endDate = endDateValue;
            listing.notes = String(data.notes || '').trim().slice(0, 500);
            log('Updated short-term room offer for ' + listing.propertyTitle);
            return listing;
        },
        deleteSubletListing(key) {
            const listing = state.subletListings.find((item) => item.id === key);
            if (!listing || listing.tenantId !== user().id)
                fail('Only the tenant who rented the apartment can delete this offer.');
            if (state.subletRequests.some((item) => item.listingId === key && item.status === 'approved'))
                fail('This offer has an accepted request and cannot be deleted.');
            listing.status = 'deleted';
            log('Deleted short-term room offer for ' + listing.propertyTitle);
            return listing;
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
            updated.moderationAnalysis = null;
            updated.moderation = null;
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
        moderateProperty(key, keep, reason = '', notes = '') {
            const p = property(key);
            if (keep && p.listingFee?.status === 'unpaid') fail('The owner must pay the listing fee before publication.');
            if (!p.moderationAnalysis?.completedAt) fail('Analyze and review this listing before making a moderation decision.');
            const reasons = ['Suspected fraud', 'Misleading information', 'Suspicious pricing', 'Other policy concern'];
            if (!keep && !reasons.includes(reason)) fail('Choose a removal reason.');
            if (!keep && (String(notes).trim().length < 10 || String(notes).trim().length > 1000)) fail('Explain the removal in 10–1000 characters.');
            p.status = keep ? 'published' : 'deleted';
            p.moderation = { decision: keep ? 'approved' : 'removed', reason: keep ? '' : reason, notes: keep ? '' : String(notes).trim(), reviewedBy: user().id, reviewedAt: new Date().toISOString() };
            if (!keep) state.notifications.unshift({ id: id(), recipientId: p.ownerId, propertyId: p.id, propertyTitle: p.title, type: 'listing-removed', text: 'Your listing “' + p.title + '” was removed after admin review. Reason: ' + reason + '. ' + p.moderation.notes, date: new Date().toISOString(), read: false });
            if (!keep) for (const report of state.reports.filter((r) => r.propertyId === p.id && r.status === 'open')) {
                report.status = 'resolved'; report.resolution = 'listing-removed'; report.resolvedAt = p.moderation.reviewedAt;
            }
            log((keep ? 'Published: ' : 'Removed: ') + p.title);
            return p;
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
            } else if (data.kind === 'sublet') {
                const requestItem = state.subletRequests.find((item) => item.id === data.targetId && item.status === 'approved') || fail('The partial rental request must be accepted first.');
                const listing = state.subletListings.find((item) => item.id === requestItem.listingId && item.status === 'published') || fail('This partial rental is no longer available.');
                if (user().id !== requestItem.ownerTenantId && user().id !== requestItem.tenantId) fail('Only the two tenants in this accepted request can meet.');
                peerId = user().id === requestItem.ownerTenantId ? requestItem.tenantId : requestItem.ownerTenantId;
                peerName = user().id === requestItem.ownerTenantId ? requestItem.tenantName : requestItem.ownerTenantName;
                subject = listing.propertyTitle + ' · ' + listing.roomLabel;
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
    Object.assign(api, {
        async getPublicSubletListings() {
            const today = window.CampusToday();
            return state.subletListings.filter((s) => s.status === 'published' && s.endDate > today &&
                state.rentals.some((r) => r.id === s.rentalId && r.status === 'active') &&
                state.properties.some((p) => p.id === s.propertyId && p.status === 'published'))
                .map((s) => {
                    const p = state.properties.find((p) => p.id === s.propertyId);
                    return { id: s.id, tenantId: s.tenantId, rentalId: s.rentalId, propertyId: s.propertyId, propertyTitle: s.propertyTitle, area: s.area, roomNumber: s.roomNumber, roomLabel: s.roomLabel, occupancy: s.occupancy, duration: s.duration, startDate: s.startDate, endDate: s.endDate, price: s.price, notes: s.notes, status: s.status, property: { id: p.id, title: p.title, city: p.city, area: p.area, photos: p.photos, photo: p.photo, furnished: p.furnished, amenities: p.amenities } };
                });
        },
        async getSubletOffer(key) {
            const offer = (await api.getPublicSubletListings()).find((s) => s.id === key) || fail('This partial rental offer is no longer available.');
            const p = property(offer.propertyId);
            return { ...p, status: 'partial', title: p.title + ' · ' + offer.roomLabel, price: offer.price, period: 'Daily', beds: 1, type: offer.occupancy === 'private' ? 'Private room' : 'Shared room', availableFrom: offer.startDate, availableTo: offer.endDate, description: offer.notes || p.description, partialOffer: offer };
        },
        async reviewListingAnalysis(key) {
            const p = property(key);
            if (p.moderationAnalysis?.source === 'prepared-example') return p.moderationAnalysis;
            const report = risk(p);
            p.moderationAnalysis = { demo: true, risk: report.risk, reasons: report.riskReasons, completedAt: new Date().toISOString(), summary: 'Demo screening uses listing prices, completeness and description rules. It does not inspect video or prove fraud. The admin makes the final decision.' };
            log('Screened listing for admin review: ' + p.title);
            return p.moderationAnalysis;
        },
        async getNotifications() {
            return state.notifications.filter((n) => n.recipientId === user().id);
        },
        async markNotificationRead(key) {
            const n = state.notifications.find((n) => n.id === key && n.recipientId === user().id) || fail('Notification not found.');
            n.read = true;
            return n;
        },
        async analyzePropertyVideo(key) {
            const p = await api.getProperty(key);
            if (!p.video?.url) fail('Upload a property walkthrough video first.');
            return { demo: true, summary: 'Preview report based on listing details. The video content has not been analyzed.', furniture: p.furnished, condition: 'Not assessed from video', maintenance: 'Inspect the apartment in person', limitations: 'A connected video analysis service is required for visual findings.' };
        },
        async getNegotiations() {
            return state.requests.filter((r) => user().role === 'tenant' ? r.tenantId === user().id : r.property.ownerId === user().id);
        },
        async proposeRent(key, amount) {
            const r = request(key);
            if (r.tenantId !== user().id) fail('This rental request belongs to another tenant.');
            if (!['submitted', 'approved'].includes(r.status) || r.tenantAccepted) fail('Rent can only be negotiated before agreement acceptance.');
            const price = Number(amount);
            if (!rules.valid('money', String(amount)) || !Number.isFinite(price) || price <= 0 || price > 99999) fail('Enter a valid rent between JD 0.01 and JD 99,999.');
            if (r.negotiation?.status === 'pending') fail('The landlord is still reviewing your proposed rent.');
            r.negotiation = { price, status: 'pending', proposedAt: new Date().toISOString() };
            log('Proposed rent for ' + r.property.title);
            return r;
        },
        async reviewRent(key, accepted) {
            const r = request(key);
            if (r.property.ownerId !== user().id) fail('Only this property owner can confirm the rent.');
            if (r.negotiation?.status !== 'pending' || !['submitted', 'approved'].includes(r.status)) fail('No pending rent proposal is available.');
            r.negotiation.status = accepted ? 'confirmed' : 'declined';
            if (accepted) {
                r.agreedPrice = r.negotiation.price;
                r.total = Math.round((r.agreedPrice * (r.property.period === 'Daily' ? r.duration : 1) + r.deposit) * 100) / 100;
            }
            log((accepted ? 'Confirmed' : 'Declined') + ' proposed rent for ' + r.property.title);
            return r;
        }
    });
    window.CampusAccess.install(api);
    window.CampusAPI = api;
})();
