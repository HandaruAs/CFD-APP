import "./petugas.css";

import { ConfirmDialogProvider } from "./manajemen-lapak/components/confirm-dialog";

// Layout ini HANYA aktif untuk halaman-halaman di dalam app/petugas/**
// (Next.js otomatis pakai layout terdekat ke route-nya). Tidak menyentuh
// app/layout.tsx (root) ataupun page.tsx yang sudah ada -- cuma
// menambahkan CSS tambahan dan bungkus data-petugas-scope biar style
// di petugas.css hanya berlaku di sini.
//
// ConfirmDialogProvider dibungkus di sini (bukan di tiap page) supaya
// SEMUA halaman petugas -- bukan cuma manajemen-lapak -- bisa pakai
// useConfirmDialog() kalau nanti dibutuhkan di tempat lain juga.
export default function PetugasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-petugas-scope>
      <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
    </div>
  );
}