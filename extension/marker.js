// marker.js (content script - injector)
(() => {
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("marker-injected.js");
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (e) {
    console.error("[Shelf Extension] Marker injection failed", e);
  }

  // Listen for extension check requests from the page
  window.addEventListener("message", (event) => {
    // Only accept messages from same origin
    if (event.origin !== window.location.origin) return;
    
    if (event.data?.type === "SHELF_CHECK_EXTENSION") {
      // Respond that extension is installed
      window.postMessage(
        { type: "SHELF_EXTENSION_DETECTED" },
        window.location.origin
      );
    }
  });
})();
