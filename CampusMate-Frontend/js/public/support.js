(() => {
    'use strict';
    const form = document.getElementById('support-form');
    const status = document.getElementById('support-status');
    const live = window.CampusConfig.mode === 'api';
    if (live) {
        form.previousElementSibling.textContent = 'Your request is saved for administrator review. Please do not include passwords or payment details.';
        form.querySelector('[type=submit]').textContent = 'Submit support request ↗';
        form.elements.message.maxLength = 1200;
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!window.CampusValidation.check(form)) return;
        const message = Object.fromEntries(new FormData(form));
        if (live) {
            const button = form.querySelector('[type=submit]'); button.disabled = true;
            try {
                const result = await window.CampusAPI.submitSupport(message);
                status.textContent = `Your support request was saved for review. Reference: ${result.reference}`;
                form.elements.message.value = '';
            } catch (error) { status.textContent = error.message; }
            finally { button.disabled = false; }
            return;
        }
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
