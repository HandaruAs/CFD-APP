"use client";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";

export default function GoogleLoginButton() {
  const router = useRouter();

  async function handleSuccess(credentialResponse: CredentialResponse) {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      console.error("Tidak menerima credential dari Google");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });

    if (!res.ok) {
      console.error("Login gagal:", await res.text());
      return;
    }

    const data = await res.json();

    // Simpan JWT dari backend, dipakai sebagai "Authorization: Bearer <token>"
    // di setiap request API selanjutnya.
    // NOTE: sesuaikan "data.token" dengan nama field JSON asli dari response
    // Golang kamu kalau namanya beda (misal data.access_token).
    localStorage.setItem("cfd_token", data.token);

    // TODO: ganti route ini kalau dashboard per-role sudah ada
    router.push("/dashboard");
  }

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => console.error("Login gagal di sisi Google")}
    />
  );
}
