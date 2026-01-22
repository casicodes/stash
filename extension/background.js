// Background service worker for Shelf extension
// Handles OAuth token capture and context menu actions

const SHELF_URL = "https://createshelf.vercel.app";
const API_URL = `${SHELF_URL}/api/bookmarks`;
const AUTH_CALLBACK_URL = `${SHELF_URL}/auth/extension-callback`;

// =============================================================================
// Context Menu Setup
// =============================================================================

chrome.runtime.onInstalled.addListener(async () => {
  // Save current page
  chrome.contextMenus.create({
    id: "save-page",
    title: "Add to Shelf",
    contexts: ["page"],
  });

  // Save selected text as snippet
  chrome.contextMenus.create({
    id: "save-selection",
    title: "Add to Shelf",
    contexts: ["selection"],
  });

  // Save link
  chrome.contextMenus.create({
    id: "save-link",
    title: "Add to Shelf",
    contexts: ["link"],
  });

  // Save image
  chrome.contextMenus.create({
    id: "save-image",
    title: "Add image to Shelf",
    contexts: ["image"],
  });

  // Inject marker into all existing Shelf tabs
  try {
    const tabs = await chrome.tabs.query({ url: "https://createshelf.vercel.app/*" });
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["marker.js"],
          });
        } catch (error) {
          // Ignore errors (e.g., if tab is not accessible)
          console.log("Shelf: Could not inject marker into tab", tab.id, error);
        }
      }
    }
  } catch (error) {
    console.error("Shelf: Error injecting marker into existing tabs", error);
  }
});

// Extract title from page title tag (for LinkedIn and X)
async function getPageTitle(tab) {
  try {
    const url = new URL(tab.url);
    const isLinkedIn =
      url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");
    const isX =
      url.hostname === "x.com" ||
      url.hostname === "twitter.com" ||
      url.hostname.endsWith(".x.com") ||
      url.hostname.endsWith(".twitter.com");

    if (isLinkedIn || isX) {
      console.log("Shelf: Extracting title for", isX ? "X" : "LinkedIn", "page");
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageTitle,
        });
        console.log("Shelf: Script execution results:", results);
        if (results && results[0]?.result) {
          const extractedTitle = results[0].result;
          console.log("Shelf: Extracted title:", extractedTitle);
          if (extractedTitle && extractedTitle.trim() && extractedTitle !== "X") {
            return extractedTitle;
          } else {
            console.log("Shelf: Extracted title is empty or just 'X', using tab.title");
          }
        } else {
          console.log("Shelf: No title extracted from script, falling back to tab.title");
        }
      } catch (error) {
        console.error("Shelf: Error executing script:", error);
      }
    }
  } catch (error) {
    console.error("Shelf: Failed to extract page title", error);
  }
  const fallbackTitle = tab.title;
  console.log("Shelf: Using fallback title:", fallbackTitle);
  return fallbackTitle;
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url) {
    console.log("Shelf: Icon clicked, extracting title for:", tab.url);
    const pageTitle = await getPageTitle(tab);
    console.log("Shelf: Final pageTitle to use:", pageTitle);

    // Extract image for LinkedIn pages
    let imageUrl = null;
    try {
      const urlObj = new URL(tab.url);
      if (
        urlObj.hostname === "linkedin.com" ||
        urlObj.hostname.endsWith(".linkedin.com")
      ) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageImageUrl,
        });
        if (results && results[0]?.result) {
          imageUrl = results[0].result;
        }
      }
    } catch (error) {
      console.error("Shelf: Failed to extract image URL", error);
    }

    pendingSave = {
      url: tab.url,
      notes: null,
      tabId: tab.id,
      clientTitle: pageTitle,
      imageUrl,
    };
    console.log("Shelf: Stored pendingSave with clientTitle:", pageTitle?.substring(0, 100));
    await injectOverlay(tab.id);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let url = null;
  let notes = null;

  if (info.menuItemId === "save-page") {
    url = tab.url;
    const pageTitle = await getPageTitle(tab);

    // Extract image for LinkedIn pages
    let imageUrl = null;
    try {
      const urlObj = new URL(tab.url);
      if (
        urlObj.hostname === "linkedin.com" ||
        urlObj.hostname.endsWith(".linkedin.com")
      ) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageImageUrl,
        });
        if (results && results[0]?.result) {
          imageUrl = results[0].result;
        }
      }
    } catch (error) {
      console.error("Shelf: Failed to extract image URL", error);
    }

    pendingSave = {
      url,
      notes,
      tabId: tab.id,
      clientTitle: pageTitle,
      imageUrl,
    };
    await injectOverlay(tab.id);
  } else if (info.menuItemId === "save-selection") {
    // Save selection as a text note (not as a page bookmark)
    const plainText = info.selectionText || "";
    const sourceUrl = tab.url;

    // Extract OG image or favicon from the page
    let imageUrl = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageImageUrl,
      });
      if (results && results[0]?.result) {
        imageUrl = results[0].result;
        console.log("Shelf: Extracted image URL:", imageUrl);
      }
    } catch (error) {
      console.error("Shelf: Failed to extract image URL", error);
    }

    pendingSave = {
      url: null,
      notes: null,
      tabId: tab.id,
      sourceUrl,
      awaitingSelection: true,
      imageUrl: imageUrl,
    };
    await captureFormattedSelection(tab.id, plainText);
  } else if (info.menuItemId === "save-link") {
    url = info.linkUrl;
    const pageTitle = await getPageTitle(tab);

    // Extract image for LinkedIn links
    let imageUrl = null;
    try {
      const urlObj = new URL(info.linkUrl);
      if (
        urlObj.hostname === "linkedin.com" ||
        urlObj.hostname.endsWith(".linkedin.com")
      ) {
        // For links, we need to check the tab URL, not the link URL
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageImageUrl,
        });
        if (results && results[0]?.result) {
          imageUrl = results[0].result;
        }
      }
    } catch (error) {
      console.error("Shelf: Failed to extract image URL", error);
    }

    pendingSave = {
      url,
      notes,
      tabId: tab.id,
      clientTitle: pageTitle,
      imageUrl,
    };
    await injectOverlay(tab.id);
  } else if (info.menuItemId === "save-image") {
    // Save the image URL and tag it as an image bookmark
    // Store page URL in notes so we can display it later
    url = info.srcUrl;
    notes = tab.url;
    const pageTitle = await getPageTitle(tab);
    pendingSave = {
      url,
      notes,
      tabId: tab.id,
      tags: ["images"],
      clientTitle: pageTitle,
    };
    await injectOverlay(tab.id);
  }
});

// Capture formatted selection from the page before showing overlay
async function captureFormattedSelection(tabId, plainText) {
  // Ensure we always have content - use plainText as the base
  let content = plainText || "";

  // Image URL should already be extracted and stored in pendingSave.imageUrl

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: getFormattedSelection,
      args: [plainText],
    });

    // Only use script result if it's non-empty
    if (results && results[0]?.result && results[0].result.trim()) {
      content = results[0].result;
    }
  } catch (error) {
    console.error("Shelf: Failed to capture selection", error);
    // Keep using plainText as content (already set above)
  }

  // Ensure we have content - fall back to plainText if formatting produced empty result
  if (!content || !content.trim()) {
    content = plainText || "";
  }

  // Build the final content with source reference
  if (content && content.trim()) {
    const sourceUrl = pendingSave.sourceUrl;
    let fullContent = content;

    if (sourceUrl) {
      try {
        const hostname = new URL(sourceUrl).hostname;
        fullContent = `${content}\n\n---\n_Source: [${hostname}](${sourceUrl})_`;
      } catch {
        // Invalid URL (e.g., PDF viewer, about: pages) - just use content without source
        fullContent = content;
      }
    }

    pendingSave.url = fullContent;
    pendingSave.notes = null;
    // imageUrl is already set from the extraction above
  }

  pendingSave.awaitingSelection = false;
  await injectOverlay(tabId);
}

// This function runs in the page context to extract page title from <title> tag
function extractPageTitle() {
  try {
    const titleTag = document.querySelector("head title");
    if (titleTag) {
      const title = titleTag.textContent?.trim();
      console.log("Shelf [page context]: Found title tag:", title);
      if (title && title.length > 0) {
        return title;
      }
    }
    const docTitle = document.title || null;
    console.log("Shelf [page context]: Using document.title:", docTitle);
    return docTitle;
  } catch (error) {
    console.error("Shelf [page context]: Failed to extract page title", error);
    return null;
  }
}

// This function runs in the page context to extract OG image or favicon
function extractPageImageUrl() {
  try {
    // Try to get OG image first
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const url = ogImage.getAttribute("content");
      if (url) {
        // Resolve relative URLs
        try {
          return new URL(url, window.location.href).toString();
        } catch {
          return url;
        }
      }
    }

    // Try Twitter image
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      const url = twitterImage.getAttribute("content");
      if (url) {
        try {
          return new URL(url, window.location.href).toString();
        } catch {
          return url;
        }
      }
    }

    // Try favicon
    const favicon =
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]') ||
      document.querySelector('link[rel="apple-touch-icon"]');
    if (favicon) {
      const url = favicon.getAttribute("href");
      if (url) {
        try {
          return new URL(url, window.location.href).toString();
        } catch {
          return url;
        }
      }
    }

    // For LinkedIn, use LinkedIn favicon as fallback
    try {
      const hostname = window.location.hostname;
      if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
        return "https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca";
      }
    } catch {
      // Continue to default fallback
    }

    // Fallback to default favicon location
    try {
      return new URL("/favicon.ico", window.location.origin).toString();
    } catch {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// This function runs in the page context to extract formatted selection
function getFormattedSelection(originalPlainText) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    // Selection was cleared, use the original plain text
    return originalPlainText || null;
  }

  const range = selection.getRangeAt(0);
  const container = document.createElement("div");
  container.appendChild(range.cloneContents());

  // Get the plain text from our captured content
  const capturedPlainText = container.textContent || "";

  // Normalize text for comparison (remove extra whitespace)
  function normalizeForComparison(text) {
    return text.replace(/\s+/g, " ").trim().toLowerCase();
  }

  const normalizedOriginal = normalizeForComparison(originalPlainText || "");
  const normalizedCaptured = normalizeForComparison(capturedPlainText);

  // If the captured content doesn't match the original selection, use plain text
  // This handles cases where selection changed or was expanded
  if (normalizedOriginal && normalizedCaptured !== normalizedOriginal) {
    // Check if captured is significantly different (not just whitespace differences)
    const originalWords = normalizedOriginal.split(" ").filter(Boolean);
    const capturedWords = normalizedCaptured.split(" ").filter(Boolean);

    // If captured has significantly more content, the selection probably changed
    if (capturedWords.length > originalWords.length * 1.5) {
      return originalPlainText;
    }
  }

  // Convert HTML to formatted text
  function htmlToFormattedText(element) {
    let result = "";

    function processNode(node, context = {}) {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;
        // Preserve meaningful whitespace but normalize excessive spaces
        if (context.preserveWhitespace) {
          return text;
        }
        // Collapse multiple spaces but keep single spaces
        text = text.replace(/[ \t]+/g, " ");
        // Trim leading space if we're at the start of a list item
        if (context.listItemStart) {
          text = text.replace(/^\s+/, "");
        }
        return text;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = node.tagName.toLowerCase();
      let prefix = "";
      let suffix = "";
      let childContext = { ...context };

      // Handle block elements
      const blockElements = [
        "p",
        "div",
        "section",
        "article",
        "main",
        "header",
        "footer",
        "aside",
        "nav",
      ];
      const headings = ["h1", "h2", "h3", "h4", "h5", "h6"];

      if (headings.includes(tag)) {
        const level = parseInt(tag[1]);
        prefix = "\n\n" + "#".repeat(level) + " ";
        suffix = "\n";
      } else if (blockElements.includes(tag)) {
        // Don't add newlines for block elements inside list items
        if (!context.insideListItem) {
          prefix = "\n\n";
        } else {
          // Inside list items, treat block elements as inline
          prefix = "";
        }
        suffix = "";
      } else if (tag === "br") {
        return "\n";
      } else if (tag === "hr") {
        return "\n\n---\n\n";
      } else if (tag === "li") {
        const parent = node.parentElement?.tagName.toLowerCase();
        if (parent === "ol") {
          const index =
            Array.from(node.parentElement.children).indexOf(node) + 1;
          prefix = "\n" + index + ". ";
        } else {
          prefix = "\n- ";
        }
        childContext.insideListItem = true;
        childContext.listItemStart = true;
      } else if (tag === "ul" || tag === "ol") {
        // Need blank line before list for markdown parsers
        prefix = "\n\n";
        suffix = "\n";
      } else if (tag === "blockquote") {
        prefix = "\n\n> ";
        suffix = "\n";
      } else if (tag === "pre" || tag === "code") {
        childContext.preserveWhitespace = true;
        if (tag === "pre") {
          prefix = "\n\n```\n";
          suffix = "\n```\n";
        }
      } else if (tag === "strong" || tag === "b") {
        prefix = "**";
        suffix = "**";
      } else if (tag === "em" || tag === "i") {
        prefix = "_";
        suffix = "_";
      } else if (tag === "a") {
        const href = node.getAttribute("href");
        if (href && !href.startsWith("javascript:")) {
          suffix = ` (${href})`;
        }
      }

      let content = "";
      for (const child of node.childNodes) {
        content += processNode(child, childContext);
        // After first child, we're no longer at list item start
        childContext.listItemStart = false;
      }

      return prefix + content + suffix;
    }

    for (const child of element.childNodes) {
      result += processNode(child);
    }

    // Clean up the result
    return result
      .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
      .replace(/^\n+/, "") // Remove leading newlines
      .replace(/\n+$/, "") // Remove trailing newlines
      .replace(/[ \t]+$/gm, "") // Remove trailing spaces on each line
      .trim();
  }

  const formatted = htmlToFormattedText(container);

  // If formatting didn't produce meaningful structure, fall back to plain text
  if (!formatted || formatted.length === 0) {
    return originalPlainText || selection.toString().trim();
  }

  return formatted;
}

// Pending save data
let pendingSave = null;

// Get session (access_token, refresh_token, expires_at, supabase config)
async function getSession() {
  const result = await chrome.storage.local.get(["shelf_session"]);
  return result.shelf_session || null;
}

// Refresh access token using refresh token
async function refreshToken() {
  const session = await getSession();
  if (!session?.refresh_token || !session?.supabase_url || !session?.supabase_anon_key) {
    throw new Error("No refresh token or Supabase config available");
  }

  try {
    const response = await fetch(
      `${session.supabase_url}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "apikey": session.supabase_anon_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Shelf: Refresh token failed", response.status, errorText);
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const newSession = {
      ...session,
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token, // Keep old if not provided
      expires_at: data.expires_in 
        ? Date.now() + (data.expires_in * 1000)
        : session.expires_at,
    };

    await chrome.storage.local.set({ shelf_session: newSession });
    console.log("Shelf: Token refreshed successfully");
    return newSession;
  } catch (error) {
    console.error("Shelf: Refresh token error", error);
    // Clear session on refresh failure
    await chrome.storage.local.remove(["shelf_session"]);
    throw error;
  }
}

// Get valid access token, refreshing if needed
async function getValidAccessToken() {
  const session = await getSession();
  
  // Legacy support: check for old token format
  if (!session) {
    const legacyResult = await chrome.storage.local.get(["shelf_token"]);
    if (legacyResult.shelf_token) {
      console.warn("Shelf: Found legacy token format, user should reconnect for refresh token support");
      return legacyResult.shelf_token;
    }
    return null;
  }

  // Check if token expires soon (within 5 minutes)
  const expiresSoon = session.expires_at && (session.expires_at - Date.now() < 5 * 60 * 1000);
  
  if (expiresSoon || !session.expires_at) {
    // Only refresh if we have refresh token support
    if (session.refresh_token && session.supabase_url && session.supabase_anon_key) {
      console.log("Shelf: Token expires soon or no expiry, refreshing...");
      try {
        const refreshed = await refreshToken();
        return refreshed.access_token;
      } catch (error) {
        console.error("Shelf: Failed to refresh token proactively", error);
        // Return current token anyway, let the API call fail and trigger retry logic
        return session.access_token;
      }
    } else {
      // No refresh support, return current token
      console.warn("Shelf: No refresh token available, using current token");
      return session.access_token;
    }
  }

  return session.access_token;
}

// Save bookmark via API
async function saveBookmark(url, notes, tabId, tags, imageUrl, clientTitle) {
  // Validate url before proceeding
  if (!url || !url.trim()) {
    console.error("Shelf: No URL provided");
    chrome.tabs.sendMessage(tabId, {
      type: "SHELF_SAVE_RESULT",
      status: "error",
    });
    return;
  }

  // Get valid access token, refreshing proactively if needed
  let accessToken = await getValidAccessToken();
  if (!accessToken) {
    console.log("Shelf: No session available");
    chrome.tabs.sendMessage(tabId, {
      type: "SHELF_SAVE_RESULT",
      status: "auth",
    });
    return;
  }

  try {
    const body = { url };
    if (notes) body.notes = notes;
    if (Array.isArray(tags) && tags.length > 0) body.tags = tags;
    if (clientTitle && typeof clientTitle === "string" && clientTitle.trim()) {
      body.client_title = clientTitle.trim();
      console.log("Shelf: Sending client_title:", body.client_title);
    } else {
      console.log("Shelf: No clientTitle provided or invalid");
    }
    if (imageUrl) {
      body.image_url = imageUrl;
      console.log("Shelf: Sending image_url, length:", imageUrl.length);
    } else {
      console.log("Shelf: No imageUrl provided");
    }

    // Helper to make API call with token
    const makeApiCall = async (token) => {
      return await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    };

    let response = await makeApiCall(accessToken);

    let data = {};
    const responseText = await response.text().catch(() => "");
    try {
      data = responseText ? JSON.parse(responseText) : {};
      
      // Always log the full response for debugging
      console.log("Shelf: API response received", {
        status: response.status,
        ok: response.ok,
        bookmarkTitle: data.bookmark?.title,
        bookmarkTitleType: typeof data.bookmark?.title,
        debugInfo: data._debug,
        hasBookmark: !!data.bookmark,
        bookmarkKeys: data.bookmark ? Object.keys(data.bookmark) : [],
        responseKeys: Object.keys(data),
        fullResponse: data,
      });
      
      // Log the raw response text to see what we actually got
      console.log("Shelf: Raw response text:", responseText?.substring(0, 1000));
      
      // Log debug info from API response if available
      if (data._debug) {
        console.log("=== Shelf: API response debug info ===");
        console.log("Shelf: isX:", data._debug.isX);
        console.log("Shelf: titleToInsert:", data._debug.titleToInsert);
        console.log("Shelf: finalTitle:", data._debug.finalTitle);
        console.log("Shelf: clientTitle:", data._debug.clientTitle);
        console.log("Shelf: receivedClientTitle:", data._debug.receivedClientTitle);
        console.log("Shelf: hasClientTitle:", data._debug.hasClientTitle);
        console.log("Shelf: Saved bookmark title:", data.bookmark?.title);
        console.log("=== End debug info ===");
      } else {
        console.error("Shelf: ERROR - No debug info in response!");
        console.log("Shelf: Response keys:", Object.keys(data));
        console.log("Shelf: Full response:", JSON.stringify(data, null, 2).substring(0, 1000));
      }
    } catch (parseError) {
      console.error("Shelf: Failed to parse response", parseError);
      console.error("Shelf: Response status", response.status);
      console.error("Shelf: Response text", responseText);
    }

    let status = "saved";

    if (!response.ok) {
      console.error("Shelf: API error", response.status, data);
      if (response.status === 401) {
        // Token expired or invalid - try refresh + retry once
        console.log("Shelf: Got 401, attempting refresh and retry...");
        try {
          const refreshed = await refreshToken();
          // Retry the save with new token
          response = await makeApiCall(refreshed.access_token);
          
          // Parse retry response
          const retryResponseText = await response.text().catch(() => "");
          try {
            data = retryResponseText ? JSON.parse(retryResponseText) : {};
          } catch (parseError) {
            console.error("Shelf: Failed to parse retry response", parseError);
          }

          if (!response.ok) {
            if (response.status === 401) {
              // Refresh failed, show auth UI
              console.error("Shelf: Retry still returned 401, refresh failed");
              await chrome.storage.local.remove(["shelf_session"]);
              status = "auth";
            } else if (
              data.error?.toLowerCase().includes("duplicate") ||
              data.error?.toLowerCase().includes("already exists") ||
              data.error?.toLowerCase().includes("unique")
            ) {
              status = "duplicate";
            } else {
              status = "error";
            }
          } else {
            // Retry succeeded
            status = "saved";
          }
        } catch (refreshError) {
          // Refresh failed, show auth UI
          console.error("Shelf: Refresh token failed on 401", refreshError);
          await chrome.storage.local.remove(["shelf_session"]);
          status = "auth";
        }
      } else if (
        data.error?.toLowerCase().includes("duplicate") ||
        data.error?.toLowerCase().includes("already exists") ||
        data.error?.toLowerCase().includes("unique")
      ) {
        status = "duplicate";
      } else {
        status = "error";
      }
    }

    // Send result to content script
    chrome.tabs.sendMessage(tabId, { type: "SHELF_SAVE_RESULT", status });
  } catch (error) {
    console.error("Shelf: Save error", error);
    console.error("Shelf: Error details", {
      message: error.message,
      stack: error.stack,
      url: API_URL,
    });
    chrome.tabs.sendMessage(tabId, {
      type: "SHELF_SAVE_RESULT",
      status: "error",
    });
  }
}

// Listen for overlay ready message
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "SHELF_OVERLAY_READY" && pendingSave) {
    const { url, notes, tabId, tags, imageUrl, clientTitle } = pendingSave;
    console.log("Shelf: Overlay ready, about to save with clientTitle:", clientTitle?.substring(0, 100));
    pendingSave = null;

    // Only save if we have a url (content)
    if (url && url.trim()) {
      saveBookmark(url, notes, tabId, tags, imageUrl, clientTitle);
    } else {
      chrome.tabs.sendMessage(tabId, {
        type: "SHELF_SAVE_RESULT",
        status: "error",
      });
    }
  }
  return true;
});

// Inject overlay content script into the current tab
async function injectOverlay(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch (error) {
    console.error("Shelf: Injection failed", error);
    // If injection fails (e.g., chrome:// pages), fall back to popup window
    if (pendingSave) {
      await chrome.storage.local.set({
        shelf_pending_save: {
          url: pendingSave.url,
          notes: pendingSave.notes,
          clientTitle: pendingSave.clientTitle,
        },
      });
      pendingSave = null;
    }
    const currentWindow = await chrome.windows.getCurrent();
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 360,
      height: 80,
      left: currentWindow.left + currentWindow.width - 380,
      top: currentWindow.top + 80,
    });
  }
}

// =============================================================================
// Auth Token Capture
// =============================================================================

// Listen for messages from content script and web pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle new session format (access_token, refresh_token, expires_at, supabase config)
  if (message.type === "SHELF_AUTH_SESSION" && message.session) {
    // Store the full session
    chrome.storage.local.set({ shelf_session: message.session }, () => {
      console.log("Shelf: Session saved successfully");

      // Close the auth tab if it's the sender
      if (sender.tab?.id) {
        chrome.tabs.remove(sender.tab.id);
      }
    });
    sendResponse({ success: true });
  } 
  // Legacy support: handle old token-only format (for backwards compatibility)
  else if (message.type === "SHELF_AUTH_TOKEN" && message.token) {
    // Convert old token format to session format (without refresh token)
    // User will need to reconnect to get refresh token
    console.warn("Shelf: Received legacy token format, user should reconnect for refresh token support");
    chrome.storage.local.set({ shelf_token: message.token }, () => {
      console.log("Shelf: Legacy token saved (no refresh support)");

      // Close the auth tab if it's the sender
      if (sender.tab?.id) {
        chrome.tabs.remove(sender.tab.id);
      }
    });
    sendResponse({ success: true });
  } else if (message.type === "SHELF_CHECK_INSTALLED") {
    // Respond to extension detection check from web page
    sendResponse({ installed: true });
    return true;
  }
  return true;
});

// Inject content script into auth callback page to capture token
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url?.startsWith(AUTH_CALLBACK_URL)
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: captureTokenFromPage,
    });
  }
});

// This function runs in the context of the auth callback page
function captureTokenFromPage() {
  // Generate a nonce for this session to validate message authenticity
  const nonce = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  
  // Listen for postMessage from the page
  window.addEventListener("message", (event) => {
    // Only accept messages from same origin
    if (event.origin !== window.location.origin) return;
    
    // Handle handshake request
    if (event.data?.type === "SHELF_EXTENSION_HANDSHAKE") {
      // Respond with ready message and nonce
      window.postMessage(
        { type: "SHELF_EXTENSION_READY", nonce },
        window.location.origin
      );
      return;
    }
    
    // Handle auth session (new format)
    if (event.data?.type === "SHELF_AUTH_SESSION" && event.data?.session) {
      // Validate nonce if provided (optional for backwards compatibility)
      if (event.data.nonce && event.data.nonce !== nonce) {
        console.warn("Shelf Extension: Session message nonce mismatch");
        return;
      }
      
      // Send session to background script
      chrome.runtime.sendMessage({
        type: "SHELF_AUTH_SESSION",
        session: event.data.session,
      });
    }
    // Handle legacy auth token (for backwards compatibility)
    else if (event.data?.type === "SHELF_AUTH_TOKEN" && event.data?.token) {
      // Validate nonce if provided (optional for backwards compatibility)
      if (event.data.nonce && event.data.nonce !== nonce) {
        console.warn("Shelf Extension: Token message nonce mismatch");
        return;
      }
      
      // Send token to background script
      chrome.runtime.sendMessage({
        type: "SHELF_AUTH_TOKEN",
        token: event.data.token,
      });
    }
  });
}
