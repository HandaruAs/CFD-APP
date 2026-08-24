"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  User,
  Save,
  ArrowLeft,
  CheckCircle2,
  Store,
  QrCode,
} from "lucide-react";

interface DataPendaftar {
  nik: string;
  namaLengkap: string;
  tanggalLahir: string;
  namaUsaha: string;
  kategori: string;
  jenisLapak: string;
}

interface HasilAlokasi {
  nomorStand: string;
  kecamatan: string;
  namaJalan: string;
  qrUrl?: string;
}

function PilihLokasiStanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Daftar kecamatan akan diisi oleh petugas (sumber datanya di luar
  // scope halaman ini — backend/API yang mengaturnya). Untuk sekarang
  // dikosongkan dulu.
  const [kecamatanList, setKecamatanList] = useState<string[]>([]);

  // Data pendaftar diambil dari query params yang dikirim dari halaman
  // pendaftaran sebelumnya (bukan hardcode). Kalau nanti sumber datanya
  // berubah (misal dari sesi login atau fetch API by NIK), tinggal ganti
  // bagian ini saja.
  const dataPendaftar: DataPendaftar = {
    nik: searchParams.get("nik") ?? "",
    namaLengkap: searchParams.get("namaLengkap") ?? "",
    tanggalLahir: searchParams.get("tanggalLahir") ?? "",
    namaUsaha: searchParams.get("namaUsaha") ?? "",
    kategori: searchParams.get("kategori") ?? "",
    jenisLapak: searchParams.get("jenisLapak") ?? "",
  };

  const [kecamatan, setKecamatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasil, setHasil] = useState<HasilAlokasi | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Simulasi proses alokasi stan tanpa API/backend.
      // TODO: kalau backend sudah siap, ganti bagian ini dengan fetch
      // ke endpoint alokasi stan yang sebenarnya. Untuk saat ini nomor
      // stan dan nama jalan dikosongkan (belum ada sumber datanya).
      await new Promise((resolve) => setTimeout(resolve, 800));

      const kecTerpilih =
        kecamatan === ""
          ? ""
          : kecamatan.charAt(0).toUpperCase() + kecamatan.slice(1);

      setHasil({
        nomorStand: "",
        kecamatan: kecTerpilih,
        namaJalan: "",
        qrUrl: "",
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
    if (hasil) {
      setHasil(null);
    } else {
      router.back();
    }
  };

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

        {/* ================= TAMPILAN HASIL ================= */}
        {hasil && (
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
                    {hasil.qrUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hasil.qrUrl}
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
        {!hasil && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Lokasi Penempatan */}
            <section className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-[#00288e]" />
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">
                  Lokasi Penempatan
                </h2>
              </div>

              <div className="w-full flex flex-col gap-1.5">
                <label
                  htmlFor="kecamatan"
                  className="text-[12px] font-medium text-[#4b4d5a] uppercase tracking-wide"
                >
                  Kecamatan
                </label>
                <select
                  id="kecamatan"
                  value={kecamatan}
                  onChange={(e) => setKecamatan(e.target.value)}
                  className="w-full box-border h-10 px-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#1a1d29] shadow-[inset_0_1px_2px_rgba(23,29,64,0.05)] border border-[#c9d6f5] focus:outline-none focus:bg-white focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-all appearance-none bg-no-repeat"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%235b5d6b' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
                    backgroundPosition: "right 0.75rem center",
                  }}
                >
                  <option value="" disabled>
                    Pilih Kecamatan
                  </option>
                  {kecamatanList.map((kec) => (
                    <option key={kec} value={kec.toLowerCase()}>
                      {kec}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Data Pendaftar */}
            <section className="w-full bg-white rounded-2xl border border-[#e7e8f1] shadow-[0_2px_8px_-2px_rgba(23,29,64,0.06)] p-5">
              <div className="flex items-center gap-2 mb-1">
                <User size={18} className="text-[#00288e]" />
                <h2 className="text-[15px] font-semibold text-[#1a1d29]">
                  Data Pendaftar
                </h2>
              </div>
              <p className="text-[12.5px] text-[#767884] mb-4">
                Data ini diambil secara otomatis dari pendaftaran Anda dan
                tidak dapat diubah di halaman ini.
              </p>

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
                disabled={loading}
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

export default function PilihLokasiStanPage() {
  return (
    <Suspense fallback={null}>
      <PilihLokasiStanContent />
    </Suspense>
  );
}