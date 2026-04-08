/**
 * Личный кабинет: просмотр и редактирование профиля с синхронизацией в Supabase.
 */
(function () {
    'use strict';

    var LEVELS = [
        { name: 'Семечко', key: 'seed', points: 0, discount: 0, icon: '🌱', short: 'Старт программы: баллы после каждой оплаченной брони.', benefits: ['Накопление баллов', 'Новости и акции'] },
        { name: 'Росток', key: 'sprout', points: 1000, discount: 3, icon: '🌿', short: 'Скидка и приоритет при новых объектах.', benefits: ['Скидка 3%', 'Ранний доступ к новым объектам', 'Приоритетная поддержка'] },
        { name: 'Саженец', key: 'sapling', points: 3000, discount: 6, icon: '🌳', short: 'Выше скидка и бонусы к особым датам.', benefits: ['Скидка 6%', 'Гибкая отмена', 'Подарок на день рождения'] },
        { name: 'Дерево', key: 'tree', points: 7000, discount: 10, icon: '🌲', short: 'Максимальная скидка и VIP-поддержка.', benefits: ['Скидка 10%', 'Гарантия лучшей цены', 'VIP-поддержка 24/7'] }
    ];

    function getCurrentUserEmail() {
        try {
            var u = JSON.parse(localStorage.getItem('silva_user') || '{}');
            return (u && u.email ? String(u.email) : '').trim().toLowerCase();
        } catch (e) {
            return '';
        }
    }

    function loyaltyPointsKey() {
        var email = getCurrentUserEmail();
        return email ? 'silva_loyalty_points_' + email : 'silva_loyalty_points';
    }

    function personalBookingsKey() {
        var email = getCurrentUserEmail();
        return email ? 'silva_bookings_' + email : 'silva_bookings';
    }

    function getLoyaltyPoints() {
        try {
            var bookings = JSON.parse(localStorage.getItem(personalBookingsKey()) || '[]');
            if (!Array.isArray(bookings) || bookings.length === 0) return 0;
            var raw = localStorage.getItem(loyaltyPointsKey());
            if (raw !== null && raw !== '') return parseInt(raw, 10) || 0;
        } catch (e) {}
        return 0;
    }

    function getLevelState(points) {
        var i;
        var current = LEVELS[0];
        for (i = 0; i < LEVELS.length; i++) {
            var L = LEVELS[i];
            var next = LEVELS[i + 1];
            if (points >= L.points && (!next || points < next.points)) {
                current = L;
                break;
            }
        }
        var idx = LEVELS.indexOf(current);
        var nextLevel = LEVELS[idx + 1] || null;
        var progressPct = 100;
        if (nextLevel && nextLevel.points > current.points) {
            progressPct = ((points - current.points) / (nextLevel.points - current.points)) * 100;
            progressPct = Math.max(0, Math.min(100, progressPct));
        }
        return { current: current, next: nextLevel, progressPct: progressPct, points: points };
    }

    function loadUser() {
        try {
            return JSON.parse(localStorage.getItem('silva_user') || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveUser(u) {
        localStorage.setItem('silva_user', JSON.stringify(u));
    }

    function initialsFromName(name) {
        if (!name || !String(name).trim()) return '?';
        var p = String(name).trim().split(/\s+/);
        var a = (p[0] && p[0][0]) || '';
        var b = (p[1] && p[1][0]) || '';
        return (a + b).toUpperCase() || a.toUpperCase() || '?';
    }

    function renderViewAvatar(container, avatarUrl, name) {
        if (!container) return;
        if (avatarUrl) {
            container.innerHTML =
                '<img src="' +
                avatarUrl.replace(/"/g, '') +
                '" alt="" class="profile-avatar-img">';
        } else {
            container.innerHTML =
                '<span class="profile-avatar-placeholder" aria-hidden="true">' +
                escapeHtml(initialsFromName(name)) +
                '</span>';
        }
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function renderViewFields(u) {
        var el = document.getElementById('profile-view-fields');
        if (!el) return;
        el.innerHTML =
            '<div class="profile-view-row">' +
            '<span class="profile-view-label">Имя и фамилия</span>' +
            '<span class="profile-view-value" id="profile-view-name">' +
            escapeHtml(u.name || '—') +
            '</span></div>' +
            '<div class="profile-view-row">' +
            '<span class="profile-view-label">Электронная почта</span>' +
            '<span class="profile-view-value" id="profile-view-email">' +
            escapeHtml(u.email || '—') +
            '</span></div>' +
            '<div class="profile-view-row">' +
            '<span class="profile-view-label">Телефон</span>' +
            '<span class="profile-view-value" id="profile-view-phone">' +
            escapeHtml(u.phone || '—') +
            '</span></div>' +
            '<div class="profile-view-row">' +
            '<span class="profile-view-label">Рассылка</span>' +
            '<span class="profile-view-value" id="profile-view-newsletter">' +
            (u.newsletter ? 'Да, новости и спецпредложения' : 'Нет') +
            '</span></div>';
    }

    function renderLoyaltyCard() {
        var pts = getLoyaltyPoints();
        var st = getLevelState(pts);
        var cur = st.current;
        var next = st.next;

        var ptsEl = document.getElementById('loyalty-card-points');
        var levelEl = document.getElementById('loyalty-card-level');
        var discountEl = document.getElementById('loyalty-card-discount');
        var barEl = document.getElementById('loyalty-card-bar-fill');
        var nextTxtEl = document.getElementById('loyalty-card-next-text');
        var shortEl = document.getElementById('loyalty-card-short');
        var benefitsEl = document.getElementById('loyalty-card-benefits');

        if (ptsEl) ptsEl.textContent = pts.toLocaleString('ru-RU');
        if (levelEl) levelEl.textContent = cur.name;
        if (discountEl) discountEl.textContent = String(cur.discount);
        if (barEl) barEl.style.width = st.progressPct + '%';

        if (nextTxtEl) {
            if (next) {
                nextTxtEl.textContent =
                    'До уровня «' + next.name + '»: ещё ' + (next.points - pts).toLocaleString('ru-RU') + ' баллов';
            } else {
                nextTxtEl.textContent = 'Вы на высшем уровне программы';
            }
        }
        if (shortEl) {
            shortEl.textContent =
                'Баллы начисляются после оплаты брони — примерно 1 балл за каждые 100 ₽.';
        }

        if (benefitsEl) {
            benefitsEl.innerHTML = (cur.benefits || [])
                .map(function (b) {
                    return (
                        '<li class="loyalty-perk-row">' +
                        '<span class="loyalty-perk-mark" aria-hidden="true"></span>' +
                        '<span class="loyalty-perk-text">' +
                        escapeHtml(b) +
                        '</span></li>'
                    );
                })
                .join('');
        }
    }

    function getOwnerVerificationStatus(user) {
        var raw = user && user.ownerVerificationStatus;
        if (raw === 'verified' || raw === 'rejected') return raw;
        return 'pending';
    }

    function getOwnerStatusMeta(status) {
        if (status === 'verified') {
            return {
                badgeText: 'Подтвержден',
                badgeClass: 'owner-verification-badge owner-verification-badge--verified',
                text: 'Аккаунт подтвержден. Теперь вы можете добавлять и публиковать свои объекты.',
                note: 'Статус обновляется в личном кабинете.'
            };
        }
        if (status === 'rejected') {
            return {
                badgeText: 'Отклонен',
                badgeClass: 'owner-verification-badge owner-verification-badge--rejected',
                text: 'Проверка не пройдена. Пока статус не изменится, добавление объектов недоступно.',
                note: 'Проверьте данные и попробуйте отправить запрос снова.'
            };
        }
        return {
            badgeText: 'На проверке',
            badgeClass: 'owner-verification-badge owner-verification-badge--pending',
            text: 'Ваш аккаунт владельца отправлен на подтверждение. Добавление объектов откроется после одобрения.',
            note: 'Обычно проверка занимает до 24 часов.'
        };
    }

    function renderSecondaryCard(u) {
        var titleEl = document.getElementById('profile-secondary-title');
        var contentEl = document.getElementById('profile-secondary-card-content');
        if (!titleEl || !contentEl) return;

        if (u && u.role === 'owner') {
            var status = getOwnerVerificationStatus(u);
            var meta = getOwnerStatusMeta(status);
            titleEl.innerHTML =
                '<span class="silva-icon" data-icon="shield-check" data-w="20" data-h="20" aria-hidden="true"></span>' +
                'Подтверждение аккаунта';
            contentEl.innerHTML =
                '<div class="owner-verification-card">' +
                '<div class="' +
                meta.badgeClass +
                '">' +
                escapeHtml(meta.badgeText) +
                '</div>' +
                '<p class="owner-verification-text">' +
                escapeHtml(meta.text) +
                '</p>' +
                '<p class="owner-verification-note">' +
                escapeHtml(meta.note) +
                '</p>' +
                '</div>';
            return;
        }

        titleEl.innerHTML =
            '<span class="silva-icon" data-icon="sprout" data-w="20" data-h="20" aria-hidden="true"></span>' +
            'Виртуальный сад';
        contentEl.innerHTML =
            '<div class="loyalty-dashboard">' +
            '<div class="loyalty-dashboard-top">' +
            '<div class="loyalty-dashboard-stats">' +
            '<div class="loyalty-dashboard-points-line">' +
            '<span class="loyalty-dashboard-points" id="loyalty-card-points">0</span>' +
            '<span class="loyalty-dashboard-points-unit">баллов</span>' +
            '</div>' +
            '<div class="loyalty-dashboard-level-row">' +
            '<span class="loyalty-dashboard-level-name" id="loyalty-card-level">Семечко</span>' +
            '<span class="loyalty-dashboard-discount" id="loyalty-discount-wrap">скидка <span id="loyalty-card-discount">0</span>%</span>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="loyalty-dashboard-progress">' +
            '<p class="loyalty-dashboard-progress-text" id="loyalty-card-next-text"></p>' +
            '<div class="loyalty-dashboard-bar">' +
            '<div class="loyalty-dashboard-bar-fill" id="loyalty-card-bar-fill"></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="loyalty-perks-block">' +
            '<h3 class="loyalty-perks-heading">Привилегии уровня</h3>' +
            '<ul class="loyalty-perks-list" id="loyalty-card-benefits"></ul>' +
            '</div>' +
            '<div class="loyalty-dashboard-footer">' +
            '<p class="loyalty-dashboard-footnote" id="loyalty-card-short"></p>' +
            '<a href="loyalty.html" class="btn btn-primary loyalty-dashboard-cta">Программа лояльности</a>' +
            '</div>';
        renderLoyaltyCard();
    }

    var modalAvatarDataUrl = null;
    var modalAvatarFile = null;
    var modalAvatarRemoved = false;

    function openModal() {
        var u = loadUser();
        modalAvatarDataUrl = u.avatar || null;
        modalAvatarFile = null;
        modalAvatarRemoved = false;

        document.getElementById('modal-name').value = u.name || '';
        document.getElementById('modal-email').value = u.email || '';
        document.getElementById('modal-phone').value = u.phone || '';
        document.getElementById('modal-newsletter').checked = !!u.newsletter;

        updateModalPhotoUI();
        var overlay = document.getElementById('profile-edit-modal');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        var overlay = document.getElementById('profile-edit-modal');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
        var fin = document.getElementById('modal-avatar-input');
        if (fin) fin.value = '';
    }

    function effectiveModalHasPhoto() {
        if (modalAvatarRemoved) return false;
        return !!modalAvatarDataUrl;
    }

    function updateModalPhotoUI() {
        var preview = document.getElementById('modal-avatar-preview');
        var btnPhoto = document.getElementById('modal-btn-photo');
        var btnDel = document.getElementById('modal-btn-remove-photo');
        var u = loadUser();
        var name = document.getElementById('modal-name').value || u.name;

        if (preview) {
            if (effectiveModalHasPhoto()) {
                preview.innerHTML =
                    '<img src="' +
                    modalAvatarDataUrl.replace(/"/g, '') +
                    '" alt="" class="profile-modal-avatar-img">';
            } else {
                preview.innerHTML =
                    '<span class="profile-modal-avatar-placeholder">' +
                    escapeHtml(initialsFromName(name)) +
                    '</span>';
            }
        }
        if (btnPhoto) {
            btnPhoto.textContent = effectiveModalHasPhoto() ? 'Изменить фото' : 'Добавить фото';
        }
        if (btnDel) {
            btnDel.style.display = effectiveModalHasPhoto() ? 'inline-flex' : 'none';
        }
    }

    function readFileAsDataURL(file, cb) {
        if (!file || !file.type.match(/^image\//)) {
            cb(null);
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('Файл слишком большой. Выберите изображение до 2 МБ.');
            cb(null);
            return;
        }
        var r = new FileReader();
        r.onload = function () {
            cb(r.result);
        };
        r.onerror = function () {
            cb(null);
        };
        r.readAsDataURL(file);
    }

    document.addEventListener('DOMContentLoaded', async function () {
        if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.syncLocalUserFromSupabase === 'function') {
            try {
                await window.silvaSupabaseAuth.syncLocalUserFromSupabase();
            } catch (e) {}
        }
        if (!localStorage.getItem('silva_user')) {
            window.location.href = 'login.html';
            return;
        }

        if (typeof SilvaIcons !== 'undefined' && SilvaIcons.hydrate) SilvaIcons.hydrate(document);

        function refreshPage() {
            var u = loadUser();
            renderViewAvatar(document.getElementById('profile-view-avatar'), u.avatar, u.name);
            renderViewFields(u);
            renderSecondaryCard(u);
        }

        refreshPage();

        document.getElementById('profile-open-edit').addEventListener('click', openModal);

        document.getElementById('profile-logout-btn').addEventListener('click', function () {
            if (typeof window.silvaOpenLogoutConfirmModal === 'function') {
                window.silvaOpenLogoutConfirmModal();
            } else {
                localStorage.removeItem('silva_user');
                window.location.href = 'index.html';
            }
        });

        document.getElementById('profile-modal-x').addEventListener('click', closeModal);
        document.getElementById('profile-edit-modal').addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });

        document.getElementById('modal-name').addEventListener('input', function () {
            updateModalPhotoUI();
        });

        document.getElementById('modal-btn-photo').addEventListener('click', function () {
            document.getElementById('modal-avatar-input').click();
        });

        document.getElementById('modal-avatar-input').addEventListener('change', function () {
            var f = this.files && this.files[0];
            if (!f) return;
            readFileAsDataURL(f, function (url) {
                if (url) {
                    modalAvatarFile = f;
                    modalAvatarDataUrl = url;
                    modalAvatarRemoved = false;
                    updateModalPhotoUI();
                }
                document.getElementById('modal-avatar-input').value = '';
            });
        });

        document.getElementById('modal-btn-remove-photo').addEventListener('click', function () {
            modalAvatarFile = null;
            modalAvatarDataUrl = null;
            modalAvatarRemoved = true;
            updateModalPhotoUI();
        });

        document.getElementById('profile-modal-form').addEventListener('submit', async function (e) {
            e.preventDefault();
            var submitBtn = this.querySelector('button[type="submit"]');
            var originalBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Сохранение...';
            }
            var prev = loadUser();
            var next = Object.assign({}, prev, {
                name: document.getElementById('modal-name').value.trim(),
                email: document.getElementById('modal-email').value.trim(),
                phone: document.getElementById('modal-phone').value.trim(),
                newsletter: document.getElementById('modal-newsletter').checked
            });

            try {
                var supabase = window.silvaSupabaseAuth;
                if (supabase) {
                    var avatarUrl;
                    if (modalAvatarRemoved) {
                        avatarUrl = null;
                    } else if (modalAvatarFile) {
                        avatarUrl = await supabase.uploadAvatar(modalAvatarFile);
                    } else if (modalAvatarDataUrl && /^https?:\/\//.test(modalAvatarDataUrl)) {
                        avatarUrl = modalAvatarDataUrl;
                    }
                    var saved = await supabase.saveProfile({
                        name: next.name,
                        email: next.email,
                        phone: next.phone,
                        newsletter: next.newsletter,
                        avatarUrl: avatarUrl
                    });
                    if (saved) {
                        next = Object.assign({}, next, saved);
                    }
                }
                saveUser(next);
                closeModal();

                var banner = document.getElementById('profile-saved');
                if (banner) {
                    banner.style.display = 'flex';
                    setTimeout(function () {
                        banner.style.display = 'none';
                    }, 4000);
                }
                if (typeof initHeader === 'function') initHeader();
                refreshPage();
                if (typeof SilvaIcons !== 'undefined' && SilvaIcons.hydrate) SilvaIcons.hydrate(document);
            } catch (err) {
                alert(err && err.message ? err.message : 'Не удалось сохранить профиль.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText || 'Сохранить';
                }
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var o = document.getElementById('profile-edit-modal');
                if (o && o.classList.contains('is-open')) closeModal();
            }
        });
    });
})();
