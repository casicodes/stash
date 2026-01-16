import type { Bookmark } from "@/types/bookmark";

export type TimeCategory = {
  id: string;
  label: string;
  bookmarks: Bookmark[];
  defaultExpanded: boolean;
};

export function categorizeBookmarksByTime(bookmarks: Bookmark[]): TimeCategory[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const currentYear = now.getFullYear();

  const categories: TimeCategory[] = [];
  const todayBookmarks: Bookmark[] = [];
  const previous30DaysBookmarks: Bookmark[] = [];
  const yearBookmarksMap = new Map<number, Bookmark[]>();

  for (const bookmark of bookmarks) {
    const bookmarkDate = new Date(bookmark.created_at);
    const bookmarkDateOnly = new Date(
      bookmarkDate.getFullYear(),
      bookmarkDate.getMonth(),
      bookmarkDate.getDate()
    );
    const bookmarkYear = bookmarkDate.getFullYear();

    // Check if bookmark is from today (date only, ignoring time)
    if (bookmarkDateOnly.getTime() === today.getTime()) {
      todayBookmarks.push(bookmark);
    } 
    // Check if bookmark is from previous 30 days (but not today)
    else if (bookmarkDateOnly >= thirtyDaysAgo && bookmarkDateOnly < today) {
      previous30DaysBookmarks.push(bookmark);
    } 
    // Everything else goes into year categories
    else {
      if (!yearBookmarksMap.has(bookmarkYear)) {
        yearBookmarksMap.set(bookmarkYear, []);
      }
      yearBookmarksMap.get(bookmarkYear)!.push(bookmark);
    }
  }

  // Add "Today" category if it has bookmarks
  if (todayBookmarks.length > 0) {
    categories.push({
      id: "today",
      label: "Today",
      bookmarks: todayBookmarks,
      defaultExpanded: true,
    });
  }

  // Add "Previous 30 days" category if it has bookmarks
  if (previous30DaysBookmarks.length > 0) {
    categories.push({
      id: "previous-30-days",
      label: "Previous 30 days",
      bookmarks: previous30DaysBookmarks,
      defaultExpanded: true,
    });
  }

  // Add year categories (sorted descending, current year first)
  const years = Array.from(yearBookmarksMap.keys()).sort((a, b) => b - a);
  for (const year of years) {
    const yearBookmarks = yearBookmarksMap.get(year)!;
    categories.push({
      id: `year-${year}`,
      label: year.toString(),
      bookmarks: yearBookmarks,
      defaultExpanded: false, // All year sections collapsed by default
    });
  }

  return categories;
}
