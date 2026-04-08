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
        readLocalUser: readLocalUser,
        clearLocalUser: clearLocalUser,
        bootAuthSync: bootAuthSync
    };

    bootAuthSync();
})(window);
