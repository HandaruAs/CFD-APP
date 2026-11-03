"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { AdminShell } from "@/components/admin/admin-shell";

const PUBLIC_PATHS = [
  "/",
  "/daftar-lapak",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/verify",
  "/auth/reset-password",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isPublic) {
    return <>{children}</>;
  }

  // Superadmin, petugas & pedagang memakai kerangka baru (sidebar, topbar & menu mobile).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <AdminShell peran="superadmin">{children}</AdminShell>;
  }
  if (pathname === "/petugas" || pathname.startsWith("/petugas/")) {
    return <AdminShell peran="petugas">{children}</AdminShell>;
  }
  if (pathname === "/pedagang" || pathname.startsWith("/pedagang/")) {
    return <AdminShell peran="pedagang">{children}</AdminShell>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* min-w-0 WAJIB di sini: tanpa ini, flex item defaultnya
          min-width:auto, jadi browser gak akan pernah nyusutin
          lebar div ini di bawah "lebar minimum otomatis" dari teks
          di dalamnya (= lebar kata terpanjang). Itu yang bikin
          paragraf collapse jadi satu kata per baris walau ruang
          kosong di kanan masih banyak. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        {/* bg-surface-container-low sengaja dibedain dari bg-surface-container-lowest
            yang dipakai kartu-kartu di dalamnya -- kalau warnanya sama kayak
            body, kartu putih di atasnya gak akan keliatan "ngambang" sama sekali. */}
        <main className="min-w-0 flex-1 bg-surface-container-low p-md lg:p-lg">
          {children}
        </main>
      </div>
    </div>
  );
}