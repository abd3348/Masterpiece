/* Shared behavior keeps the role pages consistent without copying their logic. */
(() => {
    'use strict';
    const { render, profile } = window.CampusFeatureUI;
    render({ profile });
})();
