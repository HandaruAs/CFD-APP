-- Seed menu awal per role untuk sidebar dinamis.
-- CATATAN: ganti name/route di bawah ini kalau halaman aslinya di
-- web/app beda dari yang dipakai di sini -- ini cuma starting point.

INSERT INTO menus (id, name, slug, icon, route, sort_order) VALUES
    (gen_random_uuid(), 'Beranda', 'pedagang-beranda', 'home', '/status-verifikasi', 1),
    (gen_random_uuid(), 'Beranda', 'petugas-beranda', 'home', '/petugas', 1),
    (gen_random_uuid(), 'Verifikasi Pengajuan', 'verifikasi-pengajuan', 'check-circle', '/verifikasi', 2),
    (gen_random_uuid(), 'Beranda', 'admin-beranda', 'home', '/admin', 1),
    (gen_random_uuid(), 'Manajemen User', 'admin-users', 'users', '/admin/users', 3);

-- Hubungkan tiap menu ke role yang boleh lihat, lewat menu_roles
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'pedagang-beranda' AND r.slug = 'pedagang';

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'petugas-beranda' AND r.slug = 'petugas';

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'verifikasi-pengajuan' AND r.slug IN ('petugas', 'superadmin');

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'admin-beranda' AND r.slug = 'superadmin';

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'admin-users' AND r.slug = 'superadmin';