"use client";

export default function MerchantCheckoutPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans flex flex-col">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-[#f8f9ff]">
        <div className="w-full max-w-[640px] flex flex-col gap-4">
          {/* Page Header */}
          <div>
            <h1 className="text-xl font-semibold text-[#0b1c30] mb-0.5">
              Formulir Cek-out Pedagang
            </h1>
            <p className="text-xs text-[#444653]">
              Harap lengkapi data omset hari ini sebelum menyelesaikan sesi.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] p-5 flex flex-col gap-5">
            <form className="flex flex-col gap-5">
              {/* Group 1: Data Pedagang (Read-only) */}
              <section>
                <h3 className="text-sm font-semibold text-[#0b1c30] mb-2.5 pb-1.5 border-b border-[#e2e8f0]">
                  Data Pedagang
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ReadOnlyField label="NIK" value="3578012345678901" />
                  <ReadOnlyField label="Nama Lengkap" value="Budi Santoso" />
                  <div className="md:col-span-2">
                    <ReadOnlyField
                      label="Tanggal Lahir"
                      value="15 Agustus 1985"
                    />
                  </div>
                </div>
              </section>

              {/* Group 2: Data Usaha (Read-only) */}
              <section>
                <h3 className="text-sm font-semibold text-[#0b1c30] mb-2.5 pb-1.5 border-b border-[#e2e8f0]">
                  Data Usaha
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <ReadOnlyField
                      label="Nama Usaha"
                      value="Soto Ayam Cak Budi"
                    />
                  </div>
                  <ReadOnlyField label="Kategori" value="Makanan Berat" />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[#444653]">
                      Jenis Lapak
                    </label>
                    <div className="h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] flex items-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#d1fae5] text-[#047857] text-[11px] font-semibold">
                        Rombong
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Group 3: Input Lapangan (Manual) */}
              <section className="bg-[#eff4ff] p-3.5 rounded-lg border border-[#dbe4ff]">
                <h3 className="text-sm font-semibold text-[#0b1c30] mb-2.5">
                  Laporan Keuangan
                </h3>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="omset"
                    className="text-xs font-semibold text-[#0b1c30]"
                  >
                    Omset Hari Ini (Rp) <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-[#444653] text-xs">Rp</span>
                    </div>
                    <input
                      id="omset"
                      name="omset"
                      type="text"
                      required
                      placeholder="Contoh: 500000"
                      className="h-9 w-full pl-9 pr-3 rounded-lg border border-[#CBD5E1] bg-white text-[#0b1c30] text-xs focus:outline-none focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-[#444653] mt-0.5">
                    Masukkan total pendapatan kotor hari ini.
                  </p>
                </div>
              </section>

              {/* Actions */}
              <div className="pt-3 border-t border-[#e2e8f0] flex justify-end gap-3">
                <button
                  type="button"
                  className="h-9 px-4 rounded-full text-xs font-medium text-[#00288e] border border-[#00288e] bg-white hover:bg-[#eff4ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-full text-xs font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2"
                >
                  Simpan Data Cek-out
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[#444653]">{label}</label>
      <input
        type="text"
        value={value}
        readOnly
        className="h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-0 cursor-not-allowed"
      />
    </div>
  );
}