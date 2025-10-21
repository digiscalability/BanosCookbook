// Guard for third-party share-modal scripts that assume DOM elements exist.
// This script waits for DOMContentLoaded and attempts to patch or safely initialize
// any global `initShareModal` function only if the target element exists.
(function () {
  function safeInit() {
    try {
      // If a third-party script exposed a global initializer, call it safely
      if (typeof window.initShareModal === 'function') {
        var el = document.getElementById('share-modal') || document.querySelector('[data-share-modal]');
        if (el) {
          // Provide the element to the initializer if it accepts arguments
          try {
            window.initShareModal(el);
          } catch (err) {
            // If initShareModal doesn't accept args, try calling without
            try { window.initShareModal(); } catch (e) { /* ignore */ }
          }
        }
      }
    } catch (err) {
      // Swallow errors to avoid breaking the page if the 3rd-party script misbehaves
      console.warn('share-modal-fix: safeInit failed', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    safeInit();
  }
})();
