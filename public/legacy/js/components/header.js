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

function silvaPerformLogout() {
    localStorage.removeItem('silva_user');
    window.location.href = 'index.html';
}

window.silvaOpenLogoutConfirmModal = silvaOpenLogoutConfirmModal;

function initHeader() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    const isHomePage = window.location.pathname === '/' || 
                      window.location.pathname.endsWith('index.html') ||
                      window.location.pathname.endsWith('/');

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

    function renderHeader() {
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
        const ic = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
        const ownerLinksHtml = isOwner
            ? `
                                <a href="owner-dashboard.html" class="header-dropdown-link">
                                    ${ic('layout-dashboard', 18, 18)}
                                    Панель владельца
                                </a>
                                <a href="admin.html" class="header-dropdown-link">
                                    ${ic('shield-check', 18, 18)}
                                    Администрирование
                                </a>`
            : '';
        const authHtml = loggedIn
            ? `
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
                                <a href="profile.html" class="header-dropdown-link">
                                    ${ic('circle-user', 18, 18)}
                                    Личный кабинет
                                </a>
                                <a href="my-bookings.html" class="header-dropdown-link">
                                    ${ic('calendar-days', 18, 18)}
                                    Мои бронирования
                                </a>
                                <a href="favorites.html" class="header-dropdown-link">
                                    ${ic('heart', 18, 18)}
                                    Избранное
                                </a>
                                ${ownerLinksHtml}
                                <div class="header-dropdown-divider"></div>
                                <button type="button" class="header-dropdown-logout" id="header-logout-btn">
                                    ${ic('log-out', 18, 18)}
                                    Выйти
                                </button>
                            </div>
                        </div>`
            : `
                        <div class="header-auth-buttons">
                            <a href="login.html" class="header-auth-link">Вход</a>
                            <a href="register.html" class="header-auth-link header-auth-link-primary">Регистрация</a>
                        </div>`;

        headerContainer.innerHTML = `
            <header class="header ${headerClass} ${isHomePage ? 'header--home' : ''}">
                <div class="header-content">
                    <div class="header-left">
                        <a href="index.html" class="header-logo">
                            <div class="header-logo-icon ${iconClass}">
                                <img src="images/logo.svg" alt="SILVA" style="width: 100%; height: 100%; object-fit: contain;">
                            </div>
                            <span class="header-logo-text ${textClass}">SILVA</span>
                        </a>
                    </div>

                    <nav class="header-nav" aria-label="Основная навигация">
                        <a href="index.html" class="header-nav-link">Главная</a>
                        <span class="header-nav-sep" aria-hidden="true"></span>
                        <a href="catalog.html" class="header-nav-link">Каталог</a>
                        <span class="header-nav-sep" aria-hidden="true"></span>
                        <a href="loyalty.html" class="header-nav-link">Виртуальный сад</a>
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
                        <a href="index.html" class="mobile-menu-link">Главная</a>
                        <span class="mobile-menu-nav-sep" aria-hidden="true"></span>
                        <a href="catalog.html" class="mobile-menu-link">Каталог</a>
                        <span class="mobile-menu-nav-sep" aria-hidden="true"></span>
                        <a href="loyalty.html" class="mobile-menu-link">Виртуальный сад</a>
                    </div>
                    <div class="mobile-menu-auth">${loggedIn
                        ? '<a href="profile.html" class="mobile-menu-link mobile-menu-link--profile" id="mobile-profile-link">Профиль</a>'
                        : '<a href="login.html" class="header-auth-link mobile-menu-auth-btn">Вход</a><a href="register.html" class="header-auth-link header-auth-link-primary mobile-menu-auth-btn">Регистрация</a>'
                    }</div>
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

        if (menuBtn && mobileMenu && menuIcon) {
            var paths = typeof SilvaIcons !== 'undefined' ? SilvaIcons.paths : null;
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('open');
                if (paths) {
                    menuIcon.innerHTML = mobileMenu.classList.contains('open') ? paths.x : paths.menu;
                }
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

