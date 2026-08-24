"use client";

import { User, Store, Wallet } from "lucide-react";

export default function MerchantCheckoutPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans flex flex-col">
      <main className="flex-1 overflow-y-auto p-3 md:p-5 flex justify-center bg-[#f8f9ff]">
        <div className="w-full max-w-[560px] flex flex-col gap-2.5">
          {/* Page Header */}
          <div className="text-center">
            <div
              className="font-semibold tracking-tight text-[#0b1c30] mb-0.5"
              style={{ fontSize: "20px", lineHeight: "26px" }}
            >
              Formulir Cek-out Pedagang
            </div>
            <p className="text-[13px] text-[#5b5e6d]">
              Harap lengkapi data omset hari ini sebelum menyelesaikan sesi.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_2px_10px_-4px_rgba(11,28,48,0.08)] p-4 flex flex-col gap-3.5">
            <form className="flex flex-col gap-3.5">
              {/* Group 1: Data Pedagang (Read-only) */}
              <Section icon={<User className="w-3.5 h-3.5" />} title="Data Pedagang">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <ReadOnlyField label="NIK" value="3578012345678901" />
                  <ReadOnlyField label="Nama Lengkap" value="Budi Santoso" />
                  <div className="md:col-span-2">
                    <ReadOnlyField label="Tanggal Lahir" value="15 Agustus 1985" />
                  </div>
                </div>
              </Section>

              {/* Group 2: Data Usaha (Read-only) */}
              <Section icon={<Store className="w-3.5 h-3.5" />} title="Data Usaha">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="md:col-span-2">
                    <ReadOnlyField label="Nama Usaha" value="Soto Ayam Cak Budi" />
                  </div>
                  <ReadOnlyField label="Kategori" value="Makanan Berat" />
                  <div className="flex flex-col gap-1.5">
                    <span
                      className="font-semibold text-[#00288e]"
                      style={{ fontSize: "12px" }}
                    >
                      Jenis Lapak
                    </span>
                    <div className="h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#d1fae5] text-[#047857] text-[11px] font-semibold">
                        Rombong
                      </span>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Group 3: Input Lapangan (Manual) */}
              <section className="bg-[#eff4ff] p-3.5 rounded-lg border border-[#dbe4ff]">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-3.5 h-3.5 text-[#00288e]" />
                  <span
                    className="font-semibold text-[#0b1c30]"
                    style={{ fontSize: "13px" }}
                  >
                    Laporan Keuangan
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="omset"
                    className="text-[12px] font-semibold text-[#0b1c30]"
                  >
                    Omset Hari Ini (Rp) <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-[#5b5e6d] text-[13px]">Rp</span>
                    </div>
                    <input
                      id="omset"
                      name="omset"
                      type="text"
                      required
                      placeholder="Contoh: 500000"
                      className="h-9 w-full pl-9 pr-3 rounded-lg border border-[#CBD5E1] bg-white text-[#0b1c30] text-[13px] focus:outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-[#5b5e6d] mt-0.5">
                    Masukkan total pendapatan kotor hari ini.
                  </p>
                </div>
              </section>

              {/* Actions */}
              <div className="pt-2.5 border-t border-[#e2e8f0] flex justify-end gap-2.5">
                <button
                  type="button"
                  className="h-9 px-4 rounded-full text-[13px] font-medium text-[#00288e] border border-[#00288e] bg-white hover:bg-[#eff4ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-full text-[13px] font-medium text-white bg-[#00288e] hover:bg-[#1e40af] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:ring-offset-2"
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

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#e2e8f0]">
        <span className="text-[#00288e]">{icon}</span>
        <span
          className="font-semibold text-[#0b1c30]"
          style={{ fontSize: "17px" }}
        >
          {title}
        </span>
      </div>
      {children}
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-semibold text-[#00288e]" style={{ fontSize: "12px" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly
        className="h-9 px-3 rounded-lg border border-[#c9d6f5] bg-[#eaf0ff] text-[#0b1c30] text-[11px] focus:outline-none focus:ring-0 cursor-not-allowed"
      />
    </div>
  );
}