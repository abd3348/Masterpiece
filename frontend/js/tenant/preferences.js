'use strict';
const form = document.getElementById('preferences-form');
const status = document.getElementById('status');
const minBudget = document.getElementById('minBudget');
const maxBudget = document.getElementById('maxBudget');
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
    const button = document.querySelector('[type="submit"][form="preferences-form"]');
    button.disabled = true;
    try {
        await window.CampusAPI.savePreferences(p);
        window.CampusNavigate('home.html');
    } catch (error) {
        status.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});
form.addEventListener('reset', async () => {
    try {
        await window.CampusAPI.resetPreferences();
        status.textContent = 'Preferences reset to the default choices.';
    } catch (error) {
        status.textContent = error.message;
    }
    requestAnimationFrame(updateSummary);
});
loadPreferences();
