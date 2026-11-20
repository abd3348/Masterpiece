'use strict';
const form = document.getElementById('preferences-form');
const status = document.getElementById('status');
const minBudget = document.getElementById('minBudget');
const maxBudget = document.getElementById('maxBudget');
const cards = [...form.querySelectorAll('.preference-card')];
const nextButton = document.getElementById('preference-next');
const skipButton = document.getElementById('preference-skip');
const backButton = document.getElementById('preference-back');
const resetButton = document.querySelector('[type="reset"][form="preferences-form"]');
let currentStep = 0;
let busy = true;
let savedChoices = [];

function rememberChoices() {
    savedChoices = cards.map((card) => [...card.querySelectorAll('input, select')].map((input) => ({
        input, value: input.value, checked: input.checked
    })));
}

function updateControls() {
    const last = currentStep === cards.length - 1;
    nextButton.textContent = last ? 'Save preferences \u2197' : 'Next \u2192';
    skipButton.textContent = last ? 'Skip & finish' : 'Skip';
    nextButton.disabled = skipButton.disabled = resetButton.disabled = busy;
    backButton.disabled = busy || currentStep === 0;
}

function showStep(index, focus = true) {
    currentStep = index;
    cards.forEach((card, i) => { card.hidden = i !== index; });
    const title = cards[index].querySelector('h2');
    document.getElementById('preference-step-label').textContent =
        `Step ${index + 1} of ${cards.length} \u00b7 ${title.textContent}`;
    document.querySelectorAll('.preference-steps li').forEach((item, i) => {
        if (i === index) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
        item.classList.toggle('is-complete', i < index);
    });
    const progress = document.querySelector('.preference-track');
    progress.setAttribute('aria-valuenow', String(index + 1));
    progress.firstElementChild.style.width = `${((index + 1) / cards.length) * 100}%`;
    updateControls();
    if (focus) {
        title.focus({ preventScroll: true });
    }
}

function validateStep() {
    const inputs = [...cards[currentStep].querySelectorAll('input, select')];
    inputs.forEach((input) => input.setCustomValidity(''));
    updateSummary();
    inputs.forEach((input) => {
        if (input.dataset.regex) {
            const rule = input.dataset.regex;
            if (!window.CampusValidation.valid(rule, input.value))
                input.setCustomValidity(window.CampusValidation.errors[rule]);
        }
    });
    for (const input of inputs) {
        if (!input.reportValidity()) return false;
    }
    if (currentStep === 0 && !form.querySelector('[name="areas"]:checked')) {
        status.textContent = 'Choose at least one preferred area, or use Skip to keep your saved choices.';
        form.querySelector('[name="areas"]').focus();
        return false;
    }
    return true;
}

nextButton.addEventListener('click', () => {
    if (busy || !validateStep()) return;
    status.textContent = '';
    if (currentStep < cards.length - 1) showStep(currentStep + 1);
    else form.requestSubmit();
});
backButton.addEventListener('click', () => {
    if (busy || currentStep === 0) return;
    status.textContent = '';
    showStep(currentStep - 1);
});
skipButton.addEventListener('click', () => {
    if (busy) return;
    savedChoices[currentStep].forEach(({ input, value, checked }) => {
        input.value = value;
        if (input.type === 'radio' || input.type === 'checkbox') input.checked = checked;
        input.setCustomValidity('');
        input.removeAttribute('aria-invalid');
    });
    status.textContent = '';
    updateSummary();
    if (currentStep < cards.length - 1) showStep(currentStep + 1);
    else form.requestSubmit();
});
form.addEventListener('invalid', (event) => {
    const index = cards.findIndex((card) => card.contains(event.target));
    if (index >= 0 && index !== currentStep) showStep(index);
}, true);
document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('global-search').addEventListener('keydown', (event) => {
    if (event.key === 'Enter')
        window.CampusNavigate('properties.html?q=' + encodeURIComponent(event.target.value));
});
function getPreferences() {
    const data = new FormData(form);
    return {
        minBudget: Number(data.get('minBudget')),
        maxBudget: Number(data.get('maxBudget')),
        areas: data.getAll('areas'),
        destination: String(data.get('destination') || '').trim(),
        commute: data.get('commute'),
        housing: data.get('housing'),
        furnishing: data.get('furnishing'),
        billing: data.get('billing'),
        roommates: data.get('roommates'),
        sleep: data.get('sleep'),
        schedule: data.get('schedule'),
        noise: Number(data.get('noise')),
        cleanliness: Number(data.get('cleanliness')),
        smoking: data.get('smoking'),
        habits: data.getAll('habits')
    };
}
function updateSummary() {
    const p = getPreferences();
    maxBudget.setCustomValidity(
        p.maxBudget < p.minBudget ? 'Maximum budget must be at least the minimum budget.' : ''
    );
    const destination = document.getElementById('destination');
    destination.setCustomValidity(
        destination.value && !p.destination ? 'Enter your university or work destination.' : ''
    );
    document.getElementById('noise-label').textContent = `${p.noise} / 5`;
    document.getElementById('cleanliness-label').textContent = `${p.cleanliness} / 5`;
    document.getElementById('summary-budget').textContent = `${p.minBudget}–${p.maxBudget} JOD`;
    document.getElementById('summary-roommates').textContent =
        p.roommates === '0' ? 'Living alone' : p.roommates;
    document.getElementById('summary-commute').textContent = `Up to ${p.commute} min`;
    document.getElementById('summary-text').textContent =
        `A ${p.furnishing.toLowerCase()} ${p.housing.toLowerCase()} near ${p.destination || 'your campus'}, with a ${p.sleep.toLowerCase()} routine and ${p.noise <= 2 ? 'quiet' : p.noise === 3 ? 'balanced' : 'social'} surroundings. ${p.areas.length ? 'Preferred areas: ' + p.areas.join(', ') + '.' : 'Choose your preferred areas to refine your profile.'}`;
    const tags = [
        p.sleep,
        p.smoking === 'Not allowed' ? 'Non-smoking home' : p.smoking,
        ...p.habits
    ];
    const container = document.getElementById('summary-tags');
    container.replaceChildren();
    tags.forEach((text) => {
        const tag = document.createElement('span');
        tag.textContent = text;
        container.appendChild(tag);
    });
}
async function loadPreferences() {
    try {
        const saved = await window.CampusAPI.getPreferences();
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
            [...form.elements].forEach((input) => {
                if (!input.name || !(input.name in saved)) return;
                const value = saved[input.name];
                if (input.type === 'checkbox')
                    input.checked = Array.isArray(value) && value.includes(input.value);
                else if (input.type === 'radio') input.checked = input.value === String(value);
                else if (typeof value === 'string' || typeof value === 'number')
                    input.value = value;
            });
        }
    } catch (error) {
        status.textContent = error.message;
    }
    updateSummary();
    rememberChoices();
    busy = false;
    updateControls();
}
form.addEventListener('input', () => {
    status.textContent = '';
    updateSummary();
});
form.addEventListener('change', (event) => {
    if (
        event.target.name === 'areas' &&
        form.querySelectorAll('[name="areas"]:checked').length > 5
    ) {
        event.target.checked = false;
        status.textContent = 'Choose a maximum of five preferred areas.';
    }
    updateSummary();
});
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    if (currentStep < cards.length - 1) {
        if (validateStep()) showStep(currentStep + 1);
        return;
    }
    updateSummary();
    if (!form.reportValidity()) return;
    const p = getPreferences();
    if (!p.areas.length) {
        status.textContent = 'Choose at least one preferred area.';
        form.querySelector('[name="areas"]').focus();
        return;
    }
    if (p.areas.length > 5) {
        status.textContent = 'Choose no more than five areas.';
        return;
    }
    busy = true;
    updateControls();
    try {
        await window.CampusAPI.savePreferences(p);
        window.CampusNavigate('home.html');
    } catch (error) {
        status.textContent = error.message;
    } finally {
        busy = false;
        updateControls();
    }
});
form.addEventListener('reset', async () => {
    busy = true;
    updateControls();
    try {
        await window.CampusAPI.resetPreferences();
        status.textContent = 'Preferences reset to the default choices.';
    } catch (error) {
        status.textContent = error.message;
    }
    await loadPreferences();
    showStep(0);
});
showStep(0, false);
loadPreferences();
