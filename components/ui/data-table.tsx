"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";

export type Column<T> = {
  key: string;
  header: string;
  /** Cell contents. */
  cell: (row: T) => React.ReactNode;
  /** Return a comparable value to make the column sortable. */
  sortValue?: (row: T) => string | number;
  /** Text folded into the search box. */
  searchValue?: (row: T) => string;
  className?: string;
  headerClassName?: string;
};

/**
 * Sortable, searchable table for the admin console.
 *
 * Sorting and filtering happen on the client over an already-paged server
 * result, which keeps it a single component with no extra round trips. If a
 * game ever grows past a few hundred rows this should move server-side.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  searchPlaceholder,
  empty,
  initialSort,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  empty?: React.ReactNode;
  initialSort?: { key: string; direction: "asc" | "desc" };
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort ?? null);

  const searchable = columns.some((c) => c.searchValue);

  const visible = useMemo(() => {
    let out = rows;

    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((row) =>
        columns.some((c) => c.searchValue?.(row).toLowerCase().includes(q)),
      );
    }

    if (sort) {
      const column = columns.find((c) => c.key === sort.key);
      if (column?.sortValue) {
        const dir = sort.direction === "asc" ? 1 : -1;
        out = [...out].sort((a, b) => {
          const av = column.sortValue!(a);
          const bv = column.sortValue!(b);
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
      }
    }

    return out;
  }, [rows, columns, query, sort]);

  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? "Search"}
            className="h-9 pl-9"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap",
                    c.headerClassName,
                  )}
                  aria-sort={
                    sort?.key === c.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "border-b last:border-0 outline-none transition-colors",
                  onRowClick &&
                    "cursor-pointer hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            {query.trim() ? `Nothing matches “${query.trim()}”.` : empty ?? "Nothing here yet."}
          </div>
        )}
      </div>

      {searchable && visible.length > 0 && query.trim() && (
        <p className="text-xs text-faint-foreground">
          {visible.length} of {rows.length} shown
        </p>
      )}
    </div>
  );
}
