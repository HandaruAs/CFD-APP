import type { LucideIcon } from "lucide-react";
import { Home, Users, CheckCircle, LayoutGrid } from "lucide-react";

// Bentuk ini persis match sama models.MenuItem di backend Golang
// (handlers/menu_handler.go -> GET /api/menus)
export type MenuNode = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  route: string | null;
  sort_order: number;
  children: MenuNode[];
};

// Backend nyimpen icon sebagai string biasa (mis. "home", "users"),
// bukan komponen React -- jadi perlu di-map manual ke sini.
// Tambahin baris baru tiap kali nambah menu dengan icon baru di seed migration.
const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  "check-circle": CheckCircle,
};

export function resolveMenuIcon(slug: string | null): LucideIcon {
  if (!slug) return LayoutGrid;
  return ICON_MAP[slug] ?? LayoutGrid;
}

export async function getMyMenus(): Promise<MenuNode[]> {
  const token = localStorage.getItem("cfd_token");
  if (!token) {
    throw new Error("belum login");
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menus`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "gagal mengambil menu");
  }

  const data = await res.json();
  return data.menus ?? [];
}