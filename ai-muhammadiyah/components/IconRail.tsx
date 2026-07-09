"use client";

import Link from "next/link";
import { SparkIcon, Icon } from "@/components/icons";

interface IconRailProps {
  openSettings: () => void;
  userInitials: string;
}

export default function IconRail({ openSettings, userInitials }: IconRailProps) {
  return (
    <aside className="hidden w-[60px] shrink-0 flex-col items-center border-r border-[#00522a] bg-[#006837] py-5 md:flex">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white">
        <SparkIcon className="h-6 w-6" />
      </div>

      <nav className="mt-8 flex flex-col items-center gap-2">
        <Link
          href="/library"
          title="Library"
          className="grid h-10 w-10 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="library" className="h-5 w-5" />
        </Link>
        <Link
          href="/hub"
          title="Knowledge Hub"
          className="grid h-10 w-10 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="globe" className="h-5 w-5" />
        </Link>
        <Link
          href="/history"
          title="History"
          className="grid h-10 w-10 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="history" className="h-5 w-5" />
        </Link>
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={openSettings}
          title="Settings"
          aria-label="Settings"
          className="grid h-10 w-10 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="settings" className="h-5 w-5" />
        </button>
        <div
          className="grid h-8 w-8 place-items-center rounded-full bg-[#fdc003] text-xs font-bold text-[#6c5000]"
          aria-hidden="true"
        >
          {userInitials}
        </div>
      </div>
    </aside>
  );
}
