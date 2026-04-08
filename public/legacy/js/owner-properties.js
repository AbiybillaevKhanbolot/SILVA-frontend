document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    if (typeof requireOwnerOrRedirect !== 'function' || !requireOwnerOrRedirect()) return;
    if (typeof initOwnerSubnav === 'function') initOwnerSubnav();
    if (typeof applyOwnerVerificationGate === 'function') applyOwnerVerificationGate();

    function updateOwnerStats() {
        var listings = typeof getMyOwnerListings === 'function' ? getMyOwnerListings() : [];
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
        if (typeof mockAPI !== 'undefined') {
            myIds.forEach(function (id) {
                reviewsCount += mockAPI.getReviewsForProperty(id).length;
            });
        }
        var el = function (id) {
            return document.getElementById(id);
        };
        if (el('stat-listings')) el('stat-listings').textContent = String(listings.length);
        if (el('stat-published')) el('stat-published').textContent = String(published.length);
        if (el('stat-bookings')) el('stat-bookings').textContent = String(bookingsCount);
        if (el('stat-reviews')) el('stat-reviews').textContent = String(reviewsCount);
    }

    updateOwnerStats();

    var modal = document.getElementById('owner-delete-property-modal');
    var pendingDeleteId = null;

    function openDeleteModal(propertyId) {
        pendingDeleteId = propertyId;
        if (!modal) return;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeDeleteModal() {
        pendingDeleteId = null;
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }

    if (modal) {
        var bx = document.getElementById('owner-delete-property-modal-x');
        var bc = document.getElementById('owner-delete-property-modal-cancel');
        var bok = document.getElementById('owner-delete-property-modal-confirm');
        if (bx) bx.addEventListener('click', closeDeleteModal);
        if (bc) bc.addEventListener('click', closeDeleteModal);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeDeleteModal();
        });
        if (bok) {
            bok.addEventListener('click', function () {
                var id = pendingDeleteId;
                closeDeleteModal();
                if (id == null || typeof mockAPI === 'undefined') return;
                var all = mockAPI.getOwnerListingsFromStorage();
                var next = all.filter(function (x) {
                    return String(x.id) !== String(id);
                });
                mockAPI.saveOwnerListingsToStorage(next);
                render();
            });
        }
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (modal && modal.classList.contains('is-open')) closeDeleteModal();
        });
    }

    function render() {
        var list = typeof getMyOwnerListings === 'function' ? getMyOwnerListings() : [];
        var container = document.getElementById('owner-properties-list');
        var empty = document.getElementById('owner-properties-empty');
        if (!container) return;

        if (!list.length) {
            container.innerHTML = '';
            if (empty) empty.style.display = 'block';
            updateOwnerStats();
            return;
        }
        if (empty) empty.style.display = 'none';

        if (typeof createOwnerPropertyCard !== 'function') {
            container.innerHTML = '<p class="text-center" style="grid-column:1/-1;color:var(--color-gray-600);">Не удалось загрузить карточки.</p>';
            return;
        }

        container.innerHTML = list.map(createOwnerPropertyCard).join('');

        container.querySelectorAll('.property-card-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var id = btn.getAttribute('data-property-id');
                if (!id) return;
                openDeleteModal(id);
            });
        });

        updateOwnerStats();
    }

    render();
});
