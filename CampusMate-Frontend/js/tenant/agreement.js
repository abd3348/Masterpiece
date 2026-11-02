/* Keep existing agreement bookmarks pointing to the unified rental workspace. */
(() => {
    'use strict';
    const { params, url } = window.CampusFlowUI;
    window.CampusNavigate(url('rentals', params.get('id') || ''));
})();
