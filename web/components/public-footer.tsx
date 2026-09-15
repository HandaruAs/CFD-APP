import Link from "next/link";
import { Store, MapPin, Mail, Clock4 } from "lucide-react";

/* =========================================================
   FOOTER PUBLIK -- dipakai di landing page & "/daftar-lapak"
   (dan halaman publik lain nanti), biar terasa "menyatu" satu
   sistem meski beda route -- pola yang sama kayak footer WBS
   Surabaya (logo+deskripsi, kolom info, kontak).
========================================================= */

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-white pt-16 pb-8">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-10 border-b border-line pb-12 sm:flex-row">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue text-white">
                <Store className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <span className="font-display text-[15px] font-semibold text-ink-strong">CFD Kita</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Portal pedagang untuk pendaftaran, verifikasi, dan pengelolaan lapak Car Free Day
              Surabaya -- daftar, dapat nomor stan, dan berjualan tanpa antre di posko.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Untuk Pedagang</p>
              <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
                <li><Link href="/daftar-lapak" className="focus-ring hover:text-ink-strong">Daftar & Dapat Nomor Stan</Link></li>
                <li><Link href="/#fitur" className="focus-ring hover:text-ink-strong">Fitur</Link></li>
                <li><Link href="/#alur" className="focus-ring hover:text-ink-strong">Cara Kerja</Link></li>
                <li><Link href="/#sisa-lapak" className="focus-ring hover:text-ink-strong">Sisa Lapak</Link></li>
                <li><Link href="/auth/login" className="focus-ring hover:text-ink-strong">Masuk ke Akun</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Hubungi Kami</p>
              <ul className="mt-3 space-y-3 text-sm text-ink-soft">
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" strokeWidth={2.2} />
                  <span>halo@cfdkita.id</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock4 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" strokeWidth={2.2} />
                  <span>Senin–Jumat, 08.00–16.00</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" strokeWidth={2.2} />
                  <span>Posko CFD terdekat di titik Anda</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="pt-6 text-center text-xs text-ink-soft">
          © 2026 CFD Kita. Dibuat untuk pedagang Car Free Day yang ingin berjualan tanpa ribet.
        </p>
      </div>
    </footer>
  );
}