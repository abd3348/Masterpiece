/* Edit these two values when your ASP.NET API is available. */
window.CampusConfig = Object.freeze({
    mode: 'demo', // 'demo' reads the JSON fixtures; 'api' sends requests to the backend.
    apiBaseUrl: 'https://localhost:7001/api',
    seedUrl: 'data/campus-seed.json',
    credentials: 'include',
    timeoutMs: 15000,
    csrfHeader: 'X-CSRF-TOKEN'
});
