document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    if (typeof requireOwnerOrRedirect !== 'function' || !requireOwnerOrRedirect()) return;
    if (typeof initOwnerSubnav === 'function') initOwnerSubnav();

    var listings = typeof getMyOwnerListings === 'function' ? getMyOwnerListings() : [];
    var published = listings.filter(function (p) {
        return p.status === 'published';
    });
    var myIds = listings.map(function (p) {
        return Number(p.id);
    });

    var bookingsCount = 0;
    try {
        var raw = localStorage.getItem('silva_bookings');
        var bl = raw ? JSON.parse(raw) : [];
        if (Array.isArray(bl)) {
            bl.forEach(function (b) {
                var pid = Number(b.propertyId);
                if (myIds.indexOf(pid) !== -1) bookingsCount++;
            });
        }
    } catch (e) {}

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
