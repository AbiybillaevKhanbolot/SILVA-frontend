// Header Component
/** Модалка подтверждения выхода: шапка (меню Профиль) и личный кабинет */
function silvaCloseLogoutConfirmModal() {
    var m = document.getElementById('header-logout-modal');
    if (m) {
        m.classList.remove('is-open');
        m.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
}

function silvaOpenLogoutConfirmModal() {
    var dd = document.getElementById('header-profile-dropdown');
    var pb = document.getElementById('header-profile-btn');
    if (dd) dd.classList.remove('open');
    if (pb) pb.setAttribute('aria-expanded', 'false');
    var modal = document.getElementById('header-logout-modal');
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

async function silvaPerformLogout() {
    try {
        if (window.silvaSupabaseAuth) {
            await window.silvaSupabaseAuth.signOut();
        } else {
            localStorage.removeItem('silva_user');
        }
    } catch (e) {
        localStorage.removeItem('silva_user');
    }
    window.location.href =
        typeof silvaLegacyHref === 'function' ? silvaLegacyHref('index.html') : 'index.html';
}

window.silvaOpenLogoutConfirmModal = silvaOpenLogoutConfirmModal;

/** Избранное для гостя (без регистрации): модалка в body, кнопка-сердечко в шапке */
(function () {
    var OV_ID = 'header-favorites-overlay';
    var PN_ID = 'header-favorites-panel';

    function ensureDom() {
        if (document.getElementById(OV_ID)) return;
        document.body.insertAdjacentHTML(
            'beforeend',
            '<div class="header-favorites-overlay" id="' +
                OV_ID +
                '" aria-hidden="true">' +
                '<div class="header-favorites-panel" id="' +
                PN_ID +
                '" role="dialog" aria-modal="true" aria-labelledby="header-favorites-title">' +
                '<div class="mobile-filter-header">' +
                '<h3 id="header-favorites-title" style="font-weight:600;color:var(--color-gray-900);">Избранное</h3>' +
                '<button type="button" class="mobile-filter-close" id="header-favorites-close" aria-label="Закрыть избранное"><span class="close-x">\u00d7</span></button>' +
                '</div>' +
                '<p class="header-favorites-empty" id="header-favorites-empty" style="display:none;">' +
                'Пока ничего не сохранено. Нажмите на сердечко на карточке объекта — он появится здесь. Без входа список хранится только в этом браузере.' +
                '</p>' +
                '<div id="header-favorites-grid" class="properties-grid" style="display:none;"></div>' +
                '</div></div>'
        );
    }

    function hfGetFavoritesCount() {
        var n = 0;
        try {
            if (typeof getFavorites === 'function') n = getFavorites().length;
            else {
                var key =
                    typeof getFavoritesStorageKey === 'function'
                        ? getFavoritesStorageKey()
                        : 'silva_favorites';
                var raw = JSON.parse(localStorage.getItem(key) || '[]');
                n = Array.isArray(raw) ? raw.length : 0;
            }
        } catch (e) {}
        return n;
    }

    function updateBadges() {
        var n = hfGetFavoritesCount();
        document.querySelectorAll('[data-header-favorites-badge]').forEach(function (el) {
            if (n > 0) {
                el.textContent = String(n);
                el.style.display = 'flex';
            } else {
                el.style.display = 'none';
            }
        });
    }

    async function renderPanel() {
        ensureDom();
        var grid = document.getElementById('header-favorites-grid');
        var emptyEl = document.getElementById('header-favorites-empty');
        if (!grid || !emptyEl) return;

        if (
            window.silvaSupabaseAuth &&
            typeof window.silvaSupabaseAuth.fetchFavorites === 'function' &&
            typeof window.isLoggedIn === 'function' &&
            window.isLoggedIn()
        ) {
            try {
                await window.silvaSupabaseAuth.fetchFavorites();
            } catch (e) {}
        }
        if (typeof mockAPI !== 'undefined' && typeof mockAPI.refreshPropertiesFromSupabase === 'function') {
            try {
                await mockAPI.refreshPropertiesFromSupabase();
            } catch (e) {}
        }

        var ids = [];
        try {
            var key =
                typeof getFavoritesStorageKey === 'function'
                    ? getFavoritesStorageKey()
                    : 'silva_favorites';
            var parsed = JSON.parse(localStorage.getItem(key) || '[]');
            ids = Array.isArray(parsed) ? parsed.map(function (x) { return String(x); }) : [];
        } catch (e) {
            ids = [];
        }

        var byId = {};
        ids.forEach(function (fid) {
            var p =
                typeof mockAPI !== 'undefined' && mockAPI.getPropertyById ? mockAPI.getPropertyById(fid) : null;
            if (p) byId[fid] = p;
        });
        var missing = ids.filter(function (fid) {
            return !byId[fid];
        });
        if (
            missing.length &&
            window.silvaSupabaseAuth &&
            typeof window.silvaSupabaseAuth.fetchPropertiesByIds === 'function'
        ) {
            try {
                var fetched = await window.silvaSupabaseAuth.fetchPropertiesByIds(missing);
                (fetched || []).forEach(function (p) {
                    if (p && p.id != null) byId[String(p.id)] = p;
                });
                if (
                    typeof mockAPI !== 'undefined' &&
                    typeof mockAPI.appendPropertiesToCache === 'function' &&
                    fetched &&
                    fetched.length
                ) {
                    mockAPI.appendPropertiesToCache(fetched);
                }
            } catch (e) {}
        }

        var properties = ids
            .map(function (fid) {
                return byId[fid] || null;
            })
            .filter(Boolean);

        if (properties.length === 0) {
            emptyEl.style.display = 'block';
            grid.innerHTML = '';
            grid.style.display = 'none';
        } else {
            emptyEl.style.display = 'none';
            grid.style.display = 'grid';
            if (typeof renderPropertyCards === 'function') {
                renderPropertyCards(grid, properties);
            } else {
                var lh =
                    typeof silvaLegacyHref === 'function'
                        ? silvaLegacyHref
                        : function (f) {
                              return f;
                          };
                grid.innerHTML = properties
                    .map(function (p) {
                        var t = (p.title || 'Объект').replace(/</g, '&lt;');
                        return (
                            '<a class="header-auth-link" style="display:block;margin-bottom:0.5rem;" href="' +
                            lh('property.html') +
                            '?id=' +
                            encodeURIComponent(p.id) +
                            '">' +
                            t +
                            '</a>'
                        );
                    })
                    .join('');
            }
        }
        updateBadges();
    }

    function silvaOpenHeaderFavorites() {
        ensureDom();
        var ov = document.getElementById(OV_ID);
        var pn = document.getElementById(PN_ID);
        if (!ov || !pn) return;
        ov.classList.add('open');
        ov.setAttribute('aria-hidden', 'false');
        pn.classList.remove('closing');
        pn.classList.add('open');
        document.querySelectorAll('[data-header-favorites-trigger]').forEach(function (btn) {
            btn.setAttribute('aria-expanded', 'true');
        });
        renderPanel();
    }

    function silvaCloseHeaderFavorites() {
        var ov = document.getElementById(OV_ID);
        var pn = document.getElementById(PN_ID);
        if (!ov || !pn) return;
        if (pn.classList.contains('closing')) return;
        pn.classList.add('closing');
        var onEnd = function (event) {
            if (event.target !== pn) return;
            pn.classList.remove('open');
            pn.classList.remove('closing');
            ov.classList.remove('open');
            ov.setAttribute('aria-hidden', 'true');
            pn.removeEventListener('animationend', onEnd);
            document.querySelectorAll('[data-header-favorites-trigger]').forEach(function (btn) {
                btn.setAttribute('aria-expanded', 'false');
            });
        };
        pn.addEventListener('animationend', onEnd);
    }

    function bindGlobalOnce() {
        if (window._silvaHeaderFavoritesBound) return;
        window._silvaHeaderFavoritesBound = true;
        document.body.addEventListener('click', function (e) {
            if (e.target.closest('[data-header-favorites-trigger]')) {
                e.preventDefault();
                silvaOpenHeaderFavorites();
                return;
            }
            if (e.target.closest('#header-favorites-close')) {
                e.preventDefault();
                silvaCloseHeaderFavorites();
                return;
            }
            if (e.target.id === OV_ID) {
                silvaCloseHeaderFavorites();
            }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            var ov = document.getElementById(OV_ID);
            var pn = document.getElementById(PN_ID);
            if (ov && ov.classList.contains('open') && pn && pn.classList.contains('open')) {
                silvaCloseHeaderFavorites();
            }
        });
        window.addEventListener('silva-favorites-changed', function () {
            updateBadges();
            var pn = document.getElementById(PN_ID);
            if (pn && pn.classList.contains('open')) renderPanel();
        });
    }

    window.silvaCloseHeaderFavorites = silvaCloseHeaderFavorites;
    window.silvaOpenHeaderFavorites = silvaOpenHeaderFavorites;
    window.silvaUpdateHeaderFavoritesBadges = updateBadges;
    window.silvaEnsureHeaderFavoritesDom = ensureDom;
    window.silvaBindHeaderGuestFavorites = function () {
        bindGlobalOnce();
        ensureDom();
        updateBadges();
    };
})();

function initHeader() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    const isHomePage = window.location.pathname === '/' || 
                      window.location.pathname.endsWith('index.html') ||
                      window.location.pathname.endsWith('/');

    const pathLower = (window.location.pathname || '').toLowerCase();
    let navActive = null;
    if (pathLower.indexOf('catalog.html') !== -1) {
        navActive = 'catalog';
    } else if (pathLower.indexOf('/contact.html') !== -1 || pathLower.endsWith('/contacts')) {
        navActive = 'contacts';
    } else if (pathLower.indexOf('loyalty.html') !== -1) {
        navActive = 'loyalty';
    } else if (isHomePage) {
        navActive = 'home';
    }

    let isScrolled = false;

    function updateHeader() {
        const scrolled = window.scrollY > 50;
        if (scrolled !== isScrolled) {
            isScrolled = scrolled;
            renderHeader();
        }
    }

    function isUserLoggedIn() {
        return !!localStorage.getItem('silva_user');
    }

    function getUserData() {
        try {
            return JSON.parse(localStorage.getItem('silva_user') || '{}');
        } catch (e) { return {}; }
    }

    async function renderHeader() {
        var lh = typeof silvaLegacyHref === 'function' ? silvaLegacyHref : function (f) { return f; };
        if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.syncLocalUserFromSupabase === 'function') {
            try {
                await window.silvaSupabaseAuth.syncLocalUserFromSupabase();
            } catch (e) {}
        }
        const loggedIn = isUserLoggedIn();
        const user = getUserData();
        const userName = user.name || 'Пользователь';
        const userEmail = user.email || '';

        const headerClass = (isScrolled || !isHomePage) ? 'header-scrolled' : 'header-scrolled';
        const textClass = '';
        const iconClass = '';
        const userClass = '';
        const menuClass = '';

        const isOwner = user.role === 'owner';
        const isAdmin = user.role === 'admin';
        const ic = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
        const profileHref = isAdmin ? lh('admin.html') : lh('profile.html');
        const profileLabel = isAdmin ? 'Админ-панель' : 'Личный кабинет';
        const adminLinksHtml = isAdmin
            ? `
                                <a href="${lh('admin.html')}" class="header-dropdown-link">
                                    ${ic('shield-check', 18, 18)}
                                    Панель администратора
                                </a>`
            : '';
        const ownerLinksHtml = isOwner
            ? `
                                <a href="${lh('owner-dashboard.html')}" class="header-dropdown-link">
                                    ${ic('layout-dashboard', 18, 18)}
                                    Панель владельца
                                </a>`
            : '';
        const ownerMobileLink =
            isOwner && !isAdmin
                ? '<a href="' +
                  lh('owner-dashboard.html') +
                  '" class="mobile-menu-line-btn mobile-menu-line-btn--outline">Панель владельца</a>'
                : '';
        const guestLinksHtml = !isOwner && !isAdmin
            ? `
                                <a href="${lh('my-bookings.html')}" class="header-dropdown-link">
                                    ${ic('calendar-days', 18, 18)}
                                    Мои бронирования
                                </a>
                                <a href="${lh('favorites.html')}" class="header-dropdown-link">
                                    ${ic('heart', 18, 18)}
                                    Избранное
                                </a>`
            : '';
        const adminAuthHtml = `
                        <div class="header-auth-buttons">
                            <a href="${lh('admin.html')}" class="header-auth-link header-auth-link-primary">Админ-панель</a>
                            <button type="button" class="header-auth-link" id="header-logout-btn">Выйти</button>
                        </div>`;
        const authHtml = loggedIn
            ? `
                        ${
                            isAdmin
                                ? adminAuthHtml
                                : `
                        <div class="header-user-menu" id="header-user-menu">
                            <button type="button" class="header-user-btn ${userClass}" id="header-profile-btn" aria-haspopup="true" aria-expanded="false">
                                ${ic('user-round', 20, 20)}
                                <span class="header-user-name">Профиль</span>
                            </button>
                            <div class="header-profile-dropdown" id="header-profile-dropdown">
                                <div class="header-dropdown-header">
                                    <div class="header-dropdown-name">${userName}</div>
                                    <div class="header-dropdown-email">${userEmail}</div>
                                </div>
                                <div class="header-dropdown-divider"></div>
                                <a href="${profileHref}" class="header-dropdown-link">
                                    ${ic('circle-user', 18, 18)}
                                    ${profileLabel}
                                </a>
                                ${guestLinksHtml}
                                ${ownerLinksHtml}
                                ${adminLinksHtml}
                                <div class="header-dropdown-divider"></div>
                                <button type="button" class="header-dropdown-logout" id="header-logout-btn">
                                    ${ic('log-out', 18, 18)}
                                    Выйти
                                </button>
                            </div>
                        </div>`
                        } 
            `
            : `
                        <div class="header-auth-buttons">
                            <button type="button" class="header-auth-link header-auth-link-primary header-favorites-icon-btn" data-header-favorites-trigger="1" aria-label="Избранное" aria-expanded="false" aria-controls="header-favorites-panel">
                                ${ic('heart', 20, 20, { fill: 'none' })}
                                <span class="filter-badge header-favorites-badge" data-header-favorites-badge="1" style="display: none;">0</span>
                            </button>
                            <a href="${lh('login.html')}" class="header-auth-link">Вход</a>
                            <a href="${lh('register.html')}" class="header-auth-link header-auth-link-primary">Регистрация</a>
                        </div>`;

        const mobileAuthLoggedOut =
            '<button type="button" class="header-auth-link header-auth-link-primary header-favorites-icon-btn mobile-menu-favorites-btn mobile-menu-stack-btn" data-header-favorites-trigger="1" aria-label="Избранное">' +
            (typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg('heart', 20, 20, { fill: 'none' }) : '') +
            '<span class="filter-badge header-favorites-badge" data-header-favorites-badge="1" style="display: none;">0</span></button>' +
            '<a href="' +
            lh('login.html') +
            '" class="header-auth-link mobile-menu-auth-btn mobile-menu-stack-btn">Вход</a><a href="' +
            lh('register.html') +
            '" class="header-auth-link header-auth-link-primary mobile-menu-auth-btn mobile-menu-stack-btn">Регистрация</a>';

        const mobileAuthLoggedInAdmin =
            '<a href="' +
            lh('admin.html') +
            '" class="mobile-menu-line-btn mobile-menu-line-btn--outline">Админ-панель</a>' +
            '<button type="button" class="mobile-menu-line-btn mobile-menu-line-btn--outline" id="mobile-logout-btn">Выйти</button>';

        const mobileAuthLoggedInUser =
            '<a href="' +
            profileHref +
            '" class="mobile-menu-line-btn mobile-menu-line-btn--outline">' +
            profileLabel +
            '</a>' +
            '<a href="' +
            lh('my-bookings.html') +
            '" class="mobile-menu-line-btn mobile-menu-line-btn--outline">Мои бронирования</a>' +
            '<a href="' +
            lh('favorites.html') +
            '" class="mobile-menu-line-btn mobile-menu-line-btn--outline">Избранное</a>' +
            ownerMobileLink +
            '<button type="button" class="mobile-menu-line-btn mobile-menu-line-btn--outline" id="mobile-logout-btn">Выйти</button>';

        const mobileAuthBlock = loggedIn
            ? isAdmin
                ? mobileAuthLoggedInAdmin
                : mobileAuthLoggedInUser
            : mobileAuthLoggedOut;

        headerContainer.innerHTML = `
            <header class="header ${headerClass} ${isHomePage ? 'header--home' : ''}">
                <div class="header-content">
                    <div class="header-left">
                        <a href="${lh('index.html')}" class="header-logo">
                            <div class="header-logo-icon ${iconClass}">
                                <img class="silva-brand-logo-img" src="images/logo.svg" alt="SILVA" width="45" height="44" decoding="async">
                            </div>
                            <span class="header-logo-text ${textClass}">SILVA</span>
                        </a>
                    </div>

                    <nav class="header-nav" aria-label="Основная навигация">
                        <a href="${lh('index.html')}" class="header-nav-link${navActive === 'home' ? ' header-nav-link--active' : ''}"${navActive === 'home' ? ' aria-current="page"' : ''}>Главная</a>
                        <span class="header-nav-sep" aria-hidden="true"></span>
                        <a href="${lh('catalog.html')}" class="header-nav-link${navActive === 'catalog' ? ' header-nav-link--active' : ''}"${navActive === 'catalog' ? ' aria-current="page"' : ''}>Каталог</a>
                        <span class="header-nav-sep" aria-hidden="true"></span>
                        <a href="${lh('loyalty.html')}" class="header-nav-link${navActive === 'loyalty' ? ' header-nav-link--active' : ''}"${navActive === 'loyalty' ? ' aria-current="page"' : ''}>Бонусы</a>
                        <span class="header-nav-sep" aria-hidden="true"></span>
                        <a href="${lh('contact.html')}" class="header-nav-link${navActive === 'contacts' ? ' header-nav-link--active' : ''}"${navActive === 'contacts' ? ' aria-current="page"' : ''}>Контакты</a>
                    </nav>

                    <div class="header-right">
                        ${authHtml}

                        <button class="header-menu-btn ${menuClass}" id="mobile-menu-btn" aria-label="Меню">
                            ${typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg('menu', 20, 20, { id: 'menu-icon' }) : '<svg id="menu-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>'}
                        </button>
                    </div>
                </div>
            </header>

            <div class="mobile-menu" id="mobile-menu">
                <div class="mobile-menu-content">
                    <div class="mobile-menu-nav" role="group" aria-label="Основная навигация">
                        <a href="${lh('index.html')}" class="mobile-menu-link${navActive === 'home' ? ' mobile-menu-link--active' : ''}"${navActive === 'home' ? ' aria-current="page"' : ''}>Главная</a>
                        <span class="mobile-menu-nav-sep" aria-hidden="true"></span>
                        <a href="${lh('catalog.html')}" class="mobile-menu-link${navActive === 'catalog' ? ' mobile-menu-link--active' : ''}"${navActive === 'catalog' ? ' aria-current="page"' : ''}>Каталог</a>
                        <span class="mobile-menu-nav-sep" aria-hidden="true"></span>
                        <a href="${lh('loyalty.html')}" class="mobile-menu-link${navActive === 'loyalty' ? ' mobile-menu-link--active' : ''}"${navActive === 'loyalty' ? ' aria-current="page"' : ''}>Бонусы</a>
                        <span class="mobile-menu-nav-sep" aria-hidden="true"></span>
                        <a href="${lh('contact.html')}" class="mobile-menu-link${navActive === 'contacts' ? ' mobile-menu-link--active' : ''}"${navActive === 'contacts' ? ' aria-current="page"' : ''}>Контакты</a>
                    </div>
                    <div class="mobile-menu-auth">${mobileAuthBlock}</div>
                </div>
            </div>
            ${loggedIn ? `
            <div id="header-logout-modal" class="header-logout-modal-overlay" aria-hidden="true" role="presentation">
                <div class="header-logout-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="header-logout-modal-title">
                    <button type="button" class="header-logout-modal__close" id="header-logout-modal-x" aria-label="Закрыть">×</button>
                    <h2 id="header-logout-modal-title" class="header-logout-modal__title">Вы уверены, что хотите выйти?</h2>
                    <div class="header-logout-modal__actions">
                        <button type="button" class="btn btn-ghost header-logout-modal__btn-cancel" id="header-logout-modal-cancel">Отмена</button>
                        <button type="button" class="btn header-logout-modal__btn-confirm" id="header-logout-modal-confirm">Да</button>
                    </div>
                </div>
            </div>` : ''}
        `;

        // Mobile menu toggle
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const menuIcon = document.getElementById('menu-icon');
        var silvaIconPaths = typeof SilvaIcons !== 'undefined' ? SilvaIcons.paths : null;

        if (menuBtn && mobileMenu && menuIcon) {
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('open');
                if (silvaIconPaths) {
                    menuIcon.innerHTML = mobileMenu.classList.contains('open') ? silvaIconPaths.x : silvaIconPaths.menu;
                }
            });
        }

        var mobileLogoutBtn = document.getElementById('mobile-logout-btn');
        if (mobileLogoutBtn && mobileMenu) {
            mobileLogoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                mobileMenu.classList.remove('open');
                var mi = document.getElementById('menu-icon');
                if (silvaIconPaths && mi) mi.innerHTML = silvaIconPaths.menu;
                silvaOpenLogoutConfirmModal();
            });
        }

        // Profile dropdown: show on hover and click
        const profileBtn = document.getElementById('header-profile-btn');
        const profileDropdown = document.getElementById('header-profile-dropdown');
        const userMenuWrap = document.getElementById('header-user-menu');
        const logoutBtn = document.getElementById('header-logout-btn');
        const logoutModal = document.getElementById('header-logout-modal');

        if (profileBtn && profileDropdown && userMenuWrap) {
            function showDropdown() {
                profileDropdown.classList.add('open');
                profileBtn.setAttribute('aria-expanded', 'true');
            }
            function hideDropdown() {
                profileDropdown.classList.remove('open');
                profileBtn.setAttribute('aria-expanded', 'false');
            }
            function toggleDropdown() {
                profileDropdown.classList.toggle('open');
                profileBtn.setAttribute('aria-expanded', profileDropdown.classList.contains('open'));
            }

            userMenuWrap.addEventListener('mouseenter', showDropdown);
            userMenuWrap.addEventListener('mouseleave', hideDropdown);
            profileBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleDropdown();
            });

            document.addEventListener('click', function(e) {
                if (!userMenuWrap.contains(e.target)) hideDropdown();
            });

            if (logoutBtn) {
                logoutBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    silvaOpenLogoutConfirmModal();
                });
            }
        }
        if (logoutBtn && !profileBtn) {
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                silvaOpenLogoutConfirmModal();
            });
        }

        if (logoutModal) {
            logoutModal.addEventListener('click', function (e) {
                if (e.target === logoutModal) silvaCloseLogoutConfirmModal();
            });
            var lx = document.getElementById('header-logout-modal-x');
            var lc = document.getElementById('header-logout-modal-cancel');
            var lok = document.getElementById('header-logout-modal-confirm');
            if (lx) lx.addEventListener('click', silvaCloseLogoutConfirmModal);
            if (lc) lc.addEventListener('click', silvaCloseLogoutConfirmModal);
            if (lok) lok.addEventListener('click', silvaPerformLogout);
        }

        if (!headerContainer.dataset.logoutEscapeBound) {
            headerContainer.dataset.logoutEscapeBound = '1';
            document.addEventListener('keydown', function (e) {
                if (e.key !== 'Escape') return;
                var m = document.getElementById('header-logout-modal');
                if (m && m.classList.contains('is-open')) silvaCloseLogoutConfirmModal();
            });
        }

        if (!loggedIn) {
            if (typeof window.silvaBindHeaderGuestFavorites === 'function') {
                window.silvaBindHeaderGuestFavorites();
            }
        } else if (typeof window.silvaCloseHeaderFavorites === 'function') {
            window.silvaCloseHeaderFavorites();
        }
    }

    window.addEventListener('scroll', updateHeader);
    renderHeader();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
} else {
    initHeader();
}

