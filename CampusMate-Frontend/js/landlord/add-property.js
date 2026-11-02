/* Property management is shared; the HTML page supplies its existing tab. */
(() => {
    'use strict';
    const { render, addProperty } = window.CampusFeatureUI;
    render({ 'add-property': addProperty });
})();
