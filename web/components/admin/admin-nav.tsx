"use client";

// Data & state bersama untuk kerangka (shell) halaman superadmin, petugas & pedagang:
// - daftar menu dari /api/menus (diambil SEKALI, dipakai sidebar & topbar),
// - buka/tutup menu samping di layar kecil,
// - logout.
import { Briefcase, Crown, Store, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getMyMenus, type MenuNode } from "@/lib/menu";
import { flattenRoutes, getBestMatchRoute } from "@/components/sidebar";

export type Peran = "superadmin" | "petugas" | "pedagang";

// Label & ikon peran yang tampil di sidebar dan topbar.
export const INFO_PERAN: Record<Peran, { label: string; judul: string; ikon: LucideIcon }> = {
  superadmin: { label: "Superadmin", judul: "Panel Superadmin", ikon: Crown },
  petugas: { label: "Petugas CFD", judul: "Panel Petugas", ikon: Briefcase },
  pedagang: { label: "Pedagang CFD", judul: "Panel Pedagang", ikon: Store },
};

export type MenuDatar = { id: string; name: string; route: string; icon: string | null; induk: string | null };

type AdminNav = {
  peran: Peran;
  menus: MenuNode[];
  menuDatar: MenuDatar[];
  loading: boolean;
  error: string;
  menuAktif: MenuDatar | null;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;
  logout: () => void;
};

const Ctx = createContext<AdminNav | null>(null);

export function useAdminNav() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminNav harus dipakai di dalam <AdminNavProvider>");
  return v;
}

// Ratakan pohon menu (anak ikut membawa nama induknya buat breadcrumb).
function ratakan(nodes: MenuNode[], induk: string | null = null): MenuDatar[] {
  return nodes.flatMap((n) => [
    ...(n.route ? [{ id: n.id, name: n.name, route: n.route, icon: n.icon, induk }] : []),
    ...ratakan(n.children ?? [], n.name),
  ]);
}

export function logoutSekarang() {
  localStorage.removeItem("cfd_token");
  localStorage.removeItem("cfd_user");
  localStorage.removeItem("cfd_remember");
  document.cookie = "cfd_token=; path=/; max-age=0";
  // Sama dengan tujuan logout di sidebar lama. Reload penuh supaya semua
  // state halaman ikut bersih.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/auth/login";
}

export function AdminNavProvider({ peran, children }: { peran: Peran; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    getMyMenus()
      .then(setMenus)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Tutup menu mobile setiap pindah halaman.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setNavOpen(false);
  }

  // Esc menutup menu samping di layar kecil.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const menuDatar = useMemo(() => ratakan(menus), [menus]);
  const menuAktif = useMemo(() => {
    const best = getBestMatchRoute(flattenRoutes(menus), pathname);
    return menuDatar.find((m) => m.route === best) ?? null;
  }, [menus, menuDatar, pathname]);

  const logout = useCallback(() => logoutSekarang(), []);

  return (
    <Ctx.Provider
      value={{ peran, menus, menuDatar, loading, error, menuAktif, navOpen, setNavOpen, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}
