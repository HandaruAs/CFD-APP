// app/admin/manajemen-lapak/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ClipboardList, MapPin, Route, LayoutGrid } from "lucide-react";
import type { KecamatanLengkapData } from "./types";
import { getWilayah } from "./api";
import RuasKuotaTab from "./components/RuasKuotaTab";
import LaporanTab from "./components/LaporanTab";

// Tab "Pedagang" sudah dipindah ke Manajemen User > Pedagang.
// Tab "Event" (beserta Tambah Event) dipindah ke Jam Operasional sebagai
// "Daftar Sesi" + tombol "Tambah Sesi".
const TABS = [
  { key: "wilayah", label: "Kecamatan, Jalan & Ruas", icon: MapPin },
  { key: "laporan", label: "Laporan", icon: ClipboardList },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ManajemenLapakPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("wilayah");

  const [wilayah, setWilayah] = useState<KecamatanLengkapData[]>([]);
  const [wilayahLoading, setWilayahLoading] = useState(true);
  const [wilayahError, setWilayahError] = useState<string | null>(null);

  async function loadWilayah(diam = false) {
    if (!diam) setWilayahLoading(true);
    setWilayahError(null);
    try {
      const res = await getWilayah();
      setWilayah(res.data ?? []);
    } catch (err) {
      setWilayahError(err instanceof Error ? err.message : "Gagal memuat data wilayah.");
    } finally {
      setWilayahLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWilayah();
  }, []);

  // Ringkasan dari data wilayah yang sudah dimuat (tanpa request tambahan).
  // Grup "Tanpa Kecamatan" tidak dihitung sebagai kecamatan.
  const semuaJalan = wilayah.flatMap((k) => k.jalan ?? []);
  const ringkasan = [
    { label: "Kecamatan", nilai: wilayah.filter((k) => k.kecamatanId).length, ikon: MapPin, warna: "bg-primary-fixed text-on-primary-fixed" },
    { label: "Jalan", nilai: semuaJalan.length, ikon: Route, warna: "bg-secondary-container/60 text-on-secondary-container" },
    { label: "Ruas", nilai: semuaJalan.reduce((n, j) => n + (j.ruas ?? []).length, 0), ikon: LayoutGrid, warna: "bg-tertiary-fixed text-on-tertiary-fixed" },
  ];

  return (
    <div className="flex flex-col gap-lg pb-xl">
      <div>
        <h2 className="text-headline-lg text-on-surface">Manajemen Lapak</h2>
        <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
          Kelola data wilayah: kecamatan, jalan, dan ruas. Sesi (event) beserta kuota pedagangnya dibuat dan
          diacak lokasinya di menu Jam Operasional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
        {ringkasan.map((r) => (
          <div key={r.label} className="flex items-center gap-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-md">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.warna}`}>
              <r.ikon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-label-sm text-on-surface-variant">{r.label}</p>
              <p className="text-title-lg tabular-nums text-on-surface">{wilayahLoading ? "–" : r.nilai}</p>
            </div>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Bagian manajemen lapak" className="flex flex-wrap gap-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-xs rounded-lg px-md py-sm text-label-md transition-all ${
                isActive ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="pt-card">
        {activeTab === "wilayah" && (
          <RuasKuotaTab wilayah={wilayah} loading={wilayahLoading} error={wilayahError} onRefresh={() => loadWilayah(true)} />
        )}
        {activeTab === "laporan" && <LaporanTab />}
      </div>
    </div>
  );
}