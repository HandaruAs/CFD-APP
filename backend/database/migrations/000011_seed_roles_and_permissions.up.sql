INSERT INTO roles (name, slug, description) VALUES
    ('Superadmin', 'superadmin', 'Akses penuh ke seluruh sistem'),
    ('Petugas CFD', 'petugas', 'Operasional harian CFD: verifikasi pedagang, penataan lapak, jadwal'),
    ('Pedagang', 'pedagang', 'Pedagang terdaftar yang mengikuti CFD');

INSERT INTO permissions (name, slug, description) VALUES
    ('Buat user', 'users.create', 'Membuat akun petugas/superadmin baru'),
    ('Lihat user', 'users.read', 'Melihat daftar akun'),
    ('Ubah user', 'users.update', 'Mengubah data akun'),
    ('Hapus user', 'users.delete', 'Menghapus (soft delete) akun'),
    ('Lihat pedagang', 'pedagang.read', 'Melihat daftar pedagang'),
    ('Approve pedagang', 'pedagang.approve', 'Menyetujui/menolak pendaftaran pedagang'),
    ('Export pedagang', 'pedagang.export', 'Mengekspor data pedagang'),
    ('Kelola penataan', 'penataan.manage', 'Mengatur penempatan lapak pedagang'),
    ('Kelola jadwal', 'jadwal.manage', 'Mengatur jadwal operasional CFD'),
    ('Lihat jadwal', 'jadwal.read', 'Melihat jadwal operasional CFD'),
    ('Lihat profil sendiri', 'profil.read', 'Melihat profil sendiri'),
    ('Ubah profil sendiri', 'profil.update', 'Mengubah profil sendiri');
