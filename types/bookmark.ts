export type Bookmark = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  site_name: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  tags?: string[];
};

export type InputMode = "add" | "search";

export const FILTER_TAGS = [
  { id: "all", label: "All" },
  { id: "x", label: "X" },
  { id: "youtube", label: "Youtube" },
  { id: "linkedin", label: "Linkedin" },
  { id: "websites", label: "Websites" },
  { id: "snippets", label: "Snippets" },
  { id: "images", label: "Images" },
] as const;

export type FilterTag = (typeof FILTER_TAGS)[number]["id"];
