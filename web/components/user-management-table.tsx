"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  SlidersHorizontal,
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

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "suspended", label: "Ditangguhkan" },
  { value: "banned", label: "Diblokir" },
];

const LIMIT = 10;

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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalData, setTotalData] = useState(0);

  // Debounce: tunggu 400ms setelah user berhenti ngetik sebelum nembak fetch,
  // biar gak fetch tiap 1 huruf diketik.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // search baru -> balik ke halaman 1
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem("cfd_token");
        const params = new URLSearchParams({
          search,
          status,
          page: String(page),
          limit: String(LIMIT),
          ...extraParams,
        });
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
  }, [search, status, page, apiEndpoint, reloadSignal, JSON.stringify(extraParams)]);

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
  const totalPages = Math.max(1, Math.ceil(totalData / LIMIT));

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
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 mb-4 shadow-sm relative">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setFilterOpen((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "Filter"}
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-10 py-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatus(opt.value);
                    setPage(1);
                    setFilterOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${
                    status === opt.value
                      ? "font-semibold text-blue-700"
                      : "text-slate-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-900 text-white font-semibold">
              {page}
            </span>
            <span className="text-slate-400 px-1">/ {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}