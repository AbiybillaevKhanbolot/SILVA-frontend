/**
 * После signUp без сессии (включено подтверждение почты в Supabase): модалка с вводом кода.
 */
(function () {
    var overlay = null;
    var pendingEmail = '';

    function getAuth() {
        return window.silvaSupabaseAuth;
    }

    function ensureOverlay() {
        if (overlay && document.body.contains(overlay)) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'register-email-confirm-overlay';
        overlay.className = 'auth-required-overlay forgot-password-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'register-confirm-title');
        overlay.innerHTML =
            '<div class="auth-required-modal forgot-password-dialog">' +
            '<button type="button" class="auth-required-close forgot-password-close" aria-label="Закрыть">&times;</button>' +
            '<h2 id="register-confirm-title" class="forgot-password-title">Подтвердите почту</h2>' +
            '<p class="forgot-pw-hint" id="register-confirm-intro"></p>' +
            '<form id="register-confirm-form">' +
            '<input type="text" class="input forgot-pw-input" name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="Код из письма" required>' +
            '<button type="submit" class="btn btn-primary forgot-pw-submit">Подтвердить</button>' +
            '<button type="button" class="btn btn-ghost forgot-pw-resend" id="register-confirm-resend">Отправить код снова</button>' +
            '</form></div>';

        document.body.appendChild(overlay);

        overlay.querySelector('.forgot-password-close').addEventListener('click', close);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
        overlay.querySelector('#register-confirm-form').addEventListener('submit', onSubmit);
        overlay.querySelector('#register-confirm-resend').addEventListener('click', onResend);

        return overlay;
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function setIntro(email) {
        var intro = overlay.querySelector('#register-confirm-intro');
        if (!intro) return;
        var safe = escapeHtml(email);
        intro.innerHTML =
            'Чтобы завершить регистрацию, введите код, который мы отправили на <strong>' +
            safe +
            '</strong>. Проверьте папку «Спам», если письма нет во «Входящих».';
    }

    function setBusy(btn, busy, label) {
        if (!btn) return;
        if (busy) {
            if (!btn.dataset._rcLabel) btn.dataset._rcLabel = btn.textContent;
            btn.disabled = true;
            btn.textContent = label || '…';
        } else {
            btn.disabled = false;
            if (btn.dataset._rcLabel) btn.textContent = btn.dataset._rcLabel;
        }
    }

    function open(email) {
        pendingEmail = String(email || '').trim();
        ensureOverlay();
        setIntro(pendingEmail);
        var form = overlay.querySelector('#register-confirm-form');
        if (form) form.reset();
        overlay.classList.add('open');
        var inp = overlay.querySelector('input[name="code"]');
        if (inp) setTimeout(function () {
            inp.focus();
        }, 50);
    }

    function close() {
        if (overlay) overlay.classList.remove('open');
    }

    async function onSubmit(e) {
        e.preventDefault();
        var auth = getAuth();
        if (!auth || !auth.verifySignupOtp) return;
        var form = e.target;
        var btn = form.querySelector('button[type="submit"]');
        var code = form.code.value;
        try {
            setBusy(btn, true, 'Проверка…');
            await auth.verifySignupOtp(pendingEmail, code);
            close();
            window.location.href = 'index.html';
        } catch (err) {
            var msg = err && err.message ? err.message : 'Код неверный или устарел.';
            alert(msg + ' В шаблоне «Confirm sign up» в Supabase должна быть переменная {{ .Token }}.');
        } finally {
            setBusy(btn, false);
        }
    }

    async function onResend() {
        var auth = getAuth();
        if (!auth || !auth.resendSignupConfirmationEmail || !pendingEmail) return;
        try {
            await auth.resendSignupConfirmationEmail(pendingEmail);
            alert('Письмо с кодом отправлено повторно.');
        } catch (err) {
            alert(err && err.message ? err.message : 'Не удалось отправить повторно.');
        }
    }

    window.openRegisterEmailConfirmModal = open;
    window.closeRegisterEmailConfirmModal = close;
})();
