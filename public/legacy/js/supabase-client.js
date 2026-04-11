(function (window) {
    'use strict';

    var SUPABASE_URL = 'https://siqvswjrhmckufuaomhy.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcXZzd2pyaG1ja3VmdWFvbWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzQ1MTIsImV4cCI6MjA5MTIxMDUxMn0.oMSiRHJgogShrO8-LBddhID2IgfaE8NLHicXU1nweGQ';
    var client = null;

    function hasSupabaseSdk() {
        return !!(window.supabase && typeof window.supabase.createClient === 'function');
    }

    function ensureClient() {
        if (client) return client;
        if (!hasSupabaseSdk()) return null;
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return client;
    }

    function readLocalUser() {
        try {
            return JSON.parse(localStorage.getItem('silva_user') || '{}');
        } catch (e) {
            return {};
        }
    }

    function writeLocalUser(user) {
        localStorage.setItem('silva_user', JSON.stringify(user));
    }

    function clearLocalUser() {
        localStorage.removeItem('silva_user');
    }

    function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    function initPersonalGuestStorage(email) {
        var e = normalizeEmail(email);
        if (!e) return;
        localStorage.setItem('silva_loyalty_points_' + e, '0');
        localStorage.setItem('silva_bookings_' + e, '[]');
        localStorage.setItem('silva_favorites_' + e, '[]');
    }

    function mapProfileToLocalUser(profile, fallbackEmail) {
        return {
            id: profile && profile.id ? profile.id : null,
            name: profile && profile.full_name ? profile.full_name : '',
            email: profile && profile.email ? profile.email : (fallbackEmail || ''),
            phone: profile && profile.phone ? profile.phone : '',
            role: profile && profile.role ? profile.role : 'guest',
            newsletter: !!(profile && profile.newsletter),
            ownerVerificationStatus: (profile && profile.owner_verification_status) || 'pending',
            avatar: profile && profile.avatar_url ? profile.avatar_url : null
        };
    }

    async function getSessionUser() {
        var sb = ensureClient();
        if (!sb) return null;
        var resp = await sb.auth.getUser();
        return resp && resp.data ? resp.data.user : null;
    }

    async function fetchProfile(userId) {
        var sb = ensureClient();
        if (!sb || !userId) return null;
        var q = await sb
            .from('profiles')
            .select('id, full_name, email, phone, avatar_url, role, newsletter, owner_verification_status')
            .eq('id', userId)
            .maybeSingle();
        return q && q.data ? q.data : null;
    }

    async function syncLocalUserFromSupabase() {
        var sb = ensureClient();
        if (!sb) return null;

        var user = await getSessionUser();
        if (!user) {
            clearLocalUser();
            return null;
        }

        var profile = await fetchProfile(user.id);
        var localUser = mapProfileToLocalUser(profile, user.email);

        // Preserve fields that are not moved to backend yet.
        var prev = readLocalUser();
        if (prev && prev.property_type && !localUser.property_type) {
            localUser.property_type = prev.property_type;
        }
        writeLocalUser(localUser);
        return localUser;
    }

    /** Нормализация amenities из text[] / jsonb / json-строки / массива для карточки и каталога. */
    function normalizeRowAmenities(raw) {
        if (raw == null || raw === '') return [];
        if (Array.isArray(raw)) {
            return raw
                .map(function (x) {
                    return String(x || '')
                        .trim()
                        .toLowerCase();
                })
                .filter(Boolean);
        }
        if (typeof raw === 'string') {
            try {
                return normalizeRowAmenities(JSON.parse(raw));
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    function mapPropertyRowToLegacy(row, images) {
        var gallery = (images || []).map(function (img) { return img.image_url; }).filter(Boolean);
        return {
            id: row.id != null ? String(row.id) : '',
            owner_id: row.owner_id,
            ownerEmail: '',
            title: row.title || '',
            address: row.address || '',
            region: row.region || '',
            property_type: row.property_type || 'cottage',
            price_per_night: Number(row.price_per_night) || 0,
            max_guests: Number(row.max_guests) || 1,
            bedrooms: 1,
            bathrooms: 1,
            area: 50,
            rating: Number(row.rating) || 0,
            reviews_count: Number(row.reviews_count) || 0,
            gallery_images: gallery,
            main_image: gallery[0] || null,
            eco_certified: false,
            is_featured: false,
            is_owner_listing: true,
            status: row.status || 'draft',
            description: row.description || '',
            amenities: normalizeRowAmenities(row.amenities),
            conditions: ['Заезд с 14:00', 'Выезд до 12:00'],
            extra_info: [],
            visa_info: 'Для граждан РФ виза не требуется. Иностранным гостям необходимо иметь действующую визу РФ.',
            map_lat: 59.9343,
            map_lng: 30.3356,
            created_at: row.created_at || null
        };
    }

    function toPropertyId(value) {
        var s = String(value || '').trim();
        if (!s) return null;
        var uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRx.test(s) ? s : null;
    }

    async function fetchPropertiesCache() {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var q = await sb
            .from('properties')
            .select(
                'id, owner_id, title, address, region, property_type, description, price_per_night, max_guests, status, created_at, amenities'
            )
            .order('created_at', { ascending: false });
        if (q.error) throw q.error;
        var rows = q.data || [];
        if (!rows.length) {
            localStorage.setItem('silva_owner_properties', '[]');
            return [];
        }
        var ids = rows.map(function (r) { return r.id; });
        var imgQ = await sb
            .from('property_images')
            .select('property_id, image_url, position')
            .in('property_id', ids)
            .order('position', { ascending: true });
        if (imgQ.error) throw imgQ.error;
        var byProperty = {};
        (imgQ.data || []).forEach(function (img) {
            var pid = String(img.property_id);
            if (!byProperty[pid]) byProperty[pid] = [];
            byProperty[pid].push(img);
        });
        var mapped = rows.map(function (row) {
            return mapPropertyRowToLegacy(row, byProperty[String(row.id)] || []);
        });
        localStorage.setItem('silva_owner_properties', JSON.stringify(mapped));
        return mapped;
    }

    /** Объекты по списку id (для избранного, если id ещё нет в локальном кэше). */
    async function fetchPropertiesByIds(propertyIds) {
        var sb = ensureClient();
        if (!sb) return [];
        var rawIds = (propertyIds || [])
            .map(function (x) {
                return String(x || '').trim();
            })
            .filter(Boolean);
        if (!rawIds.length) return [];
        var q = await sb
            .from('properties')
            .select(
                'id, owner_id, title, address, region, property_type, description, price_per_night, max_guests, status, created_at, amenities'
            )
            .in('id', rawIds);
        if (q.error) return [];
        var rows = q.data || [];
        if (!rows.length) return [];
        var ids = rows.map(function (r) {
            return r.id;
        });
        var imgQ = await sb
            .from('property_images')
            .select('property_id, image_url, position')
            .in('property_id', ids)
            .order('position', { ascending: true });
        var byProperty = {};
        if (!imgQ.error && imgQ.data) {
            imgQ.data.forEach(function (img) {
                var pid = String(img.property_id);
                if (!byProperty[pid]) byProperty[pid] = [];
                byProperty[pid].push(img);
            });
        }
        return rows.map(function (row) {
            return mapPropertyRowToLegacy(row, byProperty[String(row.id)] || []);
        });
    }

    async function saveOwnerProperty(payload) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var user = await getSessionUser();
        if (!user) throw new Error('Пользователь не авторизован');
        // В таблице properties колонка amenities — массив текстов (text[]) или jsonb-массив, например:
        // alter table properties add column if not exists amenities text[] default '{}';
        var amenitiesSave = Array.isArray(payload.amenities) ? payload.amenities : [];
        amenitiesSave = amenitiesSave
            .map(function (x) {
                return String(x || '')
                    .trim()
                    .toLowerCase();
            })
            .filter(Boolean);
        if (!amenitiesSave.length) amenitiesSave = ['wifi'];

        var propertyPatch = {
            owner_id: user.id,
            title: payload.title || '',
            address: payload.address || null,
            region: payload.region || null,
            property_type: payload.property_type || 'cottage',
            description: payload.description || null,
            price_per_night: Number(payload.price_per_night) || 0,
            max_guests: Number(payload.max_guests) || 1,
            status: payload.status === 'published' ? 'published' : 'draft',
            rating: Number(payload.rating) || 0,
            reviews_count: Number(payload.reviews_count) || 0,
            amenities: amenitiesSave
        };
        delete propertyPatch.rating;
        delete propertyPatch.reviews_count;
        var saved;
        var existingId = toPropertyId(payload.id);
        if (existingId != null) {
            var upd = await sb.from('properties').update(propertyPatch).eq('id', existingId).select('id').single();
            if (upd.error) {
                // If record with this id does not exist (old local id), create new one.
                if (String(upd.error.code || '') === 'PGRST116') {
                    var insFallback = await sb.from('properties').insert(propertyPatch).select('id').single();
                    if (insFallback.error) throw insFallback.error;
                    saved = insFallback.data;
                } else {
                    throw upd.error;
                }
            } else {
                saved = upd.data;
            }
        } else {
            var ins = await sb.from('properties').insert(propertyPatch).select('id').single();
            if (ins.error) throw ins.error;
            saved = ins.data;
        }
        var propertyId = saved.id;
        if (Array.isArray(payload.gallery_images)) {
            var del = await sb.from('property_images').delete().eq('property_id', propertyId);
            if (del.error) throw del.error;
            var imageRows = payload.gallery_images
                .filter(Boolean)
                .slice(0, 10)
                .map(function (url, idx) {
                    return {
                        property_id: propertyId,
                        image_url: url,
                        position: idx
                    };
                });
            if (imageRows.length) {
                var imgIns = await sb.from('property_images').insert(imageRows);
                if (imgIns.error) throw imgIns.error;
            }
        }
        await fetchPropertiesCache();
        return propertyId;
    }

    async function deleteOwnerProperty(propertyId) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var user = await getSessionUser();
        if (!user || !user.id) throw new Error('Сессия не найдена. Войдите заново.');
        var id = toPropertyId(propertyId);
        if (id == null) throw new Error('Некорректный идентификатор объекта.');
        var del = await sb.from('properties').delete().eq('id', id);
        if (del.error) throw del.error;
        await fetchPropertiesCache();
    }

    async function fetchFavorites() {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var q = await sb.from('favorites').select('property_id').order('created_at', { ascending: false });
        if (q.error) throw q.error;
        var serverIds = (q.data || []).map(function (x) { return String(x.property_id); }).filter(Boolean);
        var email = normalizeEmail((readLocalUser() || {}).email);
        var key = email ? 'silva_favorites_' + email : 'silva_favorites';
        var prev = [];
        try {
            prev = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(prev)) prev = [];
        } catch (e) {
            prev = [];
        }
        var prevStr = prev.map(function (x) { return String(x); });
        var serverSet = {};
        serverIds.forEach(function (id) {
            serverSet[id] = true;
        });
        var extra = prevStr.filter(function (id) {
            return id && !serverSet[id];
        });
        var merged = serverIds.concat(extra);
        var seen = {};
        var final = [];
        merged.forEach(function (id) {
            if (id && !seen[id]) {
                seen[id] = true;
                final.push(id);
            }
        });
        localStorage.setItem(key, JSON.stringify(final));
        return final;
    }

    async function setFavorite(propertyId, isFavorite) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        if (isFavorite) {
            var ins = await sb.from('favorites').insert({ property_id: propertyId });
            if (ins.error && ins.error.code !== '23505') throw ins.error;
        } else {
            var del = await sb.from('favorites').delete().eq('property_id', propertyId);
            if (del.error) throw del.error;
        }
        return fetchFavorites();
    }

    function normalizeBookingPropertyId(raw) {
        if (raw == null || raw === '') return null;
        var s = String(raw).trim();
        var uuidRx =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRx.test(s)) return s;
        var n = parseInt(s, 10);
        if (!isNaN(n) && String(n) === s) return n;
        return s;
    }

    /** PK строки bookings: uuid или bigint (не Number(uuid) — будет NaN). */
    function normalizeBookingRowId(raw) {
        if (raw == null || raw === '') return null;
        var s = String(raw).trim();
        if (!s) return null;
        var uuidRx =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRx.test(s)) return s;
        if (/^-?\d+$/.test(s)) {
            if (s.length <= 15) {
                var n = parseInt(s, 10);
                if (!isNaN(n)) return n;
            }
            return s;
        }
        return s;
    }

    /** Тип оплаты в БД: как в booking.js — 'full' | '30'. */
    function normalizeBookingPayType(raw) {
        var s = String(raw == null ? 'full' : raw).trim().toLowerCase();
        if (s === '30' || s === 'partial' || s === 'predoplata') return '30';
        return 'full';
    }

    /**
     * Вставка в public.bookings под прод-схему SILVA (без nights / adults / yookassa_payment_id в insert).
     * Поля: user_id, guest_id, property_id, check_in, check_out, guests, children, total_price, total_amount, pay_type, status.
     */
    async function createBooking(payload) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var user = await getSessionUser();
        if (!user || !user.id) {
            throw new Error('Нужна авторизация для бронирования');
        }
        var uid = user.id;
        var pid = normalizeBookingPropertyId(payload.propertyId);
        if (pid == null) throw new Error('Не указан объект для бронирования');
        var amount = Number(payload.totalRub);
        if (isNaN(amount) || amount < 0) amount = 0;
        var ch = Number(payload.children);
        if (isNaN(ch) || ch < 0) ch = 0;
        var g = Number(payload.guests);
        if (isNaN(g) || g < 1) g = 1;
        var payType = normalizeBookingPayType(payload.payType);
        var ins = await sb.from('bookings').insert({
            user_id: uid,
            guest_id: uid,
            property_id: pid,
            check_in: payload.checkIn,
            check_out: payload.checkOut,
            guests: g,
            children: ch,
            total_price: amount,
            total_amount: amount,
            pay_type: payType,
            status: 'pending'
        });
        if (ins.error) throw ins.error;
    }

    async function fetchMyBookings() {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var q = await sb
            .from('bookings')
            .select(
                'id, property_id, check_in, check_out, guests, children, total_price, total_amount, pay_type, status, created_at'
            )
            .order('created_at', { ascending: false });
        if (q.error) throw q.error;
        return q.data || [];
    }

    async function cancelBooking(bookingId) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var bid = normalizeBookingRowId(bookingId);
        if (bid == null) throw new Error('Некорректный id брони');
        var del = await sb.from('bookings').delete().eq('id', bid);
        if (del.error) throw del.error;
    }

    async function fetchBookingsByPropertyIds(propertyIds) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var ids = (propertyIds || []).map(function (x) { return String(x || ''); }).filter(Boolean);
        if (!ids.length) return [];
        var q = await sb
            .from('bookings')
            .select(
                'id, property_id, user_id, guest_id, check_in, check_out, guests, children, total_price, total_amount, pay_type, status, created_at'
            )
            .in('property_id', ids);
        if (q.error) throw q.error;
        return q.data || [];
    }

    /**
     * Брони по объектам владельца + профили гостей (нужна RLS profiles_owner_sees_booking_guests).
     * Возвращает плоские объекты под UI owner-bookings.
     */
    async function fetchBookingsForOwner(propertyIds) {
        var rows = await fetchBookingsByPropertyIds(propertyIds);
        if (!rows.length) return [];
        var uidList = [];
        var seen = {};
        rows.forEach(function (r) {
            var u = r.user_id != null ? r.user_id : r.guest_id;
            if (u && !seen[u]) {
                seen[u] = true;
                uidList.push(u);
            }
        });
        var profileById = {};
        if (uidList.length) {
            var sb = ensureClient();
            var pr = await sb.from('profiles').select('id, full_name, email, phone').in('id', uidList);
            if (pr.error) throw pr.error;
            (pr.data || []).forEach(function (p) {
                profileById[p.id] = p;
            });
        }
        return rows.map(function (r) {
            var uid = r.user_id != null ? r.user_id : r.guest_id;
            var p = uid ? profileById[uid] : null;
            var ci = r.check_in;
            var co = r.check_out;
            var nights = null;
            if (ci && co) {
                var a = String(ci).split('-').map(Number);
                var b = String(co).split('-').map(Number);
                if (a.length >= 3 && b.length >= 3) {
                    var d0 = new Date(a[0], a[1] - 1, a[2]);
                    var d1 = new Date(b[0], b[1] - 1, b[2]);
                    var n = Math.round((d1.getTime() - d0.getTime()) / 86400000);
                    if (isFinite(n) && n > 0) nights = n;
                }
            }
            return {
                id: r.id,
                propertyId: r.property_id,
                checkIn: ci,
                checkOut: co,
                nights: nights,
                guests: r.guests,
                children: r.children,
                totalRub: Number(r.total_price || r.total_amount) || 0,
                status: r.status || 'pending',
                payType: r.pay_type,
                guestName: p && p.full_name ? String(p.full_name) : '—',
                guestEmail: p && p.email ? String(p.email) : '—',
                guestPhone: p && p.phone ? String(p.phone) : ''
            };
        });
    }

    async function updateBookingStatus(bookingId, status) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var bid = normalizeBookingRowId(bookingId);
        if (bid == null) throw new Error('Некорректный id брони');
        var ok = { pending: true, confirmed: true, completed: true, cancelled: true };
        if (!ok[String(status || '')]) throw new Error('Недопустимый статус');
        var res = await sb.from('bookings').update({ status: status }).eq('id', bid);
        if (res.error) throw res.error;
    }

    async function signIn(email, password) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var res = await sb.auth.signInWithPassword({ email: email, password: password });
        if (res.error) throw res.error;
        await syncLocalUserFromSupabase();
        return res.data;
    }

    async function signUp(payload) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');

        var signUpRes = await sb.auth.signUp({
            email: payload.email,
            password: payload.password,
            options: {
                data: {
                    full_name: payload.full_name || ''
                }
            }
        });
        if (signUpRes.error) throw signUpRes.error;
        if (!signUpRes.data || !signUpRes.data.user) return signUpRes.data;

        var userId = signUpRes.data.user.id;
        var profilePatch = {
            full_name: payload.full_name || '',
            email: payload.email,
            role: payload.role || 'guest',
            newsletter: !!payload.newsletter,
            owner_verification_status: payload.role === 'owner' ? 'pending' : 'pending'
        };

        var updateRes = await sb.from('profiles').update(profilePatch).eq('id', userId);
        if (updateRes.error) throw updateRes.error;

        // Fresh guest account starts from zero personal state.
        if ((payload.role || 'guest') === 'guest') {
            initPersonalGuestStorage(payload.email);
        }

        await syncLocalUserFromSupabase();
        return signUpRes.data;
    }

    async function signOut() {
        var sb = ensureClient();
        if (!sb) {
            clearLocalUser();
            return;
        }
        await sb.auth.signOut();
        clearLocalUser();
    }

    async function saveProfile(formData) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var user = await getSessionUser();
        if (!user) throw new Error('Пользователь не авторизован');

        var updatePayload = {
            full_name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            newsletter: !!formData.newsletter
        };
        if (typeof formData.avatarUrl !== 'undefined') {
            updatePayload.avatar_url = formData.avatarUrl;
        }

        var updateRes = await sb.from('profiles').update(updatePayload).eq('id', user.id);
        if (updateRes.error) throw updateRes.error;

        var refreshed = await syncLocalUserFromSupabase();
        return refreshed;
    }

    async function uploadAvatar(file) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var user = await getSessionUser();
        if (!user) throw new Error('Пользователь не авторизован');

        var ext = (file.name || '').split('.').pop().toLowerCase();
        if (!ext) ext = 'jpg';
        var path = user.id + '/avatar-' + Date.now() + '.' + ext;

        var uploadRes = await sb.storage.from('avatars').upload(path, file, {
            upsert: true,
            contentType: file.type || 'image/jpeg'
        });
        if (uploadRes.error) throw uploadRes.error;

        var publicRes = sb.storage.from('avatars').getPublicUrl(path);
        return publicRes && publicRes.data ? publicRes.data.publicUrl : null;
    }

    function bootAuthSync() {
        var sb = ensureClient();
        if (!sb) return;
        syncLocalUserFromSupabase();
        sb.auth.onAuthStateChange(function () {
            syncLocalUserFromSupabase();
        });
    }

    window.silvaSupabaseAuth = {
        ensureClient: ensureClient,
        getSessionUser: getSessionUser,
        syncLocalUserFromSupabase: syncLocalUserFromSupabase,
        signIn: signIn,
        signUp: signUp,
        signOut: signOut,
        saveProfile: saveProfile,
        uploadAvatar: uploadAvatar,
        fetchPropertiesCache: fetchPropertiesCache,
        fetchPropertiesByIds: fetchPropertiesByIds,
        saveOwnerProperty: saveOwnerProperty,
        deleteOwnerProperty: deleteOwnerProperty,
        fetchFavorites: fetchFavorites,
        setFavorite: setFavorite,
        createBooking: createBooking,
        fetchMyBookings: fetchMyBookings,
        cancelBooking: cancelBooking,
        fetchBookingsByPropertyIds: fetchBookingsByPropertyIds,
        fetchBookingsForOwner: fetchBookingsForOwner,
        updateBookingStatus: updateBookingStatus,
        readLocalUser: readLocalUser,
        clearLocalUser: clearLocalUser,
        bootAuthSync: bootAuthSync
    };

    bootAuthSync();
})(window);
