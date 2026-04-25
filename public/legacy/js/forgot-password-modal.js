/**
 * Firebase: восстановление пароля по ссылке из письма (без шага OTP в модалке).
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
            '<p class="forgot-pw-hint">Введите почту — отправим письмо со ссылкой для сброса пароля.</p>' +
            '<form id="forgot-pw-form-email">' +
            '<input type="email" class="input forgot-pw-input" name="email" placeholder="Почта" required autocomplete="email">' +
            '<button type="submit" class="btn btn-primary forgot-pw-submit">Отправить письмо</button>' +
            '</form></div>' +
            '<div class="forgot-pw-step" data-step="done">' +
            '<p class="forgot-pw-hint">Письмо отправлено. Откройте ссылку из письма, задайте новый пароль и вернитесь для входа.</p>' +
            '<button type="button" class="btn btn-ghost forgot-pw-resend">Отправить письмо снова</button>' +
            '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.querySelector('.forgot-password-close').addEventListener('click', close);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });

        if (window.SilvaIcons && typeof window.SilvaIcons.hydrate === 'function') {
            window.SilvaIcons.hydrate(overlay);
        }

        overlay.querySelector('#forgot-pw-form-email').addEventListener('submit', onSubmitEmail);
        overlay.querySelector('.forgot-pw-resend').addEventListener('click', onResend);

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
        if (emailForm) emailForm.reset();
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
            showStep('done');
        } catch (err) {
            alert(err && err.message ? err.message : 'Не удалось отправить письмо.');
        } finally {
            setBusy(btn, false);
        }
    }

    async function onResend() {
        var auth = getAuth();
        if (!auth || !auth.requestPasswordReset || !state.email) return;
        try {
            await auth.requestPasswordReset(state.email);
            alert('Письмо отправлено повторно.');
        } catch (err) {
            alert(err && err.message ? err.message : 'Не удалось отправить повторно.');
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
