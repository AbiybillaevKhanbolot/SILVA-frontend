// Страница «Контакты»: отправка формы обратной связи (та же логика, что на главной)
document.addEventListener('DOMContentLoaded', function () {
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackStatus = document.getElementById('feedback-status');

    function showFeedbackStatus(message, isError) {
        if (!feedbackStatus) return;
        feedbackStatus.textContent = message;
        feedbackStatus.style.display = 'block';
        feedbackStatus.style.color = isError ? 'var(--color-red-600, #b91c1c)' : 'var(--color-emerald-700, #047857)';
    }

    if (!feedbackForm) return;

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

            const pagePath = typeof window.location !== 'undefined' ? window.location.pathname : '/legacy/contact.html';
            const ins = await sb.from('feedback_messages').insert({
                name: name,
                email: email,
                message: message,
                user_id: userId,
                source: 'contacts_page',
                page_path: pagePath
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
});
