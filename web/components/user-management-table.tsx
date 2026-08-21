"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  active: boolean;
  initial: string;
  nik?: string;
  namaUsaha?: string;
  jenisDagangan?: string;
  alamat?: string;
};

export type StatCard = {
  label: string;
  value: number | null;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  sublabel?: string;
  danger?: boolean;
};

const avatarPalette = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
];

export function UserManagementTable({
  title,
  subtitle,
  addButtonLabel,
  searchPlaceholder,
  statCards,
  apiEndpoint,
  extraParams,
  reloadSignal = 0,
  onAddClick,
  onEditUser,
  onDeleteUser,
  onToggleActive,
}: {
  title: string;
  subtitle: string;
  addButtonLabel: string;
  searchPlaceholder: string;
  statCards: StatCard[];
  apiEndpoint: string;
  extraParams?: Record<string, string>;
  reloadSignal?: number;
  onAddClick?: () => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
  onToggleActive?: (user: User) => Promise<void>;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalData, setTotalData] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem("cfd_token");
        const params = new URLSearchParams({ search, ...extraParams });
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}${apiEndpoint}?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("gagal mengambil data pengguna");
        const data = await res.json();
        if (!cancelled) {
          setUsers(data.users ?? []);
          setTotalData(data.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setTotalData(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, apiEndpoint, reloadSignal, JSON.stringify(extraParams)]);

  const toggleActive = async (u: User) => {
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x))
    );

    if (!onToggleActive) return;

    try {
      await onToggleActive(u);
    } catch {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, active: u.active } : x))
      );
    }
  };

  const hasRowActions = Boolean(onEditUser || onDeleteUser);
  const columnCount = hasRowActions ? 4 : 3;

  return (
    <div>
      {/* Heading */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          <p className="text-base text-slate-500 mt-2">{subtitle}</p>
        </div>
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg px-5 py-3 shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" strokeWidth={2.2} />
          {addButtonLabel}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 relative shadow-sm ${
              card.danger
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`absolute top-4 right-4 w-10 h-10 rounded-lg flex items-center justify-center ${
                card.danger ? "bg-white" : card.iconBg
              }`}
            >
              <card.icon
                className={`w-5 h-5 ${card.iconColor}`}
                strokeWidth={2.2}
              />
            </div>
            <p
              className={`text-xs font-semibold tracking-wide uppercase ${
                card.danger ? "text-red-600" : "text-slate-500"
              }`}
            >
              {card.label}
            </p>
            <p
              className={`text-4xl font-bold mt-2 ${
                card.danger ? "text-red-600" : "text-slate-900"
              }`}
            >
              {card.value ?? "-"}
            </p>
            {card.sublabel && (
              <p
                className={`text-sm font-medium mt-1.5 ${
                  card.danger ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {card.sublabel}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 mb-4 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        <button className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50">
          <SlidersHorizontal className="w-4 h-4" />
          Filter
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
                TANGGAL BERGABUNG
              </th>
              {hasRowActions && (
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide text-right">
                  AKSI
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  Memuat data...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-5 py-16">
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
                  <td className="px-5 py-4 text-slate-600 font-medium">
                    {u.joinedAt}
                  </td>
                  {hasRowActions && (
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEditUser && (
                          <button
                            type="button"
                            onClick={() => onEditUser(u)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-700"
                            aria-label={`Edit ${u.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {onDeleteUser && (
                          <button
                            type="button"
                            onClick={() => onDeleteUser(u)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Hapus ${u.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
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