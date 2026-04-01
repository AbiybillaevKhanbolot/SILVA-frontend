/**
 * Модальное окно «Требуется авторизация» и проверка входа.
 * Неавторизованный пользователь не может: добавлять в избранное, бронировать, оставлять отзыв, использовать кнопки футера (Разместить объект и т.д.)
 */
(function() {
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
            '<p class="auth-required-text">Чтобы выполнить это действие, необходимо войти или зарегистрироваться.</p>' +
            '<div class="auth-required-actions">' +
            '<a href="login.html" class="btn btn-primary">Войти</a>' +
            '<a href="register.html" class="btn btn-ghost">Регистрация</a>' +
            '</div></div>';
        document.body.appendChild(modalEl);

        modalEl.querySelector('.auth-required-close').addEventListener('click', closeModal);
        modalEl.addEventListener('click', function(e) {
            if (e.target === modalEl) closeModal();
        });
        return modalEl;
    }

    function closeModal() {
        if (modalEl) modalEl.classList.remove('open');
    }

    function showAuthRequiredModal() {
        var el = ensureModal();
        el.classList.add('open');
    }

    window.isLoggedIn = isLoggedIn;
    window.showAuthRequiredModal = showAuthRequiredModal;
})();
