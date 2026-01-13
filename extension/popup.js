// Configuration - update with your Stash app URL
const STASH_URL = "http://localhost:3000";
const API_URL = `${STASH_URL}/api/bookmarks`;
const AUTH_URL = `${STASH_URL}/auth/extension-callback`;

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
  const result = await chrome.storage.local.get(["stash_token"]);
  return result.stash_token || null;
}

async function clearToken() {
  await chrome.storage.local.remove(["stash_token"]);
}

// Get current tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Save the current tab
async function saveCurrentTab() {
  showCard(savingCard);

  const token = await getToken();
  if (!token) {
    showCard(authCard);
    return;
  }

  const tab = await getCurrentTab();
  if (!tab?.url) {
    showCard(authCard);
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: tab.url }),
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
        setTimeout(() => window.close(), 3000);
        return;
      }

      // For other errors, show already saved as fallback
      showCard(alreadySavedCard);
      setTimeout(() => window.close(), 3000);
      return;
    }

    // Success
    showCard(savedCard);
    setTimeout(() => window.close(), 3000);
  } catch (error) {
    // Network error - show auth card
    showCard(authCard);
  }
}

// Event listeners
connectBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: AUTH_URL });
  window.close();
});

viewLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: STASH_URL });
  window.close();
});

// Initialize
async function init() {
  const token = await getToken();
  if (token) {
    saveCurrentTab();
  } else {
    showCard(authCard);
  }
}

document.addEventListener("DOMContentLoaded", init);
