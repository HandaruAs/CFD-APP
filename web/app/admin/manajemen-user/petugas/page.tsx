"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserManagementTable, type User } from "@/components/user-management-table";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function ManajemenUserPetugasPage() {
  const router = useRouter();
  const [reloadSignal, setReloadSignal] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Pesan gagal hapus ditampilkan di dalam dialog (sebelumnya pakai alert()
  // browser yang terasa kasar dan memutus alur).
  const [deleteError, setDeleteError] = useState("");

  const handleEditUser = (user: User) => {
    router.push(`/admin/manajemen-user/petugas/edit/${user.id}`);
  };

  const handleDeleteClick = (user: User) => {
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/petugas/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus data");
      }

      setDeleteTarget(null);
      setReloadSignal((prev) => prev + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus petugas");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <UserManagementTable
        title="Manajemen User Petugas"
        subtitle="Kelola akun dan status aktif petugas pada sistem E-Event CFD Surabaya."
        addButtonLabel="Tambah Petugas"
        searchPlaceholder="Cari nama, email, atau kontak petugas"
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
        message={
          deleteError
            ? deleteError
            : `Apakah Anda yakin ingin menghapus petugas "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </>
  );
}