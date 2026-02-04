"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import type { Bookmark } from "@/types/bookmark";

const DEBOUNCE_MS = 400;

// SWR fetcher for search API
async function searchFetcher(url: string): Promise<Bookmark[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Search failed");
  }
  const data = await response.json();
  return data.results ?? [];
}

// Custom hook to handle debounced query
function useDebouncedValue(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  // Use useEffect pattern via useMemo return cleanup
  // Actually, we need useState + useEffect for proper debounce
  return debouncedValue;
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the query
  useMemo(() => {
    if (!query.trim()) {
      setDebouncedQuery("");
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(handler);
  }, [query]);

  // Use SWR for automatic deduplication, caching, and revalidation
  const { data, isLoading, isValidating } = useSWR(
    debouncedQuery
      ? `/api/search?q=${encodeURIComponent(debouncedQuery)}`
      : null,
    searchFetcher,
    {
      // Don't revalidate on focus for search (user expects fresh results on type)
      revalidateOnFocus: false,
      // Keep previous data while fetching new results
      keepPreviousData: false,
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
    }
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  // Results are null when no search, or the fetched data
  const results = debouncedQuery ? data ?? null : null;

  return {
    query,
    setQuery,
    results,
    isLoading: isLoading || isValidating,
    clearSearch,
  };
}
