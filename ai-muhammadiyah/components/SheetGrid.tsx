"use client";

import { useMemo, useState } from "react";
import { SparkIcon, Icon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import {
  evaluateGrid,
  indexToColumnLetter,
  MAX_COLUMNS,
  MAX_ROWS,
} from "@/lib/sheets/formula";
import type { Sheet } from "@/lib/sheets";

interface SheetGridProps {
  sheet: Sheet | undefined;
  isSaving: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  activeConversationTitle: string | undefined;
  lastTruncated: boolean;
  onClearTruncated: () => void;
  onTitleChange: (title: string) => void;
  onCellChange: (rowIndex: number, colIndex: number, value: string) => void;
  onColumnLabelChange: (colIndex: number, value: string) => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  onDeleteRow: (rowIndex: number) => void;
  onDeleteColumn: (colIndex: number) => void;
  onDelete: (id: string) => void;
  onGenerate: () => void;
  onClose: () => void;
}

export default function SheetGrid({
  sheet,
  isSaving,
  isGenerating,
  canGenerate,
  activeConversationTitle,
  lastTruncated,
  onClearTruncated,
  onTitleChange,
  onCellChange,
  onColumnLabelChange,
  onAddRow,
  onAddColumn,
  onDeleteRow,
  onDeleteColumn,
  onDelete,
  onGenerate,
  onClose,
}: SheetGridProps) {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(
    null,
  );

  const computed = useMemo(() => {
    if (!sheet) {
      return [];
    }

    return evaluateGrid({ columns: sheet.columns, rows: sheet.rows });
  }, [sheet]);

  if (!sheet) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-[#6f7a70]">
        <Icon name="sheets" className="h-8 w-8 text-[#bec9be]" />
        <p>Pilih sheet dari daftar, atau buat sheet baru.</p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          title={
            canGenerate
              ? activeConversationTitle
                ? `Generate dari "${activeConversationTitle}"`
                : "Generate dari chat ini"
              : "Buka percakapan dulu untuk generate"
          }
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SparkIcon className="h-4 w-4" />
          {isGenerating ? "Menggenerate..." : "Generate dari chat ini"}
        </button>
      </section>
    );
  }

  const rowCap = sheet.rows.length >= MAX_ROWS;
  const colCap = sheet.columns.length >= MAX_COLUMNS;

  return (
    <section className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="flex w-full flex-1 flex-col gap-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex w-fit items-center gap-1 text-sm font-bold text-[#3f4940] hover:text-[#004d27] md:hidden"
        >
          <span aria-hidden="true">←</span>
          Kembali ke daftar
        </button>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6f7a70]">
          <span className="rounded-full bg-[#f3f4f5] px-3 py-1 font-bold text-[#3f4940]">
            {isSaving ? "Menyimpan..." : "Tersimpan"}
          </span>
          <span>{formatRelativeTime(sheet.updatedAt)}</span>
        </div>

        <input
          value={sheet.title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Judul sheet"
          className="w-full bg-transparent text-3xl font-bold text-[#191c1d] outline-none placeholder:text-[#6f7a70]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            title={
              canGenerate
                ? activeConversationTitle
                  ? `Generate dari "${activeConversationTitle}"`
                  : "Generate dari chat ini"
                : "Buka percakapan dulu untuk generate"
            }
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SparkIcon className="h-4 w-4" />
            {isGenerating ? "Menggenerate..." : "Generate dari chat ini"}
          </button>

          <button
            type="button"
            onClick={() => onDelete(sheet.id)}
            className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#ba1a1a] transition hover:bg-[#ffdad6]"
          >
            <Icon name="trash" className="h-4 w-4" />
            Hapus
          </button>
        </div>

        {lastTruncated && (
          <p className="flex items-center justify-between gap-3 rounded-2xl bg-[#fdc003]/20 p-3 text-sm font-semibold text-[#6c5000]">
            <span>Hasil generate dipotong ke batas {MAX_ROWS} baris × {MAX_COLUMNS} kolom.</span>
            <button
              type="button"
              onClick={onClearTruncated}
              className="shrink-0 text-xs font-bold underline"
            >
              Tutup
            </button>
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl ring-1 ring-[#bec9be]">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-10 border-b border-r border-[#bec9be] bg-[#f3f4f5]" />
                {sheet.columns.map((_, colIndex) => (
                  <th
                    key={`letter-${colIndex}`}
                    className="border-b border-r border-[#bec9be] bg-[#f3f4f5] px-2 py-1 text-[11px] font-semibold text-[#6f7a70]"
                  >
                    {indexToColumnLetter(colIndex)}
                  </th>
                ))}
                <th className="border-b border-[#bec9be] bg-[#f3f4f5] px-2 py-1">
                  <button
                    type="button"
                    onClick={onAddColumn}
                    disabled={colCap}
                    title={colCap ? `Maks ${MAX_COLUMNS} kolom` : "Tambah kolom"}
                    className="rounded px-2 py-0.5 text-xs font-bold text-[#004d27] hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + Kolom
                  </button>
                </th>
              </tr>
              <tr>
                <th className="w-10 border-b border-r border-[#bec9be] bg-white" />
                {sheet.columns.map((label, colIndex) => (
                  <th
                    key={`header-${colIndex}`}
                    className="group relative border-b border-r border-[#bec9be] bg-white p-0"
                  >
                    <input
                      value={label}
                      onChange={(event) =>
                        onColumnLabelChange(colIndex, event.target.value)
                      }
                      className="w-28 min-w-[7rem] bg-transparent px-2 py-1.5 text-left text-sm font-bold text-[#191c1d] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteColumn(colIndex)}
                      title="Hapus kolom"
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#ba1a1a] opacity-0 transition hover:bg-[#ffdad6] group-hover:opacity-100"
                    >
                      <Icon name="close" className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="border-b border-[#bec9be] bg-white" />
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="group/row">
                  <td className="border-b border-r border-[#bec9be] bg-[#f3f4f5] px-2 py-1 text-center text-[11px] font-semibold text-[#6f7a70]">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => {
                    const isFocused =
                      focusedCell?.row === rowIndex && focusedCell?.col === colIndex;
                    const computedValue = computed[rowIndex]?.[colIndex] ?? "";
                    const isError = computedValue.startsWith("#");

                    return (
                      <td
                        key={`cell-${rowIndex}-${colIndex}`}
                        className="border-b border-r border-[#bec9be] p-0"
                      >
                        <input
                          value={isFocused ? cell : computedValue}
                          onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
                          onBlur={() => setFocusedCell(null)}
                          onChange={(event) =>
                            onCellChange(rowIndex, colIndex, event.target.value)
                          }
                          className={
                            isError && !isFocused
                              ? "w-28 min-w-[7rem] bg-transparent px-2 py-1.5 text-sm text-[#ba1a1a] outline-none"
                              : "w-28 min-w-[7rem] bg-transparent px-2 py-1.5 text-sm text-[#191c1d] outline-none focus:bg-[#004d27]/5"
                          }
                        />
                      </td>
                    );
                  })}
                  <td className="border-b border-[#bec9be] px-1">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(rowIndex)}
                      title="Hapus baris"
                      className="rounded p-1 text-[#ba1a1a] opacity-0 transition hover:bg-[#ffdad6] group-hover/row:opacity-100"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={onAddRow}
          disabled={rowCap}
          title={rowCap ? `Maks ${MAX_ROWS} baris` : "Tambah baris"}
          className="inline-flex w-fit items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Baris
        </button>
      </div>
    </section>
  );
}
