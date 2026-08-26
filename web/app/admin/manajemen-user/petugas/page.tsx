"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Briefcase, Ban } from "lucide-react";
import { UserManagementTable, type StatCard, type User } from "@/components/user-management-table";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function ManajemenUserPetugasPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{
    total: number | null;
    active: number | null;
    suspended: number | null;
  }>({ total: null, active: null, suspended: null });
  const [reloadSignal, setReloadSignal] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem("cfd_token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/stats?role=petugas`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setStats({
            total: data.total ?? 0,
            active: data.active ?? 0,
            suspended: data.suspended ?? 0,
          });
        }
      } catch {
        // biarkan null kalau gagal
      }
    }
    fetchStats();
  }, [reloadSignal]);

  const statCards: StatCard[] = [
    {
      label: "Total Petugas",
      value: stats.total,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-700",
      sublabel: "",
    },
    {
      label: "Petugas Aktif",
      value: stats.active,
      icon: Briefcase,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      sublabel: "Sedang Bertugas",
    },
  ];

  const handleEditUser = (user: User) => {
    router.push(`/admin/manajemen-user/petugas/edit/${user.id}`);
  };

  const handleDeleteClick = (user: User) => {
    setDeleteTarget(user);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("cfd_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/petugas/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Gagal menghapus data");

      setDeleteTarget(null);
      setReloadSignal((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus petugas");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <UserManagementTable
        title="Manajemen User Petugas"
        subtitle="Kelola akun dan status aktif petugas CFD pada sistem CFD Hub."
        addButtonLabel="Tambah Petugas"
        searchPlaceholder="Cari nama, email, atau kontak petugas..."
        statCards={statCards}
        apiEndpoint="/api/admin/users/petugas"
        extraParams={{ role: "petugas" }}
        reloadSignal={reloadSignal}
        onAddClick={() => router.push("/admin/manajemen-user/petugas/tambah")}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteClick}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Konfirmasi Hapus"
        message={`Apakah Anda yakin ingin menghapus petugas "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </>
  );
}