// Tipe-tipe ini mengikuti persis JSON tag di
// backend/modules/petugas/manajemen-lapak/entity/manajemen_lapak_entity.go
// Jangan ubah nama field tanpa mengubah entity Go-nya juga.

export interface RuasData {
  id: string;
  namaRuas: string;
  urutan: number;
  nomorMulai: number; // read-only -- dihitung otomatis backend
  nomorSelesai: number; // read-only -- dihitung otomatis backend
  kuota: number;
  // terisiLama/terisiBaru -- read-only, dihitung backend dari lapak_klaim
  // (status aktif) di event yang lagi aktif, dipecah dari
  // pedagang_profiles.submitted_at (null = lama, terisi = baru). 0/0 kalau
  // gak ada event aktif.
  terisiLama: number;
  terisiBaru: number;
}

export interface JalanLengkapData {
  id: string;
  kodeJalan: string;
  namaJalan: string;
  kapasitas: number;
  kuotaEvent: number;
  terisi: number;
  ruas: RuasData[];
}

export interface KecamatanLengkapData {
  kecamatanId: string | null;
  kecamatan: string;
  jalan: JalanLengkapData[];
}

export interface JalanEventInput {
  jalanId: string;
  kuota: number;
}

export interface CreateEventRequest {
  namaEvent: string;
  tanggal: string; // YYYY-MM-DD
  jamMulai: string; // HH:MM
  jamSelesai: string; // HH:MM
  pendaftaranMulai: string; // RFC3339
  pendaftaranSelesai: string; // RFC3339
  kuotaTotal: number;
  keterangan: string;
  jalan: JalanEventInput[];
}

export interface JalanRingkasKuota {
  jalanId: string;
  namaJalan: string;
  kuota: number;
  terisi: number;
}

export interface EventDTO {
  id: string;
  namaEvent: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  pendaftaranMulai: string | null;
  pendaftaranSelesai: string | null;
  kuotaTotal: number;
  keterangan: string;
  status: string;
  isActive: boolean;
  jalan: JalanRingkasKuota[];
}

export interface KuotaEventDTO {
  eventId: string;
  kuotaTotal: number;
  terisi: number;
  sisa: number;
}

// CreateRuasRequest/UpdateRuasRequest -- urutan gak lagi dikirim dari
// FE (ditentukan otomatis backend). Petugas cuma isi namaRuas & kuota.
export interface CreateRuasRequest {
  jalanId: string;
  namaRuas: string;
  kuota: number;
}

export interface UpdateRuasRequest {
  namaRuas: string;
  kuota: number;
}

export interface CreateJalanBaruRequest {
  kecamatanId: string;
  kodeJalan: string;
  namaJalan: string;
  kapasitas: number;
}

// UpdateJalanBaruRequest -- edit jalan yang sudah ada (kode/nama/kapasitas).
// Kecamatan gak ikut diedit lewat sini.
export interface UpdateJalanBaruRequest {
  kodeJalan: string;
  namaJalan: string;
  kapasitas: number;
}

export interface PedagangLamaItem {
  pedagangId: string;
  nik: string;
  namaLengkap: string;
  namaUsaha: string;
  kategori: string;
  kontak: string;
  lokasi: string;
  status: string;
  statusPedagang: "lama" | "baru";
}

export interface PedagangLamaResponse {
  data: PedagangLamaItem[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Tambah pedagang -- manual ("Tambah Data") atau import file
// (JSON/CSV). Keduanya bikin pedagang berstatus "lama".
// ============================================================

export interface CreatePedagangRequest {
  namaLengkap: string;
  nik: string;
  email: string;
  namaUsaha: string;
  jenisDagangan?: string; // "makanan_minuman" | "bukan_makanan_minuman"
  phone?: string;
  alamat?: string;
  lokasiLapak?: string;
  tanggalLahir?: string; // YYYY-MM-DD
  jenisLapak?: string; // "rombong" | "meja"
}

// CreatePedagangResult -- passwordnya di-generate sistem (bukan
// petugas yang ngarang), dibalikin sekali di sini biar bisa
// disampein ke pedagangnya.
export interface CreatePedagangResult {
  pedagangId: string;
  email: string;
  password: string;
}

export interface ImportPedagangResult {
  berhasil: number;
  gagal: number;
  errors: string[];
}

// ============================================================
// Laporan (kehadiran + omset) -- endpoint /api/petugas/laporan,
// bukan bagian dari modul manajemen-lapak backend, tapi sekarang
// ditampilkan sebagai salah satu tab di halaman ini.
// ============================================================

export type StatusKehadiran = "check-in" | "check-out" | "belum-hadir";

export interface KehadiranItem {
  id: string;
  pedagangId: string;
  namaUsaha: string;
  pemilik: string;
  kategori: string;
  lokasiLapak: string;
  waktuCheckin: string;
  waktuCheckout?: string | null;
  omset?: number | null;
  status: StatusKehadiran;
}

export interface LaporanResponse {
  totalTerdaftar: number;
  totalCheckin: number;
  totalCheckout: number;
  totalOmset: number;
  rataOmset: number;
  persenHadir: number;
  data: KehadiranItem[];
  page: number;
  limit: number;
  total: number;
}

export interface StatsResponse {
  totalTerdaftar: number;
  totalCheckin: number;
  totalCheckout: number;
  totalOmset: number;
  rataOmset: number;
  persenHadir: number;
}

export type TabKey = "event" | "ruas-kuota" | "pedagang-lama" | "laporan";

// ============================================================
// Registrasi -- dipakai RegistrasiTab.tsx. Endpoint backend-nya
// belum ada (masih dikerjakan tim lain, lihat komentar di
// RegistrasiTab.tsx), tipe di bawah cuma bentuk sementara biar
// file itu tetap bisa dikompilasi.
// ============================================================

export interface RegistrasiItem {
  id: string;
  kodeRegistrasi: string;
  namaEvent: string;
  tanggalEvent: string;
  nik: string;
  namaLengkap: string;
  namaUsaha: string;
  kategori: string;
  lokasi: string;
  waktu: string;
}

export interface RegistrasiResponse {
  data: RegistrasiItem[];
  total: number;
  page: number;
  limit: number;
}