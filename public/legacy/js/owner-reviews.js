document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    if (typeof requireOwnerOrRedirect !== 'function' || !requireOwnerOrRedirect()) return;
    if (typeof initOwnerSubnav === 'function') initOwnerSubnav();
    if (typeof mockAPI === 'undefined') return;

    var container = document.getElementById('owner-reviews-content');
    var empty = document.getElementById('owner-reviews-empty');
    var modal = document.getElementById('owner-review-reply-modal');
    var modalText = document.getElementById('owner-review-reply-text');
    var modalSave = document.getElementById('owner-review-reply-save');
    var modalCancel = document.getElementById('owner-review-reply-cancel');
    var modalClose = document.getElementById('owner-review-reply-close');
    var pendingPid = null;
    var pendingRid = null;

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Имя для отображения: не показываем почту; для старых записей с email — только локальная часть как псевдо-имя */
    function guestDisplayName(r) {
        var a = (r.author || '').trim();
        if (!a) return 'Гость';
        if (a.indexOf('@') !== -1) {
            var local = a.split('@')[0];
            var pretty = local
                .replace(/[._-]+/g, ' ')
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map(function (w) {
                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                })
                .join(' ');
            return pretty || 'Гость';
        }
        return a;
    }

    function initialsFromName(name) {
        var n = (name || '').trim();
        if (!n) return '?';
        var parts = n.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        }
        return n.slice(0, 2).toUpperCase();
    }

    function openModal(propertyId, reviewId, existingText) {
        pendingPid = propertyId;
        pendingRid = reviewId;
        if (modalText) modalText.value = existingText || '';
        if (modal) {
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
        }
        document.body.style.overflow = 'hidden';
        if (modalText) {
            modalText.focus();
        }
    }

    function closeModal() {
        pendingPid = null;
        pendingRid = null;
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
        document.body.style.overflow = '';
    }

    function render() {
        var listings = typeof getMyOwnerListings === 'function' ? getMyOwnerListings() : [];
        var htmlParts = [];
        var total = 0;

        listings.forEach(function (prop) {
            var pid = Number(prop.id);
            var reviews = mockAPI.getReviewsForProperty(pid);
            if (!reviews.length) return;
            total += reviews.length;

            var block =
                '<section class="owner-review-block">' +
                '<h3>' +
                escapeHtml(prop.title || 'Объект №' + pid) +
                ' · ' +
                reviews.length +
                ' ' +
                (reviews.length === 1 ? 'отзыв' : reviews.length < 5 ? 'отзыва' : 'отзывов') +
                '</h3>';

            reviews.forEach(function (r) {
                var rid = r.id != null ? String(r.id) : '';
                var displayName = guestDisplayName(r);
                var score = r.rating != null ? String(r.rating).replace('.', ',') : '—';
                var metaLine =
                    score +
                    (r.stayDate ? ' · ' + escapeHtml(r.stayDate) : '') +
                    (r.ratingLabel ? ' · ' + escapeHtml(r.ratingLabel) : '');
                var avatarUrl = r.avatar && String(r.avatar).trim() ? String(r.avatar).trim() : '';
                var avatarHtml = avatarUrl
                    ? '<img class="owner-review-avatar-img" src="' +
                      escapeHtml(avatarUrl) +
                      '" alt="" width="44" height="44" loading="lazy">'
                    : '<span class="owner-review-avatar-placeholder" aria-hidden="true">' +
                      escapeHtml(initialsFromName(displayName)) +
                      '</span>';
                var reply = r.hotelResponse
                    ? '<p class="owner-review-hotel-reply"><span class="owner-review-hotel-reply-label">Ваш ответ:</span> ' +
                      escapeHtml(r.hotelResponse) +
                      '</p>'
                    : '';

                block +=
                    '<div class="owner-review-item" data-property-id="' +
                    pid +
                    '" data-review-id="' +
                    escapeHtml(rid) +
                    '">' +
                    '<div class="owner-review-avatar">' +
                    avatarHtml +
                    '</div>' +
                    '<div class="owner-review-item-body">' +
                    '<div class="owner-review-item-top">' +
                    '<div class="owner-review-guest">' +
                    '<strong class="owner-review-guest-name">' +
                    escapeHtml(displayName) +
                    '</strong>' +
                    '<div class="owner-review-guest-meta">' +
                    metaLine +
                    '</div>' +
                    '</div>' +
                    '<div class="owner-review-item-actions">' +
                    '<a class="property-card-more" href="property.html?id=' +
                    encodeURIComponent(pid) +
                    '">Страница объекта</a>' +
                    '<button type="button" class="property-card-more owner-review-reply-btn" data-property-id="' +
                    pid +
                    '" data-review-id="' +
                    escapeHtml(rid) +
                    '">Ответить</button>' +
                    '</div>' +
                    '</div>' +
                    '<p class="review-snippet">' +
                    escapeHtml(r.text || '') +
                    '</p>' +
                    reply +
                    '</div>' +
                    '</div>';
            });

            block += '</section>';
            htmlParts.push(block);
        });

        if (!total) {
            if (container) container.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        if (container) container.innerHTML = htmlParts.join('');
    }

    render();

    if (container) {
        container.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest && e.target.closest('.owner-review-reply-btn');
            if (!btn) return;
            var pid = btn.getAttribute('data-property-id');
            var rid = btn.getAttribute('data-review-id');
            if (pid == null || rid == null) return;
            var item = btn.closest('.owner-review-item');
            var existing = '';
            if (item) {
                var p = item.querySelector('.owner-review-hotel-reply');
                if (p) {
                    var raw = p.textContent || '';
                    var label = 'Ваш ответ:';
                    if (raw.indexOf(label) === 0) {
                        existing = raw.slice(label.length).trim();
                    } else {
                        existing = raw.trim();
                    }
                }
            }
            openModal(pid, rid, existing);
        });
    }

    function saveReply() {
        if (pendingPid == null || pendingRid == null) return;
        var text = modalText ? modalText.value.trim() : '';
        mockAPI.updateReviewHotelResponse(pendingPid, pendingRid, text);
        closeModal();
        render();
    }

    if (modalSave) modalSave.addEventListener('click', saveReply);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
    }
});
