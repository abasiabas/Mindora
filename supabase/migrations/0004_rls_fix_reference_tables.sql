-- Fix: roles/permissions/role_permissions had NO RLS at all — a real
-- privilege-escalation gap. Now: everyone can read (needed for role-name
-- lookups), only staff (OWNER/ADMIN/SUPPORT) can write.
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;

create policy "roles_public_read" on roles for select using (true);
create policy "roles_staff_write" on roles for all using (auth_is_staff());

create policy "permissions_public_read" on permissions for select using (true);
create policy "permissions_staff_write" on permissions for all using (auth_is_staff());

create policy "role_permissions_public_read" on role_permissions for select using (true);
create policy "role_permissions_staff_write" on role_permissions for all using (auth_is_staff());

-- Consistency fix: evidence_sources had a read-only policy but (unlike
-- evidence_items) no staff-write policy at all.
create policy "evidence_sources_staff_write" on evidence_sources for all using (auth_is_staff());
