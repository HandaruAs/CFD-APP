// data-admin-scope: ikut penyempurnaan tampilan yang sama dengan halaman
// superadmin & petugas di app/globals.css (warna, tabel, form, kartu).
export default function PedagangLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-pedagang-scope data-admin-scope className="flex flex-col h-full min-h-screen">
      {children}
    </div>
  );
}
