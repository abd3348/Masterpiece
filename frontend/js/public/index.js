/* Campus Mate — Home page
   Student photo animation, property filters, favorites, and navigation.
*/

(() => {
    'use strict';

    const $ = (selector) => document.querySelector(selector);

    const clamp = (number, min = 0, max = 1) => {
        return Math.min(max, Math.max(min, number));
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // =========================
    // NAVIGATION
    // =========================

    const menuButton = $('#menu-button');
    const navigation = $('#navigation');

    function closeMenu() {
        navigation?.classList.remove('open');
        menuButton?.setAttribute('aria-expanded', 'false');
    }

    menuButton?.addEventListener('click', () => {
        if (!navigation) return;

        const open = navigation.classList.toggle('open');

        menuButton.setAttribute('aria-expanded', String(open));
    });

    navigation?.addEventListener('click', (event) => {
        if (event.target.closest('a, button')) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });

    document.addEventListener('click', (event) => {
        if (
            navigation &&
            menuButton &&
            !navigation.contains(event.target) &&
            !menuButton.contains(event.target)
        ) {
            closeMenu();
        }
    });

    const desktopView = window.matchMedia('(min-width: 801px)');

    desktopView.addEventListener('change', (event) => {
        if (event.matches) {
            closeMenu();
        }
    });

    const year = $('#year');

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    // Login and Register use their HTML href attributes.
    // No JavaScript redirect is needed.

    // =========================
    // DIALOG
    // =========================

    const dialog = $('#dialog');
    const dialogTitle = $('#dialog-title');
    const dialogBody = $('#dialog-body');

    function openDialog(title, html) {
        if (!dialog || !dialogTitle || !dialogBody) return;

        dialogTitle.textContent = title;
        dialogBody.innerHTML = html;

        if (!dialog.open) {
            dialog.showModal();
        }
    }

    $('#close-dialog')?.addEventListener('click', () => {
        dialog?.close();
    });

    dialog?.addEventListener('click', (event) => {
        if (event.target !== dialog) return;

        const rect = dialog.getBoundingClientRect();

        const outside =
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom;

        if (outside) {
            dialog.close();
        }
    });

    const dialogContent = {
        join: [
            'Your next chapter',
            `
                <p>Find your space and meet your people.</p>

                <div class="actions">
                    <a class="button" href="login.html">
                        Log in
                    </a>

                    <a class="button" href="register.html">
                        Register ↗
                    </a>
                </div>
            `
        ],

        roommate: [
            'Living well, together',
            `
                <p>
                    Find a roommate who shares your budget,
                    routine, and living preferences.
                </p>

                <p>
                    The 94% match displayed on this page is
                    an example.
                </p>

                <a class="button" href="register.html">
                    Create your account ↗
                </a>
            `
        ],

        landlord: [
            'Make room for someone new',
            `
                <p>
                    Share your property location, photos,
                    rent, amenities, and availability.
                </p>

                <a class="button" href="register.html">
                    Register as a property owner ↗
                </a>
            `
        ]
    };

    document.querySelectorAll('[data-dialog]').forEach((button) => {
        button.addEventListener('click', () => {
            const content = dialogContent[button.dataset.dialog];

            if (content) {
                openDialog(...content);
            }
        });
    });

    // =========================
    // SAMPLE PROPERTIES
    // =========================

    const listings = window.CampusState.properties
        .filter((p) => p.status === 'published')
        .map((p) => ({ ...p, image: window.CampusAPI.photo(p) }));

    // =========================
    // FAVORITES
    // =========================

    let saved = window.CampusState.saved;
    async function saveFavorites(id) {
        await window.CampusAPI.setFavorite(id, saved.includes(id));
        saved = window.CampusState.saved;
    }

    // =========================
    // PROPERTY FILTERS
    // =========================

    const propertyGrid = $('#property-grid');
    const locationSelect = $('#location');
    const typeSelect = $('#type');
    const budgetSelect = $('#budget');
    const emptyMessage = $('#empty');
    const resultCount = $('#result-count');
    const previousHomes = $('.homes-prev');
    const nextHomes = $('.homes-next');

    function updateHomesArrows() {
        if (!propertyGrid) return;
        const end = propertyGrid.scrollWidth - propertyGrid.clientWidth;
        if (previousHomes) previousHomes.disabled = propertyGrid.scrollLeft <= 1;
        if (nextHomes) nextHomes.disabled = propertyGrid.scrollLeft >= end - 1;
    }

    function slideHomes(direction) {
        const card = propertyGrid?.querySelector('.property');
        if (!card) return;
        const gap = parseFloat(getComputedStyle(propertyGrid).columnGap) || 0;
        propertyGrid.scrollBy({
            left: direction * (card.getBoundingClientRect().width + gap),
            behavior: reducedMotion.matches ? 'instant' : 'smooth'
        });
    }

    previousHomes?.addEventListener('click', () => slideHomes(-1));
    nextHomes?.addEventListener('click', () => slideHomes(1));
    propertyGrid?.addEventListener('scroll', updateHomesArrows, { passive: true });
    window.addEventListener('resize', updateHomesArrows);

    function renderListings() {
        if (!propertyGrid) return;

        const location = locationSelect?.value || '';
        const type = typeSelect?.value || '';
        const budgetValue = budgetSelect?.value;

        const budget =
            budgetValue && Number.isFinite(Number(budgetValue)) ? Number(budgetValue) : Infinity;

        const filtered = listings.filter((property) => {
            return (
                (!location || property.city === location) &&
                (!type || property.type === type) &&
                property.price <= budget
            );
        });

        propertyGrid.innerHTML = filtered
            .map((property) => {
                const isSaved = saved.includes(property.id);

                return `
                <article class="property">
                    <div class="property-photo">
                        <img
                            src="${property.image}"
                            alt="Illustrative interior for ${property.title}"
                            loading="lazy"
                        >

                        <span class="tag">
                            ${property.type}
                        </span>

                        <button
                            type="button"
                            class="save"
                            data-save="${property.id}"
                            aria-label="Save ${property.title}"
                            aria-pressed="${isSaved}"
                        >
                            ${isSaved ? '♥' : '♡'}
                        </button>
                    </div>

                    <div class="property-info">
                        <h3>${property.title}</h3>

                        <p>
                            ${property.area}, ${property.city}
                        </p>

                        <div class="specs">
                            ${property.beds}
                            bedroom${property.beds > 1 ? 's' : ''}

                            &nbsp; · &nbsp;

                            ${property.baths}
                            bathroom${property.baths > 1 ? 's' : ''}

                            &nbsp; · &nbsp; Furnished
                        </div>

                        <div class="price-row">
                            <div>
                                <strong>${property.price}</strong>
                                <small>JOD / ${property.period === 'Daily' ? 'night' : 'month'}</small>
                            </div>

                            <button
                                type="button"
                                class="detail"
                                data-property="${property.id}"
                            >
                                View details
                            </button>
                        </div>
                    </div>
                </article>
            `;
            })
            .join('');

        propertyGrid.scrollLeft = 0;
        updateHomesArrows();

        if (emptyMessage) {
            emptyMessage.hidden = filtered.length > 0;
        }

        if (resultCount) {
            resultCount.textContent =
                `${filtered.length} sample home` +
                `${filtered.length === 1 ? '' : 's'}` +
                ' · Interior photos are illustrative';
        }
    }

    $('#search-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        renderListings();
    });

    propertyGrid?.addEventListener('click', async (event) => {
        const saveButton = event.target.closest('[data-save]');

        if (saveButton) {
            const id = Number(saveButton.dataset.save);

            saved = saved.includes(id) ? saved.filter((savedId) => savedId !== id) : [...saved, id];

            try {
                await saveFavorites(id);
            } catch (error) {
                saved = window.CampusState.saved;
                resultCount.textContent = error.message;
                renderListings();
                return;
            }

            const isSaved = saved.includes(id);

            saveButton.setAttribute('aria-pressed', String(isSaved));

            saveButton.textContent = isSaved ? '♥' : '♡';

            return;
        }

        const detailsButton = event.target.closest('[data-property]');

        if (!detailsButton) return;

        const property = listings.find((item) => {
            return item.id === Number(detailsButton.dataset.property);
        });

        if (!property) return;

        window.CampusNavigate('property.html?id=' + encodeURIComponent(property.id));
    });

    renderListings();

    // =========================
    // STUDENT PHOTO ANIMATION
    // =========================

    const journey = $('.journey');
    const visual = $('.student-visual');
    const copies = [...document.querySelectorAll('.tour-copy')];

    if (journey && visual && copies.length) {
        const photos = [
            'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=85',

            'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85',

            'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=85',

            'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85',

            'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=85'
        ];

        const titles = [
            'Your university chapter.',
            'A space that feels like you.',
            'Good company. Better days.',
            'Study, settle, feel at home.',
            'Your next chapter starts here.'
        ];

        const chapters = [
            'Student life',
            'Your space',
            'Your people',
            'Feel at home',
            'Your next chapter'
        ];

        const firstImage = visual.querySelector('.student-image');

        const layers = photos.map((source, index) => {
            const image = index === 0 && firstImage ? firstImage : document.createElement('img');

            image.className = 'student-image' + (index === 0 ? ' current' : '');

            image.alt = [
                'Students studying together',
                'Home interior',
                'Community gathering',
                'Shared study space',
                'Students studying together'
            ][index];
            image.src = source;
            image.decoding = 'async';

            if (image !== firstImage) {
                visual.insertBefore(image, visual.firstChild);
            }

            return image;
        });

        const visualNumber = $('.visual-number');
        const visualTitle = $('.visual-title');
        const chapterName = $('#chapter-name');
        const progress = $('#progress');
        const percent = $('#percent');

        let lastStep = -1;
        let pending = false;

        function updateJourney() {
            pending = false;

            const total = journey.offsetHeight - window.innerHeight;

            const amount = total > 0 ? clamp(-journey.getBoundingClientRect().top / total) : 0;

            const step = Math.min(photos.length - 1, Math.floor(amount * photos.length));

            if (step !== lastStep) {
                copies.forEach((copy, index) => {
                    const active = index === step;

                    copy.classList.toggle('active', active);
                    copy.inert = !active;

                    copy.setAttribute('aria-hidden', String(!active));
                });

                layers.forEach((image, index) => {
                    image.classList.toggle('current', index === step);
                });

                if (visualNumber) {
                    visualNumber.textContent = String(step + 1).padStart(2, '0');
                }

                if (visualTitle) {
                    visualTitle.textContent = titles[step];
                }

                if (chapterName) {
                    chapterName.textContent = chapters[step];
                }

                document.body.dataset.chapter = String(step);
                lastStep = step;
            }

            if (progress) {
                progress.style.width = `${amount * 100}%`;
            }

            if (percent) {
                percent.textContent = `${Math.round(amount * 100)
                    .toString()
                    .padStart(2, '0')}%`;
            }

            const shift = reducedMotion.matches ? 0 : Math.sin(amount * Math.PI * 2) * 16;

            const turn = reducedMotion.matches ? 0 : Math.cos(amount * Math.PI * 2) * 2;

            visual.style.setProperty('--journey-shift', `${shift}px`);

            visual.style.setProperty('--journey-turn', `${turn}deg`);
        }

        function requestJourneyUpdate() {
            if (pending) return;

            pending = true;
            requestAnimationFrame(updateJourney);
        }

        window.addEventListener('scroll', requestJourneyUpdate, { passive: true });

        window.addEventListener('resize', requestJourneyUpdate);

        reducedMotion.addEventListener('change', requestJourneyUpdate);

        $('#explore-tour')?.addEventListener('click', () => {
            const total = Math.max(0, journey.offsetHeight - window.innerHeight);

            const journeyTop = window.scrollY + journey.getBoundingClientRect().top;

            window.scrollTo({
                top: journeyTop + total * 0.23,
                behavior: reducedMotion.matches ? 'auto' : 'smooth'
            });
        });

        updateJourney();
    }

    // =========================
    // ACTIVE NAVIGATION SECTION
    // =========================

    if ('IntersectionObserver' in window) {
        const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];

        const visibility = new Map();

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    visibility.set(
                        entry.target.id,
                        entry.isIntersecting ? entry.intersectionRatio : 0
                    );
                });

                let activeSection = '';
                let highestRatio = 0;

                visibility.forEach((ratio, id) => {
                    if (ratio > highestRatio) {
                        highestRatio = ratio;
                        activeSection = id;
                    }
                });

                if (!activeSection) return;

                links.forEach((link) => {
                    const active = link.getAttribute('href') === `#${activeSection}`;

                    link.classList.toggle('nav-active', active);

                    if (active) {
                        link.setAttribute('aria-current', 'location');
                    } else {
                        link.removeAttribute('aria-current');
                    }
                });
            },
            {
                rootMargin: '-100px 0px -25% 0px',
                threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1]
            }
        );

        links.forEach((link) => {
            const id = link.getAttribute('href').slice(1);
            const section = document.getElementById(id);

            if (section) {
                observer.observe(section);
            }
        });
    }
})();
