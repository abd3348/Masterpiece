/* Shared behavior keeps the role pages consistent without copying their logic. */
(() => {
    'use strict';
    const { render, condition } = window.CampusFeatureUI;
    render({ condition });
})();
