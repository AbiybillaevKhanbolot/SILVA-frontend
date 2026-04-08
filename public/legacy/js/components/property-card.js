function getCurrentUserEmailForFavorites() {
    try {
        var u = JSON.parse(localStorage.getItem('silva_user') || '{}');
        return (u && u.email ? String(u.email) : '').trim().toLowerCase();
    } catch (e) {
        return '';
    }
}

function getFavoritesStorageKey() {
    var email = getCurrentUserEmailForFavorites();
    return email ? 'silva_favorites_' + email : 'silva_favorites';
}

// Property Card Component
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(getFavoritesStorageKey()) || '[]');
    } catch (e) {
        return [];
    }
}

function isPropertyInFavorites(propertyId) {
    var key = String(propertyId);
    return getFavorites().map(function (x) { return String(x); }).indexOf(key) !== -1;
}

/** Одно превью для списков (каталог и т.д.): main_image или первое из gallery_images. */
function getPropertyCardPreviewImage(property) {
    if (!property) return null;
    if (property.main_image) return property.main_image;
    if (property.gallery_images && property.gallery_images.length) return property.gallery_images[0];
    return null;
}

function createPropertyCard(property) {
    var ic = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };

    const propertyTypes = {
        cottage: 'Коттедж',
        hotel: 'Отель',
        guest_house: 'Гостевой дом',
        glamping: 'Глэмпинг',
        eco_house: 'Эко-дом'
    };

    const typeLabel = propertyTypes[property.property_type] || property.property_type;
    const price = property.price_per_night ? formatNumber(property.price_per_night) : '0';
    const rating = property.rating || 0;
    const reviewsCount = property.reviews_count || 0;
    const inFavorites = isPropertyInFavorites(property.id);
    const favClass = inFavorites ? ' property-card-favorite-in-favorites' : '';
    const previewSrc = getPropertyCardPreviewImage(property);

    const ratingMarkup =
        rating > 0
            ? `
        <div class="property-card-rating property-card-rating--overlay" aria-label="Рейтинг ${rating}">
            ${ic('star-filled', 14, 14, { className: 'property-card-rating-star' })}
            <span class="property-card-rating-value">${rating}</span>
            <span class="property-card-rating-count">(${reviewsCount})</span>
        </div>
    `
            : '';

    return `
        <a href="property.html?id=${property.id}" class="property-card">
            <div class="property-card-image">
                ${
                    previewSrc
                        ? `
                    <img src="${previewSrc}" alt="${property.title}">
                `
                        : `
                    <div class="property-card-image-placeholder" aria-hidden="true">
                        ${ic('image', 24, 24, { className: 'property-card-placeholder-icon', strokeWidth: 1.5 })}
                    </div>
                `
                }
                ${ratingMarkup}
                <button type="button" class="property-card-favorite${favClass}" aria-label="В избранное" data-property-id="${property.id}" onclick="event.preventDefault(); event.stopPropagation(); togglePropertyFavorite(this);">
                    ${ic('heart', 24, 24, { fill: inFavorites ? 'currentColor' : 'none' })}
                </button>
            </div>

            <div class="property-card-content">
                <h3 class="property-card-title">${property.title}</h3>

                <div class="property-card-location">
                    ${ic('map-pin', 24, 24)}
                    <span class="property-card-location-text">${property.region}</span>
                </div>

                <div class="property-card-details">
                    <div class="property-card-details-left">
                        <div class="property-card-detail">
                            ${ic('users', 24, 24)}
                            <span>до ${property.max_guests} гостей</span>
                        </div>
                        ${
                            property.bedrooms
                                ? `
                            <span class="property-card-detail">${property.bedrooms} спален</span>
                        `
                                : ''
                        }
                    </div>
                    <div class="property-card-price property-card-price--inline">
                        <span class="property-card-price-amount">${price}</span>
                        <span class="property-card-price-unit">/ночь</span>
                    </div>
                </div>
                <span class="property-card-more" role="button" aria-label="Подробнее">Подробнее</span>
            </div>
        </a>
    `;
}

/** Кабинет владельца: та же вёрстка, без избранного; Просмотр + Удалить вместо «Подробнее». */
function createOwnerPropertyCard(property) {
    var ic = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };

    const price = property.price_per_night ? formatNumber(property.price_per_night) : '0';
    const rating = property.rating || 0;
    const reviewsCount = property.reviews_count || 0;
    const previewSrc = getPropertyCardPreviewImage(property);

    const ratingMarkup =
        rating > 0
            ? `
        <div class="property-card-rating property-card-rating--overlay" aria-label="Рейтинг ${rating}">
            ${ic('star-filled', 14, 14, { className: 'property-card-rating-star' })}
            <span class="property-card-rating-value">${rating}</span>
            <span class="property-card-rating-count">(${reviewsCount})</span>
        </div>
    `
            : '';

    return `
        <div class="property-card property-card--owner" data-property-id="${property.id}">
            <div class="property-card-image">
                ${
                    previewSrc
                        ? `
                    <img src="${previewSrc}" alt="${property.title}">
                `
                        : `
                    <div class="property-card-image-placeholder" aria-hidden="true">
                        ${ic('image', 24, 24, { className: 'property-card-placeholder-icon', strokeWidth: 1.5 })}
                    </div>
                `
                }
                ${ratingMarkup}
            </div>

            <div class="property-card-content">
                <h3 class="property-card-title">${property.title}</h3>

                <div class="property-card-location">
                    ${ic('map-pin', 24, 24)}
                    <span class="property-card-location-text">${property.region}</span>
                </div>

                <div class="property-card-details">
                    <div class="property-card-details-left">
                        <div class="property-card-detail">
                            ${ic('users', 24, 24)}
                            <span>до ${property.max_guests} гостей</span>
                        </div>
                        ${
                            property.bedrooms
                                ? `
                            <span class="property-card-detail">${property.bedrooms} спален</span>
                        `
                                : ''
                        }
                    </div>
                    <div class="property-card-price property-card-price--inline">
                        <span class="property-card-price-amount">${price}</span>
                        <span class="property-card-price-unit">/ночь</span>
                    </div>
                </div>
                <div class="property-card-owner-actions">
                    <a href="property.html?id=${property.id}" class="property-card-more">Просмотр</a>
                    <button type="button" class="property-card-delete" data-property-id="${property.id}">Удалить</button>
                </div>
            </div>
        </div>
    `;
}

function renderPropertyCards(container, properties) {
    if (!container) return;

    if (properties.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 5rem 0;">
                <div style="width: 5rem; height: 5rem; background: var(--color-gray-100); border-radius: 5px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    ${typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg('arrow-right', 40, 40, { extraAttrs: ' style="color: var(--color-gray-400)"' }) : ''}
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--color-gray-900); margin-bottom: 0.5rem;">
                    Объекты не найдены
                </h3>
                <p style="color: var(--color-gray-500); margin-bottom: 1.5rem;">
                    Попробуйте изменить параметры поиска
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = properties.map(createPropertyCard).join('');
}

function togglePropertyFavorite(buttonEl) {
    if (typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
        if (typeof window.showAuthRequiredModal === 'function') window.showAuthRequiredModal();
        return;
    }
    var id = String(buttonEl.getAttribute('data-property-id') || '').trim();
    if (!id) return;
    if (!id) return;
    var favorites = getFavorites();
    var idx = favorites.indexOf(id);
    var nowInFav = idx === -1;
    if (nowInFav) favorites.push(id);
    else favorites.splice(idx, 1);
    try {
        localStorage.setItem(getFavoritesStorageKey(), JSON.stringify(favorites));
    } catch (e) {}
    buttonEl.classList.toggle('property-card-favorite-in-favorites', nowInFav);
    var svg = buttonEl.querySelector('svg');
    if (svg) svg.setAttribute('fill', nowInFav ? 'currentColor' : 'none');
    if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.setFavorite === 'function') {
        window.silvaSupabaseAuth.setFavorite(id, nowInFav).catch(function () {});
    }
    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('silva-favorites-changed', { detail: { propertyId: id, inFavorites: nowInFav } }));
    }
}

if (typeof window !== 'undefined') {
    window.createPropertyCard = createPropertyCard;
    window.createOwnerPropertyCard = createOwnerPropertyCard;
    window.renderPropertyCards = renderPropertyCards;
    window.togglePropertyFavorite = togglePropertyFavorite;
    window.getFavorites = getFavorites;
    window.getFavoritesStorageKey = getFavoritesStorageKey;
    window.getPropertyCardPreviewImage = getPropertyCardPreviewImage;
    document.addEventListener('DOMContentLoaded', function () {
        if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.fetchFavorites === 'function') {
            window.silvaSupabaseAuth.fetchFavorites().catch(function () {});
        }
    });
}
