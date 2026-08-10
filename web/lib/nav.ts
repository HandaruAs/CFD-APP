import type { LucideIcon } from "lucide-react";
import { Store, ShieldCheck, CalendarDays } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Profil Usaha", href: "/profil-usaha", icon: Store },
  { label: "Status Verifikasi", href: "/status-verifikasi", icon: ShieldCheck },
  { label: "Jadwal & Lokasi", href: "/jadwal-lokasi", icon: CalendarDays },
];
