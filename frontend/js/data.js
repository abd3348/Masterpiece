/* The JSON file is the source of demo data. seed.js is generated for file:// use. */
(() => {
    'use strict';
    const today = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    function create(seed = window.CampusSeed) {
        const data = seed
            ? JSON.parse(JSON.stringify(seed))
            : { users: [], properties: [], roommates: [] };
        const users = data.users.map((user) => ({ ...user, password: 'Campus123' })); // Demo accounts only.
        return {
            requests: [],
            rentals: [],
            preferences: null,
            saved: [],
            landingSaved: [],
            firstName: '',
            currentUser: null,
            preferencesByUser: {},
            savedByUser: {},
            selectedRoommateByUser: {},
            users,
            properties: data.properties,
            roommates: data.roommates,
            contacts: [],
            conversations: [],
            meetings: [],
            reports: [],
            activity: [],
            botMessages: [],
            notifications: []
        };
    }
    async function loadSeed() {
        if (!['demo', 'api'].includes(window.CampusConfig?.mode || 'demo'))
            throw new Error('Choose demo or api in js/config.js.');
        if (window.CampusConfig?.mode === 'api') {
            if (location.protocol === 'file:')
                throw new Error('Serve the frontend over HTTP(S) before enabling API mode.');
            return create({ users: [], properties: [], roommates: [] });
        }
        if (location.protocol === 'file:') return create();
        const response = await fetch(window.CampusConfig?.seedUrl || 'data/campus-seed.json', {
            cache: 'no-cache'
        });
        if (!response.ok) throw new Error('Could not load demo JSON (' + response.status + ').');
        const seed = await response.json();
        if (
            seed.schemaVersion !== 1 ||
            !Array.isArray(seed.properties) ||
            !Array.isArray(seed.users) ||
            !Array.isArray(seed.roommates)
        )
            throw new Error('The demo JSON does not match schema version 1.');
        return create(seed);
    }
    window.CampusCreateState = create;
    window.CampusLoadSeed = loadSeed;
    window.CampusToday = today;
})();
