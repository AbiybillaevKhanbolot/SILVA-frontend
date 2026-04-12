/**
 * Многошаговое восстановление пароля на странице входа:
 * почта → код из письма → новый пароль → выход из recovery-сессии и закрытие (вход вручную).
 */
(function () {
    var overlay = null;
    var state = { email: '' };

    function getAuth() {
        return window.silvaSupabaseAuth;
    }

    function ensureOverlay() {
        if (overlay && document.body.contains(overlay)) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'forgot-password-overlay';
        overlay.className = 'auth-required-overlay forgot-password-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'forgot-password-title');
        overlay.innerHTML =
            '<div class="auth-required-modal forgot-password-dialog">' +
            '<button type="button" class="auth-required-close forgot-password-close" aria-label="Закрыть">&times;</button>' +
            '<h2 id="forgot-password-title" class="forgot-password-title">Восстановление пароля</h2>' +

            '<div class="forgot-pw-step is-active" data-step="email">' +
            '<p class="forgot-pw-hint">Введите почту — отправим код для подтверждения.</p>' +
            '<form id="forgot-pw-form-email">' +
            '<input type="email" class="input forgot-pw-input" name="email" placeholder="Почта" required autocomplete="email">' +
            '<button type="submit" class="btn btn-primary forgot-pw-submit">Отправить код</button>' +
            '</form></div>' +

            '<div class="forgot-pw-step" data-step="code">' +
            '<p class="forgot-pw-hint">Введите код из письма.</p>' +
            '<form id="forgot-pw-form-code">' +
            '<input type="text" class="input forgot-pw-input" name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="Код" required>' +
            '<button type="submit" class="btn btn-primary forgot-pw-submit">Подтвердить</button>' +
            '<button type="button" class="btn btn-ghost forgot-pw-resend">Отправить код снова</button>' +
            '</form></div>' +

            '<div class="forgot-pw-step" data-step="password">' +
            '<p class="forgot-pw-hint">Придумайте новый пароль.</p>' +
            '<form id="forgot-pw-form-password">' +
            '<div class="auth-password-field">' +
            '<input type="password" class="input auth-login-input forgot-pw-input" name="password" id="forgot-pw-new" placeholder="Новый пароль" required autocomplete="new-password" minlength="6">' +
            '<button type="button" class="auth-password-toggle" id="forgot-pw-toggle-1" aria-label="Показать пароль" aria-pressed="false">' +
            '<span class="silva-icon auth-pw-icon auth-pw-icon--off" data-icon="eye-off" data-w="18" data-h="18" aria-hidden="true"></span>' +
            '<span class="silva-icon auth-pw-icon auth-pw-icon--on auth-pw-icon--hidden" data-icon="eye" data-w="18" data-h="18" aria-hidden="true"></span>' +
            '</button></div>' +
            '<div class="auth-password-field">' +
            '<input type="password" class="input auth-login-input forgot-pw-input" name="password2" id="forgot-pw-repeat" placeholder="Повторите пароль" required autocomplete="new-password" minlength="6">' +
            '<button type="button" class="auth-password-toggle" id="forgot-pw-toggle-2" aria-label="Показать пароль" aria-pressed="false">' +
            '<span class="silva-icon auth-pw-icon auth-pw-icon--off" data-icon="eye-off" data-w="18" data-h="18" aria-hidden="true"></span>' +
            '<span class="silva-icon auth-pw-icon auth-pw-icon--on auth-pw-icon--hidden" data-icon="eye" data-w="18" data-h="18" aria-hidden="true"></span>' +
            '</button></div>' +
            '<button type="submit" class="btn btn-primary forgot-pw-submit">Сохранить пароль</button>' +
            '</form></div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.querySelector('.forgot-password-close').addEventListener('click', close);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });

        function bindPwToggle(toggleId, inputId) {
            var pwd = overlay.querySelector('#' + inputId);
            var toggle = overlay.querySelector('#' + toggleId);
            if (!pwd || !toggle) return;
            toggle.addEventListener('click', function () {
                var show = pwd.type === 'password';
                pwd.type = show ? 'text' : 'password';
                toggle.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
                toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
                var off = toggle.querySelector('.auth-pw-icon--off');
                var on = toggle.querySelector('.auth-pw-icon--on');
                if (off) off.classList.toggle('auth-pw-icon--hidden', show);
                if (on) on.classList.toggle('auth-pw-icon--hidden', !show);
            });
        }
        bindPwToggle('forgot-pw-toggle-1', 'forgot-pw-new');
        bindPwToggle('forgot-pw-toggle-2', 'forgot-pw-repeat');

        if (window.SilvaIcons && typeof window.SilvaIcons.hydrate === 'function') {
            window.SilvaIcons.hydrate(overlay);
        }

        overlay.querySelector('#forgot-pw-form-email').addEventListener('submit', onSubmitEmail);
        overlay.querySelector('#forgot-pw-form-code').addEventListener('submit', onSubmitCode);
        overlay.querySelector('.forgot-pw-resend').addEventListener('click', onResend);
        overlay.querySelector('#forgot-pw-form-password').addEventListener('submit', onSubmitPassword);

        return overlay;
    }

    function showStep(name) {
        var steps = overlay.querySelectorAll('.forgot-pw-step');
        for (var i = 0; i < steps.length; i++) {
            steps[i].classList.toggle('is-active', steps[i].getAttribute('data-step') === name);
        }
    }

    function setBusy(btn, busy, label) {
        if (!btn) return;
        if (busy) {
            if (!btn.dataset._fpLabel) btn.dataset._fpLabel = btn.textContent;
            btn.disabled = true;
            btn.textContent = label || '…';
        } else {
            btn.disabled = false;
            if (btn.dataset._fpLabel) btn.textContent = btn.dataset._fpLabel;
        }
    }

    function open() {
        ensureOverlay();
        state.email = '';
        var emailForm = overlay.querySelector('#forgot-pw-form-email');
        var codeForm = overlay.querySelector('#forgot-pw-form-code');
        var passForm = overlay.querySelector('#forgot-pw-form-password');
        if (emailForm) emailForm.reset();
        if (codeForm) codeForm.reset();
        if (passForm) passForm.reset();
        showStep('email');
        overlay.classList.add('open');
        var first = overlay.querySelector('.forgot-pw-step.is-active input');
        if (first) setTimeout(function () {
            first.focus();
        }, 50);
    }

    function close() {
        if (overlay) overlay.classList.remove('open');
        try {
            var u = new URL(window.location.href);
            if (u.searchParams.get('recover') === '1') {
                u.searchParams.delete('recover');
                window.history.replaceState({}, '', u.pathname + (u.search ? u.search : '') + u.hash);
            }
        } catch (e) {}
    }

    async function onSubmitEmail(e) {
        e.preventDefault();
        var auth = getAuth();
        if (!auth || !auth.requestPasswordReset) {
            alert('Не загружен клиент авторизации.');
            return;
        }
        var form = e.target;
        var btn = form.querySelector('button[type="submit"]');
        var email = form.email.value.trim();
        try {
            setBusy(btn, true, 'Отправка…');
            await auth.requestPasswordReset(email);
            state.email = email;
            showStep('code');
            var codeInput = overlay.querySelector('#forgot-pw-form-code input[name="code"]');
            if (codeInput) codeInput.focus();
        } catch (err) {
            alert(err && err.message ? err.message : 'Не удалось отправить письмо.');
        } finally {
            setBusy(btn, false);
        }
    }

    async function onSubmitCode(e) {
        e.preventDefault();
        var auth = getAuth();
        if (!auth || !auth.verifyPasswordRecoveryOtp) return;
        var form = e.target;
        var btn = form.querySelector('button[type="submit"]');
        var code = form.code.value;
        try {
            setBusy(btn, true, 'Проверка…');
            await auth.verifyPasswordRecoveryOtp(state.email, code);
            showStep('password');
            var p = overlay.querySelector('#forgot-pw-new');
            if (p) p.focus();
        } catch (err) {
            var msg = err && err.message ? err.message : 'Неверный или просроченный код.';
            alert(msg + ' Если в письме только ссылка, в шаблоне письма сброса в Supabase добавьте {{ .Token }}.');
        } finally {
            setBusy(btn, false);
        }
    }

    async function onResend() {
        var auth = getAuth();
        if (!auth || !auth.requestPasswordReset || !state.email) return;
        try {
            await auth.requestPasswordReset(state.email);
            alert('Код отправлен повторно.');
        } catch (err) {
            alert(err && err.message ? err.message : 'Не удалось отправить повторно.');
        }
    }

    async function onSubmitPassword(e) {
        e.preventDefault();
        var auth = getAuth();
        if (!auth || !auth.setNewPasswordAfterRecovery) return;
        var form = e.target;
        var btn = form.querySelector('button[type="submit"]');
        var p1 = form.password.value;
        var p2 = form.password2.value;
        if (p1 !== p2) {
            alert('Пароли не совпадают.');
            return;
        }
        try {
            setBusy(btn, true, 'Сохранение…');
            await auth.setNewPasswordAfterRecovery(p1);
            close();
            alert('Пароль обновлён. Войдите с новым паролем.');
            var loginEmail = document.querySelector('#login-form input[name="email"]');
            var loginPwd = document.querySelector('#login-form input[name="password"]');
            if (loginEmail) {
                loginEmail.value = state.email;
                loginEmail.focus();
            }
            if (loginPwd) loginPwd.value = '';
        } catch (err) {
            alert(err && err.message ? err.message : 'Не удалось сохранить пароль.');
        } finally {
            setBusy(btn, false);
        }
    }

    function bindOpeners() {
        var btn = document.getElementById('open-forgot-modal');
        if (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                open();
            });
        }
        try {
            if (new URLSearchParams(window.location.search).get('recover') === '1') {
                open();
            }
        } catch (e2) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindOpeners);
    } else {
        bindOpeners();
    }

    window.openForgotPasswordModal = open;
    window.closeForgotPasswordModal = close;
})();
