-- Sembunyikan "Verifikasi Pengajuan" & "Manajemen Lapak" dari sidebar
-- petugas -- cuma putus keterkaitannya ke role petugas lewat menu_roles,
-- baris menu-nya sendiri TETAP ada di tabel menus (gak dihapus), jadi
-- gampang dipasang lagi nanti atau dipakai role lain.

DELETE FROM menu_roles WHERE menu_id IN (
    SELECT id FROM menus WHERE slug IN ('petugas-verifikasi-pengajuan', 'petugas-manajemen-lapak')
) AND role_id IN (SELECT id FROM roles WHERE slug = 'petugas');
