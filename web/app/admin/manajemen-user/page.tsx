"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Store,
  Briefcase,
  Ban,
  UserPlus,
  Search,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

type Role = "PEDAGANG" | "PETUGAS LAPANGAN" | "ADMIN CABANG";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  joinedAt: string;
  active: boolean;
  initial: string;
};

type Stats = {
  totalUsers: number | null;
  totalUsersGrowth: string | null;
  activeMerchants: number | null;
  fieldOfficers: number | null;
  fieldOfficersNote: string | null;
  suspended: number | null;
};

const roleStyles: Record<Role, string> = {
  PEDAGANG: "bg-blue-600 text-white",
  "PETUGAS LAPANGAN": "bg-amber-600 text-white",
  "ADMIN CABANG": "bg-blue-100 text-blue-700",
};

// Warna avatar dibedain per baris biar gak monoton semua abu-abu,
// dipilih berdasar urutan index (looping ulang kalau data-nya banyak)
const avatarPalette = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
];

export default function ManajemenUserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: null,
    totalUsersGrowth: null,
    activeMerchants: null,
    fieldOfficers: null,
    fieldOfficersNote: null,
    suspended: null,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalData, setTotalData] = useState(0);

  useEffect(() => {
    // TODO: ganti dengan endpoint API manajemen user asli
    // async function fetchData() {
    //   const token = localStorage.getItem("cfd_token");
    //   const res = await fetch(
    //     `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?search=${search}`,
    //     { headers: { Authorization: `Bearer ${token}` } }
    //   );
    //   const data = await res.json();
    //   setStats(data.stats);
    //   setUsers(data.users);
    //   setTotalData(data.total);
    //   setLoading(false);
    // }
    // fetchData();

    setLoading(false); // hapus baris ini setelah fetch asli dipasang
  }, [search]);

  const toggleActive = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
    );
    // TODO: panggil endpoint API buat update status aktif/nonaktif user ini
  };

  return (
    <div>
      {/* Heading */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Manajemen User
          </h1>
          <p className="text-base text-slate-500 mt-2">
            Kelola akses, peran, dan status pengguna pada sistem CFD Hub
            Pusat.
          </p>
        </div>
        <button className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg px-5 py-3 shadow-sm transition">
          <UserPlus className="w-4 h-4" strokeWidth={2.2} />
          Tambah User Baru
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 relative shadow-sm">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-700" strokeWidth={2.2} />
          </div>
          <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
            Total Pengguna
          </p>
          <p className="text-4xl font-bold mt-2 text-slate-900">
            {stats.totalUsers ?? "-"}
          </p>
          <p className="text-sm font-medium mt-1.5 text-emerald-600">
            {stats.totalUsersGrowth ?? ""}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 relative shadow-sm">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Store className="w-5 h-5 text-emerald-600" strokeWidth={2.2} />
          </div>
          <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
            Pedagang Aktif
          </p>
          <p className="text-4xl font-bold mt-2 text-slate-900">
            {stats.activeMerchants ?? "-"}
          </p>
          <p className="text-sm font-medium mt-1.5 text-emerald-600">
            Total Terverifikasi
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 relative shadow-sm">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-amber-600" strokeWidth={2.2} />
          </div>
          <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
            Petugas Lapangan
          </p>
          <p className="text-4xl font-bold mt-2 text-slate-900">
            {stats.fieldOfficers ?? "-"}
          </p>
          <p className="text-sm font-medium mt-1.5 text-emerald-600">
            {stats.fieldOfficersNote ?? ""}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 relative shadow-sm">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-white flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-600" strokeWidth={2.2} />
          </div>
          <p className="text-xs font-semibold tracking-wide uppercase text-red-600">
            Ditangguhkan
          </p>
          <p className="text-4xl font-bold mt-2 text-red-600">
            {stats.suspended ?? "-"}
          </p>
          <p className="text-sm font-medium mt-1.5 text-red-600">
            ⚠ Membutuhkan Tinjauan
          </p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 mb-4 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau kontak..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        <select className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700 outline-none">
          <option>Semua Peran</option>
          <option>Pedagang</option>
          <option>Petugas Lapangan</option>
          <option>Admin Cabang</option>
        </select>

        <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50">
          <SlidersHorizontal className="w-4 h-4" />
          Filter
        </button>

        <button className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg px-4 py-3 hover:bg-blue-100">
          <Download className="w-4 h-4" />
          Ekspor
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60 text-left">
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                PENGGUNA
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                KONTAK
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                PERAN
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                TANGGAL BERGABUNG
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                STATUS
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  Memuat data...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Inbox
                      className="w-9 h-9 text-slate-300"
                      strokeWidth={1.6}
                    />
                    <p className="text-base font-semibold text-slate-600">
                      Belum ada pengguna
                    </p>
                    <p className="text-sm text-slate-400">
                      Data pengguna akan muncul di sini setelah tersedia.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((u, idx) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          avatarPalette[idx % avatarPalette.length]
                        }`}
                      >
                        {u.initial}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-[15px]">
                          {u.name}
                        </p>
                        <p className="text-sm text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-medium">
                    {u.phone}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block text-xs font-bold tracking-wide px-3 py-1.5 rounded-md ${roleStyles[u.role]}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-medium">
                    {u.joinedAt}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(u.id)}
                      className={`w-12 h-6.5 rounded-full flex items-center px-0.5 transition ${
                        u.active
                          ? "bg-emerald-500 justify-end"
                          : "bg-red-400 justify-start"
                      }`}
                      aria-pressed={u.active}
                    >
                      <span className="w-5.5 h-5.5 rounded-full bg-white shadow" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200">
          <p className="text-sm font-medium text-slate-500">
            {totalData > 0
              ? `Menampilkan ${users.length} dari ${totalData}`
              : "Tidak ada data"}
          </p>
          <div className="flex items-center gap-1.5 text-sm">
            <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-900 text-white font-semibold">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}