// Home page logic
document.addEventListener('DOMContentLoaded', function() {
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackStatus = document.getElementById('feedback-status');

    function showFeedbackStatus(message, isError) {
        if (!feedbackStatus) return;
        feedbackStatus.textContent = message;
        feedbackStatus.style.display = 'block';
        feedbackStatus.style.color = isError ? 'var(--color-red-600, #b91c1c)' : 'var(--color-emerald-700, #047857)';
    }

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const nameEl = document.getElementById('feedback-name');
            const emailEl = document.getElementById('feedback-email');
            const messageEl = document.getElementById('feedback-message');
            const submitBtn = feedbackForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Отправить';

            const name = nameEl ? String(nameEl.value || '').trim() : '';
            const email = emailEl ? String(emailEl.value || '').trim() : '';
            const message = messageEl ? String(messageEl.value || '').trim() : '';
            if (!name || !email || !message) {
                showFeedbackStatus('Заполните все поля формы.', true);
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Отправка...';
                }
                if (!window.silvaSupabaseAuth || typeof window.silvaSupabaseAuth.ensureClient !== 'function') {
                    throw new Error('Supabase клиент не подключен.');
                }
                const sb = window.silvaSupabaseAuth.ensureClient();
                if (!sb) throw new Error('Supabase клиент не инициализирован.');

                let userId = null;
                if (typeof window.silvaSupabaseAuth.getSessionUser === 'function') {
                    const user = await window.silvaSupabaseAuth.getSessionUser();
                    userId = user && user.id ? user.id : null;
                }

                const ins = await sb.from('feedback_messages').insert({
                    name: name,
                    email: email,
                    message: message,
                    user_id: userId,
                    source: 'homepage_feedback',
                    page_path: '/legacy/index.html'
                });
                if (ins.error) throw ins.error;

                feedbackForm.reset();
                showFeedbackStatus('Спасибо! Сообщение отправлено.', false);
            } catch (err) {
                showFeedbackStatus(
                    (err && err.message ? err.message : 'Не удалось отправить сообщение.') +
                        ' Проверьте, что таблица feedback_messages создана.',
                    true
                );
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    }

    // Load featured properties
    const propertiesContainer = document.getElementById('properties-container');
    if (propertiesContainer) {
        const featuredProperties = mockAPI.getFeaturedProperties();
        renderPropertyCards(propertiesContainer, featuredProperties);
    }

    // Parallax effect for hero section
    const heroSection = document.querySelector('.hero-section');
    const heroBackground = document.querySelector('.hero-background');
    
    if (heroSection && heroBackground) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.5;
            
            if (scrolled < heroSection.offsetHeight) {
                heroBackground.style.transform = `translateY(${rate}px)`;
            }
        });
    }

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up', 'animated');
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });

    // Плавное появление текста посимвольно (Fade In) — общая функция
    const delayStep = 0.04;
    function applyFadeChars(el) {
        if (!el || el.dataset.fadeCharsDone === '1') return;
        el.dataset.fadeCharsDone = '1';
        function processNode(parent, node, delayRef) {
            if (node.nodeType === 3) {
                var text = node.textContent;
                if (!text) return;
                var frag = document.createDocumentFragment();
                for (var i = 0; i < text.length; i++) {
                    var span = document.createElement('span');
                    span.className = 'fade-char';
                    span.style.animationDelay = delayRef.value + 's';
                    span.appendChild(document.createTextNode(text[i] === ' ' ? '\u00A0' : text[i]));
                    frag.appendChild(span);
                    delayRef.value += delayStep;
                }
                parent.replaceChild(frag, node);
            } else if (node.nodeType === 1 && node.tagName !== 'BUTTON' && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                var children = Array.prototype.slice.call(node.childNodes);
                children.forEach(function(child) { processNode(node, child, delayRef); });
            }
        }
        var ref = { value: 0 };
        var children = Array.prototype.slice.call(el.childNodes);
        children.forEach(function(node) { processNode(el, node, ref); });
    }

    // Секции и селекторы текста для посимвольной анимации при скролле (все, кроме кнопок)
    var sectionFadeSelectors = [
        '.section-title-left .typewriter-text',
        '.section-description-right',
        '.ptype-name',
        '.ptype-count',
        '.audience-title .typewriter-text',
        '.featured-title .typewriter-text',
        /* Карточки популярных объектов не анимируем посимвольно — при выезде панели должны быть видны гости, удобства, цена */
        '.garden-title .typewriter-text',
        '.garden-desc',
        '.garden-card-percent',
        '.garden-card-name',
        '.garden-card-threshold',
        '.garden-card-desc',
        '.feedback-title .typewriter-text',
        '.feedback-desc'
    ];
    var sectionFadeSelector = sectionFadeSelectors.join(', ');

    function runFadeCharsInSection(section) {
        if (!section) return;
        section.querySelectorAll(sectionFadeSelector).forEach(function(el) {
            if (el.closest('button') || el.closest('.btn')) return;
            applyFadeChars(el);
        });
    }

    var fadeCharsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                runFadeCharsInSection(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.hero-section, .section, .audience-section, .featured-section, .garden-section, .feedback-section').forEach(function(section) {
        fadeCharsObserver.observe(section);
    });

    // Один раз при загрузке для героя (описание)
    runFadeCharsInSection(document.querySelector('.hero-section'));

    // Typewriter: запуск анимации при скролле до заголовка
    const typewriterHeadlines = document.querySelectorAll('.typewriter-headline');
    if (typewriterHeadlines.length) {
        const typewriterObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('typewriter-in-view');
                }
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -80px 0px' });
        typewriterHeadlines.forEach(function(headline) {
            typewriterObserver.observe(headline);
        });
    }

    var gardenCardsGrid = document.querySelector('.garden-cards');
    if (gardenCardsGrid) {
        var gardenCardsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('garden-cards--animated');
                    gardenCardsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
        gardenCardsObserver.observe(gardenCardsGrid);
    }

    // Region dropdown
    const regionInput = document.getElementById('region-input');
    const regionDropdown = document.getElementById('region-dropdown');
    
    if (regionInput && regionDropdown) {
        regionInput.addEventListener('click', (e) => {
            e.stopPropagation();
            regionDropdown.classList.add('active');
        });

        regionInput.addEventListener('focus', (e) => {
            e.stopPropagation();
            regionDropdown.classList.add('active');
        });

        regionInput.addEventListener('input', (e) => {
            const searchValue = e.target.value.toLowerCase();
            const items = regionDropdown.querySelectorAll('.search-dropdown-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchValue)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });

        regionDropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                regionInput.value = item.dataset.value;
                regionDropdown.classList.remove('active');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!regionInput.contains(e.target) && !regionDropdown.contains(e.target)) {
                regionDropdown.classList.remove('active');
            }
        });
    }

    // Smart search: pass guest preferences to catalog
    const findBtn = document.querySelector('.btn-search');
    function toISODate(date) {
        if (!(date instanceof Date)) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // People dropdown
    const peopleInput = document.getElementById('people-input');
    const peopleDropdown = document.getElementById('people-dropdown');
    let adultsCount = 2;
    let childrenCount = 0;

    function updatePeopleInput() {
        const total = adultsCount + childrenCount;
        let text = '';
        if (adultsCount > 0) {
            text += adultsCount + ' взросл' + (adultsCount === 1 ? 'ый' : adultsCount < 5 ? 'ых' : 'ых');
        }
        if (childrenCount > 0) {
            if (text) text += ', ';
            text += childrenCount + ' дет' + (childrenCount === 1 ? 'ь' : childrenCount < 5 ? 'ей' : 'ей');
        }
        if (!text) text = 'Гости';
        peopleInput.value = text;
    }

    if (peopleInput && peopleDropdown) {
        updatePeopleInput();

        peopleInput.addEventListener('click', (e) => {
            e.stopPropagation();
            peopleDropdown.classList.toggle('active');
        });

        peopleDropdown.querySelectorAll('.search-people-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                const action = btn.dataset.action;

                if (type === 'adults') {
                    if (action === 'increase') {
                        adultsCount++;
                    } else if (action === 'decrease' && adultsCount > 1) {
                        adultsCount--;
                    }
                    document.getElementById('adults-count').textContent = adultsCount;
                } else if (type === 'children') {
                    if (action === 'increase') {
                        childrenCount++;
                    } else if (action === 'decrease' && childrenCount > 0) {
                        childrenCount--;
                    }
                    document.getElementById('children-count').textContent = childrenCount;
                }

                updatePeopleInput();

                // Update button states
                const decreaseBtn = btn.parentElement.querySelector('[data-action="decrease"]');
                if (type === 'adults') {
                    decreaseBtn.disabled = adultsCount <= 1;
                } else {
                    decreaseBtn.disabled = childrenCount <= 0;
                }
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!peopleInput.contains(e.target) && !peopleDropdown.contains(e.target)) {
                peopleDropdown.classList.remove('active');
            }
        });

        // Initialize button states
        document.querySelectorAll('[data-type="adults"][data-action="decrease"]').forEach(btn => {
            btn.disabled = adultsCount <= 1;
        });
        document.querySelectorAll('[data-type="children"][data-action="decrease"]').forEach(btn => {
            btn.disabled = childrenCount <= 0;
        });
    }

    // Calendar functions
    function formatDateForInput(date) {
        const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 
                       'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    }

    function getMonthName(date) {
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function renderCalendar(containerId, monthYearId, daysId, currentDate, selectedDate, minDate) {
        const monthYearEl = document.getElementById(monthYearId);
        const daysEl = document.getElementById(daysId);
        
        if (!monthYearEl || !daysEl) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        monthYearEl.textContent = getMonthName(currentDate);
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Понедельник = 0
        
        daysEl.innerHTML = '';
        
        // Previous month days
        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = new Date(year, month - 1, day);
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day other-month';
            dayEl.textContent = day;
            daysEl.appendChild(dayEl);
        }
        
        // Current month days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
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
            
            if (selectedDate && date.getTime() === selectedDate.getTime()) {
                dayEl.classList.add('selected');
            }
            
            if (minDate && date < minDate) {
                dayEl.classList.add('disabled');
            }
            
            daysEl.appendChild(dayEl);
        }
        
        // Next month days
        const totalCells = startingDayOfWeek + daysInMonth;
        const remainingCells = 42 - totalCells; // 6 rows * 7 days
        for (let day = 1; day <= remainingCells && day <= 14; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day other-month';
            dayEl.textContent = day;
            daysEl.appendChild(dayEl);
        }
    }

    // Check-in calendar
    const checkinInput = document.getElementById('checkin-input');
    const checkinDropdown = document.getElementById('checkin-dropdown');
    let checkinCurrentMonth = new Date();
    let checkinSelectedDate = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkinInput && checkinDropdown) {
        renderCalendar('checkin-dropdown', 'checkin-month-year', 'checkin-calendar-days', 
                      checkinCurrentMonth, checkinSelectedDate, today);
        
        checkinInput.addEventListener('click', (e) => {
            e.stopPropagation();
            checkinDropdown.classList.toggle('active');
        });
        
        document.getElementById('checkin-prev-month').addEventListener('click', (e) => {
            e.stopPropagation();
            checkinCurrentMonth.setMonth(checkinCurrentMonth.getMonth() - 1);
            renderCalendar('checkin-dropdown', 'checkin-month-year', 'checkin-calendar-days', 
                          checkinCurrentMonth, checkinSelectedDate, today);
        });
        
        document.getElementById('checkin-next-month').addEventListener('click', (e) => {
            e.stopPropagation();
            checkinCurrentMonth.setMonth(checkinCurrentMonth.getMonth() + 1);
            renderCalendar('checkin-dropdown', 'checkin-month-year', 'checkin-calendar-days', 
                          checkinCurrentMonth, checkinSelectedDate, today);
        });
        
        document.getElementById('checkin-calendar-days').addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('disabled') && !e.target.classList.contains('other-month')) {
                const date = new Date(e.target.dataset.date);
                checkinSelectedDate = date;
                checkinInput.value = formatDateForInput(date);
                checkinDropdown.classList.remove('active');
                
                // Update checkout calendar
                if (checkoutCurrentMonth) {
                    const minCheckoutDate = new Date(date);
                    minCheckoutDate.setDate(minCheckoutDate.getDate() + 1);
                    renderCalendar('checkout-dropdown', 'checkout-month-year', 'checkout-calendar-days', 
                                  checkoutCurrentMonth, checkoutSelectedDate, minCheckoutDate);
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!checkinInput.contains(e.target) && !checkinDropdown.contains(e.target)) {
                checkinDropdown.classList.remove('active');
            }
        });
    }

    // Check-out calendar
    const checkoutInput = document.getElementById('checkout-input');
    const checkoutDropdown = document.getElementById('checkout-dropdown');
    let checkoutCurrentMonth = new Date();
    checkoutCurrentMonth.setMonth(checkoutCurrentMonth.getMonth() + 1);
    let checkoutSelectedDate = null;
    let minCheckoutDate = new Date(today);
    minCheckoutDate.setDate(minCheckoutDate.getDate() + 1);
    
    if (checkoutInput && checkoutDropdown) {
        renderCalendar('checkout-dropdown', 'checkout-month-year', 'checkout-calendar-days', 
                      checkoutCurrentMonth, checkoutSelectedDate, minCheckoutDate);
        
        checkoutInput.addEventListener('click', (e) => {
            e.stopPropagation();
            checkoutDropdown.classList.toggle('active');
        });
        
        document.getElementById('checkout-prev-month').addEventListener('click', (e) => {
            e.stopPropagation();
            checkoutCurrentMonth.setMonth(checkoutCurrentMonth.getMonth() - 1);
            renderCalendar('checkout-dropdown', 'checkout-month-year', 'checkout-calendar-days', 
                          checkoutCurrentMonth, checkoutSelectedDate, minCheckoutDate);
        });
        
        document.getElementById('checkout-next-month').addEventListener('click', (e) => {
            e.stopPropagation();
            checkoutCurrentMonth.setMonth(checkoutCurrentMonth.getMonth() + 1);
            renderCalendar('checkout-dropdown', 'checkout-month-year', 'checkout-calendar-days', 
                          checkoutCurrentMonth, checkoutSelectedDate, minCheckoutDate);
        });
        
        document.getElementById('checkout-calendar-days').addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('disabled') && !e.target.classList.contains('other-month')) {
                const date = new Date(e.target.dataset.date);
                checkoutSelectedDate = date;
                checkoutInput.value = formatDateForInput(date);
                checkoutDropdown.classList.remove('active');
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!checkoutInput.contains(e.target) && !checkoutDropdown.contains(e.target)) {
                checkoutDropdown.classList.remove('active');
            }
        });
    }

    if (findBtn) {
        findBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const regionValue = regionInput ? String(regionInput.value || '').trim() : '';
            const totalGuests = Math.max(1, adultsCount + childrenCount);
            const checkinIso = toISODate(checkinSelectedDate);
            const checkoutIso = toISODate(checkoutSelectedDate);

            if (checkinSelectedDate && checkoutSelectedDate && checkinSelectedDate >= checkoutSelectedDate) {
                alert('Дата выезда должна быть позже даты заезда.');
                return;
            }

            const params = new URLSearchParams();
            if (regionValue) params.set('region', regionValue);
            if (checkinIso) params.set('checkin', checkinIso);
            if (checkoutIso) params.set('checkout', checkoutIso);
            params.set('adults', String(adultsCount));
            params.set('children', String(childrenCount));
            params.set('guests', String(totalGuests));
            params.set('smart', '1');

            window.location.href = 'catalog.html?' + params.toString();
        });
    }
});

