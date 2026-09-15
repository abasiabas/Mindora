-- Defensive idempotency for subscriptions/user_roles inserts in the
-- new-user provisioning trigger. consent_records intentionally has NO
-- unique constraint on (user_id, consent_type) -- it's an append-only
-- consent history log, so no ON CONFLICT is added there.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  free_plan_id uuid;
begin
  insert into public.profiles (id, full_name, preferred_language)
  values (new.id, new.raw_user_meta_data->>'full_name', 'fa')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  values (new.id, 5) -- USER
  on conflict do nothing;

  insert into public.consent_records (user_id, consent_type, granted, version)
  values (new.id, 'terms', true, 'v1');

  select id into free_plan_id from public.plans where code = 'free' limit 1;
  if free_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status, starts_at)
    values (new.id, free_plan_id, 'active', now())
    on conflict do nothing;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id)
  values (new.id, 'USER', 'account_created', 'profile', new.id);

  return new;
end;
$function$;
