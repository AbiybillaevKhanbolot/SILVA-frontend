// Footer Component
function initFooter() {
    const footerContainer = document.getElementById('footer-container');
    if (!footerContainer) return;

    const currentYear = new Date().getFullYear();
    const ic = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
    const lh = typeof silvaLegacyHref === 'function' ? silvaLegacyHref : function (f) { return f; };

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
                                ${ic('instagram', 20, 20)}
                            </a>
                            <a href="#" class="footer-social-link" aria-label="Telegram">
                                ${ic('send', 20, 20)}
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 class="footer-column-title">Гостям</h4>
                        <ul class="footer-links">
                            <li><a href="${lh('catalog.html')}" class="footer-link">Каталог</a></li>
                            <li><a href="${lh('contact.html')}" class="footer-link">Контакты</a></li>
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
                            ${ic('phone', 20, 20)}
                            <span>8 (800) 123-45-67</span>
                        </div>
                        <div class="footer-contact-item">
                            ${ic('mail', 20, 20)}
                            <span>info@dachagrad.ru</span>
                        </div>
                        <div class="footer-contact-item">
                            ${ic('map-pin', 20, 20)}
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

