/* Account navigation and UI permissions. ASP.NET must enforce these on the server too. */
(() => {
    'use strict';
    const dashboard = (role) =>
        ({
            tenant: 'tenant/home.html',
            landlord: 'landlord/dashboard.html',
            admin: 'admin/dashboard.html'
        })[role] || 'auth/login.html';
    function route(target, account) {
        const resolved = window.CampusRoutes.resolve(target, account?.role) || 'public/index.html';
        const section = resolved.split('/')[0];
        return !['tenant', 'landlord', 'admin'].includes(section)
            ? resolved
            : !account
              ? 'auth/login.html'
              : account.role === section
                ? resolved
                : dashboard(account.role);
    }
    const methods = {};
    function permit(names, roles) {
        for (const name of names.split(' ')) methods[name] = roles;
    }
    permit(
        'getPreferences savePreferences resetPreferences chooseRoommate setFavorite addReview getRequests createRequest signAgreement saveInspection confirmArrangement getRentals completeMoveIn contact acceptContact openContactChat',
        ['tenant']
    );
    permit(
        'getRequest conversation sendMessage sampleReply reportProperty saveCondition compare closeRental',
        ['tenant', 'landlord']
    );
    permit('addProperty payListingFee editProperty setListingStatus reviewRequest', ['landlord']);
    permit('getMeetings createMeeting reviewMeeting cancelMeeting getMeetingRoom simulateMeetingResponse', ['tenant', 'landlord']);
    permit('getSubletListings createSubletListing paySubletListingFee editSubletListing deleteSubletListing getSubletRequests createSubletRequest reviewSubletRequest', ['tenant']);
    permit('moderateProperty toggleUser resolveReport', ['admin']);
    permit('updateProfile', ['tenant', 'landlord', 'admin']);
    function install(api) {
        for (const [name, roles] of Object.entries(methods)) {
            const original = api[name];
            if (typeof original !== 'function') continue;
            function check(args) {
                const me = api.state.currentUser;
                if (!me) throw new Error('Sign in to continue.');
                if (!roles.includes(me.role))
                    throw new Error('This action is unavailable for your account role.');
                let owner;
                if (['editProperty', 'setListingStatus', 'payListingFee'].includes(name))
                    owner = api.state.properties.find(
                        (p) => String(p.id) === String(args[0])
                    )?.ownerId;
                if (name === 'reviewRequest')
                    owner = api.state.requests.find((r) => r.id === args[0])?.property.ownerId;
                if (name === 'getRequest') {
                    const r = api.state.requests.find((r) => r.id === args[0]);
                    owner = me.role === 'landlord' ? r?.property.ownerId : r?.tenantId;
                }
                if (['signAgreement', 'saveInspection', 'confirmArrangement'].includes(name))
                    owner = api.state.requests.find((r) => r.id === args[0])?.tenantId;
                if (['completeMoveIn', 'saveCondition', 'compare', 'closeRental'].includes(name)) {
                    const r = api.state.rentals.find((r) => r.id === args[0])?.request;
                    owner = me.role === 'landlord' ? r?.property.ownerId : r?.tenantId;
                }
                if (owner !== undefined && owner !== me.id)
                    throw new Error('This item belongs to another account.');
            }
            api[name] =
                original.constructor.name === 'AsyncFunction'
                    ? async function (...args) {
                          check(args);
                          return original.apply(this, args);
                      }
                    : function (...args) {
                          check(args);
                          return original.apply(this, args);
                      };
        }
    }
    window.CampusAccess = { dashboard, route, install };
})();
