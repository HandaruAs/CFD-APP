"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, Store, ChevronDown } from "lucide-react";

/* =========================================================
   NAVBAR PUBLIK -- dipakai di landing page ("/") dan halaman
   publik lain kayak "/daftar-lapak", biar identitas & navigasi
   konsisten di seluruh area publik (sebelum login), persis
   pola WBS Surabaya: beda route, satu navbar yang sama.

   Struktur: Beranda (link langsung ke "/") | Tentang (dropdown:
   Fitur, Cara Kerja, Sisa Lapak) | Daftar Lapak (pill sendiri,
   ini aksi utama bukan sekadar info section).
========================================================= */

const Informasi_SECTIONS = [
  { href: "/#fitur", label: "Fitur" },
  { href: "/#alur", label: "Cara Kerja" },
  { href: "/#sisa-lapak", label: "Sisa Lapak" },
];

const DAFTAR_LAPAK_HREF = "/daftar-lapak";

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [informasiOpen, setInformasiOpen] = useState(false);
  const [mobileInformasiOpen, setMobileInformasiOpen] = useState(false);
  const informasiRef = useRef<HTMLDivElement>(null);
  const isDaftarLapakActive = pathname.startsWith(DAFTAR_LAPAK_HREF);
  const isBerandaActive = pathname === "/";

  // Tutup dropdown Informasi kalau klik di luar area-nya.
  useEffect(() => {
    if (!informasiOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (informasiRef.current && !informasiRef.current.contains(e.target as Node)) {
        setInformasiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [informasiOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-paper/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-8">
        <Link href="/" className="focus-ring flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
        <img src="/images/logo-cfd.png" alt="Logo" className="h-9 w-9 object-contain" />
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink-strong">
            E-Event Surabaya
          </span>
        </Link>

        <div className="hidden items-center gap-0.5 rounded-full border border-line bg-white/70 p-1 shadow-sm md:flex">
          <Link
            href="/"
            className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isBerandaActive ? "bg-blue text-white shadow-sm" : "text-ink-soft hover:text-ink-strong"
            }`}
          >
            Beranda
          </Link>

          <div ref={informasiRef} className="relative">
            <button
              type="button"
              onClick={() => setInformasiOpen((v) => !v)}
              aria-expanded={informasiOpen}
              className="focus-ring flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink-strong"
            >
              Informasi
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${informasiOpen ? "rotate-180" : ""}`} strokeWidth={2.2} />
            </button>

            {informasiOpen && (
              <div className="absolute left-0 top-[calc(100%+10px)] w-48 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-[0_20px_40px_-15px_rgba(23,29,64,0.2)]">
                {Informasi_SECTIONS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setInformasiOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-mist hover:text-ink-strong"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href={DAFTAR_LAPAK_HREF}
            className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isDaftarLapakActive ? "bg-blue text-white shadow-sm" : "text-ink-soft hover:text-ink-strong"
            }`}
          >
            Daftar Lapak
          </Link>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/auth/login" className="focus-ring text-sm font-medium text-ink-soft hover:text-ink-strong">
            Masuk
          </Link>
          <Link
            href={DAFTAR_LAPAK_HREF}
            className="focus-ring group inline-flex items-center gap-1.5 rounded-full bg-blue px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue/30"
          >
            Daftar & Dapat Nomor Stan
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="focus-ring text-ink-strong md:hidden"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Panel menu mobile */}
      {mobileOpen && (
        <div className="border-t border-line/60 bg-paper/95 px-6 py-4 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isBerandaActive ? "bg-blue/10 text-blue" : "text-ink-soft hover:bg-mist hover:text-ink-strong"
              }`}
            >
              Beranda
            </Link>

            <button
              type="button"
              onClick={() => setMobileInformasiOpen((v) => !v)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-mist hover:text-ink-strong"
            >
              Informasi
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileInformasiOpen ? "rotate-180" : ""}`} strokeWidth={2.2} />
            </button>
            {mobileInformasiOpen && (
              <div className="ml-3 flex flex-col gap-1 border-l border-line/60 pl-3">
                {Informasi_SECTIONS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      setMobileOpen(false);
                      setMobileInformasiOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-mist hover:text-ink-strong"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            <Link
              href={DAFTAR_LAPAK_HREF}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isDaftarLapakActive ? "bg-blue/10 text-blue" : "text-ink-soft hover:bg-mist hover:text-ink-strong"
              }`}
            >
              Daftar Lapak
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-line/60 pt-3">
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-ink-soft hover:bg-mist"
            >
              Masuk
            </Link>
            <Link
              href={DAFTAR_LAPAK_HREF}
              onClick={() => setMobileOpen(false)}
              className="rounded-full bg-blue px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-blue/25"
            >
              Daftar & Dapat Nomor Stan
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}