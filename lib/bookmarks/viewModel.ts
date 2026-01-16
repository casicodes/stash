import type { Bookmark } from "@/types/bookmark";
import { getFaviconUrl, extractSourceUrl, stripMarkdown } from "./utils";

export type BookmarkKind = "note" | "image" | "link";

export type BookmarkViewModel = {
  kind: BookmarkKind;
  isTextNote: boolean;
  isImageBookmark: boolean;
  isLoading: boolean;
  hasOgImage: boolean;
  faviconUrl: string | null;
  primaryText: string;
  secondaryText: string | null;
  iconUrl: string | null;
  snippetSourceUrl: string | null;
};

export function bookmarkViewModel(bookmark: Bookmark): BookmarkViewModel {
  const isTextNote = bookmark.url.startsWith("note://");
  const isImageBookmark = bookmark.tags?.includes("images") ?? false;
  const isLoading = bookmark.id.startsWith("temp-");
  const hasOgImage = bookmark.image_url && bookmark.image_url.trim().length > 0;

  let kind: BookmarkKind;
  if (isTextNote) {
    kind = "note";
  } else if (isImageBookmark) {
    kind = "image";
  } else {
    kind = "link";
  }

  const faviconUrl =
    isTextNote || isImageBookmark ? null : getFaviconUrl(bookmark.url);

  // Extract source URL from snippet notes if it exists
  const snippetSourceUrl = isTextNote
    ? extractSourceUrl(bookmark.notes)
    : null;

  // Determine primary and secondary text
  let primaryText: string;
  let secondaryText: string | null = null;

  if (isTextNote) {
    // For text notes, use title if available, otherwise strip markdown from notes
    primaryText = bookmark.title ?? stripMarkdown(bookmark.notes ?? "Note");
    secondaryText = snippetSourceUrl;
  } else if (isImageBookmark) {
    primaryText = bookmark.title ?? bookmark.description ?? "Saved image";
    secondaryText =
      bookmark.notes && bookmark.notes.startsWith("http")
        ? bookmark.notes
        : bookmark.url;
  } else {
    primaryText = bookmark.title ?? bookmark.url;
    secondaryText = bookmark.title ? bookmark.url : null;
  }

  // Determine icon URL
  let iconUrl: string | null = null;
  if (isTextNote && hasOgImage) {
    iconUrl = bookmark.image_url;
  } else if (isImageBookmark) {
    iconUrl = bookmark.image_url ?? bookmark.url;
  } else if (hasOgImage) {
    iconUrl = bookmark.image_url;
  }

  return {
    kind,
    isTextNote,
    isImageBookmark,
    isLoading,
    hasOgImage,
    faviconUrl,
    primaryText,
    secondaryText,
    iconUrl,
    snippetSourceUrl,
  };
}
