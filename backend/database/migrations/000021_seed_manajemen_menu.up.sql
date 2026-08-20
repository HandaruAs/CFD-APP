INSERT INTO menus (id, name, slug, icon, route, sort_order, pedagang_stage) VALUES
    (gen_random_uuid(), 'Manajemen Menu', 'admin-manajemen-menu', 'settings', '/admin/manajemen-menu', 7, NULL);

INSERT INTO menu_roles (menu_id, role_id)
SELECT m.id, r.id FROM menus m, roles r
WHERE m.slug = 'admin-manajemen-menu' AND r.slug = 'superadmin';