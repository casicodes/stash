export type Metadata = {
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
  contentText: string | null;
};

function extractMeta(html: string, key: string): string | null {
  // property="og:title" content="..."
  const propMatch = html.match(
    new RegExp(
      `<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    )
  );
  if (propMatch?.[1]) return propMatch[1].trim();

  // content="..." property="og:title"
  const propReverseMatch = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`,
      "i"
    )
  );
  if (propReverseMatch?.[1]) return propReverseMatch[1].trim();

  // name="description" content="..."
  const nameMatch = html.match(
    new RegExp(
      `<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    )
  );
  if (nameMatch?.[1]) return nameMatch[1].trim();

  // content="..." name="description"
  const nameReverseMatch = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`,
      "i"
    )
  );
  if (nameReverseMatch?.[1]) return nameReverseMatch[1].trim();

  return null;
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? null;
}

function resolveImageUrl(
  imageUrl: string | null,
  baseUrl: string
): string | null {
  if (!imageUrl) return null;

  try {
    // If already absolute, return as is
    new URL(imageUrl);
    return imageUrl;
  } catch {
    // Relative URL - resolve against base URL
    try {
      const base = new URL(baseUrl);
      const resolved = new URL(imageUrl, base);
      return resolved.toString();
    } catch {
      return null;
    }
  }
}

/**
 * Extracts readable text content from HTML.
 * Focuses on main content areas (article, main, body) and extracts
 * headings, paragraphs, and list items. Truncates to ~5k characters.
 */
function extractReadableText(html: string): string | null {
  try {
    // Remove script, style, nav, header, footer, and other non-content elements
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");

    // Try to find main content area
    let contentMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (!contentMatch) {
      contentMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    }
    if (!contentMatch) {
      contentMatch = cleaned.match(
        /<div[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/div>/i
      );
    }
    if (!contentMatch) {
      // Fallback to body
      contentMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    }

    const content = contentMatch ? contentMatch[1] : cleaned;

    // Extract text from headings, paragraphs, and list items
    const textParts: string[] = [];

    // Extract headings (h1-h6)
    const headingMatches = content.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi);
    for (const match of headingMatches) {
      const text = match[1].trim().replace(/\s+/g, " ");
      if (text.length > 0) {
        textParts.push(text);
      }
    }

    // Extract paragraphs
    const paragraphMatches = content.matchAll(
      /<p[^>]*>([^<]*(?:<[^>]+>[^<]*<\/[^>]+>[^<]*)*)<\/p>/gi
    );
    for (const match of paragraphMatches) {
      const text = match[1]
        .replace(/<[^>]+>/g, "")
        .trim()
        .replace(/\s+/g, " ");
      if (text.length > 10) {
        // Only include paragraphs with meaningful content
        textParts.push(text);
      }
    }

    // Extract list items
    const listItemMatches = content.matchAll(
      /<li[^>]*>([^<]*(?:<[^>]+>[^<]*<\/[^>]+>[^<]*)*)<\/li>/gi
    );
    for (const match of listItemMatches) {
      const text = match[1]
        .replace(/<[^>]+>/g, "")
        .trim()
        .replace(/\s+/g, " ");
      if (text.length > 5) {
        textParts.push(`• ${text}`);
      }
    }

    // If we didn't find structured content, extract all text from remaining HTML
    if (textParts.length === 0) {
      const allText = content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Lower threshold - extract even if minimal content
      if (allText.length > 20) {
        textParts.push(allText);
      }
    }

    if (textParts.length === 0) {
      return null;
    }

    // Join and truncate to ~5k characters, preserving sentence boundaries
    let combined = textParts.join("\n\n");
    const maxLength = 5000;

    if (combined.length <= maxLength) {
      return combined;
    }

    // Truncate at sentence boundary
    const truncated = combined.slice(0, maxLength);
    const lastSentence = truncated.lastIndexOf(".");
    const lastNewline = truncated.lastIndexOf("\n");

    // Prefer sentence boundary, then paragraph boundary
    const cutPoint =
      lastSentence > maxLength * 0.8
        ? lastSentence + 1
        : lastNewline > maxLength * 0.8
        ? lastNewline
        : maxLength;

    return truncated.slice(0, cutPoint).trim();
  } catch {
    return null;
  }
}

export function extractMetadata(html: string, baseUrl: string): Metadata {
  const title =
    extractMeta(html, "og:title") ??
    extractMeta(html, "twitter:title") ??
    extractTitle(html);

  const description =
    extractMeta(html, "og:description") ??
    extractMeta(html, "twitter:description") ??
    extractMeta(html, "description");

  const siteName = extractMeta(html, "og:site_name");

  const rawImageUrl =
    extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");
  const imageUrl = resolveImageUrl(rawImageUrl, baseUrl);

  const contentText = extractReadableText(html);

  return { title, description, siteName, imageUrl, contentText };
}

async function fetchDirect(url: string): Promise<Metadata | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Accept: "text/html",
      },
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await res.text();
    const metadata = extractMetadata(html, url);

    if (!metadata.title && !metadata.imageUrl) {
      console.warn("OG scrape failed for", url);
    }

    // Log if content extraction failed (for debugging)
    if (!metadata.contentText && html.length > 1000) {
      console.warn(
        "Content extraction returned null for",
        url,
        "HTML length:",
        html.length
      );
    }

    return metadata;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchViaMicrolink(url: string): Promise<Metadata | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== "success" || !json.data) return null;

    const { title, description, publisher, image } = json.data;

    // Microlink doesn't provide full HTML, so we can't extract content_text
    // Try direct fetch for content extraction if we have a title
    let contentText: string | null = null;
    if (title) {
      try {
        const directRes = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
            Accept: "text/html",
          },
        });
        if (directRes.ok) {
          const contentType = directRes.headers.get("content-type") ?? "";
          if (contentType.includes("text/html")) {
            const html = await directRes.text();
            contentText = extractReadableText(html);
          }
        }
      } catch {
        // Ignore content extraction errors, metadata is still useful
      }
    }

    return {
      title: title ?? null,
      description: description ?? null,
      siteName: publisher ?? null,
      imageUrl: image?.url ?? null,
      contentText,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMetadata(url: string): Promise<Metadata | null> {
  // Try direct fetch first (faster, no API limits)
  const direct = await fetchDirect(url);
  // Return direct result if we got metadata (even without title, content_text is valuable)
  if (direct) {
    return direct;
  }

  // Fall back to Microlink for JS-rendered sites (Twitter, LinkedIn, etc.)
  return fetchViaMicrolink(url);
}

export function isXBookmark(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === "x.com" || h === "twitter.com" || h.endsWith(".x.com") || h.endsWith(".twitter.com");
  } catch {
    return false;
  }
}

export async function fetchXTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept": "text/html",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.log("fetchXTitle: Response not OK", res.status);
      return null;
    }

    const html = await res.text();
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match) {
      console.log("fetchXTitle: No title tag found");
      return null;
    }

    const title = match[1]
      .replace(/\s+/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .trim();

    // Reject invalid titles
    if (!title || 
        title.toLowerCase().includes("login") || 
        title === "X" || 
        title.toLowerCase() === "twitter" ||
        title.length < 3) {
      console.log("fetchXTitle: Title rejected as invalid:", title);
      return null;
    }

    console.log("fetchXTitle: Successfully extracted title:", title.substring(0, 100));
    return title;
  } catch (error) {
    console.log("fetchXTitle: Error fetching title", error);
    return null;
  }
}
