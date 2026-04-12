// Footer Component
function initFooter() {
    const footerContainer = document.getElementById('footer-container');
    if (!footerContainer) return;

    const currentYear = new Date().getFullYear();
    const ic = typeof SilvaIcons !== 'undefined' ? SilvaIcons.svg.bind(SilvaIcons) : function () { return ''; };
    const lh = typeof silvaLegacyHref === 'function' ? silvaLegacyHref : function (f) { return f; };

    var mapsOfficeUrl =
        'https://yandex.ru/maps/?text=' +
        encodeURIComponent('Санкт-Петербург, проспект Ударников, 29 к 1');

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
                            <a href="mailto:sillvva.001@gmail.com" class="footer-social-link" aria-label="Написать на почту">
                                ${ic('mail', 20, 20)}
                            </a>
                            <a href="https://t.me/@khan_fs" class="footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                                ${ic('send', 20, 20)}
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 class="footer-column-title">Гостям</h4>
                        <ul class="footer-links">
                            <li><a href="${lh('catalog.html')}" class="footer-link">Каталог</a></li>
                            <li><a href="${lh('contact.html')}" class="footer-link">Контакты</a></li>
                            <li><a href="${lh('loyalty.html')}" class="footer-link">Программа лояльности</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 class="footer-column-title">Владельцам</h4>
                        <ul class="footer-links">
                            <li><a href="${lh('owner-properties.html')}" class="footer-link footer-link-place-object">Разместить объект</a></li>
                            <li><a href="${lh('profile.html')}" class="footer-link footer-link-profile">Личный кабинет</a></li>
                            <li><a href="${lh('contact.html')}" class="footer-link">Поддержка</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 class="footer-column-title">Контакты</h4>
                        <a href="tel:+79618084453" class="footer-contact-item" aria-label="Позвонить: 8 (961) 808 4453">
                            ${ic('phone', 20, 20)}
                            <span>8 (961) 808 4453</span>
                        </a>
                        <a href="mailto:sillvva.001@gmail.com" class="footer-contact-item" aria-label="Написать на sillvva.001@gmail.com">
                            ${ic('mail', 20, 20)}
                            <span>sillvva.001@gmail.com</span>
                        </a>
                        <a href="${mapsOfficeUrl}" class="footer-contact-item" target="_blank" rel="noopener noreferrer" aria-label="Открыть адрес офиса на карте">
                            ${ic('map-pin', 20, 20)}
                            <span>Пр.Ударников д. 29 к. 1</span>
                        </a>
                    </div>
                </div>

                <div class="footer-bottom">
                    <p class="footer-copyright">
                        © ${currentYear} Silva. Все права защищены.
                    </p>
                    <div class="footer-legal">
                        <a href="${lh('user-agreement.html')}" class="footer-legal-link">Пользовательское соглашение</a>
                        <a href="${lh('terms.html')}" class="footer-legal-link">Условия использования</a>
                        <a href="${lh('privacy.html')}" class="footer-legal-link">Политика конфиденциальности</a>
                        <a href="${lh('payment-terms.html')}" class="footer-legal-link">Условия оплаты</a>
                    </div>
                </div>
            </div>
        </footer>
    `;
    
    function footerLocalUserRole() {
        try {
            var raw = localStorage.getItem('silva_user');
            if (!raw) return null;
            var u = JSON.parse(raw);
            if (!u) return null;
            return (u.role != null ? String(u.role) : 'guest').toLowerCase();
        } catch (err) {
            return null;
        }
    }

    function footerIsOwnerOrAdmin() {
        var r = footerLocalUserRole();
        return r === 'owner' || r === 'admin';
    }

    var placeObjectLink = footerContainer.querySelector('.footer-link-place-object');
    if (placeObjectLink) {
        placeObjectLink.addEventListener('click', function (e) {
            if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) {
                e.preventDefault();
                if (typeof window.showAuthRequiredModal === 'function') {
                    window.showAuthRequiredModal(
                        'Чтобы разместить объект, войдите в аккаунт владельца или зарегистрируйтесь с ролью владельца и пройдите подтверждение аккаунта.'
                    );
                }
                return;
            }
            if (!footerIsOwnerOrAdmin()) {
                e.preventDefault();
                if (typeof window.showAuthRequiredModal === 'function') {
                    window.showAuthRequiredModal(
                        'Размещать объекты могут только владельцы. Если у вас аккаунт гостя, зарегистрируйтесь как владелец и дождитесь подтверждения аккаунта владельца.'
                    );
                }
            }
        });
    }

    var profileLink = footerContainer.querySelector('.footer-link-profile');
    if (profileLink) {
        profileLink.addEventListener('click', function (e) {
            if (typeof window.isLoggedIn === 'function' && window.isLoggedIn()) {
                return;
            }
            e.preventDefault();
            if (typeof window.showAuthRequiredModal === 'function') {
                window.showAuthRequiredModal(
                    'Войдите в аккаунт или зарегистрируйтесь, чтобы открыть личный кабинет.'
                );
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
} else {
    initFooter();
}

