/* Small shared behavior for static information pages. */
(() => {
    'use strict';
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('global-search').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            window.CampusNavigate('properties.html?q=' + encodeURIComponent(event.target.value));
        }
    });
})();
