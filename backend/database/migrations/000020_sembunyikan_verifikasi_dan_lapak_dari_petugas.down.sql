-- Revert 000020: pasang lagi keterkaitan "Verifikasi Pengajuan" &
-- "Manajemen Lapak" ke role petugas.

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug IN ('petugas-verifikasi-pengajuan', 'petugas-manajemen-lapak') AND r.slug = 'petugas';
