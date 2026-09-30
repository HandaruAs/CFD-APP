"use client";

// Tambah Sesi -- isi data sesi, pilih cakupan acak, lalu "Simpan & Acak".
// Pengacakan dilakukan SERVER (bukan di browser), supaya hasilnya tidak bisa
// diatur dari sisi admin/petugas. Urutan request:
//   1. POST /api/admin/events                  -> sesi dibuat (draft)
//   2. POST /api/admin/events/:id/acak-lokasi  -> ruas diacak di cakupan
//   3. PATCH /api/admin/events/:id/status      -> diterbitkan (terlihat pedagang)
// Kalau langkah 2/3 gagal, sesi yang sudah dibuat tidak dibuat ulang: tombol
// "Coba Lagi" melanjutkan dari sesi yang sama.
//
// Mode "Tambah Titik" (prop `sesi` diisi): form data sesi disembunyikan, cuma
// cakupan + acak, untuk menambah titik lokasi ke sesi yang sudah ada.
//
// Cakupan boleh lebih dari satu kecamatan / jalan / ruas sekaligus.
// Nomor stan TIDAK dibuat di sini -- nomor diacak saat pedagang ikut sesi.

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Info, Landmark, Loader2, MapPin, Milestone, Route, Search, Shuffle, X } from "lucide-react";
import type { KecamatanLengkapData } from "../../manajemen-lapak/types";
import TimeStepper from "./TimeStepper";
import { apiEvent, todayISO, type Cakupan, type HasilAcakLokasi, type SesiEvent } from "./sesi-utils";

interface Props {
  wilayah: KecamatanLengkapData[];
  /** Diisi = mode tambah titik ke sesi yang sudah ada. */
  sesi?: SesiEvent;
  onClose: () => void;
  /** Dipanggil setelah selesai (atau ada perubahan tersimpan); `pesan` untuk notifikasi. */
  onSaved: (pesan: string) => void;
}

const PILIHAN_CAKUPAN: { key: Cakupan; label: string; deskripsi: string; icon: React.ElementType }[] = [
  { key: "kota", label: "Se-Surabaya", deskripsi: "Acak dari semua ruas", icon: Landmark },
  { key: "kecamatan", label: "Kecamatan", deskripsi: "Satu atau beberapa kecamatan", icon: MapPin },
  { key: "jalan", label: "Jalan", deskripsi: "Satu atau beberapa jalan", icon: Milestone },
  { key: "ruas", label: "Ruas", deskripsi: "Acak di antara ruas pilihan", icon: Route },
];

const LABEL_CAKUPAN: Record<Cakupan, string> = { kota: "Se-Surabaya", kecamatan: "kecamatan", jalan: "jalan", ruas: "ruas" };

export default function TambahSesiModal({ wilayah, sesi, onClose, onSaved }: Props) {
  const modeTambahTitik = !!sesi;
  const hariIni = todayISO();

  // --- data sesi ---
  const [namaSesi, setNamaSesi] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [jamMulai, setJamMulai] = useState("06:00");
  const [jamSelesai, setJamSelesai] = useState("11:00");
  const [bukaPengaturan, setBukaPengaturan] = useState(false);
  const [pendaftaranBuka, setPendaftaranBuka] = useState("");
  const [pendaftaranTutup, setPendaftaranTutup] = useState("");
  const [lepasKuota, setLepasKuota] = useState("");

  // --- cakupan acak ---
  const [cakupan, setCakupan] = useState<Cakupan>("kota");
  const [pilihan, setPilihan] = useState<Record<Cakupan, string[]>>({ kota: [], kecamatan: [], jalan: [], ruas: [] });
  const [cari, setCari] = useState("");
  const [jumlahTitik, setJumlahTitik] = useState("0");
  const [persenLama, setPersenLama] = useState("50");

  // --- proses ---
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // id sesi yang sudah terbuat di percobaan sebelumnya (supaya retry tidak dobel)
  const [sesiIdTerbuat, setSesiIdTerbuat] = useState<string | null>(sesi?.id ?? null);
  const [hasil, setHasil] = useState<HasilAcakLokasi | null>(null);
  // hasil acak yang sudah tersimpan tapi sesi belum berhasil diterbitkan
  // (supaya "Coba Lagi" tidak mengacak dua kali)
  const [acakTersimpan, setAcakTersimpan] = useState<HasilAcakLokasi | null>(null);

  const kecamatanList = useMemo(() => wilayah.filter((k) => k.kecamatanId), [wilayah]);
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
    if (!modeTambahTitik && !sesiIdTerbuat) {
      if (!namaSesi.trim()) return "Isi nama sesi dulu.";
      if (!tanggal) return "Pilih tanggal sesi.";
      if (jamSelesai <= jamMulai) return "Jam selesai harus lebih besar dari jam mulai.";
      if (new Date(`${tanggal}T${jamSelesai}:00`).getTime() <= Date.now()) {
        return "Jam selesai sesi ini sudah lewat. Pilih tanggal atau jam selesai yang akan datang.";
      }
    }
    if (acakTersimpan) return null; // tinggal menerbitkan
    if (cakupan !== "kota" && pilihan[cakupan].length === 0) return `Pilih minimal satu ${LABEL_CAKUPAN[cakupan]}.`;
    const jumlah = parseInt(jumlahTitik, 10);
    if (isNaN(jumlah) || jumlah < 0) return "Jumlah titik harus 0 atau lebih (0 = semua).";
    const persen = parseInt(persenLama, 10);
    if (isNaN(persen) || persen < 0 || persen > 100) return "Porsi kuota pedagang lama harus 0 sampai 100.";
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
      // 1. Buat sesi (sekali saja, walau acak di bawah gagal lalu dicoba lagi)
      if (!id) {
        const res = await apiEvent<{ data: SesiEvent }>("/api/admin/events", {
          method: "POST",
          body: JSON.stringify({
            nama: namaSesi.trim(),
            tanggal,
            jamMulai,
            jamSelesai,
            pendaftaranBukaAt: pendaftaranBuka || null,
            pendaftaranTutupAt: pendaftaranTutup || null,
            lepasKuotaAt: lepasKuota || null,
          }),
        });
        id = res.data.id;
        setSesiIdTerbuat(id);
      }

      // 2. Acak lokasi di server (dilewati kalau sudah berhasil sebelumnya)
      let acakData = acakTersimpan;
      if (!acakData) {
        const body: Record<string, unknown> = {
          scope: cakupan,
          jumlahTitik: parseInt(jumlahTitik, 10),
          persenLama: parseInt(persenLama, 10),
        };
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

      // 3. Terbitkan (sesi baru, atau sesi lama yang masih draft)
      if (!modeTambahTitik || sesi?.status === "draft") {
        await apiEvent(`/api/admin/events/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ aksi: "terbitkan" }),
        });
      }
      setHasil(acakData);
    } catch (err) {
      const pesanErr = err instanceof Error ? err.message : "Gagal menyimpan sesi.";
      setError(
        id && !modeTambahTitik
          ? `${pesanErr} Sesi sudah tersimpan sebagai draft -- ubah cakupan lalu klik "Coba Lagi".`
          : pesanErr,
      );
    } finally {
      setMenyimpan(false);
    }
  }

  function tutup() {
    // Sesi sempat terbuat walau acaknya gagal -> daftar perlu dimuat ulang.
    if (sesiIdTerbuat && !modeTambahTitik && !hasil) onSaved("Sesi tersimpan sebagai draft (belum ada titik lokasi).");
    else onClose();
  }

  const baris = (id: string, label: string, sub?: string) => (
    <label key={id} className="flex cursor-pointer items-center gap-sm rounded-lg px-sm py-1.5 hover:bg-surface-container-low">
      <input type="checkbox" checked={terpilih.has(id)} onChange={() => toggle(id)} className="h-4 w-4 accent-primary" />
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
    return (
      <div className="pt-modal-overlay">
        <div className="pt-modal-box max-w-2xl">
          <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
            <div>
              <h2 className="text-title-lg text-on-surface">{modeTambahTitik ? "Titik Lokasi Ditambahkan" : "Sesi Tersimpan"}</h2>
              <p className="text-body-sm text-on-surface-variant">Cakupan {hasil.scopeLabel}</p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-lg py-md">
            <p className="text-body-md text-on-surface-variant">
              <strong className="text-on-surface">{hasil.ditambahkan.length} titik</strong> terpilih acak dari{" "}
              {hasil.jumlahKandidat} ruas yang tersedia.{" "}
              {modeTambahTitik ? "" : "Sesi sudah diterbitkan dan terlihat oleh pedagang."}
            </p>
            <ul className="mt-sm divide-y divide-outline-variant/50 rounded-xl border border-outline-variant">
              {hasil.ditambahkan.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-sm px-md py-sm">
                  <div className="min-w-0">
                    <p className="text-body-md font-medium text-on-surface">
                      {t.namaJalan} · {t.namaRuas}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">{t.namaKecamatan ? `Kec. ${t.namaKecamatan}` : "-"}</p>
                  </div>
                  <p className="shrink-0 text-label-sm tabular-nums text-on-surface-variant">
                    Lama {t.kuotaLama} · Baru {t.kuotaBaru}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 justify-end border-t border-outline-variant px-lg py-md">
            <button
              type="button"
              onClick={() =>
                onSaved(
                  modeTambahTitik
                    ? `✅ ${hasil.ditambahkan.length} titik ditambahkan ke "${sesi?.nama}".`
                    : `✅ Sesi "${namaSesi.trim()}" tersimpan dengan ${hasil.ditambahkan.length} titik lokasi.`,
                )
              }
              className="pt-btn pt-btn-primary"
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
            <h2 className="text-title-lg text-on-surface">{modeTambahTitik ? "Tambah Titik Lokasi" : "Tambah Sesi"}</h2>
            {modeTambahTitik && <p className="text-body-sm text-on-surface-variant">{sesi?.nama}</p>}
          </div>
          <button type="button" onClick={tutup} disabled={menyimpan} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSimpan} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-lg py-lg">
            <fieldset disabled={menyimpan} className="min-w-0 space-y-lg">
              {error && (
                <div role="alert" className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
                  {error}
                </div>
              )}

              {!modeTambahTitik && (
                <div className={sesiIdTerbuat ? "pointer-events-none opacity-60" : ""}>
                  <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                    <Field label="Nama sesi" htmlFor="sesi-nama">
                      <input
                        id="sesi-nama"
                        value={namaSesi}
                        onChange={(e) => setNamaSesi(e.target.value)}
                        placeholder="CFD Minggu Pagi"
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
                  <p className="mt-sm text-label-sm text-on-surface-variant">Sesi otomatis mulai dan selesai sesuai jam ini.</p>

                  {/* Pendaftaran pedagang -- opsional */}
                  <div className="mt-md rounded-xl border border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setBukaPengaturan((v) => !v)}
                      className="flex w-full items-center justify-between px-md py-sm text-left"
                    >
                      <span className="text-body-md font-medium text-on-surface">Jadwal pendaftaran pedagang (opsional)</span>
                      {bukaPengaturan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {bukaPengaturan && (
                      <div className="border-t border-outline-variant px-md py-md">
                        <p className="mb-sm text-label-sm text-on-surface-variant">
                          Kalau dikosongkan, pedagang bisa ikut sejak sesi disimpan sampai sesi dimulai.
                        </p>
                        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                          <Field label="Pendaftaran dibuka" htmlFor="sesi-buka">
                            <input
                              id="sesi-buka"
                              type="datetime-local"
                              value={pendaftaranBuka}
                              onChange={(e) => setPendaftaranBuka(e.target.value)}
                              className="pt-input"
                            />
                          </Field>
                          <Field label="Pendaftaran ditutup" htmlFor="sesi-tutup">
                            <input
                              id="sesi-tutup"
                              type="datetime-local"
                              value={pendaftaranTutup}
                              onChange={(e) => setPendaftaranTutup(e.target.value)}
                              className="pt-input"
                            />
                          </Field>
                        </div>
                        <div className="mt-md">
                          <Field label="Sisa kuota pedagang lama dilepas ke pedagang baru pada" htmlFor="sesi-lepas">
                            <input
                              id="sesi-lepas"
                              type="datetime-local"
                              value={lepasKuota}
                              onChange={(e) => setLepasKuota(e.target.value)}
                              className="pt-input"
                            />
                          </Field>
                          <p className="mt-xs text-label-sm text-on-surface-variant">
                            Kosongkan kalau kuota pedagang lama tidak dilepas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== Cakupan acak ===== */}
              <div>
                <p className="pt-field-label mb-sm">Acak lokasi dari</p>
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
                                {list.map((r) => baris(r.id, r.namaRuas, `kuota ${r.kuota}`))}
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

                <div className="mt-md grid grid-cols-1 gap-md sm:grid-cols-2">
                  <Field label="Jumlah titik yang diambil" htmlFor="sesi-jumlah">
                    <input
                      id="sesi-jumlah"
                      type="number"
                      min={0}
                      value={jumlahTitik}
                      onChange={(e) => setJumlahTitik(e.target.value)}
                      className="pt-input"
                    />
                    <p className="mt-xs text-label-sm text-on-surface-variant">0 = semua ruas yang tersedia di cakupan.</p>
                  </Field>
                  <Field label="Porsi kuota pedagang lama (%)" htmlFor="sesi-persen">
                    <input
                      id="sesi-persen"
                      type="number"
                      min={0}
                      max={100}
                      value={persenLama}
                      onChange={(e) => setPersenLama(e.target.value)}
                      className="pt-input"
                    />
                    <p className="mt-xs text-label-sm text-on-surface-variant">
                      Sisanya ({Math.max(0, 100 - (parseInt(persenLama, 10) || 0))}%) untuk pedagang baru.
                    </p>
                  </Field>
                </div>

                <p className="mt-md flex items-start gap-1.5 text-label-sm text-on-surface-variant">
                  <Info className="h-3.5 w-3.5 shrink-0 translate-y-0.5" strokeWidth={2} />
                  Lokasi diacak oleh server. Ruas yang sudah dipakai sesi lain di tanggal yang sama dengan jam yang bentrok
                  otomatis dilewati. Nomor stan diacak saat pedagang ikut sesi.
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
                : modeTambahTitik
                  ? "Acak & Tambahkan"
                  : sesiIdTerbuat
                    ? "Coba Lagi"
                    : "Simpan & Acak Lokasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
