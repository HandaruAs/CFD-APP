"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Briefcase, Crown, Sun, Sunset, Moon } from "lucide-react";

type Me = {
  name: string;
  role: string;
  avatar_url?: string | null;
  pedagang_stage?: "unverified" | "verified";
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

// Lencana peran: label, ikon, dan warna pill.
function getRoleBadge(me: Me) {
  if (me.role === "pedagang") {
    return me.pedagang_stage === "verified"
      ? { label: "Terverifikasi", icon: ShieldCheck, style: "bg-secondary-container/40 text-on-secondary-container" }
      : { label: "Menunggu Verifikasi", icon: ShieldCheck, style: "bg-tertiary-fixed text-on-tertiary-fixed" };
  }
  if (me.role === "petugas") {
    return { label: "Petugas CFD", icon: Briefcase, style: "bg-primary-fixed text-on-primary-fixed" };
  }
  if (me.role === "superadmin") {
    return { label: "Superadmin", icon: Crown, style: "bg-primary-fixed text-on-primary-fixed" };
  }
  return null;
}

// Sapaan + ikon otomatis sesuai jam.
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return { text: "Selamat pagi", icon: Sun };
  if (hour < 15) return { text: "Selamat siang", icon: Sun };
  if (hour < 19) return { text: "Selamat sore", icon: Sunset };
  return { text: "Selamat malam", icon: Moon };
}

export function Topbar() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cfd_token");
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    fetch(`${API}/api/me`, {
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

  // Halaman profil mengirim sinyal ini setelah foto berhasil diganti,
  // supaya foto di topbar ikut berubah tanpa perlu refresh.
  useEffect(() => {
    const onAvatar = (e: Event) => {
      const url = (e as CustomEvent<string | null>).detail;
      setMe((m) => (m ? { ...m, avatar_url: url } : m));
    };
    window.addEventListener("cfd:avatar", onAvatar);
    return () => window.removeEventListener("cfd:avatar", onAvatar);
  }, []);

  const badge = me ? getRoleBadge(me) : null;
  const BadgeIcon = badge?.icon;
  const firstName = me?.name?.trim().split(/\s+/)[0];
  const greeting = getGreeting();
  const GreetIcon = greeting.icon;

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-gradient-to-r from-primary-fixed/40 via-surface-container-lowest to-surface-container-lowest px-lg py-md backdrop-blur-sm lg:px-xl">
      {/* Garis aksen gradasi tipis di dasar topbar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary via-primary-container/60 to-transparent"
      />

      {/* Sapaan + tanggal, cuma muncul kalau sudah login & selesai loading */}
      <div>
        {!loading && me && (
          <div className="hidden items-center gap-sm sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
              <GreetIcon className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <div>
              <p className="text-label-md leading-tight text-on-surface">
                {greeting.text},{" "}
                <span className="font-semibold text-on-surface">{firstName}</span> 👋
              </p>
              <p className="text-[11px] leading-tight text-on-surface-variant">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-sm">
        {/* Avatar: foto profil kalau ada, kalau belum ada tampil inisial.
            Titik hijau ditaruh di luar wadah foto supaya tidak ikut terpotong. */}
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-on-primary-fixed-variant text-[14px] font-bold text-on-primary shadow-sm">
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl">
            {me?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${API}${me.avatar_url}`}
                alt={`Foto ${me.name}`}
                className="h-full w-full object-cover"
              />
            ) : me ? (
              getInitials(me.name)
            ) : (
              "?"
            )}
          </span>
          {!loading && me && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </span>

        <span className="hidden flex-col items-start sm:flex">
          <span className="text-label-md font-semibold leading-tight text-on-surface">
            {loading ? "Memuat..." : me?.name ?? "Belum login"}
          </span>
          {!loading && me && badge && BadgeIcon && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium leading-tight text-primary">
              <BadgeIcon className="h-3 w-3" strokeWidth={2.25} />
              {badge.label}
            </span>
          )}
        </span>
      </div>
    </header>
  );
}