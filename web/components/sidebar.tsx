"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Store } from "lucide-react";
import { getMyMenus, resolveMenuIcon, type MenuNode } from "@/lib/menu";

function MenuLink({ item, pathname }: { item: MenuNode; pathname: string }) {
  const Icon = resolveMenuIcon(item.icon);
  const isActive =
    !!item.route &&
    (pathname === item.route || pathname.startsWith(`${item.route}/`));

  return (
    <li>
      {item.route ? (
        <Link
          href={item.route}
          className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-label-md transition-all duration-200 ${
            isActive
              ? "bg-primary/10 text-white shadow-sm"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          {isActive && (
            <motion.span
              layoutId="sidebar-active-pill"
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-on-primary-fixed-variant shadow-sm"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          
          <span
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? "bg-white/20 text-white"
                : "text-gray-600 group-hover:text-gray-900"
            }`}
          >
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>

          <span
            className={`relative z-10 truncate transition-all duration-200 ${
              isActive 
                ? "font-semibold text-white" 
                : "font-medium text-gray-700 group-hover:text-gray-900"
            }`}
          >
            {item.name}
          </span>
        </Link>
      ) : (
        <span className="flex items-center gap-3 px-3 py-2.5 text-label-md text-gray-500">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className="truncate font-medium">{item.name}</span>
        </span>
      )}

      {item.children.length > 0 && (
        <ul className="ml-10 mt-1 flex flex-col gap-1 border-l border-gray-200 pl-3">
          {item.children.map((child) => (
            <MenuLink key={child.id} item={child} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyMenus()
      .then(setMenus)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // --- PERBAIKAN SATU BARIS DI SINI ---
  function handleLogout() {
    localStorage.removeItem("cfd_token");
    localStorage.removeItem("cfd_user");
    localStorage.removeItem("cfd_remember");
    document.cookie = "cfd_token=; path=/; max-age=0";
    
    // Ganti router.push dengan window.location.href (Hard Redirect)
    window.location.href = "/auth/login";
  }
  // --------------------------------------

  return (
    <aside className="hidden lg:flex lg:w-[260px] shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest h-screen sticky top-0">
      {/* Header Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-on-primary-fixed-variant text-on-primary shadow-md ring-1 ring-black/5">
          <Store className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="text-title-lg font-bold tracking-tight text-primary">
          CFD Hub
        </span>
      </div>

      {/* Navigasi Menu */}
      <nav className="flex-1 overflow-y-auto px-4 pb-6">
        <p className="mb-3 px-2 text-xs font-semibold tracking-widest text-on-surface-variant/60 uppercase">
          Menu Utama
        </p>

        {loading && (
          <div className="flex flex-col gap-2 px-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-xl bg-surface-container-high"
              />
            ))}
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-error-container/20 px-4 py-3 text-sm text-error border border-error/20">
            {error}
          </div>
        )}
        {!loading && !error && (
          <ul className="flex flex-col gap-1">
            {menus.map((item) => (
              <MenuLink key={item.id} item={item} pathname={pathname} />
            ))}
          </ul>
        )}
      </nav>

      {/* Footer & Logout */}
      <div className="border-t border-outline-variant/50 px-6 py-6">
        <p className="mb-4 text-xs font-medium tracking-normal text-on-surface-variant/50">
          CFD Kita &middot; Portal Internal
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-error transition-all duration-200 hover:bg-error-container/20 hover:shadow-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-error/10">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          Keluar
        </button>
      </div>
    </aside>
  );
}