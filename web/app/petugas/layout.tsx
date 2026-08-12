import "./petugas.css";

// Layout ini HANYA aktif untuk halaman-halaman di dalam app/petugas/**
// (Next.js otomatis pakai layout terdekat ke route-nya). Tidak menyentuh
// app/layout.tsx (root) ataupun page.tsx yang sudah ada -- cuma
// menambahkan CSS tambahan dan bungkus data-petugas-scope biar style
// di petugas.css hanya berlaku di sini.
export default function PetugasLayout({ children }: { children: React.ReactNode }) {
  return <div data-petugas-scope>{children}</div>;
}