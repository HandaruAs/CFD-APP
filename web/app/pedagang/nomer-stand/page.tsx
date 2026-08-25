"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  User,
  Save,
  ArrowLeft,
  CheckCircle2,
  Store,
  QrCode,
  AlertTriangle,
  Inbox,
} from "lucide-react";

interface DataPendaftar {
  nik: string;
  namaLengkap: string;
  tanggalLahir: string;
  namaUsaha: string;
  kategori: string;
  jenisLapak: string;
}

interface Kecamatan {
  id: string;
  nama: string;
}

interface Jalan {
  id: string;
  kodeJalan: string;
  namaJalan: string;
  kapasitas: number;
  terisi: number;
  sisa: number;
  penuh: boolean;
}

interface HasilAlokasi {
  nomorStand: string;
  kecamatan: string;
  namaJalan: string;
}

const KATEGORI_LABEL: Record<string, string> = {
  makanan_minuman: "Makanan dan Minuman",
  bukan_makanan_minuman: "Bukan Makanan dan Minuman",
};

const LAPAK_LABEL: Record<string, string> = {
  rombong: "Rombong",
  meja: "Meja",
};

const EMPTY_DATA_PENDAFTAR: DataPendaftar = {
  nik: "",
  namaLengkap: "",
  tanggalLahir: "",
  namaUsaha: "",
  kategori: "",
  jenisLapak: "",
};

function apiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("cfd_token") : null;
  return { Authorization: `Bearer ${token ?? ""}` };
}

// QR code-nya di-generate di frontend, isinya cuma pedagang_profiles.id --
// itu yang dicari backend (scan_usecase.go -> VerifyQRCode -> GetPedagangByID)
// pas petugas scan. Nggak butuh endpoint generate QR di backend.
function qrCodeUrl(pedagangId: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    pedagangId
  )}`;
}

export default function PilihLokasiStanPage() {
  const router = useRouter();

  // ---- Data pendaftar (dari pengajuan usaha) ----
  const [dataPendaftar, setDataPendaftar] = useState<DataPendaftar>(EMPTY_DATA_PENDAFTAR);
  const [checkingPendaftar, setCheckingPendaftar] = useState(true);
  const [sudahDaftar, setSudahDaftar] = useState(false);

  // ID pedagang_profiles -- ini isi kode QR-nya. Diambil dari endpoint
  // yang sama dengan data pendaftar, disimpan terpisah biar nggak nunggu
  // urutan effect lain buat nge-render QR-nya.
  const [pedagangId, setPedagangId] = useState("");

  // ---- Status klaim lapak (cek dulu apakah udah pernah klaim) ----
  const [checkingStatus, setCheckingStatus] = useState(true);

  // ---- Kecamatan & jalan ----
  const [kecamatanList, setKecamatanList] = useState<Kecamatan[]>([]);
  const [loadingKecamatan, setLoadingKecamatan] = useState(true);
  const [kecamatanId, setKecamatanId] = useState("");

  const [jalanList, setJalanList] = useState<Jalan[]>([]);
  const [loadingJalan, setLoadingJalan] = useState(false);
  const [jalanId, setJalanId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilAlokasi | null>(null);

  // ---- Ambil data pendaftar ----
  useEffect(() => {
    async function fetchDataPendaftar() {
      try {
        const res = await fetch(apiUrl("/api/pedagang/pengajuan"), {
          headers: authHeaders(),
        });
        if (!res.ok) {
          setCheckingPendaftar(false);
          return;
        }

        const data = await res.json();
        if (!data.has_pengajuan) {
          setCheckingPendaftar(false);
          return;
        }

        setSudahDaftar(true);
        setPedagangId(data.id ?? "");
        setDataPendaftar({
          nik: data.nik ?? "",
          namaLengkap: data.nama_lengkap ?? "",
          tanggalLahir: data.tanggal_lahir
            ? new Date(data.tanggal_lahir).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "",
          namaUsaha: data.nama_usaha ?? "",
          kategori: KATEGORI_LABEL[data.jenis_dagangan] ?? data.jenis_dagangan ?? "",
          jenisLapak: LAPAK_LABEL[data.jenis_lapak] ?? data.jenis_lapak ?? "",
        });
      } catch {
        // gagal fetch -- anggap belum daftar, fail closed
      } finally {
        setCheckingPendaftar(false);
      }
    }
    fetchDataPendaftar();
  }, []);

  // ---- Cek apakah udah pernah klaim lapak di sesi ini ----
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(apiUrl("/api/pedagang/lapak/status"), {
          headers: authHeaders(),
        });
        if (!res.ok) {
          setCheckingStatus(false);
          return;
        }
        const data = await res.json();
        if (data.sudah_klaim) {
          setHasil({
            nomorStand: data.nomor_lapak ?? "-",
            kecamatan: data.nama_kecamatan ?? "-",
            namaJalan: data.nama_jalan ?? "-",
          });
        }
      } catch {
        // gagal fetch -- biarin user isi form seperti biasa
      } finally {
        setCheckingStatus(false);
      }
    }
    fetchStatus();
  }, []);

  // ---- Ambil daftar kecamatan ----
  useEffect(() => {
    async function fetchKecamatan() {
      try {
        const res = await fetch(apiUrl("/api/pedagang/lapak/kecamatan"), {
          headers: authHeaders(),
        });
        if (!res.ok) {
          setLoadingKecamatan(false);
          return;
        }
        const data = await res.json();
        setKecamatanList(data.kecamatan ?? []);
      } catch {
        setKecamatanList([]);
      } finally {
        setLoadingKecamatan(false);
      }
    }
    fetchKecamatan();
  }, []);

  // ---- Ambil daftar jalan begitu kecamatan dipilih ----
  useEffect(() => {
    if (!kecamatanId) return;

    let cancelled = false;

    async function fetchJalan() {
      setLoadingJalan(true);
      setJalanId("");
      setError(null);
      try {
        const res = await fetch(
          apiUrl(`/api/pedagang/lapak/jalan?kecamatan_id=${kecamatanId}`),
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(data.error ?? "Gagal mengambil daftar jalan");
            setJalanList([]);
          }
          return;
        }
        if (!cancelled) setJalanList(data.jalan ?? []);
      } catch {
        if (!cancelled) {
          setError("Gagal mengambil daftar jalan");
          setJalanList([]);
        }
      } finally {
        if (!cancelled) setLoadingJalan(false);
      }
    }

    fetchJalan();
    return () => {
      cancelled = true;
    };
  }, [kecamatanId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jalanId) {
      setError("Pilih jalan terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/pedagang/lapak/klaim"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ jalan_id: jalanId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengklaim lapak");
      }

      const namaKecamatan =
        kecamatanList.find((k) => k.id === kecamatanId)?.nama ?? "-";

      setHasil({
        nomorStand: data.nomor_lapak,
        kecamatan: namaKecamatan,
        namaJalan: data.nama_jalan,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const isLoadingAwal = checkingPendaftar || checkingStatus;

  return (
    <main className="w-full min-h-screen flex items-start justify-center px-4 py-10 bg-[#f6f7fb]">
      <div className="w-full max-w-[720px]">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <button
              type="button"
              onClick={handleBack}
              className="text-[#4b4d5a] hover:text-[#1a1d29] transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[22px] leading-tight font-bold text-[#1a1d29]">
              {hasil ? "Alokasi Stan Dikonfirmasi" : "Pilih Lokasi Stan"}
            </h1>
          </div>
          <p className="text-[13px] text-[#767884] pl-8">
            {hasil
              ? "Stan Anda telah berhasil dialokasikan. Silakan tunjukkan kode QR ini kepada petugas."
              : "Silakan pilih lokasi stan untuk partisipasi Anda di Car Free Day."}
          </p>
        </div>

        {isLoadingAwal && !hasil && (
          <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] p-8 text-center text-[13px] text-[#767884]">
            Memuat data...
          </div>
        )}

        {/* ================= TAMPILAN HASIL ================= */}
        {hasil && !isLoadingAwal && (
          <div className="flex flex-col gap-4">
            {/* Banner sukses */}
            <div className="w-full bg-[#e3f8ee] border border-[#bfeed7] rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-[#0f7a44]">
                  Alokasi Berhasil
                </p>
                <p className="text-[12.5px] text-[#1a7a52]">
                  Detail stan telah disimpan ke dalam sistem.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom kiri */}
              <div className="flex flex-col gap-4">
                {/* Nomor Stan */}
                <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] overflow-hidden">
                  <div className="h-1 w-full bg-[#00288e]" />
                  <div className="px-5 py-5 text-center">
                    <p className="text-[10.5px] font-semibold text-[#00288e] tracking-wide uppercase mb-1">
                      Nomor Stan
                    </p>
                    <p className="text-[32px] font-bold text-[#00288e] leading-none mb-4">
                      {hasil.nomorStand}
                    </p>
                    <div className="w-full h-px bg-[#ececf3] mb-4" />
                    <div className="flex flex-col gap-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#a3743f]">
                          Kecamatan
                        </span>
                        <span className="text-[13px] font-semibold text-[#1a1d29]">
                          {hasil.kecamatan}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#a3743f]">
                          Nama Jalan
                        </span>
                        <span className="text-[13px] font-semibold text-[#1a1d29]">
                          {hasil.namaJalan}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verifikasi Pedagang */}
                <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5 text-center">
                  <h3 className="text-[14px] font-semibold text-[#1a1d29] mb-3">
                    Verifikasi Pedagang
                  </h3>
                  <div className="w-full aspect-square max-w-[180px] mx-auto rounded-xl overflow-hidden border border-[#e7e8f1] bg-[#f3f4f8] flex items-center justify-center mb-3">
                    {pedagangId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrCodeUrl(pedagangId)}
                        alt="Kode QR verifikasi pedagang"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <QrCode size={56} className="text-[#a3a5b3]" />
                    )}
                  </div>
                  <p className="text-[12px] text-[#767884]">
                    <span className="font-medium text-[#1a1d29]">Pindai</span>{" "}
                    untuk memverifikasi identitas pedagang dan alokasi stan.
                  </p>
                </div>
              </div>

              {/* Kolom kanan */}
              <div className="flex flex-col gap-4">
                {/* Data Pedagang */}
                <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={17} className="text-[#00288e]" />
                    <h3 className="text-[14px] font-semibold text-[#1a1d29]">
                      Data Pedagang
                    </h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-[#00288e] mb-1">
                        NIK
                      </p>
                      <div className="w-full h-9 px-3 flex items-center bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1]">
                        {dataPendaftar.nik || "-"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[#00288e] mb-1">
                        Nama Lengkap
                      </p>
                      <div className="w-full h-9 px-3 flex items-center bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1]">
                        {dataPendaftar.namaLengkap || "-"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[#00288e] mb-1">
                        Tanggal Lahir
                      </p>
                      <div className="w-full h-9 px-3 flex items-center bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1]">
                        {dataPendaftar.tanggalLahir || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Usaha */}
                <div className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Store size={17} className="text-[#00288e]" />
                    <h3 className="text-[14px] font-semibold text-[#1a1d29]">
                      Data Usaha
                    </h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-[#00288e] mb-1">
                        Nama Usaha
                      </p>
                      <div className="w-full h-9 px-3 flex items-center bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1]">
                        {dataPendaftar.namaUsaha || "-"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[#00288e] mb-1">
                        Kategori Usaha
                      </p>
                      <div className="w-full h-9 px-3 flex items-center bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1]">
                        {dataPendaftar.kategori || "-"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-[#00288e] mb-1">
                        Pilihan Lapak
                      </p>
                      <div className="w-full h-9 px-3 flex items-center bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1]">
                        {dataPendaftar.jenisLapak || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= FORM PILIH LOKASI ================= */}
        {!hasil && !isLoadingAwal && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Lokasi Penempatan */}
            <section className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-[#00288e]" />
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">
                  Lokasi Penempatan
                </h2>
              </div>

              <div className="w-full flex flex-col gap-1.5 mb-4">
                <label
                  htmlFor="kecamatan"
                  className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide"
                >
                  Kecamatan
                </label>
                <select
                  id="kecamatan"
                  value={kecamatanId}
                  onChange={(e) => {
                    setKecamatanId(e.target.value);
                    setJalanList([]);
                    setJalanId("");
                  }}
                  disabled={loadingKecamatan || !sudahDaftar}
                  className="w-full box-border h-10 px-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all appearance-none bg-no-repeat disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%235b5d6b' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
                    backgroundPosition: "right 0.75rem center",
                  }}
                >
                  <option value="" disabled>
                    {loadingKecamatan ? "Memuat kecamatan..." : "Pilih Kecamatan"}
                  </option>
                  {kecamatanList.map((kec) => (
                    <option key={kec.id} value={kec.id}>
                      {kec.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilihan Jalan -- muncul setelah kecamatan dipilih */}
              {kecamatanId && (
                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                    Pilih Jalan
                  </label>

                  {loadingJalan ? (
                    <p className="text-[12.5px] text-[#767884] py-2">
                      Memuat daftar jalan...
                    </p>
                  ) : jalanList.length === 0 ? (
                    <div className="flex items-center gap-2 text-[12.5px] text-[#767884] py-2">
                      <Inbox size={14} />
                      Belum ada jalan tersedia di kecamatan ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {jalanList.map((j) => {
                        const selected = jalanId === j.id;
                        return (
                          <button
                            key={j.id}
                            type="button"
                            disabled={j.penuh}
                            onClick={() => setJalanId(j.id)}
                            className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                              j.penuh
                                ? "opacity-50 cursor-not-allowed border-[#e2e5f1] bg-[#f6f7fb]"
                                : selected
                                ? "border-[#00288e] bg-[#eff4ff] ring-2 ring-[#00288e]/15"
                                : "border-[#e2e5f1] bg-white hover:border-[#00288e]/40"
                            }`}
                          >
                            <p className="text-[13px] font-semibold text-[#1a1d29]">
                              {j.namaJalan}
                            </p>
                            <p
                              className={`text-[11.5px] mt-0.5 ${
                                j.penuh ? "text-[#ba1a1a]" : "text-[#767884]"
                              }`}
                            >
                              {j.penuh
                                ? "Penuh"
                                : `Sisa ${j.sisa} dari ${j.kapasitas} slot`}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Data Pendaftar */}
            <section className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
              <div className="flex items-center gap-2 mb-1">
                <User size={18} className="text-[#00288e]" />
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">
                  Data Pendaftar
                </h2>
              </div>

              {!sudahDaftar ? (
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#ba1a1a] mb-4">
                  <AlertTriangle size={13} />
                  Anda belum mendaftar, daftar terlebih dahulu
                </p>
              ) : (
                <p className="text-[12.5px] text-[#767884] mb-4">
                  Data ini diambil secara otomatis dari pendaftaran Anda dan
                  tidak dapat diubah di halaman ini.
                </p>
              )}

              <div className="flex flex-col gap-3">
                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                    NIK
                  </label>
                  <input
                    type="text"
                    value={dataPendaftar.nik}
                    disabled
                    readOnly
                    className="w-full box-border h-10 px-3 bg-white rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1] cursor-not-allowed"
                  />
                </div>

                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                    Tanggal Lahir
                  </label>
                  <input
                    type="text"
                    value={dataPendaftar.tanggalLahir}
                    disabled
                    readOnly
                    className="w-full box-border h-10 px-3 bg-white rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1] cursor-not-allowed"
                  />
                </div>

                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={dataPendaftar.namaLengkap}
                    disabled
                    readOnly
                    className="w-full box-border h-10 px-3 bg-white rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1] cursor-not-allowed"
                  />
                </div>

                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                    Nama Usaha (UMKM)
                  </label>
                  <input
                    type="text"
                    value={dataPendaftar.namaUsaha}
                    disabled
                    readOnly
                    className="w-full box-border h-10 px-3 bg-white rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1] cursor-not-allowed"
                  />
                </div>

                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={dataPendaftar.kategori}
                    disabled
                    readOnly
                    className="w-full box-border h-10 px-3 bg-white rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1] cursor-not-allowed"
                  />
                </div>

                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide">
                    Jenis Lapak
                  </label>
                  <input
                    type="text"
                    value={dataPendaftar.jenisLapak}
                    disabled
                    readOnly
                    className="w-full box-border h-10 px-3 bg-white rounded-lg text-[13px] text-[#1a1d29] border border-[#e2e5f1] cursor-not-allowed"
                  />
                </div>
              </div>
            </section>

            {error && (
              <p className="w-full text-[12.5px] text-[#ba1a1a]" role="alert">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="w-full flex gap-3">
              <button
                type="submit"
                disabled={loading || !sudahDaftar || !jalanId}
                className="flex-1 sm:flex-none sm:w-auto sm:min-w-[220px] h-11 px-5 bg-[#00288e] text-white text-[13px] font-medium rounded-lg shadow-[0_4px_10px_-3px_rgba(0,40,142,0.4)] hover:bg-[#173bab] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {loading ? "Menyimpan..." : "Simpan Pilihan Stan"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none sm:w-auto h-11 px-5 bg-white text-[#4b4d5a] border border-[#e2e5f1] text-[13px] font-medium rounded-lg hover:bg-[#f5f7fe] active:scale-[0.98] transition-all"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}