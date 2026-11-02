'use strict';
const form = document.getElementById('login-form');
const email = document.getElementById('email');
const password = document.getElementById('password');
const toggle = document.getElementById('toggle-password');
const message = document.getElementById('message');
const dialog = document.getElementById('info-dialog');
const keyScene = document.querySelector('.home-scene');
const motionToggle = document.querySelector('.motion-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let keyShake;
let invalidFrame = 0;

function showLoginError(text, fields) {
    message.textContent = text;
    keyScene.classList.add('has-login-error');
    fields.forEach((field) => field.setAttribute('aria-invalid', 'true'));
    keyShake?.cancel();
    if (!reducedMotion.matches && !keyScene.classList.contains('motion-paused')) {
        keyShake = keyScene.querySelector('.key-parallax').animate(
            [0, -8, 8, -6, 6, -3, 0].map((x) => ({ transform: 'translateX(' + x + 'px)' })),
            { duration: 560, easing: 'ease-in-out' }
        );
    }
}

// Native constraints fire before submit, including empty or malformed inputs.
form.addEventListener('invalid', (event) => {
    event.preventDefault();
    cancelAnimationFrame(invalidFrame);
    invalidFrame = requestAnimationFrame(() => {
        const fields = [email, password].filter((field) => !field.validity.valid);
        if (!fields.length) return;
        showLoginError(fields[0] === email ? 'Please enter a valid email address.' : 'Please check your password.', fields);
        fields[0].focus();
    });
}, true);
document.getElementById('year').textContent = new Date().getFullYear();
toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(show));
});
form.addEventListener('input', () => {
    message.textContent = '';
    message.classList.remove('success');
    keyScene.classList.remove('has-login-error');
    keyShake?.cancel();
    [email, password].forEach((field) => field.removeAttribute('aria-invalid'));
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
        showLoginError(error.message, [email, password]);
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

motionToggle.addEventListener('click', () => {
    const paused = keyScene.classList.toggle('motion-paused');
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.setAttribute('aria-label', paused ? 'Resume illustration animation' : 'Pause illustration animation');
    motionToggle.textContent = paused ? 'Resume motion' : 'Pause motion';
    keyShake?.cancel();
});
document.addEventListener('visibilitychange', () => {
    keyScene.classList.toggle('scene-hidden', document.hidden);
    if (document.hidden) keyShake?.cancel();
});

reducedMotion.addEventListener('change', () => keyShake?.cancel());
