-- Rollback
DROP INDEX IF EXISTS idx_kehadiran_pedagang_sesi;
DROP INDEX IF EXISTS idx_kehadiran_session;
DROP INDEX IF EXISTS idx_kehadiran_pedagang;
DROP INDEX IF EXISTS idx_kehadiran_scanned_by;
DROP INDEX IF EXISTS idx_kehadiran_check_in_at;

DROP TABLE IF EXISTS kehadiran_pedagang;

DELETE FROM role_permissions 
WHERE permission_id IN (SELECT id FROM permissions WHERE slug = 'pedagang.scan');

DELETE FROM permissions WHERE slug = 'pedagang.scan';