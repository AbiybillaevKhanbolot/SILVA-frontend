// Utility functions

// Create page URL
function createPageUrl(pageName) {
    const pages = {
        'Home': 'index.html',
        'Catalog': 'catalog.html',
        'Property': 'property.html',
        'Booking': 'booking.html',
        'Loyalty': 'loyalty.html',
        'Contacts': 'contact.html',
        'Dashboard': 'dashboard.html',
        'MyBookings': 'my-bookings.html',
        'Favorites': 'favorites.html',
        'OwnerDashboard': 'owner-dashboard.html',
        'OwnerProperties': 'owner-properties.html',
        'OwnerPropertyEdit': 'owner-property-edit.html',
        'OwnerBookings': 'owner-bookings.html',
        'OwnerReviews': 'owner-reviews.html',
        'AdminPanel': 'admin.html'
    };
    return pages[pageName] || 'index.html';
}

/** Ссылки на страницы legacy: с корня сайта (/legacy/…), чтобы навигация из iframe React работала стабильно */
function silvaLegacyHref(file) {
    var name = String(file || '').replace(/^\/?legacy\/?/i, '');
    try {
        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
            return name;
        }
    } catch (e) {}
    return '/legacy/' + name;
}

// Format number with spaces
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Format date
function formatDate(date, format = 'ru') {
    const d = new Date(date);
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Геокодирование адреса через Nominatim (OSM). Нужна сеть; для демо без своего бэкенда.
 * @param {string} addressLine улица, дом и т.д.
 * @param {string} [district] район СПб из формы
 * @returns {Promise<{lat:number,lng:number}|null>}
 */
function geocodeSilvaAddress(addressLine, district) {
    var q = String(addressLine || '').trim();
    if (!q) return Promise.resolve(null);
    var tail = ['Санкт-Петербург', 'Россия'];
    if (district && String(district).trim()) {
        tail.unshift(String(district).trim() + ' район');
    }
    var query = q + ', ' + tail.join(', ');
    var url =
        'https://nominatim.openstreetmap.org/search?' +
        new URLSearchParams({ format: 'json', limit: '1', q: query }).toString();
    return fetch(url, {
        method: 'GET',
        headers: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
        mode: 'cors'
    })
        .then(function (r) {
            return r.json();
        })
        .then(function (arr) {
            if (!arr || !arr.length) return null;
            var lat = parseFloat(arr[0].lat);
            var lng = parseFloat(arr[0].lon);
            if (isNaN(lat) || isNaN(lng)) return null;
            return { lat: lat, lng: lng };
        })
        .catch(function () {
            return null;
        });
}

// Animate on scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.fade-in-up');
    elements.forEach(element => {
        if (isInViewport(element) && !element.classList.contains('animated')) {
            element.classList.add('animated');
        }
    });
}

// Initialize scroll animations
if (typeof window !== 'undefined') {
    window.geocodeSilvaAddress = geocodeSilvaAddress;
    window.addEventListener('scroll', debounce(animateOnScroll, 100));
    animateOnScroll();
}

// Районы Санкт-Петербурга для фильтров
const SPB_DISTRICTS = [
    'Адмиралтейский', 'Василеостровский', 'Выборгский', 'Калининский', 'Кировский',
    'Колпинский', 'Красногвардейский', 'Красносельский', 'Кронштадтский', 'Курортный',
    'Московский', 'Невский', 'Петроградский', 'Петродворцовый', 'Приморский',
    'Пушкинский', 'Фрунзенский', 'Центральный'
];

// Mock API - Replace with actual base44 API calls
const mockAPI = {
    _normalizePropertyId: function(value) {
        if (value == null) return null;
        var s = String(value).trim();
        return s ? s : null;
    },
    properties: [],

    // Mock reviews per property (merged with localStorage on get)
    _reviewsByProperty: {},

    /** Отзывы с сервера (Supabase), ключ — нормализованный id объекта */
    _serverReviewsByProperty: {},

    setServerReviewsForProperty: function(propertyId, list) {
        var n = this._normalizePropertyId(propertyId);
        if (!n) return;
        this._serverReviewsByProperty[n] = Array.isArray(list) ? list.slice() : [];
    },

    _getAllReviewsRawForLookup: function(propertyId) {
        var n = this._normalizePropertyId(propertyId);
        if (!n) return [];
        var server = (this._serverReviewsByProperty && this._serverReviewsByProperty[n]) || [];
        return server.concat(this._getReviewsRaw(propertyId));
    },

    _reviewsStorageKey: function(propertyId) {
        var n = this._normalizePropertyId(propertyId);
        return n ? 'silva_reviews_' + n : null;
    },

    _reviewResponsesStorageKey: function(propertyId) {
        var n = this._normalizePropertyId(propertyId);
        return n ? 'silva_review_responses_' + n : null;
    },

    _getReviewsRaw: function(propertyId) {
        var n = this._normalizePropertyId(propertyId);
        if (!n) return [];
        var key = this._reviewsStorageKey(propertyId);
        var saved = [];
        if (key && typeof localStorage !== 'undefined') {
            try {
                var stored = localStorage.getItem(key);
                saved = stored ? JSON.parse(stored) : [];
            } catch (e) {
                saved = [];
            }
        }
        if (!Array.isArray(saved)) saved = [];
        var base = [];
        var idNum = parseInt(n, 10);
        if (!isNaN(idNum) && String(idNum) === n) {
            base = this._reviewsByProperty[idNum] || [];
        }
        return base.concat(saved);
    },

    getReviewResponseOverrides: function(propertyId) {
        var key = this._reviewResponsesStorageKey(propertyId);
        if (!key) return {};
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    },

    getReviewsForProperty: function(propertyId) {
        if (!this._normalizePropertyId(propertyId)) return [];
        var n = this._normalizePropertyId(propertyId);
        var server = (this._serverReviewsByProperty && this._serverReviewsByProperty[n]) || [];
        const raw = server.concat(this._getReviewsRaw(propertyId));
        const overrides = this.getReviewResponseOverrides(propertyId);
        return raw.map(function (r) {
            if (!r || r.id == null) return r;
            const oid = String(r.id);
            const out = Object.assign({}, r);
            if (Object.prototype.hasOwnProperty.call(overrides, oid)) {
                var ov = overrides[oid];
                if (ov && typeof ov === 'object') {
                    out.hotelResponse = ov.text || '';
                    out.hotelResponseAvatar = ov.ownerAvatar || null;
                } else {
                    out.hotelResponse = ov;
                }
            }
            return out;
        });
    },

    updateReviewHotelResponse: function(propertyId, reviewId, hotelResponse) {
        var revKey = this._reviewsStorageKey(propertyId);
        var respKey = this._reviewResponsesStorageKey(propertyId);
        const rid = String(reviewId);
        if (!revKey || !respKey) return false;
        const raw = this._getAllReviewsRawForLookup(propertyId);
        const target = raw.find(function (r) {
            return r && String(r.id) === rid;
        });
        if (!target) return false;
        var ownerAvatar = null;
        try {
            var ownerRaw = JSON.parse(localStorage.getItem('silva_user') || '{}');
            ownerAvatar = ownerRaw && ownerRaw.avatar ? ownerRaw.avatar : null;
        } catch (e) {}

        if (rid.indexOf('u') === 0) {
            try {
                var stored = JSON.parse(localStorage.getItem(revKey) || '[]');
                if (!Array.isArray(stored)) stored = [];
                var idx = stored.findIndex(function (r) {
                    return r && String(r.id) === rid;
                });
                if (idx !== -1) {
                    stored[idx].hotelResponse = hotelResponse;
                    stored[idx].hotelResponseAvatar = ownerAvatar;
                    localStorage.setItem(revKey, JSON.stringify(stored));
                }
            } catch (e) {}
        } else {
            var o = this.getReviewResponseOverrides(propertyId);
            o[rid] = {
                text: hotelResponse,
                ownerAvatar: ownerAvatar
            };
            try {
                localStorage.setItem(respKey, JSON.stringify(o));
            } catch (e) {}
        }
        return true;
    },

    addReviewForProperty: function(propertyId, review) {
        var revKey = this._reviewsStorageKey(propertyId);
        if (!revKey) return null;
        const raw = this._getReviewsRaw(propertyId);
        const newReview = {
            id: 'u' + Date.now(),
            _createdAt: new Date().toISOString(),
            author: review.author,
            authorCountry: review.authorCountry || 'RU',
            stayType: review.stayType || 'гость',
            stayDate: review.stayDate || new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
            roomInfo: review.roomInfo || '—',
            rating: review.rating,
            ratingLabel: review.ratingLabel || 'Отлично',
            text: review.text,
            textShort: true,
            helpfulYes: 0,
            helpfulNo: 0,
            hotelResponse: null,
            photos: review.photos || [],
            categories: review.categories || {},
            avatar: review.avatar || null
        };
        const userOnly = raw.filter(function (r) {
            return r && String(r.id).indexOf('u') === 0;
        });
        userOnly.push(newReview);
        try {
            localStorage.setItem(revKey, JSON.stringify(userOnly));
        } catch (e) {}
        return newReview;
    },

    getReviewCategoriesForProperty: function(propertyId) {
        const reviews = this.getReviewsForProperty(propertyId);
        const cats = { cleanliness: [], food: [], service: [], facilities: [], price: [], wifi: [], location: [], room: [] };
        const labels = { cleanliness: 'Чистота', food: 'Питание', service: 'Обслуживание', facilities: 'Средства гигиены', price: 'Цена/Качество', wifi: 'Качество Wi-Fi', location: 'Расположение', room: 'Номер' };
        reviews.forEach(r => {
            Object.keys(r.categories || {}).forEach(k => {
                if (cats[k]) cats[k].push(r.categories[k]);
            });
        });
        const result = {};
        Object.keys(cats).forEach(k => {
            const arr = cats[k];
            result[k] = arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
        });
        return { values: result, labels };
    },

    getFeaturedProperties: function() {
        const ownerList = this.getOwnerListingsFromStorage();
        const published = ownerList.filter(function (p) {
            return p && p.status === 'published';
        });
        const source = published.length ? published : ownerList;
        return source
            .slice()
            .sort(function (a, b) {
                var br = Number(b && b.rating) || 0;
                var ar = Number(a && a.rating) || 0;
                if (br !== ar) return br - ar;
                var bc = Number(b && b.reviews_count) || 0;
                var ac = Number(a && a.reviews_count) || 0;
                if (bc !== ac) return bc - ac;
                return (Number(b && b.id) || 0) - (Number(a && a.id) || 0);
            })
            .slice(0, 6);
    },

    getOwnerListingsFromStorage: function() {
        try {
            const raw = JSON.parse(localStorage.getItem('silva_owner_properties') || '[]');
            if (!Array.isArray(raw)) return [];
            return raw
                .map(function (p) {
                    if (!p || typeof p !== 'object') return null;
                    var idVal = mockAPI._normalizePropertyId(p.id);
                    if (!idVal) return null;
                    return Object.assign({}, p, { id: idVal });
                })
                .filter(Boolean);
        } catch (e) {
            return [];
        }
    },

    /** Добавить объекты в silva_owner_properties без дубликатов (например, подтянутые для избранного). */
    appendPropertiesToCache: function(extraList) {
        if (!Array.isArray(extraList) || !extraList.length) return;
        var existing = this.getOwnerListingsFromStorage();
        var seen = {};
        existing.forEach(function (p) {
            var k = mockAPI._normalizePropertyId(p && p.id);
            if (k) seen[k] = true;
        });
        var toAdd = [];
        extraList.forEach(function (p) {
            var k = mockAPI._normalizePropertyId(p && p.id);
            if (k && !seen[k]) {
                seen[k] = true;
                toAdd.push(p);
            }
        });
        if (!toAdd.length) return;
        this.saveOwnerListingsToStorage(existing.concat(toAdd));
    },

    refreshPropertiesFromSupabase: async function () {
        if (!window.silvaSupabaseAuth || typeof window.silvaSupabaseAuth.fetchPropertiesCache !== 'function') {
            return this.getOwnerListingsFromStorage();
        }
        try {
            return await window.silvaSupabaseAuth.fetchPropertiesCache();
        } catch (e) {
            return this.getOwnerListingsFromStorage();
        }
    },

    saveOwnerListingsToStorage: function(list) {
        var safe = Array.isArray(list)
            ? list
                  .map(function (p) {
                      if (!p || typeof p !== 'object') return null;
                      var idVal = mockAPI._normalizePropertyId(p.id);
                      if (!idVal) return null;
                      return Object.assign({}, p, { id: idVal });
                  })
                  .filter(Boolean)
            : [];
        localStorage.setItem('silva_owner_properties', JSON.stringify(safe));
    },

    nextOwnerPropertyId: function() {
        return null;
    },

    getPropertyById: function(id) {
        const key = this._normalizePropertyId(id);
        if (!key) return null;
        const ownerList = this.getOwnerListingsFromStorage();
        return ownerList.find(p => this._normalizePropertyId(p.id) === key) || null;
    },

    getProperties: function(filters = {}) {
        const ownerPublished = this.getOwnerListingsFromStorage().filter(function (p) {
            return p.status === 'published';
        });
        let result = ownerPublished.slice();
        
        if (filters.region && filters.region !== 'Все регионы') {
            result = result.filter(p => p.region === filters.region);
        }
        
        if (filters.type && filters.type !== 'all') {
            result = result.filter(p => p.property_type === filters.type);
        }
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(p => {
                const addr = (p.address && String(p.address)) || '';
                return (
                    p.title.toLowerCase().includes(searchLower) ||
                    p.region.toLowerCase().includes(searchLower) ||
                    addr.toLowerCase().includes(searchLower)
                );
            });
        }
        
        if (filters.priceMin !== undefined) {
            result = result.filter(p => p.price_per_night >= filters.priceMin);
        }
        
        if (filters.priceMax !== undefined) {
            result = result.filter(p => p.price_per_night <= filters.priceMax);
        }
        
        if (filters.guests) {
            result = result.filter(p => p.max_guests >= filters.guests);
        }

        if (filters.amenities && filters.amenities.length) {
            const required = filters.amenities.map(function (x) {
                return String(x || '').toLowerCase();
            });
            result = result.filter(function (p) {
                const pa = Array.isArray(p.amenities)
                    ? p.amenities.map(function (a) {
                          return String(a || '').toLowerCase();
                      })
                    : [];
                return required.every(function (req) {
                    return pa.indexOf(req) !== -1;
                });
            });
        }
        
        return result;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createPageUrl,
        formatNumber,
        formatDate,
        getUrlParameter,
        mockAPI,
        geocodeSilvaAddress
    };
}

