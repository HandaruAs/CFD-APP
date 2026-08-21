DELETE FROM menu_roles WHERE menu_id IN (
    SELECT id FROM menus WHERE slug = 'admin-manajemen-menu'
);
DELETE FROM menus WHERE slug = 'admin-manajemen-menu';