-- Superadmin: semua permission yang ada
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'superadmin' AND r.deleted_at IS NULL;

-- Petugas CFD: operasional pedagang, penataan, jadwal, plus profil sendiri
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'petugas' AND r.deleted_at IS NULL
  AND p.slug IN (
    'pedagang.read',
    'pedagang.approve',
    'pedagang.export',
    'penataan.manage',
    'jadwal.manage',
    'jadwal.read',
    'profil.read',
    'profil.update'
  );

-- Pedagang: cuma profil sendiri
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'pedagang' AND r.deleted_at IS NULL
  AND p.slug IN ('profil.read', 'profil.update');
