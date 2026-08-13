import type { LucideIcon } from "lucide-react";
import { Home, Users, CheckCircle, LayoutGrid, Store, Settings, Verified } from "lucide-react";

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

// Tambahkan icon yang ada di database backend kamu di sini
const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  "check-circle": CheckCircle,
  dashboard: LayoutGrid, // Sesuaikan dengan icon yang kamu mau
  store: Store,
  settings: Settings,
  verified: Verified,
};

export function resolveMenuIcon(slug: string | null): LucideIcon {
  if (!slug) return LayoutGrid;
  return ICON_MAP[slug] ?? LayoutGrid;
}

export async function getMyMenus(): Promise<MenuNode[]> {
  const token = localStorage.getItem("cfd_token");
  if (!token) {
    console.warn("[getMyMenus] Token tidak ditemukan!");
    throw new Error("belum login");
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL belum diset di .env.local!");
  }

  console.log(`[getMyMenus] Fetching from: ${baseUrl}/api/menus`);

  const res = await fetch(`${baseUrl}/api/menus`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error("[getMyMenus] Error Response:", data);
    throw new Error(data.error || `gagal mengambil menu (status ${res.status})`);
  }

  const data = await res.json();
  console.log("[getMyMenus] Data mentah dari backend:", data);

  // PERBAIKAN UTAMA: Cek apakah data array langsung atau object { menus: [...] }
  const menus = Array.isArray(data) ? data : (data.menus ?? []);
  console.log(`[getMyMenus] Berhasil mengambil ${menus.length} menu.`);

  return menus;
}