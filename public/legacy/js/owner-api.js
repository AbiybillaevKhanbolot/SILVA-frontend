/**
 * Общие функции кабинета владельца (роль owner в silva_user)
 */
(function (global) {
    'use strict';

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem('silva_user') || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveUser(u) {
        localStorage.setItem('silva_user', JSON.stringify(u || {}));
    }

    function normalizeOwnerVerificationStatus(raw) {
        if (raw === 'verified' || raw === 'rejected') return raw;
        return 'pending';
    }

    function ensureOwnerVerificationStatus(u) {
        if (!u || u.role !== 'owner') return u;
        var normalized = normalizeOwnerVerificationStatus(u.ownerVerificationStatus);
        if (u.ownerVerificationStatus === normalized) return u;
        var next = Object.assign({}, u, { ownerVerificationStatus: normalized });
        saveUser(next);
        return next;
    }

    global.requireOwnerOrRedirect = function () {
        if (!localStorage.getItem('silva_user')) {
            window.location.href = 'login.html';
            return false;
        }
        var u = ensureOwnerVerificationStatus(getUser());
        if (u.role !== 'owner') {
            window.location.href = 'profile.html';
            return false;
        }
        return true;
    };

    global.getOwnerUserEmail = function () {
        return ensureOwnerVerificationStatus(getUser()).email || '';
    };

    global.getOwnerVerificationStatus = function () {
        var u = ensureOwnerVerificationStatus(getUser());
        if (!u || u.role !== 'owner') return null;
        return normalizeOwnerVerificationStatus(u.ownerVerificationStatus);
    };

    global.isOwnerVerified = function () {
        return global.getOwnerVerificationStatus() === 'verified';
    };

    global.applyOwnerVerificationGate = function () {
        if (global.isOwnerVerified()) return;
        var status = global.getOwnerVerificationStatus();
        var message =
            status === 'rejected'
                ? 'Ваш аккаунт владельца отклонен. Добавление объектов временно недоступно.'
                : 'Аккаунт владельца еще не подтвержден. Добавлять объекты можно только после подтверждения.';
        document.querySelectorAll('.owner-add-property-btn').forEach(function (el) {
            if (el.tagName === 'A') {
                el.setAttribute('href', '#');
            }
            el.setAttribute('aria-disabled', 'true');
            el.classList.add('is-disabled');
            el.title = message;
            el.addEventListener('click', function (e) {
                e.preventDefault();
                alert(message);
            });
        });
    };

    global.getMyOwnerListings = function () {
        var email = getOwnerUserEmail();
        if (!email || typeof mockAPI === 'undefined') return [];
        return mockAPI.getOwnerListingsFromStorage().filter(function (p) {
            return p.ownerEmail === email;
        });
    };

    global.initOwnerSubnav = function () {
        var page = document.body.getAttribute('data-owner-page');
        if (!page) return;
        document.querySelectorAll('.owner-subnav-link[data-key]').forEach(function (el) {
            if (el.getAttribute('data-key') === page) {
                el.classList.add('owner-subnav-link--active');
                el.setAttribute('aria-current', 'page');
            }
        });
    };

    /** Обновляет счётчики stat-* на страницах панели владельца после изменения объявлений. */
    global.refreshOwnerDashboardStats = function () {
        if (typeof getMyOwnerListings !== 'function' || typeof mockAPI === 'undefined') return;
        var listings = getMyOwnerListings();
        var published = listings.filter(function (p) {
            return p.status === 'published';
        });
        var myIds = listings.map(function (p) {
            return Number(p.id);
        });
        var bookingsCount = 0;
        try {
            var raw = localStorage.getItem('silva_bookings');
            var bl = raw ? JSON.parse(raw) : [];
            if (Array.isArray(bl)) {
                bl.forEach(function (b) {
                    var pid = Number(b.propertyId);
                    if (myIds.indexOf(pid) !== -1) bookingsCount++;
                });
            }
        } catch (e) {}
        var reviewsCount = 0;
        myIds.forEach(function (id) {
            reviewsCount += mockAPI.getReviewsForProperty(id).length;
        });
        var el = function (id) {
            return document.getElementById(id);
        };
        if (el('stat-listings')) el('stat-listings').textContent = String(listings.length);
        if (el('stat-published')) el('stat-published').textContent = String(published.length);
        if (el('stat-bookings')) el('stat-bookings').textContent = String(bookingsCount);
        if (el('stat-reviews')) el('stat-reviews').textContent = String(reviewsCount);
    };
})(typeof window !== 'undefined' ? window : this);
