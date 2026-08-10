"use client";

import { Bell, ShieldCheck } from "lucide-react";

export function Topbar({ title = "Portal Pedagang" }: { title?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-lg py-md lg:px-xl">
      <h1 className="text-title-lg text-on-surface">{title}</h1>

      <div className="flex items-center gap-md">
        <span className="hidden items-center gap-xs rounded-full bg-secondary-container px-sm py-1 text-label-sm text-on-secondary-container sm:flex">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
          Terverifikasi
        </span>

        <button
          type="button"
          aria-label="Notifikasi"
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <Bell className="h-5 w-5" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-sm rounded-full border border-outline-variant py-1 pl-1 pr-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-semibold text-on-primary-fixed">
            NP
          </span>
          <span className="hidden text-label-md text-on-surface sm:inline">
            Nama Pedagang
          </span>
        </div>
      </div>
    </header>
  );
}
