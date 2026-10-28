(() => {
    'use strict';
    if (window.parent === window || !window.parent.CampusState) {
        const route = location.pathname.split('/html/').pop() + location.search + location.hash;
        const entry = new URL('../index.html', document.currentScript.src);
        entry.hash = encodeURIComponent(route);
        location.replace(entry.href);
        return;
    }
    window.CampusState = window.parent.CampusState;
    window.CampusAccess = window.parent.CampusAccess;
    window.CampusRoutes = window.parent.CampusRoutes;
    window.CampusConfig = window.parent.CampusConfig;
    window.CampusTransport = window.parent.CampusTransport;
    window.CampusValidation = window.parent.CampusValidation;
    window.CampusToday = window.parent.CampusToday;
    window.CampusMedia = window.parent.CampusMedia;
    window.CampusRoute = window.parent.CampusRoute;
    window.CampusNavigate = (route) => window.parent.CampusNavigate(route);
    document.addEventListener(
        'error',
        (event) => {
            const img = event.target;
            if (
                img.tagName !== 'IMG' ||
                /\/assets\/images\/(?:community|home)-placeholder\.svg$/.test(img.src)
            )
                return;
            img.dataset.fallback = 'true';
            const community = /student|people|campus|community/i.test(img.alt);
            img.src = new URL(
                '../../assets/images/' + (community ? 'community' : 'home') + '-placeholder.svg',
                document.baseURI
            ).href;
            img.alt = community ? 'Community illustration' : 'Home interior illustration';
        },
        true
    );
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (
            !link ||
            event.defaultPrevented ||
            event.button ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            link.download ||
            link.target
        )
            return;
        const href = link.getAttribute('href');
        if (href.startsWith('#')) return;
        const target = new URL(href, document.baseURI);
        const route = window.CampusRoutes.resolve(
            target.pathname + target.search + target.hash,
            window.CampusState.currentUser?.role
        );
        if (
            target.origin === new URL(document.baseURI).origin &&
            route &&
            Object.hasOwn(window.parent.CampusPages, route.split(/[?#]/)[0])
        ) {
            event.preventDefault();
            window.CampusNavigate(route);
        }
    });
    document.addEventListener('DOMContentLoaded', () => {
        const section = window.CampusRoute.split('/')[0];
        document.body.dataset.section = section;
        const me = window.CampusState.currentUser;
        const dashboardLayout =
            me?.role === 'admin' && Boolean(document.querySelector('.nav nav'));
        if (dashboardLayout) document.body.classList.add('dashboard-layout');
        document.body.dataset.screen = window.CampusRoute.split(/[?#]/)[0]
            .split('/')
            .pop()
            .replace('.html', '');
        const api = window.CampusAPI;
        if (!api) return;
        window.parent.CampusMountShowcase?.(document, api);
        const mainNav = document.querySelector('.nav nav');
        function addSidebarIcon(control, name) {
            const paths = {
                Overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
                Users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4',
                Properties: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
                Reports: 'M12 3L2 21h20z M12 9v5 M12 17h.01',
                Analysis: 'M4 20V10 M10 20V4 M16 20v-8 M22 20H2',
                Activity: 'M3 12h4l3-8 4 16 3-8h4',
                Market: 'M3 17l6-6 4 4 8-10 M15 5h6v6',
                Profile: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M12 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
                Support: 'M4 14v-3a8 8 0 0 1 16 0v3 M4 11H2v6h4v-6z M20 11h2v6h-4v-6z M20 17v2h-6',
                'Sign out': 'M9 3H3v18h6 M9 12h12 M17 8l4 4-4 4'
            };
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('viewBox', '0 0 24 24');
            icon.setAttribute('aria-hidden', 'true');
            icon.classList.add('sidebar-icon');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', paths[name] || paths.Overview);
            icon.append(path);
            control.prepend(icon);
        }
        if (mainNav) {
            mainNav.replaceChildren();
            for (const [path, label] of window.CampusRoutes.menu(me?.role)) {
                const a = document.createElement('a');
                a.href = '../' + path;
                a.textContent = label;
                const current = new URL(window.CampusRoute, 'https://campus.test/'),
                    target = new URL(path, 'https://campus.test/');
                if (
                    current.pathname === target.pathname &&
                    (section !== 'admin' ||
                        (current.searchParams.get('tab') || 'overview') ===
                            (target.searchParams.get('tab') || 'overview'))
                ) {
                    a.className = 'active';
                    a.setAttribute('aria-current', 'page');
                }
                mainNav.append(a);
                if (dashboardLayout) addSidebarIcon(a, label);
            }
            const header = mainNav.closest('.nav');
            if (dashboardLayout) {
                header.classList.add('dashboard-sidebar');
                header.querySelector('.brand small').textContent = 'ADMINISTRATION';
                header.querySelector('.brand').href = '../admin/dashboard.html';
                mainNav.setAttribute('aria-label', 'Administration navigation');
            }
            mainNav.id = 'primary-navigation';
            if (dashboardLayout) header.querySelector('.search')?.setAttribute('hidden', '');
            const menu = document.createElement('button');
            menu.type = 'button';
            menu.className = 'menu-toggle';
            menu.id = 'menu-toggle';
            menu.textContent = '☰';
            menu.setAttribute('aria-controls', mainNav.id);
            menu.setAttribute('aria-expanded', 'false');
            menu.setAttribute('aria-label', 'Open navigation');
            if (dashboardLayout) document.body.prepend(menu);
            else header.append(menu);
            const closeMenu = () => {
                header.classList.remove('is-menu-open');
                menu.setAttribute('aria-expanded', 'false');
                menu.setAttribute('aria-label', 'Open navigation');
                menu.textContent = '☰';
            };
            menu.addEventListener('click', () => {
                const open = header.classList.toggle('is-menu-open');
                menu.setAttribute('aria-expanded', String(open));
                menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
                menu.textContent = open ? '×' : '☰';
            });
            mainNav.addEventListener('click', closeMenu);
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && header.classList.contains('is-menu-open')) {
                    closeMenu();
                    menu.focus();
                }
            });
            document.addEventListener('click', (event) => {
                if (!header.contains(event.target) && !menu.contains(event.target)) closeMenu();
            });
            window.addEventListener('resize', () => {
                if (innerWidth > 800) closeMenu();
            });
            new ResizeObserver(() =>
                document.documentElement.style.setProperty(
                    '--nav-height',
                    dashboardLayout ? '0px' : header.getBoundingClientRect().height + 'px'
                )
            ).observe(header);
        }
        function prepareLinks(root = document) {
            const links = [
                ...(root.matches?.('a[href]') ? [root] : []),
                ...(root.querySelectorAll?.('a[href]') || [])
            ];
            for (const a of links) {
                const original = a.getAttribute('href');
                if (!original || original.startsWith('#') || a.download) continue;
                const target = new URL(original, document.baseURI);
                if (target.origin !== new URL(document.baseURI).origin) continue;
                const route = window.CampusRoutes.resolve(
                    target.pathname + target.search + target.hash,
                    me?.role
                );
                if (!route) continue;
                const href = '../' + route;
                if (original !== href) a.setAttribute('href', href);
            }
        }
        new MutationObserver((records) => {
            for (const record of records) {
                if (record.type === 'attributes') prepareLinks(record.target);
                else
                    record.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) prepareLinks(node);
                    });
            }
        }).observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href']
        });
        const bar = document.createElement('div');
        bar.className = 'preview-toolbar';
        bar.setAttribute('aria-label', 'Account navigation');
        const identity = document.createElement('span');
        identity.textContent = me
            ? me.firstName +
              ' · ' +
              { tenant: 'Tenant', landlord: 'Landlord', admin: 'Admin' }[me.role]
            : 'Campus Mate · Guest';
        bar.append(identity);
        const links = me
            ? [
                  ...(!dashboardLayout && !mainNav && ['auth', 'public'].includes(section)
                      ? [[window.CampusAccess.dashboard(me.role), 'Dashboard']]
                      : []),
                  ['profile.html', 'Profile']
              ]
            : [
                  ['login.html', 'Sign in'],
                  ['register.html', 'Create account']
              ];
        for (const [href, label] of links) {
            const a = document.createElement('a');
            a.href = href;
            a.textContent = label;
            if (dashboardLayout) addSidebarIcon(a, label);
            if (dashboardLayout && window.CampusRoutes.resolve(href, me.role)?.split(/[?#]/)[0] === window.CampusRoute.split(/[?#]/)[0]) {
                a.classList.add('active');
                a.setAttribute('aria-current', 'page');
            }
            bar.append(a);
        }
        const supportLink = document.createElement('a');
        supportLink.href = '../public/support.html';
        supportLink.textContent = 'Support';
        if (dashboardLayout) {
            addSidebarIcon(supportLink, 'Support');
            if (window.CampusRoute.split(/[?#]/)[0] === 'public/support.html') {
                supportLink.classList.add('active');
                supportLink.setAttribute('aria-current', 'page');
            }
        }
        bar.append(supportLink);
        if (me) {
            const button = document.createElement('button');
            button.id = 'preview-signout';
            button.textContent = 'Sign out';
            if (dashboardLayout) addSidebarIcon(button, 'Sign out');
            bar.append(button);
            button.addEventListener('click', async () => {
                try {
                    await api.logout();
                    window.CampusNavigate('login.html');
                } catch (error) {
                    const p = document.createElement('p');
                    p.setAttribute('role', 'alert');
                    p.textContent = error.message;
                    (landingActions || publicActions || bar).append(p);
                }
            });
        }
        const landingActions = document.querySelector('header.premium-nav .nav-auth');
        const publicActions = section === 'public' && !me && !dashboardLayout ? mainNav : null;
        if (landingActions) {
            // The landing page already has navigation; keep account actions in that header.
            if (me) landingActions.replaceChildren(...Array.from(bar.children).slice(1));
            document.documentElement.style.setProperty('--account-bar-height', '0px');
        } else if (publicActions) {
            // Merge account controls into the existing public navigation without duplicate links.
            for (const control of Array.from(bar.children).slice(1)) {
                const target =
                    control.tagName === 'A'
                        ? window.CampusRoutes.resolve(control.getAttribute('href'), me?.role)
                        : null;
                const duplicate =
                    target &&
                    Array.from(publicActions.querySelectorAll('a')).some(
                        (link) =>
                            window.CampusRoutes.resolve(link.getAttribute('href'), me?.role) ===
                            target
                    );
                if (!duplicate) publicActions.append(control);
            }
            document.documentElement.style.setProperty('--account-bar-height', '0px');
        } else if (dashboardLayout && mainNav) {
            mainNav.closest('.nav').append(bar);
            document.documentElement.style.setProperty('--account-bar-height', '0px');
        } else {
            document.body.prepend(bar);
        }
        if (section === 'auth' && !me) bar.hidden = true;
        new ResizeObserver(() =>
            document.documentElement.style.setProperty(
                '--account-bar-height',
                dashboardLayout ? '0px' : bar.getBoundingClientRect().height + 'px'
            )
        ).observe(bar);
        prepareLinks();
        let scheduled = false;
        function refreshTables() {
            scheduled = false;
            for (const table of document.querySelectorAll('.table-wrap')) {
                const scrollable = table.scrollWidth > table.clientWidth + 2;
                table.dataset.scrollable = String(scrollable);
                if (scrollable) {
                    table.tabIndex = 0;
                    table.setAttribute('aria-label', 'Scrollable data table');
                } else {
                    table.removeAttribute('tabindex');
                    table.removeAttribute('aria-label');
                }
                if (!table.nextElementSibling?.classList.contains('table-scroll-hint')) {
                    const hint = document.createElement('p');
                    hint.className = 'table-scroll-hint';
                    hint.textContent = 'Scroll sideways to see the full table ↔';
                    table.after(hint);
                }
            }
        }
        const scheduleTables = () => {
            if (!scheduled) {
                scheduled = true;
                requestAnimationFrame(refreshTables);
            }
        };
        new MutationObserver(scheduleTables).observe(document.body, {
            childList: true,
            subtree: true
        });
        window.addEventListener('resize', scheduleTables);
        scheduleTables();
        if (!api.isDemo) {
            document.querySelectorAll('.demo').forEach((note) => (note.hidden = true));
            document.getElementById('rememberMe')?.closest('label')?.remove();
        }
        document.querySelectorAll('form').forEach((form) => window.CampusValidation.bind(form));
        document.addEventListener(
            'submit',
            (event) => {
                if (!window.CampusValidation.check(event.target)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            },
            true
        );
        const widget = document.createElement('div');
        widget.className = 'assistant-widget';
        widget.innerHTML = window.parent.document.getElementById(
            'housing-assistant-template'
        ).innerHTML;
        (landingActions || publicActions || bar).append(widget);
        document.getElementById('assistant-toggle').title = 'Housing assistant';
        if (!api.isDemo)
            widget.querySelector('.assistant-heading small').textContent = 'Connected assistant';
        const panel = document.getElementById('assistant-panel'),
            toggle = document.getElementById('assistant-toggle');
        if (landingActions || publicActions || dashboardLayout) {
            widget.querySelector('.assistant-label').textContent = 'AI';
            // The mobile menu closes after a click, so the chat must live outside it.
            document.body.append(panel);
        }
        const show = (open) => {
            panel.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            if (open) document.getElementById('assistant-input').focus();
            else {
                const focusTarget = toggle.getClientRects().length
                    ? toggle
                    : document.getElementById('menu-button') ||
                      document.getElementById('menu-toggle') ||
                      toggle;
                focusTarget.focus();
            }
        };
        toggle.addEventListener('click', () => show(panel.hidden));
        document.getElementById('assistant-close').addEventListener('click', () => show(false));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !panel.hidden) show(false);
        });
        function feed() {
            const container = document.getElementById('assistant-feed');
            container.replaceChildren();
            const messages = window.CampusState.botMessages.length
                ? window.CampusState.botMessages
                : [
                      {
                          who: 'bot',
                          text: 'Hi! I can explain homes, matching, reports, listing fees and direct rental arrangements. What are you looking for?'
                      }
                  ];
            messages.forEach((message) => {
                const p = document.createElement('p');
                p.className = message.who;
                p.textContent = message.text;
                container.append(p);
            });
            container.scrollTop = container.scrollHeight;
        }
        async function reply(question) {
            if (!api.isDemo) {
                window.CampusState.botMessages.push({ who: 'user', text: question });
                feed();
                try {
                    const result = await api.askAssistant(question);
                    if (typeof result?.text !== 'string')
                        throw Error('The assistant endpoint must return text.');
                    window.CampusState.botMessages.push({ who: 'bot', text: result.text });
                } catch (error) {
                    window.CampusState.botMessages.push({ who: 'bot', text: error.message });
                }
                feed();
                return;
            }

            const rent = /\b(?:rent|price|budget|cost)\b|سعر|ميزانية|ايجار|إيجار/i;
            let answer =
                'Search homes, compare your preferences, send a rental request, review the agreement, arrange rent directly with the landlord, then record your move-in and move-out reports.';
            if (/roommate|زميل|توافق/i.test(question))
                answer =
                    'Open Roommates to see compatibility based on budget, area, sleep, work hours, cleanliness, noise and smoking. Request a video meeting from a profile. The invited person accepts or declines; sample roommate acceptance can be simulated in demo mode.';
            else if (/report|condition|video|damage|تقرير|فيديو|تلف/i.test(question))
                answer =
                    'Open My Rentals → Condition reports. Attach a move-in video and checklist, then a move-out video. Compare the recorded conditions. Visual AI analysis is simulated in this frontend.';
            else if (/payment|pay|دفع/i.test(question))
                answer =
                    'Landlords pay JD 20 per new property advertisement. Rent and deposits are paid directly between tenant and landlord; Campus Mate does not collect or verify them. Listing fee confirmation is simulated in demo mode.';
            else if (/book|request|حجز|طلب/i.test(question))
                answer =
                    'Open a property, choose a start date and duration, then choose whether to rent alone or select your roommate. Send the request and wait for the landlord to accept or reject it. To try the landlord side, sign out and sign in with the owner account.';
            else if (/area|location|منطق|موقع/i.test(question))
                answer =
                    'Explore Jubeiha, Shafa Badran, Sweileh and Amman Center. The Market page compares illustrative rents. Choose your work or study destination in Preferences.';
            else if (rent.test(question)) {
                const amount = question.match(/\b\d{1,4}\b/);
                const homes = window.CampusState.properties.filter(
                    (p) => p.status === 'published' && (!amount || p.price <= Number(amount[0]))
                );
                answer = homes.length
                    ? homes
                          .map(
                              (p) =>
                                  p.title +
                                  ': JD ' +
                                  p.price +
                                  ' / ' +
                                  (p.period === 'Daily' ? 'night' : 'month') +
                                  ' in ' +
                                  p.area
                          )
                          .join('\n')
                    : 'No sample homes fit that budget. Try raising your budget in Properties.';
            } else if (/home|apartment|property|سكن|شقة|عقار/i.test(question))
                answer =
                    'Properties lets you filter by area, price, type, rooms, furniture, dates and amenities. Compatibility scores update from your housing preferences.';
            else if (/hello|hi|مرحبا|اهلا/i.test(question))
                answer =
                    'Welcome to Campus Mate! Ask me about homes, roommates or the rental journey.';
            window.CampusState.botMessages.push(
                { who: 'user', text: question },
                { who: 'bot', text: answer }
            );
            feed();
        }
        window.CampusValidation.bind(document.getElementById('assistant-form'));
        document.getElementById('assistant-form').addEventListener('submit', (event) => {
            event.preventDefault();
            if (!window.CampusValidation.check(event.target)) return;
            const input = document.getElementById('assistant-input');
            reply(input.value.trim());
            input.value = '';
            input.setCustomValidity('');
        });
        document
            .querySelectorAll('[data-prompt]')
            .forEach((button) =>
                button.addEventListener('click', () => reply(button.dataset.prompt))
            );
        feed();
    });
})();
