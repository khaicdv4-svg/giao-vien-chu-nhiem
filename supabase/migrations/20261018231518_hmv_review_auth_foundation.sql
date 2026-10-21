-- DEVELOPMENT ONLY. Created by Supabase CLI 2.121.0; not applied to any database.
-- No users, permissions or secrets are seeded. No official publication endpoint/state.
begin;

create schema hmv_private;
revoke all on schema hmv_private from public, anon, authenticated;
grant usage on schema hmv_private to authenticated;

-- Justified SECURITY DEFINER: reads auth.sessions without exposing that table.
-- Caller identity is always auth.uid(); no caller-supplied identity parameters.
create function hmv_private.live_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
    and exists(select 1 from auth.sessions s
      where s.user_id = auth.uid() and s.id::text = auth.jwt()->>'session_id');
$$;
revoke all on function hmv_private.live_session() from public, anon, authenticated;
grant execute on function hmv_private.live_session() to authenticated;

create table public.hmv_user_permissions (
  user_id uuid not null references auth.users(id),
  school_id uuid not null,
  permission text not null check(permission in ('submit','review')),
  enabled boolean not null default false,
  primary key(user_id, school_id, permission)
);
alter table public.hmv_user_permissions enable row level security;
revoke all on public.hmv_user_permissions from public, anon, authenticated;
grant select on public.hmv_user_permissions to authenticated;
create policy hmv_permissions_read_own on public.hmv_user_permissions
  for select to authenticated using (
    (select hmv_private.live_session()) and user_id = (select auth.uid())
  );
-- No write grants or client policies for permission assignment/revocation.

create table public.hmv_review_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  author_id uuid not null default auth.uid() references auth.users(id),
  material_id uuid not null,
  material_version integer not null check(material_version > 0),
  snapshot jsonb not null check(jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 100000),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  row_version integer not null default 1 check(row_version > 0),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text not null default '' check(length(review_note) <= 2000),
  created_at timestamptz not null default now(),
  unique(school_id, author_id, material_id, material_version),
  check((status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status in ('approved','rejected') and reviewed_by is not null and reviewed_at is not null)),
  check(status <> 'rejected' or length(trim(review_note)) > 0)
);
create index hmv_pending_by_school on public.hmv_review_requests(school_id, created_at) where status = 'pending';
alter table public.hmv_review_requests enable row level security;
revoke all on public.hmv_review_requests from public, anon, authenticated;
grant select on public.hmv_review_requests to authenticated;
grant insert(school_id,material_id,material_version,snapshot) on public.hmv_review_requests to authenticated;
grant update(status,reviewed_by,reviewed_at,review_note,row_version) on public.hmv_review_requests to authenticated;

create policy hmv_requests_read on public.hmv_review_requests
  for select to authenticated using (
    (select hmv_private.live_session()) and (
      author_id = (select auth.uid()) or exists (
        select 1 from public.hmv_user_permissions p where p.user_id = (select auth.uid())
          and p.school_id = hmv_review_requests.school_id and p.permission = 'review' and p.enabled
      )
    )
  );
create policy hmv_requests_submit on public.hmv_review_requests
  for insert to authenticated with check (
    (select hmv_private.live_session()) and author_id = (select auth.uid()) and status = 'pending'
    and row_version = 1 and reviewed_by is null and exists (
      select 1 from public.hmv_user_permissions p where p.user_id = (select auth.uid())
        and p.school_id = hmv_review_requests.school_id and p.permission = 'submit' and p.enabled
    )
  );
create policy hmv_requests_decide on public.hmv_review_requests
  for update to authenticated using (
    (select hmv_private.live_session()) and status = 'pending' and author_id <> (select auth.uid())
    and exists(select 1 from public.hmv_user_permissions p where p.user_id = (select auth.uid())
      and p.school_id = hmv_review_requests.school_id and p.permission = 'review' and p.enabled)
  ) with check (
    (select hmv_private.live_session()) and status in ('approved','rejected')
    and author_id <> (select auth.uid()) and reviewed_by = (select auth.uid())
    and exists(select 1 from public.hmv_user_permissions p where p.user_id = (select auth.uid())
      and p.school_id = hmv_review_requests.school_id and p.permission = 'review' and p.enabled)
  );

-- Enforces immutability and audit also for direct Data API PATCH, not only the RPC.
create table hmv_private.review_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.hmv_review_requests(id),
  actor_id uuid not null references auth.users(id),
  decision text not null check(decision in ('approved','rejected')),
  at timestamptz not null default now()
);
alter table hmv_private.review_events enable row level security;
revoke all on hmv_private.review_events from public, anon, authenticated;
create function hmv_private.record_decision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not hmv_private.live_session() or auth.uid() is null then
    raise exception 'Session required' using errcode = '42501';
  end if;
  if old.status <> 'pending' or new.status not in ('approved','rejected')
    or old.author_id = auth.uid()
    or not exists(select 1 from public.hmv_user_permissions p where p.user_id = auth.uid()
      and p.school_id = old.school_id and p.permission = 'review' and p.enabled)
    or (new.id,new.school_id,new.author_id,new.material_id,new.material_version,new.snapshot,new.created_at)
      is distinct from (old.id,old.school_id,old.author_id,old.material_id,old.material_version,old.snapshot,old.created_at)
    or new.row_version <> old.row_version + 1 then
    raise exception 'Decision forbidden' using errcode = '42501';
  end if;
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  insert into hmv_private.review_events(request_id,actor_id,decision)
    values(old.id,auth.uid(),new.status);
  return new;
end;
$$;
revoke all on function hmv_private.record_decision() from public, anon, authenticated;
create trigger hmv_request_decision before update on public.hmv_review_requests
  for each row execute function hmv_private.record_decision();

create function public.hmv_session_is_active() returns boolean
language sql stable security invoker set search_path = '' as $$
  select hmv_private.live_session();
$$;
create function public.hmv_create_review_request(p_school_id uuid,p_material_id uuid,p_material_version integer,p_snapshot jsonb)
returns public.hmv_review_requests language sql security invoker set search_path = '' as $$
  insert into public.hmv_review_requests(school_id,material_id,material_version,snapshot)
    values(p_school_id,p_material_id,p_material_version,p_snapshot) returning *;
$$;
create function public.hmv_decide_review_request(p_id uuid,p_expected_version integer,p_decision text,p_note text)
returns public.hmv_review_requests language plpgsql security invoker set search_path = '' as $$
declare result public.hmv_review_requests;
begin
  if p_decision is null or p_decision not in ('approved','rejected') or p_note is null
    or length(p_note) > 2000 or (p_decision = 'rejected' and length(trim(p_note)) = 0) then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  update public.hmv_review_requests set status=p_decision,reviewed_by=auth.uid(),
    reviewed_at=now(),review_note=p_note,row_version=row_version+1
    where id=p_id and row_version=p_expected_version and status='pending' returning * into result;
  if not found then raise exception 'Not visible or stale version' using errcode = '40001'; end if;
  return result;
end;
$$;
revoke all on function public.hmv_session_is_active() from public, anon, authenticated;
revoke all on function public.hmv_create_review_request(uuid,uuid,integer,jsonb) from public, anon, authenticated;
revoke all on function public.hmv_decide_review_request(uuid,integer,text,text) from public, anon, authenticated;
grant execute on function public.hmv_session_is_active() to authenticated;
grant execute on function public.hmv_create_review_request(uuid,uuid,integer,jsonb) to authenticated;
grant execute on function public.hmv_decide_review_request(uuid,integer,text,text) to authenticated;

commit;
