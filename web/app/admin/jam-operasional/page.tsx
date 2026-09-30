// app/admin/jam-operasional/page.tsx
"use client";

// Jam Operasional -- tempat membuat & mengelola sesi (event) CFD.
//   - Tambah Sesi : nama, tanggal, jam mulai/selesai, jadwal pendaftaran
//                   (opsional), lalu cakupan acak lokasi (Se-Surabaya /
//                   Kecamatan / Jalan / Ruas, boleh lebih dari satu).
//                   Lokasi diacak SERVER per sesi, lalu sesi langsung
//                   diterbitkan. Boleh lebih dari satu sesi di tanggal yang sama.
//   - Sesi Terjadwal : sesi yang belum selesai (tambah titik, peserta, hapus/batalkan).
//   - Riwayat Sesi : sesi yang sudah selesai, diakhiri, atau dibatalkan.
// Status sesi dihitung backend (scheduler tiap menit); halaman ini memuat
// ulang daftarnya tiap menit supaya perpindahan status ikut terlihat.
//
// "Kode Event" (prefix nomor lapak "CFD-001234") sudah tidak dipakai: nomor
// stan sekarang angka per ruas (1, 2, 3, ...) yang diacak saat pedagang ikut sesi.
//
// Endpoint: /api/admin/events -- lihat API_MULTI_EVENT.md.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Check } from "lucide-react";
import type { KecamatanLengkapData } from "../manajemen-lapak/types";
import { getWilayah } from "../manajemen-lapak/api";
import TambahSesiModal from "./components/TambahSesiModal";
import DaftarSesi from "./components/DaftarSesi";
import RiwayatSesi from "./components/RiwayatSesi";
import PesertaModal from "./components/PesertaModal";
import { apiEvent, sesiAktif, type SesiEvent } from "./components/sesi-utils";

function mulai(s: SesiEvent) {
  return `${s.tanggal.slice(0, 10)}T${s.jamMulai}`;
}

export default function JamOperasionalPage() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const [sesiList, setSesiList] = useState<SesiEvent[]>([]);
  const [sesiLoading, setSesiLoading] = useState(true);
  const [sesiError, setSesiError] = useState<string | null>(null);
  const [wilayah, setWilayah] = useState<KecamatanLengkapData[]>([]);

  const [showTambahSesi, setShowTambahSesi] = useState(false);
  const [tambahTitik, setTambahTitik] = useState<SesiEvent | null>(null);
  const [pesertaSesi, setPesertaSesi] = useState<SesiEvent | null>(null);

  const loadSesi = useCallback(async () => {
    setSesiError(null);
    try {
      const res = await apiEvent<{ data: SesiEvent[] }>("/api/admin/events");
      setSesiList(res.data ?? []);
    } catch (err) {
      setSesiError(err instanceof Error ? err.message : "Gagal memuat daftar sesi.");
    } finally {
      setSesiLoading(false);
    }
  }, []);

  // Data wilayah (kecamatan -> jalan -> ruas) untuk pilihan cakupan acak.
  const loadWilayah = useCallback(async () => {
    try {
      const wil = await getWilayah();
      setWilayah(wil.data ?? []);
    } catch {
      // pilihan cakupan kosong; Se-Surabaya tetap bisa dipakai
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSesi();
    loadWilayah();
    const interval = setInterval(loadSesi, 60_000);
    return () => clearInterval(interval);
  }, [loadSesi, loadWilayah]);

  const { terjadwal, riwayat } = useMemo(() => {
    const terjadwal = sesiList.filter(sesiAktif).sort((a, b) => mulai(a).localeCompare(mulai(b)));
    const riwayat = sesiList.filter((s) => !sesiAktif(s)).sort((a, b) => mulai(b).localeCompare(mulai(a)));
    return { terjadwal, riwayat };
  }, [sesiList]);

  const selesaiSimpan = async (pesan: string) => {
    setShowTambahSesi(false);
    setTambahTitik(null);
    await loadSesi();
    showToast(pesan, "success");
  };

  return (
    <div className="flex flex-col gap-lg pb-xl">
      {toast && (
        <div className={`pt-toast ${toast.type === "success" ? "pt-toast-success" : "pt-toast-error"}`}>
          {toast.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          )}
          <p className="text-body-md font-medium">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Jam Operasional</h2>
          <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
            Buat sesi dan acak lokasinya langsung dari form Tambah Sesi. Satu hari boleh punya beberapa sesi.
          </p>
        </div>
        <button type="button" onClick={() => setShowTambahSesi(true)} className="pt-btn pt-btn-primary">
          <CalendarPlus className="h-4 w-4" strokeWidth={2} />
          Tambah Sesi
        </button>
      </div>

      <DaftarSesi
        sesiList={terjadwal}
        loading={sesiLoading}
        error={sesiError}
        onTambah={() => setShowTambahSesi(true)}
        onTambahTitik={(s) => setTambahTitik(s)}
        onPeserta={(s) => setPesertaSesi(s)}
        onBerubah={async (pesan) => {
          await loadSesi();
          showToast(pesan, "success");
        }}
      />

      <RiwayatSesi sesiList={riwayat} loading={sesiLoading} />

      {showTambahSesi && <TambahSesiModal wilayah={wilayah} onClose={() => setShowTambahSesi(false)} onSaved={selesaiSimpan} />}

      {tambahTitik && (
        <TambahSesiModal wilayah={wilayah} sesi={tambahTitik} onClose={() => setTambahTitik(null)} onSaved={selesaiSimpan} />
      )}

      {pesertaSesi && <PesertaModal sesi={pesertaSesi} onClose={() => setPesertaSesi(null)} />}
    </div>
  );
}
