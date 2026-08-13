DELETE FROM menu_roles WHERE menu_id IN (
    SELECT id FROM menus WHERE slug IN
    ('pedagang-beranda','petugas-beranda','verifikasi-pengajuan','admin-beranda','admin-users')
);

DELETE FROM menus WHERE slug IN
    ('pedagang-beranda','petugas-beranda','verifikasi-pengajuan','admin-beranda','admin-users');