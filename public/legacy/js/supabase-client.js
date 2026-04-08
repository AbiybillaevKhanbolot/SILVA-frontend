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

    function mapPropertyRowToLegacy(row, images) {
        var gallery = (images || []).map(function (img) { return img.image_url; }).filter(Boolean);
        return {
            id: Number(row.id),
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
            amenities: ['wifi'],
            conditions: ['Заезд с 14:00', 'Выезд до 12:00'],
            extra_info: [],
            visa_info: 'Для граждан РФ виза не требуется. Иностранным гостям необходимо иметь действующую визу РФ.',
            map_lat: 59.9343,
            map_lng: 30.3356,
            created_at: row.created_at || null
        };
    }

    function toPropertyId(value) {
        var id = Number(value);
        if (!isFinite(id) || id <= 0) return null;
        return Math.floor(id);
    }

    async function fetchPropertiesCache() {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var q = await sb
            .from('properties')
            .select('id, owner_id, title, address, region, property_type, description, price_per_night, max_guests, status, rating, reviews_count, created_at')
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

    async function saveOwnerProperty(payload) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var user = await getSessionUser();
        if (!user) throw new Error('Пользователь не авторизован');
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
            reviews_count: Number(payload.reviews_count) || 0
        };
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
        var ids = (q.data || []).map(function (x) { return Number(x.property_id); });
        var email = normalizeEmail((readLocalUser() || {}).email);
        var key = email ? 'silva_favorites_' + email : 'silva_favorites';
        localStorage.setItem(key, JSON.stringify(ids));
        return ids;
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

    async function createBooking(payload) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var ins = await sb.from('bookings').insert({
            property_id: payload.propertyId,
            check_in: payload.checkIn,
            check_out: payload.checkOut,
            guests: payload.guests,
            children: payload.children || 0,
            total_price: payload.totalRub || 0,
            status: 'pending'
        });
        if (ins.error) throw ins.error;
    }

    async function fetchMyBookings() {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var q = await sb
            .from('bookings')
            .select('id, property_id, check_in, check_out, guests, children, total_price, status, created_at')
            .order('created_at', { ascending: false });
        if (q.error) throw q.error;
        return q.data || [];
    }

    async function cancelBooking(bookingId) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var del = await sb.from('bookings').delete().eq('id', bookingId);
        if (del.error) throw del.error;
    }

    async function fetchBookingsByPropertyIds(propertyIds) {
        var sb = ensureClient();
        if (!sb) throw new Error('Supabase SDK is not loaded');
        var ids = (propertyIds || []).map(function (x) { return Number(x); }).filter(Boolean);
        if (!ids.length) return [];
        var q = await sb
            .from('bookings')
            .select('id, property_id, check_in, check_out, guests, children, total_price, status, created_at')
            .in('property_id', ids);
        if (q.error) throw q.error;
        return q.data || [];
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
        saveOwnerProperty: saveOwnerProperty,
        deleteOwnerProperty: deleteOwnerProperty,
        fetchFavorites: fetchFavorites,
        setFavorite: setFavorite,
        createBooking: createBooking,
        fetchMyBookings: fetchMyBookings,
        cancelBooking: cancelBooking,
        fetchBookingsByPropertyIds: fetchBookingsByPropertyIds,
        readLocalUser: readLocalUser,
        clearLocalUser: clearLocalUser,
        bootAuthSync: bootAuthSync
    };

    bootAuthSync();
})(window);
