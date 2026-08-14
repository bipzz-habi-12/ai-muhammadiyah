"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Skill } from "@/lib/skills";

// Peluncur /work. Semua pekerjaan tetap terjadi di chat — komponen ini hanya
// menyusun deep link ke SPA: ?skill= mengaktifkan skill kerja, ?ask= mengisi
// komposer. Keduanya sudah ditangani app/page.tsx.
//
// Template didefinisikan di KODE, bukan di DB, supaya halaman ini tetap
// berguna sebelum migrasi skill kerja di-apply. Bila slash command sebuah
// template belum ada di DB, tautannya turun derajat dengan sendirinya jadi
// ?ask= saja — bukan mengirim ?skill= ke skill yang tidak ada.

type WorkTemplate = {
  title: string;
  description: string;
  slashCommand: string;
  prompt: string;
};

const templates: WorkTemplate[] = [
  {
    title: "Surat undangan rapat",
    description: "Undangan resmi lengkap dengan agenda",
    slashCommand: "/surat",
    prompt:
      "Buatkan surat undangan rapat resmi. Agenda rapat: ... Hari/tanggal: ... Tempat: ... Yang diundang: ...",
  },
  {
    title: "Notulen dari catatan",
    description: "Catatan mentah jadi notulen rapi",
    slashCommand: "/rapat",
    prompt:
      "Ubah catatan rapat berikut menjadi notulen yang rapi, lengkap dengan keputusan dan tindak lanjut beserta penanggung jawabnya:\n\n",
  },
  {
    title: "Proposal kegiatan",
    description: "Latar belakang sampai rencana anggaran",
    slashCommand: "/laporan",
    prompt:
      "Susunkan proposal kegiatan. Nama kegiatan: ... Tujuan: ... Sasaran peserta: ... Waktu dan tempat: ...",
  },
  {
    title: "Laporan pertanggungjawaban",
    description: "LPJ dengan evaluasi dan realisasi",
    slashCommand: "/laporan",
    prompt:
      "Susunkan laporan pertanggungjawaban (LPJ) kegiatan. Nama kegiatan: ... Yang sudah terlaksana: ... Kendala: ...",
  },
  {
    title: "Balasan email profesional",
    description: "Jawaban yang sopan dan langsung ke inti",
    slashCommand: "/surat",
    prompt:
      "Bantu saya membalas email berikut dengan sopan dan profesional. Yang ingin saya sampaikan: ...\n\nEmail aslinya:\n\n",
  },
  {
    title: "Rencana kerja & timeline",
    description: "Rincian tugas, penanggung jawab, tenggat",
    slashCommand: "/proyek",
    prompt:
      "Buatkan rencana kerja dan timeline untuk: ... Tenggat akhir: ... Orang yang terlibat: ...",
  },
];

export default function WorkLauncher({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  const availableSlashCommands = new Set(
    skills
      .map((skill) => skill.slashCommand)
      .filter((command): command is string => Boolean(command)),
  );

  function openInChat(prompt: string, slashCommand?: string) {
    const params = new URLSearchParams();

    if (slashCommand && availableSlashCommands.has(slashCommand)) {
      params.set("skill", slashCommand);
    }

    params.set("ask", prompt);
    router.push(`/?${params.toString()}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();

    if (!trimmed) {
      return;
    }

    openInChat(trimmed);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-9">
        <div className="flex items-center gap-2 rounded-[14px] border border-[var(--brand-deep-line)]/12 bg-[var(--surface)] px-4 py-2.5 transition focus-within:border-[var(--brand)]/45">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Apa yang perlu dikerjakan hari ini?"
            aria-label="Tulis pekerjaan yang ingin dibantu"
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--muted-3)]"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            className="shrink-0 rounded-[10px] bg-[var(--brand)] px-5 py-2.5 text-[14px] font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)] disabled:cursor-default disabled:opacity-45"
          >
            Mulai
          </button>
        </div>
      </form>

      <div className="mb-4 text-[13px] font-bold uppercase tracking-[0.05em] text-[var(--muted)]">
        Mulai cepat
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <button
            key={template.title}
            type="button"
            onClick={() => openInChat(template.prompt, template.slashCommand)}
            className="rounded-[13px] border border-[var(--brand-deep-line)]/10 bg-[var(--surface)] px-5 py-4 text-left transition duration-150 hover:-translate-y-0.5 hover:border-[var(--brand)]/35"
          >
            <div className="mb-1 text-[15px] font-semibold text-[var(--c-1b2721)]">
              {template.title}
            </div>
            <div className="text-[13px] leading-relaxed text-[var(--muted-3)]">
              {template.description}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
