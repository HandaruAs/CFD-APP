"use client";

// Tambah Sesi -- urutannya: isi data sesi, pilih cakupan, klik "Acak Lapak"
// (hasil acak langsung terlihat), lalu klik "Simpan Sesi". Simpan hanya
// mengirim SATU request (POST /api/petugas/manajemen-lapak/event) yang
// membawa data sesi sekaligus hasil acaknya di field `acak`.
//
// Karena sesi belum ada di database saat diacak, pengacakan dilakukan di
// frontend dengan aturan yang sama seperti backend acak-lapak:
//   - nomor lapak "<KODE_EVENT>-XXXXXX" (6 digit acak, unik dalam sesi)
//   - jalan yang sudah dibagi ruas -> sejumlah kuota tiap ruas (dengan ruasId)
//   - jalan yang belum dibagi ruas -> sejumlah kapasitas jalan (ruasId null)
// Jumlahnya mengikuti ruas & kuota di Manajemen Lapak.
//
// Cakupan acak (sama seperti menu Acak Lapak): Se-Surabaya, 1 Kecamatan,
// 1 Jalan, atau 1 Ruas. Jalan yang diikutkan ke sesi (field `jalan`)
// diturunkan dari cakupan itu. Field lama yang masih wajib diisi otomatis:
//   - jalan[].kuota = kapasitas jalan, kuotaTotal = jumlah kapasitasnya
//   - pendaftaranMulai = sekarang, pendaftaranSelesai = tanggal + jam selesai
//   - keterangan = ""

import { useState } from "react";
import { Landmark, Loader2, MapPin, Milestone, Route, Save, Shuffle, X } from "lucide-react";
import type {
  AcakSesiPayload,
  AcakSlot,
  CreateEventRequest,
  JalanLengkapData,
  KecamatanLengkapData,
} from "../../manajemen-lapak/types";
import { createEvent } from "../../manajemen-lapak/api";
import TimeStepper from "./TimeStepper";
import { todayISO } from "./sesi-utils";

type Cakupan = AcakSesiPayload["scope"];

interface Props {
  wilayah: KecamatanLengkapData[];
  /** Prefix nomor lapak (Kode Event di halaman Jam Operasional). */
  kodeEvent: string;
  onClose: () => void;
  /** Dipanggil setelah sesi + hasil acak tersimpan; `pesan` untuk notifikasi. */
  onSaved: (pesan: string) => void;
}

const PILIHAN_CAKUPAN: { key: Cakupan; label: string; deskripsi: string; icon: React.ElementType }[] = [
  { key: "kota", label: "Se-Surabaya", deskripsi: "Semua jalan yang terdaftar", icon: Landmark },
  { key: "kecamatan", label: "1 Kecamatan", deskripsi: "Semua jalan di satu kecamatan", icon: MapPin },
  { key: "jalan", label: "1 Jalan", deskripsi: "Satu jalan tertentu", icon: Milestone },
  { key: "ruas", label: "1 Ruas", deskripsi: "Satu ruas di satu jalan", icon: Route },
];

/** Lokasi 1 jalan = total kuota ruas, atau kapasitas kalau belum dibagi ruas. */
function lokasiJalan(j: JalanLengkapData) {
  const ruas = j.ruas ?? [];
  return ruas.length > 0 ? ruas.reduce((n, r) => n + r.kuota, 0) : j.kapasitas;
}

/** Nomor 6 digit acak (000000-999999), pakai crypto kalau tersedia. */
function angkaAcak6(): string {
  const buf = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(buf);
  else buf[0] = Math.floor(Math.random() * 0xffffffff);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

/** Satu kelompok hasil acak (per ruas, atau per jalan yang belum dibagi ruas). */
interface GrupHasil {
  kunci: string;
  label: string;
  slot: AcakSlot[];
}

export default function TambahSesiModal({ wilayah, kodeEvent, onClose, onSaved }: Props) {
  const hariIni = todayISO();
  const [namaSesi, setNamaSesi] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [jamMulai, setJamMulai] = useState("06:00");
  const [jamSelesai, setJamSelesai] = useState("11:00");

  const [cakupan, setCakupan] = useState<Cakupan>("kota");
  const [kecamatanId, setKecamatanId] = useState("");
  const [jalanId, setJalanId] = useState("");
  const [ruasId, setRuasId] = useState("");

  // Hasil acak -- dikosongkan lagi setiap cakupan berubah, supaya yang
  // disimpan selalu cocok dengan cakupan yang terpilih.
  const [hasilAcak, setHasilAcak] = useState<GrupHasil[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const prefix = (kodeEvent || "CFD").toUpperCase();

  // Kecamatan "tanpa nama" (jalan yang belum dikaitkan) tidak bisa dipilih
  // sebagai cakupan kecamatan, tapi jalannya tetap ikut di Se-Surabaya.
  const kecamatanList = wilayah.filter((k) => k.kecamatanId);
  const semuaJalan = wilayah.flatMap((k) => k.jalan ?? []);
  const kecamatanTerpilih = kecamatanList.find((k) => k.kecamatanId === kecamatanId);
  const jalanDiKecamatan = kecamatanTerpilih?.jalan ?? [];
  const jalanTerpilih = semuaJalan.find((j) => j.id === jalanId);
  const ruasList = jalanTerpilih?.ruas ?? [];
  const ruasTerpilih = ruasList.find((r) => r.id === ruasId);

  function hitungCakupan(): { jalanIkut: JalanLengkapData[]; lokasi: number } {
    if (cakupan === "kota") {
      return { jalanIkut: semuaJalan, lokasi: semuaJalan.reduce((n, j) => n + lokasiJalan(j), 0) };
    }
    if (cakupan === "kecamatan") {
      const list = kecamatanTerpilih?.jalan ?? [];
      return { jalanIkut: list, lokasi: list.reduce((n, j) => n + lokasiJalan(j), 0) };
    }
    if (!jalanTerpilih) return { jalanIkut: [], lokasi: 0 };
    if (cakupan === "ruas") return { jalanIkut: [jalanTerpilih], lokasi: ruasTerpilih?.kuota ?? 0 };
    return { jalanIkut: [jalanTerpilih], lokasi: lokasiJalan(jalanTerpilih) };
  }
  const { jalanIkut, lokasi } = hitungCakupan();

  function gantiCakupan(c: Cakupan) {
    setCakupan(c);
    setHasilAcak(null);
    setError(null);
  }
  function gantiKecamatan(id: string) {
    setKecamatanId(id);
    setJalanId("");
    setRuasId("");
    setHasilAcak(null);
  }
  function gantiJalan(id: string) {
    setJalanId(id);
    setRuasId("");
    setHasilAcak(null);
  }
  function gantiRuas(id: string) {
    setRuasId(id);
    setHasilAcak(null);
  }

  function validasiCakupan(): string | null {
    if (cakupan !== "kota" && !kecamatanId) return "Pilih kecamatan dulu.";
    if ((cakupan === "jalan" || cakupan === "ruas") && !jalanId) return "Pilih jalan dulu.";
    if (cakupan === "ruas" && ruasList.length === 0) {
      return `${jalanTerpilih?.namaJalan ?? "Jalan ini"} belum dibagi ruas. Pilih cakupan "1 Jalan" atau bagi ruasnya dulu di Manajemen Lapak.`;
    }
    if (cakupan === "ruas" && !ruasId) return "Pilih ruas dulu.";
    if (jalanIkut.length === 0 || lokasi === 0) return "Cakupan yang dipilih belum punya lokasi lapak.";
    return null;
  }

  // ===== Tombol "Acak Lapak": murni di frontend, tidak ada request =====
  function handleAcak() {
    const pesan = validasiCakupan();
    setError(pesan);
    if (pesan) return;

    const dipakai = new Set<string>();
    const nomorBaru = () => {
      // 1 juta kemungkinan per prefix; ulangi kalau bentrok dalam sesi ini.
      let nomor = `${prefix}-${angkaAcak6()}`;
      while (dipakai.has(nomor)) nomor = `${prefix}-${angkaAcak6()}`;
      dipakai.add(nomor);
      return nomor;
    };
    const buatSlot = (jumlah: number, jId: string, rId: string | null): AcakSlot[] =>
      Array.from({ length: jumlah }, () => ({ jalanId: jId, ruasId: rId, nomorLapak: nomorBaru() }));

    const grup: GrupHasil[] = [];
    for (const j of jalanIkut) {
      const ruas = cakupan === "ruas" ? (j.ruas ?? []).filter((r) => r.id === ruasId) : (j.ruas ?? []);
      if (ruas.length === 0) {
        grup.push({ kunci: j.id, label: j.namaJalan, slot: buatSlot(j.kapasitas, j.id, null) });
      } else {
        for (const r of ruas) {
          grup.push({ kunci: `${j.id}:${r.id}`, label: `${j.namaJalan} · ${r.namaRuas}`, slot: buatSlot(r.kuota, j.id, r.id) });
        }
      }
    }
    setHasilAcak(grup);
  }

  function validasiSesi(sekarang: number): string | null {
    if (!namaSesi.trim()) return "Isi nama sesi dulu.";
    if (!tanggal) return "Pilih tanggal sesi.";
    if (jamSelesai <= jamMulai) return "Jam selesai harus lebih besar dari jam mulai.";
    if (new Date(`${tanggal}T${jamSelesai}:00`).getTime() <= sekarang) {
      return "Jam selesai sesi ini sudah lewat. Pilih tanggal atau jam selesai yang akan datang.";
    }
    if (!hasilAcak) return "Klik Acak Lapak dulu sebelum menyimpan sesi.";
    return null;
  }

  // ===== Tombol "Simpan Sesi": SATU request, membawa hasil acak =====
  async function handleSimpan(e: React.FormEvent) {
    e.preventDefault();
    const pesan = validasiSesi(new Date().getTime());
    setError(pesan);
    if (pesan || !hasilAcak) return;

    const slot = hasilAcak.flatMap((g) => g.slot);
    const payload: CreateEventRequest = {
      namaEvent: namaSesi.trim(),
      tanggal,
      jamMulai,
      jamSelesai,
      pendaftaranMulai: new Date().toISOString(),
      pendaftaranSelesai: new Date(`${tanggal}T${jamSelesai}:00`).toISOString(),
      kuotaTotal: jalanIkut.reduce((n, j) => n + j.kapasitas, 0),
      keterangan: "",
      jalan: jalanIkut.map((j) => ({ jalanId: j.id, kuota: j.kapasitas })),
      acak: {
        scope: cakupan,
        kecamatanId: cakupan === "kota" ? null : kecamatanId,
        jalanId: cakupan === "jalan" || cakupan === "ruas" ? jalanId : null,
        ruasId: cakupan === "ruas" ? ruasId : null,
        kodeEvent: prefix,
        slot,
      },
    };

    setMenyimpan(true);
    try {
      await createEvent(payload);
      onSaved(`✅ Sesi "${payload.namaEvent}" tersimpan dengan ${slot.length} lokasi lapak hasil acak.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan sesi.");
      setMenyimpan(false);
    }
  }

  const totalHasil = hasilAcak?.reduce((n, g) => n + g.slot.length, 0) ?? 0;

  return (
    <div className="pt-modal-overlay">
      {/* max-w-2xl (utility layer) menang atas max-w-[30rem] bawaan pt-modal-box */}
      <div className="pt-modal-box max-w-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
          <h2 className="text-title-lg text-on-surface">Tambah Sesi</h2>
          <button type="button" onClick={onClose} disabled={menyimpan} className="pt-modal-close" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSimpan} className="flex min-h-0 flex-col">
          {/* <fieldset> tidak bisa jadi area scroll yang andal di browser, jadi
              scroll-nya dipasang di div pembungkus. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-lg py-lg">
          <fieldset disabled={menyimpan} className="min-w-0 space-y-lg">
            {error && (
              <div role="alert" className="rounded-xl bg-error-container/60 px-md py-sm text-body-sm text-on-error-container">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <Field label="Nama sesi" htmlFor="sesi-nama">
                <input
                  id="sesi-nama"
                  value={namaSesi}
                  onChange={(e) => setNamaSesi(e.target.value)}
                  placeholder="CFD Minggu Pagi"
                  className="pt-input"
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
                <TimeStepper value={jamMulai} onChange={setJamMulai} disabled={menyimpan} />
              </Field>
              <Field label="Jam selesai">
                <TimeStepper value={jamSelesai} onChange={setJamSelesai} disabled={menyimpan} />
              </Field>
            </div>
            <p className="-mt-sm text-label-sm text-on-surface-variant">Sesi otomatis mulai dan selesai sesuai jam ini.</p>

            {/* ===== Cakupan + tombol Acak Lapak ===== */}
            <div>
              <p className="pt-field-label mb-sm">Acak lapak untuk</p>
              <div role="radiogroup" aria-label="Cakupan acak lapak" className="grid grid-cols-2 gap-sm sm:grid-cols-4">
                {PILIHAN_CAKUPAN.map((p) => {
                  const aktif = cakupan === p.key;
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      role="radio"
                      aria-checked={aktif}
                      onClick={() => gantiCakupan(p.key)}
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
                <div className="mt-md grid grid-cols-1 gap-md sm:grid-cols-3">
                  <Field label="Kecamatan" htmlFor="sesi-kec">
                    <select id="sesi-kec" value={kecamatanId} onChange={(e) => gantiKecamatan(e.target.value)} className="pt-input">
                      <option value="">Pilih kecamatan</option>
                      {kecamatanList.map((k) => (
                        <option key={k.kecamatanId!} value={k.kecamatanId!}>
                          {k.kecamatan}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {(cakupan === "jalan" || cakupan === "ruas") && (
                    <Field label="Jalan" htmlFor="sesi-jalan">
                      <select
                        id="sesi-jalan"
                        value={jalanId}
                        onChange={(e) => gantiJalan(e.target.value)}
                        disabled={!kecamatanId}
                        className="pt-input disabled:opacity-50"
                      >
                        <option value="">{kecamatanId ? "Pilih jalan" : "Pilih kecamatan dulu"}</option>
                        {jalanDiKecamatan.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.namaJalan}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  {cakupan === "ruas" && (
                    <Field label="Ruas" htmlFor="sesi-ruas">
                      <select
                        id="sesi-ruas"
                        value={ruasId}
                        onChange={(e) => gantiRuas(e.target.value)}
                        disabled={!jalanId || ruasList.length === 0}
                        className="pt-input disabled:opacity-50"
                      >
                        <option value="">
                          {!jalanId ? "Pilih jalan dulu" : ruasList.length === 0 ? "Jalan ini belum dibagi ruas" : "Pilih ruas"}
                        </option>
                        {ruasList.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.namaRuas} ({r.kuota} lokasi)
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              )}

              <div className="mt-md flex flex-wrap items-center justify-between gap-sm rounded-xl bg-surface-container-low px-md py-sm">
                <p className="text-body-sm tabular-nums text-on-surface-variant">
                  {jalanIkut.length === 0 || lokasi === 0 ? (
                    "Lengkapi pilihan di atas, lalu klik Acak Lapak."
                  ) : (
                    <>
                      <strong className="text-on-surface">{lokasi} lokasi</strong> di{" "}
                      {jalanIkut.length === 1 ? jalanIkut[0].namaJalan : `${jalanIkut.length} jalan`}
                      {cakupan === "ruas" && ruasTerpilih ? `, ${ruasTerpilih.namaRuas}` : ""} — mengikuti ruas &amp; kuota
                      di Manajemen Lapak.
                    </>
                  )}
                </p>
                <button type="button" onClick={handleAcak} className={`pt-btn ${hasilAcak ? "pt-btn-ghost" : "pt-btn-secondary"}`}>
                  <Shuffle className="h-4 w-4" />
                  {hasilAcak ? "Acak Ulang" : "Acak Lapak"}
                </button>
              </div>

              {/* ===== Hasil acak (belum tersimpan sampai klik Simpan Sesi) ===== */}
              {hasilAcak && (
                <div className="mt-sm rounded-xl border border-secondary/40 bg-secondary-container/15">
                  <p className="border-b border-secondary/20 px-md py-sm text-body-sm text-on-surface">
                    <strong>{totalHasil} lokasi</strong> sudah diacak dengan awalan <strong>{prefix}</strong>. Klik{" "}
                    <strong>Simpan Sesi</strong> untuk menyimpan sesi beserta hasil acak ini.
                  </p>
                  <ul className="max-h-48 divide-y divide-outline-variant/50 overflow-y-auto">
                    {hasilAcak.map((g) => (
                      <li key={g.kunci} className="px-md py-sm">
                        <p className="text-label-md font-semibold text-on-surface">
                          {g.label} <span className="font-normal text-on-surface-variant">· {g.slot.length} lokasi</span>
                        </p>
                        <p className="mt-0.5 text-label-sm tabular-nums text-on-surface-variant">
                          {g.slot
                            .slice(0, 4)
                            .map((s) => s.nomorLapak)
                            .join(", ")}
                          {g.slot.length > 4 && ` +${g.slot.length - 4} lainnya`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </fieldset>
          </div>

          <div className="flex shrink-0 justify-end gap-sm border-t border-outline-variant px-lg py-md">
            <button type="button" onClick={onClose} disabled={menyimpan} className="pt-btn pt-btn-ghost">
              Batal
            </button>
            <button
              type="submit"
              disabled={menyimpan || !hasilAcak}
              title={hasilAcak ? undefined : "Acak lapak dulu"}
              className="pt-btn pt-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {menyimpan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {menyimpan ? "Menyimpan..." : "Simpan Sesi"}
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
