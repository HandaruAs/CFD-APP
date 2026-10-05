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
  // Hasil acak lapak dari form Tambah Sesi -- dibuat di frontend SEBELUM
  // sesi disimpan, lalu dikirim sekaligus di request simpan ini (satu
  // request). Backend perlu menyimpan `acak.slot` ke lapak_slot untuk sesi
  // yang baru dibuat. Lihat CATATAN-BACKEND.md.
  acak?: AcakSesiPayload;
}

/** Satu lokasi lapak hasil acak. ruasId null = jalan belum dibagi ruas. */
export interface AcakSlot {
  jalanId: string;
  ruasId: string | null;
  nomorLapak: string; // "<KODE_EVENT>-XXXXXX"
}

export interface AcakSesiPayload {
  scope: "kota" | "kecamatan" | "jalan" | "ruas";
  kecamatanId?: string | null;
  jalanId?: string | null;
  ruasId?: string | null;
  kodeEvent: string;
  slot: AcakSlot[];
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

// Manajemen Lapak sekarang cuma mengelola data wilayah (kecamatan, jalan,
// ruas). Kuota TIDAK diisi di sini lagi -- kuota diatur per sesi di Jam
// Operasional (Tambah Sesi). Urutan ruas ditentukan otomatis backend.
export interface CreateRuasRequest {
  jalanId: string;
  namaRuas: string;
}

export interface UpdateRuasRequest {
  namaRuas: string;
}

export interface CreateJalanBaruRequest {
  kecamatanId: string;
  kodeJalan: string;
  namaJalan: string;
}

// UpdateJalanBaruRequest -- edit kode/nama jalan yang sudah ada.
// Kecamatan gak ikut diedit lewat sini.
export interface UpdateJalanBaruRequest {
  kodeJalan: string;
  namaJalan: string;
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

// Tab "Event" sudah dihapus -- pembuatan sesi/event pindah ke menu Jam
// Operasional (tombol "Tambah Sesi").
export type TabKey = "wilayah" | "laporan";

// ============================================================
// Acak Lapak (POST /api/petugas/acak-lapak/generate-slot)
// ============================================================

export interface GenerateSlotRequest {
  // ID sesi tujuan (cfd_sessions.id). Dikirim frontend supaya acak bisa
  // dijalankan kapan saja untuk sesi mana pun, bukan cuma sesi hari ini.
  sessionId?: string;
  scope: "kota" | "kecamatan" | "jalan" | "ruas";
  kecamatanId?: string | null;
  jalanId?: string | null;
  ruasId?: string | null;
  // true = lokasi lama yang BELUM diklaim di sesi ini dihapus dulu.
  // Untuk superadmin, penghapusan ini berlaku ke SEMUA jalan di sesi itu.
  gantiPoolLama: boolean;
}

export interface GenerateSlotResponse {
  scope: string;
  scopeLabel: string;
  jumlahJalan: number;
  jumlahRuas: number;
  jumlahSlotDibuat: number;
  jumlahSlotDihapus: number;
  jumlahSlotAda: number;
}

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