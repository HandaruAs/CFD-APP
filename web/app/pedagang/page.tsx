// app/pedagang/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PedagangDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAndRedirect() {
      const token = localStorage.getItem("cfd_token");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const meRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!meRes.ok) {
          if (meRes.status === 401 || meRes.status === 403) {
            localStorage.clear();
            router.push("/login");
            return;
          }
          router.push("/pedagang/pendaftaran");
          return;
        }

        const meData = await meRes.json();
        const stage = meData.pedagang_stage || "unverified";

        // 🔥 Jika sudah verified → ke jadwal
        if (stage === "verified") {
          router.push("/pedagang/jadwal-lokasi");
          return;
        }

        // 🔥 Cek pengajuan
        try {
          const pengajuanRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/pedagang/pengajuan`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (pengajuanRes.ok) {
            const data = await pengajuanRes.json();

            // Jika sudah punya pengajuan → ke status
            if (data.has_pengajuan) {
              router.push("/pedagang/status-verifikasi");
              return;
            }
          }
        } catch (err) {
          console.error("Error fetching pengajuan:", err);
        }

        // 🔥 Default: ke pendaftaran (akun baru)
        router.push("/pedagang/pendaftaran");
      } catch (error) {
        console.error("Error:", error);
        router.push("/pedagang/pendaftaran");
      } finally {
        setLoading(false);
      }
    }

    checkAndRedirect();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return null;
}