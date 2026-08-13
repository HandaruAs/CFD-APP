-- Revert 000016: hapus semua menu baru, kembalikan struktur menu lama
-- (bukan restore 100% persis ke isi 000014/000015, tapi balik ke bentuk
-- yang sama: 1 route "Verifikasi Pengajuan" & 1 route "Manajemen User"
-- yang dipakai bareng, "Beranda" pedagang versi verified-only)

DELETE FROM menu_roles WHERE menu_id IN (
    SELECT id FROM menus WHERE slug IN (
        'pedagang-dashboard',
        'admin-verifikasi-pengajuan', 'admin-manajemen-user-pedagang',
        'admin-manajemen-user-petugas', 'admin-manajemen-lapak', 'admin-jam-operasional',
        'petugas-verifikasi-pengajuan', 'petugas-manajemen-lapak', 'petugas-jam-operasional'
    )
);
DELETE FROM menus WHERE slug IN (
    'pedagang-dashboard',
    'admin-verifikasi-pengajuan', 'admin-manajemen-user-pedagang',
    'admin-manajemen-user-petugas', 'admin-manajemen-lapak', 'admin-jam-operasional',
    'petugas-verifikasi-pengajuan', 'petugas-manajemen-lapak', 'petugas-jam-operasional'
);

UPDATE menus SET sort_order = 1 WHERE slug = 'pedagang-pendaftaran';
UPDATE menus SET sort_order = 2 WHERE slug = 'pedagang-status-verifikasi';
UPDATE menus SET sort_order = 2 WHERE slug = 'pedagang-jadwal-lokasi';
UPDATE menus SET sort_order = 3 WHERE slug = 'pedagang-profil';

UPDATE menus SET name = 'Beranda' WHERE slug IN ('admin-beranda', 'petugas-beranda');

INSERT INTO menus (id, name, slug, icon, route, sort_order, pedagang_stage) VALUES
    (gen_random_uuid(), 'Beranda', 'pedagang-dashboard-beranda', 'home', '/pedagang/status-verifikasi', 1, 'verified'),
    (gen_random_uuid(), 'Verifikasi Pengajuan', 'verifikasi-pengajuan', 'check-circle', '/verifikasi', 2, NULL),
    (gen_random_uuid(), 'Manajemen User', 'admin-users', 'users', '/admin/users', 3, NULL);

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'pedagang-dashboard-beranda' AND r.slug = 'pedagang';

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'verifikasi-pengajuan' AND r.slug IN ('petugas', 'superadmin');

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'admin-users' AND r.slug = 'superadmin';