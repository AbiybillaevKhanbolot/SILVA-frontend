// Booking page logic
document.addEventListener('DOMContentLoaded', async function() {
    function getCurrentUserEmail() {
        try {
            var u = JSON.parse(localStorage.getItem('silva_user') || '{}');
            return (u && u.email ? String(u.email) : '').trim().toLowerCase();
        } catch (e) {
            return '';
        }
    }

    function bookingsKeyForCurrentUser() {
        var email = getCurrentUserEmail();
        return email ? 'silva_bookings_' + email : 'silva_bookings';
    }

    function loyaltyPointsKeyForCurrentUser() {
        var email = getCurrentUserEmail();
        return email ? 'silva_loyalty_points_' + email : 'silva_loyalty_points';
    }

    /** Страница брони в iframe (React): ЮKassa запрещает свою страницу во фрейме — пишем в top и редиректим top. */
    function topSessionStorage() {
        try {
            return window.top.sessionStorage;
        } catch (e) {
            return sessionStorage;
        }
    }

    function redirectTop(url) {
        try {
            window.top.location.href = url;
        } catch (e) {
            window.location.href = url;
        }
    }

    /** На проде: window.SILVA_PAYMENT_URLS на родителе (iframe) или на window (см. docs/supabase-yookassa-setup.md). */
    function getPaymentUrls() {
        try {
            if (window.parent && window.parent !== window && window.parent.SILVA_PAYMENT_URLS) {
                return window.parent.SILVA_PAYMENT_URLS;
            }
        } catch (e) {}
        return window.SILVA_PAYMENT_URLS || null;
    }

    function silvaYookassaCreatePaymentUrl() {
        var u = getPaymentUrls();
        return (u && u.create) || '/api/yookassa/create-payment';
    }

    const propertyId = getUrlParameter('property');
    const fromDateStr = getUrlParameter('from');
    const toDateStr = getUrlParameter('to');
    const guestsParam = getUrlParameter('guests');
    const adultsParam = getUrlParameter('adults');
    const childrenParam = getUrlParameter('children');
    
    if (!propertyId) {
        window.location.href = 'catalog.html';
        return;
    }
    
    let property = mockAPI.getPropertyById(propertyId);
    if (!property && typeof mockAPI !== 'undefined' && typeof mockAPI.refreshPropertiesFromSupabase === 'function') {
        try {
            await mockAPI.refreshPropertiesFromSupabase();
            property = mockAPI.getPropertyById(propertyId);
        } catch (e) {}
    }
    if (!property) {
        window.location.href = 'catalog.html';
        return;
    }
    
    // Парсинг дат как локальных (YYYY-MM-DD), чтобы ночи считались верно
    const parseBookingDate = (str) => {
        if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    };
    
    const checkIn = parseBookingDate(fromDateStr) || new Date();
    let checkOut = parseBookingDate(toDateStr);
    if (!checkOut || checkOut <= checkIn) {
        checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 1);
    }
    
    const adults = Math.max(1, parseInt(adultsParam, 10) || 2);
    const children = Math.max(0, parseInt(childrenParam, 10) || 0);
    const guests = parseInt(guestsParam, 10) || (adults + children);
    
    // Ночи: разница дат в днях (не меньше 1)
    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    
    const formatDate = (date) => {
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                       'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    };
    
    // Расчёт цен — так же, как на странице объекта (property.js)
    const pricePerNight = property.price_per_night || 0;
    const adultsPrice = nights * pricePerNight * adults;
    const childrenPrice = children > 0 ? Math.round(nights * pricePerNight * 0.5 * children) : 0;
    const subtotal = adultsPrice + childrenPrice;
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;
    const total30 = Math.round(total * 0.3);
    const loyaltyPoints = Math.floor(total / 100);
    
    // Set property info
    const propertyImage = document.getElementById('property-image');
    const propertyTitle = document.getElementById('property-title');
    const propertyRegion = document.getElementById('property-region');
    
    if (propertyImage) {
        var icB = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
        var imageUrl = property.main_image || (Array.isArray(property.gallery_images) && property.gallery_images[0]) || '';
        propertyImage.innerHTML = `
            ${imageUrl
                ? `<img src="${String(imageUrl).replace(/"/g, '')}" alt="${String(property.title || 'Объект').replace(/"/g, '&quot;')}">`
                : `<div class="booking-property-image-placeholder" style="position: absolute; inset: 0; background: var(--color-gray-100); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;">
                    ${icB('image', 56, 56, { strokeWidth: 1.5, extraAttrs: ' style="color: var(--color-gray-400)"' })}
                    <span style="font-size: 0.75rem; color: var(--color-gray-400);">Здесь будет изображение</span>
                </div>`
            }
            ${property.eco_certified ? `
                <span class="badge badge-emerald" style="position: absolute; top: 1rem; left: 1rem; z-index: 2;">
                    ${icB('leaf', 12, 12, { extraAttrs: ' style="margin-right: 0.25rem"' })}
                    Эко
                </span>
            ` : ''}
        `;
    }
    
    if (propertyTitle) propertyTitle.textContent = property.title;
    if (propertyRegion) propertyRegion.textContent = property.region;
    
    // Детали бронирования
    const bookingDates = document.getElementById('booking-dates');
    const bookingNights = document.getElementById('booking-nights');
    const bookingGuests = document.getElementById('booking-guests');
    
    if (bookingDates) {
        bookingDates.textContent = `${formatDate(checkIn)} — ${formatDate(checkOut)} ${checkOut.getFullYear()}`;
    }
    if (bookingNights) {
        bookingNights.textContent = `${nights} ночей`;
    }
    if (bookingGuests) {
        let guestsText = adults + ' взр.';
        if (children > 0) guestsText += ', ' + children + (children === 1 ? ' реб.' : ' дет.');
        bookingGuests.textContent = guestsText;
    }
    
    // Итог в сайдбаре: разбивка как на странице объекта
    const breakdownEl = document.getElementById('booking-summary-breakdown');
    if (breakdownEl) {
        let html = `
            <div class="summary-row">
                <span>Взрослые (${adults} × ${nights} ночей)</span>
                <span>${formatNumber(adultsPrice)} ₽</span>
            </div>`;
        if (children > 0) {
            html += `
            <div class="summary-row">
                <span>Дети (${children} × ${nights} ночей)</span>
                <span>${formatNumber(childrenPrice)} ₽</span>
            </div>`;
        }
        breakdownEl.innerHTML = html;
    }
    
    const serviceFeeEl = document.getElementById('service-fee');
    const totalEl = document.getElementById('total');
    const totalPriceEl = document.getElementById('total-price');
    const totalFullEl = document.getElementById('total-full');
    const total30El = document.getElementById('total-30');
    const payFullSumEl = document.getElementById('pay-full-sum');
    const pay30SumEl = document.getElementById('pay-30-sum');
    const loyaltyPointsEl = document.getElementById('loyalty-points');
    
    if (serviceFeeEl) serviceFeeEl.textContent = `${formatNumber(serviceFee)} ₽`;
    if (totalEl) totalEl.textContent = `${formatNumber(total)} ₽`;
    if (totalPriceEl) totalPriceEl.textContent = formatNumber(total);
    if (totalFullEl) totalFullEl.textContent = formatNumber(total);
    if (total30El) total30El.textContent = formatNumber(total30);
    if (payFullSumEl) payFullSumEl.textContent = formatNumber(total);
    if (pay30SumEl) pay30SumEl.textContent = formatNumber(total30);
    if (loyaltyPointsEl) loyaltyPointsEl.textContent = loyaltyPoints;
    
    let payAmount = 'full';
    
    window.updatePayAmount = function(amount) {
        payAmount = amount;
        if (totalPriceEl) {
            totalPriceEl.textContent = formatNumber(amount === '30' ? total30 : total);
        }
    };
    
    window.selectPaymentMethod = function() {
        /* Оставлено для совместимости; способ оплаты — только карта (ЮKassa). */
    };
    
    window.processBooking = async function() {
        const name = document.getElementById('guest-name')?.value?.trim();
        const email = document.getElementById('guest-email')?.value?.trim();
        const rulesConsent = document.getElementById('rules-consent')?.checked;
        
        if (!name || !email) {
            alert('Пожалуйста, заполните имя и email');
            return;
        }
        if (!rulesConsent) {
            alert('Необходимо подтвердить ознакомление с правилами бронирования');
            return;
        }

        if (typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
            if (typeof window.showAuthRequiredModal === 'function') {
                window.showAuthRequiredModal(
                    'Чтобы оплатить и подтвердить бронирование, войдите в существующий аккаунт или зарегистрируйтесь. ' +
                        'Так мы сохраним вашу бронь и сможем отправить детали на email.'
                );
            }
            return;
        }

        if (
            window.silvaSupabaseAuth &&
            typeof window.silvaSupabaseAuth.fetchPropertyBookedDateRanges === 'function' &&
            typeof window.silvaSupabaseAuth.isStayAvailableInRanges === 'function' &&
            typeof window.silvaSupabaseAuth.toBookingDateKeyLocal === 'function'
        ) {
            try {
                var br = await window.silvaSupabaseAuth.fetchPropertyBookedDateRanges(propertyId);
                var ciK = window.silvaSupabaseAuth.toBookingDateKeyLocal(checkIn);
                var coK = window.silvaSupabaseAuth.toBookingDateKeyLocal(checkOut);
                if (ciK && coK && !window.silvaSupabaseAuth.isStayAvailableInRanges(ciK, coK, br)) {
                    alert('Эти даты уже заняты. Вернитесь на страницу объекта и выберите другой период.');
                    return;
                }
            } catch (availErr) {
                console.warn('availability check', availErr);
            }
        }
        
        const amountToPay = payAmount === '30' ? total30 : total;
        const loyaltyPointsToAward = Math.floor(amountToPay / 100);

        const btn = document.getElementById('booking-submit-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Обработка...';
        }

        try {
            const checkInStr = fromDateStr || formatDateYMD(checkIn);
            const checkOutStr = toDateStr || formatDateYMD(checkOut);
            const pendingBooking = {
                propertyId: String(propertyId),
                checkIn: checkInStr,
                checkOut: checkOutStr,
                guests: adults + children,
                adults: adults,
                children: children,
                totalRub: amountToPay,
                payType: payAmount,
                loyaltyPointsToAward: loyaltyPointsToAward
            };

            const payResp = await fetch(silvaYookassaCreatePaymentUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    amountRub: amountToPay,
                    description: ('Бронь: ' + (property.title || 'объект')).slice(0, 128),
                    metadata: {
                        propertyId: String(propertyId),
                        checkIn: checkInStr,
                        checkOut: checkOutStr,
                        guests: String(adults + children),
                        children: String(children),
                        totalRub: String(amountToPay),
                        payType: String(payAmount)
                    }
                })
            });

            let payJson = {};
            try {
                payJson = await payResp.json();
            } catch (parseErr) {
                payJson = {};
            }

            if (payResp.ok && payJson.confirmationUrl && payJson.paymentId) {
                var st = topSessionStorage();
                st.setItem('silva_pending_booking', JSON.stringify(pendingBooking));
                st.setItem('silva_yookassa_payment_id', payJson.paymentId);
                redirectTop(payJson.confirmationUrl);
                return;
            }

            if (payResp.status === 503 && payJson.error === 'yookassa_env_missing') {
                throw new Error(
                    payJson.message ||
                        'ЮKassa не настроена: в корне проекта создайте .env с YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY (см. .env.example) и запустите npm run dev.'
                );
            }

            const ykMsg =
                payJson.detail && payJson.detail.description
                    ? payJson.detail.description
                    : payJson.detail && payJson.detail.type
                      ? payJson.detail.type
                      : payJson.message || payJson.error || 'Не удалось создать платёж';
            throw new Error(typeof ykMsg === 'string' ? ykMsg : 'Не удалось создать платёж');
        } catch (e) {
            alert(e && e.message ? e.message : 'Не удалось перейти к оплате.');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Оплатить и забронировать';
            }
        }
    };

    function formatDateYMD(d) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }
});

