// Configuration - update this with your Stash app URL
const STASH_URL = "http://localhost:3000";
const API_URL = `${STASH_URL}/api/bookmarks`;
const AUTH_URL = `${STASH_URL}/auth/extension-callback`;

// DOM elements
const authView = document.getElementById("auth-view");
const saveView = document.getElementById("save-view");
const connectBtn = document.getElementById("connect-btn");
const saveForm = document.getElementById("save-form");
const saveBtn = document.getElementById("save-btn");
const titleInput = document.getElementById("title");
const urlInput = document.getElementById("url");
const notesInput = document.getElementById("notes");
const statusDiv = document.getElementById("status");
const disconnectBtn = document.getElementById("disconnect-btn");
const openStashLink = document.getElementById("open-stash");

// Initialize popup
async function init() {
  const token = await getToken();
  
  if (token) {
    showSaveView();
    populateCurrentTab();
  } else {
    showAuthView();
  }

  // Set up event listeners
  connectBtn.addEventListener("click", handleConnect);
  saveForm.addEventListener("submit", handleSave);
  disconnectBtn.addEventListener("click", handleDisconnect);
  openStashLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: STASH_URL });
  });
}

// Token management
async function getToken() {
  const result = await chrome.storage.local.get(["stash_token"]);
  return result.stash_token || null;
}

async function setToken(token) {
  await chrome.storage.local.set({ stash_token: token });
}

async function clearToken() {
  await chrome.storage.local.remove(["stash_token"]);
}

// View management
function showAuthView() {
  authView.classList.remove("hidden");
  saveView.classList.add("hidden");
}

function showSaveView() {
  authView.classList.add("hidden");
  saveView.classList.remove("hidden");
}

function showStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${isError ? "error" : "success"}`;
  statusDiv.classList.remove("hidden");
}

function hideStatus() {
  statusDiv.classList.add("hidden");
}

// Get current tab info
async function populateCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    titleInput.value = tab.title || "";
    urlInput.value = tab.url || "";
  }
}

// Handle connect button
function handleConnect() {
  // Open auth page in new tab
  chrome.tabs.create({ url: AUTH_URL });
  
  // Close popup - the background script will handle the token
  window.close();
}

// Handle save
async function handleSave(e) {
  e.preventDefault();
  
  const token = await getToken();
  if (!token) {
    showStatus("Not connected. Please reconnect.", true);
    return;
  }

  const url = urlInput.value.trim();
  if (!url) {
    showStatus("URL is required", true);
    return;
  }

  // Show loading state
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span>Saving...';
  hideStatus();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        url: url,
        notes: notesInput.value.trim() || undefined
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        await clearToken();
        showStatus("Session expired. Please reconnect.", true);
        setTimeout(showAuthView, 1500);
        return;
      }
      throw new Error(data.error || "Failed to save bookmark");
    }

    showStatus("Saved to Stash!");
    
    // Close popup after success
    setTimeout(() => window.close(), 1000);
  } catch (error) {
    showStatus(error.message || "Failed to save", true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save bookmark";
  }
}

// Handle disconnect
async function handleDisconnect() {
  await clearToken();
  showAuthView();
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
