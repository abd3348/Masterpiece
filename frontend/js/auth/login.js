'use strict';
const form = document.getElementById('login-form');
const email = document.getElementById('email');
const password = document.getElementById('password');
const toggle = document.getElementById('toggle-password');
const message = document.getElementById('message');
const dialog = document.getElementById('info-dialog');
document.getElementById('year').textContent = new Date().getFullYear();
toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(show));
});
form.addEventListener('input', () => {
    message.textContent = '';
    message.classList.remove('success');
});
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    email.value = email.value.trim();
    if (!form.reportValidity()) return;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
        const user = await window.CampusAPI.login({ email: email.value, password: password.value });
        window.CampusState.firstName = user?.firstName || '';
        window.CampusNavigate(
            { tenant: 'home', landlord: 'landlord', admin: 'admin' }[user.role] + '.html'
        );
    } catch (error) {
        message.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});
document.getElementById('forgot-password').addEventListener('click', () => dialog.showModal());
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
document.getElementById('dismiss-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
    )
        dialog.close();
});
