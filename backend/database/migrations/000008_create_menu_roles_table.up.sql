CREATE TABLE menu_roles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id    UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_menu_roles_active ON menu_roles (menu_id, role_id) WHERE deleted_at IS NULL;
