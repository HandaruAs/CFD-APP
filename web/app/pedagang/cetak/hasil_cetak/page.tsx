"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Store, Printer, ArrowLeft } from "lucide-react";

export default function HasilCetakQRPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const qrUrl = searchParams.get("qrUrl") || "";
  const nomorStand = searchParams.get("nomorStand") || "-";
  const zona = searchParams.get("zona");

  return (
    <main className="w-full min-h-screen flex flex-col items-center px-4 py-10 md:py-14">
      <div className="w-full max-w-[320px] mx-auto flex flex-col items-center gap-4">
        {/* Header */}
        <div className="w-full text-center">
          <h2 className="text-[18px] leading-tight font-semibold text-[#0b1c30] mb-1">
            Verifikasi Berhasil
          </h2>
          <p className="text-[12px] leading-5 text-[#767784]">
            Berikut adalah kode QR merchant Anda. Silakan simpan atau cetak
            kode ini untuk akses digital.
          </p>
        </div>

        {/* Result Card */}
        <section className="w-full bg-white border border-[#e2e4ee] shadow-sm rounded-xl p-4 flex flex-col items-center text-center gap-3">
          <h3 className="text-sm font-semibold text-[#00288e]">
            Digital Access Code
          </h3>

          <div className="bg-white p-1.5 border border-[#e2e4ee] rounded-lg shadow-sm inline-block">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Kode QR merchant"
                className="w-28 h-28 object-cover rounded"
              />
            ) : (
              <div className="w-28 h-28 flex items-center justify-center text-[11px] text-[#a8aab8] rounded">
                QR tidak tersedia
              </div>
            )}
          </div>

          <div className="w-full bg-[#f8f9ff] border border-[#e2e4ee] rounded-lg p-3 text-left">
            <h4 className="text-[10px] font-medium text-[#767784] mb-1">
              Location Details
            </h4>
            <div className="flex items-center gap-2">
              <Store className="text-[#006c49] w-5 h-5" strokeWidth={2} />
              <div>
                <p className="text-[10px] text-[#767784]">Stand Number</p>
                <p className="text-base font-bold text-[#0b1c30]">
                  {nomorStand}
                  {zona ? (
                    <span className="text-[12px] font-normal text-[#767784]">
                      {" "}
                      &middot; Zona {zona}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full mt-1 h-9 bg-white text-[#00288e] border border-[#00288e] text-xs font-medium rounded-lg shadow-sm hover:bg-[#eff4ff] active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" strokeWidth={2} />
            Cetak / Print
          </button>
        </section>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-4 h-9 bg-[#eff4ff] text-[#767784] text-xs font-medium rounded-lg hover:bg-[#dce9ff] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Kembali ke Beranda
        </button>
      </div>
    </main>
  );
}