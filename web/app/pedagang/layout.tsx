import "./pedagang.css";

// Layout ini HANYA aktif untuk halaman-halaman di dalam app/pedagang/**
// (profil, status-verifikasi, pendaftaran, jadwal-lokasi). Tidak
// menyentuh app/layout.tsx (root), app/globals.css, ataupun page.tsx
// yang sudah ada -- cuma nambahin CSS terpisah + data-pedagang-scope
// biar style di pedagang.css cuma berlaku di grup route ini.
export default function PedagangLayout({ children }: { children: React.ReactNode }) {
 return <div data-pedagang-scope className="h-full">{children}</div>;
}