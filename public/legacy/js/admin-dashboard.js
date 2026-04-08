document.addEventListener('DOMContentLoaded', async function () {
    'use strict';

    var banner = document.getElementById('admin-banner');
    var adminProfile = document.getElementById('admin-profile');
    var statsWrap = document.getElementById('admin-stats');
    var feedbackWrap = document.getElementById('admin-feedback');
    var editBtn = document.getElementById('admin-edit-btn');
    var modal = document.getElementById('admin-edit-modal');
    var modalForm = document.getElementById('admin-modal-form');
    var modalName = document.getElementById('admin-modal-name');
    var modalEmail = document.getElementById('admin-modal-email');
    var modalPhone = document.getElementById('admin-modal-phone');
    var modalAvatarInput = document.getElementById('admin-modal-avatar-input');
    var modalAvatarPreview = document.getElementById('admin-modal-avatar-preview');
    var modalBtnPhoto = document.getElementById('admin-modal-btn-photo');
    var modalBtnRemove = document.getElementById('admin-modal-btn-remove-photo');
    var modalAvatarDataUrl = null;
    var modalAvatarFile = null;
    var modalAvatarRemoved = false;

    function showBanner(message, isError) {
        if (!banner) return;
        banner.style.display = 'flex';
        banner.textContent = message;
        banner.className = isError
            ? 'account-banner account-banner--error'
            : 'account-banner account-banner--success';
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function initialsFromName(name) {
        if (!name || !String(name).trim()) return 'A';
        var p = String(name).trim().split(/\s+/);
        var a = (p[0] && p[0][0]) || '';
        var b = (p[1] && p[1][0]) || '';
        return (a + b).toUpperCase() || a.toUpperCase() || 'A';
    }

    if (!window.silvaSupabaseAuth) {
        showBanner('Supabase не подключен на странице.', true);
        return;
    }

    try {
        await window.silvaSupabaseAuth.syncLocalUserFromSupabase();
    } catch (e) {}

    var me = window.silvaSupabaseAuth.readLocalUser ? window.silvaSupabaseAuth.readLocalUser() : {};
    if (!me || !me.email) {
        window.location.href = 'login.html';
        return;
    }
    if (me.role !== 'admin') {
        window.location.href = 'profile.html';
        return;
    }

    var sb = window.silvaSupabaseAuth.ensureClient();
    if (!sb) {
        showBanner('Не удалось инициализировать Supabase client.', true);
        return;
    }

    function renderAdminProfile() {
        if (!adminProfile) return;
        var avatar = me.avatar
            ? '<img src="' + escapeHtml(me.avatar) + '" alt="" class="profile-avatar-img">'
            : '<span class="profile-avatar-placeholder" aria-hidden="true">' + escapeHtml(initialsFromName(me.name)) + '</span>';
        var nameValue = me.name || '—';
        var phoneValue = me.phone || '—';
        adminProfile.innerHTML =
            '<div class="profile-summary-layout">' +
                '<div class="profile-avatar-wrap" aria-hidden="false">' +
                    '<div class="profile-avatar">' + avatar + '</div>' +
                    '<p class="profile-avatar-hint">Фото видно только вам в этом браузере</p>' +
                '</div>' +
                '<div class="profile-summary-main">' +
                    '<div class="profile-view-fields">' +
                        '<div class="profile-view-row"><span class="profile-view-label">Имя и фамилия</span><span class="profile-view-value">' + escapeHtml(nameValue) + '</span></div>' +
                        '<div class="profile-view-row"><span class="profile-view-label">Электронная почта</span><span class="profile-view-value">' + escapeHtml(me.email || '') + '</span></div>' +
                        '<div class="profile-view-row"><span class="profile-view-label">Телефон</span><span class="profile-view-value">' + escapeHtml(phoneValue) + '</span></div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        if (typeof SilvaIcons !== 'undefined' && SilvaIcons.hydrate) SilvaIcons.hydrate(document);
    }
    renderAdminProfile();

    function effectiveModalHasPhoto() {
        if (modalAvatarRemoved) return false;
        return !!modalAvatarDataUrl;
    }

    function updateModalPhotoUI() {
        if (!modalAvatarPreview) return;
        if (effectiveModalHasPhoto()) {
            modalAvatarPreview.innerHTML =
                '<img src="' + String(modalAvatarDataUrl).replace(/"/g, '') + '" alt="" class="profile-modal-avatar-img">';
        } else {
            modalAvatarPreview.innerHTML =
                '<span class="profile-modal-avatar-placeholder">' + escapeHtml(initialsFromName(modalName && modalName.value ? modalName.value : me.name)) + '</span>';
        }
        if (modalBtnPhoto) {
            modalBtnPhoto.textContent = effectiveModalHasPhoto() ? 'Изменить фото' : 'Добавить фото';
        }
        if (modalBtnRemove) {
            modalBtnRemove.style.display = effectiveModalHasPhoto() ? 'inline-flex' : 'none';
        }
    }

    function readFileAsDataURL(file, cb) {
        if (!file || !file.type.match(/^image\//)) {
            cb(null);
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showBanner('Файл слишком большой. Выберите изображение до 2 МБ.', true);
            cb(null);
            return;
        }
        var r = new FileReader();
        r.onload = function () { cb(r.result); };
        r.onerror = function () { cb(null); };
        r.readAsDataURL(file);
    }

    function openEditModal() {
        if (!modal) return;
        modalAvatarDataUrl = me.avatar || null;
        modalAvatarFile = null;
        modalAvatarRemoved = false;
        if (modalName) modalName.value = me.name || '';
        if (modalEmail) modalEmail.value = me.email || '';
        if (modalPhone) modalPhone.value = me.phone || '';
        updateModalPhotoUI();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeEditModal() {
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (modalAvatarInput) modalAvatarInput.value = '';
    }

    if (editBtn) {
        editBtn.addEventListener('click', openEditModal);
    }

    if (modalBtnPhoto && modalAvatarInput) {
        modalBtnPhoto.addEventListener('click', function () {
            modalAvatarInput.click();
        });
    }

    if (modalAvatarInput) {
        modalAvatarInput.addEventListener('change', function () {
            var f = this.files && this.files[0];
            if (!f) return;
            readFileAsDataURL(f, function (url) {
                if (url) {
                    modalAvatarFile = f;
                    modalAvatarDataUrl = url;
                    modalAvatarRemoved = false;
                    updateModalPhotoUI();
                }
                modalAvatarInput.value = '';
            });
        });
    }

    if (modalBtnRemove) {
        modalBtnRemove.addEventListener('click', function () {
            modalAvatarFile = null;
            modalAvatarDataUrl = null;
            modalAvatarRemoved = true;
            updateModalPhotoUI();
        });
    }

    if (modalName) {
        modalName.addEventListener('input', updateModalPhotoUI);
    }

    var modalCloseX = document.getElementById('admin-modal-x');
    if (modalCloseX) modalCloseX.addEventListener('click', closeEditModal);
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeEditModal();
        });
    }

    if (modalForm) {
        modalForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var submitBtn = modalForm.querySelector('button[type="submit"]');
            var original = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Сохранение...';
            }
            try {
                var nextName = (modalName && modalName.value ? modalName.value : '').trim();
                var nextEmail = (modalEmail && modalEmail.value ? modalEmail.value : '').trim();
                var nextPhone = (modalPhone && modalPhone.value ? modalPhone.value : '').trim();
                if (!nextName || !nextEmail) {
                    showBanner('Заполните имя и email.', true);
                    return;
                }

                var avatarUrl;
                if (modalAvatarRemoved) {
                    avatarUrl = null;
                } else if (modalAvatarFile) {
                    avatarUrl = await window.silvaSupabaseAuth.uploadAvatar(modalAvatarFile);
                } else if (modalAvatarDataUrl && /^https?:\/\//.test(modalAvatarDataUrl)) {
                    avatarUrl = modalAvatarDataUrl;
                }

                var saved = await window.silvaSupabaseAuth.saveProfile({
                    name: nextName,
                    email: nextEmail,
                    phone: nextPhone,
                    avatarUrl: avatarUrl
                });
                if (saved) {
                    me = Object.assign({}, me, saved);
                }
                try {
                    await window.silvaSupabaseAuth.syncLocalUserFromSupabase();
                    var fresh = window.silvaSupabaseAuth.readLocalUser ? window.silvaSupabaseAuth.readLocalUser() : null;
                    if (fresh && fresh.email) me = fresh;
                } catch (errSync) {}

                renderAdminProfile();
                closeEditModal();
                showBanner('Профиль администратора обновлен.', false);
            } catch (err) {
                showBanner(err && err.message ? err.message : 'Не удалось сохранить профиль.', true);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = original || 'Сохранить';
                }
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
            closeEditModal();
        }
    });

    function normalizeRole(role) {
        return String(role || '').trim().toLowerCase();
    }

    async function loadUsers() {
        var q = await sb
            .from('profiles')
            .select('id, full_name, email, role, owner_verification_status, created_at')
            .order('created_at', { ascending: false })
            .limit(1000);
        if (q.error) throw q.error;
        return (q.data || []).map(function (u) {
            return Object.assign({}, u, { role: normalizeRole(u.role) });
        });
    }

    async function countProfiles(whereRole) {
        var query = sb.from('profiles').select('id', { count: 'exact', head: true });
        if (whereRole) query = query.eq('role', whereRole);
        var res = await query;
        if (res.error) throw res.error;
        return Number(res.count || 0);
    }

    async function loadStatsFromSupabase() {
        var total = await countProfiles();
        var guests = await countProfiles('guest');
        var owners = await countProfiles('owner');
        var admins = await countProfiles('admin');
        return {
            total: total,
            guests: guests,
            owners: owners,
            admins: admins
        };
    }

    async function loadFeedback() {
        var q = await sb
            .from('feedback_messages')
            .select('id, name, email, message, created_at')
            .order('created_at', { ascending: false })
            .limit(100);
        if (q.error) throw q.error;
        return q.data || [];
    }

    function statCard(title, value) {
        return (
            '<div style="background:var(--color-white);border:1px solid var(--color-gray-200);border-radius:8px;padding:0.75rem;min-height:92px;display:flex;flex-direction:column;justify-content:space-between;">' +
                '<div style="font-size:0.8125rem;color:var(--color-gray-500);line-height:1.2;">' + escapeHtml(title) + '</div>' +
                '<div style="font-size:1.25rem;font-weight:600;color:var(--color-gray-900);line-height:1;">' + escapeHtml(String(value)) + '</div>' +
            '</div>'
        );
    }

    function renderStats(stats, pendingOwners, feedbackCount) {
        if (!statsWrap) return;
        statsWrap.innerHTML =
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.5rem;">' +
            statCard('Пользователи', stats.total) +
            statCard('Гости', stats.guests) +
            statCard('Владельцы', stats.owners) +
            statCard('Админы', stats.admins) +
            statCard('Владельцы на проверке', pendingOwners) +
            statCard('Сообщения обратной связи', feedbackCount) +
            '</div>';
    }

    function renderFeedback(rows) {
        if (!feedbackWrap) return;
        if (!rows.length) {
            feedbackWrap.innerHTML = '<p style="color:var(--color-gray-500);">Сообщений пока нет.</p>';
            return;
        }
        feedbackWrap.innerHTML = rows.map(function (m) {
            var dt = m.created_at ? new Date(m.created_at).toLocaleString('ru-RU') : '—';
            return (
                '<div class="owner-review-item" style="margin-bottom:0.5rem;">' +
                    '<div class="owner-review-item-body">' +
                        '<div class="owner-review-item-top">' +
                            '<div class="owner-review-guest">' +
                                '<strong class="owner-review-guest-name">' + escapeHtml(m.name || '—') + '</strong>' +
                                '<div class="owner-review-guest-meta">' + escapeHtml(m.email || '') + ' · ' + escapeHtml(dt) + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<p class="review-snippet">' + escapeHtml(m.message || '') + '</p>' +
                    '</div>' +
                '</div>'
            );
        }).join('');
    }

    async function refreshAll() {
        try {
            var users = await loadUsers();
            var feedback = await loadFeedback();
            var stats = await loadStatsFromSupabase();
            var pendingOwners = users.filter(function (u) {
                return normalizeRole(u.role) === 'owner' && String(u.owner_verification_status || '').toLowerCase() === 'pending';
            }).length;
            renderStats(stats, pendingOwners, feedback.length);
            renderFeedback(feedback);
        } catch (err) {
            showBanner(
                (err && err.message ? err.message : 'Не удалось загрузить данные админки.') +
                    ' Добавьте policy для admin на таблицу profiles.',
                true
            );
        }
    }

    await refreshAll();
});
