// Страница «Мои бронирования»: в основном Supabase; локальный кэш — silva_bookings
(function () {
    'use strict';
    function getCurrentUserEmail() {
        try {
            var u = JSON.parse(localStorage.getItem('silva_user') || '{}');
            return (u && u.email ? String(u.email) : '').trim().toLowerCase();
        } catch (e) {
            return '';
        }
    }

    function personalBookingsKey() {
        var email = getCurrentUserEmail();
        return email ? 'silva_bookings_' + email : 'silva_bookings';
    }

    function loyaltyPointsKey() {
        var email = getCurrentUserEmail();
        return email ? 'silva_loyalty_points_' + email : 'silva_loyalty_points';
    }

    function parseYMD(str) {
        if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
        var p = str.split('-').map(Number);
        return new Date(p[0], p[1] - 1, p[2]);
    }

    function formatRangeRu(checkInStr, checkOutStr) {
        var a = parseYMD(checkInStr);
        var b = parseYMD(checkOutStr);
        var months = [
            'янв',
            'фев',
            'мар',
            'апр',
            'мая',
            'июн',
            'июл',
            'авг',
            'сен',
            'окт',
            'ноя',
            'дек'
        ];
        if (!a || !b) return checkInStr + ' — ' + checkOutStr;
        return (
            a.getDate() +
            ' ' +
            months[a.getMonth()] +
            ' — ' +
            b.getDate() +
            ' ' +
            months[b.getMonth()] +
            ' ' +
            b.getFullYear()
        );
    }

    function guestsLine(b) {
        var s = b.adults + ' взр.';
        if (b.children > 0) s += ', ' + b.children + (b.children === 1 ? ' реб.' : ' дет.');
        return s;
    }

    function isPastStay(checkOutStr) {
        var d = parseYMD(checkOutStr);
        if (!d) return false;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
    }

    async function loadBookings() {
        if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.fetchMyBookings === 'function') {
            try {
                var rows = await window.silvaSupabaseAuth.fetchMyBookings();
                var propertyMap = {};
                var propertyIds = [];
                var propertyIdsSeen = {};
                (rows || []).forEach(function (r) {
                    var pid = String(r && r.property_id ? r.property_id : '').trim();
                    if (!pid || propertyIdsSeen[pid]) return;
                    propertyIdsSeen[pid] = true;
                    propertyIds.push(pid);
                });
                if (
                    propertyIds.length &&
                    window.silvaSupabaseAuth &&
                    typeof window.silvaSupabaseAuth.fetchPropertiesByIds === 'function'
                ) {
                    try {
                        var fetched = await window.silvaSupabaseAuth.fetchPropertiesByIds(propertyIds);
                        (fetched || []).forEach(function (p) {
                            var key = String(p && p.id ? p.id : '').trim();
                            if (key) propertyMap[key] = p;
                        });
                    } catch (eFetchProps) {}
                }
                return (rows || []).map(function (r) {
                    var pid = String(r && r.property_id ? r.property_id : '').trim();
                    var p = propertyMap[pid] || null;
                    return {
                        id: r.id,
                        propertyId: pid,
                        propertyTitle: p && p.title ? p.title : 'Объект',
                        propertyRegion: p && p.region ? p.region : '',
                        mainImage: p && p.main_image ? p.main_image : '',
                        checkIn: r.check_in,
                        checkOut: r.check_out,
                        nights: Math.max(1, Math.ceil((parseYMD(r.check_out) - parseYMD(r.check_in)) / (1000 * 60 * 60 * 24))),
                        adults: Math.max(1, (Number(r.guests) || 1) - (Number(r.children) || 0)),
                        children: Number(r.children) || 0,
                        totalRub: Number(r.total_price || r.total_amount) || 0,
                        payType: r.pay_type === '30' ? '30' : 'full',
                        status: r.status || 'pending'
                    };
                });
            } catch (e) {}
        }
        return [];
    }

    function saveBookings(list) {
        localStorage.setItem(personalBookingsKey(), JSON.stringify(list));
    }

    var pendingCancelId = null;

    function openCancelModal(bookingId) {
        pendingCancelId = bookingId;
        var overlay = document.getElementById('booking-cancel-modal');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeCancelModal() {
        pendingCancelId = null;
        var overlay = document.getElementById('booking-cancel-modal');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    function revokeLoyaltyForBooking(booking) {
        if (!booking) return;
        var revoke;
        if (booking.loyaltyPointsAwarded != null && booking.loyaltyPointsAwarded !== '') {
            revoke = parseInt(booking.loyaltyPointsAwarded, 10) || 0;
        } else {
            var paid = Number(booking.totalRub) || 0;
            revoke = Math.floor(paid / 100);
        }
        if (revoke <= 0) return;
        var key = loyaltyPointsKey();
        var cur = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        localStorage.setItem(key, String(Math.max(0, cur - revoke)));
    }

    async function confirmCancelDelete() {
        if (pendingCancelId == null || pendingCancelId === '') return;
        var id = pendingCancelId;
        var all = await loadBookings();
        var removed = null;
        for (var i = 0; i < all.length; i++) {
            if (String(all[i].id) === String(id)) {
                removed = all[i];
                break;
            }
        }
        closeCancelModal();
        var usedRemoteCancel = false;
        try {
            if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.cancelBooking === 'function') {
                usedRemoteCancel = true;
                await window.silvaSupabaseAuth.cancelBooking(id);
            } else {
                var next = all.filter(function (x) { return String(x.id) !== String(id); });
                saveBookings(next);
            }
        } catch (e) {}
        if (!usedRemoteCancel) {
            revokeLoyaltyForBooking(removed);
        }
        render();
    }

    async function render() {
        var listEl = document.getElementById('bookings-list');
        var emptyEl = document.getElementById('bookings-empty');
        if (!listEl || !emptyEl) return;

        var ic =
            typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };

        var bookings = await loadBookings();

        if (bookings.length === 0) {
            listEl.innerHTML = '';
            listEl.style.display = 'none';
            emptyEl.style.display = 'block';
            return;
        }

        emptyEl.style.display = 'none';
        listEl.style.display = 'flex';

        listEl.innerHTML = bookings
            .map(function (b) {
                var st = b.status === 'confirmed' || b.status === 'cancelled' || b.status === 'pending' ? b.status : 'pending';
                var completed = st === 'confirmed' && isPastStay(b.checkOut);
                var statusClass = 'booking-status--pending';
                var statusText = 'В процессе';
                if (st === 'cancelled') {
                    statusClass = 'booking-status--cancelled';
                    statusText = 'Отменено';
                } else if (st === 'confirmed') {
                    statusClass = completed ? 'booking-status--completed' : 'booking-status--confirmed';
                    statusText = completed ? 'Завершено' : 'Подтверждено';
                }
                var img =
                    b.mainImage ?
                        '<img src="' +
                        String(b.mainImage).replace(/"/g, '') +
                        '" alt="">' :
                        '<div style="display:flex;align-items:center;justify-content:center;height:100%;">' +
                        ic('image', 40, 40, { strokeWidth: 1.5, extraAttrs: ' style="color:var(--color-gray-400)"' }) +
                        '</div>';
                var propertyHref = b.propertyId ? 'property.html?id=' + encodeURIComponent(b.propertyId) : 'catalog.html';
                var propertyLabel = b.propertyTitle || 'Объект';

                return (
                    '<article class="booking-card" data-booking-id="' +
                    String(b.id).replace(/"/g, '') +
                    '">' +
                    '<div class="booking-card-image">' +
                    img +
                    '</div>' +
                    '<div class="booking-card-body">' +
                    '<h3><a href="' +
                    propertyHref +
                    '">' +
                    escapeHtml(propertyLabel) +
                    '</a></h3>' +
                    '<div class="booking-card-meta">' +
                    '<span>' +
                    ic('map-pin', 16, 16) +
                    escapeHtml(b.propertyRegion || '') +
                    '</span>' +
                    '<span>' +
                    ic('calendar', 16, 16) +
                    escapeHtml(formatRangeRu(b.checkIn, b.checkOut)) +
                    ' · ' +
                    (b.nights || '?') +
                    ' ноч.' +
                    '</span>' +
                    '<span>' +
                    ic('users', 16, 16) +
                    escapeHtml(guestsLine(b)) +
                    '</span>' +
                    '</div>' +
                    '<div class="booking-actions">' +
                    '<a href="' +
                    propertyHref +
                    '" class="btn booking-card-property-btn">Объект</a>' +
                    '<button type="button" class="booking-cancel-btn" data-id="' +
                    String(b.id).replace(/"/g, '') +
                    '">Отменить бронирование</button>' +
                    '</div></div>' +
                    '<div class="booking-card-side">' +
                    '<span class="booking-status ' +
                    statusClass +
                    '">' +
                    statusText +
                    '</span>' +
                    '<div class="booking-total">' +
                    formatNumber(b.totalRub || 0) +
                    ' ₽</div>' +
                    '<div class="account-muted" style="margin-top:0.25rem;font-size:0.8125rem;">' +
                    (b.payType === '30' ? 'Предоплата 30%' : 'Полная оплата') +
                    '</div></div></article>'
                );
            })
            .join('');

        listEl.querySelectorAll('.booking-cancel-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                if (id) openCancelModal(id);
            });
        });
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }

        var params = new URLSearchParams(window.location.search);
        if (params.get('success') === '1') {
            var banner = document.getElementById('booking-success-banner');
            if (banner) banner.style.display = 'flex';
            window.history.replaceState({}, '', 'my-bookings.html');
        }

        var cancelOverlay = document.getElementById('booking-cancel-modal');
        var btnDismiss = document.getElementById('booking-cancel-modal-dismiss');
        var btnX = document.getElementById('booking-cancel-modal-x');
        var btnConfirm = document.getElementById('booking-cancel-modal-confirm');

        if (cancelOverlay) {
            cancelOverlay.addEventListener('click', function (e) {
                if (e.target === cancelOverlay) closeCancelModal();
            });
        }
        if (btnDismiss) btnDismiss.addEventListener('click', closeCancelModal);
        if (btnX) btnX.addEventListener('click', closeCancelModal);
        if (btnConfirm) btnConfirm.addEventListener('click', confirmCancelDelete);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            var o = document.getElementById('booking-cancel-modal');
            if (o && o.classList.contains('is-open')) closeCancelModal();
        });

        render();
    });
})();
