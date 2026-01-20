"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Bookmark } from "@/types/bookmark";
import {
  fetchBookmarks,
  createBookmark,
  refreshBookmarkMetadata,
  deleteBookmark as deleteBookmarkApi,
  renameBookmark as renameBookmarkApi,
} from "@/lib/api/bookmarks";
import { createClient } from "@/lib/supabase/client";

// Helper to deduplicate bookmarks by ID, keeping the first occurrence
function deduplicateBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  const seen = new Set<string>();
  return bookmarks.filter((bookmark) => {
    if (seen.has(bookmark.id)) return false;
    seen.add(bookmark.id);
    return true;
  });
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function isNote(bookmark: Bookmark) {
  return bookmark.url.startsWith("note://");
}

function isTemp(bookmark: Bookmark) {
  return bookmark.id.startsWith("temp-");
}

function hasMeta(bookmark: Bookmark) {
  const hasTitle = Boolean(bookmark.title && bookmark.title.trim().length > 0);
  const hasOgImage = Boolean(
    bookmark.image_url && bookmark.image_url.trim().length > 0
  );
  // If you want title-only to be acceptable, change this to `hasTitle`
  return hasTitle && hasOgImage;
}

export function useBookmarks(initial: Bookmark[]) {
  const [items, setItems] = useState<Bookmark[]>(deduplicateBookmarks(initial));
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [newBookmarkIds, setNewBookmarkIds] = useState<Set<string>>(new Set());
  
  // Track when bookmarks were marked as new (timestamp)
  const newBookmarkTimestamps = useRef<Map<string, number>>(new Map());

  const pendingDeletes = useRef<
    Map<string, { bookmark: Bookmark; index: number }>
  >(new Map());

  // Track which deletes are currently being confirmed to prevent duplicate calls
  const confirmingDeletes = useRef<Set<string>>(new Set());

  // Tracks how many times we attempted metadata refresh per bookmark
  const attemptsById = useRef<Map<string, number>>(new Map());

  // Prevents overlapping auto-refresh loops
  const isAutoRefreshingRef = useRef(false);

  // Track known bookmark IDs to detect new ones (initialized with initial bookmarks)
  const knownBookmarkIds = useRef<Set<string>>(
    new Set(initial.map((b) => b.id))
  );
  
  // Track if we've completed the initial load
  const hasInitialized = useRef(false);

  // Refresh bookmarks function
  const refreshBookmarks = useCallback(async () => {
    try {
      const bookmarks = await fetchBookmarks();
      const deduped = deduplicateBookmarks(bookmarks);
      
      // Only detect new bookmarks after initial load
      if (hasInitialized.current) {
        const newIds = new Set<string>();
        deduped.forEach((bookmark) => {
          if (!knownBookmarkIds.current.has(bookmark.id)) {
            newIds.add(bookmark.id);
            knownBookmarkIds.current.add(bookmark.id);
          }
        });
        
        // Mark new bookmarks (only if added recently - within last 30 seconds)
        const now = Date.now();
        const RECENT_THRESHOLD = 30000; // 30 seconds
        
        if (newIds.size > 0) {
          newIds.forEach((id) => {
            newBookmarkTimestamps.current.set(id, now);
          });
          
          setNewBookmarkIds((prev) => {
            const updated = new Set(prev);
            newIds.forEach((id) => updated.add(id));
            return updated;
          });
        }
        
        // Clean up any existing new tags that are too old
        setNewBookmarkIds((prev) => {
          const updated = new Set(prev);
          let hasChanges = false;
          prev.forEach((id) => {
            const timestamp = newBookmarkTimestamps.current.get(id);
            if (!timestamp || now - timestamp > RECENT_THRESHOLD) {
              updated.delete(id);
              newBookmarkTimestamps.current.delete(id);
              hasChanges = true;
            }
          });
          return hasChanges ? updated : prev;
        });
      } else {
        // On initial load, just update known IDs without marking as new
        deduped.forEach((bookmark) => {
          knownBookmarkIds.current.add(bookmark.id);
        });
        hasInitialized.current = true;
      }
      
      setItems(deduped);
    } catch {
      // Ignore errors
    }
  }, []);

  // Refresh bookmarks on mount
  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  // Set up Supabase Realtime subscription to detect new bookmarks
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("bookmarks-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookmarks",
        },
        () => {
          // When a new bookmark is inserted, refresh the list
          refreshBookmarks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshBookmarks]);

  // Also refresh when window regains focus (fallback for when realtime might not work)
  useEffect(() => {
    const handleFocus = () => {
      refreshBookmarks();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshBookmarks]);

  // Automatically refresh metadata for bookmarks missing OG title/image
  useEffect(() => {
    // Avoid starting multiple refresh loops concurrently
    if (isAutoRefreshingRef.current) return;

    const MAX_ATTEMPTS = 3;

    // Helper to check if bookmark is X/Twitter
    function isXBookmark(url: string): boolean {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        return hostname === "x.com" || hostname === "twitter.com" || hostname.endsWith(".x.com") || hostname.endsWith(".twitter.com");
      } catch {
        return false;
      }
    }

    const candidates = items.filter((b) => {
      if (isNote(b) || isTemp(b)) return false;
      if (hasMeta(b)) return false;
      
      // Skip X bookmarks that already have a valid title (not fallback titles)
      const isUrlBasedTitle = b.title && (b.title.startsWith("http") || b.title === b.url);
      const isFallbackTitle = b.title && (
        b.title.trim() === "X" || 
        b.title === "X post" ||
        b.title.startsWith("Post by @")
      );
      if (isXBookmark(b.url) && b.title && b.title.trim() && !isUrlBasedTitle && !isFallbackTitle) {
        return false;
      }

      const attempts = attemptsById.current.get(b.id) ?? 0;
      return attempts < MAX_ATTEMPTS;
    });

    if (candidates.length === 0) return;

    isAutoRefreshingRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        // Refresh sequentially to avoid hammering your API
        for (const b of candidates) {
          if (cancelled) return;

          setRefreshingId(b.id);

          // increment attempt count
          attemptsById.current.set(
            b.id,
            (attemptsById.current.get(b.id) ?? 0) + 1
          );

          try {
            const res = await refreshBookmarkMetadata(b.id);
            const updated = res.bookmark;

            if (cancelled) return;

            if (updated) {
              setItems((prev) =>
                deduplicateBookmarks(
                  prev.map((x) => (x.id === b.id ? { ...x, ...updated } : x))
                )
              );

              // If after update we now have meta, we can stop retrying.
              // (Optional: remove attempts entry to keep map small)
              // We'll keep attempts as-is; it won't be retried because hasMeta(b) will become true.
            }

            // small spacing between requests
            await sleep(500);
          } catch {
            // On failure, wait a bit longer (backoff) before next request
            await sleep(1200);
          } finally {
            if (!cancelled) setRefreshingId(null);
          }
        }
      } finally {
        isAutoRefreshingRef.current = false;
        if (!cancelled) setRefreshingId(null);
      }
    })();

    return () => {
      cancelled = true;
      isAutoRefreshingRef.current = false;
    };
  }, [items]);

  const addBookmark = useCallback(async (url: string) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Bookmark = {
      id: tempId,
      url,
      title: null,
      description: null,
      site_name: null,
      image_url: null,
      notes: null,
      created_at: new Date().toISOString(),
    };

    setItems((prev) => deduplicateBookmarks([optimistic, ...prev]));

    const { bookmark, error } = await createBookmark(url);

    if (error) {
      setItems((prev) =>
        deduplicateBookmarks(prev.filter((b) => b.id !== tempId))
      );
      return { error };
    }

    if (bookmark) {
      setItems((prev) =>
        deduplicateBookmarks(prev.map((b) => (b.id === tempId ? bookmark : b)))
      );

      // Mark as new bookmark
      const now = Date.now();
      knownBookmarkIds.current.add(bookmark.id);
      newBookmarkTimestamps.current.set(bookmark.id, now);
      setNewBookmarkIds((prev) => new Set(prev).add(bookmark.id));

      // reset attempts so auto-refresh can try again for this new real ID
      attemptsById.current.delete(bookmark.id);
    } else {
      setItems((prev) =>
        deduplicateBookmarks(prev.filter((b) => b.id !== tempId))
      );
      fetchBookmarks()
        .then((bookmarks) => setItems(deduplicateBookmarks(bookmarks)))
        .catch(() => {});
    }

    return { bookmark };
  }, []);

  const refreshMetadata = useCallback(async (id: string) => {
    setRefreshingId(id);

    // manual refresh should reset attempts so it gets a fair shot
    attemptsById.current.delete(id);

    const { bookmark, error } = await refreshBookmarkMetadata(id);

    if (bookmark) {
      setItems((prev) =>
        deduplicateBookmarks(
          prev.map((b) => (b.id === id ? { ...b, ...bookmark } : b))
        )
      );
    }

    setRefreshingId(null);
    return { bookmark, error };
  }, []);

  const deleteBookmark = useCallback(
    (id: string): { deletedBookmark: Bookmark | null } => {
      let deletedBookmark: Bookmark | null = null;
      let deletedIndex = 0;

      setItems((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index !== -1) {
          deletedBookmark = prev[index];
          deletedIndex = index;
        }
        return deduplicateBookmarks(prev.filter((b) => b.id !== id));
      });

      if (deletedBookmark) {
        pendingDeletes.current.set(id, {
          bookmark: deletedBookmark,
          index: deletedIndex,
        });
      }

      return { deletedBookmark };
    },
    []
  );

  const undoDelete = useCallback((id: string) => {
    const pending = pendingDeletes.current.get(id);
    if (!pending) return;

    pendingDeletes.current.delete(id);

    setItems((prev) => {
      const newItems = [...prev];
      const insertIndex = Math.min(pending.index, newItems.length);
      newItems.splice(insertIndex, 0, pending.bookmark);
      return deduplicateBookmarks(newItems);
    });
  }, []);

  const confirmDelete = useCallback(async (id: string) => {
    const pending = pendingDeletes.current.get(id);
    
    // If pending doesn't exist, it means undo was called or already confirmed, so skip deletion
    if (!pending) {
      return { success: true };
    }
    
    // Prevent duplicate confirmDelete calls (e.g., from both onDismiss and onAutoClose)
    if (confirmingDeletes.current.has(id)) {
      return { success: true };
    }
    
    confirmingDeletes.current.add(id);
    
    // Remove from pending BEFORE API call to prevent duplicate calls
    // but keep the pending data for error recovery
    const pendingData = { ...pending };
    pendingDeletes.current.delete(id);

    try {
      const { success, error } = await deleteBookmarkApi(id);

      if (!success) {
        // If delete failed, restore the bookmark to the UI
        setItems((prev) => {
          // Check if bookmark already exists (might have been restored by another call)
          const exists = prev.some((b) => b.id === id);
          if (exists) {
            return prev;
          }
          
          const newItems = [...prev];
          const insertIndex = Math.min(pendingData.index, newItems.length);
          newItems.splice(insertIndex, 0, pendingData.bookmark);
          return deduplicateBookmarks(newItems);
        });
        
        // Fetch from server to ensure we're in sync
        try {
          const bookmarks = await fetchBookmarks();
          setItems(deduplicateBookmarks(bookmarks));
        } catch {
          // If fetch fails, we've already restored the item above
        }
        
        return { success: false, error };
      }

      // cleanup retry tracking
      attemptsById.current.delete(id);

      return { success: true };
    } finally {
      // Always remove from confirming set, even if there was an error
      confirmingDeletes.current.delete(id);
    }
  }, []);

  const renameBookmark = useCallback(async (id: string, title: string) => {
    const { bookmark, error } = await renameBookmarkApi(id, title);

    if (bookmark) {
      setItems((prev) =>
        deduplicateBookmarks(
          prev.map((b) => (b.id === id ? { ...b, ...bookmark } : b))
        )
      );
    }

    return { bookmark, error };
  }, []);

  // Function to remove bookmark from "new" set
  const removeNewTag = useCallback((id: string) => {
    setNewBookmarkIds((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    newBookmarkTimestamps.current.delete(id);
  }, []);
  
  // Periodically clean up old "new" tags
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const RECENT_THRESHOLD = 30000; // 30 seconds
      
      setNewBookmarkIds((prev) => {
        const updated = new Set(prev);
        let hasChanges = false;
        
        prev.forEach((id) => {
          const timestamp = newBookmarkTimestamps.current.get(id);
          if (!timestamp || now - timestamp > RECENT_THRESHOLD) {
            updated.delete(id);
            newBookmarkTimestamps.current.delete(id);
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return {
    items,
    refreshingId,
    newBookmarkIds,
    addBookmark,
    refreshMetadata,
    deleteBookmark,
    undoDelete,
    confirmDelete,
    renameBookmark,
    removeNewTag,
  };
}
