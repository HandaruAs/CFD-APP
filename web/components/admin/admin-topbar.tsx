"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, LogOut, Menu } from "lucide-react";
import { INFO_PERAN, useAdminNav } from "./admin-nav";

type Me = { name: string; email?: string; role: string; avatar_url?: string | null; pedagang_stage?: string };

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function inisial(name?: string) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

// Jam WIB yang berjalan (diperbarui tiap 20 detik).
function useJam() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Topbar superadmin & petugas: tombol menu (mobile), breadcrumb halaman aktif,
// jam berjalan, dan menu akun berisi tombol keluar.
export function AdminTopbar() {
  const { peran, menuAktif, setNavOpen, logout } = useAdminNav();
  const Peran = INFO_PERAN[peran];
  const [me, setMe] = useState<Me | null>(null);
  const [akunOpen, setAkunOpen] = useState(false);
  const akunRef = useRef<HTMLDivElement>(null);
  const now = useJam();
  // Pedagang: tampilkan status verifikasi data usaha (sama seperti topbar lama).
  const keteranganAkun =
    peran === "pedagang" && me?.pedagang_stage
      ? me.pedagang_stage === "verified"
        ? "Terverifikasi"
        : "Menunggu verifikasi"
      : Peran.label;

  useEffect(() => {
    const token = localStorage.getItem("cfd_token");
    if (!token) return;
    fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, []);

  // Foto profil diganti dari halaman lain -> ikut berubah di sini.
  useEffect(() => {
    const onAvatar = (e: Event) => {
      const url = (e as CustomEvent<string | null>).detail;
      setMe((m) => (m ? { ...m, avatar_url: url } : m));
    };
    window.addEventListener("cfd:avatar", onAvatar);
    return () => window.removeEventListener("cfd:avatar", onAvatar);
  }, []);

  // Tutup menu akun saat klik di luar.
  useEffect(() => {
    if (!akunOpen) return;
    const onDown = (e: MouseEvent) => {
      if (akunRef.current && !akunRef.current.contains(e.target as Node)) setAkunOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [akunOpen]);

  return (
    <header className="adm-glass sticky top-0 z-40 flex items-center gap-3 border-b border-outline-variant/70 px-4 py-3 lg:px-8">
      <button
        type="button"
        onClick={() => setNavOpen(true)}
        aria-label="Buka menu"
        className="grid h-10 w-10 place-items-center rounded-xl text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <div className="min-w-0 flex-1">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[12px] font-medium text-on-surface-variant">
          <span className="inline-flex items-center gap-1 text-primary">
            <Peran.ikon className="h-3.5 w-3.5" />
            {Peran.label}
          </span>
          {menuAktif?.induk && (
            <>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="truncate">{menuAktif.induk}</span>
            </>
          )}
        </nav>
        <AnimatePresence mode="wait">
          <motion.p
            key={menuAktif?.name ?? "-"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="adm-display truncate text-[19px] leading-tight font-semibold text-on-surface"
          >
            {menuAktif?.name ?? Peran.judul}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Jam berjalan */}
      {now && (
        <div className="hidden flex-col items-end leading-tight xl:flex" aria-label="Waktu sekarang">
          <span className="font-mono text-[15px] font-semibold tabular-nums text-on-surface">
            {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            <span className="ml-1 text-[10px] font-bold text-on-surface-variant">WIB</span>
          </span>
          <span className="text-[11px] text-on-surface-variant">
            {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
          </span>
        </div>
      )}

      {/* Akun */}
      <div className="relative" ref={akunRef}>
        <button
          type="button"
          onClick={() => setAkunOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={akunOpen}
          className="flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest py-1 pr-2 pl-1 transition hover:border-primary/40"
        >
          <Avatar me={me} />
          <span className="hidden max-w-[10rem] text-left leading-tight sm:block">
            <span className="block truncate text-[13px] font-semibold text-on-surface">{me?.name ?? "Memuat…"}</span>
            <span className="block text-[11px] text-on-surface-variant">{keteranganAkun}</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${akunOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {akunOpen && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-[0_18px_48px_-12px_rgb(11_28_48/0.3)]"
            >
              <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
                <Avatar me={me} besar />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-on-surface">{me?.name ?? "-"}</p>
                  <p className="truncate text-[12px] text-on-surface-variant">{me?.email ?? Peran.label}</p>
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-error transition hover:bg-error-container/50"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function Avatar({ me, besar = false }: { me: Me | null; besar?: boolean }) {
  const ukuran = besar ? "h-11 w-11 text-[15px]" : "h-9 w-9 text-[13px]";
  return (
    <span className={`relative grid ${ukuran} shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#2f6fed] to-primary font-bold text-white`}>
      {me?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${API}${me.avatar_url}`} alt={`Foto ${me.name}`} className="h-full w-full object-cover" />
      ) : (
        inisial(me?.name)
      )}
    </span>
  );
}
