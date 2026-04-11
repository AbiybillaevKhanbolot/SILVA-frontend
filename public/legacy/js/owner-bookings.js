document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    if (typeof requireOwnerOrRedirect !== 'function' || !requireOwnerOrRedirect()) return;
    if (typeof initOwnerSubnav === 'function') initOwnerSubnav();

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** YYYY-MM-DD → DD.MM.YY */
    function formatDateShort(ymd) {
        if (!ymd || typeof ymd !== 'string') return '—';
        var m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return escapeHtml(ymd);
        return m[3] + '.' + m[2] + '.' + m[1].slice(-2);
    }

    function normalizeStatus(b) {
        var s = b.status;
        if (s === 'confirmed' || s === 'cancelled' || s === 'pending' || s === 'completed') return s;
        return 'pending';
    }

    function loadAllBookingsLocal() {
        try {
            var raw = localStorage.getItem('silva_bookings');
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function saveBookingsLocal(list) {
        localStorage.setItem('silva_bookings', JSON.stringify(list));
    }

    function renderTable(wrap, empty, mine) {
        if (!mine.length) {
            wrap.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        wrap.style.display = 'block';

        var head =
            '<div class="owner-guest-booking-card owner-guest-booking-card--head" role="row">' +
            '<span class="owner-guest-booking-cell">Объект</span>' +
            '<span class="owner-guest-booking-cell">Гость</span>' +
            '<span class="owner-guest-booking-cell">Почта</span>' +
            '<span class="owner-guest-booking-cell">Телефон</span>' +
            '<span class="owner-guest-booking-cell">Даты</span>' +
            '<span class="owner-guest-booking-cell">Ночей</span>' +
            '<span class="owner-guest-booking-cell">Сумма</span>' +
            '<span class="owner-guest-booking-cell">Статус</span>' +
            '</div>';

        var rows = mine
            .map(function (b) {
                var st = normalizeStatus(b);
                var dates = formatDateShort(b.checkIn) + ' — ' + formatDateShort(b.checkOut);
                var nights = b.nights != null ? b.nights + ' ноч.' : '—';
                var sum =
                    b.totalRub != null ? Number(b.totalRub).toLocaleString('ru-RU') + ' ₽' : '—';
                var phone = (b.guestPhone && String(b.guestPhone).trim()) ? escapeHtml(String(b.guestPhone).trim()) : '—';
                var email = (b.guestEmail && String(b.guestEmail).trim()) ? escapeHtml(String(b.guestEmail).trim()) : '—';
                var bid = String(b.id).replace(/"/g, '') || '';

                return (
                    '<div class="owner-guest-booking-card" role="row" data-booking-id="' +
                    bid +
                    '">' +
                    '<span class="owner-guest-booking-cell">' +
                    escapeHtml(b.propertyTitle || '—') +
                    '</span>' +
                    '<span class="owner-guest-booking-cell owner-guest-booking-cell--strong">' +
                    escapeHtml(b.guestName || '—') +
                    '</span>' +
                    '<span class="owner-guest-booking-cell owner-guest-booking-cell--muted">' +
                    email +
                    '</span>' +
                    '<span class="owner-guest-booking-cell owner-guest-booking-cell--muted">' +
                    phone +
                    '</span>' +
                    '<span class="owner-guest-booking-cell">' +
                    dates +
                    '</span>' +
                    '<span class="owner-guest-booking-cell">' +
                    nights +
                    '</span>' +
                    '<span class="owner-guest-booking-cell owner-guest-booking-cell--sum">' +
                    sum +
                    '</span>' +
                    '<span class="owner-guest-booking-cell owner-guest-booking-cell--status">' +
                    '<select id="owner-st-' +
                    bid +
                    '" class="input owner-booking-status-select" data-booking-id="' +
                    bid +
                    '" aria-label="Статус брони">' +
                    '<option value="pending"' +
                    (st === 'pending' ? ' selected' : '') +
                    '>В процессе</option>' +
                    '<option value="confirmed"' +
                    (st === 'confirmed' ? ' selected' : '') +
                    '>Подтверждено</option>' +
                    '<option value="completed"' +
                    (st === 'completed' ? ' selected' : '') +
                    '>Завершено</option>' +
                    '<option value="cancelled"' +
                    (st === 'cancelled' ? ' selected' : '') +
                    '>Отменено</option>' +
                    '</select>' +
                    '</span>' +
                    '</div>'
                );
            })
            .join('');

        wrap.innerHTML = '<div class="owner-guest-bookings">' + head + rows + '</div>';
    }

    var wrap = document.getElementById('owner-bookings-table-wrap');
    var empty = document.getElementById('owner-bookings-empty');
    if (!wrap) return;

    var listings = typeof getMyOwnerListings === 'function' ? getMyOwnerListings() : [];
    var myIds = {};
    listings.forEach(function (p) {
        myIds[Number(p.id)] = true;
    });
    var propertyIdList = listings.map(function (p) { return p.id; }).filter(function (id) { return id != null && id !== ''; });

    async function load() {
        var mine = [];

        if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.fetchBookingsForOwner === 'function') {
            try {
                if (typeof mockAPI !== 'undefined' && typeof mockAPI.refreshPropertiesFromSupabase === 'function') {
                    await mockAPI.refreshPropertiesFromSupabase();
                }
                mine = await window.silvaSupabaseAuth.fetchBookingsForOwner(propertyIdList);
                mine.forEach(function (b) {
                    var prop =
                        typeof mockAPI !== 'undefined' ? mockAPI.getPropertyById(b.propertyId) : null;
                    b.propertyTitle =
                        prop && prop.title ? String(prop.title) : 'Объект #' + String(b.propertyId);
                });
            } catch (e) {
                console.warn('owner-bookings Supabase:', e);
                mine = [];
            }
        }

        if (!mine.length) {
            var all = loadAllBookingsLocal();
            mine = all.filter(function (b) {
                return myIds[Number(b.propertyId)];
            });
        }

        renderTable(wrap, empty, mine);

        wrap.addEventListener('change', async function (e) {
            var t = e.target;
            if (!t || !t.classList || !t.classList.contains('owner-booking-status-select')) return;
            var id = t.getAttribute('data-booking-id');
            if (id == null || id === '') return;
            var val = t.value;
            if (val !== 'pending' && val !== 'confirmed' && val !== 'completed' && val !== 'cancelled') return;

            if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.updateBookingStatus === 'function') {
                try {
                    await window.silvaSupabaseAuth.updateBookingStatus(id, val);
                } catch (err) {
                    alert(err && err.message ? err.message : 'Не удалось сохранить статус');
                    window.location.reload();
                }
                return;
            }

            var list = loadAllBookingsLocal();
            var found = false;
            for (var i = 0; i < list.length; i++) {
                if (String(list[i].id) === String(id)) {
                    list[i].status = val;
                    found = true;
                    break;
                }
            }
            if (found) saveBookingsLocal(list);
        });
    }

    load();
});
