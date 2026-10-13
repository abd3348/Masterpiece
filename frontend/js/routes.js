/* One registry for physical pages, old bookmarks, and role-specific shared screens. */
(() => {
    'use strict';
    const groups = {
        public: [
            'index',
            'properties',
            'property',
            'market',
            'about',
            'support',
            'faq',
            'privacy',
            'terms'
        ],
        auth: ['login', 'register'],
        tenant: [
            'home',
            'preferences',
            'roommates',
            'favorites',
            'request',
            'requests',
            'agreement',
            'inspection',
            'payment',
            'rentals',
            'sublets',
            'bookings',
            'messages',
            'profile',
            'condition'
        ],
        landlord: [
            'dashboard',
            'requests',
            'bookings',
            'add-property',
            'messages',
            'profile',
            'condition'
        ],
        admin: ['dashboard', 'profile']
    };
    const paths = new Set(
        Object.entries(groups).flatMap(([group, pages]) =>
            pages.map((page) => group + '/' + page + '.html')
        )
    );
    const aliases = Object.fromEntries(
        Object.entries(groups).flatMap(([group, pages]) =>
            pages
                .filter(
                    (page) =>
                        ![
                            'dashboard',
                            'messages',
                            'profile',
                            'condition',
                            'requests',
                            'bookings'
                        ].includes(page)
                )
                .map((page) => [page + '.html', group + '/' + page + '.html'])
        )
    );
    Object.assign(aliases, {
        'requests.html': 'tenant/requests.html',
        'bookings.html': 'tenant/bookings.html',
        'landlord.html': 'landlord/dashboard.html',
        'admin.html': 'admin/dashboard.html'
    });
    function resolve(input, role = 'guest') {
        if (typeof input !== 'string') return null;
        const match = input.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
        if (!match) return null;
        let name = match[1].replace(/\\/g, '/');
        if (name.includes('/html/')) name = name.split('/html/').pop();
        name = name.replace(/^(?:\.\.\/|\.\/|\/)+/, '').replace(/^html\//, '');
        const file = name.split('/').pop(),
            query = new URLSearchParams(match[2] || ''),
            anchor = match[3] || '';
        if (
            (file === 'landlord.html' || name === 'landlord/dashboard.html') &&
            ['requests', 'bookings'].includes(query.get('tab'))
        ) {
            name = 'landlord/' + query.get('tab') + '.html';
            query.delete('tab');
        } else if (!paths.has(name)) {
            if (['messages.html', 'profile.html', 'condition.html'].includes(file))
                name =
                    (['tenant', 'landlord', 'admin'].includes(role) ? role : 'tenant') + '/' + file;
            else name = aliases[file];
        }
        if (!paths.has(name)) return null;
        return name + (query.size ? '?' + query.toString() : '') + anchor;
    }
    const href = (input, role) => {
        const target = resolve(input, role);
        return target ? '../' + target : input;
    };
    const menus = {
        guest: [
            ['public/index.html', 'Home'],
            ['public/properties.html', 'Homes'],
            ['public/market.html', 'Market'],
            ['public/about.html', 'About us'],
            ['public/support.html', 'Support'],
            ['auth/login.html', 'Sign in']
        ],
        tenant: [
            ['tenant/home.html', 'Home'],
            ['public/properties.html', 'Homes'],
            ['tenant/roommates.html', 'Roommates'],
            ['tenant/favorites.html', 'Favorites'],
            ['tenant/messages.html', 'Meetings'],
            ['tenant/requests.html', 'Requests'],
            ['tenant/bookings.html', 'Arrangements'],
            ['tenant/rentals.html', 'Rentals']
            ,['tenant/sublets.html', 'Partial rentals']
        ],
        landlord: [
            ['landlord/dashboard.html', 'My properties'],
            ['landlord/requests.html', 'Requests'],
            ['landlord/bookings.html', 'Arrangements'],
            ['landlord/add-property.html', 'Add property'],
            ['landlord/messages.html', 'Meetings'],
            ['public/market.html', 'Market']
        ],
        admin: [
            ['admin/dashboard.html', 'Overview'],
            ['admin/dashboard.html?tab=users', 'Users'],
            ['admin/dashboard.html?tab=properties', 'Properties'],
            ['admin/dashboard.html?tab=reports', 'Reports'],
            ['admin/dashboard.html?tab=ai', 'Analysis'],
            ['admin/dashboard.html?tab=activity', 'Activity'],
            ['public/market.html', 'Market']
        ]
    };
    window.CampusRoutes = {
        groups,
        paths,
        resolve,
        href,
        menu: (role) => menus[role] || menus.guest
    };
})();
