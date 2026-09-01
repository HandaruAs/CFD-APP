"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Store, ChevronDown } from "lucide-react";
import { getMyMenus, resolveMenuIcon, type MenuNode } from "@/lib/menu";

// Beberapa halaman itu secara fungsi satu alur/menu yang sama, tapi
// route/foldernya kepisah di Next.js (contoh: check-in di
// /pedagang/nomer-stand, check-out di /pedagang/CekOut). Data menu dari
// backend cuma nyimpen SATU route per item, jadi kita alias-in di sini
// biar highlight menu tetap nyala di kedua halaman itu, tanpa perlu ubah
// skema tabel menus di backend.
const ROUTE_ALIASES: Record<string, string[]> = {
  "/pedagang/nomer-stand": ["/pedagang/CekOut"],
};

function matchesRoute(route: string, pathname: string): boolean {
  if (pathname === route || pathname.startsWith(`${route}/`)) return true;
  const aliases = ROUTE_ALIASES[route];
  if (!aliases) return false;
  return aliases.some(
    (alias) => pathname === alias || pathname.startsWith(`${alias}/`)
  );
}

// Parents that should be open by default because the current URL is
// inside one of their children — purely derived from menus + pathname,
// no state/effect needed for this part.
function getAutoOpenIds(nodes: MenuNode[], pathname: string): Set<string> {
  const result = new Set<string>();
  const markIfActive = (list: MenuNode[]): boolean => {
    let anyActive = false;
    for (const node of list) {
      const childActive =
        node.children.length > 0 ? markIfActive(node.children) : false;
      const selfActive = !!node.route && matchesRoute(node.route, pathname);
      if (childActive || selfActive) {
        if (node.children.length > 0) result.add(node.id);
        anyActive = true;
      }
    }
    return anyActive;
  };
  markIfActive(nodes);
  return result;
}

// ✅ FIX: kumpulkan semua route dari seluruh menu (termasuk children),
// dipakai untuk mencari route paling spesifik yang cocok dengan pathname.
function flattenRoutes(nodes: MenuNode[]): string[] {
  const routes: string[] = [];
  const walk = (list: MenuNode[]) => {
    for (const node of list) {
      if (node.route) routes.push(node.route);
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return routes;
}

// ✅ FIX: sebelumnya setiap menu yang route-nya adalah prefix dari pathname
// ikut dianggap "active" (contoh: Dashboard = "/pedagang" akan selalu aktif
// juga di "/pedagang/profil" karena startsWith cocok). Sekarang kita cari
// route yang PALING SPESIFIK (paling panjang) yang match, dan hanya itu
// yang boleh dianggap active. Match sekarang juga lewat ROUTE_ALIASES di
// atas (buat kasus check-in/check-out yang kepisah folder).
function getBestMatchRoute(allRoutes: string[], pathname: string): string | null {
  const matches = allRoutes.filter((r) => matchesRoute(r, pathname));
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (b.length > a.length ? b : a));
}

function MenuLink({
  item,
  pathname,
  bestMatchRoute,
  isOpen,
  onToggle,
}: {
  item: MenuNode;
  pathname: string;
  bestMatchRoute: string | null;
  isOpen: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  const Icon = resolveMenuIcon(item.icon);

  // ✅ FIX: active hanya kalau route item ini adalah yang paling spesifik
  // yang cocok, bukan sekadar prefix match.
  const isActive = !!item.route && item.route === bestMatchRoute;

  const hasChildren = item.children.length > 0;
  const open = isOpen(item.id);

  const rowClasses = `group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-label-md transition-all duration-200 ${
    isActive
      ? "bg-primary/10 text-white shadow-sm"
      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
  }`;

  const rowInner = (
    <>
      {isActive && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-on-primary-fixed-variant shadow-sm"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}

      <span
        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isActive
            ? "bg-white/20 text-white"
            : "text-gray-600 group-hover:text-gray-900"
        }`}
      >
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>

      <span
        className={`relative z-10 flex-1 text-left whitespace-normal break-words transition-all duration-200 ${
          isActive
            ? "font-semibold text-white"
            : "font-medium text-gray-700 group-hover:text-gray-900"
        }`}
      >
        {item.name}
      </span>

      {hasChildren && (
        <ChevronDown
          className={`relative z-10 h-4 w-4 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          } ${isActive ? "text-white" : "text-gray-500"}`}
          strokeWidth={2}
        />
      )}
    </>
  );

  return (
    <li>
      {item.route && !hasChildren ? (
        <Link href={item.route} className={rowClasses}>
          {rowInner}
        </Link>
      ) : hasChildren ? (
        <button type="button" onClick={() => onToggle(item.id)} className={rowClasses}>
          {rowInner}
        </button>
      ) : (
        <span className="flex items-center gap-3 px-3.5 py-3 text-label-md text-gray-500">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className="whitespace-normal break-words font-medium">{item.name}</span>
        </span>
      )}

      <AnimatePresence initial={false}>
        {hasChildren && open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="ml-11 mt-1.5 flex flex-col gap-1.5 overflow-hidden border-l border-gray-200 pl-4"
          >
            {item.children.map((child) => (
              <MenuLink
                key={child.id}
                item={child}
                pathname={pathname}
                bestMatchRoute={bestMatchRoute}
                isOpen={isOpen}
                onToggle={onToggle}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Manual clicks override the auto-computed state, per menu id.
  const [manualOverrides, setManualOverrides] = useState<Map<string, boolean>>(
    new Map()
  );

  useEffect(() => {
    getMyMenus()
      .then(setMenus)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const autoOpenIds = useMemo(
    () => getAutoOpenIds(menus, pathname),
    [menus, pathname]
  );

  // ✅ FIX: hitung sekali route paling spesifik yang cocok dengan pathname
  // saat ini, dipakai semua MenuLink untuk menentukan siapa yang benar-benar aktif.
  const bestMatchRoute = useMemo(
    () => getBestMatchRoute(flattenRoutes(menus), pathname),
    [menus, pathname]
  );

  function isOpen(id: string): boolean {
    return manualOverrides.has(id) ? manualOverrides.get(id)! : autoOpenIds.has(id);
  }

  function handleToggle(id: string) {
    setManualOverrides((prev) => {
      const next = new Map(prev);
      next.set(id, !isOpen(id));
      return next;
    });
  }

  function handleLogout() {
    localStorage.removeItem("cfd_token");
    localStorage.removeItem("cfd_user");
    localStorage.removeItem("cfd_remember");
    document.cookie = "cfd_token=; path=/; max-age=0";
    window.location.href = "/auth/login";
  }

  return (
    <aside className="hidden lg:flex lg:w-[280px] shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest h-screen sticky top-0">
      {/* Header Logo */}
      <div className="flex items-center gap-3 px-6 py-7">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-on-primary-fixed-variant text-on-primary shadow-md ring-1 ring-black/5">
          <Store className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="text-title-lg font-bold tracking-tight text-primary">
          CFD Hub
        </span>
      </div>

      {/* Navigasi Menu */}
      <nav className="flex-1 overflow-y-auto px-5 pb-6">
        <p className="mb-4 px-2 text-xs font-semibold tracking-widest text-on-surface-variant/60 uppercase">
          Menu Utama
        </p>

        {loading && (
          <div className="flex flex-col gap-2.5 px-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-container-high" />
            ))}
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-error-container/20 px-4 py-3 text-sm text-error border border-error/20">
            {error}
          </div>
        )}
        {!loading && !error && (
          <ul className="flex flex-col gap-2">
            {menus.map((item) => (
              <MenuLink
                key={item.id}
                item={item}
                pathname={pathname}
                bestMatchRoute={bestMatchRoute}
                isOpen={isOpen}
                onToggle={handleToggle}
              />
            ))}
          </ul>
        )}
      </nav>

      {/* Footer & Logout */}
      <div className="border-t border-outline-variant/50 px-6 py-6">
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-error transition-all duration-200 hover:bg-error-container/20 hover:shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-error/10">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          Keluar
        </button>
      </div>
    </aside>
  );
}