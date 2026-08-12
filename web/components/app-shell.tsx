"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/forgot-password", "/auth/verify"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        {/* bg-surface-container-low sengaja dibedain dari bg-surface-container-lowest
            yang dipakai kartu-kartu di dalamnya -- kalau warnanya sama kayak
            body, kartu putih di atasnya gak akan keliatan "ngambang" sama sekali. */}
        <main className="flex-1 bg-surface-container-low p-lg lg:p-xl">
          {children}
        </main>
      </div>
    </div>
  );
}