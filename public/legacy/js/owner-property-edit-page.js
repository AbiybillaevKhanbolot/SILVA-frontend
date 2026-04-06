document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    if (typeof requireOwnerOrRedirect !== 'function' || !requireOwnerOrRedirect()) return;

    var idParam = typeof getUrlParameter === 'function' ? getUrlParameter('id') : null;
    var backBlock = document.getElementById('owner-property-edit-page-back');
    if (backBlock && !idParam) {
        backBlock.style.display = 'none';
    }

    var mount = document.getElementById('owner-property-form-mount');
    if (!mount || typeof getOwnerPropertyPageHTML !== 'function' || typeof initOwnerPropertyForm !== 'function') return;

    mount.innerHTML = getOwnerPropertyPageHTML();
    var root = document.getElementById('owner-property-page-root');
    if (!root) return;

    initOwnerPropertyForm(root);

    var title = document.getElementById('op-title');
    if (title) {
        setTimeout(function () {
            title.focus();
        }, 50);
    }
});
