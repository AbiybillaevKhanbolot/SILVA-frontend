/**
 * Модальное окно «Требуется авторизация» и проверка входа.
 * Неавторизованный пользователь не может: оставлять отзыв, использовать кнопки футера (Разместить объект и т.д.).
 * Страницу бронирования и форму гость заполняет без входа; подтверждение оплаты — через showAuthRequiredModal(текст про бронь).
 * Избранное без входа доступно локально.
 */
(function() {
    var defaultAuthMessage =
        'Чтобы выполнить это действие, необходимо войти в аккаунт или зарегистрироваться.';

    function isLoggedIn() {
        try {
            var raw = localStorage.getItem('silva_user');
            if (!raw) return false;
            var user = JSON.parse(raw);
            return user && (user.email || user.name);
        } catch (e) {
            return false;
        }
    }

    var modalEl = null;

    function ensureModal() {
        if (modalEl && document.body.contains(modalEl)) return modalEl;
        modalEl = document.createElement('div');
        modalEl.id = 'auth-required-modal';
        modalEl.className = 'auth-required-overlay';
        modalEl.innerHTML = '<div class="auth-required-modal">' +
            '<button type="button" class="auth-required-close" aria-label="Закрыть">&times;</button>' +
            '<p class="auth-required-text"></p>' +
            '<div class="auth-required-actions">' +
            '<a href="login.html" class="btn btn-primary">Войти</a>' +
            '<a href="register.html" class="btn btn-ghost">Регистрация</a>' +
            '</div></div>';
        document.body.appendChild(modalEl);

        modalEl.querySelector('.auth-required-close').addEventListener('click', closeModal);
        modalEl.addEventListener('click', function(e) {
            if (e.target === modalEl) closeModal();
        });
        var p = modalEl.querySelector('.auth-required-text');
        if (p) p.textContent = defaultAuthMessage;
        return modalEl;
    }

    function closeModal() {
        if (modalEl) modalEl.classList.remove('open');
    }

    /**
     * @param {string} [customMessage] — свой текст; иначе стандартное сообщение.
     */
    function showAuthRequiredModal(customMessage) {
        var el = ensureModal();
        var textEl = el.querySelector('.auth-required-text');
        if (textEl) {
            textEl.textContent =
                typeof customMessage === 'string' && customMessage.trim()
                    ? customMessage.trim()
                    : defaultAuthMessage;
        }
        el.classList.add('open');
    }

    window.isLoggedIn = isLoggedIn;
    window.showAuthRequiredModal = showAuthRequiredModal;
})();
