'use strict';
const form = document.getElementById('register-form');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const message = document.getElementById('message');
const university = document.getElementById('university');
document.getElementById('year').textContent = new Date().getFullYear();
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
function validatePasswords() {
    password.setCustomValidity(
        password.value && !passwordPattern.test(password.value)
            ? 'Use at least 8 characters with uppercase, lowercase, and a number.'
            : ''
    );
    confirmPassword.setCustomValidity(
        confirmPassword.value && confirmPassword.value !== password.value
            ? 'Passwords do not match.'
            : ''
    );
}
password.addEventListener('input', () => {
    validatePasswords();
    const value = password.value;
    const score = [
        value.length >= 8,
        /[A-Z]/.test(value),
        /[a-z]/.test(value),
        /\d/.test(value),
        /[^a-zA-Z0-9]/.test(value)
    ].filter(Boolean).length;
    const fill = document.getElementById('strength-fill');
    fill.style.width = value ? `${score * 20}%` : '0%';
    fill.style.background = score >= 4 ? '#52785a' : '#b77749';
});
confirmPassword.addEventListener('input', validatePasswords);
document.querySelectorAll('[data-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.toggle);
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        button.textContent = show ? 'Hide' : 'Show';
        button.setAttribute('aria-pressed', String(show));
        button.setAttribute(
            'aria-label',
            `${show ? 'Hide' : 'Show'} ${input.id === 'password' ? 'password' : 'confirm password'}`
        );
    });
});
document.querySelectorAll('[name="role"]').forEach((input) =>
    input.addEventListener('change', () => {
        const isStudent = document.querySelector('[name="role"]:checked').value === 'tenant';
        document.getElementById('university-field').hidden = !isStudent;
        university.required = isStudent;
        university.disabled = !isStudent;
    })
);
['firstName', 'lastName', 'university'].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener('input', () =>
        input.setCustomValidity(
            input.value && !input.value.trim() ? 'Please enter a valid value.' : ''
        )
    );
});
form.addEventListener('input', () => {
    message.textContent = '';
    message.classList.remove('success');
});
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    validatePasswords();
    if (!form.reportValidity()) return;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    message.textContent = '';
    try {
        const data = Object.fromEntries(new FormData(form));
        const account = await window.CampusAPI.register(data);
        window.CampusState.firstName = document.getElementById('firstName').value.trim();
        window.CampusNavigate(account.role === 'landlord' ? 'landlord.html' : 'preferences.html');
    } catch (error) {
        message.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});
const dialog = document.getElementById('info-dialog');
document.querySelectorAll('[data-info]').forEach((button) =>
    button.addEventListener('click', () => {
        document.getElementById('info-title').textContent =
            button.dataset.info === 'terms' ? 'Terms of Service' : 'Privacy Policy';
        document.getElementById('info-copy').textContent =
            'This is a design preview. Add your published policy here before enabling real registration. Account details are held only in page memory and reset on refresh. Nothing is submitted to a server.';
        dialog.showModal();
    })
);
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
