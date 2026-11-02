(() => {
    'use strict';
    window.CampusState = window.CampusCreateState(
        window.CampusConfig.mode === 'api'
            ? { users: [], properties: [], roommates: [] }
            : window.CampusSeed
    );
    window.CampusReady = window.CampusLoadSeed().then(async (loaded) => {
        Object.assign(window.CampusState, loaded);
        window.CampusSetupShowcase?.(window.CampusState);
        if (window.CampusConfig.mode === 'api')
            await window.CampusTransport.hydrate(window.CampusState);
    });
    // The outer document owns media URLs so page navigation does not revoke them.
    window.CampusMedia = {
        create: (file) => URL.createObjectURL(file),
        revoke: (url) => URL.revokeObjectURL(url)
    };
    let renderedOnce = false;
    const frame = document.getElementById('campus-page');
    async function render() {
        try {
            await window.CampusReady;
            if (window.CampusConfig.mode === 'api' && renderedOnce)
                await window.CampusTransport.hydrate(window.CampusState);
            renderedOnce = true;
        } catch (error) {
            frame.hidden = true;
            let panel = document.getElementById('connection-error');
            if (!panel) {
                panel = document.createElement('section');
                panel.id = 'connection-error';
                panel.innerHTML =
                    '<h1>Campus Mate</h1><p role="alert"></p><button>Try again</button>';
                document.body.append(panel);
                panel.querySelector('button').addEventListener('click', () => location.reload());
            }
            panel.querySelector('p').textContent = error.message;
            return;
        }
        let route;
        try {
            const entry = new URL(location.href);
            const initialRoute = entry.searchParams.get('route');
            route = initialRoute || decodeURIComponent(location.hash.slice(1)) || 'public/index.html';
            // Consume query-based entry links once; subsequent navigation uses the hash.
            if (entry.searchParams.has('route')) {
                entry.searchParams.delete('route');
                entry.hash = encodeURIComponent(route);
                history.replaceState(null, '', entry.href);
            }
        } catch (_) {
            route = 'public/index.html';
        }
        route =
            window.CampusRoutes.resolve(route, window.CampusState.currentUser?.role) ||
            'public/index.html';
        const mvc = window.CampusConfig.renderMode === 'mvc';
        if (!mvc && !Object.hasOwn(window.CampusPages, route.split(/[?#]/)[0])) route = 'public/index.html';
        const allowed = window.CampusAccess.route(route, window.CampusState.currentUser);
        if (allowed !== route) {
            route = allowed;
            history.replaceState(null, '', '#' + encodeURIComponent(route));
        }
        window.CampusRoute = route;
        if (mvc) {
            frame.removeAttribute('srcdoc');
            frame.src = new URL('html/' + route, location.href).href;
            return;
        }
        const directory = route.split(/[?#]/)[0].split('/').slice(0, -1).join('/');
        const base = new URL('html/' + directory + '/', location.href).href;
        frame.srcdoc = window.CampusPages[route.split(/[?#]/)[0]].replace(
            // HTML formatting can put whitespace before the closing bracket.
            /<head\s*>/i,
            '<head><base href="' + base + '">'
        );
    }
    window.CampusNavigate = (route) => {
        route =
            window.CampusRoutes.resolve(route, window.CampusState.currentUser?.role) ||
            'public/index.html';
        const hash = '#' + encodeURIComponent(route);
        if (location.hash === hash) render();
        else location.hash = hash;
    };
    window.addEventListener('hashchange', render);
    frame.addEventListener('load', () => {
        if (!window.CampusRoute) return;
        document.title = frame.contentDocument.title;
        const anchor = window.CampusRoute.split('#')[1];
        if (anchor) frame.contentDocument.getElementById(anchor)?.scrollIntoView();
    });
    render();
})();
