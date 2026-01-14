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
})();
