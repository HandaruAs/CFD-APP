ALTER TABLE menus ADD COLUMN pedagang_stage VARCHAR(20)
    CHECK (pedagang_stage IN ('unverified', 'verified'));

-- Menu "Beranda" pedagang yang lama (dari seed awal) route-nya masih
-- yang lama dan belum bisa dibedain per status verifikasi -- diganti
-- set menu yang lebih sesuai kebutuhan sekarang.
DELETE FROM menu_roles
WHERE menu_id IN (SELECT id FROM menus WHERE slug = 'pedagang-beranda');
DELETE FROM menus WHERE slug = 'pedagang-beranda';

INSERT INTO menus (id, name, slug, icon, route, sort_order, pedagang_stage) VALUES
    (gen_random_uuid(), 'Pendaftaran', 'pedagang-pendaftaran', 'home', '/pedagang/pendaftaran', 1, 'unverified'),
    (gen_random_uuid(), 'Status Verifikasi', 'pedagang-status-verifikasi', 'check-circle', '/pedagang/status-verifikasi', 2, 'unverified'),
    (gen_random_uuid(), 'Beranda', 'pedagang-dashboard-beranda', 'home', '/pedagang/status-verifikasi', 1, 'verified'),
    (gen_random_uuid(), 'Jadwal & Lokasi', 'pedagang-jadwal-lokasi', 'check-circle', '/pedagang/jadwal-lokasi', 2, 'verified'),
    (gen_random_uuid(), 'Profil Usaha', 'pedagang-profil', 'users', '/pedagang/profil', 3, 'verified');

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug IN (
    'pedagang-pendaftaran', 'pedagang-status-verifikasi',
    'pedagang-dashboard-beranda', 'pedagang-jadwal-lokasi', 'pedagang-profil'
) AND r.slug = 'pedagang';