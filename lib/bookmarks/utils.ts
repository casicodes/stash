export function getFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, "") // Remove heading markers (with or without space)
    .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.+?)\*/g, "$1") // Remove italic
    .replace(/~~(.+?)~~/g, "$1") // Remove strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // Remove code blocks and inline code
    .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // Remove links, keep text
    .replace(/^>\s*/gm, "") // Remove blockquote markers
    .replace(/\n+/g, " ") // Replace newlines with spaces for single line display
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Removes source reference from markdown text (used for snippets).
 * Removes lines matching the pattern: "---\n_Source: ..."
 * @param text - Markdown text to clean
 * @returns Text without source reference
 */
export function removeSourceReference(text: string): string {
  if (!text) return text;
  
  // Remove source reference pattern: --- followed by _Source: [hostname](url)_
  // This matches the pattern added by the extension: \n\n---\n_Source: [${hostname}](${sourceUrl})_
  // Handle variations with optional whitespace
  return text
    .replace(/\n\n---\s*\n\s*_Source:\s*\[[^\]]+\]\([^)]+\)_/g, "")
    .replace(/\n\n---\s*\n\s*_Source:.*$/m, "")
    .trim();
}

/**
 * Truncates markdown text while preserving format structure.
 * Keeps headings, paragraphs, and basic formatting intact.
 * @param text - Markdown text to truncate
 * @param maxLength - Maximum character length (default: 300)
 * @returns Truncated markdown text
 */
export function truncateMarkdown(text: string, maxLength: number = 300): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Split by double newlines to preserve paragraph structure
  const paragraphs = text.split(/\n\n+/);
  let result = "";
  let currentLength = 0;

  for (const para of paragraphs) {
    // Skip source reference paragraphs
    if (para.match(/^---\s*$/m) || para.match(/^_Source:/m)) {
      continue;
    }
    
    const paraLength = para.length;
    
    if (currentLength + paraLength + 2 <= maxLength) {
      // Add full paragraph
      if (result) result += "\n\n";
      result += para;
      currentLength += paraLength + 2;
    } else {
      // Truncate within this paragraph
      const remaining = maxLength - currentLength - 5; // Reserve space for "..."
      if (remaining > 20) {
        // Only truncate if we have meaningful space left
        const truncated = para.slice(0, remaining);
        // Try to break at sentence or word boundary
        const lastPeriod = truncated.lastIndexOf(".");
        const lastSpace = truncated.lastIndexOf(" ");
        const breakPoint = lastPeriod > remaining * 0.7 ? lastPeriod + 1 : lastSpace;
        
        if (result) result += "\n\n";
        result += truncated.slice(0, breakPoint > 0 ? breakPoint : remaining).trim();
        result += "...";
      }
      break;
    }
  }

  return result.trim();
}

/**
 * Extracts source URL from snippet notes if it exists.
 * Looks for pattern: _Source: [text](url)_
 */
export function extractSourceUrl(notes: string | null): string | null {
  if (!notes) return null;
  const sourceMatch = notes.match(/_Source:\s*\[[^\]]+\]\(([^)]+)\)_/);
  return sourceMatch ? sourceMatch[1] : null;
}

/**
 * Normalizes source link in markdown to show full URL as link text.
 * Converts _Source: [hostname](url)_ to _Source: [url](url)_
 */
export function normalizeSourceLink(notes: string | null): string | null {
  if (!notes) return notes;
  // Replace _Source: [hostname](url)_ with _Source: [url](url)_
  return notes.replace(
    /_Source:\s*\[([^\]]+)\]\(([^)]+)\)_/g,
    (match, linkText, url) => {
      // Only replace if linkText is different from url (i.e., it's just hostname)
      if (linkText !== url) {
        return `_Source: [${url}](${url})_`;
      }
      return match;
    }
  );
}
