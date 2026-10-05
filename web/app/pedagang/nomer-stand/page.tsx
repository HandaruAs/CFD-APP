"use client";

// Halaman pedagang: Daftar Usaha (sekali) + Pilih Event + Nomor Stan.
//   - Belum punya data usaha -> isi form data usaha dulu.
//   - Sudah punya data usaha -> pilih event yang mau diikuti. Lokasi (ruas)
//     dan nomor stan DIACAK server lalu langsung terkunci.
//   - Event yang sudah diikuti tampil sebagai kartu (nomor stan + QR).
//
// Endpoint: /api/pedagang/pengajuan, /api/pedagang/events (lihat
// API_MULTI_EVENT.md). Kategori pedagang lama/baru ditentukan server.

import { useCallback, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  MapPin,
  QrCode,
  RefreshCw,
  Save,
  Shuffle,
  ShoppingCart,
  Store,
  Table2,
  Tag,
  User,
  X,
} from "lucide-react";

type StallType = "rombong" | "meja" | "";
type StatusPendaftaran = "belum_dibuka" | "dibuka" | "ditutup";
type StatusPeserta = "terdaftar" | "check_in" | "check_out" | "batal" | "tidak_hadir";

type LokasiRingkas = {
  namaKecamatan: string | null;
  namaJalan: string;
  namaRuas: string;
  sisa: number;
};

type EventTersedia = {
  id: string;
  nama: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  keterangan: string | null;
  statusPendaftaran: StatusPendaftaran;
  pendaftaranBukaAt: string | null;
  pendaftaranTutupAt: string | null;
  kuotaLamaDilepas: boolean;
  sisaUntukSaya: number;
  lokasi: LokasiRingkas[];
  statusSaya: StatusPeserta | null;
  bisaIkut: boolean;
};

type Keikutsertaan = {
  id: string;
  eventId: string;
  namaEvent: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  statusEvent: string;
  namaKecamatan: string | null;
  namaJalan: string;
  namaRuas: string;
  nomor: number;
  kodeStan: string; // nomor stan yang ditampilkan, mis. "CFD-012361"
  kategori: "lama" | "baru";
  kuotaDipakai: "lama" | "baru";
  status: StatusPeserta;
  checkInAt: string | null;
  checkOutAt: string | null;
  bisaBatal: boolean;
  qrCode: string;
};

const KATEGORI_LABEL: Record<string, string> = {
  makanan_minuman: "Makanan dan Minuman",
  bukan_makanan_minuman: "Bukan Makanan dan Minuman",
};
const LAPAK_LABEL: Record<string, string> = { rombong: "Rombong", meja: "Meja" };

const STATUS_PESERTA: Record<StatusPeserta, { label: string; cls: string }> = {
  terdaftar: { label: "Terdaftar", cls: "bg-[#eef2fd] text-[#00288e]" },
  check_in: { label: "Sudah Check-in", cls: "bg-[#e3f8ee] text-[#0f7a44]" },
  check_out: { label: "Selesai", cls: "bg-[#f1f2f6] text-[#4b4d5a]" },
  batal: { label: "Dibatalkan", cls: "bg-[#fdecec] text-[#ba1a1a]" },
  tidak_hadir: { label: "Tidak Hadir", cls: "bg-[#fdecec] text-[#ba1a1a]" },
};

const INPUT_CLS =
  "w-full box-border h-10 px-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] placeholder:text-[#8fa3d6] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all";
const CARD_CLS = "w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)]";
const BTN_PRIMARY =
  "h-10 px-5 bg-[#00288e] text-white text-[13px] font-medium rounded-lg shadow-[0_4px_10px_-3px_rgba(0,40,142,0.4)] hover:bg-[#173bab] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100";
const BTN_SECONDARY =
  "h-10 px-5 bg-white text-[#4b4d5a] border border-[#e2e5f1] text-[13px] font-medium rounded-lg hover:bg-[#f5f7fe] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50";

// ========== HELPER ==========
function apiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}
function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("cfd_token") : null;
  return { Authorization: `Bearer ${token ?? ""}` };
}
// Error dari endpoint /api/pedagang/events membawa "code" supaya pesan
// bisa disesuaikan (lihat API_MULTI_EVENT.md).
class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new ApiError("Sesi kamu sudah habis. Silakan login ulang.", "UNAUTHORIZED", 401);
    throw new ApiError(data.error || `Permintaan gagal (status ${res.status})`, data.code, res.status);
  }
  return data as T;
}
function qrCodeUrl(isi: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(isi)}`;
}
function formatTanggal(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTanggalLahir(raw: string): string {
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
function formatJam(jam: string) {
  return jam.slice(0, 5).replace(":", ".");
}
function formatWaktu(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}

// Alasan tombol "Ikut" tidak aktif, ditampilkan ke pedagang.
function alasanTidakBisaIkut(ev: EventTersedia): string | null {
  if (ev.statusSaya === "batal") return "Kamu sudah membatalkan pendaftaran di event ini.";
  if (ev.statusSaya) return "Kamu sudah terdaftar di event ini.";
  if (ev.statusPendaftaran === "belum_dibuka")
    return ev.pendaftaranBukaAt ? `Pendaftaran dibuka ${formatWaktu(ev.pendaftaranBukaAt)}.` : "Pendaftaran belum dibuka.";
  if (ev.statusPendaftaran === "ditutup") return "Pendaftaran sudah ditutup.";
  if (ev.sisaUntukSaya <= 0) return "Kuota untuk kategorimu sudah penuh.";
  return null;
}

export default function EventDanNomorStanPage() {
  const router = useRouter();

  // --- Cek checkout (GET /api/pedagang/events/checkout) ---
  //   - masih check-in di event yang SUDAH selesai (wajibCheckout) ->
  //     langsung diarahkan ke CekOut: wajib isi omset dulu sebelum bisa
  //     ikut / check-in event lain;
  //   - masih check-in di event yang sedang berjalan -> tampil banner
  //     dengan tautan ke CekOut (halaman ini tetap bisa dipakai).
  const [checkingCheckout, setCheckingCheckout] = useState(true);
  const [checkInBerjalan, setCheckInBerjalan] = useState<string | null>(null); // nama event

  // --- Data usaha ---
  const [checkingPendaftar, setCheckingPendaftar] = useState(true);
  const [sudahDaftar, setSudahDaftar] = useState(false);
  const [nik, setNik] = useState("");
  const [dob, setDob] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [stallType, setStallType] = useState<StallType>("");
  const [showConfirmUsaha, setShowConfirmUsaha] = useState(false);
  const [savingUsaha, setSavingUsaha] = useState(false);
  const [errorUsaha, setErrorUsaha] = useState<string | null>(null);

  // --- Event ---
  const [kategori, setKategori] = useState<"lama" | "baru" | null>(null);
  const [events, setEvents] = useState<EventTersedia[]>([]);
  const [eventSaya, setEventSaya] = useState<Keikutsertaan[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [errorEvent, setErrorEvent] = useState<string | null>(null);
  const [lokasiTerbuka, setLokasiTerbuka] = useState<Record<string, boolean>>({});

  const [konfirmasiIkut, setKonfirmasiIkut] = useState<EventTersedia | null>(null);
  const [konfirmasiBatal, setKonfirmasiBatal] = useState<Keikutsertaan | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [errorAksi, setErrorAksi] = useState<string | null>(null);
  const [hasilIkut, setHasilIkut] = useState<Keikutsertaan | null>(null);

  // ===== LOAD =====
  useEffect(() => {
    let cancelled = false;
    async function cekHarusCheckout() {
      try {
        const res = await fetch(apiUrl("/api/pedagang/events/checkout"), { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          const d = body?.data;
          if (!cancelled && d && !d.sudahCheckOut) {
            if (d.wajibCheckout) {
              router.replace("/pedagang/CekOut");
              return; // biarkan loading tampil sampai pindah halaman
            }
            setCheckInBerjalan(d.namaEvent ?? "event");
          }
        }
      } catch {
        // gagal cek -- tampilkan halaman seperti biasa
      }
      if (!cancelled) setCheckingCheckout(false);
    }
    cekHarusCheckout();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    async function cekPendaftar() {
      try {
        const res = await fetch(apiUrl("/api/pedagang/pengajuan"), { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.has_pengajuan) return;
        setSudahDaftar(true);
        setNik(data.nik ?? "");
        setDob(data.tanggal_lahir ?? "");
        setFullName(data.nama_lengkap ?? "");
        setBusinessName(data.nama_usaha ?? "");
        setCategory(data.jenis_dagangan ?? "");
        setStallType((data.jenis_lapak as StallType) ?? "");
      } catch {
        // gagal cek -- tampilkan form; backend tetap menolak kalau ada masalah
      } finally {
        setCheckingPendaftar(false);
      }
    }
    cekPendaftar();
  }, []);

  const loadEvent = useCallback(async () => {
    setLoadingEvent(true);
    setErrorEvent(null);
    try {
      const [tersedia, saya] = await Promise.all([
        api<{ data: { kategori: "lama" | "baru"; events: EventTersedia[] } }>("/api/pedagang/events"),
        api<{ data: Keikutsertaan[] }>("/api/pedagang/events/saya"),
      ]);
      setKategori(tersedia.data.kategori);
      setEvents(tersedia.data.events);
      setEventSaya(saya.data);
    } catch (err) {
      if (err instanceof ApiError && err.code === "BELUM_PUNYA_PROFIL") {
        setSudahDaftar(false);
        return;
      }
      setErrorEvent(err instanceof Error ? err.message : "Gagal memuat event.");
    } finally {
      setLoadingEvent(false);
    }
  }, []);

  useEffect(() => {
    if (!sudahDaftar) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvent();
  }, [sudahDaftar, loadEvent]);

  // ===== DATA USAHA =====
  const handleSubmitUsaha = (e: FormEvent) => {
    e.preventDefault();
    if (nik.trim().length !== 16) {
      setErrorUsaha("NIK harus terdiri dari 16 digit.");
      return;
    }
    if (!dob || !fullName || !businessName || !category || !stallType) {
      setErrorUsaha("Mohon lengkapi semua data usaha terlebih dahulu.");
      return;
    }
    setErrorUsaha(null);
    setShowConfirmUsaha(true);
  };

  const simpanUsaha = async () => {
    setSavingUsaha(true);
    setErrorUsaha(null);
    try {
      await api("/api/pedagang/pengajuan", {
        method: "POST",
        body: JSON.stringify({
          nik,
          nama_lengkap: fullName,
          tanggal_lahir: dob,
          nama_usaha: businessName,
          jenis_dagangan: category,
          jenis_lapak: stallType,
        }),
      });
      setShowConfirmUsaha(false);
      setSudahDaftar(true); // memicu loadEvent -> langsung ke langkah Pilih Event
    } catch (err) {
      setErrorUsaha(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
      setShowConfirmUsaha(false);
    } finally {
      setSavingUsaha(false);
    }
  };

  // ===== IKUT / BATAL EVENT =====
  const ikutEvent = async (ev: EventTersedia) => {
    setMemproses(true);
    setErrorAksi(null);
    try {
      const res = await api<{ data: Keikutsertaan }>(`/api/pedagang/events/${ev.id}/ikut`, { method: "POST" });
      setKonfirmasiIkut(null);
      setHasilIkut(res.data);
      await loadEvent();
    } catch (err) {
      // Masih nunggak checkout event yang sudah selesai -> ke CekOut dulu.
      if (err instanceof ApiError && err.code === "BELUM_CHECKOUT") {
        router.push("/pedagang/CekOut");
        return;
      }
      setErrorAksi(err instanceof Error ? err.message : "Gagal ikut event.");
      await loadEvent(); // sisa kuota mungkin sudah berubah
    } finally {
      setMemproses(false);
    }
  };

  const batalEvent = async (k: Keikutsertaan) => {
    setMemproses(true);
    setErrorAksi(null);
    try {
      await api(`/api/pedagang/events/${k.eventId}/ikut`, { method: "DELETE" });
      setKonfirmasiBatal(null);
      await loadEvent();
    } catch (err) {
      setErrorAksi(err instanceof Error ? err.message : "Gagal membatalkan.");
    } finally {
      setMemproses(false);
    }
  };

  const aktif = eventSaya.filter((k) => k.status === "terdaftar" || k.status === "check_in");
  const lainnya = eventSaya.filter((k) => k.status !== "terdaftar" && k.status !== "check_in");

  return (
    <main className="w-full min-h-screen flex items-start justify-center px-4 py-10 bg-[#f6f7fb]">
      <div className="w-full max-w-[760px]">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-[#4b4d5a] hover:text-[#1a1d29] transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[22px] leading-tight font-bold text-[#1a1d29]">
              {sudahDaftar ? "Event & Nomor Stan" : "Daftar Usaha"}
            </h1>
            {sudahDaftar && kategori && (
              <span className="ml-auto rounded-full bg-[#eef2fd] px-3 py-1 text-[11.5px] font-semibold text-[#00288e]">
                Pedagang {kategori === "lama" ? "Lama" : "Baru"}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#767884] pl-8">
            {sudahDaftar
              ? "Pilih event yang mau kamu ikuti. Lokasi dan nomor stan diacak otomatis oleh sistem."
              : "Lengkapi data usaha sekali saja, lalu kamu bisa memilih event yang mau diikuti."}
          </p>
        </div>

        {checkingPendaftar || checkingCheckout ? (
          <div className={`${CARD_CLS} p-8 text-center text-[13px] text-[#767884]`}>Memuat data...</div>
        ) : !sudahDaftar ? (
          <FormUsaha
            nik={nik}
            setNik={setNik}
            dob={dob}
            setDob={setDob}
            fullName={fullName}
            setFullName={setFullName}
            businessName={businessName}
            setBusinessName={setBusinessName}
            category={category}
            setCategory={setCategory}
            stallType={stallType}
            setStallType={setStallType}
            error={errorUsaha}
            loading={savingUsaha}
            onSubmit={handleSubmitUsaha}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {checkInBerjalan && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#bfeed7] bg-[#e3f8ee] px-4 py-3">
                <p className="text-[12.5px] text-[#0f7a44]">
                  Kamu sedang check-in di <strong>{checkInBerjalan}</strong>. Cek-out bisa dilakukan setelah event selesai.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/pedagang/CekOut")}
                  className="text-[12.5px] font-semibold text-[#0f7a44] underline"
                >
                  Ke halaman Cek-out
                </button>
              </div>
            )}

            {errorAksi && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#f5c2c2] bg-[#fdecec] px-4 py-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#ba1a1a]" />
                <p className="flex-1 text-[12.5px] text-[#ba1a1a]">{errorAksi}</p>
                <button type="button" onClick={() => setErrorAksi(null)} aria-label="Tutup" className="text-[#ba1a1a]">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ===== EVENT SAYA ===== */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">Event Saya</h2>
                <button
                  type="button"
                  onClick={() => loadEvent()}
                  disabled={loadingEvent}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#00288e] disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loadingEvent ? "animate-spin" : ""} />
                  Muat ulang
                </button>
              </div>
              {aktif.length === 0 ? (
                <div className={`${CARD_CLS} p-6 text-center text-[13px] text-[#767884]`}>
                  Kamu belum ikut event apa pun. Pilih event di bawah.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {aktif.map((k) => (
                    <KartuEventSaya key={k.id} k={k} onBatal={() => setKonfirmasiBatal(k)} />
                  ))}
                </div>
              )}
              {lainnya.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {lainnya.map((k) => (
                    <div key={k.id} className={`${CARD_CLS} flex items-center justify-between gap-3 px-4 py-3`}>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#1a1d29]">{k.namaEvent}</p>
                        <p className="text-[12px] text-[#767884]">
                          {formatTanggal(k.tanggal)} · {k.namaJalan} · {k.namaRuas} · {k.kodeStan}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_PESERTA[k.status].cls}`}
                      >
                        {STATUS_PESERTA[k.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ===== PILIH EVENT ===== */}
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-[#1a1d29]">Pilih Event</h2>
              {loadingEvent && events.length === 0 ? (
                <div className={`${CARD_CLS} p-6 text-center text-[13px] text-[#767884]`}>Memuat event...</div>
              ) : errorEvent ? (
                <div className={`${CARD_CLS} flex items-center justify-between gap-3 p-4`}>
                  <p className="text-[12.5px] text-[#ba1a1a]">{errorEvent}</p>
                  <button type="button" onClick={() => loadEvent()} className={BTN_SECONDARY}>
                    Coba lagi
                  </button>
                </div>
              ) : events.length === 0 ? (
                <div className={`${CARD_CLS} p-8 flex flex-col items-center gap-2 text-center`}>
                  <CalendarDays size={28} className="text-[#a3a5b3]" />
                  <p className="text-[13px] text-[#767884]">Belum ada event yang dibuka. Cek lagi nanti.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {events.map((ev) => {
                    const alasan = alasanTidakBisaIkut(ev);
                    const buka = !!lokasiTerbuka[ev.id];
                    return (
                      <div key={ev.id} className={`${CARD_CLS} p-4`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[14.5px] font-semibold text-[#1a1d29]">{ev.nama}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-[#767884]">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays size={13} />
                                {formatTanggal(ev.tanggal)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock size={13} />
                                {formatJam(ev.jamMulai)} – {formatJam(ev.jamSelesai)} WIB
                              </span>
                            </p>
                            {ev.keterangan && <p className="mt-1 text-[12px] text-[#767884]">{ev.keterangan}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-[20px] font-bold leading-none text-[#00288e]">{ev.sisaUntukSaya}</p>
                            <p className="text-[11px] text-[#767884]">sisa kuota untukmu</p>
                          </div>
                        </div>

                        {ev.pendaftaranTutupAt && ev.statusPendaftaran === "dibuka" && (
                          <p className="mt-2 text-[12px] text-[#b45309]">
                            Pendaftaran ditutup {formatWaktu(ev.pendaftaranTutupAt)}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => setLokasiTerbuka((s) => ({ ...s, [ev.id]: !buka }))}
                          className="mt-3 flex items-center gap-1 text-[12.5px] font-medium text-[#00288e]"
                        >
                          <MapPin size={14} />
                          {ev.lokasi.length} titik lokasi
                          {buka ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {buka && (
                          <div className="mt-2 flex flex-col divide-y divide-[#ececf3] rounded-lg border border-[#ececf3]">
                            {ev.lokasi.map((l, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-[12.5px] text-[#1a1d29]">
                                    {l.namaJalan} · {l.namaRuas}
                                  </p>
                                  {l.namaKecamatan && <p className="text-[11px] text-[#767884]">Kec. {l.namaKecamatan}</p>}
                                </div>
                                <span className={`shrink-0 text-[12px] ${l.sisa > 0 ? "text-[#0f7a44]" : "text-[#a3a5b3]"}`}>
                                  {l.sisa > 0 ? `sisa ${l.sisa}` : "penuh"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={!ev.bisaIkut}
                            onClick={() => {
                              setErrorAksi(null);
                              setKonfirmasiIkut(ev);
                            }}
                            className={BTN_PRIMARY}
                          >
                            <Shuffle size={15} />
                            Ikut Event Ini
                          </button>
                          {alasan && <p className="text-[12px] text-[#767884]">{alasan}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ===== DATA USAHA (read-only) ===== */}
            <section className={`${CARD_CLS} p-5`}>
              <div className="mb-4 flex items-center gap-2">
                <Store size={17} className="text-[#00288e]" />
                <h3 className="text-[14px] font-semibold text-[#1a1d29]">Data Usaha</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReadOnlyField label="NIK" value={nik} />
                <ReadOnlyField label="Nama Lengkap" value={fullName} />
                <ReadOnlyField label="Tanggal Lahir" value={formatTanggalLahir(dob)} />
                <ReadOnlyField label="Nama Usaha" value={businessName} />
                <ReadOnlyField label="Kategori" value={KATEGORI_LABEL[category] ?? category} />
                <ReadOnlyField label="Jenis Lapak" value={LAPAK_LABEL[stallType] ?? stallType} />
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ===== DIALOG: konfirmasi data usaha ===== */}
      {showConfirmUsaha && (
        <Dialog>
          <div className="px-5 pt-5 pb-3 text-center border-b border-[#ececf3]">
            <h3 className="text-[16px] font-bold text-[#1a1d29]">Periksa Kembali Data Kamu</h3>
            <p className="text-[12px] text-[#767884] mt-1">
              Pastikan semua data sudah benar. Data yang sudah dikirim tidak bisa diubah sembarangan.
            </p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2.5">
            <ConfirmRow label="NIK" value={nik} />
            <ConfirmRow label="Tanggal Lahir" value={formatTanggalLahir(dob)} />
            <ConfirmRow label="Nama Lengkap" value={fullName} />
            <ConfirmRow label="Nama Usaha" value={businessName} />
            <ConfirmRow label="Kategori Dagangan" value={KATEGORI_LABEL[category] ?? category} />
            <ConfirmRow label="Pilihan Lapak" value={LAPAK_LABEL[stallType] ?? stallType} />
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmUsaha(false)}
              disabled={savingUsaha}
              className={`flex-1 ${BTN_SECONDARY}`}
            >
              Periksa Lagi
            </button>
            <button type="button" onClick={() => void simpanUsaha()} disabled={savingUsaha} className={`flex-1 ${BTN_PRIMARY}`}>
              {savingUsaha && <Spinner />}
              {savingUsaha ? "Mengirim..." : "Ya, Kirim"}
            </button>
          </div>
        </Dialog>
      )}

      {/* ===== DIALOG: konfirmasi ikut event ===== */}
      {konfirmasiIkut && (
        <Dialog>
          <div className="px-5 pt-5 pb-3 border-b border-[#ececf3]">
            <h3 className="text-[16px] font-bold text-[#1a1d29]">Ikut {konfirmasiIkut.nama}?</h3>
            <p className="text-[12.5px] text-[#767884] mt-1">
              {formatTanggal(konfirmasiIkut.tanggal)} · {formatJam(konfirmasiIkut.jamMulai)} –{" "}
              {formatJam(konfirmasiIkut.jamSelesai)} WIB
            </p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2 text-[12.5px] text-[#4b4d5a]">
            <p className="flex items-start gap-2">
              <Shuffle size={15} className="mt-0.5 shrink-0 text-[#00288e]" />
              Lokasi dan nomor stan akan <strong>diacak oleh sistem</strong> dari {konfirmasiIkut.lokasi.length} titik lokasi
              event ini, lalu langsung terkunci dan tidak bisa diacak ulang.
            </p>
            <p className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#b45309]" />
              Kalau nanti dibatalkan, kamu tidak bisa ikut event yang sama lagi.
            </p>
            {errorAksi && <p className="text-[#ba1a1a]">{errorAksi}</p>}
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <button
              type="button"
              onClick={() => setKonfirmasiIkut(null)}
              disabled={memproses}
              className={`flex-1 ${BTN_SECONDARY}`}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void ikutEvent(konfirmasiIkut)}
              disabled={memproses}
              className={`flex-1 ${BTN_PRIMARY}`}
            >
              {memproses ? <Spinner /> : <Shuffle size={15} />}
              {memproses ? "Mengacak..." : "Ya, Acak Nomorku"}
            </button>
          </div>
        </Dialog>
      )}

      {/* ===== DIALOG: hasil acak ===== */}
      {hasilIkut && (
        <Dialog>
          <div className="px-5 pt-6 pb-2 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#e3f8ee] flex items-center justify-center">
              <CheckCircle2 size={26} className="text-[#16a34a]" />
            </div>
            <h3 className="mt-3 text-[16px] font-bold text-[#1a1d29]">Kamu Terdaftar!</h3>
            <p className="text-[12.5px] text-[#767884]">{hasilIkut.namaEvent}</p>
            <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wide text-[#00288e]">Nomor Stan</p>
            <p className="text-[34px] font-bold leading-none tracking-tight text-[#00288e]">{hasilIkut.kodeStan}</p>
            <p className="mt-2 text-[13px] font-medium text-[#1a1d29]">
              {hasilIkut.namaJalan} · {hasilIkut.namaRuas}
            </p>
            {hasilIkut.namaKecamatan && <p className="text-[12px] text-[#767884]">Kec. {hasilIkut.namaKecamatan}</p>}
          </div>
          <div className="px-5 pb-5 pt-4">
            <button type="button" onClick={() => setHasilIkut(null)} className={`w-full ${BTN_PRIMARY}`}>
              Oke
            </button>
          </div>
        </Dialog>
      )}

      {/* ===== DIALOG: konfirmasi batal ===== */}
      {konfirmasiBatal && (
        <Dialog>
          <div className="px-5 pt-5 pb-3 border-b border-[#ececf3]">
            <h3 className="text-[16px] font-bold text-[#1a1d29]">Batalkan Pendaftaran?</h3>
            <p className="text-[12.5px] text-[#767884] mt-1">{konfirmasiBatal.namaEvent}</p>
          </div>
          <div className="px-5 py-4 text-[12.5px] text-[#4b4d5a]">
            Nomor stan <strong>{konfirmasiBatal.kodeStan}</strong> di {konfirmasiBatal.namaJalan} · {konfirmasiBatal.namaRuas} akan
            dilepas, dan kamu <strong>tidak bisa ikut event ini lagi</strong>.
            {errorAksi && <p className="mt-2 text-[#ba1a1a]">{errorAksi}</p>}
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <button
              type="button"
              onClick={() => setKonfirmasiBatal(null)}
              disabled={memproses}
              className={`flex-1 ${BTN_SECONDARY}`}
            >
              Tidak Jadi
            </button>
            <button
              type="button"
              onClick={() => void batalEvent(konfirmasiBatal)}
              disabled={memproses}
              className="flex-1 h-10 px-5 bg-[#ba1a1a] text-white text-[13px] font-medium rounded-lg hover:bg-[#93000a] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {memproses && <Spinner />}
              Ya, Batalkan
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

// ========== KOMPONEN ==========
function KartuEventSaya({ k, onBatal }: { k: Keikutsertaan; onBatal: () => void }) {
  const st = STATUS_PESERTA[k.status];
  return (
    <div className={`${CARD_CLS} overflow-hidden`}>
      <div className="h-1 w-full bg-[#00288e]" />
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[1fr_200px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14.5px] font-semibold text-[#1a1d29]">{k.namaEvent}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-[#767884]">
            {formatTanggal(k.tanggal)} · {formatJam(k.jamMulai)} – {formatJam(k.jamSelesai)} WIB
          </p>

          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wide text-[#00288e]">Nomor Stan</p>
          <p className="text-[30px] font-bold leading-none tracking-tight text-[#00288e]">{k.kodeStan}</p>

          <div className="mt-4 flex flex-col gap-1.5">
            <Baris label="Kecamatan" value={k.namaKecamatan ?? "-"} />
            <Baris label="Jalan" value={k.namaJalan} />
            <Baris label="Ruas" value={k.namaRuas} />
            {k.checkInAt && <Baris label="Check-in" value={formatWaktu(k.checkInAt)} />}
          </div>

          {k.bisaBatal && (
            <button type="button" onClick={onBatal} className="mt-4 text-[12.5px] font-medium text-[#ba1a1a] hover:underline">
              Batalkan pendaftaran
            </button>
          )}
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="w-full max-w-[170px] aspect-square rounded-xl overflow-hidden border border-[#e7e8f1] bg-[#f3f4f8] flex items-center justify-center">
            {k.qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCodeUrl(k.qrCode)} alt="Kode QR pedagang" className="w-full h-full object-cover" />
            ) : (
              <QrCode size={48} className="text-[#a3a5b3]" />
            )}
          </div>
          <p className="mt-2 text-[11.5px] text-[#767884]">Tunjukkan QR ini ke petugas saat check-in.</p>
        </div>
      </div>
    </div>
  );
}

function FormUsaha(props: {
  nik: string;
  setNik: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
  fullName: string;
  setFullName: (v: string) => void;
  businessName: string;
  setBusinessName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  stallType: StallType;
  setStallType: (v: StallType) => void;
  error: string | null;
  loading: boolean;
  onSubmit: (e: FormEvent) => void;
}) {
  const pilihLapak = (tipe: "rombong" | "meja", label: string, Icon: typeof ShoppingCart) => (
    <div
      onClick={() => props.setStallType(tipe)}
      role="button"
      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border cursor-pointer transition-all ${
        props.stallType === tipe
          ? "border-[#00288e] bg-[#eef2fd] shadow-[0_0_0_1px_#00288e]"
          : "border-[#e2e5f1] bg-white hover:border-[#b9c2e8] hover:bg-[#f8f9ff]"
      }`}
    >
      <Icon size={18} className="text-[#00288e]" />
      <span className="text-[13px] font-medium text-[#1a1d29]">{label}</span>
    </div>
  );

  return (
    <form onSubmit={props.onSubmit} className="flex flex-col gap-4">
      <section className={`${CARD_CLS} p-5`}>
        <div className="flex items-center gap-2 mb-1">
          <User size={18} className="text-[#00288e]" />
          <h2 className="text-[15px] font-semibold text-[#1a1d29]">Data Usaha</h2>
        </div>
        <p className="text-[12.5px] text-[#767884] mb-4">
          Data ini hanya perlu diisi sekali. Setelah dikirim, NIK dan data usaha tidak dapat diubah sembarangan.
        </p>
        <div className="flex flex-col gap-3">
          <Field label="NIK (Nomor Induk Kependudukan)" htmlFor="nik">
            <div className="relative">
              <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3d6]" />
              <input
                id="nik"
                type="text"
                inputMode="numeric"
                maxLength={16}
                placeholder="Masukkan 16 digit NIK"
                value={props.nik}
                onChange={(e) => props.setNik(e.target.value.replace(/\D/g, ""))}
                className={`${INPUT_CLS} pl-9`}
              />
            </div>
          </Field>
          <Field label="Tanggal Lahir" htmlFor="dob">
            <input id="dob" type="date" value={props.dob} onChange={(e) => props.setDob(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="Nama Lengkap" htmlFor="fullName">
            <input
              id="fullName"
              type="text"
              placeholder="Sesuai KTP"
              value={props.fullName}
              onChange={(e) => props.setFullName(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Nama Usaha" htmlFor="businessName">
            <div className="relative">
              <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3d6]" />
              <input
                id="businessName"
                type="text"
                placeholder="Contoh: Kedai Kopi Senja"
                value={props.businessName}
                onChange={(e) => props.setBusinessName(e.target.value)}
                className={`${INPUT_CLS} pl-9`}
              />
            </div>
          </Field>
          <Field label="Kategori Dagangan" htmlFor="category">
            <select
              id="category"
              value={props.category}
              onChange={(e) => props.setCategory(e.target.value)}
              className={INPUT_CLS}
            >
              <option value="" disabled>
                Pilih Kategori
              </option>
              <option value="makanan_minuman">Makanan dan Minuman</option>
              <option value="bukan_makanan_minuman">Bukan Makanan dan Minuman</option>
            </select>
          </Field>
          <Field label="Pilihan Lapak">
            <div className="grid grid-cols-2 gap-2">
              {pilihLapak("rombong", "Rombong", ShoppingCart)}
              {pilihLapak("meja", "Meja", Table2)}
            </div>
          </Field>
        </div>
      </section>

      {props.error && (
        <p className="w-full text-[12.5px] text-[#ba1a1a]" role="alert">
          {props.error}
        </p>
      )}

      <div>
        <button type="submit" disabled={props.loading} className={`w-full sm:w-auto sm:min-w-[220px] ${BTN_PRIMARY}`}>
          {props.loading ? <Spinner /> : <Save size={15} />}
          Simpan & Lanjut Pilih Event
        </button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#4b4d5a]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Dialog({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-xl overflow-hidden">{children}</div>
    </div>
  );
}

function Spinner() {
  return <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />;
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-[#a3743f]">{label}</span>
      <span className="text-right text-[13px] font-semibold text-[#1a1d29]">{value}</span>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-[#767884]">{label}</span>
      <span className="text-[13px] font-medium text-[#1a1d29]">{value || "-"}</span>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-[#767884]">{label}</span>
      <span className="text-right text-[13px] font-medium text-[#1a1d29]">{value || "-"}</span>
    </div>
  );
}