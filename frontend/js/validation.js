/* Shared regular expressions and readable field errors. No storage or network. */
(() => {
    'use strict';
    const patterns = {
        name: /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u,
        email: /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/,
        phone: /^(?:\+962|00962|0)7[789]\d{7}$/,
        password: /^(?=.{8,64}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/,
        title: /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s.,'’#()\/-]{2,99}$/u,
        text: /^(?=[\s\S]*\S)[^\x00-\x08\x0B\x0C\x0E-\x1F<>]{2,3000}$/,
        money: /^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/,
        integer: /^(?:0|[1-9]\d{0,3})$/,
        date: /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
        image: /\.(?:jpe?g|png|webp|gif)$/i,
        video: /\.(?:mp4|webm|mov)$/i,
        suspicious:
            /(?:wire transfer|western union|pay before viewing|urgent deposit|guaranteed investment|تحويل فوري|ادفع قبل المعاينة)/i
    };
    const errors = {
        name: 'Use Arabic or English letters, with spaces, apostrophes or hyphens (2–60 characters).',
        email: 'Enter a valid email, for example name@example.com.',
        phone: 'Enter a Jordanian mobile number: 07XXXXXXXX or +9627XXXXXXXX.',
        password:
            'Use 8–64 characters including uppercase, lowercase and a number, without spaces.',
        title: 'Use 3–100 letters, numbers or ordinary punctuation.',
        text: 'Use 2–3000 characters without angle brackets or control characters.',
        money: 'Use a non-negative amount with up to two decimal places.',
        integer: 'Enter a whole number between 0 and 9999.',
        date: 'Choose a valid calendar date.'
    };
    function valid(rule, value) {
        const raw = String(value ?? '');
        const text = rule === 'password' ? raw : raw.trim();
        const normalized = rule === 'phone' ? text.replace(/[\s()-]/g, '') : text;
        if (!patterns[rule]?.test(normalized)) return false;
        if (rule === 'name' && (text.length < 2 || text.length > 60)) return false;
        if (
            rule === 'email' &&
            (text.length > 254 ||
                text.split('@')[0].length > 64 ||
                text.split('@')[0].startsWith('.') ||
                text.split('@')[0].endsWith('.') ||
                text.split('@')[0].includes('..'))
        )
            return false;
        if (rule === 'date') {
            const d = new Date(text + 'T12:00:00');
            return (
                !Number.isNaN(d.getTime()) &&
                d.getFullYear() === Number(text.slice(0, 4)) &&
                d.getMonth() + 1 === Number(text.slice(5, 7)) &&
                d.getDate() === Number(text.slice(8, 10))
            );
        }
        return true;
    }
    function field(input) {
        const rule = input.dataset.regex;
        if (!rule) return true;
        input.setCustomValidity(
            !input.value && !input.required ? '' : valid(rule, input.value) ? '' : errors[rule]
        );
        input.setAttribute('aria-invalid', String(!!input.validationMessage));
        return !input.validationMessage;
    }
    function bind(form) {
        form.addEventListener('reset', () =>
            queueMicrotask(() => form.querySelectorAll('[data-regex]').forEach(field))
        );

        form.querySelectorAll('[data-regex]').forEach((input) => {
            input.addEventListener('input', () => field(input));
            input.addEventListener('change', () => field(input));
        });
    }
    function check(form) {
        form.querySelectorAll('[data-regex]').forEach(field);
        return form.reportValidity();
    }
    function media(file, kind) {
        if (
            !file ||
            !patterns[kind].test(file.name) ||
            !(
                kind === 'image'
                    ? /^image\/(?:jpeg|png|webp|gif)$/
                    : /^video\/(?:mp4|webm|quicktime)$/
            ).test(file.type)
        )
            throw new Error('Choose a supported ' + kind + ' file.');
        if (file.size > (kind === 'image' ? 10 : 100) * 1024 * 1024)
            throw new Error(
                kind === 'image'
                    ? 'Images must be at most 10 MB.'
                    : 'Videos must be at most 100 MB.'
            );
        return true;
    }
    window.CampusValidation = { patterns, errors, valid, bind, check, media };
})();
