"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { TaskItem, TaskStatus } from "@/lib/tasks";

const statusOptions: { value: TaskStatus; label: string; activeClass: string }[] =
  [
    { value: "todo", label: "To-do", activeClass: "bg-[#bec9be] ring-[#bec9be]" },
    {
      value: "in_progress",
      label: "In Progress",
      activeClass: "bg-[#fdc003] ring-[#fdc003]",
    },
    { value: "done", label: "Done", activeClass: "bg-[#004d27] ring-[#004d27]" },
  ];

interface TaskRowProps {
  item: TaskItem;
  isSaving: boolean;
  onStatusChange: (status: TaskStatus) => void;
  onDetailsChange: (patch: { title?: string; description?: string }) => void;
  onDelete: () => void;
}

export default function TaskRow({
  item,
  isSaving,
  onStatusChange,
  onDetailsChange,
  onDelete,
}: TaskRowProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(
    Boolean(item.description),
  );

  return (
    <div className="group flex items-start gap-3 rounded-2xl p-3 transition hover:bg-[#f3f4f5]">
      <div className="flex shrink-0 items-center gap-1.5 pt-1.5">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onStatusChange(option.value)}
            title={option.label}
            aria-label={option.label}
            aria-pressed={item.status === option.value}
            className={
              item.status === option.value
                ? `h-4 w-4 rounded-full ring-2 ring-offset-1 ${option.activeClass}`
                : "h-4 w-4 rounded-full bg-white ring-1 ring-[#bec9be] transition hover:ring-[#3f4940]"
            }
          />
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <input
          value={item.title}
          onChange={(event) => onDetailsChange({ title: event.target.value })}
          className={
            item.status === "done"
              ? "w-full bg-transparent text-sm font-semibold text-[#6f7a70] line-through outline-none"
              : "w-full bg-transparent text-sm font-semibold text-[#191c1d] outline-none"
          }
        />

        {isDescriptionOpen ? (
          <textarea
            value={item.description}
            onChange={(event) =>
              onDetailsChange({ description: event.target.value })
            }
            placeholder="Tambahkan deskripsi..."
            className="mt-1 w-full resize-none bg-transparent text-xs leading-relaxed text-[#3f4940] outline-none placeholder:text-[#6f7a70]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsDescriptionOpen(true)}
            className="mt-1 truncate text-xs text-[#6f7a70] hover:text-[#004d27]"
          >
            {item.description
              ? item.description.length > 80
                ? `${item.description.slice(0, 80)}...`
                : item.description
              : "+ Tambah deskripsi"}
          </button>
        )}
      </div>

      {isSaving && (
        <span className="shrink-0 text-[10px] font-semibold text-[#6f7a70]">
          Menyimpan...
        </span>
      )}

      <button
        type="button"
        onClick={onDelete}
        aria-label="Hapus task"
        title="Hapus task"
        className="shrink-0 rounded-full p-1.5 text-[#ba1a1a] opacity-0 transition hover:bg-[#ffdad6] focus:opacity-100 group-hover:opacity-100"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </div>
  );
}
