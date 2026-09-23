import type {
  KecamatanLengkapData,
  CreateEventRequest,
  EventDTO,
  KuotaEventDTO,
  CreateRuasRequest,
  UpdateRuasRequest,
  CreateJalanBaruRequest,
  UpdateJalanBaruRequest,
  LaporanResponse,
  StatsResponse,
  RegistrasiResponse,
} from "./types";

// CATATAN: sesuaikan BASE_URL / cara ambil token ini dengan lib/api client
// yang sudah ada di project-mu (mis. kalau sudah ada helper apiFetch/axios
// instance dengan Authorization header, pakai itu saja dan hapus file ini).
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cfd_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error ?? `Gagal memuat data (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

// ============================================================
// 1. Wilayah (kecamatan -> jalan -> ruas)
// ============================================================

export function getWilayah() {
  return request<{ data: KecamatanLengkapData[] }>(
    "/api/petugas/manajemen-lapak/wilayah"
  );
}

// ============================================================
// 2. Event
// ============================================================

export function listEvents() {
  return request<{ data: EventDTO[] }>("/api/petugas/manajemen-lapak/event");
}

export function createEvent(payload: CreateEventRequest) {
  return request<{ message: string; id: string }>(
    "/api/petugas/manajemen-lapak/event",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function setEventAktif(eventId: string, aktif: boolean) {
  return request<{ message: string }>(
    `/api/petugas/manajemen-lapak/event/${eventId}/aktif`,
    { method: "PATCH", body: JSON.stringify({ aktif }) }
  );
}

export function getKuotaEvent(eventId: string) {
  return request<KuotaEventDTO>(
    `/api/petugas/manajemen-lapak/event/${eventId}/kuota`
  );
}

export function deleteEvent(eventId: string) {
  return request<{ message: string }>(
    `/api/petugas/manajemen-lapak/event/${eventId}`,
    { method: "DELETE" }
  );
}

// ============================================================
// 3. Ruas
// ============================================================

export function createRuas(payload: CreateRuasRequest) {
  return request<{ message: string; id: string }>(
    "/api/petugas/manajemen-lapak/ruas",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function updateRuas(id: string, payload: UpdateRuasRequest) {
  return request<{ message: string }>(
    `/api/petugas/manajemen-lapak/ruas/${id}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

export function deleteRuas(id: string) {
  return request<{ message: string }>(
    `/api/petugas/manajemen-lapak/ruas/${id}`,
    { method: "DELETE" }
  );
}

// ============================================================
// 3b. Kecamatan & Jalan (tabel 1 & 2 di UI 4-tabel Ruas & Kuota)
// ============================================================

export function createKecamatan(namaKecamatan: string) {
  return request<{ message: string; id: string }>(
    "/api/petugas/manajemen-lapak/kecamatan",
    { method: "POST", body: JSON.stringify({ namaKecamatan }) }
  );
}

export function createJalanBaru(payload: CreateJalanBaruRequest) {
  return request<{ message: string; id: string }>(
    "/api/petugas/manajemen-lapak/jalan",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

// updateJalanBaru -- edit kode/nama/kapasitas jalan yang sudah ada.
// Sama kayak ruas, bisa dipakai kapan aja (gak perlu event aktif).
export function updateJalanBaru(id: string, payload: UpdateJalanBaruRequest) {
  return request<{ message: string }>(
    `/api/petugas/manajemen-lapak/jalan/${id}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

export function deleteKecamatan(id: string) {
  return request<{ message: string }>(
    `/api/petugas/manajemen-lapak/kecamatan/${id}`,
    { method: "DELETE" }
  );
}

export function deleteJalanBaru(id: string) {
  return request<{ message: string }>(
    `/api/petugas/manajemen-lapak/jalan/${id}`,
    { method: "DELETE" }
  );
}

// assignJalanKeEventAktif -- solusi buat jalan yang dibuat SETELAH
// event-nya aktif: assign/update kuotanya ke event yang lagi aktif
// kapan aja, gak perlu edit ulang event dari awal.
export function assignJalanKeEventAktif(jalanId: string, kuota: number) {
  return request<{ message: string }>(
    `/api/petugas/manajemen-lapak/jalan/${jalanId}/assign-event`,
    { method: "POST", body: JSON.stringify({ kuota }) }
  );
}

// ============================================================
// 4. Laporan (kehadiran + omset) -- endpoint lama /api/petugas/laporan,
// sekarang cuma ditampilkan sebagai tab di sini, bukan halaman sendiri.
// ============================================================

export function getLaporan(params: {
  startDate: string;
  endDate: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    search: params.search ?? "",
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });
  return request<LaporanResponse>(`/api/petugas/laporan?${qs.toString()}`);
}

export function getLaporanStats(params: { startDate: string; endDate: string }) {
  const qs = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return request<StatsResponse>(`/api/petugas/laporan/stats?${qs.toString()}`);
}

// ============================================================
// 6. Registrasi -- BELUM ADA endpoint backend-nya (masih
// dikerjakan tim lain). Fungsi ini cuma stub biar RegistrasiTab.tsx
// bisa dikompilasi; panggilannya akan gagal (404) dan sudah
// ditangkap RegistrasiTab lewat state "belum tersedia". Ganti path
// di bawah begitu endpoint aslinya jadi.
// ============================================================

export function getRegistrasi(params: {
  search?: string;
  ruasId?: string;
  eventId?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.ruasId) qs.set("ruasId", params.ruasId);
  if (params.eventId) qs.set("eventId", params.eventId);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 20));
  return request<RegistrasiResponse>(`/api/petugas/manajemen-lapak/registrasi?${qs.toString()}`);
}