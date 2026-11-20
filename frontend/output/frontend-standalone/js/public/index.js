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
            '../../assets/images/tour-outdoor-key-handover-wide.png',
            '../../assets/images/tour-bedroom.jpg',
            '../../assets/images/tour-living-room.jpg',
            '../../assets/images/tour-house.jpg',
            '../../assets/images/tour-reading-corner.jpg'
        ];

        const titles = [
            'The keys to your next chapter.',
            'A room for your everyday.',
            'Space for living together.',
            'A new place to call home.',
            'Your next chapter starts here.'
        ];

        const chapters = [
            'Student life',
            'Your space',
            'Your people',
            'Feel at home',
            'Your next chapter'
        ];

        const descriptions = [
            'A smiling young man receiving a house key from another man outside the home',
            'A comfortable bedroom with natural light and plants',
            'A comfortable furnished living room with armchairs and a sofa',
            'A welcoming house exterior with a landscaped garden',
            'A cozy reading corner with an armchair beside a bedroom window'
        ];
        const firstFrame = visual.querySelector('.student-frame');
        const layers = photos.map((source, index) => {
            const frame = index === 0 && firstFrame ? firstFrame : document.createElement('div');
            frame.className = 'student-frame' + (index === 0 ? ' current' : '');
            frame.dataset.photo = String(index);
            if (!frame.children.length) {
                ['student-image', 'student-image photo-mid', 'student-image photo-focus'].forEach((name) => {
                    const image = document.createElement('img');
                    image.className = name;
                    frame.appendChild(image);
                });
            }
            [...frame.children].forEach((image, layer) => {
                image.alt = layer === 0 ? descriptions[index] : '';
                image.src = source;
                image.decoding = 'async';
                image.fetchPriority = index === 0 ? 'high' : 'low';
            });
            if (frame !== firstFrame) visual.insertBefore(frame, visual.firstChild);
            return frame;
        });

        const visualNumber = $('.visual-number');
        const visualTitle = $('.visual-title');
        const chapterName = $('#chapter-name');
        const progress = $('#progress');
        const percent = $('#percent');
        const photoZooms = new Map();

        function startPhotoZoom(frame) {
            photoZooms.get(frame)?.cancel();
            photoZooms.delete(frame);
            if (reducedMotion.matches) return;
            const zoom = frame.animate(
                [{ transform: 'scale(1)' }, { transform: frame.dataset.photo === '0' ? 'scale(1.04)' : 'scale(1.09)' }],
                { duration: 14000, easing: 'cubic-bezier(.2,.4,.4,1)', fill: 'both' }
            );
            photoZooms.set(frame, zoom);
        }

        reducedMotion.addEventListener('change', () => {
            photoZooms.forEach((zoom) => zoom.cancel());
            photoZooms.clear();
            const current = visual.querySelector('.student-frame.current');
            if (current) startPhotoZoom(current);
        });

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
                    if (index === step) startPhotoZoom(image);
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
