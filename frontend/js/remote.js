/* Maps the frontend service methods to the documented ASP.NET JSON contract. */
(() => {
    'use strict';
    if (window.CampusConfig?.mode !== 'api') return;
    const api = window.CampusAPI,
        transport = window.CampusTransport;
    api.isDemo = false;
    const key = (value) => encodeURIComponent(value);
    const pick = (data, fields) =>
        Object.fromEntries(
            fields.filter((field) => data[field] !== undefined).map((field) => [field, data[field]])
        );
    function safePayload(value) {
        if (typeof value === 'string' && value.startsWith('blob:'))
            throw new Error('Upload the file first; browser blob URLs cannot be sent to the API.');
        if (Array.isArray(value)) value.forEach(safePayload);
        else if (value && typeof value === 'object') Object.values(value).forEach(safePayload);
        return value;
    }
    async function read(path) {
        return transport.request(path);
    }
    async function mutate(path, method, body) {
        const result = await transport.request(path, {
            method,
            body: body === undefined ? undefined : safePayload(body)
        });
        await transport.hydrate(api.state);
        return result;
    }
    async function media(item) {
        if (!item) return null;
        if (item.file) {
            window.CampusValidation.media(
                item.file,
                item.file.type.startsWith('image/') ? 'image' : 'video'
            );
            const data = new window.parent.FormData();
            data.append('file', item.file, item.name || item.file.name);
            const result = await transport.request('/media', { method: 'POST', body: data });
            const base = new URL(
                window.CampusConfig.apiBaseUrl,
                window.parent?.location?.href || location.href
            );
            let url;
            try {
                url = result?.url ? new URL(result.url, base) : null;
            } catch (_) {}
            if (!result?.id || !url || !['http:', 'https:'].includes(url.protocol))
                throw new Error('The media endpoint must return an id and an HTTP(S) URL.');
            return { id: result.id, name: result.name || item.name, url: url.href };
        }
        if (!item.id) throw new Error('Existing media must include its server id.');
        return pick(item, ['id', 'name', 'url']);
    }
    async function listing(data) {
        const body = pick(data, [
            'title',
            'city',
            'area',
            'type',
            'period',
            'furnished',
            'description',
            'availableFrom',
            'availableTo',
            'amenities'
        ]);
        for (const field of ['price', 'beds', 'baths', 'size']) body[field] = Number(data[field]);
        body.photos = await Promise.all(data.photos.map(media));
        body.video = await media(data.video);
        return body;
    }
    Object.assign(api, {
        sampleReply() {
            throw new Error('Replies come from the other account in API mode.');
        },
        register: (data) =>
            mutate('/auth/register', 'POST', {
                ...pick(data, [
                    'role',
                    'firstName',
                    'lastName',
                    'email',
                    'phone',
                    'password',
                    'city',
                    'occupation'
                ]),
                destination: data.destination || data.university || ''
            }),
        login: (data) => mutate('/auth/login', 'POST', pick(data, ['email', 'password'])),
        logout: () => mutate('/auth/logout', 'POST'),
        resetPreferences: () => mutate('/me/preferences', 'DELETE'),
        getPreferences: () => read('/me/preferences'),
        savePreferences: (data) => mutate('/me/preferences', 'PUT', data),
        getProperties: () => read('/properties'),
        getProperty: (id) => read('/properties/' + key(id)),
        getRequests: () => read('/rental-requests'),
        getRequest: (id) => read('/rental-requests/' + key(id)),
        createRequest: async (data) => {
            const person = api.validateRoommate(data);
            return mutate('/rental-requests', 'POST', {
                ...pick(data, ['propertyId', 'startDate', 'duration', 'message']),
                roommate: data.roommate === true,
                roommateId: person?.id || null
            });
        },
        reviewRequest: (id, approved) =>
            mutate('/rental-requests/' + key(id) + '/review', 'POST', {
                approved,
                acceptedTerms: approved
            }),
        signAgreement: (id) =>
            mutate('/rental-requests/' + key(id) + '/agreement', 'POST', { accepted: true }),
        saveInspection: (id, data) =>
            mutate('/rental-requests/' + key(id) + '/inspection', 'POST', data),
        confirmArrangement: (id) => mutate('/rental-requests/' + key(id) + '/confirm-arrangement', 'POST'),
        getRentals: () => read('/rentals'),
        completeMoveIn: (id) =>
            mutate('/rentals/' + key(id) + '/move-in', 'POST', { confirmed: true }),
        saveCondition: async (id, phase, report) =>
            mutate('/rentals/' + key(id) + '/conditions/' + key(phase), 'PUT', {
                items: report.items,
                notes: report.notes,
                video: await media(report.video)
            }),
        closeRental: (id) => mutate('/rentals/' + key(id) + '/close', 'POST', { confirmed: true }),
        addProperty: async (data) => mutate('/properties', 'POST', await listing(data)),
        payListingFee: (id) => mutate('/properties/' + key(id) + '/listing-fee/checkout', 'POST'),
        getMeetings: () => read('/meetings'),
        createMeeting: (data) => mutate('/meetings', 'POST', pick(data, ['kind', 'targetId', 'peerId', 'title', 'startsAt', 'duration'])),
        reviewMeeting: (id, accepted) => mutate('/meetings/' + key(id) + '/response', 'POST', { accepted }),
        cancelMeeting: (id) => mutate('/meetings/' + key(id) + '/cancel', 'POST'),
        getMeetingRoom: (id) => read('/meetings/' + key(id) + '/room'),
        simulateMeetingResponse: () => { throw new Error('Simulation is unavailable in API mode.'); },
        editProperty: async (id, data) =>
            mutate('/properties/' + key(id), 'PUT', await listing(data)),
        moderateProperty: (id, keep) =>
            mutate('/admin/properties/' + key(id) + '/review', 'POST', { keep }),
        reportProperty: (id, data) =>
            mutate('/properties/' + key(id) + '/reports', 'POST', pick(data, ['reason', 'notes'])),
        toggleUser: (id) => {
            const account = api.state.users.find((user) => user.id === id);
            if (!account) throw new Error('User not found.');
            return mutate('/admin/users/' + key(id) + '/status', 'PUT', {
                active: !account.active
            });
        },
        contact: (personId) => mutate('/roommate-contacts', 'POST', { personId }),
        acceptContact: (id) => mutate('/roommate-contacts/' + key(id) + '/accept', 'POST'),
        conversation: (peerId, peerName, kind = 'landlord') =>
            mutate('/conversations', 'POST', { peerId, kind }),
        sendMessage: (id, text) =>
            mutate('/conversations/' + key(id) + '/messages', 'POST', { text }),
        updateProfile: (data) =>
            mutate(
                '/me/profile',
                'PUT',
                pick(data, [
                    'firstName',
                    'lastName',
                    'email',
                    'phone',
                    'city',
                    'occupation',
                    'destination'
                ])
            ),
        setFavorite: (id, saved) => mutate('/me/favorites/' + key(id), saved ? 'PUT' : 'DELETE'),
        addReview: (id, data) =>
            mutate('/properties/' + key(id) + '/reviews', 'POST', {
                rating: Number(data.rating),
                text: data.text
            }),
        setListingStatus: (id, status) =>
            mutate('/properties/' + key(id) + '/status', 'PUT', { status }),
        resolveReport: (id) => mutate('/admin/reports/' + key(id) + '/resolve', 'POST'),
        askAssistant: (text) =>
            transport.request('/assistant/messages', { method: 'POST', body: { text } })
    });
    window.CampusAccess.install(api);
})();
