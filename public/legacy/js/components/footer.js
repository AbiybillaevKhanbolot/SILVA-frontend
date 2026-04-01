// Footer Component
function initFooter() {
    const footerContainer = document.getElementById('footer-container');
    if (!footerContainer) return;

    const currentYear = new Date().getFullYear();

    footerContainer.innerHTML = `
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-grid">
                    <div class="footer-brand">
                        <a href="index.html" class="footer-logo">
                            <div class="footer-logo-icon">
                                <img src="images/logo.svg" alt="SILVA" style="width: 100%; height: 100%; object-fit: contain;">
                            </div>
                            <span class="footer-logo-text">SILVA</span>
                        </a>
                        <p class="footer-description">
                            Маркетплейс загородного отдыха для тех, кто ценит тишину, 
                            природу и качественный сервис.
                        </p>
                        <div class="footer-social">
                            <a href="#" class="footer-social-link" aria-label="Instagram">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                </svg>
                            </a>
                            <a href="#" class="footer-social-link" aria-label="Telegram">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 class="footer-column-title">Гостям</h4>
                        <ul class="footer-links">
                            <li><a href="catalog.html" class="footer-link">Каталог</a></li>
                            <li><a href="#" class="footer-link">Как забронировать</a></li>
                            <li><a href="loyalty.html" class="footer-link">Программа лояльности</a></li>
                            <li><a href="#" class="footer-link">Отзывы</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 class="footer-column-title">Владельцам</h4>
                        <ul class="footer-links">
                            <li><a href="#" class="footer-link footer-link-require-auth">Разместить объект</a></li>
                            <li><a href="#" class="footer-link footer-link-require-auth">Условия сотрудничества</a></li>
                            <li><a href="#" class="footer-link footer-link-require-auth">Личный кабинет</a></li>
                            <li><a href="#" class="footer-link footer-link-require-auth">Поддержка</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 class="footer-column-title">Контакты</h4>
                        <div class="footer-contact-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <span>8 (800) 123-45-67</span>
                        </div>
                        <div class="footer-contact-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <span>info@dachagrad.ru</span>
                        </div>
                        <div class="footer-contact-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>Москва, ул. Природная, 42</span>
                        </div>
                    </div>
                </div>

                <div class="footer-bottom">
                    <p class="footer-copyright">
                        © ${currentYear} Silva. Все права защищены.
                    </p>
                    <div class="footer-legal">
                        <a href="#" class="footer-legal-link">Пользовательское соглашение</a>
                        <a href="#" class="footer-legal-link">Политика конфиденциальности</a>
                        <a href="#" class="footer-legal-link">Условия оплаты</a>
                    </div>
                </div>
            </div>
        </footer>
    `;
    
    footerContainer.querySelectorAll('.footer-link-require-auth').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
                if (typeof window.showAuthRequiredModal === 'function') window.showAuthRequiredModal();
            }
        });
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
} else {
    initFooter();
}

