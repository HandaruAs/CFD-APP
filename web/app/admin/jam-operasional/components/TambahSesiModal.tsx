"use client";

// Tambah Sesi -- dibuat SESEDERHANA mungkin untuk admin:
//   1. isi nama, tanggal, jam, kuota pedagang (dan jatah pedagang lama);
//   2. pilih dari mana lokasinya diundi (Se-Surabaya / kecamatan / jalan / ruas);
//   3. "Simpan & Acak Lokasi": server mengundi SATU ruas, lalu sesi langsung
//      terbit dan terlihat pedagang.
//
// Urutan request:
//   POST  /api/admin/events                  -> sesi dibuat (draft)
//   POST  /api/admin/events/:id/acak-lokasi  -> satu ruas diundi di server
//   PATCH /api/admin/events/:id/status       -> diterbitkan
// Kalau undian/penerbitan gagal, sesi yang sudah terbuat tidak dibuat ulang:
// tombol "Coba Lagi" melanjutkan dari sesi yang sama.
//
// Mode "Acak Lokasi" (prop `sesi` diisi): untuk sesi draft yang lokasinya
// belum sempat diundi -- data sesi disembunyikan, tinggal pilih cakupan.
//
// Kuota diatur di sini saja: lokasi hasil undian dianggap muat sebanyak
// kuota sesi (kuota ruas di Manajemen Lapak tidak dipakai). Nomor stan
// diacak 1..kuota saat pedagang ikut sesi.

import { useMemo, useState } from "react";
import { CheckCircle2, Info, Landmark, Loader2, MapPin, Milestone, Route, Search, Shuffle, X } from "lucide-react";
import type { KecamatanLengkapData } from "../../manajemen-lapak/types";
import TimeStepper from "./TimeStepper";
import { apiEvent, todayISO, type Cakupan, type HasilAcakLokasi, type SesiEvent } from "./sesi-utils";

interface Props {
  wilayah: KecamatanLengkapData[];
  /** Diisi = mode acak lokasi untuk sesi draft yang sudah ada. */
  sesi?: SesiEvent;
  onClose: () => void;
  /** Dipanggil setelah selesai (atau ada perubahan tersimpan); `pesan` untuk notifikasi. */
  onSaved: (pesan: string) => void;
}

const PILIHAN_CAKUPAN: { key: Cakupan; label: string; deskripsi: string; icon: React.ElementType }[] = [
  { key: "kota", label: "Se-Surabaya", deskripsi: "Diundi dari semua ruas", icon: Landmark },
  { key: "kecamatan", label: "Kecamatan", deskripsi: "Diundi dari kecamatan pilihan", icon: MapPin },
  { key: "jalan", label: "Jalan", deskripsi: "Diundi dari jalan pilihan", icon: Milestone },
  { key: "ruas", label: "Ruas", deskripsi: "Diundi dari ruas pilihan", icon: Route },
];

const LABEL_CAKUPAN: Record<Cakupan, string> = { kota: "Se-Surabaya", kecamatan: "kecamatan", jalan: "jalan", ruas: "ruas" };

export default function TambahSesiModal({ wilayah, sesi, onClose, onSaved }: Props) {
  const modeAcakSaja = !!sesi;
  const hariIni = todayISO();

  // --- data sesi ---
  const [namaSesi, setNamaSesi] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [jamMulai, setJamMulai] = useState("06:00");
  const [jamSelesai, setJamSelesai] = useState("11:00");
  const [kuotaTotal, setKuotaTotal] = useState("");
  const [kuotaLama, setKuotaLama] = useState("0");

  // --- cakupan undian ---
  const [cakupan, setCakupan] = useState<Cakupan>("kota");
  const [pilihan, setPilihan] = useState<Record<Cakupan, string[]>>({ kota: [], kecamatan: [], jalan: [], ruas: [] });
  const [cari, setCari] = useState("");

  // --- proses ---
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // id sesi yang sudah terbuat di percobaan sebelumnya (supaya "Coba Lagi" tidak dobel)
  const [sesiIdTerbuat, setSesiIdTerbuat] = useState<string | null>(sesi?.id ?? null);
  // lokasi yang sudah terundi tapi sesi belum berhasil diterbitkan
  const [acakTersimpan, setAcakTersimpan] = useState<HasilAcakLokasi | null>(null);
  const [hasil, setHasil] = useState<HasilAcakLokasi | null>(null);

  const kecamatanList = useMemo(() => wilayah.filter((k) => k.kecamatanId), [wilayah]);
  const kuotaTotalAngka = parseInt(kuotaTotal, 10) || 0;
  const kuotaLamaAngka = parseInt(kuotaLama, 10) || 0;
  const q = cari.trim().toLowerCase();
  const cocok = (...teks: string[]) => !q || teks.some((t) => t.toLowerCase().includes(q));
  const terpilih = new Set(pilihan[cakupan]);

  function toggle(id: string) {
    setPilihan((p) => {
      const s = new Set(p[cakupan]);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return { ...p, [cakupan]: Array.from(s) };
    });
  }
  function setGrup(ids: string[], pilih: boolean) {
    setPilihan((p) => {
      const s = new Set(p[cakupan]);
      ids.forEach((id) => (pilih ? s.add(id) : s.delete(id)));
      return { ...p, [cakupan]: Array.from(s) };
    });
  }

  function validasi(): string | null {
    if (!modeAcakSaja && !sesiIdTerbuat) {
      if (!namaSesi.trim()) return "Isi nama sesi dulu.";
      if (!tanggal) return "Pilih tanggal sesi.";
      if (jamSelesai <= jamMulai) return "Jam selesai harus lebih besar dari jam mulai.";
      // Pedagang boleh ikut sampai sesi selesai, jadi yang dicek jam selesai.
      if (new Date(`${tanggal}T${jamSelesai}:00`).getTime() <= Date.now()) {
        return "Jam selesai sesi ini sudah lewat. Pilih tanggal atau jam yang akan datang.";
      }
      const total = parseInt(kuotaTotal, 10);
      const lama = parseInt(kuotaLama, 10);
      if (isNaN(total) || total < 1) return "Isi jumlah pedagang, minimal 1.";
      if (isNaN(lama) || lama < 0 || lama > total) return "Jatah pedagang lama harus antara 0 dan jumlah pedagang.";
    }
    if (acakTersimpan) return null; // lokasi sudah terundi, tinggal menerbitkan
    if (cakupan !== "kota" && pilihan[cakupan].length === 0) return `Pilih minimal satu ${LABEL_CAKUPAN[cakupan]}.`;
    return null;
  }

  async function handleSimpan(e: React.FormEvent) {
    e.preventDefault();
    const pesan = validasi();
    setError(pesan);
    if (pesan) return;

    setMenyimpan(true);
    let id = sesiIdTerbuat;
    try {
      // 1. Buat sesi (sekali saja, walau langkah berikutnya gagal lalu dicoba lagi)
      if (!id) {
        const res = await apiEvent<{ data: SesiEvent }>("/api/admin/events", {
          method: "POST",
          body: JSON.stringify({
            nama: namaSesi.trim(),
            tanggal,
            jamMulai,
            jamSelesai,
            kuotaTotal: parseInt(kuotaTotal, 10),
            kuotaLama: parseInt(kuotaLama, 10),
          }),
        });
        id = res.data.id;
        setSesiIdTerbuat(id);
      }

      // 2. Undi satu lokasi di server (dilewati kalau sudah berhasil sebelumnya)
      let acakData = acakTersimpan;
      if (!acakData) {
        const body: Record<string, unknown> = { scope: cakupan };
        if (cakupan === "kecamatan") body.kecamatanIds = pilihan.kecamatan;
        if (cakupan === "jalan") body.jalanIds = pilihan.jalan;
        if (cakupan === "ruas") body.ruasIds = pilihan.ruas;
        const acak = await apiEvent<{ data: HasilAcakLokasi }>(`/api/admin/events/${id}/acak-lokasi`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        acakData = acak.data;
        setAcakTersimpan(acakData);
      }

      // 3. Terbitkan
      if (!modeAcakSaja || sesi?.status === "draft") {
        await apiEvent(`/api/admin/events/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ aksi: "terbitkan" }),
        });
      }
      setHasil(acakData);
    } catch (err) {
      const pesanErr = err instanceof Error ? err.message : "Gagal menyimpan sesi.";
      setError(id && !acakTersimpan ? `${pesanErr} Pilih tempat lain lalu tekan "Coba Lagi".` : pesanErr);
    } finally {
      setMenyimpan(false);
    }
  }

  function tutup() {
    // Sesi sempat terbuat walau undiannya gagal -> daftar perlu dimuat ulang.
    if (sesiIdTerbuat && !modeAcakSaja && !hasil) onSaved("Sesi tersimpan sebagai draft, lokasinya belum diacak.");
    else onClose();
  }

  const baris = (id: string, label: string, sub?: string) => (
    <label key={id} className="flex cursor-pointer items-center gap-sm rounded-lg px-sm py-2 hover:bg-surface-container-low">
      <input type="checkbox" checked={terpilih.has(id)} onChange={() => toggle(id)} className="h-5 w-5 accent-primary" />
      <span className="text-body-md text-on-surface">{label}</span>
      {sub && <span className="ml-auto text-label-sm text-on-surface-variant">{sub}</span>}
    </label>
  );
  const kepalaGrup = (judul: string, ids: string[]) => {
    const semua = ids.length > 0 && ids.every((id) => terpilih.has(id));
    return (
      <div className="mt-sm flex items-center justify-between px-sm">
        <p className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">{judul}</p>
        {ids.length > 0 && (
          <button type="button" onClick={() => setGrup(ids, !semua)} className="text-label-sm font-medium text-primary">
            {semua ? "Batal pilih" : "Pilih semua"}
          </button>
        )}
      </div>
    );
  };

  // ===== Tampilan hasil =====
  if (hasil) {
    const lokasi = hasil.ditambahkan[0];
    return (
      <div className="pt-modal-overlay">
        <div className="pt-modal-box max-w-lg">
          <div className="flex flex-col items-center gap-sm px-lg pb-md pt-lg text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container/60">
              <CheckCircle2 className="h-8 w-8 text-secondary" strokeWidth={2} />
            </span>
            <h2 className="text-title-lg text-on-surface">{modeAcakSaja ? "Lokasi Sudah Diacak" : "Sesi Sudah Dibuat"}</h2>
            <p className="text-body-md text-on-surface-variant">Lokasi berjualan untuk sesi ini:</p>
            {lokasi && (
              <div className="w-full rounded-2xl border-2 border-primary/30 bg-primary/5 px-md py-md">
                <p className="text-title-lg font-semibold text-on-surface">{lokasi.namaJalan}</p>
                <p className="text-body-lg text-on-surface">{lokasi.namaRuas}</p>
                {lokasi.namaKecamatan && <p className="text-body-md text-on-surface-variant">Kecamatan {lokasi.namaKecamatan}</p>}
              </div>
            )}
            <p className="text-body-sm text-on-surface-variant">Sesi sudah terlihat oleh pedagang dan siap diikuti.</p>
          </div>
          <div className="flex shrink-0 justify-center border-t border-outline-variant px-lg py-md">
            <button
              type="button"
              onClick={() =>
                onSaved(
                  modeAcakSaja
                    ? `✅ Lokasi sesi "${sesi?.nama}" sudah diacak.`
                    : `✅ Sesi "${namaSesi.trim()}" dibuat di ${lokasi ? `${lokasi.namaJalan} · ${lokasi.namaRuas}` : "lokasi terpilih"}.`,
                )
              }
              className="pt-btn pt-btn-primary min-w-[10rem] justify-center"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Form =====
  return (
    <div className="pt-modal-overlay">
      <div className="pt-modal-box max-w-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <div>
            <h2 className="text-title-lg text-on-surface">{modeAcakSaja ? "Acak Lokasi Sesi" : "Tambah Sesi"}</h2>
            {modeAcakSaja && <p className="text-body-sm text-on-surface-variant">{sesi?.nama}</p>}
          </div>
          <button type="button" onClick={tutup} disabled={menyimpan} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSimpan} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-lg py-lg">
            <fieldset disabled={menyimpan} className="min-w-0 space-y-lg">
              {error && (
                <div role="alert" className="rounded-xl bg-error-container/60 px-md py-sm text-body-md text-on-error-container">
                  {error}
                </div>
              )}

              {!modeAcakSaja && (
                <div className={`space-y-md ${sesiIdTerbuat ? "pointer-events-none opacity-60" : ""}`}>
                  <Langkah no={1} judul="Data sesi" />
                  <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                    <Field label="Nama sesi" htmlFor="sesi-nama">
                      <input
                        id="sesi-nama"
                        value={namaSesi}
                        onChange={(e) => setNamaSesi(e.target.value)}
                        placeholder="contoh: CFD Minggu Pagi"
                        className="pt-input"
                        maxLength={150}
                        autoFocus
                      />
                    </Field>
                    <Field label="Tanggal" htmlFor="sesi-tanggal">
                      <input
                        id="sesi-tanggal"
                        type="date"
                        min={hariIni}
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        className="pt-input"
                      />
                    </Field>
                    <Field label="Jam mulai">
                      <TimeStepper value={jamMulai} onChange={setJamMulai} disabled={menyimpan || !!sesiIdTerbuat} />
                    </Field>
                    <Field label="Jam selesai">
                      <TimeStepper value={jamSelesai} onChange={setJamSelesai} disabled={menyimpan || !!sesiIdTerbuat} />
                    </Field>
                  </div>

                  <Langkah no={2} judul="Jumlah pedagang" />
                  <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                    <Field label="Jumlah pedagang di sesi ini" htmlFor="sesi-kuota">
                      <input
                        id="sesi-kuota"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={kuotaTotal}
                        onChange={(e) => setKuotaTotal(e.target.value)}
                        placeholder="contoh: 50"
                        className="pt-input"
                      />
                    </Field>
                    <Field label="Dari jumlah itu, untuk pedagang lama" htmlFor="sesi-kuota-lama">
                      <input
                        id="sesi-kuota-lama"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={kuotaLama}
                        onChange={(e) => setKuotaLama(e.target.value)}
                        className="pt-input"
                      />
                    </Field>
                  </div>
                  {kuotaTotalAngka > 0 && (
                    <p className="rounded-xl bg-surface-container-low px-md py-sm text-body-md text-on-surface">
                      Pedagang lama <strong>{Math.min(kuotaLamaAngka, kuotaTotalAngka)}</strong> · Pedagang baru{" "}
                      <strong>{Math.max(0, kuotaTotalAngka - kuotaLamaAngka)}</strong> · Total <strong>{kuotaTotalAngka}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* ===== Cakupan undian ===== */}
              <div className={`space-y-md ${acakTersimpan ? "pointer-events-none opacity-60" : ""}`}>
                <Langkah no={modeAcakSaja ? 1 : 3} judul="Lokasi diundi dari" />
                <div role="radiogroup" aria-label="Cakupan acak lokasi" className="grid grid-cols-2 gap-sm sm:grid-cols-4">
                  {PILIHAN_CAKUPAN.map((p) => {
                    const aktif = cakupan === p.key;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        role="radio"
                        aria-checked={aktif}
                        onClick={() => {
                          setCakupan(p.key);
                          setCari("");
                          setError(null);
                        }}
                        className={`flex flex-col items-start gap-xs rounded-xl border-2 p-md text-left transition-colors ${
                          aktif ? "border-primary bg-primary/5" : "border-outline-variant hover:bg-surface-container-low"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            aktif ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        </span>
                        <span className="text-body-md font-semibold text-on-surface">{p.label}</span>
                        <span className="text-label-sm leading-snug text-on-surface-variant">{p.deskripsi}</span>
                      </button>
                    );
                  })}
                </div>

                {cakupan !== "kota" && (
                  <div className="mt-md">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                      <input
                        className="pt-input pl-9"
                        placeholder={`Cari ${LABEL_CAKUPAN[cakupan]}...`}
                        value={cari}
                        onChange={(e) => setCari(e.target.value)}
                      />
                    </div>
                    <div className="mt-sm max-h-64 overflow-y-auto rounded-xl border border-outline-variant p-xs">
                      {cakupan === "kecamatan" &&
                        (() => {
                          const list = kecamatanList.filter((k) => cocok(k.kecamatan));
                          return (
                            <>
                              {kepalaGrup(
                                "Kecamatan",
                                list.map((k) => k.kecamatanId as string),
                              )}
                              {list.map((k) => baris(k.kecamatanId as string, k.kecamatan, `${(k.jalan ?? []).length} jalan`))}
                            </>
                          );
                        })()}

                      {cakupan === "jalan" &&
                        wilayah.map((k) => {
                          const list = (k.jalan ?? []).filter((j) => cocok(j.namaJalan, k.kecamatan));
                          if (list.length === 0) return null;
                          return (
                            <div key={k.kecamatanId ?? "tanpa-kecamatan"}>
                              {kepalaGrup(
                                k.kecamatan,
                                list.map((j) => j.id),
                              )}
                              {list.map((j) => baris(j.id, j.namaJalan, `${(j.ruas ?? []).length} ruas`))}
                            </div>
                          );
                        })}

                      {cakupan === "ruas" &&
                        wilayah.flatMap((k) =>
                          (k.jalan ?? []).map((j) => {
                            const list = (j.ruas ?? []).filter((r) => cocok(r.namaRuas, j.namaJalan, k.kecamatan));
                            if (list.length === 0) return null;
                            return (
                              <div key={j.id}>
                                {kepalaGrup(
                                  `${j.namaJalan} · ${k.kecamatan}`,
                                  list.map((r) => r.id),
                                )}
                                {list.map((r) => baris(r.id, r.namaRuas))}
                              </div>
                            );
                          }),
                        )}
                    </div>
                    <p className="mt-xs text-label-sm text-on-surface-variant">
                      {pilihan[cakupan].length} {LABEL_CAKUPAN[cakupan]} dipilih
                    </p>
                  </div>
                )}

                <p className="flex items-start gap-1.5 text-body-sm text-on-surface-variant">
                  <Info className="h-4 w-4 shrink-0 translate-y-0.5" strokeWidth={2} />
                  Sistem mengundi <strong className="text-on-surface">satu ruas</strong> sebagai lokasi sesi ini. Ruas yang sedang
                  dipakai sesi lain di jam yang sama tidak ikut diundi.
                </p>
              </div>
            </fieldset>
          </div>

          <div className="flex shrink-0 justify-end gap-sm border-t border-outline-variant px-lg py-md">
            <button type="button" onClick={tutup} disabled={menyimpan} className="pt-btn pt-btn-ghost">
              Batal
            </button>
            <button
              type="submit"
              disabled={menyimpan}
              className="pt-btn pt-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {menyimpan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
              {menyimpan
                ? "Mengacak..."
                : sesiIdTerbuat && !modeAcakSaja
                  ? "Coba Lagi"
                  : modeAcakSaja
                    ? "Acak Lokasi"
                    : "Simpan & Acak Lokasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Langkah({ no, judul }: { no: number; judul: string }) {
  return (
    <p className="flex items-center gap-sm text-title-md font-semibold text-on-surface">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-label-md text-on-primary">{no}</span>
      {judul}
    </p>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="pt-field-label mb-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}