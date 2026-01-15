"use client";

import type { FilterTag } from "@/types/bookmark";

type FilterTagsProps = {
  availableTags: Array<{ id: FilterTag; label: string }>;
  activeFilter: FilterTag;
  onFilterChange: (filter: FilterTag) => void;
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
          onClick={() => onFilterChange(tag.id)}
          className={`rounded-md ring-1 ring-neutral-200 shadow-sm px-2 py-1 text-sm transition-all active:scale-[0.97] ${
            activeFilter === tag.id
              ? "text-neutral-800 bg-neutral-200/60"
              : "bg-white text-neutral-500 hover:bg-neutral-100/80 hover:text-neutral-800"
          }`}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
