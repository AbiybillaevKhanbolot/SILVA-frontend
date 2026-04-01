// Header Component
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
        const navClass = '';
        const userClass = '';
        const menuClass = '';

        const isOwner = user.role === 'owner';
        const ownerLinksHtml = isOwner
            ? `
                                <a href="owner-dashboard.html" class="header-dropdown-link">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                    Панель владельца
                                </a>
                                <a href="admin.html" class="header-dropdown-link">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                    Администрирование
                                </a>`
            : '';
        const authHtml = loggedIn
            ? `
                        <div class="header-user-menu" id="header-user-menu">
                            <button type="button" class="header-user-btn ${userClass}" id="header-profile-btn" aria-haspopup="true" aria-expanded="false">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <span class="header-user-name">Профиль</span>
                            </button>
                            <div class="header-profile-dropdown" id="header-profile-dropdown">
                                <div class="header-dropdown-header">
                                    <div class="header-dropdown-name">${userName}</div>
                                    <div class="header-dropdown-email">${userEmail}</div>
                                </div>
                                <div class="header-dropdown-divider"></div>
                                <a href="profile.html" class="header-dropdown-link">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                    Личный кабинет
                                </a>
                                <a href="my-bookings.html" class="header-dropdown-link">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    Мои бронирования
                                </a>
                                <a href="favorites.html" class="header-dropdown-link">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    Избранное
                                </a>
                                <a href="loyalty.html" class="header-dropdown-link">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                    Виртуальный сад
                                </a>
                                ${ownerLinksHtml}
                                <div class="header-dropdown-divider"></div>
                                <button type="button" class="header-dropdown-logout" id="header-logout-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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
                                <img src="images2/logo.svg" alt="SILVA" style="width: 100%; height: 100%; object-fit: contain;">
                            </div>
                            <span class="header-logo-text ${textClass}">SILVA</span>
                        </a>
                    </div>

                    <nav class="header-nav">
                        <a href="index.html" class="header-nav-link ${navClass}">Главная</a>
                        <a href="catalog.html" class="header-nav-link ${navClass}">Каталог</a>
                        <a href="loyalty.html" class="header-nav-link ${navClass}">Виртуальный сад</a>
                    </nav>

                    <div class="header-right">
                        ${authHtml}

                        <button class="header-menu-btn ${menuClass}" id="mobile-menu-btn" aria-label="Меню">
                            <svg id="menu-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div class="mobile-menu" id="mobile-menu">
                <div class="mobile-menu-content">
                    <a href="index.html" class="mobile-menu-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        Главная
                    </a>
                    <a href="catalog.html" class="mobile-menu-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                        Каталог
                    </a>
                    <a href="loyalty.html" class="mobile-menu-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        Виртуальный сад
                    </a>
                    <div class="mobile-menu-auth">${loggedIn
                        ? '<a href="profile.html" class="mobile-menu-link" id="mobile-profile-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Профиль</a>'
                        : '<a href="login.html" class="mobile-menu-link">Вход</a><a href="register.html" class="mobile-menu-link">Регистрация</a>'
                    }</div>
                </div>
            </div>
        `;

        // Mobile menu toggle
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const menuIcon = document.getElementById('menu-icon');

        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('open');
                if (mobileMenu.classList.contains('open')) {
                    menuIcon.innerHTML = `
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    `;
                } else {
                    menuIcon.innerHTML = `
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    `;
                }
            });
        }

        // Profile dropdown: show on hover and click
        const profileBtn = document.getElementById('header-profile-btn');
        const profileDropdown = document.getElementById('header-profile-dropdown');
        const userMenuWrap = document.getElementById('header-user-menu');
        const logoutBtn = document.getElementById('header-logout-btn');

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
                logoutBtn.addEventListener('click', function() {
                    localStorage.removeItem('silva_user');
                    window.location.href = 'index.html';
                });
            }
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

