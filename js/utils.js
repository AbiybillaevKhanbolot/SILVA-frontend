// Utility functions

// Create page URL
function createPageUrl(pageName) {
    const pages = {
        'Home': 'index.html',
        'Catalog': 'catalog.html',
        'Property': 'property.html',
        'Booking': 'booking.html',
        'Loyalty': 'loyalty.html',
        'Dashboard': 'dashboard.html',
        'MyBookings': 'my-bookings.html',
        'Favorites': 'favorites.html',
        'OwnerDashboard': 'owner-dashboard.html',
        'AdminPanel': 'admin.html'
    };
    return pages[pageName] || 'index.html';
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
    properties: [
        {
            id: 1,
            title: 'Уютный коттедж в Приморском районе',
            region: 'Приморский',
            property_type: 'cottage',
            price_per_night: 5000,
            max_guests: 6,
            bedrooms: 3,
            bathrooms: 2,
            area: 120,
            rating: 4.8,
            reviews_count: 24,
            main_image: 'images2/1card.png',
            eco_certified: true,
            is_featured: true,
            description: 'Просторный коттедж с панорамными окнами и террасой. Идеален для семейного отдыха. Полностью оборудованная кухня, камин, сауна. Тихое место в 15 минутах от метро.\n\nВ доме три спальни, две ванные комнаты, гостиная-кухня и терраса с мангалом. Бесплатный Wi-Fi на всей территории. Дети приветствуются, предоставляем детскую кроватку по запросу.',
            amenities: ['wifi', 'parking', 'transfer', 'children', 'kitchen', 'pool', 'pets', 'sauna'],
            conditions: ['Заезд с 14:00', 'Выезд до 12:00', 'Нельзя с животными без согласования', 'Тихие часы с 23:00 до 8:00'],
            extra_info: ['Расстояние до метро: 15 мин на машине', 'Трансфер от/до аэропорта по запросу', 'Экскурсии можно заказать на ресепшене'],
            visa_info: 'Для граждан РФ виза не требуется. Иностранным гостям необходимо иметь действующую визу или безвизовый въезд согласно законодательству РФ.',
            map_lat: 60.0125,
            map_lng: 30.2583
        },
        {
            id: 2,
            title: 'Глэмпинг в Курортном районе',
            region: 'Курортный',
            property_type: 'glamping',
            price_per_night: 8000,
            max_guests: 4,
            bedrooms: 1,
            bathrooms: 1,
            area: 45,
            rating: 4.9,
            reviews_count: 18,
            main_image: 'images2/2card.jpg',
            eco_certified: true,
            is_featured: true,
            description: 'Уединённый глэмпинг с видом на лес. Панорамные окна, комфортная кровать, душ и туалет в номере. Завтрак доставляется в домик. Идеально для романтического отдыха и любителей природы.',
            amenities: ['wifi', 'parking', 'children', 'kitchen', 'pets'],
            conditions: ['Заезд с 15:00', 'Выезд до 11:00', 'Курение только на улице'],
            extra_info: ['Завтрак включён', 'Прокат велосипедов на территории'],
            visa_info: 'Для граждан РФ виза не требуется.',
            map_lat: 60.1586,
            map_lng: 29.9086
        },
        {
            id: 3,
            title: 'Эко-дом в Пушкинском районе',
            region: 'Пушкинский',
            property_type: 'eco_house',
            price_per_night: 6000,
            max_guests: 8,
            bedrooms: 4,
            bathrooms: 3,
            area: 180,
            rating: 4.7,
            reviews_count: 31,
            main_image: 'images2/3card.jpg',
            eco_certified: true,
            is_featured: true,
            description: 'Большой эко-дом из натуральных материалов. Солнечные батареи, система сбора дождевой воды. Четыре спальни, три ванные, кухня-гостиная и веранда. Подходит для больших компаний и семей с детьми. Рядом парк и конюшня.',
            amenities: ['wifi', 'parking', 'transfer', 'children', 'kitchen', 'pool', 'pets'],
            conditions: ['Заезд с 14:00', 'Выезд до 12:00', 'Раздельный сбор мусора', 'Тихие часы с 22:00'],
            extra_info: ['Конюшня на территории', 'Экскурсии в Пушкин и Павловск'],
            visa_info: 'Для граждан РФ виза не требуется. Иностранным гостям — действующая виза РФ.',
            map_lat: 59.7234,
            map_lng: 30.4092
        },
        {
            id: 4,
            title: 'Дом у воды в Петродворцовом районе',
            region: 'Петродворцовый',
            property_type: 'cottage',
            price_per_night: 7000,
            max_guests: 5,
            bedrooms: 2,
            bathrooms: 2,
            area: 95,
            rating: 4.6,
            reviews_count: 15,
            main_image: null,
            eco_certified: false,
            is_featured: false,
            description: 'Дом на берегу залива с собственной пристанью. Две спальни, кухня, гостиная с камином. Можно арендовать лодку. Подходит для рыбаков и любителей водного отдыха.',
            amenities: ['wifi', 'parking', 'children', 'kitchen'],
            conditions: ['Заезд с 16:00', 'Выезд до 10:00', 'Дети под присмотром взрослых у воды'],
            extra_info: ['Аренда лодки по запросу', 'Баня на дровах'],
            visa_info: 'Для граждан РФ виза не требуется.',
            map_lat: 59.8833,
            map_lng: 29.9000
        },
        {
            id: 5,
            title: 'Отель в центре Петербурга',
            region: 'Центральный',
            property_type: 'hotel',
            price_per_night: 12000,
            max_guests: 2,
            bedrooms: 1,
            bathrooms: 1,
            area: 28,
            rating: 5.0,
            reviews_count: 42,
            main_image: null,
            eco_certified: true,
            is_featured: false,
            description: 'Бутик-отель в историческом здании в центре города. Номера с дизайнерским ремонтом, кондиционер, мини-бар. Завтрак включён. Рядом Невский проспект, Эрмитаж, театры.',
            amenities: ['wifi', 'parking', 'transfer', 'children', 'kitchen'],
            conditions: ['Заезд с 14:00', 'Выезд до 12:00', 'Без курения'],
            extra_info: ['Завтрак 8:00–11:00', 'Трансфер от вокзала по запросу'],
            visa_info: 'Для въезда в РФ иностранным гостям необходима виза. Гражданам РФ виза не требуется.',
            map_lat: 59.9343,
            map_lng: 30.3356
        },
        {
            id: 6,
            title: 'Гостевой дом в Петроградском районе',
            region: 'Петроградский',
            property_type: 'guest_house',
            price_per_night: 4500,
            max_guests: 4,
            bedrooms: 2,
            bathrooms: 1,
            area: 65,
            rating: 4.5,
            reviews_count: 28,
            main_image: null,
            eco_certified: true,
            is_featured: false,
            description: 'Уютный гостевой дом в тихом дворе. Две спальни, общая кухня и гостиная. Идеально для бюджетного проживания в городе. Метро в 7 минутах ходьбы.',
            amenities: ['wifi', 'parking', 'children', 'kitchen'],
            conditions: ['Заезд с 13:00', 'Выезд до 11:00', 'Общая кухня'],
            extra_info: ['Сейф в номере', 'Прачечная за доплату'],
            visa_info: 'Для граждан РФ виза не требуется.',
            map_lat: 59.9656,
            map_lng: 30.3112
        }
    ],

    // Mock reviews per property (merged with localStorage on get)
    _reviewsByProperty: {
        1: [
            { id: 'r1', author: 'Анна', authorCountry: 'RU', stayType: 'отдых, пара', stayDate: 'февраль 2024 г.', roomInfo: 'Двухместный номер Стандарт, 2 ночи', rating: 9.6, ratingLabel: 'Превосходно', text: 'Отличное место для отдыха! Всё чисто, уютно, природа вокруг прекрасная. Очень понравилась кухня и терраса. Обязательно вернёмся.', textShort: true, helpfulYes: 2, helpfulNo: 0, hotelResponse: 'Спасибо за тёплые слова! Ждём снова.', photos: [], categories: { wifi: 8, cleanliness: 9, service: 10 } },
            { id: 'r2', author: 'Иван', authorCountry: 'RU', stayType: 'семья', stayDate: 'январь 2024 г.', roomInfo: 'Коттедж целиком, 5 ночей', rating: 8.8, ratingLabel: 'Отлично', text: 'Хороший дом, но немного далеко от города. В остальном всё отлично — дети в восторге от сауны.', textShort: true, helpfulYes: 0, helpfulNo: 0, hotelResponse: null, photos: [], categories: { cleanliness: 9, service: 8 } }
        ],
        2: [],
        3: [],
        4: [],
        5: [],
        6: []
    },

    getReviewsForProperty: function(propertyId) {
        const id = parseInt(propertyId);
        const stored = typeof localStorage !== 'undefined' && localStorage.getItem('silva_reviews_' + id);
        const saved = stored ? JSON.parse(stored) : [];
        const base = this._reviewsByProperty[id] || [];
        return [...base, ...saved];
    },

    addReviewForProperty: function(propertyId, review) {
        const id = parseInt(propertyId);
        const existing = this.getReviewsForProperty(id);
        const newReview = {
            id: 'u' + Date.now(),
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
            categories: review.categories || {}
        };
        existing.push(newReview);
        try {
            localStorage.setItem('silva_reviews_' + id, JSON.stringify(existing.filter(r => r.id.startsWith('u'))));
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
        return this.properties.filter(p => p.is_featured).slice(0, 6);
    },

    getPropertyById: function(id) {
        return this.properties.find(p => p.id === parseInt(id));
    },

    getProperties: function(filters = {}) {
        let result = [...this.properties];
        
        if (filters.region && filters.region !== 'Все регионы') {
            result = result.filter(p => p.region === filters.region);
        }
        
        if (filters.type && filters.type !== 'all') {
            result = result.filter(p => p.property_type === filters.type);
        }
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(p => 
                p.title.toLowerCase().includes(searchLower) ||
                p.region.toLowerCase().includes(searchLower)
            );
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
        
        return result;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createPageUrl, formatNumber, formatDate, getUrlParameter, mockAPI };
}

