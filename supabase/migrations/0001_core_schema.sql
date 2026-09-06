-- ============================================================================
-- MINDORA — Core Schema (Phase 4)
-- Covers: identity, roles/RBAC, organizations, subscriptions/plans, payments,
-- devices/sessions, conversations, memory, assessments, progress, evidence,
-- safety events, consent, audit logs, feature flags, content.
-- Design principles: normalized, FK-constrained, RLS-first, no hardcoded limits.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- ORGANIZATIONS (multi-tenant root — created before profiles for FK order)
-- ─────────────────────────────────────────────────────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  settings jsonb not null default '{}'::jsonb, -- branding, privacy, notification prefs
  max_users int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- ROLES / PERMISSIONS (RBAC)
-- ─────────────────────────────────────────────────────────────────────────
create table roles (
  id smallint primary key,
  name text unique not null -- OWNER, ADMIN, SUPPORT, ORGANIZATION_MANAGER, USER
);
insert into roles (id, name) values
  (1, 'OWNER'), (2, 'ADMIN'), (3, 'SUPPORT'), (4, 'ORGANIZATION_MANAGER'), (5, 'USER');

create table permissions (
  id serial primary key,
  code text unique not null,      -- e.g. 'users.suspend', 'payments.view'
  description text
);

create table role_permissions (
  role_id smallint references roles(id) on delete cascade,
  permission_id int references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- PROFILES (extends auth.users from Supabase Auth)
-- ─────────────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  full_name text,
  preferred_language text not null default 'fa',
  avatar_url text,
  timezone text,
  onboarding_completed boolean not null default false,
  notification_settings jsonb not null default '{}'::jsonb,
  privacy_settings jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_organization on profiles(organization_id);

create table user_roles (
  user_id uuid references profiles(id) on delete cascade,
  role_id smallint references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- PLANS / SUBSCRIPTIONS / PAYMENTS (database-driven, no hardcoded pricing)
-- ─────────────────────────────────────────────────────────────────────────
create table plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,           -- 'free', 'vip_1m', 'vip_lifetime', 'org_1y', ...
  name text not null,
  type text not null check (type in ('free','vip','organization')),
  duration_days int,                    -- null = lifetime
  price numeric(12,2) not null default 0,
  currency text not null default 'IRT',
  daily_message_limit int not null default 10,
  memory_level text not null default 'none' check (memory_level in ('none','basic','long_term')),
  can_use_voice boolean not null default false,
  can_monthly_assessment boolean not null default false,
  can_access_reports boolean not null default false,
  max_devices int not null default 1,
  organization_capable boolean not null default false,
  features jsonb not null default '{}'::jsonb, -- extensible flags without migrations
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz, -- null = lifetime
  granted_by_owner boolean not null default false, -- true for gift accounts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or organization_id is not null)
);
create index idx_subscriptions_user on subscriptions(user_id);
create index idx_subscriptions_org on subscriptions(organization_id);
create index idx_subscriptions_status on subscriptions(status);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid not null references plans(id),
  subscription_id uuid references subscriptions(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'IRT',
  gateway text not null default 'zarinpal',
  authority text,              -- ZarinPal authority token
  payment_ref_id text,         -- ZarinPal ref_id after verification
  status text not null default 'initiated'
    check (status in ('initiated','pending_verification','verified','failed','refunded')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_payments_user on payments(user_id);
create index idx_payments_authority on payments(authority);

-- ─────────────────────────────────────────────────────────────────────────
-- ORGANIZATION MEMBERSHIP
-- ─────────────────────────────────────────────────────────────────────────
create table organization_members (
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role_in_org text not null default 'member' check (role_in_org in ('manager','member')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (organization_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- DEVICES / SESSIONS (backend-enforced device limits)
-- ─────────────────────────────────────────────────────────────────────────
create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  device_label text,             -- e.g. "Chrome on Windows" — no browser fingerprinting
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_devices_user on devices(user_id);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  device_id uuid references devices(id) on delete cascade,
  refresh_token_hash text not null,
  ip_metadata text,               -- coarse only (e.g. country), never full IP retained long-term
  revoked boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index idx_sessions_user on sessions(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- CONVERSATIONS / MESSAGES / MEMORY / KNOWLEDGE BASE
-- ─────────────────────────────────────────────────────────────────────────
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_conversations_user on conversations(user_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  intent text,
  evidence_used jsonb,               -- array of evidence_item ids shown to the user
  safety_status text default 'ok' check (safety_status in ('ok','flagged','escalated','blocked')),
  medication_detected boolean not null default false,
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);
create index idx_messages_conversation on messages(conversation_id);
create index idx_messages_safety on messages(safety_status);

create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null,          -- goal, preference, context, self-reported
  content text not null,
  consented boolean not null default false, -- never store sensitive info without explicit consent
  created_at timestamptz not null default now()
);
create index idx_memories_user on memories(user_id);

create table knowledge_base (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  topic text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_kb_user on knowledge_base(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- ASSESSMENTS
-- ─────────────────────────────────────────────────────────────────────────
create table assessments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,       -- e.g. 'phq9', 'gad7' (only validated, licensed instruments)
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  order_index int not null,
  question_text text not null,
  options jsonb not null            -- [{ "label": "...", "value": 0 }, ...]
);
create index idx_assessment_questions_assessment on assessment_questions(assessment_id);

create table assessment_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  assessment_id uuid not null references assessments(id),
  answers jsonb not null,
  score numeric,
  interpretation_note text,          -- non-diagnostic language only, enforced at app layer
  created_at timestamptz not null default now()
);
create index idx_assessment_results_user on assessment_results(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- GOALS / PROGRESS / REPORTS
-- ─────────────────────────────────────────────────────────────────────────
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active','achieved','paused','dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_goals_user on goals(user_id);

create table progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  note text,
  metric jsonb,
  recorded_at timestamptz not null default now()
);
create index idx_progress_user on progress(user_id);

create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  summary text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index idx_reports_user on reports(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- EVIDENCE ENGINE
-- ─────────────────────────────────────────────────────────────────────────
create table evidence_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- WHO, APA, NICE, Cochrane, PubMed, ...
  tier smallint not null check (tier in (1,2,3)),
  base_url text,
  created_at timestamptz not null default now()
);

create table evidence_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references evidence_sources(id),
  title text not null,
  authors text,
  organization text,
  publication_date date,
  source_url text not null,
  doi text,
  evidence_type text,               -- systematic_review, meta_analysis, clinical_guideline, ...
  evidence_level text,              -- e.g. Tier 1 / Grade A
  topic text not null,
  language text not null default 'en',
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_evidence_topic on evidence_items(topic);
create index idx_evidence_source on evidence_items(source_id);

-- ─────────────────────────────────────────────────────────────────────────
-- SAFETY / CONSENT / AUDIT
-- ─────────────────────────────────────────────────────────────────────────
create table safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  event_type text not null check (event_type in (
    'crisis','self_harm','suicide_risk','abuse','severe_distress',
    'medication_request','diagnosis_request','out_of_scope','unsupported_evidence'
  )),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  action_taken text,                -- 'escalated', 'resource_provided', 'blocked_response', ...
  created_at timestamptz not null default now()
);
create index idx_safety_events_user on safety_events(user_id);
create index idx_safety_events_type on safety_events(event_type);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  consent_type text not null check (consent_type in
    ('privacy_policy','ai_usage','data_storage','memory','assessment','analytics','terms')),
  granted boolean not null,
  version text not null,
  created_at timestamptz not null default now()
);
create index idx_consent_user on consent_records(user_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  actor_role text,
  action text not null,            -- 'login','subscription_change','gift_account', ...
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_actor on audit_logs(actor_id);
create index idx_audit_action on audit_logs(action);
-- Audit logs are append-only: no update/delete grants issued to any app role.

-- ─────────────────────────────────────────────────────────────────────────
-- FEATURE FLAGS / CONTENT (no-code updates)
-- ─────────────────────────────────────────────────────────────────────────
create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,      -- 'voice', 'new_assessment', ...
  is_enabled boolean not null default false,
  rollout_scope jsonb not null default '{}'::jsonb, -- e.g. {"plan_types": ["vip"]}
  updated_at timestamptz not null default now()
);

create table content (
  id uuid primary key default gen_random_uuid(),
  type text not null,             -- 'faq','safety_message','announcement','plan_description', ...
  key text not null,
  locale text not null default 'fa',
  body jsonb not null,
  version int not null default 1,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (type, key, locale, version)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at helper trigger
-- ─────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','plans','subscriptions','conversations',
    'knowledge_base','goals'
  ]
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I
       for each row execute function set_updated_at();', t);
  end loop;
end $$;
