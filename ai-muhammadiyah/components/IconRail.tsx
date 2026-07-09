"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { SparkIcon, Icon } from "@/components/icons";
import type { SettingsTab } from "@/lib/mappers/types";
import type { UsageSnapshot } from "@/lib/usage/limits";

interface IconRailProps {
  // account menu (relocated here from the old Sidebar footer; shared open-state
  // with TopBar's mobile popover)
  isAccountMenuOpen: boolean;
  setIsAccountMenuOpen: Dispatch<SetStateAction<boolean>>;
  currentTierLabel: string;
  usageSnapshot: UsageSnapshot | null;
  usageError: string;
  openLearningProfile: () => void;
  openSettings: (tab?: SettingsTab) => void;
  profileLabel: string;
  handleLogout: () => Promise<void>;
  isLoggingOut: boolean;
  userInitials: string;
  userEmail: string;
}

export default function IconRail({
  isAccountMenuOpen,
  setIsAccountMenuOpen,
  currentTierLabel,
  usageSnapshot,
  usageError,
  openLearningProfile,
  openSettings,
  profileLabel,
  handleLogout,
  isLoggingOut,
  userInitials,
  userEmail,
}: IconRailProps) {
  const router = useRouter();

  return (
    <aside className="relative hidden w-[60px] shrink-0 flex-col items-center border-r border-black/20 bg-[#004d27] py-4 md:flex">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white">
        <SparkIcon className="h-6 w-6" />
      </div>

      <nav className="mt-6 flex flex-col items-center gap-4">
        <Link
          href="/library"
          title="Library"
          className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="library" className="h-5 w-5" />
        </Link>
        <Link
          href="/hub"
          title="Knowledge Hub"
          className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="globe" className="h-5 w-5" />
        </Link>
        <Link
          href="/history"
          title="History"
          className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="history" className="h-5 w-5" />
        </Link>
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => openSettings("general")}
          title="Settings"
          aria-label="Settings"
          className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="settings" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          aria-label="Menu akun"
          aria-expanded={isAccountMenuOpen}
          className="grid h-8 w-8 place-items-center rounded-full bg-[#fdc003] text-xs font-bold text-[#6c5000] transition hover:bg-[#fabd00]"
        >
          {userInitials}
        </button>
      </div>

      {isAccountMenuOpen && (
        <div className="absolute bottom-4 left-[68px] z-50 w-[260px] overflow-hidden rounded-[22px] bg-white p-2 text-sm text-[#191c1d] shadow-2xl ring-1 ring-[#bec9be]">
          <button
            type="button"
            onClick={() => {
              setIsAccountMenuOpen(false);
              router.push("/plans");
            }}
            className="flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
          >
            <span>
              <span className="block font-bold text-[#191c1d]">
                Upgrade plan
              </span>
              <span className="text-xs font-semibold text-[#3f4940]">
                {currentTierLabel}
              </span>
            </span>
            <span className="rounded-full bg-[#004d27]/10 px-2 py-1 text-xs font-bold text-[#004d27]">
              {usageSnapshot
                ? `${usageSnapshot.remainingMessagesToday}/${usageSnapshot.dailyMessageLimit}`
                : "--"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAccountMenuOpen(false);
              openLearningProfile();
            }}
            className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
          >
            <Icon name="user" className="h-5 w-5 text-[#004d27]" />
            <span>
              <span className="block font-bold text-[#191c1d]">
                Learning Profile
              </span>
              <span className="text-xs font-semibold text-[#3f4940]">
                {profileLabel}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAccountMenuOpen(false);
              openSettings("subscription");
            }}
            className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
          >
            <Icon name="book" className="h-5 w-5 text-[#004d27]" />
            <span className="font-bold text-[#191c1d]">Usage / quota</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAccountMenuOpen(false);
              openSettings("general");
            }}
            className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
          >
            <Icon name="settings" className="h-5 w-5 text-[#004d27]" />
            <span className="font-bold text-[#191c1d]">Settings</span>
          </button>
          <div className="my-1 border-t border-[#bec9be]" />
          <div className="px-3 py-2">
            <p className="truncate text-xs font-semibold text-[#3f4940]">
              {userEmail || "Memuat akun..."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left font-bold text-[#ba1a1a] transition hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="lock" className="h-5 w-5" />
            {isLoggingOut ? "Keluar..." : "Logout"}
          </button>
          {usageError && (
            <p className="px-3 py-2 text-xs font-semibold text-[#ba1a1a]">
              {usageError}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
