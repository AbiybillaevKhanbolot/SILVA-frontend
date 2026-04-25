(function (window) {
    'use strict';

    var FIREBASE_SDK_VERSION = '10.12.5';
    var FIREBASE_CONFIG = window.SILVA_FIREBASE_CONFIG || {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    };

    var app = null;
    var auth = null;
    var db = null;
    var storage = null;
    var initPromise = null;
    var authObserverBound = false;
    var authReadyResolved = false;
    var authReadyPromise = new Promise(function (resolve) {
        window.__silvaAuthReadyResolve = function () {
            if (authReadyResolved) return;
            authReadyResolved = true;
            resolve();
        };
    });

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = function () {
                reject(new Error('Не удалось загрузить SDK: ' + src));
            };
            document.head.appendChild(s);
        });
    }

    function isFirebaseReady() {
        return !!(window.firebase && window.firebase.initializeApp && window.firebase.auth && window.firebase.firestore);
    }

    function refreshFirebaseConfig() {
        if (window.SILVA_FIREBASE_CONFIG) {
            FIREBASE_CONFIG = window.SILVA_FIREBASE_CONFIG;
        }
    }

    function hasFirebaseConfig() {
        return !!(
            FIREBASE_CONFIG &&
            FIREBASE_CONFIG.apiKey &&
            FIREBASE_CONFIG.authDomain &&
            FIREBASE_CONFIG.projectId &&
            FIREBASE_CONFIG.appId
        );
    }

    async function ensureFirebase() {
        if (app && auth && db) return true;
        if (initPromise) return initPromise;

        initPromise = (async function () {
            refreshFirebaseConfig();
            if (!hasFirebaseConfig()) {
                try {
                    await loadScript('js/firebase-config.js');
                    refreshFirebaseConfig();
                } catch (eConfig) {}
            }
            if (!hasFirebaseConfig()) {
                throw new Error(
                    'Firebase не настроен: создайте public/legacy/js/firebase-config.js и задайте window.SILVA_FIREBASE_CONFIG.'
                );
            }
            if (!isFirebaseReady()) {
                var base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_SDK_VERSION + '/';
                await loadScript(base + 'firebase-app-compat.js');
                await loadScript(base + 'firebase-auth-compat.js');
                await loadScript(base + 'firebase-firestore-compat.js');
                await loadScript(base + 'firebase-storage-compat.js');
            }
            if (!window.firebase.apps || !window.firebase.apps.length) {
                app = window.firebase.initializeApp(FIREBASE_CONFIG);
            } else {
                app = window.firebase.apps[0];
            }
            auth = window.firebase.auth();
            db = window.firebase.firestore();
            storage = window.firebase.storage();
            return true;
        })();

        return initPromise;
    }

    function bindAuthObserver() {
        if (!auth || authObserverBound) return;
        authObserverBound = true;
        auth.onAuthStateChanged(function () {
            if (typeof window.__silvaAuthReadyResolve === 'function') {
                window.__silvaAuthReadyResolve();
            }
            syncLocalUserFromSupabase({ waitForAuthReady: false });
        });
    }

    async function waitForAuthReady() {
        await ensureFirebase();
        bindAuthObserver();
        await authReadyPromise;
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

    function normalizeAnyId(value) {
        var s = String(value == null ? '' : value).trim();
        return s || null;
    }

    function normalizeOwnerVerificationStatus(raw) {
        var s = String(raw || '').trim().toLowerCase();
        if (s === 'verified' || s === 'approved') return 'approved';
        if (s === 'rejected' || s === 'denied') return 'rejected';
        return 'pending';
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function authRedirectUrl(path, query) {
        try {
            var win = window;
            try {
                if (win.parent && win.parent !== win && win.parent.location.origin === win.location.origin) {
                    win = win.parent;
                }
            } catch (e) {}
            var origin = win.location && win.location.origin ? win.location.origin : '';
            if (!origin) return '';
            var cleanPath = String(path || '/legacy/login.html').replace(/^\/*/, '/');
            var q = String(query || '').trim();
            if (q && q.charAt(0) !== '?') q = '?' + q;
            return origin + cleanPath + q;
        } catch (e2) {
            return '';
        }
    }

    function fileToDataUrl(file) {
        return new Promise(function (resolve, reject) {
            try {
                var reader = new FileReader();
                reader.onload = function () {
                    resolve(typeof reader.result === 'string' ? reader.result : null);
                };
                reader.onerror = function () {
                    reject(new Error('Не удалось прочитать файл'));
                };
                reader.readAsDataURL(file);
            } catch (e) {
                reject(e);
            }
        });
    }

    function initPersonalGuestStorage(email) {
        var e = normalizeEmail(email);
        if (!e) return;
        localStorage.setItem('silva_loyalty_points_' + e, '0');
        localStorage.setItem('silva_bookings_' + e, '[]');
        localStorage.setItem('silva_favorites_' + e, '[]');
    }

    async function getSessionUser() {
        await waitForAuthReady();
        var u = auth.currentUser;
        if (!u) return null;
        return { id: u.uid, email: u.email || '' };
    }

    async function fetchProfile(userId) {
        await ensureFirebase();
        if (!userId) return null;
        var snap = await db.collection('profiles').doc(String(userId)).get();
        if (!snap.exists) return null;
        var p = snap.data() || {};
        return {
            id: String(userId),
            full_name: p.full_name || '',
            email: p.email || '',
            phone: p.phone || '',
            avatar_url: p.avatar_url || null,
            role: p.role || 'guest',
            newsletter: !!p.newsletter,
            owner_verification_status: p.owner_verification_status || 'pending'
        };
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

    async function syncLocalUserFromSupabase(opts) {
        await ensureFirebase();
        var wait = !opts || opts.waitForAuthReady !== false;
        if (wait) {
            await waitForAuthReady();
        } else {
            bindAuthObserver();
        }
        var user = auth.currentUser;
        if (!user) {
            clearLocalUser();
            return null;
        }
        var profile = await fetchProfile(user.uid);
        if (!profile) {
            profile = {
                id: user.uid,
                full_name: user.displayName || '',
                email: user.email || '',
                phone: '',
                avatar_url: user.photoURL || null,
                role: 'guest',
                newsletter: false,
                owner_verification_status: 'pending'
            };
            await db.collection('profiles').doc(user.uid).set(profile, { merge: true });
        }
        var localUser = mapProfileToLocalUser(profile, user.email || '');
        writeLocalUser(localUser);
        return localUser;
    }

    function mapPropertyRowToLegacy(id, row) {
        var gallery = Array.isArray(row.gallery_images) ? row.gallery_images.filter(Boolean) : [];
        return {
            id: String(id),
            owner_id: row.owner_id || null,
            ownerEmail: '',
            title: row.title || '',
            address: row.address || '',
            region: row.region || '',
            property_type: row.property_type || 'cottage',
            price_per_night: Number(row.price_per_night) || 0,
            max_guests: Number(row.max_guests) || 1,
            bedrooms: row.bedrooms != null ? Number(row.bedrooms) : 1,
            bathrooms: row.bathrooms != null ? Number(row.bathrooms) : 1,
            area: row.area != null ? Number(row.area) : 50,
            rating: Number(row.rating) || 0,
            reviews_count: Number(row.reviews_count) || 0,
            gallery_images: gallery,
            main_image: gallery[0] || null,
            eco_certified: false,
            is_featured: false,
            is_owner_listing: true,
            status: row.status || 'draft',
            description: row.description || '',
            amenities: Array.isArray(row.amenities) ? row.amenities : [],
            conditions: ['Заезд с 14:00', 'Выезд до 12:00'],
            extra_info: [],
            visa_info: 'Для граждан РФ виза не требуется. Иностранным гостям необходимо иметь действующую визу РФ.',
            map_lat: 59.9343,
            map_lng: 30.3356,
            created_at: row.created_at || null
        };
    }

    async function fetchPropertiesCache() {
        await ensureFirebase();
        var snap = await db.collection('properties').orderBy('created_at', 'desc').get();
        var mapped = [];
        snap.forEach(function (doc) {
            mapped.push(mapPropertyRowToLegacy(doc.id, doc.data() || {}));
        });
        localStorage.setItem('silva_owner_properties', JSON.stringify(mapped));
        return mapped;
    }

    async function fetchPropertiesByIds(propertyIds) {
        await ensureFirebase();
        var ids = (propertyIds || []).map(normalizeAnyId).filter(Boolean);
        if (!ids.length) return [];
        var out = [];
        for (var i = 0; i < ids.length; i++) {
            var snap = await db.collection('properties').doc(ids[i]).get();
            if (snap.exists) out.push(mapPropertyRowToLegacy(snap.id, snap.data() || {}));
        }
        return out;
    }

    async function saveOwnerProperty(payload) {
        await ensureFirebase();
        var user = auth.currentUser;
        if (!user) throw new Error('Пользователь не авторизован');
        var profile = await fetchProfile(user.uid);
        var role = String((profile && profile.role) || '').trim().toLowerCase();
        var verification = normalizeOwnerVerificationStatus(
            profile && profile.owner_verification_status
        );
        if (role !== 'owner') {
            throw new Error('Добавлять объекты могут только аккаунты владельца.');
        }
        if (verification !== 'approved') {
            throw new Error(
                'Аккаунт владельца еще не подтвержден. Добавление объектов доступно после одобрения.'
            );
        }
        var propertyId = normalizeAnyId(payload.id);
        var patch = {
            owner_id: user.uid,
            title: payload.title || '',
            address: payload.address || null,
            region: payload.region || null,
            property_type: payload.property_type || 'cottage',
            description: payload.description || null,
            price_per_night: Number(payload.price_per_night) || 0,
            max_guests: Number(payload.max_guests) || 1,
            bedrooms: parseInt(payload.bedrooms, 10) || 1,
            bathrooms: parseInt(payload.bathrooms, 10) || 1,
            area: parseInt(payload.area, 10) || 50,
            status: payload.status === 'published' ? 'published' : 'draft',
            amenities: Array.isArray(payload.amenities) ? payload.amenities : ['wifi'],
            gallery_images: Array.isArray(payload.gallery_images) ? payload.gallery_images.slice(0, 10) : [],
            updated_at: nowIso()
        };
        if (!propertyId) {
            patch.created_at = nowIso();
            var insRef = await db.collection('properties').add(patch);
            propertyId = insRef.id;
        } else {
            var ref = db.collection('properties').doc(propertyId);
            var ex = await ref.get();
            if (!ex.exists) patch.created_at = nowIso();
            await ref.set(patch, { merge: true });
        }
        await fetchPropertiesCache();
        return propertyId;
    }

    async function deleteOwnerProperty(propertyId) {
        await ensureFirebase();
        var id = normalizeAnyId(propertyId);
        if (!id) throw new Error('Некорректный идентификатор объекта.');
        await db.collection('properties').doc(id).delete();
        await fetchPropertiesCache();
    }

    async function fetchFavorites() {
        await ensureFirebase();
        var user = await getSessionUser();
        if (!user) return [];
        var q = await db.collection('favorites').where('user_id', '==', user.id).orderBy('created_at', 'desc').get();
        var ids = [];
        q.forEach(function (d) {
            var row = d.data() || {};
            if (row.property_id) ids.push(String(row.property_id));
        });
        var email = normalizeEmail((readLocalUser() || {}).email);
        var key = email ? 'silva_favorites_' + email : 'silva_favorites';
        localStorage.setItem(key, JSON.stringify(ids));
        return ids;
    }

    async function setFavorite(propertyId, isFavorite) {
        await ensureFirebase();
        var user = await getSessionUser();
        if (!user) throw new Error('Нужна авторизация');
        var pid = normalizeAnyId(propertyId);
        if (!pid) throw new Error('Некорректный объект');
        var id = user.id + '__' + pid;
        if (isFavorite) {
            await db.collection('favorites').doc(id).set({
                user_id: user.id,
                property_id: pid,
                created_at: nowIso()
            });
        } else {
            await db.collection('favorites').doc(id).delete();
        }
        return fetchFavorites();
    }

    function toBookingDateKeyLocal(d) {
        if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function parseBookingDateKeyToLocal(key) {
        if (!key || typeof key !== 'string') return null;
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
        if (!m) return null;
        return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    }

    function bookingDateKeyAddDays(key, deltaDays) {
        var dt = parseBookingDateKeyToLocal(key);
        if (!dt) return null;
        dt.setDate(dt.getDate() + (parseInt(deltaDays, 10) || 0));
        return toBookingDateKeyLocal(dt);
    }

    function isNightBookedInRanges(dateKey, ranges) {
        if (!dateKey || !ranges || !ranges.length) return false;
        for (var i = 0; i < ranges.length; i++) {
            var r = ranges[i];
            var a = String(r.check_in == null ? '' : r.check_in).slice(0, 10);
            var b = String(r.check_out == null ? '' : r.check_out).slice(0, 10);
            if (a && b && dateKey >= a && dateKey < b) return true;
        }
        return false;
    }

    function isStayAvailableInRanges(checkinKey, checkoutKey, ranges) {
        if (!checkinKey || !checkoutKey || checkinKey >= checkoutKey) return false;
        var d = checkinKey;
        var guard = 0;
        while (d < checkoutKey) {
            if (isNightBookedInRanges(d, ranges)) return false;
            d = bookingDateKeyAddDays(d, 1);
            if (guard++ > 3660) return false;
        }
        return true;
    }

    function findFirstAvailableStayDates(todayStart, ranges, nightCount) {
        var nights = Math.max(1, parseInt(nightCount, 10) || 1);
        var start = new Date(todayStart);
        start.setHours(0, 0, 0, 0);
        var ci = new Date(start);
        ci.setDate(ci.getDate() + 1);
        for (var iter = 0; iter < 800; iter++) {
            var ciKey = toBookingDateKeyLocal(ci);
            if (!ciKey) break;
            var coKey = bookingDateKeyAddDays(ciKey, nights);
            if (coKey && isStayAvailableInRanges(ciKey, coKey, ranges)) {
                var c = parseBookingDateKeyToLocal(coKey);
                return { checkin: new Date(ci), checkout: c };
            }
            ci.setDate(ci.getDate() + 1);
        }
        return null;
    }

    async function fetchPropertyBookedDateRanges(propertyIdRaw) {
        await ensureFirebase();
        var pid = normalizeAnyId(propertyIdRaw);
        if (!pid) return [];
        var q = await db
            .collection('bookings')
            .where('property_id', '==', pid)
            .where('status', 'in', ['pending', 'confirmed', 'completed'])
            .get();
        var ranges = [];
        q.forEach(function (d) {
            var r = d.data() || {};
            if (r.check_in && r.check_out) {
                ranges.push({ check_in: String(r.check_in).slice(0, 10), check_out: String(r.check_out).slice(0, 10) });
            }
        });
        return ranges;
    }

    async function createBooking(payload) {
        await ensureFirebase();
        var user = await getSessionUser();
        if (!user || !user.id) throw new Error('Нужна авторизация для бронирования');
        var pid = normalizeAnyId(payload.propertyId);
        if (!pid) throw new Error('Не указан объект для бронирования');
        var row = {
            user_id: user.id,
            guest_id: user.id,
            property_id: pid,
            check_in: payload.checkIn,
            check_out: payload.checkOut,
            guests: Number(payload.guests) || 1,
            children: Number(payload.children) || 0,
            total_price: Number(payload.totalRub) || 0,
            total_amount: Number(payload.totalRub) || 0,
            pay_type: String(payload.payType || 'full') === '30' ? '30' : 'full',
            status: 'pending',
            created_at: nowIso()
        };
        var ref = await db.collection('bookings').add(row);
        return ref.id;
    }

    async function fetchMyBookings() {
        await ensureFirebase();
        var user = await getSessionUser();
        if (!user) return [];
        var q = await db.collection('bookings').where('user_id', '==', user.id).orderBy('created_at', 'desc').get();
        var out = [];
        q.forEach(function (d) {
            var row = d.data() || {};
            row.id = d.id;
            out.push(row);
        });
        return out;
    }

    async function cancelBooking(bookingId) {
        await ensureFirebase();
        var bid = normalizeAnyId(bookingId);
        if (!bid) throw new Error('Некорректный id брони');
        await db.collection('bookings').doc(bid).delete();
    }

    async function fetchBookingsByPropertyIds(propertyIds) {
        await ensureFirebase();
        var ids = (propertyIds || []).map(normalizeAnyId).filter(Boolean);
        if (!ids.length) return [];
        var out = [];
        for (var i = 0; i < ids.length; i++) {
            var q = await db.collection('bookings').where('property_id', '==', ids[i]).get();
            q.forEach(function (d) {
                var row = d.data() || {};
                row.id = d.id;
                out.push(row);
            });
        }
        return out;
    }

    async function fetchBookingsForOwner(propertyIds) {
        var rows = await fetchBookingsByPropertyIds(propertyIds);
        var uidMap = {};
        for (var i = 0; i < rows.length; i++) {
            var u = rows[i].user_id || rows[i].guest_id;
            if (u) uidMap[u] = true;
        }
        var profileById = {};
        var uids = Object.keys(uidMap);
        for (var j = 0; j < uids.length; j++) {
            var p = await fetchProfile(uids[j]);
            if (p) profileById[uids[j]] = p;
        }
        return rows.map(function (r) {
            var uid = r.user_id || r.guest_id;
            var p = uid ? profileById[uid] : null;
            return {
                id: r.id,
                propertyId: r.property_id,
                checkIn: r.check_in,
                checkOut: r.check_out,
                nights: null,
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
        await ensureFirebase();
        var bid = normalizeAnyId(bookingId);
        if (!bid) throw new Error('Некорректный id брони');
        var ok = { pending: true, confirmed: true, completed: true, cancelled: true };
        if (!ok[String(status || '')]) throw new Error('Недопустимый статус');
        await db.collection('bookings').doc(bid).set({ status: status, updated_at: nowIso() }, { merge: true });
    }

    async function fetchLoyaltyPoints() {
        await ensureFirebase();
        var user = await getSessionUser();
        if (!user) return 0;
        var doc = await db.collection('loyalty_accounts').doc(user.id).get();
        if (!doc.exists) return 0;
        return Number((doc.data() || {}).points) || 0;
    }

    async function incrementLoyaltyPointsAfterPayment(delta, reason, bookingRowId) {
        await ensureFirebase();
        var user = await getSessionUser();
        if (!user || !user.id) throw new Error('Нет сессии');
        var d = Math.floor(Number(delta));
        if (!isFinite(d) || d < 1) return;
        var ref = db.collection('loyalty_accounts').doc(user.id);
        var cur = await ref.get();
        var current = cur.exists ? Number((cur.data() || {}).points) || 0 : 0;
        var next = current + d;
        await ref.set({ user_id: user.id, points: next, updated_at: nowIso() }, { merge: true });
        await db.collection('loyalty_transactions').add({
            user_id: user.id,
            amount: d,
            reason: reason || 'Оплата бронирования',
            booking_id: bookingRowId ? String(bookingRowId) : null,
            created_at: nowIso()
        });
    }

    async function fetchReviewsForProperty(propertyId) {
        await ensureFirebase();
        var pid = normalizeAnyId(propertyId);
        if (!pid) return [];
        var q = await db.collection('reviews').where('property_id', '==', pid).orderBy('created_at', 'desc').get();
        var out = [];
        q.forEach(function (d) {
            var row = d.data() || {};
            out.push({
                id: 'db-' + d.id,
                _dbReviewId: d.id,
                _authorUserId: row.user_id || null,
                _createdAt: row.created_at || null,
                author: row.author_name || 'Гость',
                authorCountry: 'RU',
                stayType: 'гость',
                stayDate: new Date(row.created_at || nowIso()).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
                roomInfo: '—',
                rating: (Number(row.rating) || 0) * 2,
                ratingLabel: 'Хорошо',
                text: row.text || '',
                textShort: true,
                helpfulYes: 0,
                helpfulNo: 0,
                hotelResponse: row.owner_response_text || null,
                hotelResponseAvatar: row.owner_avatar_url || null,
                photos: [],
                categories: {},
                avatar: row.avatar_url || null
            });
        });
        return out;
    }

    function parseDbReviewId(reviewIdStr) {
        var s = String(reviewIdStr || '');
        if (s.indexOf('db-') !== 0) return null;
        var rest = s.slice(3);
        return rest || null;
    }

    async function insertReview(payload) {
        await ensureFirebase();
        var user = auth.currentUser;
        if (!user || !user.uid) throw new Error('Войдите снова (сессия истекла).');
        var pid = normalizeAnyId(payload && payload.propertyId);
        if (!pid) throw new Error('Некорректный объект');
        var stars = Number(payload && payload.rating);
        if (isNaN(stars) || stars < 1 || stars > 5) throw new Error('Оценка должна быть от 1 до 5');
        var txt = payload && payload.text != null ? String(payload.text).trim() : '';
        if (!txt) throw new Error('Введите текст отзыва');
        var p = await fetchProfile(user.uid);
        var row = {
            property_id: pid,
            user_id: user.uid,
            rating: stars,
            text: txt,
            avatar_url: payload && payload.avatarUrl ? String(payload.avatarUrl) : (p && p.avatar_url ? p.avatar_url : null),
            author_name: p && p.full_name ? p.full_name : 'Гость',
            created_at: nowIso()
        };
        var ins = await db.collection('reviews').add(row);
        return { id: ins.id };
    }

    async function deleteMyReview(reviewIdUi) {
        await ensureFirebase();
        var user = auth.currentUser;
        if (!user || !user.uid) throw new Error('Войдите снова — сессия истекла.');
        var rid = parseDbReviewId(reviewIdUi);
        if (!rid) throw new Error('Некорректный отзыв');
        var ref = db.collection('reviews').doc(rid);
        var snap = await ref.get();
        if (!snap.exists) return true;
        var row = snap.data() || {};
        if (row.user_id !== user.uid) throw new Error('Удалять можно только свой отзыв');
        await ref.delete();
        return true;
    }

    async function upsertReviewResponse(payload) {
        await ensureFirebase();
        var user = auth.currentUser;
        if (!user || !user.uid) throw new Error('Войдите снова — сессия истекла.');
        var reviewIdParsed = parseDbReviewId(payload && payload.reviewId);
        if (!reviewIdParsed) throw new Error('Ответ доступен только к отзывам из базы');
        var text = payload && payload.text != null ? String(payload.text).trim() : '';
        if (!text) throw new Error('Введите текст ответа');
        await db.collection('reviews').doc(reviewIdParsed).set(
            {
                owner_id: user.uid,
                owner_response_text: text,
                owner_avatar_url: payload && payload.ownerAvatarUrl ? String(payload.ownerAvatarUrl) : null,
                owner_response_updated_at: nowIso()
            },
            { merge: true }
        );
        return true;
    }

    async function deleteReviewResponse(reviewIdRaw) {
        await ensureFirebase();
        var reviewIdParsed =
            typeof reviewIdRaw === 'string' && reviewIdRaw.indexOf('db-') === 0 ? parseDbReviewId(reviewIdRaw) : normalizeAnyId(reviewIdRaw);
        if (!reviewIdParsed) return;
        await db.collection('reviews').doc(reviewIdParsed).set(
            {
                owner_response_text: window.firebase.firestore.FieldValue.delete(),
                owner_avatar_url: window.firebase.firestore.FieldValue.delete(),
                owner_response_updated_at: window.firebase.firestore.FieldValue.delete()
            },
            { merge: true }
        );
    }

    async function requestPasswordReset(email) {
        await ensureFirebase();
        var e = normalizeEmail(email);
        if (!e) throw new Error('Укажите почту');
        var methods = await auth.fetchSignInMethodsForEmail(e);
        if (!methods || methods.indexOf('password') === -1) {
            throw new Error('Пользователь с такой почтой не найден или вход по паролю не включен для этого аккаунта.');
        }
        var redirectTo = authRedirectUrl('/legacy/login.html', 'recover=1');
        var actionCodeSettings = redirectTo
            ? { url: redirectTo, handleCodeInApp: false }
            : undefined;
        await auth.sendPasswordResetEmail(e, actionCodeSettings);
    }

    async function verifyPasswordRecoveryOtp() {
        throw new Error('В Firebase код не вводится вручную: откройте ссылку из письма восстановления.');
    }

    async function setNewPasswordAfterRecovery() {
        throw new Error('В Firebase новый пароль задаётся на странице по ссылке из письма.');
    }

    async function signIn(email, password) {
        await ensureFirebase();
        var res = await auth.signInWithEmailAndPassword(email, password);
        if (!res || !res.user) throw new Error('Не удалось войти');
        await syncLocalUserFromSupabase();
        return { user: { id: res.user.uid, email: res.user.email || '' }, session: { provider: 'firebase' } };
    }

    async function signUp(payload) {
        await ensureFirebase();
        var cred = await auth.createUserWithEmailAndPassword(payload.email, payload.password);
        var user = cred.user;
        if (!user) throw new Error('Не удалось создать пользователя');
        await user.updateProfile({ displayName: payload.full_name || '' });
        await db.collection('profiles').doc(user.uid).set(
            {
                id: user.uid,
                full_name: payload.full_name || '',
                email: payload.email || '',
                phone: '',
                avatar_url: null,
                role: payload.role || 'guest',
                newsletter: !!payload.newsletter,
                owner_verification_status: 'pending',
                created_at: nowIso()
            },
            { merge: true }
        );
        if (payload.role === 'guest') initPersonalGuestStorage(payload.email);
        await user.sendEmailVerification();
        await syncLocalUserFromSupabase();
        return { user: { id: user.uid, email: user.email || '' }, session: { provider: 'firebase' } };
    }

    async function verifySignupOtp() {
        throw new Error('В Firebase нет OTP-кода для регистрации: подтвердите e-mail по ссылке из письма.');
    }

    async function resendSignupConfirmationEmail() {
        await ensureFirebase();
        var u = auth.currentUser;
        if (!u) throw new Error('Нет активной сессии');
        await u.sendEmailVerification();
    }

    async function signOut() {
        await ensureFirebase();
        await auth.signOut();
        clearLocalUser();
    }

    async function saveProfile(formData) {
        await ensureFirebase();
        var user = auth.currentUser;
        if (!user) throw new Error('Пользователь не авторизован');
        var updatePayload = {
            full_name: formData.name || '',
            email: formData.email || user.email || '',
            phone: formData.phone || null,
            newsletter: !!formData.newsletter,
            updated_at: nowIso()
        };
        if (typeof formData.avatarUrl !== 'undefined') {
            updatePayload.avatar_url = formData.avatarUrl;
        }
        await db.collection('profiles').doc(user.uid).set(updatePayload, { merge: true });
        if (formData.name && user.displayName !== formData.name) {
            await user.updateProfile({ displayName: formData.name });
        }
        var refreshed = await syncLocalUserFromSupabase();
        return refreshed;
    }

    async function uploadAvatar(file) {
        await ensureFirebase();
        var user = auth.currentUser;
        if (!user) throw new Error('Пользователь не авторизован');
        try {
            var ext = (file.name || '').split('.').pop().toLowerCase() || 'jpg';
            var path = 'avatars/' + user.uid + '/avatar-' + Date.now() + '.' + ext;
            var ref = storage.ref().child(path);
            await ref.put(file, { contentType: file.type || 'image/jpeg' });
            return await ref.getDownloadURL();
        } catch (eStorage) {
            // Spark-план или отключенный Storage: сохраняем avatar как Data URL в Firestore.
            var dataUrl = await fileToDataUrl(file);
            if (!dataUrl) throw new Error('Не удалось загрузить аватар');
            return dataUrl;
        }
    }

    function queryBuilder(collectionName) {
        var q = db.collection(collectionName);
        return {
            select: function () { return this; },
            eq: function (field, value) { q = q.where(field, '==', value); return this; },
            in: function (field, values) { q = q.where(field, 'in', values); return this; },
            order: function (field, opts) { q = q.orderBy(field, opts && opts.ascending === false ? 'desc' : 'asc'); return this; },
            maybeSingle: async function () {
                var snap = await q.limit(1).get();
                if (snap.empty) return { data: null, error: null };
                var d = snap.docs[0];
                var row = d.data() || {};
                row.id = d.id;
                return { data: row, error: null };
            },
            single: async function () {
                return this.maybeSingle();
            },
            insert: async function (payload) {
                var list = Array.isArray(payload) ? payload : [payload];
                var ids = [];
                for (var i = 0; i < list.length; i++) {
                    var ref = await db.collection(collectionName).add(Object.assign({}, list[i], { created_at: nowIso() }));
                    ids.push(ref.id);
                }
                return { data: ids, error: null };
            },
            update: async function (patch) {
                var snap = await q.get();
                for (var i = 0; i < snap.docs.length; i++) {
                    await snap.docs[i].ref.set(Object.assign({}, patch, { updated_at: nowIso() }), { merge: true });
                }
                return { data: null, error: null };
            },
            delete: async function () {
                var snap = await q.get();
                for (var i = 0; i < snap.docs.length; i++) {
                    await snap.docs[i].ref.delete();
                }
                return { data: null, error: null };
            },
            get: async function () {
                var snap = await q.get();
                var rows = [];
                snap.forEach(function (d) {
                    var row = d.data() || {};
                    row.id = d.id;
                    rows.push(row);
                });
                return { data: rows, error: null };
            }
        };
    }

    function ensureClient() {
        return {
            from: function (collectionName) {
                return queryBuilder(collectionName);
            }
        };
    }

    function bootAuthSync() {
        ensureFirebase()
            .then(function () {
                bindAuthObserver();
                syncLocalUserFromSupabase();
            })
            .catch(function (e) {
                console.warn('[Silva] Firebase init failed:', e && e.message ? e.message : e);
            });
    }

    window.silvaSupabaseAuth = {
        ensureClient: ensureClient,
        getSessionUser: getSessionUser,
        syncLocalUserFromSupabase: syncLocalUserFromSupabase,
        requestPasswordReset: requestPasswordReset,
        verifyPasswordRecoveryOtp: verifyPasswordRecoveryOtp,
        setNewPasswordAfterRecovery: setNewPasswordAfterRecovery,
        signIn: signIn,
        signUp: signUp,
        verifySignupOtp: verifySignupOtp,
        resendSignupConfirmationEmail: resendSignupConfirmationEmail,
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
        fetchPropertyBookedDateRanges: fetchPropertyBookedDateRanges,
        toBookingDateKeyLocal: toBookingDateKeyLocal,
        parseBookingDateKeyToLocal: parseBookingDateKeyToLocal,
        isNightBookedInRanges: isNightBookedInRanges,
        isStayAvailableInRanges: isStayAvailableInRanges,
        findFirstAvailableStayDates: findFirstAvailableStayDates,
        fetchMyBookings: fetchMyBookings,
        cancelBooking: cancelBooking,
        fetchBookingsByPropertyIds: fetchBookingsByPropertyIds,
        fetchBookingsForOwner: fetchBookingsForOwner,
        updateBookingStatus: updateBookingStatus,
        fetchLoyaltyPoints: fetchLoyaltyPoints,
        incrementLoyaltyPointsAfterPayment: incrementLoyaltyPointsAfterPayment,
        fetchReviewsForProperty: fetchReviewsForProperty,
        insertReview: insertReview,
        deleteMyReview: deleteMyReview,
        upsertReviewResponse: upsertReviewResponse,
        deleteReviewResponse: deleteReviewResponse,
        readLocalUser: readLocalUser,
        clearLocalUser: clearLocalUser,
        bootAuthSync: bootAuthSync
    };

    bootAuthSync();
})(window);
