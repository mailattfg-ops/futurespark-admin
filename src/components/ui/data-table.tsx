"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Column definition for DataTable.
 *
 * @template T - The row data type.
 */
export interface DataTableColumn<T> {
  /** Unique key identifying this column (also used as React key). */
  key: string;
  /** Header label rendered in <TableHead>. Can be a string or any ReactNode. */
  header: React.ReactNode;
  /** Renderer for the cell content given the row object. */
  cell: (row: T) => React.ReactNode;
  /** Optional extra className forwarded to <TableHead> for this column. */
  headerClassName?: string;
  /** Optional extra className forwarded to <TableCell> for this column. */
  cellClassName?: string;
}

export interface DataTableProps<T> {
  /** Column definitions – determines header order and cell rendering. */
  columns: DataTableColumn<T>[];
  /**
   * Row data array. Each item must include a unique `id` field used as the
   * React key. If your data uses a different unique field, pass `rowKey`.
   */
  data: T[];
  /**
   * Custom row-key extractor. Defaults to `(row) => (row as any).id`.
   */
  rowKey?: (row: T) => string;
  /** Show a loading skeleton instead of data rows. */
  loading?: boolean;
  /** Number of skeleton rows to render while loading. Defaults to 5. */
  loadingRows?: number;
  /** Content shown when data is empty and not loading. */
  emptyState?: React.ReactNode;
  /** Optional table caption (rendered below the table by default). */
  caption?: React.ReactNode;
  /** Extra className applied to the outer wrapper div. */
  className?: string;
  /** Extra className applied to the Table element. */
  tableClassName?: string;
  /** Callback fired when a row is clicked. */
  onRowClick?: (row: T) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * DataTable — FutureSpark canonical table component.
 *
 * Rules (enforced in .agents/AGENTS.md):
 * - MUST be used for every tabular view in admin-web.
 * - MUST NOT replace with native <table>, <tr>, <td> etc.
 * - Built exclusively on shadcn Table primitives from @/components/ui/table.
 * - Follows Next.js "use client" directive requirement.
 *
 * @example
 * ```tsx
 * import { DataTable, DataTableColumn } from "@/components/ui/data-table";
 *
 * const columns: DataTableColumn<User>[] = [
 *   { key: "name", header: "Name", cell: (u) => `${u.firstName} ${u.lastName}` },
 *   { key: "email", header: "Email", cell: (u) => u.email },
 * ];
 *
 * <DataTable columns={columns} data={users} loading={isLoading} />
 * ```
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  loadingRows = 5,
  emptyState,
  caption,
  className,
  tableClassName,
  onRowClick,
}: DataTableProps<T>) {
  const getKey = rowKey ?? ((row: T) => (row as any).id as string);

  return (
    <div
      className={cn(
        "bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl",
        className
      )}
    >
      <Table
        className={cn("w-full text-left border-collapse", tableClassName)}
      >
        {caption && <TableCaption>{caption}</TableCaption>}

        {/* Header */}
        <TableHeader>
          <TableRow className="border-b border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.02]">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "py-4 px-6 text-[10px] text-white/35 font-bold uppercase tracking-wider h-auto",
                  col.headerClassName
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        {/* Body */}
        <TableBody className="divide-y divide-white/[0.04]">
          {/* Loading skeleton rows */}
          {loading &&
            Array.from({ length: loadingRows }).map((_, i) => (
              <TableRow
                key={`skeleton-${i}`}
                className="border-b border-white/[0.04] hover:bg-transparent"
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className="py-4 px-6">
                    <div className="h-3 rounded-md bg-white/[0.06] animate-pulse w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {/* Loading spinner row */}
          {loading && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="py-3 px-6 text-center"
              >
                <span className="inline-flex items-center gap-2 text-[10px] text-white/30">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </span>
              </TableCell>
            </TableRow>
          )}

          {/* Data rows */}
          {!loading &&
            data.map((row) => (
              <TableRow
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "text-xs border-b border-white/[0.04] transition-colors",
                  onRowClick && "cursor-pointer hover:bg-white/[0.02]",
                  !onRowClick && "hover:bg-white/[0.01]"
                )}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn("py-4 px-6", col.cellClassName)}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {/* Empty state */}
          {!loading && data.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="py-14 px-6 text-center"
              >
                {emptyState ?? (
                  <span className="text-xs text-white/30 italic">
                    No records found.
                  </span>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
