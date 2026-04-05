/**
 * Боковая навигация личного кабинета (как в выпадающем меню шапки).
 * active: 'profile' | 'bookings' | 'favorites' | 'loyalty'
 */
(function (global) {
    'use strict';

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function renderAccountNav(active) {
        var c = document.getElementById('account-nav');
        if (!c) return;

        var ic =
            typeof global.SilvaIcons !== 'undefined'
                ? global.SilvaIcons.svg.bind(global.SilvaIcons)
                : function () {
                      return '';
                  };

        var user = {};
        try {
            user = JSON.parse(global.localStorage.getItem('silva_user') || '{}');
        } catch (e) {}

        var items = [
            { href: 'profile.html', key: 'profile', label: 'Личный кабинет', icon: 'circle-user' },
            { href: 'my-bookings.html', key: 'bookings', label: 'Мои бронирования', icon: 'calendar-days' },
            { href: 'favorites.html', key: 'favorites', label: 'Избранное', icon: 'heart' },
            { href: 'loyalty.html', key: 'loyalty', label: 'Виртуальный сад', icon: 'sprout' }
        ];

        var html =
            '<div class="account-nav-card">' +
            '<div class="account-nav-user">' +
            '<div class="account-nav-name">' +
            escapeHtml(user.name || 'Гость') +
            '</div>' +
            '<div class="account-nav-email">' +
            escapeHtml(user.email || '') +
            '</div></div>' +
            '<div class="account-nav-divider"></div>' +
            '<nav class="account-nav-list" aria-label="Разделы личного кабинета">';

        items.forEach(function (it) {
            var cl = 'account-nav-link' + (active === it.key ? ' account-nav-link--active' : '');
            html +=
                '<a href="' +
                it.href +
                '" class="' +
                cl +
                '">' +
                ic(it.icon, 18, 18) +
                '<span>' +
                escapeHtml(it.label) +
                '</span></a>';
        });

        html +=
            '</nav>' +
            '<div class="account-nav-divider"></div>' +
            '<button type="button" class="account-nav-logout" id="account-sidebar-logout">' +
            ic('log-out', 18, 18) +
            '<span>Выйти</span></button></div>';

        c.innerHTML = html;

        var lo = document.getElementById('account-sidebar-logout');
        if (lo) {
            lo.addEventListener('click', function () {
                global.localStorage.removeItem('silva_user');
                global.location.href = 'index.html';
            });
        }
    }

    global.renderAccountNav = renderAccountNav;
})(typeof window !== 'undefined' ? window : this);
