"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Store } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-[250px] shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center gap-sm px-lg py-lg">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
          <Store className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="text-title-lg text-primary">CFD Pedagang</span>
      </div>

      <nav className="flex-1 px-sm py-sm">
        <ul className="flex flex-col gap-xs">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-sm rounded-md px-md py-sm text-label-md transition-colors ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-outline-variant px-lg py-md">
        <div className="mb-md flex items-center gap-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed text-label-md font-semibold text-on-primary-fixed">
            MP
          </span>
          <div className="leading-tight">
            <p className="text-label-md text-on-surface">Mitra Pedagang</p>
            <p className="text-label-sm font-normal tracking-normal text-on-surface-variant">
              Trader Account
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-sm rounded-md px-1 py-xs text-label-md text-error transition-colors hover:bg-error-container"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
