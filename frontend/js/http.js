/* JSON transport shared by every page. No persistent token or browser storage. */
(() => {
    'use strict';
    let csrfToken = '';
    async function request(path, options = {}) {
        const config = window.CampusConfig;
        if (!config || config.mode !== 'api')
            throw new Error('The HTTP client is available only in API mode.');
        const base = config.apiBaseUrl.replace(/\/$/, '');
        const target = new URL(base + path, location.href);
        if (!/^https?:$/.test(target.protocol)) throw new Error('Use an HTTP(S) API address.');
        const method = options.method || 'GET',
            headers = { Accept: 'application/json', ...options.headers };
        const body = options.body;
        const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
        if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
        if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method))
            headers[config.csrfHeader || 'X-CSRF-TOKEN'] = csrfToken;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 15000);
        try {
            const response = await fetch(target.href, {
                method,
                headers,
                credentials: config.credentials || 'include',
                signal: controller.signal,
                body: body === undefined ? undefined : multipart ? body : JSON.stringify(body)
            });
            let result = null;
            if (response.status !== 204) {
                const content = await response.text();
                if (content) {
                    try {
                        result = JSON.parse(content);
                    } catch (_) {
                        if (response.ok)
                            throw new Error('The API returned an invalid JSON response.');
                    }
                }
            }
            if (!response.ok) {
                const errors = result?.errors;
                const details =
                    errors && typeof errors === 'object'
                        ? Object.entries(errors)
                              .flatMap(([field, values]) =>
                                  (Array.isArray(values) ? values : [values]).map(
                                      (value) => field + ': ' + value
                                  )
                              )
                              .join(' ')
                        : '';
                const error = new Error(
                    details ||
                        result?.detail ||
                        result?.title ||
                        'Request failed (' + response.status + ').'
                );
                error.status = response.status;
                error.errors = errors || null;
                throw error;
            }
            return result;
        } catch (error) {
            if (error.name === 'AbortError')
                throw new Error('The API request timed out. Please try again.');
            if (error instanceof TypeError)
                throw new Error(
                    'Could not connect to the API. Check its address, HTTPS certificate and CORS settings.'
                );
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }
    const fields = [
        'users',
        'properties',
        'roommates',
        'requests',
        'rentals',
        'contacts',
        'conversations',
        'meetings',
        'reports',
        'activity',
        'saved',
        'notifications'
    ];
    function reconcile(target, incoming) {
        for (const [key, value] of Object.entries(incoming)) {
            if (['__proto__', 'prototype', 'constructor', 'password'].includes(key)) continue;
            if (Array.isArray(value)) {
                const old = Array.isArray(target[key]) ? target[key] : [];
                const next = value.map((item, index) => {
                    if (!item || typeof item !== 'object') return item;
                    const prior =
                        item.id !== undefined ? old.find((v) => v?.id === item.id) : old[index];
                    return reconcile(prior && typeof prior === 'object' ? prior : {}, item);
                });
                old.splice(0, old.length, ...next);
                target[key] = old;
            } else if (value && typeof value === 'object')
                target[key] = reconcile(
                    target[key] && typeof target[key] === 'object' ? target[key] : {},
                    value
                );
            else target[key] = value;
        }
        return target;
    }
    function applySnapshot(state, snapshot) {
        if (!snapshot || snapshot.schemaVersion !== 1)
            throw new Error('The API bootstrap response must use schemaVersion 1.');
        if (!Object.hasOwn(snapshot, 'currentUser') || !Object.hasOwn(snapshot, 'preferences'))
            throw new Error('The API bootstrap response is missing currentUser or preferences.');
        for (const field of fields)
            if (!Array.isArray(snapshot[field]))
                throw new Error('The API bootstrap response is missing ' + field + '.');
        const data = Object.fromEntries(fields.map((field) => [field, snapshot[field]]));
        data.currentUser = snapshot.currentUser || null;
        data.preferences = snapshot.preferences || null;
        reconcile(state, data);
        state.firstName = state.currentUser?.firstName || '';
        csrfToken = snapshot.csrfToken || '';
        return state;
    }
    async function hydrate(state) {
        return applySnapshot(state, await request('/bootstrap'));
    }
    window.CampusTransport = { request, hydrate, applySnapshot };
})();
