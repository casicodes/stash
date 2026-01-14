// marker-injected.js (runs in the page context)
(() => {
  window.__SHELF_EXTENSION_INSTALLED = true;
  window.dispatchEvent(new CustomEvent("shelfExtensionInstalled"));
})();
