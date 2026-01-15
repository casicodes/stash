// Background service worker for Shelf extension
// Handles OAuth token capture and context menu actions

const SHELF_URL = "http://localhost:3000";
const API_URL = `${SHELF_URL}/api/bookmarks`;
const AUTH_CALLBACK_URL = `${SHELF_URL}/auth/extension-callback`;

// =============================================================================
// Context Menu Setup
// =============================================================================

chrome.runtime.onInstalled.addListener(() => {
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
});

// Extract title from LinkedIn page if needed
async function getPageTitle(tab) {
  try {
    const url = new URL(tab.url);
    const isLinkedIn =
      url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");

    if (isLinkedIn) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractLinkedInTitle,
      });
      if (results && results[0]?.result) {
        return results[0].result;
      }
    }
  } catch (error) {
    console.error("Shelf: Failed to extract page title", error);
  }
  return tab.title;
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url) {
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
      url: tab.url,
      notes: null,
      tabId: tab.id,
      clientTitle: pageTitle,
      imageUrl,
    };
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

// This function runs in the page context to extract LinkedIn page title from <title> tag
function extractLinkedInTitle() {
  try {
    const titleTag = document.querySelector("head title");
    if (titleTag) {
      const title = titleTag.textContent?.trim();
      if (title && title.length > 0) {
        return title;
      }
    }
    return document.title || null;
  } catch (error) {
    console.error("Shelf: Failed to extract LinkedIn title", error);
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

// Get token
async function getToken() {
  const result = await chrome.storage.local.get(["shelf_token"]);
  return result.shelf_token || null;
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

  const token = await getToken();
  if (!token) {
    console.log("Shelf: No token");
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
    }
    if (imageUrl) {
      body.image_url = imageUrl;
      console.log("Shelf: Sending image_url, length:", imageUrl.length);
    } else {
      console.log("Shelf: No imageUrl provided");
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    let data = {};
    const responseText = await response.text().catch(() => "");
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error("Shelf: Failed to parse response", parseError);
      console.error("Shelf: Response status", response.status);
      console.error("Shelf: Response text", responseText);
    }

    let status = "saved";

    if (!response.ok) {
      console.error("Shelf: API error", response.status, data);
      if (response.status === 401) {
        // Token expired or invalid
        await chrome.storage.local.remove(["shelf_token"]);
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
  if (message.type === "SHELF_AUTH_TOKEN" && message.token) {
    // Store the token
    chrome.storage.local.set({ shelf_token: message.token }, () => {
      console.log("Shelf: Token saved successfully");

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
  // Listen for postMessage from the page
  window.addEventListener("message", (event) => {
    if (event.data?.type === "SHELF_AUTH_TOKEN" && event.data?.token) {
      // Send token to background script
      chrome.runtime.sendMessage({
        type: "SHELF_AUTH_TOKEN",
        token: event.data.token,
      });
    }
  });
}
