// Property page logic
document.addEventListener('DOMContentLoaded', function() {
    function getFavoritesStorageKey() {
        try {
            var u = JSON.parse(localStorage.getItem('silva_user') || '{}');
            var email = (u && u.email ? String(u.email) : '').trim().toLowerCase();
            return email ? 'silva_favorites_' + email : 'silva_favorites';
        } catch (e) {
            return 'silva_favorites';
        }
    }
    const propertyId = getUrlParameter('id');
    if (!propertyId) {
        window.location.href = 'catalog.html';
        return;
    }
    
    const property = mockAPI.getPropertyById(propertyId);
    if (!property) {
        document.querySelector('.property-page').innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding-top: 5rem;">
                <div style="text-align: center;">
                    <h1 style="font-size: 1.5rem; font-weight: 600; color: var(--color-gray-900); margin-bottom: 1rem;">
                        Объект не найден
                    </h1>
                    <a href="catalog.html" class="btn btn-primary">Вернуться в каталог</a>
                </div>
            </div>
        `;
        return;
    }

    if (property.is_owner_listing && property.status === 'draft') {
        let u = {};
        try {
            u = JSON.parse(localStorage.getItem('silva_user') || '{}');
        } catch (e) {}
        if (u.role !== 'owner' || u.email !== property.ownerEmail) {
            window.location.href = 'catalog.html';
            return;
        }
    }
    
    // Галерея: главное фото + 4 миниатюры, ротация стрелками (см. property-gallery-widget.js)
    var galleryMainSlot = document.getElementById('gallery-main-slot');
    var galleryThumbsRoot = document.getElementById('property-gallery-thumbs');
    var galleryDots = document.getElementById('gallery-dots');
    var gallerySliderEl = document.getElementById('gallery-slider');
    if (galleryMainSlot && typeof silvaInitRotatingGallery === 'function') {
        var galleryUrls =
            typeof silvaGetGalleryUrlsFromProperty === 'function'
                ? silvaGetGalleryUrlsFromProperty(property)
                : [];
        var thumbEls = galleryThumbsRoot
            ? Array.prototype.slice.call(galleryThumbsRoot.querySelectorAll('.gallery-thumb-slot'))
            : [];
        var galleryApi = silvaInitRotatingGallery({
            mainEl: galleryMainSlot,
            thumbEls: thumbEls,
            prevBtn: document.getElementById('gallery-prev'),
            nextBtn: document.getElementById('gallery-next'),
            dotsEl: galleryDots,
            swipeEl: gallerySliderEl,
            urls: galleryUrls,
            alt: property.title || '',
            placeholderSlots: 5
        });
        document.addEventListener('keydown', function propertyGalleryKeydown(e) {
            if (e.key === 'ArrowLeft') galleryApi.prev();
            if (e.key === 'ArrowRight') galleryApi.next();
        });
    }
    
    // Render badges
    const propertyBadges = document.getElementById('property-badges');
    if (propertyBadges) {
        const propertyTypes = {
            cottage: "Коттедж",
            hotel: "Отель",
            guest_house: "Гостевой дом",
            glamping: "Глэмпинг",
            eco_house: "Эко-дом"
        };
        
        propertyBadges.innerHTML = `
            <span class="badge badge-emerald">${propertyTypes[property.property_type] || property.property_type}</span>
            ${property.eco_certified ? `
                <span class="badge badge-green">
                    ${typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg('leaf', 12, 12, { extraAttrs: ' style="margin-right: 0.25rem"' }) : ''}
                    Эко-сертификат
                </span>
            ` : ''}
        `;
    }
    
    // Render title and meta
    const propertyTitle = document.getElementById('property-title');
    if (propertyTitle) propertyTitle.textContent = property.title;
    
    const propertyMeta = document.getElementById('property-meta');
    if (propertyMeta) {
        var icMeta = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
        var addrStr = (property.address || '').trim();
        var escAddr = addrStr
            ? addrStr
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/"/g, '&quot;')
            : '';
        propertyMeta.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.25rem;">
                ${icMeta('map-pin', 20, 20, { extraAttrs: ' style="color: var(--color-emerald-500)"' })}
                <span>${property.region}</span>
            </div>
            ${
                escAddr
                    ? `<div style="display:flex;align-items:flex-start;gap:0.25rem;margin-top:0.35rem;max-width:100%;text-align:right;font-size:0.9375rem;font-weight:500;color:var(--color-gray-600);line-height:1.45;word-break:break-word;">${escAddr}</div>`
                    : ''
            }
            ${property.rating ? `
                <div style="display: flex; align-items: center; gap: 0.25rem;">
                    ${icMeta('star-filled', 20, 20, { extraAttrs: ' style="color: var(--color-amber-400)"' })}
                    <span style="font-weight: 500;">${property.rating}</span>
                    <span style="color: var(--color-gray-400);">(${property.reviews_count || 0} отзывов)</span>
                </div>
            ` : ''}
        `;
    }
    
    // Статистика в виде текста в описании
    const propertyStatsText = document.getElementById('property-stats-text');
    if (propertyStatsText) {
        propertyStatsText.textContent = [
            `Гостей: до ${property.max_guests}`,
            `Спален: ${property.bedrooms || 1}`,
            `Ванных: ${property.bathrooms || 1}`,
            `Площадь: ${property.area || 100} м²`
        ].join(' · ');
    }

    // Render description with expand/collapse
    const propertyDescription = document.getElementById('property-description');
    const descriptionWrap = document.getElementById('property-description-wrap');
    const descriptionToggle = document.getElementById('property-description-toggle');
    const fullDescription = property.description || 'Уютное место для отдыха на природе с комфортными условиями проживания.';
    if (propertyDescription) {
        // Небольшое форматирование: переносы строк после некоторых частей текста
        let formatted = fullDescription;
        formatted = formatted.replace('кровать, ', 'кровать,\n');
        // Добавим перенос строки после точки, если нужно более «рваное» описание
        formatted = formatted.replace(/\\.\\s+/g, '.\n');
        propertyDescription.textContent = formatted;
    }
    const charLimit = 200;
    if (descriptionWrap && descriptionToggle) {
        if (fullDescription.length > charLimit) {
            descriptionWrap.classList.add('collapsed');
            descriptionToggle.style.display = 'inline-flex';
            descriptionToggle.textContent = 'Развернуть описание';
            descriptionToggle.addEventListener('click', function() {
                const collapsed = descriptionWrap.classList.toggle('collapsed');
                descriptionToggle.textContent = collapsed ? 'Развернуть описание' : 'Свернуть описание';
            });
        } else {
            descriptionToggle.style.display = 'none';
        }
    }

    // Favorite button (для своего объекта владельца — ссылка «Редактировать»)
    const favoriteBtn = document.getElementById('property-favorite-btn');
    if (favoriteBtn) {
        let u = {};
        try {
            u = JSON.parse(localStorage.getItem('silva_user') || '{}');
        } catch (e) {}
        const isOwnerViewingOwn =
            property.is_owner_listing &&
            u.role === 'owner' &&
            u.email &&
            property.ownerEmail &&
            u.email === property.ownerEmail;

        if (isOwnerViewingOwn) {
            favoriteBtn.outerHTML =
                '<a href="owner-property-edit.html?id=' +
                encodeURIComponent(propertyId) +
                '" class="property-favorite-btn" id="property-favorite-btn">Редактировать</a>';
        } else {
            let favorites = [];
            try {
                favorites = JSON.parse(localStorage.getItem(getFavoritesStorageKey()) || '[]');
            } catch (e) {}
            const isFavorite = favorites.indexOf(propertyId) !== -1;
            if (isFavorite) favoriteBtn.classList.add('in-favorites');
            const svgEl = favoriteBtn.querySelector('svg');
            if (svgEl) svgEl.style.fill = isFavorite ? 'currentColor' : 'none';
            favoriteBtn.addEventListener('click', function() {
                favorites = JSON.parse(localStorage.getItem(getFavoritesStorageKey()) || '[]');
                const idx = favorites.indexOf(propertyId);
                if (idx === -1) favorites.push(propertyId);
                else favorites.splice(idx, 1);
                localStorage.setItem(getFavoritesStorageKey(), JSON.stringify(favorites));
                const nowFav = favorites.indexOf(propertyId) !== -1;
                favoriteBtn.classList.toggle('in-favorites', nowFav);
                const s = favoriteBtn.querySelector('svg');
                if (s) s.style.fill = nowFav ? 'currentColor' : 'none';
            });
        }
    }
    
    // Render amenities (extended)
    const amenitiesGrid = document.getElementById('amenities-grid');
    if (amenitiesGrid) {
        const amenities = property.amenities || ['wifi', 'parking', 'kitchen'];
        var p = typeof SilvaIcons !== 'undefined' ? SilvaIcons.paths : {};
        var icAmenity = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
        var amenityKey = { wifi: 'wifi', parking: 'car', kitchen: 'utensils-crossed', pool: 'waves', transfer: 'bus', children: 'baby', pets: 'paw-print', sauna: 'flame' };
        const amenityLabels = {
            wifi: 'Бесплатный интернет',
            parking: 'Парковка',
            kitchen: 'Кухня',
            pool: 'Бассейн',
            transfer: 'Трансфер',
            children: 'Подходит для детей',
            pets: 'Можно с питомцами',
            sauna: 'Сауна'
        };
        amenitiesGrid.innerHTML = amenities.map(function (amenity) {
            var n = amenityKey[amenity];
            var iconName = (n && p[n]) ? n : 'circle';
            return (
                '<div class="amenity-item">' +
                icAmenity(iconName, 24, 24, { className: 'amenity-icon' }) +
                '<span>' + (amenityLabels[amenity] || amenity) + '</span></div>'
            );
        }).join('');
    }

    // Map
    const propertyMap = document.getElementById('property-map');
    const mapWrap = document.getElementById('property-map-wrap');
    if (propertyMap && (property.map_lat != null && property.map_lng != null)) {
        const lat = property.map_lat;
        const lng = property.map_lng;
        propertyMap.src = 'https://yandex.ru/map-widget/v1/?ll=' + encodeURIComponent(lng) + '%2C' + encodeURIComponent(lat) + '&z=15&pt=' + encodeURIComponent(lng) + ',' + encodeURIComponent(lat);
        propertyMap.style.display = 'block';
    } else if (mapWrap) {
        mapWrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-gray-500);font-size:0.875rem;">Карта недоступна</div>';
    }

    // Conditions
    const conditionsEl = document.getElementById('property-conditions');
    if (conditionsEl && property.conditions && property.conditions.length) {
        conditionsEl.innerHTML = property.conditions.map(c => '<li>' + c + '</li>').join('');
    } else if (conditionsEl) {
        conditionsEl.innerHTML = '<li>Заезд с 14:00, выезд до 12:00.</li>';
    }

    // Extra info
    const extraInfoEl = document.getElementById('property-extra-info');
    if (extraInfoEl && property.extra_info && property.extra_info.length) {
        extraInfoEl.innerHTML = property.extra_info.map(i => '<li>' + i + '</li>').join('');
    } else if (extraInfoEl) {
        extraInfoEl.innerHTML = '<li>Дополнительная информация уточняется при бронировании.</li>';
    }

    // Visa info
    const visaInfoEl = document.getElementById('property-visa-info');
    if (visaInfoEl) {
        visaInfoEl.textContent = property.visa_info || 'Для граждан РФ виза не требуется. Иностранным гостям необходимо иметь действующую визу РФ.';
    }
    
    // Render booking card with interactive calendar and price calculation
    const bookingCard = document.getElementById('booking-card');
    if (bookingCard) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 3);
        dayAfter.setHours(0, 0, 0, 0);
        
        let checkinDate = new Date(tomorrow);
        let checkoutDate = new Date(dayAfter);
        let adultsCount = 2;
        let childrenCount = 0;
        
        const formatDate = (date) => {
            const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
            return `${date.getDate()} ${months[date.getMonth()]}`;
        };
        
        const formatDateForInput = (date) => {
            const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
            return `${date.getDate()} ${months[date.getMonth()]}`;
        };
        
        const getMonthName = (date) => {
            const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
            return `${months[date.getMonth()]} ${date.getFullYear()}`;
        };
        
        const calculatePrice = () => {
            const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
            // Цена за взрослых (цена за ночь × количество взрослых × количество ночей)
            const adultsPrice = nights * (property.price_per_night || 0) * adultsCount;
            // Доплата за детей (50% от цены за ночь за ребенка)
            const childrenPrice = childrenCount > 0 ? Math.round(nights * (property.price_per_night || 0) * 0.5 * childrenCount) : 0;
            const subtotal = adultsPrice + childrenPrice;
            const serviceFee = Math.round(subtotal * 0.1);
            const total = subtotal + serviceFee;
            
            const priceBreakdown = document.querySelector('.price-breakdown');
            const bookingBtn = document.getElementById('booking-btn');
            
            if (priceBreakdown) {
                let breakdownHTML = `
                    <div class="price-row">
                        <span>Взрослые (${adultsCount} × ${nights} ночей)</span>
                        <span>${formatNumber(adultsPrice)} ₽</span>
                    </div>
                `;
                
                if (childrenCount > 0) {
                    breakdownHTML += `
                        <div class="price-row">
                            <span>Дети (${childrenCount} × ${nights} ночей)</span>
                            <span>${formatNumber(childrenPrice)} ₽</span>
                        </div>
                    `;
                }
                
                breakdownHTML += `
                    <div class="price-row">
                        <span>Сервисный сбор</span>
                        <span>${formatNumber(serviceFee)} ₽</span>
                    </div>
                    <div class="price-row price-row-total">
                        <span>Итого</span>
                        <span>${formatNumber(total)} ₽</span>
                    </div>
                `;
                
                priceBreakdown.innerHTML = breakdownHTML;
            }
            
            if (bookingBtn) {
                const totalGuests = adultsCount + childrenCount;
                const toLocalDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                bookingBtn.href = `booking.html?property=${propertyId}&from=${toLocalDateStr(checkinDate)}&to=${toLocalDateStr(checkoutDate)}&guests=${totalGuests}&adults=${adultsCount}&children=${childrenCount}`;
            }
        };
        
        const renderCalendar = (containerId, monthYearId, daysId, currentDate, selectedDate, minDate, isCheckout = false) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const monthYearEl = container.querySelector(`#${monthYearId}`);
            const daysEl = container.querySelector(`#${daysId}`);
            
            if (!monthYearEl || !daysEl) return;
            
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            monthYearEl.textContent = getMonthName(currentDate);
            
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
            
            daysEl.innerHTML = '';
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = startingDayOfWeek - 1; i >= 0; i--) {
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day other-month';
                dayEl.textContent = '';
                daysEl.appendChild(dayEl);
            }
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                date.setHours(0, 0, 0, 0);
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day';
                dayEl.textContent = day;
                dayEl.dataset.date = date.toISOString();
                
                if (date.getTime() === today.getTime()) {
                    dayEl.classList.add('today');
                }
                
                // Show range for checkout calendar
                if (isCheckout && checkinDate && checkoutDate) {
                    if (date > checkinDate && date < checkoutDate) {
                        dayEl.classList.add('in-range');
                    }
                    if (date.getTime() === checkinDate.getTime()) {
                        dayEl.classList.add('range-start');
                    }
                    if (date.getTime() === checkoutDate.getTime()) {
                        dayEl.classList.add('range-end');
                    }
                } else if (selectedDate && date.getTime() === selectedDate.getTime()) {
                    dayEl.classList.add('selected');
                }
                
                if (minDate && date < minDate) {
                    dayEl.classList.add('disabled');
                }
                
                daysEl.appendChild(dayEl);
            }
            
            const totalCells = startingDayOfWeek + daysInMonth;
            const remainingCells = 42 - totalCells;
            for (let day = 1; day <= remainingCells && day <= 14; day++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day other-month';
                dayEl.textContent = '';
                daysEl.appendChild(dayEl);
            }
        };
        
        const icBook = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
        bookingCard.innerHTML = `
            <div class="booking-card-content">
                <div class="booking-left">
            <div class="booking-price">
                <span class="booking-price-amount">${formatNumber(property.price_per_night || 0)}</span>
                <span class="booking-price-unit">₽ / ночь</span>
            </div>
            
            <div class="booking-dates">
                        <div class="booking-date-input" id="checkin-wrapper">
                    <div class="booking-date-label">Заезд</div>
                            <div class="booking-date-value" id="checkin-display">${formatDate(checkinDate)}</div>
                            <div class="booking-date-dropdown" id="checkin-calendar">
                                <div class="calendar-header">
                                    <button type="button" class="calendar-nav-btn" id="checkin-prev-month">‹</button>
                                    <div class="calendar-month-year" id="checkin-month-year"></div>
                                    <button type="button" class="calendar-nav-btn" id="checkin-next-month">›</button>
                                </div>
                                <div class="calendar-weekdays">
                                    <div>Пн</div>
                                    <div>Вт</div>
                                    <div>Ср</div>
                                    <div>Чт</div>
                                    <div>Пт</div>
                                    <div>Сб</div>
                                    <div>Вс</div>
                                </div>
                                <div class="calendar-days" id="checkin-calendar-days"></div>
                            </div>
                </div>
                        <div class="booking-date-input" id="checkout-wrapper">
                    <div class="booking-date-label">Выезд</div>
                            <div class="booking-date-value" id="checkout-display">${formatDate(checkoutDate)}</div>
                            <div class="booking-date-dropdown" id="checkout-calendar">
                                <div class="calendar-header">
                                    <button type="button" class="calendar-nav-btn" id="checkout-prev-month">‹</button>
                                    <div class="calendar-month-year" id="checkout-month-year"></div>
                                    <button type="button" class="calendar-nav-btn" id="checkout-next-month">›</button>
                                </div>
                                <div class="calendar-weekdays">
                                    <div>Пн</div>
                                    <div>Вт</div>
                                    <div>Ср</div>
                                    <div>Чт</div>
                                    <div>Пт</div>
                                    <div>Сб</div>
                                    <div>Вс</div>
                                </div>
                                <div class="calendar-days" id="checkout-calendar-days"></div>
                            </div>
                </div>
            </div>
            
            <div class="booking-guests">
                        <div class="booking-guests-item">
                            <div class="booking-guests-info">
                                <div class="booking-date-label">Взрослые</div>
                                <div class="booking-date-value" id="adults-display" style="font-size: 1rem;">${adultsCount} ${adultsCount === 1 ? 'Взрослый' : adultsCount < 5 ? 'Взрослых' : 'Взрослых'}</div>
                </div>
                <div class="booking-guests-controls">
                                <button class="booking-guests-btn" id="adults-decrease">-</button>
                                <span id="adults-count" style="width: 2.5rem; text-align: center; font-weight: 500; font-size: 1rem;">${adultsCount}</span>
                                <button class="booking-guests-btn" id="adults-increase">+</button>
                </div>
            </div>
                        <div class="booking-guests-item">
                            <div class="booking-guests-info">
                                <div class="booking-date-label">Дети</div>
                                <div class="booking-date-value" id="children-display" style="font-size: 1rem;">${childrenCount} ${childrenCount === 1 ? 'Ребенок' : childrenCount < 5 ? 'Детей' : 'Детей'}</div>
                            </div>
                            <div class="booking-guests-controls">
                                <button class="booking-guests-btn" id="children-decrease">-</button>
                                <span id="children-count" style="width: 2.5rem; text-align: center; font-weight: 500; font-size: 1rem;">${childrenCount}</span>
                                <button class="booking-guests-btn" id="children-increase">+</button>
                            </div>
                </div>
                </div>
                </div>
                
                <div class="booking-right">
                    <div class="price-breakdown">
                        <!-- Will be calculated dynamically -->
            </div>
            
                    <a href="#" id="booking-btn" class="btn btn-primary" style="width: 100%; height: 3.5rem; font-size: 1.125rem; border-radius: 5px;">
                Забронировать
                ${icBook('arrow-right', 20, 20, { extraAttrs: ' style="margin-left: 0.5rem"' })}
            </a>
            
                    <p style="text-align: center; font-size: 0.875rem; color: var(--color-gray-500); margin-top: 0;">
                Бесплатная отмена в течение 48 часов
            </p>
                </div>
            </div>
        `;
        
        // Перехват «Забронировать» для гостей — показать модалку авторизации
        const bookingCardEl = document.getElementById('booking-card');
        if (bookingCardEl) {
            bookingCardEl.addEventListener('click', function(e) {
                var btn = e.target.closest('#booking-btn');
                if (btn && typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
                    e.preventDefault();
                    if (typeof window.showAuthRequiredModal === 'function') window.showAuthRequiredModal();
                }
            });
        }
        
        // Initialize price calculation
        calculatePrice();
        
        // Calendar state
        let checkinCurrentMonth = new Date(checkinDate);
        let checkoutCurrentMonth = new Date(checkoutDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Render initial calendars
        renderCalendar('checkin-calendar', 'checkin-month-year', 'checkin-calendar-days', checkinCurrentMonth, checkinDate, today, false);
        const minCheckoutDate = new Date(checkinDate);
        minCheckoutDate.setDate(minCheckoutDate.getDate() + 1);
        renderCalendar('checkout-calendar', 'checkout-month-year', 'checkout-calendar-days', checkoutCurrentMonth, checkoutDate, minCheckoutDate, true);
        
        // Check-in calendar handlers
        const checkinWrapper = document.getElementById('checkin-wrapper');
        const checkinCalendar = document.getElementById('checkin-calendar');
        const checkinDisplay = document.getElementById('checkin-display');
        
        if (checkinWrapper && checkinCalendar) {
            checkinWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = checkinCalendar.classList.contains('active');
                // Close both calendars first
                checkinCalendar.classList.remove('active');
                if (checkoutCalendar) checkoutCalendar.classList.remove('active');
                // Open checkin calendar if it wasn't active
                if (!isActive) {
                    setTimeout(() => {
                        checkinCalendar.classList.add('active');
                    }, 10);
                }
            });
            
            document.getElementById('checkin-prev-month').addEventListener('click', (e) => {
                e.stopPropagation();
                checkinCurrentMonth.setMonth(checkinCurrentMonth.getMonth() - 1);
                renderCalendar('checkin-calendar', 'checkin-month-year', 'checkin-calendar-days', checkinCurrentMonth, checkinDate, today, false);
            });
            
            document.getElementById('checkin-next-month').addEventListener('click', (e) => {
                e.stopPropagation();
                checkinCurrentMonth.setMonth(checkinCurrentMonth.getMonth() + 1);
                renderCalendar('checkin-calendar', 'checkin-month-year', 'checkin-calendar-days', checkinCurrentMonth, checkinDate, today, false);
            });
            
            document.getElementById('checkin-calendar-days').addEventListener('click', (e) => {
                if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('disabled') && !e.target.classList.contains('other-month') && e.target.dataset.date) {
                    const date = new Date(e.target.dataset.date);
                    checkinDate = date;
                    checkinDisplay.textContent = formatDateForInput(date);
                    checkinCalendar.classList.remove('active');
                    
                    // Update checkout minimum date
                    if (checkoutDate <= checkinDate) {
                        checkoutDate = new Date(checkinDate);
                        checkoutDate.setDate(checkoutDate.getDate() + 1);
                        document.getElementById('checkout-display').textContent = formatDateForInput(checkoutDate);
                    }
                    
                    const newMinCheckout = new Date(checkinDate);
                    newMinCheckout.setDate(newMinCheckout.getDate() + 1);
                    renderCalendar('checkout-calendar', 'checkout-month-year', 'checkout-calendar-days', checkoutCurrentMonth, checkoutDate, newMinCheckout, true);
                    calculatePrice();
                }
            });
        }
        
        // Check-out calendar handlers
        const checkoutWrapper = document.getElementById('checkout-wrapper');
        const checkoutCalendar = document.getElementById('checkout-calendar');
        const checkoutDisplay = document.getElementById('checkout-display');
        
        if (checkoutWrapper && checkoutCalendar) {
            checkoutWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = checkoutCalendar.classList.contains('active');
                // Close both calendars first
                if (checkinCalendar) checkinCalendar.classList.remove('active');
                checkoutCalendar.classList.remove('active');
                // Open checkout calendar if it wasn't active
                if (!isActive) {
                    setTimeout(() => {
                        checkoutCalendar.classList.add('active');
                    }, 10);
                }
            });
            
            document.getElementById('checkout-prev-month').addEventListener('click', (e) => {
                e.stopPropagation();
                checkoutCurrentMonth.setMonth(checkoutCurrentMonth.getMonth() - 1);
                const minCheckout = new Date(checkinDate);
                minCheckout.setDate(minCheckout.getDate() + 1);
                renderCalendar('checkout-calendar', 'checkout-month-year', 'checkout-calendar-days', checkoutCurrentMonth, checkoutDate, minCheckout, true);
            });
            
            document.getElementById('checkout-next-month').addEventListener('click', (e) => {
                e.stopPropagation();
                checkoutCurrentMonth.setMonth(checkoutCurrentMonth.getMonth() + 1);
                const minCheckout = new Date(checkinDate);
                minCheckout.setDate(minCheckout.getDate() + 1);
                renderCalendar('checkout-calendar', 'checkout-month-year', 'checkout-calendar-days', checkoutCurrentMonth, checkoutDate, minCheckout, true);
            });
            
            document.getElementById('checkout-calendar-days').addEventListener('click', (e) => {
                if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('disabled') && !e.target.classList.contains('other-month') && e.target.dataset.date) {
                    const date = new Date(e.target.dataset.date);
                    const minCheckout = new Date(checkinDate);
                    minCheckout.setDate(minCheckout.getDate() + 1);
                    if (date >= minCheckout) {
                        checkoutDate = date;
                        checkoutDisplay.textContent = formatDateForInput(date);
                        checkoutCalendar.classList.remove('active');
                        // Re-render calendar to show updated range
                        renderCalendar('checkout-calendar', 'checkout-month-year', 'checkout-calendar-days', checkoutCurrentMonth, checkoutDate, minCheckout, true);
                        calculatePrice();
                    }
                }
            });
        }
        
        // Close calendars when clicking outside
        document.addEventListener('click', (e) => {
            if (checkinCalendar && !checkinWrapper.contains(e.target) && !checkinCalendar.contains(e.target)) {
                checkinCalendar.classList.remove('active');
            }
            if (checkoutCalendar && !checkoutWrapper.contains(e.target) && !checkoutCalendar.contains(e.target)) {
                checkoutCalendar.classList.remove('active');
            }
        });
        
        // Adults controls
        const adultsDecrease = document.getElementById('adults-decrease');
        const adultsIncrease = document.getElementById('adults-increase');
        const adultsCountEl = document.getElementById('adults-count');
        const adultsDisplayEl = document.getElementById('adults-display');
        
        const updateAdultsDisplay = () => {
            const text = adultsCount === 1 ? 'Взрослый' : adultsCount < 5 ? 'Взрослых' : 'Взрослых';
            adultsDisplayEl.textContent = `${adultsCount} ${text}`;
        };
        
        if (adultsDecrease) {
            adultsDecrease.addEventListener('click', () => {
                if (adultsCount > 1) {
                    adultsCount--;
                    adultsCountEl.textContent = adultsCount;
                    updateAdultsDisplay();
                    calculatePrice();
                }
            });
        }
        
        if (adultsIncrease) {
            adultsIncrease.addEventListener('click', () => {
                const maxTotal = property.max_guests || 10;
                if (adultsCount + childrenCount < maxTotal) {
                    adultsCount++;
                    adultsCountEl.textContent = adultsCount;
                    updateAdultsDisplay();
                    calculatePrice();
                }
            });
        }
        
        // Children controls
        const childrenDecrease = document.getElementById('children-decrease');
        const childrenIncrease = document.getElementById('children-increase');
        const childrenCountEl = document.getElementById('children-count');
        const childrenDisplayEl = document.getElementById('children-display');
        
        const updateChildrenDisplay = () => {
            const text = childrenCount === 1 ? 'Ребенок' : childrenCount < 5 ? 'Детей' : 'Детей';
            childrenDisplayEl.textContent = `${childrenCount} ${text}`;
        };
        
        if (childrenDecrease) {
            childrenDecrease.addEventListener('click', () => {
                if (childrenCount > 0) {
                    childrenCount--;
                    childrenCountEl.textContent = childrenCount;
                    updateChildrenDisplay();
                    calculatePrice();
                }
            });
        }
        
        if (childrenIncrease) {
            childrenIncrease.addEventListener('click', () => {
                const maxTotal = property.max_guests || 10;
                if (adultsCount + childrenCount < maxTotal) {
                    childrenCount++;
                    childrenCountEl.textContent = childrenCount;
                    updateChildrenDisplay();
                    calculatePrice();
                }
            });
        }
    }
    
    // Reviews: overview, categories, guest photos, sort, cards, leave-review (logged-in only), modal
    const reviewsList = document.getElementById('reviews-list');
    const reviewsCountEl = document.getElementById('reviews-count');
    const reviewsOverviewNum = document.getElementById('reviews-overview-num');
    const reviewsOverviewLabel = document.getElementById('reviews-overview-label');
    const reviewsOverviewText = document.getElementById('reviews-overview-text');
    const reviewsCategoriesEl = document.getElementById('reviews-categories');
    const reviewsGuestPhotos = document.getElementById('reviews-guest-photos');
    const reviewsPhotosRow = document.getElementById('reviews-photos-row');
    const reviewsPhotosCount = document.getElementById('reviews-photos-count');
    const reviewsSortSelect = document.getElementById('reviews-sort');
    const btnLeaveReview = document.getElementById('btn-leave-review');
    const reviewModal = document.getElementById('review-modal');
    const reviewModalClose = document.getElementById('review-modal-close');
    const reviewModalCancel = document.getElementById('review-modal-cancel');
    const reviewForm = document.getElementById('review-form');
    const reviewStars = document.getElementById('review-stars');
    const reviewText = document.getElementById('review-text');
    const reviewPhotosInput = document.getElementById('review-photos');
    const reviewPhotosPreview = document.getElementById('review-photos-preview');

    const ratingLabel = (n) => {
        if (n >= 9.5) return 'Превосходно';
        if (n >= 8.5) return 'Отлично';
        if (n >= 7.5) return 'Очень хорошо';
        if (n >= 6) return 'Хорошо';
        return 'Нормально';
    };

    const escapeHtml = (v) => String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const initialsFromName = (name) => {
        var n = String(name || '').trim();
        if (!n) return '?';
        var parts = n.split(/\s+/).filter(Boolean);
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return n.slice(0, 2).toUpperCase();
    };

    function renderReviews() {
        let reviews = mockAPI.getReviewsForProperty(propertyId);
        const sortVal = reviewsSortSelect ? reviewsSortSelect.value : 'useful';
        if (sortVal === 'new') reviews = [...reviews].sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        if (sortVal === 'rating-high') reviews = [...reviews].sort((a, b) => (b.rating || 0) - (a.rating || 0));

        const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0';
        if (reviewsOverviewNum) reviewsOverviewNum.textContent = avgRating.replace('.', ',');
        if (reviewsOverviewLabel) reviewsOverviewLabel.textContent = ratingLabel(parseFloat(avgRating));
        if (reviewsOverviewText) reviewsOverviewText.textContent = reviews.length ? 'Основано на ' + reviews.length + ' отзывах гостей.' : 'Основано на отзывах гостей.';
        if (reviewsCountEl) reviewsCountEl.textContent = reviews.length;

        const cats = mockAPI.getReviewCategoriesForProperty(propertyId);
        if (reviewsCategoriesEl && cats.labels) {
            reviewsCategoriesEl.innerHTML = Object.keys(cats.labels).map(k => {
                const v = cats.values[k];
                if (v == null) return '';
                const pct = Math.min(100, (parseFloat(v) / 10) * 100);
                return '<div class="reviews-category-row"><span class="reviews-category-label">' + cats.labels[k] + '</span><div class="reviews-category-bar"><div class="reviews-category-fill" style="width:' + pct + '%"></div></div><span class="reviews-category-value">' + v + '</span></div>';
            }).filter(Boolean).join('');
        }

        const allPhotos = [];
        reviews.forEach(r => { (r.photos || []).forEach(p => allPhotos.push(p)); });
        if (reviewsGuestPhotos && reviewsPhotosRow && reviewsPhotosCount) {
            if (allPhotos.length > 0) {
                reviewsGuestPhotos.style.display = 'block';
                reviewsPhotosCount.textContent = allPhotos.length;
                const first10 = allPhotos.slice(0, 10);
                const rest = allPhotos.length - 10;
                reviewsPhotosRow.innerHTML = first10.map((p) => {
                    const src = typeof p === 'string' ? p : (p.url || '');
                    return '<img class="reviews-photo-thumb" src="' + src + '" alt="Фото гостя">';
                }).join('') + (rest > 0 ? '<div class="reviews-photo-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--color-gray-200);color:var(--color-gray-600);font-weight:600;">+' + rest + '</div>' : '');
            } else {
                reviewsGuestPhotos.style.display = 'none';
            }
        }

        function getStoredHelpful(propId, reviewId) {
            try {
                const data = JSON.parse(localStorage.getItem('silva_helpful_' + propId) || '{}');
                const d = data[reviewId] || {};
                return { yes: d.yes || 0, no: d.no || 0 };
            } catch (e) { return { yes: 0, no: 0 }; }
        }
        if (reviewsList) {
            reviewsList.innerHTML = reviews.map(r => {
                const stored = getStoredHelpful(propertyId, r.id);
                const yes = (r.helpfulYes || 0) + (stored.yes || 0);
                const no = (r.helpfulNo || 0) + (stored.no || 0);
                const helpful = 'Отзыв был полезен? <span data-review-id="' + (r.id || '') + '" data-helpful="yes">Да (' + yes + ')</span> <span data-review-id="' + (r.id || '') + '" data-helpful="no">Нет (' + no + ')</span>';
                const guestAvatarUrl = r.avatar && String(r.avatar).trim() ? String(r.avatar).trim() : '';
                const guestAvatar = guestAvatarUrl
                    ? '<img class="review-card-avatar-img" src="' + escapeHtml(guestAvatarUrl) + '" alt="">'
                    : '<span class="review-card-avatar-placeholder" aria-hidden="true">' + escapeHtml(initialsFromName(r.author || 'Гость')) + '</span>';
                const ownerAvatarUrl = r.hotelResponseAvatar && String(r.hotelResponseAvatar).trim() ? String(r.hotelResponseAvatar).trim() : '';
                const ownerAvatar = ownerAvatarUrl
                    ? '<img class="review-card-avatar-img" src="' + escapeHtml(ownerAvatarUrl) + '" alt="">'
                    : '<span class="review-card-owner-avatar" aria-hidden="true">В</span>';
                const hotelResp = r.hotelResponse ? '<div class="review-card-hotel-response"><div class="review-card-hotel-response-head"><span class="review-card-owner-avatar-wrap">' + ownerAvatar + '</span><strong>Ответ владельца</strong></div><div>' + escapeHtml(r.hotelResponse) + '</div></div>' : '';
                const guestPhotos = (r.photos && r.photos.length) ? '<div class="review-card-guest-photos" style="margin-top:0.75rem;"><strong>Фотографии от гостя</strong><div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;">' + r.photos.map(p => '<img src="' + (typeof p === 'string' ? p : (p.url || '')) + '" alt="" style="width:4rem;height:4rem;object-fit:cover;border-radius:5px;">').join('') + '</div></div>' : '';
                return '<div class="review-card" data-review-id="' + (r.id || '') + '"><div class="review-card-header"><div class="review-card-author-wrap"><div class="review-card-avatar">' + guestAvatar + '</div><div><span class="review-card-author">' + escapeHtml(r.author || 'Гость') + '</span> <span class="review-card-meta">' + escapeHtml(r.stayType || '') + ', ' + escapeHtml(r.stayDate || '') + '<br>' + escapeHtml(r.roomInfo || '') + '</span></div></div><div><span class="review-card-score">' + (r.rating != null ? (String(r.rating).replace('.', ',') + ' ' + escapeHtml(r.ratingLabel || ratingLabel(r.rating))) : '—') + '</span></div></div><div class="review-card-text-wrap"><p class="review-card-text review-card-text-content">' + escapeHtml(r.text || '') + '</p><button type="button" class="review-card-expand" style="display:none;">Развернуть отзыв</button></div>' + guestPhotos + '<div class="review-card-helpful">' + helpful + '</div>' + hotelResp + '</div>';
            }).join('');
        }

        // Expand/collapse review text
        reviewsList.querySelectorAll('.review-card-text-content').forEach(p => {
            const wrap = p.closest('.review-card-text-wrap');
            const btn = wrap && wrap.querySelector('.review-card-expand');
            if (!btn) return;
            if (p.offsetHeight < p.scrollHeight || p.textContent.length > 250) {
                wrap.classList.add('collapsed');
                p.style.maxHeight = '4.5em';
                p.style.overflow = 'hidden';
                btn.style.display = 'inline';
                btn.textContent = 'Развернуть отзыв';
                btn.onclick = function() {
                    const on = wrap.classList.toggle('collapsed');
                    p.style.maxHeight = on ? '4.5em' : 'none';
                    p.style.overflow = on ? 'hidden' : 'visible';
                    btn.textContent = on ? 'Развернуть отзыв' : 'Свернуть отзыв';
                };
            }
        });

        // Helpful click (localStorage for demo)
        reviewsList.querySelectorAll('.review-card-helpful [data-helpful]').forEach(span => {
            span.style.cursor = 'pointer';
            span.addEventListener('click', function() {
                const id = this.getAttribute('data-review-id');
                const kind = this.getAttribute('data-helpful');
                let key = 'silva_helpful_' + propertyId;
                try {
                    let data = JSON.parse(localStorage.getItem(key) || '{}');
                    if (!data[id]) data[id] = { yes: 0, no: 0 };
                    data[id][kind] = (data[id][kind] || 0) + 1;
                    localStorage.setItem(key, JSON.stringify(data));
                } catch (e) {}
                renderReviews();
            });
        });
    }

    renderReviews();
    if (reviewsSortSelect) reviewsSortSelect.addEventListener('change', renderReviews);

    // "Оставить отзыв" — для гостей показываем модалку «Войдите»
    if (btnLeaveReview) {
        btnLeaveReview.style.display = 'inline-block';
        btnLeaveReview.addEventListener('click', function() {
            if (typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
                if (typeof window.showAuthRequiredModal === 'function') window.showAuthRequiredModal();
                return;
            }
            selectedStars = 0;
            if (reviewModal) reviewModal.classList.add('open');
            if (reviewStars) reviewStars.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('active', i < selectedStars); });
            if (reviewText) reviewText.value = '';
            if (reviewPhotosInput) reviewPhotosInput.value = '';
            if (reviewPhotosPreview) reviewPhotosPreview.innerHTML = '';
        });
    }

    if (reviewModalClose) reviewModalClose.addEventListener('click', () => reviewModal && reviewModal.classList.remove('open'));
    if (reviewModalCancel) reviewModalCancel.addEventListener('click', () => reviewModal && reviewModal.classList.remove('open'));
    if (reviewModal) reviewModal.addEventListener('click', function(e) { if (e.target === reviewModal) reviewModal.classList.remove('open'); });

    let selectedStars = 0;
    if (reviewStars) {
        reviewStars.querySelectorAll('button').forEach((btn, index) => {
            btn.addEventListener('click', function() {
                selectedStars = index + 1;
                reviewStars.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i < selectedStars));
            });
        });
    }

    if (reviewPhotosInput && reviewPhotosPreview) {
        reviewPhotosInput.addEventListener('change', function() {
            reviewPhotosPreview.innerHTML = '';
            const files = Array.from(this.files || []).slice(0, 5);
            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '4rem'; img.style.height = '4rem'; img.style.objectFit = 'cover'; img.style.borderRadius = '5px';
                    reviewPhotosPreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        });
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (selectedStars === 0) return;
            const text = reviewText ? reviewText.value.trim() : '';
            if (!text) return;
            const files = reviewPhotosInput && reviewPhotosInput.files ? Array.from(reviewPhotosInput.files).filter(f => f.type.startsWith('image/')).slice(0, 5) : [];
            const readPhotos = () => {
                if (files.length === 0) return Promise.resolve([]);
                return Promise.all(files.map(file => new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function(ev) { resolve(ev.target.result); };
                    reader.readAsDataURL(file);
                })));
            };
            let author = 'Гость';
            let avatar = null;
            try {
                const u = JSON.parse(localStorage.getItem('silva_user') || '{}');
                const name = (u.name && String(u.name).trim()) ? String(u.name).trim() : '';
                author = name || 'Гость';
                avatar = u.avatar || null;
            } catch (e) {}
            const rating = selectedStars * 2;
            readPhotos().then(photos => {
                mockAPI.addReviewForProperty(propertyId, {
                    author: author,
                    avatar: avatar,
                    rating: rating,
                    ratingLabel: ratingLabel(rating),
                    text: text,
                    photos: photos,
                    stayDate: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
                });
                if (reviewModal) reviewModal.classList.remove('open');
                renderReviews();
            });
        });
    }
});

