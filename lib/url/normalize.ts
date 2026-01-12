/**
 * Check if the input looks like a URL (has scheme or looks like a domain)
 */
export function isUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Has explicit scheme
  if (/^https?:\/\//i.test(trimmed)) return true;

  // Looks like a domain (word.word pattern, no spaces)
  if (/^[^\s]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return true;

  return false;
}

export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Only try to normalize if it looks like a URL
  if (!isUrl(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    try {
      // Allow users to paste without scheme
      url = new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }

  url.hash = "";

  // Strip common tracking params
  const paramsToDrop = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
    "fbclid",
    "gclid"
  ];
  for (const key of paramsToDrop) {
    url.searchParams.delete(key);
  }

  // Normalize hostname and trailing slash
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

export function urlDomain(input: string | null) {
  if (!input) return "";
  try {
    return new URL(input).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

