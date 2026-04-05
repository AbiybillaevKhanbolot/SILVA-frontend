// Property Card Component
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem('silva_favorites') || '[]');
    } catch (e) {
        return [];
    }
}

function isPropertyInFavorites(propertyId) {
    return getFavorites().indexOf(parseInt(propertyId, 10)) !== -1;
}

function createPropertyCard(property) {
    var ic = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };

    const propertyTypes = {
        cottage: "Коттедж",
        hotel: "Отель",
        guest_house: "Гостевой дом",
        glamping: "Глэмпинг",
        eco_house: "Эко-дом"
    };

    const typeLabel = propertyTypes[property.property_type] || property.property_type;
    const price = property.price_per_night ? formatNumber(property.price_per_night) : '0';
    const rating = property.rating || 0;
    const reviewsCount = property.reviews_count || 0;
    const inFavorites = isPropertyInFavorites(property.id);
    const favClass = inFavorites ? ' property-card-favorite-in-favorites' : '';

    const ratingMarkup = rating > 0 ? `
        <div class="property-card-rating property-card-rating--overlay" aria-label="Рейтинг ${rating}">
            ${ic('star-filled', 14, 14, { className: 'property-card-rating-star' })}
            <span class="property-card-rating-value">${rating}</span>
            <span class="property-card-rating-count">(${reviewsCount})</span>
        </div>
    ` : '';

    return `
        <a href="property.html?id=${property.id}" class="property-card">
            <div class="property-card-image">
                ${property.main_image ? `
                    <img src="${property.main_image}" alt="${property.title}">
                ` : `
                    <div class="property-card-image-placeholder" aria-hidden="true">
                        ${ic('image', 24, 24, { className: 'property-card-placeholder-icon', strokeWidth: 1.5 })}
                    </div>
                `}
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
                        ${property.bedrooms ? `
                            <span class="property-card-detail">${property.bedrooms} спален</span>
                        ` : ''}
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
    var id = parseInt(buttonEl.getAttribute('data-property-id'), 10);
    if (!id) return;
    var favorites = getFavorites();
    var idx = favorites.indexOf(id);
    if (idx === -1) {
        favorites.push(id);
    } else {
        favorites.splice(idx, 1);
    }
    try {
        localStorage.setItem('silva_favorites', JSON.stringify(favorites));
    } catch (e) {}
    var nowInFav = favorites.indexOf(id) !== -1;
    buttonEl.classList.toggle('property-card-favorite-in-favorites', nowInFav);
    var svg = buttonEl.querySelector('svg');
    if (svg) svg.setAttribute('fill', nowInFav ? 'currentColor' : 'none');
    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('silva-favorites-changed', { detail: { propertyId: id, inFavorites: nowInFav } }));
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.createPropertyCard = createPropertyCard;
    window.renderPropertyCards = renderPropertyCards;
    window.togglePropertyFavorite = togglePropertyFavorite;
    window.getFavorites = getFavorites;
}

