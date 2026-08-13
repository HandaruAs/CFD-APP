DELETE FROM permissions WHERE slug IN (
    'users.create','users.read','users.update','users.delete',
    'pedagang.read','pedagang.approve','pedagang.export',
    'penataan.manage','jadwal.manage','jadwal.read',
    'profil.read','profil.update'
);
DELETE FROM roles WHERE slug IN ('superadmin','petugas','pedagang');
