import { ConfirmDialogProvider } from "../admin/manajemen-lapak/components/confirm-dialog";

// Layout ini HANYA aktif untuk halaman-halaman di dalam app/petugas/**
// (Next.js otomatis pakai layout terdekat ke route-nya). Tidak menyentuh
// app/layout.tsx (root) ataupun page.tsx yang sudah ada.
//
// CSS globals.css TIDAK di-import lagi di sini -- sudah cukup sekali di
// app/layout.tsx (root), berlaku untuk semua role termasuk petugas.
// data-petugas-scope dibiarkan sebagai penanda saja, sudah tidak dipakai
// untuk membatasi CSS (semua class di globals.css sekarang global).
//
// ConfirmDialogProvider dibungkus di sini (bukan di tiap page) supaya
// SEMUA halaman petugas -- bukan cuma manajemen-lapak -- bisa pakai
// useConfirmDialog() kalau nanti dibutuhkan di tempat lain juga.
export default function PetugasLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-admin-scope: ikut penyempurnaan tampilan yang sama dengan halaman
    // superadmin di app/globals.css (warna, tabel, form, judul halaman).
    <div data-petugas-scope data-admin-scope>
      <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
    </div>
  );
}