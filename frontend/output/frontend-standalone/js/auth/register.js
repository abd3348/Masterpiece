'use strict';
const form = document.getElementById('register-form');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const message = document.getElementById('message');
const university = document.getElementById('university');
const steps = [...document.querySelectorAll('.register-step')];
const next = document.getElementById('register-next');
const back = document.getElementById('register-back');
const submit = document.getElementById('register-submit');
let currentStep = 0;
let invalidFrame;

function showStep(index, focus = true) {
    currentStep = index;
    steps.forEach((step, i) => { step.hidden = i !== index; });
    document.querySelectorAll('.register-progress li').forEach((item, i) => {
        item.classList.toggle('complete', i < index);
        if (i === index) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
    });
    document.querySelector('.register-card .sub').textContent = [
        'Let’s start with you. Who’s joining us?',
        'A little about where you live and your everyday.',
        'Keep your account safe. You’re almost home.'
    ][index];
    back.hidden = index === 0;
    next.hidden = index === steps.length - 1;
    submit.hidden = index !== steps.length - 1;
    message.textContent = '';
    if (focus) steps[index].querySelector('input:not(:disabled), select')?.focus({ preventScroll: true });
}

function continueStep() {
    for (const input of steps[currentStep].querySelectorAll('input:not(:disabled), select:not(:disabled)')) {
        if (input.dataset.regex) {
            const rule = input.dataset.regex;
            input.setCustomValidity(window.CampusValidation.valid(rule, input.value) ? '' : window.CampusValidation.errors[rule]);
        }
        if (!input.validity.valid) {
            message.textContent = input.validationMessage;
            input.focus();
            return;
        }
    }
    showStep(Math.min(currentStep + 1, steps.length - 1));
}
next.addEventListener('click', continueStep);
back.addEventListener('click', () => showStep(Math.max(0, currentStep - 1)));
form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input') && currentStep < steps.length - 1) {
        event.preventDefault();
        continueStep();
    }
});
// Bring the first invalid field into its step, including browser autofill errors.
form.addEventListener('invalid', (event) => {
    event.preventDefault();
    cancelAnimationFrame(invalidFrame);
    invalidFrame = requestAnimationFrame(() => {
        const input = form.querySelector('input:invalid, select:invalid');
        if (!input) return;
        const index = steps.findIndex((step) => step.contains(input));
        if (index >= 0) showStep(index, false);
        message.textContent = input.validationMessage;
        input.focus({ preventScroll: true });
    });
}, true);
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
    if (currentStep < steps.length - 1) {
        continueStep();
        return;
    }
    validatePasswords();
    if (!form.reportValidity()) return;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    back.disabled = true;
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
        back.disabled = false;
    }
});
const dialog = document.getElementById('info-dialog');
document.querySelectorAll('[data-info]').forEach((button) =>
    button.addEventListener('click', () => {
        document.getElementById('info-title').textContent =
            button.dataset.info === 'terms' ? 'Terms of Service' : 'Privacy Policy';
        document.getElementById('info-copy').textContent =
            window.CampusAPI.isDemo ? 'This is a design preview. Account details are held only in page memory and reset on refresh.' : 'Your account details are saved on the server. Rent and deposits are arranged directly with the landlord. Read the Privacy and Terms pages for details.';
        dialog.showModal();
    })
);
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
