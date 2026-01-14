"use client";

import type { FilterTag } from "@/types/bookmark";

type FilterTagsProps = {
  availableTags: Array<{ id: FilterTag; label: string }>;
  activeFilter: FilterTag | null;
  onFilterChange: (filter: FilterTag | null) => void;
};

export function FilterTags({
  availableTags,
  activeFilter,
  onFilterChange,
}: FilterTagsProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {availableTags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() =>
            onFilterChange(activeFilter === tag.id ? null : tag.id)
          }
          className={`rounded-lg ring-1 ring-neutral-200 shadow-sm px-2 py-1 text-sm transition-all active:scale-[0.97] ${
            activeFilter === tag.id
              ? "text-white bg-neutral-800 ring-neutral-800"
              : "bg-white text-neutral-500 hover:bg-neutral-100/80 hover:text-neutral-800"
          }`}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
