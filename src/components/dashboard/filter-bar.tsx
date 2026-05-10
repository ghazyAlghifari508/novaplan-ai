"use client";

import { Input } from "@/components/ui/input";

interface FilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
}

const FILTERS = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Selesai" },
  { value: "archived", label: "Arsip" },
];

const SORTS = [
  { value: "recent", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "name", label: "Nama A-Z" },
];

export function FilterBar({
  search,
  setSearch,
  filter,
  setFilter,
  sort,
  setSort,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              filter === f.value
                ? "bg-primary-black text-white"
                : "bg-light-gray-bg text-text-gray hover:text-primary-black"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Cari PRD..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-48 text-sm"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-9 rounded-lg border border-border-subtle bg-white px-3 text-sm font-medium text-text-gray focus:border-primary-black focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}