"use client";

import { Store, Wallet, MapPin, User } from "lucide-react";
import { useState } from "react";

export default function MerchantCheckoutPage() {
  // Data akan diisi oleh backend nantinya
  const [dataPedagang] = useState({
    kecamatan: "",
    namaJalan: "",
    nomorStan: "",
    nik: "",
    namaLengkap: "",
    tanggalLahir: "",
    namaUsaha: "",
    kategoriUsaha: "",
    jenisLapak: "",
  });

  const [formData, setFormData] = useState({
    omset: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // 1. Hapus semua karakter selain angka (hapus titik dari format sebelumnya)
    const cleanValue = value.replace(/[^0-9]/g, "");

    // 2. Format angka menjadi ribuan dengan titik (contoh: 50000 -> 50.000)
    const formattedValue = cleanValue ? Number(cleanValue).toLocaleString("id-ID") : "";

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataLengkap = {
      ...dataPedagang,
      ...formData,
    };
    console.log("Data Lengkap:", dataLengkap);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans flex flex-col">
      {/* Header dengan status sesi */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 shadow-sm">
        <div className="max-w-[600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-[#0b1c30]">Cek-out Pedagang</h1>
            <p className="text-sm text-[#5b5e6d]">
              Selesaikan sesi jualan hari ini dengan mencatat total pendapatan kotor.
            </p>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-[#f8f9ff]">
        <form onSubmit={handleSubmit} className="w-full max-w-[600px] flex flex-col gap-4">
          {/* Detail Lokasi */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Detail Lokasi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={dataPedagang.kecamatan}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Nama Jalan
                </label>
                <input
                  type="text"
                  value={dataPedagang.namaJalan}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2 max-w-[200px]">
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Nomor Stan
                </label>
                <input
                  type="text"
                  value={dataPedagang.nomorStan}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Data Pedagang */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Data Pedagang</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  NIK
                </label>
                <input
                  type="text"
                  value={dataPedagang.nik}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={dataPedagang.namaLengkap}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2 max-w-[200px]">
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="text"
                  value={dataPedagang.tanggalLahir}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Data Usaha */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Data Usaha</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Nama Usaha
                </label>
                <input
                  type="text"
                  value={dataPedagang.namaUsaha}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Kategori Usaha
                </label>
                <input
                  type="text"
                  value={dataPedagang.kategoriUsaha}
                  readOnly
                  placeholder="-"
                  className="w-full h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00288e] mb-1">
                  Jenis Lapak
                </label>
                <div className="h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#d1fae5] text-[#047857] text-xs font-semibold">
                    {dataPedagang.jenisLapak || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Laporan Akhir Sesi */}
          <div className="bg-[#eff4ff] rounded-xl border border-[#dbe4ff] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-[#00288e]" />
              <h2 className="font-semibold text-[#0b1c30] text-base">Laporan Akhir Sesi</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="omset" className="text-sm font-semibold text-[#0b1c30]">
                Total Omset Hari Ini (Rp)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-[#5b5e6d] text-sm font-medium">Rp</span>
                </div>
                <input
                  id="omset"
                  name="omset"
                  type="text"
                  value={formData.omset}
                  onChange={handleChange}
                  placeholder="Contoh: 500.000"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-colors"
                />
              </div>
              {/* Bagian checkbox telah dihapus */}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="h-10 px-6 rounded-full text-sm font-medium text-[#00288e] border border-[#00288e] bg-white hover:bg-[#eff4ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2"
            >
              Batal
            </button>
            <button
              type="submit"
              className="h-10 px-6 rounded-full text-sm font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2"
            >
              Cek-out
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}