"use client";

import { AdminNavProvider, type Peran } from "./admin-nav";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

// Kerangka halaman superadmin (/admin/**) dan petugas (/petugas/**).
// Susunannya sama dengan AppShell biasa -- sidebar di kiri, topbar di atas,
// konten di tengah -- hanya tampilannya yang baru. Menu tetap diambil dari
// /api/menus sesuai peran yang login. Halaman pedagang tetap memakai
// Sidebar/Topbar lama.
export function AdminShell({ peran = "superadmin", children }: { peran?: Peran; children: React.ReactNode }) {
  return (
    <AdminNavProvider peran={peran}>
      <div className="adm-root flex min-h-screen">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="adm-main min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminNavProvider>
  );
}
