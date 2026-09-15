create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('user', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.tournament_status as enum ('draft', 'published', 'completed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.match_status as enum ('scheduled', 'live', 'finished', 'cancelled'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null unique,
  role public.app_role not null default 'user',
  favorite_sport text not null default 'football',
  avatar_url text,
  profile_color text not null default '#10B981' check (profile_color ~ '^#[0-9A-Fa-f]{6}$'),
  language text not null default 'en' check (language in ('cs', 'en')),
  created_at timestamptz not null default now()
);

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique check (code ~ '^[a-z0-9_-]+$'),
  active boolean not null default true,
  scoring_type text not null,
  periods_config jsonb not null default '{}'::jsonb
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null check (char_length(short_name) between 3 and 4),
  primary_sport text not null references public.sports(code) on update cascade,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null references public.sports(code) on update cascade,
  location text not null,
  start_date date not null,
  status public.tournament_status not null default 'draft',
  logo_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_teams (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tournament_id, team_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  match_date date not null,
  match_time time not null,
  pitch_location text not null,
  status public.match_status not null default 'scheduled',
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  clock_seconds integer not null default 0 check (clock_seconds >= 0),
  clock_started_at timestamptz,
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table if not exists public.match_access_codes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  pin_hash text not null,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type text not null check (event_type in ('score', 'yellow_card', 'red_card', 'timer_start', 'timer_pause')),
  team_id uuid references public.teams(id) on delete set null,
  player_name text,
  score_delta_home integer not null default 0,
  score_delta_away integer not null default 0,
  clock_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists teams_created_by_idx on public.teams(created_by);
create index if not exists tournaments_created_by_idx on public.tournaments(created_by);
create index if not exists matches_tournament_idx on public.matches(tournament_id, match_date, match_time);
create index if not exists match_events_match_idx on public.match_events(match_id, created_at);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_manage_tournament(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists(select 1 from public.tournaments where id = target and created_by = auth.uid());
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, email, language)
  values(new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)), new.email, coalesce(new.raw_user_meta_data ->> 'language', 'en'));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.valid_scorekeeper_access(secret text)
returns uuid language sql stable security definer set search_path = '' as $$
  select match_id from public.match_access_codes
  where expires_at > now() and (token::text = secret or pin_hash = extensions.crypt(secret, pin_hash)) limit 1;
$$;

create or replace function public.generate_match_access(target_match uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare generated_pin text := lpad(floor(random() * 1000000)::int::text, 6, '0'); generated_token uuid := gen_random_uuid(); expiry timestamptz := now() + interval '12 hours'; tournament uuid;
begin
  select tournament_id into tournament from public.matches where id = target_match;
  if not public.can_manage_tournament(tournament) then raise exception 'Not authorized'; end if;
  insert into public.match_access_codes(match_id, pin_hash, token, expires_at, created_by)
  values(target_match, extensions.crypt(generated_pin, extensions.gen_salt('bf')), generated_token, expiry, auth.uid())
  on conflict(match_id) do update set pin_hash = excluded.pin_hash, token = excluded.token, expires_at = excluded.expires_at, created_by = excluded.created_by, created_at = now();
  return jsonb_build_object('pin', generated_pin, 'token', generated_token, 'expires_at', expiry);
end;
$$;

create or replace function public.scorekeeper_match(secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare target uuid := public.valid_scorekeeper_access(secret); result jsonb;
begin
  if target is null then raise exception 'Invalid or expired access'; end if;
  select jsonb_build_object('match', to_jsonb(m), 'homeTeam', to_jsonb(h), 'awayTeam', to_jsonb(a), 'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.match_events e where e.match_id = m.id), '[]'::jsonb)) into result
  from public.matches m join public.teams h on h.id = m.home_team_id join public.teams a on a.id = m.away_team_id where m.id = target;
  return result;
end;
$$;

create or replace function public.record_match_event(secret text, event_name text, target_team uuid default null, player text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare target uuid := public.valid_scorekeeper_access(secret); m public.matches%rowtype; elapsed integer; dh integer := 0; da integer := 0;
begin
  if target is null then raise exception 'Invalid or expired access'; end if;
  select * into m from public.matches where id = target for update;
  elapsed := m.clock_seconds + case when m.clock_started_at is null then 0 else extract(epoch from (now() - m.clock_started_at))::integer end;
  if event_name = 'score' then
    if target_team = m.home_team_id then dh := 1; elsif target_team = m.away_team_id then da := 1; else raise exception 'Invalid team'; end if;
    update public.matches set home_score = coalesce(home_score, 0) + dh, away_score = coalesce(away_score, 0) + da where id = target;
  elsif event_name = 'timer_start' then update public.matches set status = 'live', clock_started_at = now() where id = target;
  elsif event_name = 'timer_pause' then update public.matches set clock_seconds = elapsed, clock_started_at = null where id = target;
  end if;
  insert into public.match_events(match_id, event_type, team_id, player_name, score_delta_home, score_delta_away, clock_seconds) values(target, event_name, target_team, player, dh, da, elapsed);
end;
$$;

create or replace function public.undo_match_event(secret text)
returns void language plpgsql security definer set search_path = '' as $$
declare target uuid := public.valid_scorekeeper_access(secret); e public.match_events%rowtype;
begin
  if target is null then raise exception 'Invalid or expired access'; end if;
  select * into e from public.match_events where match_id = target and event_type in ('score','yellow_card','red_card') order by created_at desc limit 1;
  if e.id is null then raise exception 'Nothing to undo'; end if;
  update public.matches set home_score = greatest(0, coalesce(home_score,0)-e.score_delta_home), away_score = greatest(0,coalesce(away_score,0)-e.score_delta_away) where id = target;
  delete from public.match_events where id = e.id;
end;
$$;

create or replace function public.admin_delete_user(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if target = auth.uid() and (select count(*) from public.profiles where role='admin') <= 1 then raise exception 'Last admin'; end if;
  delete from public.tournaments where created_by = target;
  delete from public.teams where created_by = target;
  delete from auth.users where id = target;
end;
$$;

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role <> old.role and not public.is_admin() then raise exception 'Only admins can change roles'; end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles for each row execute function public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.teams enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.matches enable row level security;
alter table public.match_access_codes enable row level security;
alter table public.match_events enable row level security;

do $$ declare tbl text; pol record; begin
  for tbl in select unnest(array['profiles','sports','teams','tournaments','tournament_teams','matches','match_access_codes','match_events']) loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=tbl loop execute format('drop policy if exists %I on public.%I', pol.policyname, tbl); end loop;
  end loop;
end $$;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_self_or_admin on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy sports_read on public.sports for select using (active or public.is_admin());
create policy sports_admin on public.sports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy teams_read on public.teams for select using (true);
create policy teams_insert on public.teams for insert to authenticated with check (created_by=auth.uid());
create policy teams_manage on public.teams for all to authenticated using (created_by=auth.uid() or public.is_admin()) with check (created_by=auth.uid() or public.is_admin());
create policy tournaments_read on public.tournaments for select using (status='published' or created_by=auth.uid() or public.is_admin());
create policy tournaments_insert on public.tournaments for insert to authenticated with check (created_by=auth.uid());
create policy tournaments_manage on public.tournaments for all to authenticated using (created_by=auth.uid() or public.is_admin()) with check (created_by=auth.uid() or public.is_admin());
create policy tournament_teams_read on public.tournament_teams for select using (exists(select 1 from public.tournaments t where t.id=tournament_id and (t.status='published' or t.created_by=auth.uid() or public.is_admin())));
create policy tournament_teams_manage on public.tournament_teams for all to authenticated using (public.can_manage_tournament(tournament_id)) with check (public.can_manage_tournament(tournament_id));
create policy matches_read on public.matches for select using (exists(select 1 from public.tournaments t where t.id=tournament_id and (t.status='published' or t.created_by=auth.uid() or public.is_admin())));
create policy matches_manage on public.matches for all to authenticated using (public.can_manage_tournament(tournament_id)) with check (public.can_manage_tournament(tournament_id));
create policy events_read on public.match_events for select using (exists(select 1 from public.matches m join public.tournaments t on t.id=m.tournament_id where m.id=match_id and (t.status='published' or t.created_by=auth.uid() or public.is_admin())));
create policy access_manage on public.match_access_codes for all to authenticated using (exists(select 1 from public.matches m where m.id=match_id and public.can_manage_tournament(m.tournament_id))) with check (exists(select 1 from public.matches m where m.id=match_id and public.can_manage_tournament(m.tournament_id)));

revoke all on function public.valid_scorekeeper_access(text) from public;
grant execute on function public.generate_match_access(uuid) to authenticated;
grant execute on function public.scorekeeper_match(text) to anon, authenticated;
grant execute on function public.record_match_event(text,text,uuid,text) to anon, authenticated;
grant execute on function public.undo_match_event(text) to anon, authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

insert into public.sports(name,code,active,scoring_type,periods_config) values
('Football','football',true,'goals','{"periods":2,"minutes":45}'),('Basketball','basketball',true,'points','{"periods":4,"minutes":10}'),('Tennis','tennis',true,'sets','{"bestOf":3}'),('Hockey','hockey',true,'goals','{"periods":3,"minutes":20}'),('Volleyball','volleyball',true,'sets','{"bestOf":5}') on conflict(code) do nothing;

insert into storage.buckets(id,name,public) values('avatars','avatars',true),('logos','logos',true) on conflict(id) do update set public=true;
drop policy if exists public_media_read on storage.objects;
drop policy if exists authenticated_media_insert on storage.objects;
drop policy if exists owner_media_update on storage.objects;
drop policy if exists owner_media_delete on storage.objects;
create policy public_media_read on storage.objects for select using (bucket_id in ('avatars','logos'));
create policy authenticated_media_insert on storage.objects for insert to authenticated with check (bucket_id in ('avatars','logos') and (storage.foldername(name))[1]=auth.uid()::text);
create policy owner_media_update on storage.objects for update to authenticated using (bucket_id in ('avatars','logos') and owner_id=auth.uid()::text);
create policy owner_media_delete on storage.objects for delete to authenticated using (bucket_id in ('avatars','logos') and owner_id=auth.uid()::text);
