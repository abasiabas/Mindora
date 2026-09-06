-- ============================================================================
-- MINDORA — Row Level Security (Phase 4 / Security Priority: bind 32, 44, 61)
-- Principle: user sees only their own data; org manager sees only their org;
-- owner/admin get explicit, auditable elevated access via helper functions.
-- Service role key (server-only) bypasses RLS by design — never expose it
-- to the client. All client-side Supabase calls use the anon key + RLS.
-- ============================================================================

-- Helper: current user's role names (works inside policies)
create or replace function auth_has_role(target_role text)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = target_role
  );
$$;

-- Helper: is user OWNER or ADMIN
create or replace function auth_is_staff()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select auth_has_role('OWNER') or auth_has_role('ADMIN') or auth_has_role('SUPPORT');
$$;

-- Helper: current user's organization_id
create or replace function auth_org_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid();
$$;

-- Helper: is user the manager of a given organization
create or replace function auth_is_org_manager(org_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role_in_org = 'manager'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Enable RLS everywhere sensitive
-- ─────────────────────────────────────────────────────────────────────────
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table payments enable row level security;
alter table organization_members enable row level security;
alter table devices enable row level security;
alter table sessions enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table memories enable row level security;
alter table knowledge_base enable row level security;
alter table assessments enable row level security;
alter table assessment_questions enable row level security;
alter table assessment_results enable row level security;
alter table goals enable row level security;
alter table progress enable row level security;
alter table reports enable row level security;
alter table evidence_sources enable row level security;
alter table evidence_items enable row level security;
alter table safety_events enable row level security;
alter table consent_records enable row level security;
alter table audit_logs enable row level security;
alter table feature_flags enable row level security;
alter table content enable row level security;
alter table notifications enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────
create policy "profiles_select_own_or_staff" on profiles for select
  using (id = auth.uid() or auth_is_staff()
    or (auth_is_org_manager(organization_id)));
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_staff_manage" on profiles for update
  using (auth_is_staff());

-- ─────────────────────────────────────────────────────────────────────────
-- ORGANIZATIONS — members/manager see their own org; staff see all
-- ─────────────────────────────────────────────────────────────────────────
create policy "organizations_select" on organizations for select
  using (
    auth_is_staff()
    or id = auth_org_id()
  );
create policy "organizations_manager_update" on organizations for update
  using (auth_is_org_manager(id) or auth_is_staff());

create policy "org_members_select" on organization_members for select
  using (
    user_id = auth.uid()
    or auth_is_org_manager(organization_id)
    or auth_is_staff()
  );
create policy "org_members_manager_write" on organization_members for all
  using (auth_is_org_manager(organization_id) or auth_is_staff());

-- ─────────────────────────────────────────────────────────────────────────
-- USER-OWNED DATA (strict owner-only pattern, repeated per table)
-- ─────────────────────────────────────────────────────────────────────────
create policy "subscriptions_owner_select" on subscriptions for select
  using (user_id = auth.uid() or auth_is_org_manager(organization_id) or auth_is_staff());

create policy "payments_owner_select" on payments for select
  using (user_id = auth.uid() or auth_is_staff());

create policy "devices_owner_all" on devices for all
  using (user_id = auth.uid() or auth_is_staff());

create policy "sessions_owner_select" on sessions for select
  using (user_id = auth.uid() or auth_is_staff());

create policy "conversations_owner_all" on conversations for all
  using (user_id = auth.uid() or auth_is_staff());

create policy "messages_owner_select" on messages for select
  using (
    exists (select 1 from conversations c
            where c.id = conversation_id and (c.user_id = auth.uid() or auth_is_staff()))
  );
create policy "messages_owner_insert" on messages for insert
  with check (
    exists (select 1 from conversations c
            where c.id = conversation_id and c.user_id = auth.uid())
  );

create policy "memories_owner_all" on memories for all
  using (user_id = auth.uid() or auth_is_staff());

create policy "knowledge_base_owner_all" on knowledge_base for all
  using (user_id = auth.uid() or auth_is_staff());

create policy "assessment_results_owner_select" on assessment_results for select
  using (user_id = auth.uid() or auth_is_staff());
create policy "assessment_results_owner_insert" on assessment_results for insert
  with check (user_id = auth.uid());

create policy "goals_owner_all" on goals for all
  using (user_id = auth.uid() or auth_is_staff());

create policy "progress_owner_all" on progress for all
  using (user_id = auth.uid() or auth_is_staff());

create policy "reports_owner_select" on reports for select
  using (user_id = auth.uid() or auth_is_staff());

create policy "safety_events_owner_select" on safety_events for select
  using (user_id = auth.uid() or auth_is_staff());
-- Note: safety_events are written only by server-side (service role) safety
-- pipeline, never directly by the client — no client insert policy exists.

create policy "consent_owner_all" on consent_records for all
  using (user_id = auth.uid() or auth_is_staff());

create policy "notifications_owner_all" on notifications for all
  using (user_id = auth.uid() or auth_is_staff());

-- ─────────────────────────────────────────────────────────────────────────
-- PUBLIC / SHARED REFERENCE DATA (read-only for everyone, write = staff only)
-- ─────────────────────────────────────────────────────────────────────────
create policy "plans_public_read_active" on plans for select
  using (is_active = true or auth_is_staff());
create policy "plans_staff_write" on plans for all
  using (auth_is_staff());

create policy "assessments_public_read" on assessments for select
  using (is_active = true or auth_is_staff());
create policy "assessment_questions_public_read" on assessment_questions for select
  using (true);

create policy "evidence_sources_public_read" on evidence_sources for select using (true);
create policy "evidence_items_public_read" on evidence_items for select using (true);
create policy "evidence_staff_write" on evidence_items for all using (auth_is_staff());

create policy "feature_flags_public_read" on feature_flags for select using (true);
create policy "feature_flags_staff_write" on feature_flags for all using (auth_is_staff());

create policy "content_public_read_active" on content for select
  using (is_active = true or auth_is_staff());
create policy "content_staff_write" on content for all using (auth_is_staff());

-- ─────────────────────────────────────────────────────────────────────────
-- STAFF-ONLY TABLES
-- ─────────────────────────────────────────────────────────────────────────
create policy "user_roles_staff_only" on user_roles for all using (auth_is_staff());
create policy "audit_logs_staff_read_only" on audit_logs for select using (auth_is_staff());
-- No insert/update/delete policy for audit_logs for any client role:
-- audit entries are written exclusively by server-side service-role code.
