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

    return `
        <a href="property.html?id=${property.id}" class="property-card">
            <div class="property-card-image">
                ${property.main_image ? `
                    <img src="${property.main_image}" alt="${property.title}">
                ` : `
                    <div class="property-card-image-placeholder" aria-hidden="true">
                        <svg class="property-card-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                `}
                <button type="button" class="property-card-favorite${favClass}" aria-label="В избранное" data-property-id="${property.id}" onclick="event.preventDefault(); event.stopPropagation(); togglePropertyFavorite(this);">
                    <svg viewBox="0 0 24 24" fill="${inFavorites ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>

            <div class="property-card-content">
                <h3 class="property-card-title">${property.title}</h3>

                <div class="property-card-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span class="property-card-location-text">${property.region}</span>
                </div>

                <div class="property-card-details">
                    <div class="property-card-details-left">
                        <div class="property-card-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
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

                ${rating > 0 ? `
                    <div class="property-card-rating">
                        <svg class="property-card-rating-star" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span class="property-card-rating-value">${rating}</span>
                        <span class="property-card-rating-count">(${reviewsCount})</span>
                    </div>
                ` : ''}
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
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-400)" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>
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

