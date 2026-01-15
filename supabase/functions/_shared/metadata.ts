function firstMatch(pattern: RegExp, text: string) {
  const m = text.match(pattern);
  return m?.[1]?.trim() ?? null;
}

function extractMeta(html: string, key: string) {
  // property="og:title" content="..." (property first)
  const prop = firstMatch(
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    html
  );
  if (prop) return prop;

  // content="..." property="og:title" (content first)
  const propReverse = firstMatch(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "i"),
    html
  );
  if (propReverse) return propReverse;

  // name="description" content="..."
  const name = firstMatch(
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    html
  );
  if (name) return name;

  // content="..." name="description" (content first)
  const nameReverse = firstMatch(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "i"),
    html
  );
  return nameReverse;
}

function resolveImageUrl(imageUrl: string | null, baseUrl: string): string | null {
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

export function extractMetadata(html: string, baseUrl: string) {
  const title =
    extractMeta(html, "og:title") ??
    extractMeta(html, "twitter:title") ??
    firstMatch(/<title[^>]*>([^<]+)<\/title>/i, html) ??
    null;
  const description = 
    extractMeta(html, "og:description") ?? 
    extractMeta(html, "twitter:description") ?? 
    extractMeta(html, "description") ?? 
    null;
  const siteName = extractMeta(html, "og:site_name") ?? null;
  const rawImageUrl = extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image") ?? null;
  const imageUrl = resolveImageUrl(rawImageUrl, baseUrl);
  return { title, description, siteName, imageUrl };
}

