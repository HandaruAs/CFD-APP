-- Revert 000018: hapus menu "Scan QR Pedagang" & "Laporan" beserta
-- keterkaitannya ke role petugas.

DELETE FROM menu_roles WHERE menu_id IN (
    SELECT id FROM menus WHERE slug IN ('petugas-scan-qr', 'petugas-laporan')
);
DELETE FROM menus WHERE slug IN ('petugas-scan-qr', 'petugas-laporan');
