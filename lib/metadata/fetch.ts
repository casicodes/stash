export type Metadata = {
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
};

function extractMeta(html: string, key: string): string | null {
  // property="og:title" content="..."
  const propMatch = html.match(
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i")
  );
  if (propMatch?.[1]) return propMatch[1].trim();

  // content="..." property="og:title"
  const propReverseMatch = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "i")
  );
  if (propReverseMatch?.[1]) return propReverseMatch[1].trim();

  // name="description" content="..."
  const nameMatch = html.match(
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i")
  );
  if (nameMatch?.[1]) return nameMatch[1].trim();

  // content="..." name="description"
  const nameReverseMatch = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "i")
  );
  if (nameReverseMatch?.[1]) return nameReverseMatch[1].trim();

  return null;
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? null;
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

  return { title, description, siteName, imageUrl };
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
        "Accept": "text/html",
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
    return {
      title: title ?? null,
      description: description ?? null,
      siteName: publisher ?? null,
      imageUrl: image?.url ?? null,
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
  if (direct?.title) {
    return direct;
  }

  // Fall back to Microlink for JS-rendered sites (Twitter, LinkedIn, etc.)
  return fetchViaMicrolink(url);
}
