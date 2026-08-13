DELETE FROM role_permissions
USING roles
WHERE role_permissions.role_id = roles.id
  AND roles.slug IN ('superadmin', 'petugas', 'pedagang');
