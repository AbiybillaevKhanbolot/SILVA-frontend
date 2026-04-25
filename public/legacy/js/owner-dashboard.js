document.addEventListener('DOMContentLoaded', async function () {
    'use strict';
    if (typeof requireOwnerOrRedirect !== 'function' || !requireOwnerOrRedirect()) return;
    if (typeof initOwnerSubnav === 'function') initOwnerSubnav();
    if (typeof applyOwnerVerificationGate === 'function') applyOwnerVerificationGate();

    if (typeof mockAPI !== 'undefined' && typeof mockAPI.refreshPropertiesFromSupabase === 'function') {
        try { await mockAPI.refreshPropertiesFromSupabase(); } catch (e) {}
    }
    var listings = typeof getMyOwnerListings === 'function' ? getMyOwnerListings() : [];
    var published = listings.filter(function (p) {
        return p.status === 'published';
    });
    var myIds = listings
        .map(function (p) {
            return p && p.id != null ? String(p.id).trim() : '';
        })
        .filter(Boolean);

    var bookingsCount = 0;
    if (window.silvaSupabaseAuth && typeof window.silvaSupabaseAuth.fetchBookingsByPropertyIds === 'function') {
        try {
            var ownerBookings = await window.silvaSupabaseAuth.fetchBookingsByPropertyIds(myIds);
            bookingsCount = Array.isArray(ownerBookings) ? ownerBookings.length : 0;
        } catch (e) {}
    }

    var reviewsCount = 0;
    if (typeof mockAPI !== 'undefined') {
        myIds.forEach(function (id) {
            reviewsCount += mockAPI.getReviewsForProperty(id).length;
        });
    }

    var el = function (id) {
        return document.getElementById(id);
    };
    if (el('stat-listings')) el('stat-listings').textContent = String(listings.length);
    if (el('stat-published')) el('stat-published').textContent = String(published.length);
    if (el('stat-bookings')) el('stat-bookings').textContent = String(bookingsCount);
    if (el('stat-reviews')) el('stat-reviews').textContent = String(reviewsCount);
});
