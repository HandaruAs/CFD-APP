"use client";

import { useEffect, useState } from "react";
import { Bell, ShieldCheck, Briefcase, Crown } from "lucide-react";

type Me = {
  name: string;
  role: string;
  pedagang_stage?: "unverified" | "verified";
};

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

// Badge per role -- tiap role dapet label, ikon, dan warna sendiri.
// Ditaruh di luar komponen (bukan dihitung ulang tiap render) karena
// isinya statis, cuma dipilih berdasar role/stage yang ada.
function getRoleBadge(me: Me) {
  if (me.role === "pedagang") {
    return me.pedagang_stage === "verified"
      ? {
          label: "Terverifikasi",
          icon: ShieldCheck,
          className: "bg-secondary-container text-on-secondary-container",
        }
      : {
          label: "Menunggu Verifikasi",
          icon: ShieldCheck,
          className: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
        };
  }

  if (me.role === "petugas") {
    return {
      label: "Petugas CFD",
      icon: Briefcase,
      className: "bg-secondary-container text-on-secondary-container",
    };
  }

  if (me.role === "superadmin") {
    return {
      label: "Superadmin",
      icon: Crown,
      className: "bg-primary-fixed text-on-primary-fixed-variant",
    };
  }

  return null;
}

export function Topbar() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cfd_token");
    if (!token) {
      // localStorage cuma bisa dibaca di client, jadi status login gak
      // bisa dihitung pas render (bakal beda sama hasil SSR -> hydration
      // mismatch). setLoading(false) di sini genuinely butuh useEffect,
      // bukan state yang seharusnya di-derive pas render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("gagal mengambil data user");
        return res.json();
      })
      .then((data) => setMe(data.user))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const badge = me ? getRoleBadge(me) : null;

  return (
    <header className="flex items-center justify-end border-b border-outline-variant bg-surface-container-lowest px-lg py-md lg:px-xl">
      <div className="flex items-center gap-sm mr-lg lg:mr-xl">
        {!loading && badge && (
          <span
            className={`hidden items-center gap-xs rounded-full py-1.5 pl-1.5 pr-4 text-label-sm font-semibold shadow-sm ring-1 ring-black/5 sm:flex ${badge.className}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/35">
              {/* eslint-disable-next-line react-hooks/static-components -- icon is a fixed lookup from getRoleBadge, not created per render */}
              <badge.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            {badge.label}
          </span>
        )}

        <button
          type="button"
          aria-label="Notifikasi"
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant shadow-sm ring-1 ring-black/5 transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-sm rounded-full py-1 pl-1 pr-4 shadow-sm ring-1 ring-black/5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-on-primary-fixed-variant text-[11px] font-bold text-on-primary shadow-sm">
            {me ? getInitials(me.name) : "?"}
          </span>
          <span className="hidden pl-xs text-label-md font-medium text-on-surface sm:inline">
            {loading ? "Memuat..." : me?.name ?? "Belum login"}
          </span>
        </div>
      </div>
    </header>
  );
}