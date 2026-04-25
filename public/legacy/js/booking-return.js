/**
 * Возврат с оплаты ЮKassa: проверка платежа и создание брони в Supabase.
 * Dev: прокси /api/yookassa/*. Прод: window.SILVA_PAYMENT_URLS.status (см. docs/supabase-yookassa-setup.md).
 */
document.addEventListener('DOMContentLoaded', async function () {
    var msgEl = document.getElementById('booking-return-msg');
    var titleEl = document.querySelector('.booking-return-card h1');
    var actionsEl = document.getElementById('booking-return-actions');

    function storageGetItem(key) {
        try {
            var v = window.top.sessionStorage.getItem(key);
            if (v != null) return v;
        } catch (e) {}
        return sessionStorage.getItem(key);
    }

    function storageRemovePending() {
        try {
            window.top.sessionStorage.removeItem('silva_yookassa_payment_id');
            window.top.sessionStorage.removeItem('silva_pending_booking');
        } catch (e) {}
        try {
            sessionStorage.removeItem('silva_yookassa_payment_id');
            sessionStorage.removeItem('silva_pending_booking');
        } catch (e2) {}
    }

    function silvaYookassaPaymentStatusUrl(paymentId) {
        var urls = window.SILVA_PAYMENT_URLS;
        try {
            if (window.parent && window.parent !== window && window.parent.SILVA_PAYMENT_URLS) {
                urls = window.parent.SILVA_PAYMENT_URLS;
            }
        } catch (e) {}
        var prefix = (urls && urls.status) || '/api/yookassa/payment?id=';
        return prefix + encodeURIComponent(paymentId);
    }

    function setError(title, text, actionsHtml) {
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = text;
        if (actionsEl) {
            actionsEl.style.display = 'flex';
            actionsEl.innerHTML = actionsHtml || '<a href="catalog.html" class="btn btn-primary">В каталог</a>';
        }
    }

    function loyaltyPointsKeyForCurrentUser() {
        try {
            var u = JSON.parse(localStorage.getItem('silva_user') || '{}');
            var email = (u && u.email ? String(u.email) : '').trim().toLowerCase();
            return email ? 'silva_loyalty_points_' + email : 'silva_loyalty_points';
        } catch (e) {
            return 'silva_loyalty_points';
        }
    }

    var paymentId = storageGetItem('silva_yookassa_payment_id');
    var pendingRaw = storageGetItem('silva_pending_booking');

    if (!paymentId || !pendingRaw) {
        setError(
            'Сессия оплаты не найдена',
            'Откройте страницу бронирования заново и повторите оплату. Если деньги списались, обратитесь в поддержку с номером платежа из письма ЮKassa.',
            '<a href="catalog.html" class="btn btn-primary">В каталог</a>'
        );
        return;
    }

    var pending;
    try {
        pending = JSON.parse(pendingRaw);
    } catch (e) {
        setError('Ошибка данных', 'Не удалось восстановить параметры бронирования.', '');
        return;
    }

    try {
        var payRes = await fetch(silvaYookassaPaymentStatusUrl(paymentId), {
            credentials: 'same-origin',
        });
        var pay = await payRes.json();
        if (!payRes.ok) {
            throw new Error((pay && pay.message) || (pay && pay.error) || 'Не удалось проверить платёж');
        }

        var expectedRub = Number(pending.totalRub);
        var paidRub = pay.amount && pay.amount.value != null ? parseFloat(String(pay.amount.value), 10) : NaN;
        if (!isFinite(expectedRub) || !isFinite(paidRub) || Math.abs(expectedRub - paidRub) > 0.02) {
            setError(
                'Сумма не совпадает',
                'Платёж не сопоставлен с бронированием. Обратитесь в поддержку.',
                '<a href="catalog.html" class="btn btn-primary">В каталог</a>'
            );
            return;
        }

        var ok = pay.paid === true && pay.status === 'succeeded';
        if (!ok) {
            if (titleEl) titleEl.textContent = 'Оплата не завершена';
            if (msgEl) {
                msgEl.textContent =
                    pay.status === 'canceled'
                        ? 'Платёж отменён. Вы можете оформить бронирование снова.'
                        : 'Статус платежа: ' +
                          (pay.status || 'неизвестно') +
                          '. Если вы только что оплатили, подождите минуту и обновите страницу.';
            }
            if (actionsEl) {
                actionsEl.style.display = 'flex';
                var q =
                    'booking.html?property=' +
                    encodeURIComponent(pending.propertyId || '') +
                    '&from=' +
                    encodeURIComponent(pending.checkIn || '') +
                    '&to=' +
                    encodeURIComponent(pending.checkOut || '') +
                    '&guests=' +
                    encodeURIComponent(String(pending.guests || '')) +
                    '&adults=' +
                    encodeURIComponent(String(pending.adults || '')) +
                    '&children=' +
                    encodeURIComponent(String(pending.children || ''));
                actionsEl.innerHTML =
                    '<a href="' +
                    q +
                    '" class="btn btn-primary">К бронированию</a>' +
                    '<button type="button" class="btn btn-ghost" id="booking-return-recheck">Проверить снова</button>';
                var recheck = document.getElementById('booking-return-recheck');
                if (recheck) {
                    recheck.addEventListener('click', function () {
                        window.location.reload();
                    });
                }
            }
            return;
        }

        if (typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
            setError(
                'Нужен вход',
                'Платёж прошёл, но сессия истекла. Войдите в аккаунт — бронь можно будет добавить из «Мои бронирования» или повторите оформление.',
                '<a href="login.html" class="btn btn-primary">Войти</a><a href="my-bookings.html" class="btn btn-ghost">Мои бронирования</a>'
            );
            return;
        }

        if (!window.silvaSupabaseAuth || typeof window.silvaSupabaseAuth.createBooking !== 'function') {
            throw new Error('Supabase недоступен');
        }

        var newBookingId = await window.silvaSupabaseAuth.createBooking({
            propertyId: pending.propertyId,
            checkIn: pending.checkIn,
            checkOut: pending.checkOut,
            guests: Number(pending.guests) || 1,
            children: Number(pending.children) || 0,
            totalRub: expectedRub,
            payType: pending.payType,
            guestName: pending.guestName || '',
            guestEmail: pending.guestEmail || ''
        });

        var lpAward = Math.floor(Number(pending.loyaltyPointsToAward) || 0);
        if (lpAward > 0) {
            if (window.silvaSupabaseAuth.incrementLoyaltyPointsAfterPayment) {
                try {
                    await window.silvaSupabaseAuth.incrementLoyaltyPointsAfterPayment(
                        lpAward,
                        'Оплата бронирования',
                        newBookingId
                    );
                } catch (loyErr) {
                    console.warn('Loyalty increment:', loyErr);
                }
            }
            var lpKey = loyaltyPointsKeyForCurrentUser();
            var cur = parseInt(localStorage.getItem(lpKey) || '0', 10) || 0;
            localStorage.setItem(lpKey, String(cur + lpAward));
        }

        storageRemovePending();

        try {
            window.top.location.replace('my-bookings.html?success=1');
        } catch (e) {
            window.location.replace('my-bookings.html?success=1');
        }
    } catch (e) {
        var m = e && e.message ? String(e.message) : 'Ошибка';
        if (/BOOKING_DATES_OVERLAP|23514|занят/i.test(m)) {
            m =
                'Эти даты уже заняты другим гостём. Деньги за оплату обычно возвращаются автоматически по правилам ЮKassa; при необходимости обратитесь в поддержку с номером платежа.';
        }
        setError(
            'Не удалось завершить бронирование',
            m,
            '<a href="my-bookings.html" class="btn btn-ghost">Мои бронирования</a><a href="catalog.html" class="btn btn-primary">В каталог</a>'
        );
    }
});
