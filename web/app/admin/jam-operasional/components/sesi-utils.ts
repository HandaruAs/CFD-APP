// Helper tanggal/jam bersama untuk komponen sesi di Jam Operasional.
// Semua tanggal dihitung di zona waktu browser (WIB untuk petugas), sama
// seperti CURRENT_DATE yang dipakai backend untuk "sesi hari ini".

/** Tanggal hari ini (lokal) dalam format YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "06:00:05" / "06:00" -> "06.00" */
export function jamTampil(jam: string | null | undefined): string {
  return (jam ?? "").slice(0, 5).replace(":", ".");
}

/** Ubah "YYYY-MM-DD" jadi Date lokal jam 00:00 (bukan UTC). */
export function tanggalLokal(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

/** "2026-10-04" -> "Minggu, 4 Oktober 2026" */
export function tanggalPanjang(iso: string): string {
  const d = tanggalLokal(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Potongan tanggal untuk "kalender kecil" di daftar sesi. */
export function tanggalRingkas(iso: string) {
  const d = tanggalLokal(iso);
  if (Number.isNaN(d.getTime())) return { hari: "", tgl: "", bulan: "" };
  return {
    hari: d.toLocaleDateString("id-ID", { weekday: "short" }),
    tgl: String(d.getDate()),
    bulan: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
  };
}

// ============================================================
// Sesi = event di sistem multi-event (GET/POST /api/admin/events).
// Status sekarang dihitung BACKEND (scheduler tiap menit), bukan lagi dari
// jam di browser: draft -> terjadwal -> berlangsung -> selesai_normal.
// ============================================================

export type StatusEvent =
  | "draft"
  | "terjadwal"
  | "berlangsung"
  | "diperpanjang"
  | "diakhiri_awal"
  | "selesai_normal"
  | "dibatalkan";

export type StatusPendaftaran = "belum_dibuka" | "dibuka" | "ditutup";

export interface SesiEvent {
  id: string;
  nama: string;
  tanggal: string; // YYYY-MM-DD
  jamMulai: string; // HH:MM
  jamSelesai: string;
  status: StatusEvent;
  statusPendaftaran: StatusPendaftaran;
  pendaftaranBukaAt: string | null;
  pendaftaranTutupAt: string | null;
  lepasKuotaAt: string | null;
  kuotaLamaDilepas: boolean;
  keterangan: string | null;
  // Kuota PER EVENT: diisi admin (total & jatah pedagang lama),
  // kuota pedagang baru = total - lama.
  kuotaTotal: number;
  kuotaLama: number;
  kuotaBaru: number;
  terisiLama: number;
  terisiBaru: number;
  sisaLama: number;
  sisaBaru: number;
  jumlahTitik: number;
  kapasitasTitik: number; // jumlah tempat fisik di semua titik lokasi
}

export interface TitikLokasi {
  id: string;
  ruasId: string;
  namaRuas: string;
  jalanId: string;
  namaJalan: string;
  kecamatanId: string | null;
  namaKecamatan: string | null;
  kapasitas: number; // berapa lapak yang muat di titik ini
  terisi: number;
  sisa: number;
}

export interface SesiDetail extends SesiEvent {
  lapak: TitikLokasi[];
}

export interface HasilAcakLokasi {
  scopeLabel: string;
  jumlahKandidat: number;
  ditambahkan: TitikLokasi[];
}

export type Cakupan = "kota" | "kecamatan" | "jalan" | "ruas";

/** Sesi yang masih tampil di "Sesi Terjadwal" (belum selesai/batal). */
export function sesiAktif(s: SesiEvent): boolean {
  return s.status === "draft" || s.status === "terjadwal" || s.status === "berlangsung" || s.status === "diperpanjang";
}

export function sedangBerlangsung(s: SesiEvent): boolean {
  return s.status === "berlangsung" || s.status === "diperpanjang";
}

/** ISO (dari backend) -> "3 Okt, 18.00 WIB" */
export function waktuTampil(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) +
    " WIB"
  );
}

/** Error dari backend, membawa `code` (mis. "KAPASITAS_KURANG") kalau ada. */
export class ApiEventError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

/** Fetch ke backend dengan token login; lempar ApiEventError berisi pesan backend. */
export async function apiEvent<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL belum diset!");
  const token = typeof window !== "undefined" ? localStorage.getItem("cfd_token") : null;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiEventError(body?.error ?? `Permintaan gagal (${res.status})`, body?.code);
  return body as T;
}