-- Tambah 2 menu baru buat petugas: "Scan QR Pedagang" & "Laporan"
-- (check-in pedagang via QR + laporan kehadiran pedagang yang sudah
-- check-in), nyusul di bawah "Jam Operasional" (sort_order 4).

INSERT INTO menus (id, name, slug, icon, route, sort_order) VALUES
    (gen_random_uuid(), 'Scan QR Pedagang', 'petugas-scan-qr', 'qr-code', '/petugas/scan-qr', 5),
    (gen_random_uuid(), 'Laporan', 'petugas-laporan', 'clipboard-list', '/petugas/laporan', 6);

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug IN ('petugas-scan-qr', 'petugas-laporan') AND r.slug = 'petugas';
