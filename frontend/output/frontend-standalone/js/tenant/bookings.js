/* Preserve old Arrangements bookmarks after merging with Rentals. */
(() => {
    'use strict';
    const query = window.CampusRoute.split('?')[1] || '';
    window.CampusNavigate('tenant/rentals.html' + (query ? '?' + query : ''));
})();
