"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Store, ShieldCheck } from "lucide-react"; // <-- Hapus Ban
import { UserManagementTable, type StatCard, type User } from "@/components/user-management-table";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function ManajemenUserPedagangPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    total: null,
    active: null,
    pending: null,
    // suspended: null, // <-- Hapus state suspended
  });
  const [reloadSignal, setReloadSignal] = useState(0);

  // State untuk Modal Delete
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem("cfd_token");
        const res = await fetch(
          "http://localhost:8080/api/admin/users/pedagang/stats",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setStats({
            total: data.total ?? 0,
            active: data.active ?? 0,
            pending: data.pending ?? 0,
            // suspended: data.suspended ?? 0,
          });
        }
      } catch {
        // Biarkan null jika gagal
      }
    }
    fetchStats();
  }, [reloadSignal]);

  // --- PERBAIKAN: Hapus kartu Ditangguhkan ---
  const statCards: StatCard[] = [
    {
      label: "Total Pedagang",
      value: stats.total,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-700",
      sublabel: "",
    },
    {
      label: "Pedagang Aktif",
      value: stats.active,
      icon: Store,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      sublabel: "Total Terverifikasi",
    },
    {
      label: "Menunggu Verifikasi",
      value: stats.pending,
      icon: ShieldCheck,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      sublabel: "",
    },
    // Kartu "Ditangguhkan" sudah dihapus dari sini
  ];

  const handleAddPedagang = () => {
    router.push("/admin/manajemen-user/pedagang/tambah");
  };

  const handleEditUser = (user: User) => {
    router.push(`/admin/manajemen-user/pedagang/edit/${user.id}`);
  };

  const handleDeleteClick = (user: User) => {
    setDeleteTarget(user);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("cfd_token");
      const res = await fetch(`http://localhost:8080/api/admin/users/pedagang/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Gagal menghapus data");
      
      setDeleteTarget(null);
      setReloadSignal((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus pedagang");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <UserManagementTable
        title="Manajemen User Pedagang"
        subtitle="Kelola akun, status verifikasi, dan status aktif pedagang pada sistem CFD Hub."
        addButtonLabel="Tambah Pedagang"
        searchPlaceholder="Cari nama, email, atau kontak pedagang..."
        statCards={statCards}
        apiEndpoint="/api/admin/users/pedagang"
        reloadSignal={reloadSignal}
        onAddClick={handleAddPedagang}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteClick}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Konfirmasi Hapus"
        message={`Apakah Anda yakin ingin menghapus pedagang "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </>
  );
}