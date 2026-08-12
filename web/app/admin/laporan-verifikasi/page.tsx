"use client";

import { useEffect, useState } from "react";
import {
  Store,
  CheckCircle2,
  Clock,
  Download,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

type VerificationStatus = "Menunggu" | "Disetujui" | "Ditolak";

type LogItem = {
  id: string;
  applicant: string;
  business: string;
  zoneCategory: string;
  zoneIcon: string;
  date: string;
  time: string;
  status: VerificationStatus;
  initial: string;
};

type Stats = {
  totalUmkm: number | null;
  totalUmkmGrowth: string | null;
  approvalRate: number | null;
  pendingCount: number | null;
};

const statusStyles: Record<VerificationStatus, string> = {
  Menunggu: "bg-blue-50 text-blue-700",
  Disetujui: "bg-emerald-50 text-emerald-700",
  Ditolak: "bg-red-50 text-red-700",
};

const tabs: Array<"Semua" | "Pending" | "Ditolak"> = [
  "Semua",
  "Pending",
  "Ditolak",
];

// Warna avatar dibedain per baris biar gak monoton semua abu-abu,
// dipilih berdasar urutan index (looping ulang kalau data-nya banyak)
const avatarPalette = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
];

export default function LaporanVerifikasiPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Semua");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUmkm: null,
    totalUmkmGrowth: null,
    approvalRate: null,
    pendingCount: null,
  });
  const [loading, setLoading] = useState(true);
  const [totalData, setTotalData] = useState(0);

  useEffect(() => {
    // TODO: ganti dengan endpoint API laporan verifikasi asli
    // async function fetchData() {
    //   const token = localStorage.getItem("cfd_token");
    //   const res = await fetch(
    //     `${process.env.NEXT_PUBLIC_API_URL}/api/admin/laporan-verifikasi?status=${activeTab}`,
    //     { headers: { Authorization: `Bearer ${token}` } }
    //   );
    //   const data = await res.json();
    //   setStats(data.stats);
    //   setLogs(data.logs);
    //   setTotalData(data.total);
    //   setLoading(false);
    // }
    // fetchData();

    setLoading(false); // hapus baris ini setelah fetch asli dipasang
  }, [activeTab]);

  return (
    <div>
      {/* Heading */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Laporan Verifikasi
          </h1>
          <p className="text-base text-slate-500 mt-2 max-w-xl">
            Pantau aktivitas persetujuan, tinjau aplikasi UMKM yang
            menunggu, dan analisis metrik persetujuan secara real-time.
          </p>
        </div>
        <button className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-5 py-3 transition">
          <Download className="w-4 h-4" strokeWidth={2.2} />
          Unduh Laporan
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {/* Total UMKM */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-slate-600" strokeWidth={2.2} />
            </span>
            <p className="text-sm font-semibold text-slate-600">
              Total UMKM Terdaftar
            </p>
          </div>
          <p className="text-4xl font-bold text-slate-900">
            {stats.totalUmkm ?? "-"}
          </p>
          <p className="text-sm font-medium mt-1.5 text-emerald-600">
            {stats.totalUmkmGrowth ?? ""}
          </p>
        </div>

        {/* Tingkat Persetujuan */}
        <div className="rounded-xl bg-blue-900 p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <CheckCircle2
                className="w-5 h-5 text-white"
                strokeWidth={2.2}
              />
            </span>
            <p className="text-sm font-semibold text-blue-100">
              Tingkat Persetujuan
            </p>
          </div>
          <p className="text-4xl font-bold text-white">
            {stats.approvalRate ?? "-"}
            <span className="text-xl">%</span>
          </p>
          <div className="w-full h-1.5 rounded-full bg-white/15 mt-3 overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${stats.approvalRate ?? 0}%` }}
            />
          </div>
        </div>

        {/* Menunggu Verifikasi */}
        <div className="rounded-xl bg-red-50 border border-red-200 p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-600" strokeWidth={2.2} />
            </span>
            <p className="text-sm font-semibold text-red-600">
              Menunggu Verifikasi
            </p>
          </div>
          <p className="text-4xl font-bold text-red-600">
            {stats.pendingCount ?? "-"}{" "}
            <span className="text-xl font-semibold">Aplikasi</span>
          </p>
          <p className="text-xs font-bold mt-1.5 text-red-600 tracking-wide">
            BUTUH PERHATIAN SEGERA
          </p>
        </div>
      </div>

      {/* Log section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Log Verifikasi Terbaru
          </h2>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm font-semibold px-3.5 py-1.5 rounded-md transition ${
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60 text-left">
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                PEMOHON &amp; USAHA
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                KATEGORI ZONA
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                TANGGAL PENGAJUAN
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                STATUS
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 tracking-wide">
                AKSI
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                  Memuat data...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Inbox className="w-9 h-9 text-slate-300" strokeWidth={1.6} />
                    <p className="text-base font-semibold text-slate-600">
                      Belum ada data verifikasi
                    </p>
                    <p className="text-sm text-slate-400">
                      Log verifikasi akan muncul di sini setelah ada
                      pengajuan.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          avatarPalette[idx % avatarPalette.length]
                        }`}
                      >
                        {log.initial}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-[15px]">
                          {log.business}
                        </p>
                        <p className="text-sm text-slate-400">
                          {log.applicant}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-md px-3 py-1.5">
                      <span>{log.zoneIcon}</span>
                      {log.zoneCategory}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-medium">
                    <p>{log.date}</p>
                    <p className="text-sm text-slate-400">{log.time}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${statusStyles[log.status]}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {log.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                      <ArrowRight className="w-4 h-4" />
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
              ? `Menampilkan ${logs.length} dari ${totalData} data`
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