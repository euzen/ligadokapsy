create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('user', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.tournament_status as enum ('draft', 'published', 'completed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.match_status as enum ('scheduled', 'live', 'finished', 'cancelled'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
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
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  rosters_locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tournament_id, team_id)
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
  roster_player_id uuid references public.tournament_rosters(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists teams_created_by_idx on public.teams(created_by);
create index if not exists tournaments_created_by_idx on public.tournaments(created_by);
create index if not exists matches_tournament_idx on public.matches(tournament_id, match_date, match_time);

create table if not exists public.team_rosters (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  jersey_number integer,
  position text,
  is_captain boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_rosters (
  id uuid primary key default gen_random_uuid(),
  tournament_team_id uuid not null references public.tournament_teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  jersey_number integer,
  position text,
  is_captain boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tournaments add column if not exists rosters_locked boolean not null default false;

create index if not exists match_events_match_idx on public.match_events(match_id, created_at);
create index if not exists match_events_roster_idx on public.match_events(roster_player_id);
create index if not exists team_rosters_team_idx on public.team_rosters(team_id);
create index if not exists tournament_rosters_team_idx on public.tournament_rosters(tournament_team_id);

-- Enable RLS
alter table public.profiles force row level security;
alter table public.sports force row level security;
alter table public.teams force row level security;
alter table public.tournaments force row level security;
alter table public.tournament_teams force row level security;
alter table public.matches force row level security;
alter table public.match_access_codes force row level security;
alter table public.match_events force row level security;
alter table public.team_rosters force row level security;
alter table public.tournament_rosters force row level security;

-- Profiles: users can read public profiles; write own profile; admin can write all
-- (excluded role changes via trigger below)
create policy if not exists profiles_read on public.profiles for select using (true);
create policy if not exists profiles_write on public.profiles for update to authenticated using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- Sports: public read, admin write
create policy if not exists sports_read on public.sports for select using (true);
create policy if not exists sports_manage on public.sports for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Teams: public read, owner/admin manage
create policy if not exists teams_read on public.teams for select using (true);
create policy if not exists teams_manage on public.teams for all to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());

-- Tournaments: public read published, owner/admin read/manage all
create policy if not exists tournaments_read on public.tournaments for select using (status = 'published' or created_by = auth.uid() or public.is_admin());
create policy if not exists tournaments_manage on public.tournaments for all to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());

-- Tournament teams
create policy if not exists tournament_teams_read on public.tournament_teams for select using (exists(select 1 from public.tournaments t where t.id = tournament_id and (t.status = 'published' or t.created_by = auth.uid() or public.is_admin())));
create policy if not exists tournament_teams_manage on public.tournament_teams for all to authenticated using (exists(select 1 from public.tournaments t where t.id = tournament_id and (t.created_by = auth.uid() or public.is_admin()))) with check (exists(select 1 from public.tournaments t where t.id = tournament_id and (t.created_by = auth.uid() or public.is_admin())));

-- Matches
create policy if not exists matches_read on public.matches for select using (exists(select 1 from public.tournaments t where t.id = tournament_id and (t.status = 'published' or t.created_by = auth.uid() or public.is_admin())));
create policy if not exists matches_manage on public.matches for all to authenticated using (exists(select 1 from public.tournaments t where t.id = tournament_id and (t.created_by = auth.uid() or public.is_admin()))) with check (exists(select 1 from public.tournaments t where t.id = tournament_id and (t.created_by = auth.uid() or public.is_admin())));

-- Match access codes: owner/admin manage, scorekeeper RPC bypasses RLS via security definer
create policy if not exists match_access_codes_manage on public.match_access_codes for all to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());

-- Match events: public read when tournament published, owner/admin manage
create policy if not exists match_events_read on public.match_events for select using (exists(select 1 from public.matches m join public.tournaments t on t.id = m.tournament_id where m.id = match_id and (t.status = 'published' or t.created_by = auth.uid() or public.is_admin())));
create policy if not exists match_events_manage on public.match_events for all to authenticated using (exists(select 1 from public.matches m join public.tournaments t on t.id = m.tournament_id where m.id = match_id and (t.created_by = auth.uid() or public.is_admin()))) with check (exists(select 1 from public.matches m join public.tournaments t on t.id = m.tournament_id where m.id = match_id and (t.created_by = auth.uid() or public.is_admin())));

-- Team rosters: public read when team appears in published tournament, owner/admin manage
create policy if not exists team_rosters_read on public.team_rosters for select using (true);
create policy if not exists team_rosters_manage on public.team_rosters for all to authenticated using (exists(select 1 from public.teams where id = team_id and (created_by = auth.uid() or public.is_admin()))) with check (exists(select 1 from public.teams where id = team_id and (created_by = auth.uid() or public.is_admin())));

-- Tournament rosters: public read when tournament published, owner/admin manage
create policy if not exists tournament_rosters_read on public.tournament_rosters for select using (exists(select 1 from public.tournament_teams tt join public.tournaments t on t.id = tt.tournament_id where tt.id = tournament_team_id and (t.status = 'published' or t.created_by = auth.uid() or public.is_admin())));
create policy if not exists tournament_rosters_manage on public.tournament_rosters for all to authenticated using (exists(select 1 from public.tournament_teams tt join public.tournaments t on t.id = tt.tournament_id where tt.id = tournament_team_id and (t.created_by = auth.uid() or public.is_admin()))) with check (exists(select 1 from public.tournament_teams tt join public.tournaments t on t.id = tt.tournament_id where tt.id = tournament_team_id and (t.created_by = auth.uid() or public.is_admin())));

-- Storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict (id) do nothing;

-- Storage policies
begin;
  drop policy if exists "avatars public select" on storage.objects;
  create policy "avatars public select" on storage.objects for select using (bucket_id = 'avatars');
  drop policy if exists "avatars owner upload" on storage.objects;
  create policy "avatars owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "avatars owner update" on storage.objects;
  create policy "avatars owner update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "avatars owner delete" on storage.objects;
  create policy "avatars owner delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists "logos public select" on storage.objects;
  create policy "logos public select" on storage.objects for select using (bucket_id = 'logos');
  drop policy if exists "logos owner upload" on storage.objects;
  create policy "logos owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "logos owner update" on storage.objects;
  create policy "logos owner update" on storage.objects for update to authenticated using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "logos owner delete" on storage.objects;
  create policy "logos owner delete" on storage.objects for delete to authenticated using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
commit;

-- Helpers
begin;
  create or replace function public.is_admin()
  returns boolean
  language sql
  security definer
  set search_path = ''
  as $$
    select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
  $$;

  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    preferred_language text;
  begin
    preferred_language := coalesce(new.raw_user_meta_data->>'language', 'en');
    if preferred_language not in ('cs', 'en') then preferred_language := 'en'; end if;
    insert into public.profiles (id, first_name, last_name, email, role, favorite_sport, profile_color, language)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'first_name', 'User'),
      coalesce(new.raw_user_meta_data->>'last_name', ''),
      new.email,
      'user',
      'football',
      '#10B981',
      preferred_language
    );
    return new;
  end;
  $$;

  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

  create or replace function public.protect_profile_role()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
  as $$
  begin
    if new.role <> old.role
      and auth.uid() is not null
      and not public.is_admin()
    then
      raise exception 'Only admins can change roles';
    end if;

    return new;
  end;
  $$;

  drop trigger if exists protect_profile_role on public.profiles;
  create trigger protect_profile_role
    before update on public.profiles
    for each row execute function public.protect_profile_role();
commit;

-- Seed sports
insert into public.sports (id, name, code, active, scoring_type, periods_config) values
  ('sport-football', 'Football', 'football', true, 'goals', '{"periods":2,"minutes":45}'),
  ('sport-basketball', 'Basketball', 'basketball', true, 'points', '{"periods":4,"minutes":10}'),
  ('sport-tennis', 'Tennis', 'tennis', true, 'sets', '{"bestOf":3}'),
  ('sport-hockey', 'Hockey', 'hockey', true, 'goals', '{"periods":3,"minutes":20}'),
  ('sport-volleyball', 'Volleyball', 'volleyball', true, 'sets', '{"bestOf":5}')
on conflict (code) do update set name = excluded.name, active = excluded.active, scoring_type = excluded.scoring_type, periods_config = excluded.periods_config;

-- Scorekeeper RPCs
begin;
  create or replace function public.generate_match_access(target_match uuid)
  returns table(pin text, token uuid, expires_at timestamptz)
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_pin text;
    v_token uuid;
    v_expires timestamptz;
    v_user uuid;
    v_match public.matches%rowtype;
    v_tournament public.tournaments%rowtype;
  begin
    select * into v_match from public.matches where id = target_match;
    if not found then raise exception 'Match not found'; end if;
    select * into v_tournament from public.tournaments where id = v_match.tournament_id;
    if auth.uid() is null or (v_tournament.created_by <> auth.uid() and not exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')) then
      raise exception 'Not allowed';
    end if;
    v_user := auth.uid();
    v_expires := now() + interval '12 hours';
    loop
      v_pin := lpad(floor(random() * 1000000)::int::text, 6, '0');
      exit when not exists(select 1 from public.match_access_codes where pin_hash = v_pin);
    end loop;
    v_token := gen_random_uuid();
    insert into public.match_access_codes (match_id, pin_hash, token, expires_at, created_by)
    values (target_match, v_pin, v_token, v_expires, v_user)
    on conflict (match_id) do update set pin_hash = excluded.pin_hash, token = excluded.token, expires_at = excluded.expires_at, created_by = excluded.created_by;
    return query select v_pin, v_token, v_expires;
  end;
  $$;

  create or replace function public.scorekeeper_match(secret text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_access public.match_access_codes%rowtype;
    v_match public.matches%rowtype;
  begin
    select * into v_access from public.match_access_codes where (pin_hash = secret or token::text = secret) and expires_at > now();
    if not found then raise exception 'Invalid or expired access'; end if;
    select * into v_match from public.matches where id = v_access.match_id;
    return jsonb_build_object(
      'match', row_to_json(v_match),
      'homeTeam', (select row_to_json(t) from public.teams t where t.id = v_match.home_team_id),
      'awayTeam', (select row_to_json(t) from public.teams t where t.id = v_match.away_team_id),
      'events', (select coalesce(jsonb_agg(row_to_json(e) order by e.created_at, e.id), '[]'::jsonb) from public.match_events e where e.match_id = v_match.id)
    );
  end;
  $$;

  create or replace function public.record_match_event(secret text, event_name text, target_team uuid, player text, roster uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_access public.match_access_codes%rowtype;
    v_match public.matches%rowtype;
    v_delta_home int := 0;
    v_delta_away int := 0;
  begin
    select * into v_access from public.match_access_codes where (pin_hash = secret or token::text = secret) and expires_at > now();
    if not found then raise exception 'Invalid or expired access'; end if;
    select * into v_match from public.matches where id = v_access.match_id;
    if event_name = 'score' then
      if target_team = v_match.home_team_id then v_delta_home := 1; elsif target_team = v_match.away_team_id then v_delta_away := 1; else raise exception 'Invalid team'; end if;
      update public.matches set home_score = coalesce(home_score, 0) + v_delta_home, away_score = coalesce(away_score, 0) + v_delta_away where id = v_match.id;
    elsif event_name not in ('yellow_card', 'red_card', 'timer_start', 'timer_pause') then
      raise exception 'Invalid event type';
    end if;
    insert into public.match_events (match_id, event_type, team_id, player_name, roster_player_id, score_delta_home, score_delta_away, clock_seconds)
    values (v_match.id, event_name, target_team, player, roster, v_delta_home, v_delta_away, v_match.clock_seconds + coalesce(extract(epoch from (now() - v_match.clock_started_at))::int, 0));
  end;
  $$;

  create or replace function public.undo_match_event(secret text)
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_access public.match_access_codes%rowtype;
    v_event public.match_events%rowtype;
  begin
    select * into v_access from public.match_access_codes where (pin_hash = secret or token::text = secret) and expires_at > now();
    if not found then raise exception 'Invalid or expired access'; end if;
    select * into v_event from public.match_events where match_id = v_access.match_id and event_type in ('score', 'yellow_card', 'red_card') order by created_at desc, id desc limit 1;
    if not found then raise exception 'Nothing to undo'; end if;
    update public.matches set home_score = greatest(0, coalesce(home_score, 0) - v_event.score_delta_home), away_score = greatest(0, coalesce(away_score, 0) - v_event.score_delta_away) where id = v_access.match_id;
    delete from public.match_events where id = v_event.id;
  end;
  $$;

  create or replace function public.player_stats(target uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_matches int;
    v_goals int;
    v_yellows int;
    v_reds int;
  begin
    select count(distinct match_id) into v_matches from public.match_events where roster_player_id in (select id from public.tournament_rosters where user_id = target);
    select count(*) into v_goals from public.match_events where event_type = 'score' and roster_player_id in (select id from public.tournament_rosters where user_id = target);
    select count(*) into v_yellows from public.match_events where event_type = 'yellow_card' and roster_player_id in (select id from public.tournament_rosters where user_id = target);
    select count(*) into v_reds from public.match_events where event_type = 'red_card' and roster_player_id in (select id from public.tournament_rosters where user_id = target);
    return jsonb_build_object('matchesPlayed', v_matches, 'goals', v_goals, 'yellowCards', v_yellows, 'redCards', v_reds);
  end;
  $$;

  create or replace function public.sync_master_roster(tournament_team_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_tt public.tournament_teams%rowtype;
    v_tournament public.tournaments%rowtype;
  begin
    select * into v_tt from public.tournament_teams where id = tournament_team_id;
    if not found then raise exception 'Tournament team not found'; end if;
    select * into v_tournament from public.tournaments where id = v_tt.tournament_id;
    if auth.uid() is null or (v_tournament.created_by <> auth.uid() and not public.is_admin()) then raise exception 'Not allowed'; end if;
    if v_tt.rosters_locked then raise exception 'Rosters are locked'; end if;
    if exists(select 1 from public.tournament_rosters where tournament_team_id = tournament_team_id) then raise exception 'Roster already exists'; end if;
    insert into public.tournament_rosters (tournament_team_id, user_id, first_name, last_name, jersey_number, position, is_captain)
    select tournament_team_id, user_id, first_name, last_name, jersey_number, position, is_captain from public.team_rosters where team_id = v_tt.team_id;
  end;
  $$;

  grant execute on function public.generate_match_access(uuid) to authenticated;
  grant execute on function public.scorekeeper_match(text) to public;
  grant execute on function public.record_match_event(text, text, uuid, text, uuid) to public;
  grant execute on function public.undo_match_event(text) to public;
  create or replace function public.user_teams(target uuid)
  returns setof public.teams
  language sql
  security definer
  set search_path = ''
  as $$
    select distinct t.* from public.teams t
    join public.team_rosters tr on tr.team_id = t.id
    where tr.user_id = target
    union
    select distinct t.* from public.teams t
    join public.tournament_teams tt on tt.team_id = t.id
    join public.tournament_rosters tor on tor.tournament_team_id = tt.id
    where tor.user_id = target
    order by t.name
  $$;

  grant execute on function public.player_stats(uuid) to authenticated;
  grant execute on function public.sync_master_roster(uuid) to authenticated;
  grant execute on function public.user_teams(uuid) to authenticated;
commit;
