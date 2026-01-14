// Configuration - update with your Shelf app URL
const SHELF_URL = "https://createshelf.vercel.app";
const API_URL = `${SHELF_URL}/api/bookmarks`;
const AUTH_URL = `${SHELF_URL}/auth/extension-callback`;

// Check if running as overlay (injected into page)
const isOverlay = new URLSearchParams(window.location.search).has("overlay");

// Close the popup/overlay
function closePopup() {
  if (isOverlay) {
    // Tell parent page to hide overlay
    window.parent.postMessage({ type: "SHELF_OVERLAY_CLOSE" }, "*");
  } else {
    window.close();
  }
}

// DOM elements
const authCard = document.getElementById("auth-card");
const savingCard = document.getElementById("saving-card");
const savedCard = document.getElementById("saved-card");
const alreadySavedCard = document.getElementById("already-saved-card");
const connectBtn = document.getElementById("connect-btn");
const viewLink = document.getElementById("view-link");

// Show a specific card
function showCard(card) {
  [authCard, savingCard, savedCard, alreadySavedCard].forEach((c) => {
    c.classList.remove("active");
  });
  card.classList.add("active");
}

// Token management
async function getToken() {
  const result = await chrome.storage.local.get(["shelf_token"]);
  return result.shelf_token || null;
}

async function clearToken() {
  await chrome.storage.local.remove(["shelf_token"]);
}

// Get current tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Check for pending save from context menu
async function getPendingSave() {
  const result = await chrome.storage.local.get(["shelf_pending_save"]);
  if (result.shelf_pending_save) {
    // Clear it immediately so it doesn't trigger again
    await chrome.storage.local.remove(["shelf_pending_save"]);
    return result.shelf_pending_save;
  }
  return null;
}

// Save a bookmark
async function saveBookmark(url, notes = null) {
  showCard(savingCard);

  const token = await getToken();
  if (!token) {
    showCard(authCard);
    return;
  }

  try {
    const body = { url };
    if (notes) body.notes = notes;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        await clearToken();
        showCard(authCard);
        return;
      }

      // Check for duplicate error
      if (
        data.error?.toLowerCase().includes("duplicate") ||
        data.error?.toLowerCase().includes("already exists") ||
        data.error?.toLowerCase().includes("unique")
      ) {
        showCard(alreadySavedCard);
        setTimeout(closePopup, 3000);
        return;
      }

      // For other errors, show already saved as fallback
      showCard(alreadySavedCard);
      setTimeout(closePopup, 3000);
      return;
    }

    // Success
    showCard(savedCard);
    setTimeout(closePopup, 3000);
  } catch (error) {
    // Network error - show auth card
    showCard(authCard);
  }
}

// Save the current tab (used when clicking extension icon)
async function saveCurrentTab() {
  const tab = await getCurrentTab();
  if (!tab?.url) {
    showCard(authCard);
    return;
  }
  await saveBookmark(tab.url);
}

// Event listeners
connectBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: AUTH_URL });
  closePopup();
});

viewLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: SHELF_URL });
  closePopup();
});

// Initialize
async function init() {
  const token = await getToken();
  if (!token) {
    showCard(authCard);
    return;
  }

  // Check for pending save from context menu first
  const pendingSave = await getPendingSave();
  if (pendingSave) {
    await saveBookmark(pendingSave.url, pendingSave.notes);
  } else {
    await saveCurrentTab();
  }
}

document.addEventListener("DOMContentLoaded", init);
