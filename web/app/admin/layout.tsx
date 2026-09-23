// app/admin/layout.tsx
import { ConfirmDialogProvider } from "./manajemen-lapak/components/confirm-dialog";

// Layout ini aktif buat SEMUA halaman di app/admin/** (Next.js otomatis
// pakai layout terdekat ke route-nya, sama kayak PetugasLayout).
//
// CSS TIDAK di-import di sini -- semua token & class .pt-* sekarang
// global lewat app/globals.css (di-import sekali di root app/layout.tsx),
// jadi admin, petugas, dan pedagang otomatis pakai style yang sama tanpa
// perlu file admin.css/petugas.css terpisah lagi. data-petugas-scope
// dibiarkan sebagai penanda saja, sudah tidak dipakai untuk membatasi CSS.
//
// ConfirmDialogProvider dibungkus di sini (bukan cuma di page manajemen-
// lapak) karena manajemen-lapak/components/*.tsx (AssignKuotaEventModal,
// dst) makai useConfirmDialog() -- sama persis alasannya kayak kenapa
// PetugasLayout dulu bungkus provider ini di levelnya, bukan di tiap page.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-petugas-scope>
      <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
    </div>
  );
}