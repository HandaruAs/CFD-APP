"use client";

import { useEffect, useState } from "react";
import { Bell, ShieldCheck } from "lucide-react";

type Me = {
  name: string;
  role: string;
  pedagang_stage?: "unverified" | "verified";
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export function Topbar({ title = "Portal Pedagang" }: { title?: string }) {
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
      .then((data) => setMe(data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-lg py-md lg:px-xl">
      <h1 className="text-title-lg text-on-surface">{title}</h1>

      <div className="flex items-center gap-sm">
        {!loading && me?.role === "pedagang" && (
          <span
            className={`hidden items-center gap-xs rounded-full px-sm py-1.5 text-label-sm sm:flex ${
              me.pedagang_stage === "verified"
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
            {me.pedagang_stage === "verified"
              ? "Terverifikasi"
              : "Menunggu Verifikasi"}
          </span>
        )}

        <button
          type="button"
          aria-label="Notifikasi"
          className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <Bell className="h-5 w-5" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-sm rounded-full border border-outline-variant py-1 pl-1 pr-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-semibold text-on-primary-fixed">
            {me ? getInitials(me.name) : "?"}
          </span>
          <span className="hidden text-label-md text-on-surface sm:inline">
            {loading ? "Memuat..." : me?.name ?? "Belum login"}
          </span>
        </div>
      </div>
    </header>
  );
}