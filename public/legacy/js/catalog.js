// Catalog page logic
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const regionSelect = document.getElementById('region-select');
    const sortSelect = document.getElementById('sort-select');
    const propertiesContainer = document.getElementById('properties-container');
    const resultsCount = document.getElementById('results-count');
    const activeFilters = document.getElementById('active-filters');
    const filterBadge = document.getElementById('filter-badge');
    const mobileFilterBtn = document.getElementById('mobile-filter-btn');
    const mobileFilterOverlay = document.getElementById('mobile-filter-overlay');
    const mobileFilterPanel = document.getElementById('mobile-filter-panel');
    const mobileFilterClose = document.getElementById('mobile-filter-close');
    
    let filters = {
        search: '',
        region: 'Все регионы',
        type: 'all',
        priceMin: 0,
        priceMax: 50000,
        guests: 1,
        amenities: []
    };
    
    // Initialize filters UI
    function initFilters() {
        const desktopFilters = document.getElementById('desktop-filters');
        const mobileFilters = document.getElementById('mobile-filters');
        const ic = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };

        const filtersHTML = `
            <div class="filter-section">
                <h4 class="filter-title">Тип размещения</h4>
                <button class="filter-option ${filters.type === 'all' ? 'active' : ''}" data-filter="type" data-value="all">
                    Все типы
                </button>
                <button class="filter-option ${filters.type === 'cottage' ? 'active' : ''}" data-filter="type" data-value="cottage">
                    Коттеджи
                </button>
                <button class="filter-option ${filters.type === 'hotel' ? 'active' : ''}" data-filter="type" data-value="hotel">
                    Отели
                </button>
                <button class="filter-option ${filters.type === 'guest_house' ? 'active' : ''}" data-filter="type" data-value="guest_house">
                    Гостевые дома
                </button>
                <button class="filter-option ${filters.type === 'glamping' ? 'active' : ''}" data-filter="type" data-value="glamping">
                    Глэмпинги
                </button>
                <button class="filter-option ${filters.type === 'eco_house' ? 'active' : ''}" data-filter="type" data-value="eco_house">
                    Эко-дома
                </button>
            </div>
            
            <div class="filter-section">
                <h4 class="filter-title">Цена за ночь</h4>
                <div style="padding: 0 0.5rem;">
                    <div class="slider-wrapper" style="position: relative; width: 100%; margin-bottom: 1rem; height: 6px;">
                        <div class="slider-track" style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: var(--color-gray-200); border-radius: 5px; z-index: 1;"></div>
                        <div class="slider-fill" style="position: absolute; top: 0; left: 0; height: 6px; background: var(--color-gray-900); border-radius: 5px; z-index: 2; width: ${(filters.priceMax / 50000) * 100}%;"></div>
                        <input type="range" id="price-range" min="0" max="50000" step="1000" value="${filters.priceMax}" 
                               style="width: 100%; position: relative; z-index: 3; margin: 0; padding: 0;">
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--color-gray-500);">
                        <span id="price-min-display">${filters.priceMax.toLocaleString()} ₽</span>
                        <span>50 000 ₽</span>
                    </div>
                </div>
            </div>
            
            <div class="filter-section">
                <h4 class="filter-title">Количество гостей</h4>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button class="btn" onclick="updateGuests(-1)" style="width: 2.5rem; height: 2.5rem; padding: 0;">-</button>
                    <span style="font-size: 1.25rem; font-weight: 500; width: 2rem; text-align: center;" id="guests-count">${filters.guests}</span>
                    <button class="btn" onclick="updateGuests(1)" style="width: 2.5rem; height: 2.5rem; padding: 0;">+</button>
                </div>
            </div>
            
            <div class="filter-section">
                <h4 class="filter-title">Удобства</h4>
                <div class="filter-amenities">
                    <button class="filter-amenity ${filters.amenities.includes('wifi') ? 'active' : ''}" 
                            data-amenity="wifi">
                        ${ic('wifi', 22, 22)}
                        <span style="font-size: 0.875rem;">Wi-Fi</span>
                    </button>
                    <button class="filter-amenity ${filters.amenities.includes('parking') ? 'active' : ''}" 
                            data-amenity="parking">
                        ${ic('car', 22, 22)}
                        <span style="font-size: 0.875rem;">Парковка</span>
                    </button>
                    <button class="filter-amenity ${filters.amenities.includes('kitchen') ? 'active' : ''}" 
                            data-amenity="kitchen">
                        ${ic('utensils-crossed', 22, 22)}
                        <span style="font-size: 0.875rem;">Кухня</span>
                    </button>
                    <button class="filter-amenity ${filters.amenities.includes('pool') ? 'active' : ''}" 
                            data-amenity="pool">
                        ${ic('waves', 22, 22)}
                        <span style="font-size: 0.875rem;">Бассейн</span>
                    </button>
                </div>
            </div>
        `;
        
        if (desktopFilters) desktopFilters.innerHTML = filtersHTML;
        if (mobileFilters) mobileFilters.innerHTML = filtersHTML;
        
        // Attach event listeners
        document.querySelectorAll('.filter-option[data-filter="type"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                filters.type = e.target.dataset.value;
                updateFilters();
            });
        });
        
        document.querySelectorAll('.filter-amenity').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amenity = e.currentTarget.dataset.amenity;
                const index = filters.amenities.indexOf(amenity);
                if (index > -1) {
                    filters.amenities.splice(index, 1);
                } else {
                    filters.amenities.push(amenity);
                }
                updateFilters();
            });
        });
        
        // Setup price range slider
        const setupPriceRange = (slider) => {
            if (!slider || slider.hasAttribute('data-initialized')) return;
            slider.setAttribute('data-initialized', 'true');
            
            // Find the price display element (the first span in the price display div)
            const priceDisplayContainer = slider.closest('.filter-section').querySelector('div[style*="display: flex"]');
            const priceDisplay = priceDisplayContainer ? priceDisplayContainer.querySelector('span:first-child') : null;
            
            // Find the slider fill element (it's in the same wrapper as the slider)
            const sliderWrapper = slider.parentElement;
            const sliderFill = sliderWrapper ? sliderWrapper.querySelector('.slider-fill') : null;
            
            // Update track fill color with green
            const updateTrackFill = () => {
                const value = parseInt(slider.value);
                const max = parseInt(slider.max);
                const percentage = (value / max) * 100;
                // Update the fill element width
                if (sliderFill && sliderFill.classList.contains('slider-fill')) {
                    sliderFill.style.width = percentage + '%';
                }
            };
            
            // Update price display
            const updatePriceDisplay = () => {
                if (priceDisplay) {
                    const value = parseInt(slider.value);
                    priceDisplay.textContent = `${value.toLocaleString()} ₽`;
                }
            };
            
            // Handle input event (works for both clicking and dragging)
            const handleUpdate = () => {
                filters.priceMax = parseInt(slider.value);
                updateTrackFill();
                updatePriceDisplay();
                filterProperties();
                updateActiveFilters();
            };
            
            slider.addEventListener('input', handleUpdate);
            slider.addEventListener('change', handleUpdate);
            
            // Enable drag functionality
            let isDragging = false;
            
            slider.addEventListener('mousedown', (e) => {
                isDragging = true;
                handleUpdate();
            });
            
            slider.addEventListener('mousemove', (e) => {
                if (isDragging && e.buttons === 1) {
                    handleUpdate();
                }
            });
            
            slider.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    handleUpdate();
                }
            });
            
            slider.addEventListener('mouseleave', () => {
                if (isDragging) {
                    isDragging = false;
                }
            });
            
            // Initialize track fill and price display
            updateTrackFill();
            updatePriceDisplay();
        };
        
        // Setup all price range sliders
        const allPriceRanges = document.querySelectorAll('#price-range');
        allPriceRanges.forEach(slider => {
            setupPriceRange(slider);
        });
    }
    
    window.updateGuests = function(delta) {
        filters.guests = Math.max(1, filters.guests + delta);
        const guestsCount = document.getElementById('guests-count');
        if (guestsCount) guestsCount.textContent = filters.guests;
        updateFilters();
    };
    
    function updateFilters() {
        initFilters();
        filterProperties();
        updateActiveFilters();
    }
    
    function filterProperties() {
        const filtered = mockAPI.getProperties(filters);
        renderPropertyCards(propertiesContainer, filtered);
        
        if (resultsCount) {
            resultsCount.innerHTML = `Найдено <strong>${filtered.length}</strong> объектов`;
        }
    }
    
    function updateActiveFilters() {
        const active = [];
        if (filters.region !== 'Все регионы') active.push({ key: 'region', label: filters.region });
        if (filters.type !== 'all') {
            const types = { cottage: 'Коттеджи', hotel: 'Отели', guest_house: 'Гостевые дома', glamping: 'Глэмпинги', eco_house: 'Эко-дома' };
            active.push({ key: 'type', label: types[filters.type] });
        }
        if (filters.priceMax < 50000) active.push({ key: 'price', label: `до ${filters.priceMax.toLocaleString()} ₽` });
        if (filters.guests > 1) active.push({ key: 'guests', label: `${filters.guests} гостей` });
        filters.amenities.forEach(a => {
            const labels = { wifi: 'Wi-Fi', parking: 'Парковка', kitchen: 'Кухня', pool: 'Бассейн' };
            active.push({ key: `amenity-${a}`, label: labels[a] || a });
        });
        
        if (activeFilters) {
            const icx = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
            activeFilters.innerHTML = active.map(f => `
                <span class="active-filter">
                    ${f.label}
                    <button class="active-filter-remove" onclick="removeFilter('${f.key}')">
                        ${icx('x', 12, 12)}
                    </button>
                </span>
            `).join('');
        }
        
        const count = active.length;
        if (filterBadge) {
            if (count > 0) {
                filterBadge.textContent = count;
                filterBadge.style.display = 'flex';
            } else {
                filterBadge.style.display = 'none';
            }
        }
    }
    
    window.removeFilter = function(key) {
        if (key === 'region') filters.region = 'Все регионы';
        else if (key === 'type') filters.type = 'all';
        else if (key === 'price') filters.priceMax = 50000;
        else if (key === 'guests') filters.guests = 1;
        else if (key.startsWith('amenity-')) {
            const amenity = key.replace('amenity-', '');
            filters.amenities = filters.amenities.filter(a => a !== amenity);
        }
        updateFilters();
    };
    
    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            filters.search = e.target.value;
            filterProperties();
        }, 300));
    }
    
    // Region select
    if (regionSelect) {
        regionSelect.addEventListener('change', (e) => {
            filters.region = e.target.value;
            filterProperties();
            updateActiveFilters();
        });
    }
    
    // Mobile filter toggle with open/close animations
    function openMobileFilters() {
        if (!mobileFilterOverlay || !mobileFilterPanel) return;
        mobileFilterOverlay.classList.add('open');
        mobileFilterPanel.classList.remove('closing');
        mobileFilterPanel.classList.add('open');
    }
    
    function closeMobileFilters() {
        if (!mobileFilterOverlay || !mobileFilterPanel) return;
        // Если анимация закрытия уже идёт — не запускаем повторно
        if (mobileFilterPanel.classList.contains('closing')) return;
        
        mobileFilterPanel.classList.add('closing');
        
        const handleAnimationEnd = (event) => {
            if (event.target !== mobileFilterPanel) return;
            mobileFilterPanel.classList.remove('open');
            mobileFilterPanel.classList.remove('closing');
            mobileFilterOverlay.classList.remove('open');
            mobileFilterPanel.removeEventListener('animationend', handleAnimationEnd);
        };
        
        mobileFilterPanel.addEventListener('animationend', handleAnimationEnd);
    }
    
    if (mobileFilterBtn) {
        mobileFilterBtn.addEventListener('click', openMobileFilters);
    }
    
    if (mobileFilterClose) {
        mobileFilterClose.addEventListener('click', closeMobileFilters);
    }
    
    if (mobileFilterOverlay) {
        mobileFilterOverlay.addEventListener('click', (e) => {
            if (e.target === mobileFilterOverlay) {
                closeMobileFilters();
            }
        });
    }
    
    // Initial load
    initFilters();
    filterProperties();
});

