/**
 * Форма объекта владельца: разметка страницы редактирования + init.
 */
(function (global) {
    'use strict';

    var amenityKeys = [
        { key: 'wifi', label: 'Wi‑Fi' },
        { key: 'parking', label: 'Парковка' },
        { key: 'kitchen', label: 'Кухня' },
        { key: 'pool', label: 'Бассейн' },
        { key: 'transfer', label: 'Трансфер' },
        { key: 'children', label: 'Детям' },
        { key: 'pets', label: 'Животные' },
        { key: 'sauna', label: 'Сауна' }
    ];

    function regionOptionsHtml() {
        var regions = [
            'Центральный',
            'Приморский',
            'Петроградский',
            'Василеостровский',
            'Адмиралтейский',
            'Выборгский',
            'Калининский',
            'Кировский',
            'Колпинский',
            'Красногвардейский',
            'Красносельский',
            'Кронштадтский',
            'Курортный',
            'Московский',
            'Невский',
            'Петродворцовый',
            'Пушкинский',
            'Фрунзенский'
        ];
        return regions
            .map(function (r) {
                return '<option value="' + r + '">' + r + '</option>';
            })
            .join('');
    }

    /** Слоты по 30 минут, 00:00–23:30 */
    function halfHourTimeOptionsHtml() {
        var parts = [];
        var h, mi, hh, mm, val;
        for (h = 0; h < 24; h++) {
            for (mi = 0; mi < 2; mi++) {
                mm = mi === 0 ? '00' : '30';
                hh = (h < 10 ? '0' : '') + h;
                val = hh + ':' + mm;
                parts.push('<option value="' + val + '">' + val + '</option>');
            }
        }
        return parts.join('');
    }

    function showBanner(banner, message, isError) {
        if (!banner) return;
        banner.style.display = 'flex';
        banner.textContent = message;
        banner.className = isError
            ? 'owner-property-page__banner account-banner account-banner--error'
            : 'owner-property-page__banner account-banner account-banner--success';
        banner.setAttribute('role', isError ? 'alert' : 'status');
    }

    function fileExt(name) {
        var n = String(name || '');
        var dot = n.lastIndexOf('.');
        if (dot === -1) return 'jpg';
        return n.slice(dot + 1).toLowerCase() || 'jpg';
    }

    async function uploadOwnerPropertyImage(file) {
        var auth = global.silvaSupabaseAuth;
        if (!auth || typeof auth.ensureClient !== 'function') {
            throw new Error('Supabase не подключен на странице.');
        }
        var sb = auth.ensureClient();
        if (!sb) throw new Error('Supabase client не инициализирован.');
        var user = await auth.getSessionUser();
        if (!user || !user.id) throw new Error('Сессия не найдена. Войдите заново.');

        var ext = fileExt(file.name);
        var safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
        var path =
            user.id +
            '/property-' +
            Date.now() +
            '-' +
            Math.random().toString(36).slice(2, 8) +
            '.' +
            safeExt;

        var up = await sb.storage.from('property-images').upload(path, file, {
            upsert: false,
            contentType: file.type || 'image/jpeg'
        });
        if (up.error) throw up.error;

        var pub = sb.storage.from('property-images').getPublicUrl(path);
        if (!pub || !pub.data || !pub.data.publicUrl) {
            throw new Error('Не удалось получить URL загруженного фото.');
        }
        return pub.data.publicUrl;
    }

    function visaOptionsHtml() {
        var opts = [
            'Для граждан РФ виза не требуется. Иностранным гостям необходимо иметь действующую визу РФ.',
            'Для граждан РФ виза не требуется.',
            'Иностранным гостям необходима действующая виза РФ.',
            'Для граждан РФ виза не требуется. Иностранным гостям — действующая виза РФ или безвизовый въезд по соглашению.',
            'Для въезда в РФ иностранным гостям необходима виза. Гражданам РФ виза не требуется.'
        ];
        return opts
            .map(function (t) {
                return '<option value="' + t.replace(/"/g, '&quot;') + '">' + t + '</option>';
            })
            .join('');
    }

    function getOwnerPropertyPageHTML() {
        return (
            '<div id="owner-property-page-root" class="owner-property-page">' +
            '<div class="owner-property-page-card">' +
            '<header class="owner-property-page__head">' +
            '<h2 class="owner-property-page__title" id="owner-edit-heading">Новый объект</h2>' +
            '</header>' +
            '<div id="owner-edit-banner" class="owner-property-page__banner account-banner account-banner--success" style="display: none;" role="status"></div>' +
            '<form id="owner-property-form" class="owner-property-page-form" novalidate>' +
            '<div class="owner-property-layout">' +
            '<div class="owner-property-layout__left">' +
            '<aside class="owner-property-photos-block" aria-label="Фотографии">' +
            '<div class="owner-property-photos-card">' +
            '<div class="owner-property-photos-head">' +
            '<span class="owner-property-photos-title">Фото</span>' +
            '<span class="owner-property-photos-badge" id="op-photos-count">0 / 10</span>' +
            '</div>' +
            '<div class="owner-property-photos-grid" id="op-photos-grid" aria-live="polite"></div>' +
            '<button type="button" class="btn btn-primary owner-property-photos-add-btn" id="op-photos-add">' +
            '<span class="owner-property-photos-add-icon" aria-hidden="true">+</span> Добавить' +
            '</button>' +
            '<input type="file" id="op-photos-input" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="owner-property-photos-file">' +
            '</div>' +
            '</aside>' +
            '<div class="owner-property-title-address-row">' +
            '<div class="owner-form-field">' +
            '<label for="op-title">Название и тип объекта</label>' +
            '<input type="text" class="input" id="op-title" name="title" required maxlength="200" placeholder="Название и тип вашего объекта...">' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-address">Адрес вашего объекта</label>' +
            '<input type="text" class="input" id="op-address" name="address" maxlength="500" placeholder="Точный адрес...">' +
            '</div>' +
            '</div>' +
            '<div class="owner-property-dense-grid">' +
            '<div class="owner-form-field">' +
            '<label for="op-region">Район</label>' +
            '<select class="input" id="op-region" name="region" required>' +
            regionOptionsHtml() +
            '</select>' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-type">Тип</label>' +
            '<select class="input" id="op-type" name="property_type" required>' +
            '<option value="cottage">Коттедж</option>' +
            '<option value="hotel">Отель</option>' +
            '<option value="guest_house">Гостевой дом</option>' +
            '<option value="glamping">Глэмпинг</option>' +
            '<option value="eco_house">Эко-дом</option>' +
            '</select>' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-status">Статус</label>' +
            '<select class="input" id="op-status" name="status" required>' +
            '<option value="draft">Черновик</option>' +
            '<option value="published">В каталоге</option>' +
            '</select>' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-price">Цена, ₽ / ночь</label>' +
            '<input type="number" class="input" id="op-price" name="price_per_night" required min="1" step="100" value="3500">' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-guests">Гостей</label>' +
            '<input type="number" class="input" id="op-guests" name="max_guests" required min="1" max="50" value="4">' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-bedrooms">Спален</label>' +
            '<input type="number" class="input" id="op-bedrooms" name="bedrooms" required min="0" max="30" value="2">' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-bathrooms">Санузлов</label>' +
            '<input type="number" class="input" id="op-bathrooms" name="bathrooms" required min="1" max="30" value="1">' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-area">Площадь, м²</label>' +
            '<input type="number" class="input" id="op-area" name="area" required min="1" max="50000" value="50">' +
            '</div>' +
            '</div>' +
            '<div class="owner-form-field owner-form-field--full owner-form-field--description">' +
            '<label for="op-desc">Описание</label>' +
            '<textarea class="input owner-description-textarea" id="op-desc" name="description" rows="3" placeholder="Кратко: что рядом, для кого подходит"></textarea>' +
            '</div>' +
            '</div>' +
            '<div class="owner-property-layout__secondary">' +
            '<div class="owner-property-section owner-property-section--amenities">' +
            '<span class="owner-property-section__label">Удобства</span>' +
            '<div class="owner-amenities-grid owner-amenities-grid--chips" id="op-amenities"></div>' +
            '<div class="owner-property-eco-row owner-property-eco-row--aside">' +
            '<label class="owner-property-eco-label">' +
            '<input type="checkbox" id="op-eco" name="eco_certified"> Эко-сертификация' +
            '</label>' +
            '</div>' +
            '</div>' +
            '<div class="owner-property-section owner-property-rules-inline">' +
            '<span class="owner-property-section__label">Заезд и выезд</span>' +
            '<div class="owner-property-rules-row">' +
            '<div class="owner-form-field">' +
            '<label for="op-checkin">С</label>' +
            '<select class="input" id="op-checkin" name="checkin_time" required>' +
            halfHourTimeOptionsHtml() +
            '</select>' +
            '</div>' +
            '<div class="owner-form-field">' +
            '<label for="op-checkout">До</label>' +
            '<select class="input" id="op-checkout" name="checkout_time" required>' +
            halfHourTimeOptionsHtml() +
            '</select>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="owner-property-section">' +
            '<div class="owner-form-field owner-form-field--full">' +
            '<label for="op-extra">Дополнительно</label>' +
            '<textarea class="input" id="op-extra" name="extra_text" rows="2" placeholder="По строке: парковка, мангал…"></textarea>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="owner-form-field owner-form-field--full owner-property-visa-field">' +
            '<label for="op-visa">Виза и въезд</label>' +
            '<select class="input" id="op-visa" name="visa_info" required>' +
            visaOptionsHtml() +
            '</select>' +
            '</div>' +
            '<div class="owner-property-page__actions">' +
            '<a href="owner-properties.html" class="btn btn-ghost" id="owner-property-form-cancel">К списку</a>' +
            '<button type="submit" class="btn btn-primary owner-property-page__submit" id="owner-property-form-submit">Добавить</button>' +
            '<button type="button" class="btn btn-ghost owner-property-page__delete" id="owner-edit-delete" style="display: none;">Удалить объект</button>' +
            '</div>' +
            '</form>' +
            '</div>' +
            '</div>'
        );
    }

    function initOwnerPropertyForm(root) {
        var email = typeof getOwnerUserEmail === 'function' ? getOwnerUserEmail() : '';
        var userId = null;
        try {
            var u = JSON.parse(localStorage.getItem('silva_user') || '{}');
            userId = u && u.id ? u.id : null;
        } catch (e) {}
        var verifiedOwner = typeof isOwnerVerified === 'function' ? isOwnerVerified() : false;
        if (!email || typeof mockAPI === 'undefined') return;

        function $(id) {
            return root.querySelector('#' + id);
        }

        var form = $('owner-property-form');
        var heading = $('owner-edit-heading');
        var banner = $('owner-edit-banner');
        var deleteBtn = $('owner-edit-delete');
        var amenitiesWrap = $('op-amenities');
        var galleryImages = [];

        var idParam = typeof getUrlParameter === 'function' ? getUrlParameter('id') : null;

        var existing = null;

        function defaultListing() {
            return {
                ownerEmail: email,
                owner_id: userId,
                title: '',
                address: '',
                region: 'Центральный',
                property_type: 'cottage',
                price_per_night: 3500,
                max_guests: 4,
                bedrooms: 2,
                bathrooms: 1,
                area: 50,
                rating: 0,
                reviews_count: 0,
                main_image: null,
                gallery_images: [],
                eco_certified: false,
                is_featured: false,
                is_owner_listing: true,
                status: verifiedOwner ? 'published' : 'draft',
                description: '',
                amenities: ['wifi'],
                conditions: ['Заезд с 14:00', 'Выезд до 12:00'],
                extra_info: [],
                visa_info:
                    'Для граждан РФ виза не требуется. Иностранным гостям необходимо иметь действующую визу РФ.',
                map_lat: 59.9343,
                map_lng: 30.3356
            };
        }

        function linesToArr(text) {
            if (!text || !String(text).trim()) return [];
            return String(text)
                .split('\n')
                .map(function (s) {
                    return s.trim();
                })
                .filter(Boolean);
        }

        function arrToLines(arr) {
            if (!arr || !arr.length) return '';
            return arr.join('\n');
        }

        if (amenitiesWrap) {
            amenitiesWrap.innerHTML = amenityKeys
                .map(function (a) {
                    return (
                        '<label class="owner-amenity-chip"><input type="checkbox" name="amenity" value="' +
                        a.key +
                        '"><span class="owner-amenity-chip__text">' +
                        a.label +
                        '</span></label>'
                    );
                })
                .join('');
        }

        if (idParam) {
            var p = mockAPI.getPropertyById(idParam);
            if (!p || !p.is_owner_listing || String(p.owner_id || '') !== String(userId || '')) {
                window.location.href = 'owner-properties.html';
                return;
            }
            existing = p;
            if (heading) heading.textContent = 'Редактирование';
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
        } else {
            existing = defaultListing();
        }

        function normalizeTimeStr(raw) {
            if (raw == null || raw === '') return '14:00';
            var m = String(raw).match(/(\d{1,2}):(\d{2})/);
            if (!m) return '14:00';
            var h = parseInt(m[1], 10);
            var mi = parseInt(m[2], 10);
            if (isNaN(h) || h < 0 || h > 23) h = 14;
            if (isNaN(mi) || mi < 0) mi = 0;
            if (mi !== 0 && mi !== 30) mi = mi < 30 ? 0 : 30;
            return (h < 10 ? '0' : '') + h + ':' + (mi === 0 ? '00' : '30');
        }

        function splitConditionsForForm(arr) {
            var ci = '14:00';
            var co = '12:00';
            var rest = [];
            (arr || []).forEach(function (line) {
                var s = String(line);
                var z = s.match(/Заезд\s+с\s+(\d{1,2}:\d{2})/);
                if (z) {
                    ci = normalizeTimeStr(z[1]);
                    return;
                }
                var vy = s.match(/Выезд\s+до\s+(\d{1,2}:\d{2})/);
                if (vy) {
                    co = normalizeTimeStr(vy[1]);
                    return;
                }
                rest.push(line);
            });
            return { checkIn: ci, checkOut: co, restLines: rest };
        }

        function setTimeSelect(id, time) {
            var sel = $(id);
            if (!sel) return;
            var t = normalizeTimeStr(time);
            var found = false;
            var i;
            for (i = 0; i < sel.options.length; i++) {
                if (sel.options[i].value === t) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                var opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                sel.insertBefore(opt, sel.firstChild);
            }
            sel.value = t;
        }

        function setVisaSelect(visa) {
            var sel = $('op-visa');
            if (!sel) return;
            var v = (visa || '').trim();
            var found = false;
            var i;
            for (i = 0; i < sel.options.length; i++) {
                if (sel.options[i].value === v) {
                    sel.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found) sel.selectedIndex = 0;
        }

        function getImagesFromProperty(p) {
            if (p.gallery_images && Array.isArray(p.gallery_images) && p.gallery_images.length) {
                return p.gallery_images.slice(0, 10);
            }
            if (p.main_image) return [p.main_image];
            return [];
        }

        function bindPhotoGridOnce() {
            var grid = $('op-photos-grid');
            if (!grid || grid.getAttribute('data-delegate-bound') === '1') return;
            grid.setAttribute('data-delegate-bound', '1');
            grid.addEventListener('click', function (e) {
                var btn = e.target.closest && e.target.closest('.owner-property-photo-remove');
                if (!btn) return;
                var tile = btn.closest('.owner-property-photo-tile');
                if (!tile) return;
                var idx = parseInt(tile.getAttribute('data-index'), 10);
                if (!isNaN(idx)) {
                    galleryImages.splice(idx, 1);
                    renderPhotoGrid();
                }
            });
        }

        function renderPhotoGrid() {
            var grid = $('op-photos-grid');
            var countEl = $('op-photos-count');
            if (!grid) return;
            grid.innerHTML = galleryImages
                .map(function (src, i) {
                    var safe = String(src).replace(/"/g, '&quot;').replace(/</g, '');
                    return (
                        '<div class="owner-property-photo-tile" data-index="' +
                        i +
                        '">' +
                        '<img src="' +
                        safe +
                        '" alt="">' +
                        '<button type="button" class="owner-property-photo-remove" aria-label="Удалить фото">×</button></div>'
                    );
                })
                .join('');
            if (countEl) {
                countEl.textContent = galleryImages.length + ' / 10';
            }
        }

        function fillForm(p) {
            $('op-title').value = p.title || '';
            if ($('op-address')) $('op-address').value = p.address || '';
            $('op-region').value = p.region || 'Центральный';
            $('op-type').value = p.property_type || 'cottage';
            $('op-price').value = p.price_per_night != null ? p.price_per_night : 3500;
            $('op-guests').value = p.max_guests != null ? p.max_guests : 4;
            $('op-bedrooms').value = p.bedrooms != null ? p.bedrooms : 2;
            $('op-bathrooms').value = p.bathrooms != null ? p.bathrooms : 1;
            $('op-area').value = p.area != null ? p.area : 50;
            $('op-status').value = p.status === 'published' ? 'published' : 'draft';
            $('op-eco').checked = !!p.eco_certified;
            $('op-desc').value = p.description || '';
            var sc = splitConditionsForForm(p.conditions);
            setTimeSelect('op-checkin', sc.checkIn);
            setTimeSelect('op-checkout', sc.checkOut);
            var extraBase = arrToLines(p.extra_info);
            if (sc.restLines.length) {
                $('op-extra').value = sc.restLines.join('\n') + (extraBase ? '\n' + extraBase : '');
            } else {
                $('op-extra').value = extraBase;
            }
            setVisaSelect(p.visa_info);

            var setAm = p.amenities || ['wifi'];
            if (amenitiesWrap) {
                amenitiesWrap.querySelectorAll('input[name="amenity"]').forEach(function (cb) {
                    cb.checked = setAm.indexOf(cb.value) !== -1;
                });
            }
            galleryImages = getImagesFromProperty(p);
            renderPhotoGrid();
            bindPhotoGridOnce();
        }

        fillForm(existing);

        var photosInput = $('op-photos-input');
        var photosAdd = $('op-photos-add');
        if (photosAdd && photosInput) {
            photosAdd.addEventListener('click', function () {
                photosInput.click();
            });
            photosInput.addEventListener('change', async function () {
                var files = Array.prototype.slice.call(photosInput.files || []);
                if (!files.length) return;

                photosAdd.disabled = true;
                photosAdd.textContent = 'Загрузка...';
                try {
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        if (galleryImages.length >= 10) break;
                        if (!file.type || file.type.indexOf('image/') !== 0) continue;
                        var url = await uploadOwnerPropertyImage(file);
                        if (url && galleryImages.length < 10) {
                            galleryImages.push(url);
                            renderPhotoGrid();
                        }
                    }
                } catch (err) {
                    showBanner(
                        banner,
                        (err && err.message ? err.message : 'Не удалось загрузить фото в хранилище.') +
                            ' Проверьте bucket property-images и policies.',
                        true
                    );
                } finally {
                    photosInput.value = '';
                    photosAdd.disabled = false;
                    photosAdd.innerHTML = '<span class="owner-property-photos-add-icon" aria-hidden="true">+</span> Добавить';
                }
            });
        }

        function collectAmenities() {
            var out = [];
            if (amenitiesWrap) {
                amenitiesWrap.querySelectorAll('input[name="amenity"]:checked').forEach(function (cb) {
                    out.push(cb.value);
                });
            }
            return out.length ? out : ['wifi'];
        }

        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                if (galleryImages.length < 6 || galleryImages.length > 10) {
                    if (banner) {
                        banner.style.display = 'flex';
                        banner.textContent = 'Добавьте от 6 до 10 фотографий объекта.';
                        banner.className = 'owner-property-page__banner account-banner account-banner--error';
                        banner.setAttribute('role', 'alert');
                    }
                    return;
                }
                var fd = new FormData(form);
                var idNum =
                    existing && existing.id != null && !isNaN(Number(existing.id))
                        ? Number(existing.id)
                        : mockAPI.nextOwnerPropertyId();
                var addr = (fd.get('address') || '').trim();
                var regionVal = (fd.get('region') || '').toString();
                var fallbackLat =
                    existing && existing.map_lat != null && !isNaN(Number(existing.map_lat))
                        ? Number(existing.map_lat)
                        : 59.9343;
                var fallbackLng =
                    existing && existing.map_lng != null && !isNaN(Number(existing.map_lng))
                        ? Number(existing.map_lng)
                        : 30.3356;

                var listing = {
                    id: idNum,
                    ownerEmail: email,
                    title: (fd.get('title') || '').trim(),
                    address: addr,
                    region: fd.get('region'),
                    property_type: fd.get('property_type'),
                    price_per_night: parseInt(fd.get('price_per_night'), 10) || 0,
                    max_guests: parseInt(fd.get('max_guests'), 10) || 1,
                    bedrooms: parseInt(fd.get('bedrooms'), 10) || 0,
                    bathrooms: parseInt(fd.get('bathrooms'), 10) || 1,
                    area: parseInt(fd.get('area'), 10) || 1,
                    rating: existing && existing.rating != null ? existing.rating : 0,
                    reviews_count: existing && existing.reviews_count != null ? existing.reviews_count : 0,
                    gallery_images: galleryImages.slice(),
                    main_image: galleryImages[0] || null,
                    eco_certified: $('op-eco').checked,
                    is_featured: false,
                    is_owner_listing: true,
                    status:
                        !idParam && verifiedOwner
                            ? 'published'
                            : fd.get('status') === 'published'
                              ? 'published'
                              : 'draft',
                    description: (fd.get('description') || '').trim(),
                    amenities: collectAmenities(),
                    conditions: (function () {
                        var ci = normalizeTimeStr((fd.get('checkin_time') || '14:00').toString());
                        var co = normalizeTimeStr((fd.get('checkout_time') || '12:00').toString());
                        return ['Заезд с ' + ci, 'Выезд до ' + co];
                    })(),
                    extra_info: linesToArr(fd.get('extra_text')),
                    visa_info:
                        (fd.get('visa_info') || '').trim() ||
                        'Для граждан РФ виза не требуется. Иностранным гостям необходимо иметь действующую визу РФ.',
                    map_lat: fallbackLat,
                    map_lng: fallbackLng
                };

                function afterSaveSuccess() {
                    existing = listing;
                    galleryImages = listing.gallery_images.slice();
                    renderPhotoGrid();
                    showBanner(banner, 'Сохранено. Объект № ' + listing.id + '.', false);
                    if (!idParam) {
                        if (typeof history !== 'undefined' && history.replaceState) {
                            history.replaceState(
                                null,
                                '',
                                'owner-property-edit.html?id=' + encodeURIComponent(String(listing.id))
                            );
                        }
                        idParam = String(listing.id);
                        if (heading) heading.textContent = 'Редактирование';
                        if (deleteBtn) deleteBtn.style.display = 'inline-block';
                    }
                }

                async function persistListing() {
                    try {
                        if (!window.silvaSupabaseAuth || typeof window.silvaSupabaseAuth.saveOwnerProperty !== 'function') {
                            throw new Error('Supabase не подключен для сохранения объекта.');
                        }
                        var newId = await window.silvaSupabaseAuth.saveOwnerProperty(listing);
                        listing.id = Number(newId);
                    } catch (err) {
                        var errMessage = err && err.message ? String(err.message) : '';
                        showBanner(
                            banner,
                            'Не удалось сохранить объект. ' +
                                (errMessage ? 'Причина: ' + errMessage : 'Проверьте данные и попробуйте снова.'),
                            true
                        );
                        return;
                    }
                    afterSaveSuccess();
                }

                if (addr && typeof geocodeSilvaAddress === 'function') {
                    geocodeSilvaAddress(addr, regionVal).then(function (coords) {
                        if (coords) {
                            listing.map_lat = coords.lat;
                            listing.map_lng = coords.lng;
                        }
                        persistListing();
                    });
                } else {
                    persistListing();
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async function () {
                if (!existing || existing.id == null) return;
                if (!confirm('Удалить объект безвозвратно?')) return;
                try {
                    if (!window.silvaSupabaseAuth || typeof window.silvaSupabaseAuth.deleteOwnerProperty !== 'function') {
                        throw new Error('Supabase не подключен для удаления объекта.');
                    }
                    await window.silvaSupabaseAuth.deleteOwnerProperty(existing.id);
                } catch (err) {
                    showBanner(
                        banner,
                        err && err.message ? err.message : 'Не удалось удалить объект.',
                        true
                    );
                    return;
                }
                window.location.href = 'owner-properties.html';
            });
        }

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key !== 'Escape') return;
            window.location.href = 'owner-properties.html';
        });
    }

    global.getOwnerPropertyPageHTML = getOwnerPropertyPageHTML;
    global.initOwnerPropertyForm = initOwnerPropertyForm;
})(typeof window !== 'undefined' ? window : this);
