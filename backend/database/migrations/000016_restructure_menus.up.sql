-- Restrukturisasi menu sesuai kebutuhan terbaru:
--  - "Verifikasi Pengajuan" dipecah jadi 2 menu terpisah (superadmin & petugas
--    masing-masing punya halaman sendiri, bukan 1 route yang dipakai bareng)
--  - "Manajemen User" dipecah jadi "Manajemen User Pedagang" & "Manajemen
--    User Petugas" (superadmin)
--  - Tambah "Manajemen Lapak" & "Jam Operasional" (superadmin + petugas)
--  - "Beranda" -> "Dashboard" biar konsisten namanya di semua role
--  - Pedagang sekarang punya "Dashboard" (route /pedagang) yang muncul di
--    KEDUA stage (unverified & verified), bukan cuma pas udah verified

-- 1) Samain penamaan "Beranda" -> "Dashboard"
UPDATE menus SET name = 'Dashboard' WHERE slug IN ('admin-beranda', 'petugas-beranda');

-- 2) Hapus menu "Verifikasi Pengajuan" lama yang dipakai bareng petugas &
--    superadmin -- mau dipecah jadi punya masing-masing di bawah
DELETE FROM menu_roles WHERE menu_id IN (SELECT id FROM menus WHERE slug = 'verifikasi-pengajuan');
DELETE FROM menus WHERE slug = 'verifikasi-pengajuan';

-- 3) Hapus "Manajemen User" lama (satu route buat semua) -- mau dipecah
DELETE FROM menu_roles WHERE menu_id IN (SELECT id FROM menus WHERE slug = 'admin-users');
DELETE FROM menus WHERE slug = 'admin-users';

-- 4) Hapus "Beranda" pedagang versi verified-only yang route-nya masih
--    nunjuk ke /pedagang/status-verifikasi -- diganti "Dashboard" yang
--    stage-nya NULL (otomatis muncul di unverified & verified sekaligus,
--    karena query GetMenusByRoleSlug nge-treat pedagang_stage IS NULL
--    sebagai "tampil di semua stage")
DELETE FROM menu_roles WHERE menu_id IN (SELECT id FROM menus WHERE slug = 'pedagang-dashboard-beranda');
DELETE FROM menus WHERE slug = 'pedagang-dashboard-beranda';

-- 5) Geser sort_order menu pedagang yang udah ada, kasih tempat buat
--    "Dashboard" di urutan pertama
UPDATE menus SET sort_order = 2 WHERE slug = 'pedagang-pendaftaran';
UPDATE menus SET sort_order = 3 WHERE slug = 'pedagang-status-verifikasi';
UPDATE menus SET sort_order = 2 WHERE slug = 'pedagang-jadwal-lokasi';
UPDATE menus SET sort_order = 3 WHERE slug = 'pedagang-profil';

-- 6) Menu baru
INSERT INTO menus (id, name, slug, icon, route, sort_order, pedagang_stage) VALUES
    -- Pedagang: Dashboard, stage NULL = tampil di unverified & verified
    (gen_random_uuid(), 'Dashboard', 'pedagang-dashboard', 'home', '/pedagang', 1, NULL),

    -- Superadmin
    (gen_random_uuid(), 'Verifikasi Pengajuan', 'admin-verifikasi-pengajuan', 'check-circle', '/admin/laporan-verifikasi', 2, NULL),
    (gen_random_uuid(), 'Manajemen User Pedagang', 'admin-manajemen-user-pedagang', 'users', '/admin/manajemen-user/pedagang', 3, NULL),
    (gen_random_uuid(), 'Manajemen User Petugas', 'admin-manajemen-user-petugas', 'users', '/admin/manajemen-user/petugas', 4, NULL),
    (gen_random_uuid(), 'Manajemen Lapak', 'admin-manajemen-lapak', 'store', '/admin/manajemen-lapak', 5, NULL),
    (gen_random_uuid(), 'Jam Operasional', 'admin-jam-operasional', 'clock', '/admin/jam-operasional', 6, NULL),

    -- Petugas
    (gen_random_uuid(), 'Verifikasi Pengajuan', 'petugas-verifikasi-pengajuan', 'check-circle', '/petugas/verifikasi-pengajuan', 2, NULL),
    (gen_random_uuid(), 'Manajemen Lapak', 'petugas-manajemen-lapak', 'store', '/petugas/manajemen-lapak', 3, NULL),
    (gen_random_uuid(), 'Jam Operasional', 'petugas-jam-operasional', 'clock', '/petugas/jam-operasional', 4, NULL);

-- 7) Hubungkan ke role masing-masing
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'pedagang-dashboard' AND r.slug = 'pedagang';

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug IN (
    'admin-verifikasi-pengajuan', 'admin-manajemen-user-pedagang',
    'admin-manajemen-user-petugas', 'admin-manajemen-lapak', 'admin-jam-operasional'
) AND r.slug = 'superadmin';

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug IN (
    'petugas-verifikasi-pengajuan', 'petugas-manajemen-lapak', 'petugas-jam-operasional'
) AND r.slug = 'petugas';