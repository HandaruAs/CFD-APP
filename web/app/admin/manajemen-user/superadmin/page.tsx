"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ShieldCheck } from "lucide-react";
import { UserManagementTable, type StatCard, type User } from "@/components/user-management-table";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function ManajemenUserSuperadminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{
    total: number | null;
    active: number | null;
  }>({ total: null, active: null });
  const [reloadSignal, setReloadSignal] = useState(0);

  // ID akun yang lagi login -- dipakai buat cegah user hapus akunnya
  // sendiri dari sisi UI. Backend (DELETE /api/admin/users/superadmin/:id)
  // tetap jadi penjaga utama, ini cuma biar nggak perlu bolak-balik lihat
  // error pas baru ketauan pas klik hapus.
  const [myId, setMyId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem("cfd_token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/stats?role=superadmin`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setStats({
            total: data.total ?? 0,
            active: data.active ?? 0,
          });
        }
      } catch {
        // biarkan null kalau gagal
      }
    }
    fetchStats();
  }, [reloadSignal]);

  useEffect(() => {
    async function fetchMe() {
      try {
        const token = localStorage.getItem("cfd_token");
        if (!token) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setMyId(data.user?.id ?? null);
      } catch {
        // biarin null kalau gagal -- tombol hapus tetap jalan, backend
        // tetap nolak kalau ternyata itu akun sendiri
      }
    }
    fetchMe();
  }, []);

  // Warna ikon pakai token CFD (sebelumnya ungu bawaan Tailwind yang tidak
  // ada di palet aplikasi).
  const statCards: StatCard[] = [
    {
      label: "Total Admin",
      value: stats.total,
      icon: Users,
      iconBg: "bg-primary-fixed",
      iconColor: "text-on-primary-fixed",
      sublabel: "Semua akun admin",
    },
    {
      label: "Admin Aktif",
      value: stats.active,
      icon: ShieldCheck,
      iconBg: "bg-secondary-container/60",
      iconColor: "text-on-secondary-container",
      sublabel: "Akun dapat mengakses sistem",
    },
  ];

  const handleEditUser = (user: User) => {
  router.push(`/admin/manajemen-user/superadmin/edit/${user.id}`);
};

  const handleDeleteClick = (user: User) => {
    // Guard sisi UI -- cegah dialog hapus kebuka buat akun sendiri.
    // Guard "beneran" tetap di backend.
    if (user.id === myId) {
      setDeleteError("Akun yang sedang digunakan tidak dapat dihapus.");
      return;
    }
    setDeleteError("");
    setDeleteTarget(user);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const token = localStorage.getItem("cfd_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/superadmin/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Backend nolak dengan pesan spesifik buat 2 kasus: hapus diri
        // sendiri, atau hapus superadmin terakhir yang tersisa.
        throw new Error(data.error || "Gagal menghapus data");
      }

      setDeleteTarget(null);
      setReloadSignal((prev) => prev + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus admin");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <UserManagementTable
        title="Manajemen User Admin"
        subtitle="Kelola akun admin yang punya akses penuh ke sistem E-Event CFD Surabaya."
        addButtonLabel="Tambah Admin"
        searchPlaceholder="Cari nama, email, atau kontak admin"
        statCards={statCards}
        apiEndpoint="/api/admin/users/superadmin"
        extraParams={{ role: "superadmin" }}
        reloadSignal={reloadSignal}
        onAddClick={() => router.push("/admin/manajemen-user/superadmin/tambah")}
        onDeleteUser={handleDeleteClick}
        onEditUser={handleEditUser}
        showStatusFilter={false}
      />


      <ConfirmDialog
        open={!!deleteTarget}
        title="Konfirmasi Hapus"
        message={
          deleteError
            ? deleteError
            : `Apakah Anda yakin ingin menghapus admin "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </>
  );
}