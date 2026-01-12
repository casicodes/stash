// Background service worker for Stash extension
// Handles OAuth token capture from the auth callback page

const STASH_URL = "http://localhost:3000";
const AUTH_CALLBACK_URL = `${STASH_URL}/auth/extension-callback`;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "STASH_AUTH_TOKEN" && message.token) {
    // Store the token
    chrome.storage.local.set({ stash_token: message.token }, () => {
      console.log("Stash: Token saved successfully");
      
      // Close the auth tab if it's the sender
      if (sender.tab?.id) {
        chrome.tabs.remove(sender.tab.id);
      }
    });
    sendResponse({ success: true });
  }
  return true;
});

// Inject content script into auth callback page to capture token
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.startsWith(AUTH_CALLBACK_URL)) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: captureTokenFromPage
    });
  }
});

// This function runs in the context of the auth callback page
function captureTokenFromPage() {
  // Listen for postMessage from the page
  window.addEventListener("message", (event) => {
    if (event.data?.type === "STASH_AUTH_TOKEN" && event.data?.token) {
      // Send token to background script
      chrome.runtime.sendMessage({
        type: "STASH_AUTH_TOKEN",
        token: event.data.token
      });
    }
  });
}
