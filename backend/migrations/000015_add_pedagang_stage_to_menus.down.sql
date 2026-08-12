DELETE FROM menu_roles
WHERE menu_id IN (
    SELECT id FROM menus WHERE slug IN (
        'pedagang-pendaftaran', 'pedagang-status-verifikasi',
        'pedagang-dashboard-beranda', 'pedagang-jadwal-lokasi', 'pedagang-profil'
    )
);
DELETE FROM menus WHERE slug IN (
    'pedagang-pendaftaran', 'pedagang-status-verifikasi',
    'pedagang-dashboard-beranda', 'pedagang-jadwal-lokasi', 'pedagang-profil'
);

INSERT INTO menus (id, name, slug, icon, route, sort_order) VALUES
    (gen_random_uuid(), 'Beranda', 'pedagang-beranda', 'home', '/status-verifikasi', 1);
INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'pedagang-beranda' AND r.slug = 'pedagang';

ALTER TABLE menus DROP COLUMN pedagang_stage;