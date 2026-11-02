/* Property management is shared; the HTML page supplies its existing tab. */
(() => {
    'use strict';
    const { render, landlord } = window.CampusFeatureUI;
    render({ landlord });
})();
