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
