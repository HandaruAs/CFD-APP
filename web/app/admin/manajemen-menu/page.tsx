"use client";

import { useEffect, useMemo, useState } from "react";
import { CornerDownRight, EyeOff, Inbox, LayoutGrid, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { resolveMenuIcon } from "@/lib/menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  MenuFormModal,
  EMPTY_MENU_FORM,
  type MenuFormValues,
  type RoleOption,
} from "@/components/menu-form-modal";

type AdminMenuItem = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  route: string | null;
  sort_order: number;
  is_active: boolean;
  role_slugs: string[];
};

// Warna & label per role -- fallback netral kalau ada role baru yang belum
// dipetakan di sini (jangan sampai muncul putih polos tanpa warna).
const ROLE_TAMPILAN: Record<string, { label: string; kelas: string }> = {
  superadmin: { label: "Superadmin", kelas: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
  petugas: { label: "Petugas", kelas: "bg-primary-fixed text-on-primary-fixed-variant" },
  pedagang: { label: "Pedagang", kelas: "bg-secondary-container/50 text-on-secondary-container" },
};
const tampilanRole = (slug: string) =>
  ROLE_TAMPILAN[slug] ?? { label: slug, kelas: "bg-surface-container-high text-on-surface-variant" };

function apiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("cfd_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Susun list flat jadi urutan tampil: tiap root diikuti langsung oleh
// children-nya (diurutin sort_order), biar gampang di-render sebagai
// tabel dengan indent -- tanpa perlu komponen tree terpisah.
function buildDisplayOrder(items: AdminMenuItem[]): AdminMenuItem[] {
  const byParent = new Map<string | null, AdminMenuItem[]>();
  for (const item of items) {
    const key = item.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => a.sort_order - b.sort_order);
  }

  const result: AdminMenuItem[] = [];
  function walk(parentId: string | null) {
    for (const item of byParent.get(parentId) ?? []) {
      result.push(item);
      walk(item.id);
    }
  }
  walk(null);
  return result;
}

export default function ManajemenMenuPage() {
  const [menus, setMenus] = useState<AdminMenuItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [cari, setCari] = useState("");
  const [filterRole, setFilterRole] = useState<string>("semua");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<MenuFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminMenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function loadData() {
    setLoading(true);
    setLoadError("");
    try {
      const [menusRes, rolesRes] = await Promise.all([
        fetch(apiUrl("/api/admin/menus"), { headers: authHeaders() }),
        fetch(apiUrl("/api/admin/roles"), { headers: authHeaders() }),
      ]);

      if (!menusRes.ok) throw new Error("Gagal mengambil data menu.");
      if (!rolesRes.ok) throw new Error("Gagal mengambil data role.");

      const menusData: AdminMenuItem[] = await menusRes.json();
      const rolesData: RoleOption[] = await rolesRes.json();

      // Normalisasi parent_id: backend lama (atau JSON apa pun) bisa aja
      // ngirim field ini ke-omit sama sekali buat menu utama, bukan
      // dikirim sebagai `null` -- itu bikin item.parent_id jadi
      // `undefined`, beda key sama `null` yang dipakai buildDisplayOrder
      // & pengecekan isChild. Disamain ke `null` di sini biar konsisten.
      const normalizedMenus = (menusData ?? []).map((m) => ({
        ...m,
        parent_id: m.parent_id ?? null,
      }));

      setMenus(normalizedMenus);
      setRoles(rolesData ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat data menu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch on mount -- setState di dalam loadData aman di sini, cuma
    // dianggap "in effect" karena loadData manggil setState duluan
    // sebelum await pertamanya.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setFormValues(EMPTY_MENU_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: AdminMenuItem) {
    setModalMode("edit");
    setEditingId(item.id);
    setFormValues({
      name: item.name,
      slug: item.slug,
      icon: item.icon ?? "",
      route: item.route ?? "",
      parent_id: item.parent_id ?? "",
      sort_order: item.sort_order,
      role_slugs: item.role_slugs,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(values: MenuFormValues) {
    setSaving(true);
    setFormError("");

    const payload = {
      name: values.name,
      slug: values.slug,
      icon: values.icon || null,
      route: values.route || null,
      parent_id: values.parent_id || null,
      sort_order: values.sort_order,
      role_slugs: values.role_slugs,
    };

    try {
      const url = modalMode === "create" ? apiUrl("/api/admin/menus") : apiUrl(`/api/admin/menus/${editingId}`);
      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menyimpan menu.");
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan menu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(apiUrl(`/api/admin/menus/${deleteTarget.id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus menu.");
      }

      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus menu.");
    } finally {
      setDeleting(false);
    }
  }

  const displayItems = useMemo(() => buildDisplayOrder(menus), [menus]);
  const namaMenu = useMemo(() => new Map(menus.map((m) => [m.id, m.name])), [menus]);

  // Filter role & pencarian. Submenu yang lolos filter tapi induknya tidak
  // tetap tampil -- nama induknya ditulis kecil di bawah supaya jelas letaknya.
  const q = cari.trim().toLowerCase();
  const barisTampil = useMemo(() => {
    const lolos = displayItems.filter(
      (m) =>
        (filterRole === "semua" || m.role_slugs.includes(filterRole)) &&
        (!q || [m.name, m.slug, m.route ?? ""].some((v) => v.toLowerCase().includes(q)))
    );
    const idLolos = new Set(lolos.map((m) => m.id));
    return lolos.map((m) => ({ item: m, indukTersembunyi: m.parent_id !== null && !idLolos.has(m.parent_id) }));
  }, [displayItems, filterRole, q]);

  const ringkasan = {
    total: menus.length,
    utama: menus.filter((m) => m.parent_id === null).length,
    sub: menus.filter((m) => m.parent_id !== null).length,
    nonaktif: menus.filter((m) => !m.is_active).length,
  };
  // Role dari /api/admin/roles; kalau datanya belum ada, pakai 3 role bawaan.
  const slugRole = roles
    .map((r) => (r as unknown as { slug?: string }).slug)
    .filter((s): s is string => Boolean(s));
  const pilihanRole = ["semua", ...(slugRole.length ? slugRole : ["superadmin", "petugas", "pedagang"])];

  // Parent-picker: semua menu KECUALI yang lagi diedit sendiri (biar gak
  // bisa jadi parent dari dirinya sendiri -- backend juga jaga ini, tapi
  // dicegah dari sisi UI juga biar gak perlu bolak-balik lihat error).
  const parentOptions = menus.filter((m) => m.id !== editingId).map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="flex flex-col gap-lg pb-xl">
      {/* ===== HEADER ===== */}
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Manajemen Menu</h2>
          <p className="mt-xs max-w-2xl text-body-md text-on-surface-variant">
            Atur menu navigasi yang tampil untuk tiap role. Perubahan langsung berlaku tanpa perlu memperbarui
            aplikasi.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="pt-btn pt-btn-ghost pt-btn-icon"
            aria-label="Muat ulang"
            title="Muat ulang"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={openCreate} className="pt-btn pt-btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            Tambah Menu
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-md rounded-xl border border-error-container bg-error-container/30 px-md py-sm text-body-sm text-on-error-container"
        >
          <span>{loadError}</span>
          <button type="button" onClick={loadData} className="shrink-0 font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      {/* ===== RINGKASAN ===== */}
      <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
        {(
          [
            ["Total menu", ringkasan.total],
            ["Menu utama", ringkasan.utama],
            ["Submenu", ringkasan.sub],
            ["Nonaktif", ringkasan.nonaktif],
          ] as const
        ).map(([label, nilai]) => (
          <div key={label} className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-md py-sm">
            <p className="text-label-sm text-on-surface-variant">{label}</p>
            <p className="text-title-lg tabular-nums text-on-surface">{loading ? "–" : nilai}</p>
          </div>
        ))}
      </div>

      {/* ===== TABEL ===== */}
      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex flex-wrap items-center gap-sm border-b border-outline-variant p-md">
          <div role="group" aria-label="Filter role" className="inline-flex flex-wrap rounded-xl bg-surface-container-low p-1">
            {pilihanRole.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilterRole(r)}
                aria-pressed={filterRole === r}
                className={`min-h-9 rounded-lg px-md text-label-md transition-colors ${
                  filterRole === r
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {r === "semua" ? "Semua role" : tampilanRole(r).label}
              </button>
            ))}
          </div>
          <label className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
            <span className="sr-only">Cari menu</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama, slug, atau route"
              className="pt-input !py-2 pl-9"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface-container-low text-label-md">
              <tr>
                <th className="px-lg py-sm font-medium">Menu</th>
                <th className="px-md py-sm font-medium">Route</th>
                <th className="px-md py-sm font-medium">Role</th>
                <th className="px-md py-sm text-center font-medium">Urutan</th>
                <th className="px-lg py-sm text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading && menus.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-lg py-sm">
                      <div className="h-10 animate-pulse rounded-xl bg-surface-container-high" />
                    </td>
                  </tr>
                ))
              ) : barisTampil.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-lg py-xl">
                    <div className="flex flex-col items-center gap-sm text-center">
                      <span className="pt-empty-icon">
                        {menus.length === 0 ? <Inbox className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
                      </span>
                      <p className="text-body-md font-semibold text-on-surface">
                        {menus.length === 0 ? "Belum ada menu" : "Tidak ada menu yang cocok"}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {menus.length === 0
                          ? 'Klik "Tambah Menu" untuk membuat menu pertama.'
                          : "Coba ganti filter role atau kata pencarian."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                barisTampil.map(({ item, indukTersembunyi }) => {
                  const Icon = resolveMenuIcon(item.icon);
                  const isChild = item.parent_id !== null;
                  return (
                    <tr key={item.id} className={item.is_active ? "" : "opacity-60"}>
                      <td className="px-lg py-sm">
                        <div className="flex items-center gap-sm" style={{ paddingLeft: isChild && !indukTersembunyi ? 28 : 0 }}>
                          {isChild && !indukTersembunyi && (
                            <CornerDownRight className="h-4 w-4 shrink-0 text-outline-variant" />
                          )}
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isChild ? "bg-surface-container-low text-on-surface-variant" : "bg-primary/10 text-primary"
                            }`}
                          >
                            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-xs text-body-md font-semibold text-on-surface">
                              {item.name}
                              {!item.is_active && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-sm py-0.5 text-label-sm text-on-surface-variant">
                                  <EyeOff className="h-3 w-3" />
                                  Nonaktif
                                </span>
                              )}
                            </p>
                            <p className="truncate text-label-sm font-normal text-on-surface-variant">
                              {item.slug}
                              {indukTersembunyi && item.parent_id && (
                                <> · submenu dari {namaMenu.get(item.parent_id) ?? "menu lain"}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-md py-sm">
                        {item.route ? (
                          <code className="rounded-md bg-surface-container-low px-sm py-1 font-mono text-label-sm font-normal text-on-surface-variant">
                            {item.route}
                          </code>
                        ) : (
                          <span className="text-label-sm text-on-surface-variant">Grup menu</span>
                        )}
                      </td>
                      <td className="px-md py-sm">
                        <div className="flex flex-wrap gap-1.5">
                          {item.role_slugs.length === 0 ? (
                            <span className="text-label-sm text-error">Belum ada role</span>
                          ) : (
                            item.role_slugs.map((slug) => {
                              const r = tampilanRole(slug);
                              return (
                                <span
                                  key={slug}
                                  className={`inline-flex items-center rounded-full px-sm py-0.5 text-label-sm ${r.kelas}`}
                                >
                                  {r.label}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-md py-sm text-center text-body-sm tabular-nums text-on-surface-variant">
                        {item.sort_order}
                      </td>
                      <td className="px-lg py-sm">
                        <div className="flex items-center justify-end gap-xs">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
                            aria-label={`Edit ${item.name}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setDeleteTarget(item);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container/50 hover:text-error"
                            aria-label={`Hapus ${item.name}`}
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && menus.length > 0 && (
          <p className="border-t border-outline-variant px-lg py-sm text-label-sm font-normal text-on-surface-variant">
            Menampilkan {barisTampil.length} dari {menus.length} menu. Nama menu yang pendek (misalnya
            &quot;Pedagang&quot;) lebih rapi di sidebar.
          </p>
        )}
      </section>

      {modalOpen && (
        <MenuFormModal
          key={editingId ?? "create"}
          mode={modalMode}
          initialValues={formValues}
          roles={roles}
          parentOptions={parentOptions}
          saving={saving}
          error={formError}
          onSubmit={handleSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Menu"
        message={
          deleteError
            ? deleteError
            : `Yakin mau hapus menu "${deleteTarget?.name}"? Kalau menu ini masih punya submenu aktif, hapus submenu-nya dulu.`
        }
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}