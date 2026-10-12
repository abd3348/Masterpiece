(() => {
    'use strict';
    const search = document.getElementById('faq-search');
    const questions = Array.from(document.querySelectorAll('.faq-item'));
    search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase();
        let matchingQuestions = 0;
        for (const question of questions) {
            const matches = question.textContent.toLowerCase().includes(query);
            question.hidden = !matches;
            if (matches) matchingQuestions++;
        }
        document.getElementById('faq-empty').hidden = matchingQuestions > 0;
        document.getElementById('faq-count').textContent = matchingQuestions + ' questions';
    });
})();
