(() => {
    'use strict';
    const form = document.getElementById('support-form');
    const status = document.getElementById('support-status');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!window.CampusValidation.check(form)) return;
        const message = Object.fromEntries(new FormData(form));
        // This preview deliberately stops before any network request or persistent storage.
        status.textContent = `Thanks, ${message.name.trim()}. Your ${message.topic.toLowerCase()} message passed validation. This is a preview: it has not been sent to a support team.`;
    });
    form.addEventListener('input', () => {
        status.textContent = '';
    });
    form.addEventListener('reset', () => {
        status.textContent = '';
    });
    const account = window.CampusState.currentUser;
    if (account) {
        form.elements.name.value = [account.firstName, account.lastName].filter(Boolean).join(' ');
        form.elements.email.value = account.email;
    }
})();
