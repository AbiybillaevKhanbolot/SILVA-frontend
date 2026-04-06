/**
 * Галерея: главное фото + 4 миниатюры. Стрелка вправо — сдвиг очереди (первое из малых → в главное).
 * Стрелка влево — обратный сдвиг.
 */
(function (global) {
    'use strict';

    function getUrlsFromProperty(property) {
        if (!property) return [];
        if (property.gallery_images && property.gallery_images.length) {
            return property.gallery_images.slice().map(String);
        }
        if (property.main_image) return [String(property.main_image)];
        return [];
    }

    function escapeAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '');
    }

    function silvaInitRotatingGallery(cfg) {
        var mainEl = cfg.mainEl;
        var thumbEls = cfg.thumbEls || [];
        var prevBtn = cfg.prevBtn;
        var nextBtn = cfg.nextBtn;
        var dotsEl = cfg.dotsEl || null;
        var swipeEl = cfg.swipeEl || null;
        var alt = cfg.alt || '';
        var urls = (cfg.urls || []).slice().map(String);
        var n = urls.length;
        var placeholderSlots = cfg.placeholderSlots || 5;

        if (n === 0) {
            n = placeholderSlots;
            urls = new Array(n).fill('');
        }

        var k = 0;

        function placeholderHtml(isThumb) {
            if (typeof cfg.placeholderHtml === 'function') {
                return cfg.placeholderHtml(isThumb);
            }
            var ic = typeof SilvaIcons !== 'undefined'
                ? SilvaIcons.svg('image', isThumb ? 18 : 48, isThumb ? 18 : 48, {
                    className: 'gallery-placeholder-icon',
                    strokeWidth: 1.5
                })
                : '';
            return (
                '<div class="gallery-slide-placeholder' +
                (isThumb ? ' gallery-slide-placeholder--thumb' : '') +
                '">' +
                ic +
                (isThumb ? '' : '<span class="gallery-placeholder-text">Здесь будет изображение</span>') +
                '</div>'
            );
        }

        function fillCell(el, url) {
            if (!el) return;
            if (url) {
                el.innerHTML =
                    '<img src="' +
                    escapeAttr(url) +
                    '" alt="' +
                    escapeAttr(alt) +
                    '" loading="lazy">';
            } else {
                el.innerHTML = placeholderHtml(el.getAttribute('data-thumb') === '1');
            }
        }

        function renderDots() {
            if (!dotsEl) return;
            if (n <= 1) {
                dotsEl.innerHTML = '';
                return;
            }
            var h = '';
            var active = k % n;
            for (var i = 0; i < n; i++) {
                h +=
                    '<button type="button" class="gallery-dot' +
                    (i === active ? ' active' : '') +
                    '" data-idx="' +
                    i +
                    '" aria-label="Фото ' +
                    (i + 1) +
                    '"></button>';
            }
            dotsEl.innerHTML = h;
            dotsEl.querySelectorAll('.gallery-dot').forEach(function (dot) {
                dot.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var idx = parseInt(dot.getAttribute('data-idx'), 10);
                    if (!isNaN(idx)) goTo(idx);
                });
            });
        }

        function render() {
            var ni = n;
            fillCell(mainEl, urls[k % ni] || '');
            for (var j = 0; j < 4; j++) {
                fillCell(thumbEls[j], urls[(k + 1 + j) % ni] || '');
            }
            renderDots();
        }

        function goTo(slideIndex) {
            if (n <= 0) return;
            k = ((slideIndex % n) + n) % n;
            render();
        }

        function next() {
            k = (k + 1) % n;
            render();
        }

        function prev() {
            k = (k - 1 + n) % n;
            render();
        }

        function onNavClick(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function (e) {
                onNavClick(e);
                prev();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function (e) {
                onNavClick(e);
                next();
            });
        }

        if (swipeEl) {
            var touchStartX = 0;
            swipeEl.addEventListener(
                'touchstart',
                function (e) {
                    touchStartX = e.changedTouches[0].screenX;
                },
                { passive: true }
            );
            swipeEl.addEventListener(
                'touchend',
                function (e) {
                    var x = e.changedTouches[0].screenX;
                    if (x < touchStartX - 50) next();
                    if (x > touchStartX + 50) prev();
                },
                { passive: true }
            );
        }

        render();

        return { next: next, prev: prev, render: render, goTo: goTo };
    }

    global.silvaGetGalleryUrlsFromProperty = getUrlsFromProperty;
    global.silvaInitRotatingGallery = silvaInitRotatingGallery;
})(typeof window !== 'undefined' ? window : this);
