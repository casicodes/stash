"use client";

import { useState, useEffect } from "react";
import type { Bookmark } from "@/types/bookmark";
import { searchBookmarks } from "@/lib/api/bookmarks";

const DEBOUNCE_MS = 400;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Bookmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    
    if (!term) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    
    const timeout = setTimeout(() => {
      setIsLoading(true);
      searchBookmarks(term, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setResults(data);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
      setIsLoading(false);
    };
  }, [query]);

  const clearSearch = () => {
    setQuery("");
    setResults(null);
    setIsLoading(false);
  };

  return {
    query,
    setQuery,
    results,
    isLoading,
    clearSearch,
  };
}
