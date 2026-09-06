-- ============================================================================
-- MINDORA — Seed data (bind 18–21, 26: plans must exist before any signup)
-- Prices/limits are illustrative starting values — Owner can change them
-- from the Admin Panel later (Phase 15) without touching code (bind 27).
-- ============================================================================

insert into plans (code, name, type, duration_days, price, currency,
  daily_message_limit, memory_level, can_use_voice, can_monthly_assessment,
  can_access_reports, max_devices, organization_capable, features)
values
  ('free', 'رایگان', 'free', null, 0, 'IRT',
    10, 'none', false, false, false, 1, false, '{"voice_visible_locked": true}'),

  ('vip_1m', 'ویژه ۱ ماهه', 'vip', 30, 1500000, 'IRT',
    9999, 'long_term', true, true, true, 1, false, '{}'),

  ('vip_3m', 'ویژه ۳ ماهه', 'vip', 90, 4000000, 'IRT',
    9999, 'long_term', true, true, true, 1, false, '{}'),

  ('vip_6m', 'ویژه ۶ ماهه', 'vip', 180, 7000000, 'IRT',
    9999, 'long_term', true, true, true, 1, false, '{}'),

  ('vip_1y', 'ویژه ۱ ساله', 'vip', 365, 12000000, 'IRT',
    9999, 'long_term', true, true, true, 1, false, '{}'),

  ('vip_lifetime', 'ویژه مادام‌العمر', 'vip', null, 25000000, 'IRT',
    9999, 'long_term', true, true, true, 1, false, '{}'),

  ('org_1y', 'سازمانی ۱ ساله', 'organization', 365, 50000000, 'IRT',
    9999, 'long_term', true, true, true, 5, true, '{"seats": 5}'),

  ('org_lifetime', 'سازمانی مادام‌العمر', 'organization', null, 100000000, 'IRT',
    9999, 'long_term', true, true, true, 5, true, '{"seats": 5}')
on conflict (code) do nothing;

-- Evidence source registry (Tier 1 per bind 6)
insert into evidence_sources (name, tier, base_url) values
  ('World Health Organization (WHO)', 1, 'https://www.who.int'),
  ('American Psychological Association (APA)', 1, 'https://www.apa.org'),
  ('NICE Guidelines', 1, 'https://www.nice.org.uk'),
  ('NHS', 1, 'https://www.nhs.uk'),
  ('Cochrane Library', 1, 'https://www.cochranelibrary.com'),
  ('PubMed / NCBI', 1, 'https://pubmed.ncbi.nlm.nih.gov')
on conflict do nothing;

-- Feature flags (bind 55) — voice ships disabled-by-default for everyone
-- until the Voice pipeline (Phase 8/16) is actually implemented.
insert into feature_flags (code, is_enabled, rollout_scope) values
  ('voice', false, '{"note": "UI shows locked state per plan; pipeline not yet built"}'),
  ('monthly_assessment', false, '{}'),
  ('organization_dashboard', false, '{}')
on conflict (code) do nothing;
