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
        .map((p) => ({ ...p, image: window.CampusAPI.photo(p) }))
        .slice(0, 4);

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
    const homesCarousel = $('.homes-carousel');
    const homesStage = document.createElement('div');
    homesStage.className = 'homes-stage';
    if (homesCarousel && propertyGrid) {
        const heading = document.querySelector('#homes > .section-heading');
        if (heading) homesStage.append(heading);
        homesStage.append(propertyGrid);
        homesCarousel.append(homesStage);
    }
    let visibleListings = [];
    let activeHome = 0;

    function showHome(index, position = index) {
        if (!propertyGrid || !visibleListings.length) return;
        activeHome = Math.max(0, Math.min(index, visibleListings.length - 1));
        propertyGrid.querySelectorAll('.property').forEach((card, cardIndex) => {
            // Wrap neighboring previews so the image column stays filled at
            // both ends; the active details still stop at the fourth listing.
            let offset = position - cardIndex;
            const count = visibleListings.length;
            if (count > 2) offset = ((offset + count / 2) % count + count) % count - count / 2;
            // Scrolling down carries each image from upper-left through center
            // to lower-left, rotating clockwise along the arc.
            const angle = offset * 28;
            const radians = angle * Math.PI / 180;
            card.style.setProperty('--home-offset', offset);
            card.style.setProperty('--home-shift', `${Math.sin(radians) * 220}%`);
            card.style.setProperty('--home-curve-x', `${(Math.cos(radians) - 1) * 120}%`);
            card.style.setProperty('--home-tilt', `${angle * 0.5}deg`);
            card.classList.toggle('is-active', cardIndex === activeHome);
            card.classList.toggle('is-before', cardIndex < activeHome);
            card.classList.toggle('is-near', Math.abs(offset) <= 1.35);
            card.setAttribute('aria-hidden', String(cardIndex !== activeHome));
            card.inert = cardIndex !== activeHome;
        });
        const counter = propertyGrid.querySelector('.homes-counter');
        if (counter) counter.textContent = `${String(activeHome + 1).padStart(2, '0')} / ${String(visibleListings.length).padStart(2, '0')}`;
    }

    function updateHomeStory() {
        if (!homesCarousel || visibleListings.length < 2) return;
        const rect = homesCarousel.getBoundingClientRect();
        const stickyTop = parseFloat(getComputedStyle(homesStage).top) || 0;
        const range = Math.max(1, homesCarousel.offsetHeight - homesStage.offsetHeight);
        const progress = Math.max(0, Math.min(1, (stickyTop - rect.top) / range));
        const position = progress * (visibleListings.length - 1);
        showHome(Math.round(position), position);
    }

    window.addEventListener('scroll', updateHomeStory, { passive: true });
    window.addEventListener('resize', updateHomeStory);

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
        visibleListings = filtered;
        activeHome = 0;
        if (homesCarousel) {
            const stickyTop = parseFloat(getComputedStyle(homesStage).top) || 0;
            homesCarousel.style.setProperty('--home-story-height', `calc(100vh - ${stickyTop}px + ${Math.max(filtered.length - 1, 0) * 45}vh)`);
        }

        propertyGrid.innerHTML = filtered
            .map((property, index) => {
                const isSaved = saved.includes(property.id);

                return `
                <article class="property${index === 0 ? ' is-active' : ''}" data-home-index="${index}" aria-hidden="${index !== 0}">
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
                            <div class="property-price">
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
            .join('') + (filtered.length ? `<span class="homes-counter" aria-live="polite">01 / ${String(filtered.length).padStart(2, '0')}</span>` : '');

        showHome(0);
        requestAnimationFrame(updateHomeStory);

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
    // Scroll-linked key animation
    const keyHero = document.querySelector('.key-hero');
    if (keyHero) {
        const stage = keyHero.querySelector('.key-stage');
        const cue = keyHero.querySelector('.key-cue');
        const chapters = [...stage.querySelectorAll('[data-key-chapter]')];
        const layers = ['#key', '#keyEdge', '#keyShadow'].map(id => keyHero.querySelector(id));
        let position = 0;
        let frame = 0;

        function paintKey() {
            const range = Math.max(1, keyHero.offsetHeight - stage.offsetHeight);
            const target = Math.min(1, Math.max(0, -keyHero.getBoundingClientRect().top / range));
            position = reducedMotion.matches || Math.abs(position - target) < 0.0003
                ? target : position + (target - position) * 0.18;
            const insertion = 0.2;
            const scale = 1 - 0.2 * Math.min(1, position / insertion);
            const turn = Math.max(0, (position - insertion) / (1 - insertion));
            const angle = 360 * turn;
            const chapterPosition = turn * (chapters.length - 1);
            chapters.forEach((chapter, index) => {
                const offset = index - chapterPosition;
                const fade = clamp((Math.abs(offset) - 0.25) / 0.5);
                const opacity = 1 - fade * fade * (3 - 2 * fade);
                chapter.style.opacity = opacity;
                chapter.style.transform = reducedMotion.matches ? 'none' : `translateY(${clamp(offset, -1, 1) * 24}px)`;
                chapter.inert = index !== Math.round(chapterPosition);
            });
            layers.forEach((layer, index) => {
                const y = 330 + index * 8 * scale;
                layer.setAttribute('transform', `translate(380 ${y}) rotate(${angle}) scale(${scale})`);
            });
            cue.hidden = target > 0.001;
            frame = position === target ? 0 : requestAnimationFrame(paintKey);
        }
        function refreshKey() {
            if (!frame) frame = requestAnimationFrame(paintKey);
        }
        window.addEventListener('scroll', refreshKey, { passive: true });
        window.addEventListener('resize', refreshKey);
        cue.addEventListener('click', () => window.scrollBy({
            top: stage.offsetHeight * 0.65,
            behavior: reducedMotion.matches ? 'instant' : 'smooth'
        }));
        paintKey();
    }


    // =========================
    // TEXT ENTRANCES ON SECTION ARRIVAL
    // =========================

    const sectionText = document.querySelectorAll(
        '.section-heading p, .section-heading h2, #roommates > div:first-child > p, ' +
        '#roommates > div:first-child > h2, #how-it-works > p, #how-it-works > h2, ' +
        '.steps h3, .steps p, .cta > p, .cta > h2, .chapter-account-panel > h2, ' +
        '.chapter-account-panel > p'
    );

    if ('IntersectionObserver' in window) {
        // Prepare offscreen copy synchronously, before the browser can paint it.
        sectionText.forEach((element) => {
            const bounds = element.getBoundingClientRect();
            element.classList.add('text-reveal-ready');
            element.style.setProperty('--text-delay',
                element.matches('h2, h3') ? '70ms' : element.matches('.eyebrow') ? '0ms' : '140ms');
            if (bounds.top < innerHeight && bounds.bottom > 0) {
                element.classList.add('text-reveal-visible');
            }
        });
        const textObserver = new IntersectionObserver((entries) => {
            entries.forEach(({ target, isIntersecting }) => {
                // Reset only after leaving the actual viewport, never while still visible.
                target.classList.toggle('text-reveal-visible', isIntersecting);
            });
        }, { threshold: 0 });
        sectionText.forEach((element) => textObserver.observe(element));
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
