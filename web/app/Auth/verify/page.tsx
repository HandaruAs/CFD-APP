"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formattedTime = `${String(Math.floor(secondsLeft / 60)).padStart(
    2,
    "0"
  )}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < Math.min(OTP_LENGTH, pasted.length); i++) {
      next[i] = pasted[i];
    }
    setOtp(next);
    const lastIndex = Math.min(OTP_LENGTH, pasted.length) - 1;
    inputsRef.current[lastIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LENGTH) return;

    setLoading(true);
    try {
      // TODO: ganti dengan endpoint API verifikasi OTP
      // const res = await fetch("/api/auth/verify-otp", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, code }),
      // });

      // Setelah OTP valid, arahkan ke halaman buat password baru
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (secondsLeft > 0) return;
    // TODO: panggil endpoint API kirim ulang OTP
    setSecondsLeft(RESEND_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(""));
    inputsRef.current[0]?.focus();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#EAF0FB] via-[#F3F0FA] to-[#EEF1FA] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-[0_10px_40px_-12px_rgba(11,27,58,0.15)] p-7 sm:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF3FE] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                <path
                  d="M3 6L12 12L21 6"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 6C3 4.9 3.9 4 5 4H19C20.1 4 21 4.9 21 6V15C21 16.1 20.1 17 19 17H12"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 20L11 17.5L8.5 15"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.5 17.5H11"
                  stroke="#2563EB"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-[#0B1B3A] text-center">
            Verifikasi Kode OTP
          </h1>
          <p className="text-sm text-slate-500 text-center mt-2 mb-7 leading-relaxed">
            Kami telah mengirimkan kode verifikasi ke email anda{" "}
            <span className="font-medium text-[#2563EB]">
              {email || "-"}
            </span>
            . Silakan masukkan 6 digit kode tersebut di bawah ini.
          </p>

          <form onSubmit={handleSubmit}>
            {/* OTP boxes */}
            <div className="flex justify-center gap-2.5 mb-7">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-11 h-12 text-center text-lg font-semibold rounded-lg border border-slate-200 bg-[#F8FAFC] text-[#0B1B3A] outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15"
                />
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || otp.some((d) => d === "")}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0B1B6B] hover:bg-[#0A1657] py-3 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Memverifikasi..."
              ) : (
                <>
                  Verifikasi Kode
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <path
                      d="M5 12H19M19 12L13 6M19 12L13 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Resend */}
          <p className="text-center text-sm text-slate-500 mt-5">
            Tidak menerima kode?
            <br />
            {secondsLeft > 0 ? (
              <span className="font-medium text-[#2563EB]">
                Kirim ulang dalam {formattedTime}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              >
                Kirim ulang kode
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}