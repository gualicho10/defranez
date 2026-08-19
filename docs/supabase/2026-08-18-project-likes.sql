-- Project like button — schema, functions and lockdown.
-- Run this in the Supabase SQL editor for project aqtfbzrdwbdymaoskxpt
-- BEFORE deploying the frontend. Safe to re-run.
--
-- Design: docs/superpowers/specs/2026-08-18-project-like-button-design.md
--
-- The two tables below get NO public RLS policy of any kind. Every read and
-- write goes through the SECURITY DEFINER functions at the bottom. This is the
-- same posture as `visits` and `link_clicks` after the August 2026 lockdown —
-- do not add a public policy here to "make it work".

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.project_likes (
  id           bigint generated always as identity primary key,
  project_slug text        not null,
  visitor_id   uuid        not null,
  created_at   timestamptz not null default now(),
  constraint project_likes_slug_visitor_key unique (project_slug, visitor_id)
);

create index if not exists project_likes_slug_idx
  on public.project_likes (project_slug);

-- Rate-limit ledger. Stores a SALTED HASH of the caller's IP, never the IP.
-- Counting repeat callers needs equality, not identity.
create table if not exists public.like_rate (
  ip_hash      text        not null,
  window_start timestamptz not null,
  n            int         not null default 0,
  primary key (ip_hash, window_start)
);

alter table public.project_likes enable row level security;
alter table public.like_rate     enable row level security;

-- Deliberately no policies: RLS on with zero policies denies everything to
-- anon and authenticated. SECURITY DEFINER functions bypass it.

revoke all on public.project_likes from anon, authenticated;
revoke all on public.like_rate     from anon, authenticated;

-- ── Rate-limit salt ─────────────────────────────────────────────────────────
-- Reuses the locked-down app_secrets table created during the tracker lockdown.

create table if not exists public.app_secrets (
  key   text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

insert into public.app_secrets (key, value)
values ('like_ip_salt', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- ── Functions ───────────────────────────────────────────────────────────────

-- Totals for every project that has at least one like.
-- Public on purpose: these numbers are meant to be seen. Unlike the tracker's
-- reporting RPCs, there is no password gate here.
create or replace function public.get_project_likes()
returns table (project_slug text, total int)
language sql
security definer
set search_path = public
stable
as $$
  select l.project_slug, count(*)::int
  from public.project_likes l
  group by l.project_slug;
$$;

-- Toggle one visitor's like and return the resulting total and state.
--
-- On rate limit this returns the CURRENT total unchanged rather than raising.
-- A throttled caller cannot tell their call was dropped, so an abuser gets no
-- signal to tune against.
create or replace function public.toggle_project_like(
  p_slug    text,
  p_visitor uuid
)
returns table (total int, liked boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap        constant int := 12;        -- toggles per IP per hour
  v_window     timestamptz := date_trunc('hour', now());
  v_salt       text;
  v_ip         text;
  v_hash       text;
  v_n          int;
  v_existed    boolean;
begin
  if p_slug is null or p_visitor is null then
    raise exception 'slug and visitor are required';
  end if;

  -- Reject unknown slugs so the table cannot be seeded with junk keys.
  if p_slug not in ('openloot','dipper','roche','games','branding','sketchup') then
    raise exception 'unknown project slug';
  end if;

  select value into v_salt from public.app_secrets where key = 'like_ip_salt';

  -- PostgREST forwards the caller's headers; missing header means direct SQL.
  begin
    v_ip := split_part(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
      ',', 1);
  exception when others then
    v_ip := '';
  end;

  if v_ip <> '' and v_salt is not null then
    v_hash := encode(digest(v_salt || trim(v_ip), 'sha256'), 'hex');

    insert into public.like_rate (ip_hash, window_start, n)
    values (v_hash, v_window, 1)
    on conflict (ip_hash, window_start)
      do update set n = public.like_rate.n + 1
    returning n into v_n;

    if v_n > v_cap then
      -- Over the cap: report the truth about the world, ignore the request.
      return query
        select coalesce((select count(*)::int from public.project_likes l
                         where l.project_slug = p_slug), 0),
               exists (select 1 from public.project_likes l
                       where l.project_slug = p_slug and l.visitor_id = p_visitor);
      return;
    end if;
  end if;

  select exists (
    select 1 from public.project_likes l
    where l.project_slug = p_slug and l.visitor_id = p_visitor
  ) into v_existed;

  if v_existed then
    delete from public.project_likes l
    where l.project_slug = p_slug and l.visitor_id = p_visitor;
  else
    insert into public.project_likes (project_slug, visitor_id)
    values (p_slug, p_visitor)
    on conflict (project_slug, visitor_id) do nothing;
  end if;

  return query
    select (select count(*)::int from public.project_likes l
            where l.project_slug = p_slug),
           not v_existed;
end;
$$;

-- pgcrypto provides digest() and gen_random_bytes().
create extension if not exists pgcrypto;

grant execute on function public.get_project_likes()               to anon, authenticated;
grant execute on function public.toggle_project_like(text, uuid)   to anon, authenticated;

-- ── Check ───────────────────────────────────────────────────────────────────
-- select * from public.get_project_likes();
-- select * from public.toggle_project_like('openloot', gen_random_uuid());
