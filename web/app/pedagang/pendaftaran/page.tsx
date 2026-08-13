"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, UploadCloud, Quote } from "lucide-react";
import { StepIndicator, type Step } from "@/components/step-indicator";
import { FormField, inputClass, textareaClass } from "@/components/form-field";

const STEPS: Step[] = [
  { title: "Informasi Dasar Usaha", subtitle: "Kategori & Detail Produk" },
  { title: "Data Pribadi", subtitle: "Identitas Kependudukan" },
  { title: "Unggah Dokumen", subtitle: "KTP & Foto Usaha" },
];

export default function PendaftaranPage() {
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="grid grid-cols-1 gap-lg xl:h-full xl:grid-cols-[340px_1fr]">
      {/* Left column: intro + steps + testimonial */}
      <div className="flex flex-col gap-lg">
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-md">
          <h2 className="text-title-lg text-on-surface">
            Pendaftaran Pedagang
          </h2>
          <p className="mt-xs mb-lg text-body-md text-on-surface-variant">
            Lengkapi data berikut untuk bergabung dengan CFD Hub. Pastikan
            data yang dimasukkan valid.
          </p>
          <StepIndicator steps={STEPS} activeIndex={step} />
        </section>

        <section className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container p-lg">
          <Quote
            className="absolute -right-2 -top-2 h-16 w-16 text-primary/10"
            strokeWidth={1.5}
          />
          <p className="relative text-body-md text-on-surface">
            &ldquo;Bergabung dengan CFD Hub memudahkan saya mengelola lapak
            dan menjangkau lebih banyak pelanggan setiap minggunya.&rdquo;
          </p>
          <div className="relative mt-md flex items-center gap-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[12px] font-semibold text-on-primary-fixed">
              SA
            </span>
            <div>
              <p className="text-label-md font-semibold text-on-surface">
                Siti Aminah
              </p>
              <p className="text-label-sm font-normal tracking-normal text-on-surface-variant">
                Pedagang Makanan Ringan
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Right column: active step form */}
      <section className="flex h-full flex-col rounded-xl border border-outline-variant bg-surface-container-lowest shadow-md">
        <div className="flex items-start justify-between border-b border-outline-variant p-lg">
          <div>
            <h2 className="text-title-lg text-on-surface">
              {STEPS[step].title}
            </h2>
            <p className="mt-xs text-label-md text-on-surface-variant">
              Langkah {step + 1} dari {STEPS.length}
            </p>
          </div>
          <span className="hidden items-center gap-xs rounded-full bg-secondary-container px-sm py-1.5 text-label-sm text-on-secondary-container sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
            Aman &amp; Terenkripsi
          </span>
        </div>

        <div className="flex-1 p-lg">
          {step === 0 && <StepUsaha />}
          {step === 1 && <StepPribadi />}
          {step === 2 && <StepDokumen />}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant p-lg">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Kembali
          </button>

          <button
            type="button"
            onClick={() =>
              setStep((s) => (isLastStep ? s : Math.min(STEPS.length - 1, s + 1)))
            }
            className="flex items-center gap-xs rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            {isLastStep ? "Kirim Pendaftaran" : "Selanjutnya"}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </section>
    </div>
  );
}

function StepUsaha() {
  return (
    <div className="flex h-full flex-col gap-lg">
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
        <FormField label="Nama Usaha" htmlFor="nama_usaha">
          <input
            id="nama_usaha"
            className={inputClass}
            placeholder="Contoh: Kedai Kopi Senja"
          />
        </FormField>
        <FormField label="Kategori Usaha" htmlFor="kategori">
          <select id="kategori" className={inputClass}>
            <option>Minuman &amp; Kopi</option>
            <option>Makanan Berat</option>
            <option>Makanan Ringan &amp; Camilan</option>
            <option>Fashion &amp; Aksesoris</option>
            <option>Kerajinan Tangan</option>
          </select>
        </FormField>
        <FormField label="Jenis Dagangan" htmlFor="jenis_dagangan">
          <input
            id="jenis_dagangan"
            className={inputClass}
            placeholder="Contoh: Kopi susu, teh, camilan ringan"
          />
        </FormField>
        <FormField label="Perkiraan Harga Produk" htmlFor="harga">
          <input
            id="harga"
            className={inputClass}
            placeholder="Contoh: Rp10.000 - Rp25.000"
          />
        </FormField>
      </div>

      <div className="flex flex-1 flex-col">
        <FormField
          label="Deskripsi Usaha"
          htmlFor="deskripsi"
          hint="Ceritakan singkat produk dan keunikan usaha Anda."
        >
          <textarea
            id="deskripsi"
            className={`${textareaClass} flex-1 resize-none`}
            placeholder="Tuliskan deskripsi usaha Anda di sini..."
          />
        </FormField>
      </div>
    </div>
  );
}

function StepPribadi() {
  return (
    <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
      <FormField label="Nama Lengkap" htmlFor="nama_lengkap">
        <input
          id="nama_lengkap"
          className={inputClass}
          placeholder="Sesuai KTP"
        />
      </FormField>
      <FormField label="NIK" htmlFor="nik" hint="16 digit sesuai KTP">
        <input
          id="nik"
          inputMode="numeric"
          maxLength={16}
          className={inputClass}
          placeholder="35xxxxxxxxxxxxxx"
        />
      </FormField>
      <FormField label="Nomor HP / WhatsApp" htmlFor="phone">
        <input
          id="phone"
          inputMode="tel"
          className={inputClass}
          placeholder="08xxxxxxxxxx"
        />
      </FormField>
      <FormField label="Email" htmlFor="email">
        <input
          id="email"
          type="email"
          className={inputClass}
          placeholder="nama@email.com"
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Alamat Domisili" htmlFor="alamat">
          <textarea
            id="alamat"
            rows={3}
            className={textareaClass}
            placeholder="Alamat lengkap sesuai domisili saat ini"
          />
        </FormField>
      </div>
    </div>
  );
}

function StepDokumen() {
  return (
    <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
      <UploadTile label="Foto KTP" hint="JPG atau PNG, maks. 5MB" />
      <UploadTile label="Foto Usaha / Lapak" hint="JPG atau PNG, maks. 5MB" />
      <UploadTile
        label="Surat Izin Usaha (opsional)"
        hint="PDF, JPG, atau PNG, maks. 5MB"
      />
      <UploadTile
        label="Sertifikat Halal (opsional)"
        hint="PDF, JPG, atau PNG, maks. 5MB"
      />
    </div>
  );
}

function UploadTile({ label, hint }: { label: string; hint: string }) {
  return (
    <div>
      <p className="mb-xs text-label-md font-semibold text-on-surface">{label}</p>
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center gap-sm rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low px-md py-xl text-center transition-colors hover:border-primary hover:bg-primary-fixed/30"
      >
        <UploadCloud className="h-6 w-6 text-primary" strokeWidth={1.75} />
        <span className="text-label-md text-primary">Pilih berkas</span>
        <span className="text-label-sm font-normal tracking-normal text-on-surface-variant">
          {hint}
        </span>
      </button>
    </div>
  );
}