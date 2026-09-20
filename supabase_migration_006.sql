-- =====================================================
-- LigaDoKapsy: Supabase production migration
-- Run this in Supabase SQL Editor to bring the schema up to date.
-- Safe to run multiple times (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================

-- 0a. Profiles: split display_name into first_name + last_name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
-- Migrate existing display_name data if column exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name') THEN
    UPDATE public.profiles SET
      first_name = coalesce(split_part(display_name, ' ', 1), 'User'),
      last_name = coalesce(nullif(substring(display_name from position(' ' in display_name) + 1), display_name), '')
    WHERE first_name IS NULL;
    ALTER TABLE public.profiles ALTER COLUMN first_name SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN first_name SET DEFAULT 'User';
    ALTER TABLE public.profiles ALTER COLUMN last_name SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN last_name SET DEFAULT '';
    ALTER TABLE public.profiles DROP COLUMN display_name;
  ELSE
    -- first_name/last_name already exist, just ensure NOT NULL
    UPDATE public.profiles SET first_name = 'User' WHERE first_name IS NULL;
    UPDATE public.profiles SET last_name = '' WHERE last_name IS NULL;
    ALTER TABLE public.profiles ALTER COLUMN first_name SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN first_name SET DEFAULT 'User';
    ALTER TABLE public.profiles ALTER COLUMN last_name SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN last_name SET DEFAULT '';
  END IF;
END $$;

-- 0b. Teams: remove short_name if exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'short_name') THEN
    ALTER TABLE public.teams DROP COLUMN short_name;
  END IF;
END $$;

-- 1. Add is_private columns
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 1b. Add current_period to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS current_period integer NOT NULL DEFAULT 0;

-- 1c. Add metadata to match_events
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 1d. Ensure match_events event_type CHECK includes all event types (period_end, period_start, match_end)
DO $$ BEGIN
  ALTER TABLE public.match_events DROP CONSTRAINT IF EXISTS match_events_event_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE public.match_events ADD CONSTRAINT match_events_event_type_check
  CHECK (event_type IN ('score', 'yellow_card', 'red_card', 'timer_start', 'timer_pause', 'period_end', 'period_start', 'match_end'));

-- 2. Ensure rosters_locked on tournaments
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS rosters_locked boolean NOT NULL DEFAULT false;

-- 3. Ensure tournament_teams has id and rosters_locked
-- (tournament_teams may have been created without id column in early versions)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tournament_teams' AND column_name = 'id') THEN
    ALTER TABLE public.tournament_teams ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
  END IF;
END $$;

-- Ensure id has a UNIQUE constraint so it can be referenced as FK
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'tournament_teams' AND constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.constraint_column_usage
        WHERE table_schema = 'public' AND table_name = 'tournament_teams' AND column_name = 'id'
      )
  ) THEN
    ALTER TABLE public.tournament_teams ADD CONSTRAINT tournament_teams_id_unique UNIQUE (id);
  END IF;
END $$;

-- Backfill any NULL ids
UPDATE public.tournament_teams SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS rosters_locked boolean NOT NULL DEFAULT false;

-- 4. Ensure team_rosters table
CREATE TABLE IF NOT EXISTS public.team_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  jersey_number integer,
  position text,
  is_captain boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Ensure tournament_rosters table
CREATE TABLE IF NOT EXISTS public.tournament_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_team_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  jersey_number integer,
  position text,
  is_captain boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Ensure match_events has roster_player_id
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS roster_player_id uuid REFERENCES public.tournament_rosters(id) ON DELETE SET NULL;

-- 7. Entity shares table
CREATE TABLE IF NOT EXISTS public.entity_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('team', 'competition')),
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'edit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS entity_shares_entity_idx ON public.entity_shares(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS entity_shares_user_idx ON public.entity_shares(user_id, entity_type);
CREATE INDEX IF NOT EXISTS match_events_match_idx ON public.match_events(match_id, created_at);
CREATE INDEX IF NOT EXISTS match_events_roster_idx ON public.match_events(roster_player_id);
CREATE INDEX IF NOT EXISTS team_rosters_team_idx ON public.team_rosters(team_id);
CREATE INDEX IF NOT EXISTS tournament_rosters_team_idx ON public.tournament_rosters(tournament_team_id);

-- 8. RLS on new tables
ALTER TABLE public.team_rosters FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rosters FORCE ROW LEVEL SECURITY;
ALTER TABLE public.entity_shares FORCE ROW LEVEL SECURITY;

-- 9. Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.can_read_team(team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id
      AND (
        NOT t.is_private
        OR t.created_by = auth.uid()
        OR public.is_admin()
        OR EXISTS(SELECT 1 FROM public.entity_shares s WHERE s.entity_type = 'team' AND s.entity_id = t.id AND s.user_id = auth.uid())
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_tournament(tournament_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
      AND (
        NOT t.is_private
        OR t.created_by = auth.uid()
        OR public.is_admin()
        OR EXISTS(SELECT 1 FROM public.entity_shares s WHERE s.entity_type = 'competition' AND s.entity_id = t.id AND s.user_id = auth.uid())
      )
  )
$$;

-- 9b. Update handle_new_user trigger for first_name/last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  preferred_language text;
BEGIN
  preferred_language := coalesce(new.raw_user_meta_data->>'language', 'en');
  IF preferred_language NOT IN ('cs', 'en') THEN preferred_language := 'en'; END IF;
  INSERT INTO public.profiles (id, first_name, last_name, email, role, favorite_sport, profile_color, language)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', 'User'),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    'user',
    'football',
    '#10B981',
    preferred_language
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Updated RLS policies for teams (privacy-aware)
DROP POLICY IF EXISTS teams_read ON public.teams;
CREATE POLICY teams_read ON public.teams FOR SELECT USING (public.can_read_team(id));

DROP POLICY IF EXISTS teams_manage ON public.teams;
CREATE POLICY teams_manage ON public.teams FOR ALL TO authenticated USING (created_by = auth.uid() OR public.is_admin()) WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- 11. Updated RLS policies for tournaments (privacy-aware)
DROP POLICY IF EXISTS tournaments_read ON public.tournaments;
CREATE POLICY tournaments_read ON public.tournaments FOR SELECT USING ((status = 'published' AND NOT is_private) OR public.can_read_tournament(id));

DROP POLICY IF EXISTS tournaments_manage ON public.tournaments;
CREATE POLICY tournaments_manage ON public.tournaments FOR ALL TO authenticated USING (created_by = auth.uid() OR public.is_admin()) WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- 12. RLS for entity_shares
DROP POLICY IF EXISTS entity_shares_read ON public.entity_shares;
CREATE POLICY entity_shares_read ON public.entity_shares FOR SELECT TO authenticated USING (
  (entity_type = 'team' AND EXISTS(SELECT 1 FROM public.teams WHERE id = entity_id AND created_by = auth.uid())) OR
  (entity_type = 'competition' AND EXISTS(SELECT 1 FROM public.tournaments WHERE id = entity_id AND created_by = auth.uid())) OR
  user_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS entity_shares_manage ON public.entity_shares;
CREATE POLICY entity_shares_manage ON public.entity_shares FOR ALL TO authenticated USING (
  (entity_type = 'team' AND EXISTS(SELECT 1 FROM public.teams WHERE id = entity_id AND created_by = auth.uid())) OR
  (entity_type = 'competition' AND EXISTS(SELECT 1 FROM public.tournaments WHERE id = entity_id AND created_by = auth.uid())) OR
  public.is_admin()
) WITH CHECK (
  (entity_type = 'team' AND EXISTS(SELECT 1 FROM public.teams WHERE id = entity_id AND created_by = auth.uid())) OR
  (entity_type = 'competition' AND EXISTS(SELECT 1 FROM public.tournaments WHERE id = entity_id AND created_by = auth.uid())) OR
  public.is_admin()
);

-- 13. RLS for team_rosters
DROP POLICY IF EXISTS team_rosters_read ON public.team_rosters;
CREATE POLICY team_rosters_read ON public.team_rosters FOR SELECT USING (true);

DROP POLICY IF EXISTS team_rosters_manage ON public.team_rosters;
CREATE POLICY team_rosters_manage ON public.team_rosters FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.teams WHERE id = team_id AND (created_by = auth.uid() OR public.is_admin()))) WITH CHECK (EXISTS(SELECT 1 FROM public.teams WHERE id = team_id AND (created_by = auth.uid() OR public.is_admin())));

-- 14. RLS for tournament_rosters
DROP POLICY IF EXISTS tournament_rosters_read ON public.tournament_rosters;
CREATE POLICY tournament_rosters_read ON public.tournament_rosters FOR SELECT USING (EXISTS(SELECT 1 FROM public.tournament_teams tt WHERE tt.id = tournament_team_id AND public.can_read_tournament(tt.tournament_id)));

DROP POLICY IF EXISTS tournament_rosters_manage ON public.tournament_rosters;
CREATE POLICY tournament_rosters_manage ON public.tournament_rosters FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.tournament_teams tt JOIN public.tournaments t ON t.id = tt.tournament_id WHERE tt.id = tournament_team_id AND (t.created_by = auth.uid() OR public.is_admin()))) WITH CHECK (EXISTS(SELECT 1 FROM public.tournament_teams tt JOIN public.tournaments t ON t.id = tt.tournament_id WHERE tt.id = tournament_team_id AND (t.created_by = auth.uid() OR public.is_admin())));

-- 15. Updated RLS for tournament_teams
DROP POLICY IF EXISTS tournament_teams_read ON public.tournament_teams;
CREATE POLICY tournament_teams_read ON public.tournament_teams FOR SELECT USING (EXISTS(SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND ((t.status = 'published' AND NOT t.is_private) OR public.can_read_tournament(t.id))));

DROP POLICY IF EXISTS tournament_teams_manage ON public.tournament_teams;
CREATE POLICY tournament_teams_manage ON public.tournament_teams FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND (t.created_by = auth.uid() OR public.is_admin()))) WITH CHECK (EXISTS(SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND (t.created_by = auth.uid() OR public.is_admin())));

-- 16. Updated RLS for matches
DROP POLICY IF EXISTS matches_read ON public.matches;
CREATE POLICY matches_read ON public.matches FOR SELECT USING (public.can_read_tournament(tournament_id));

DROP POLICY IF EXISTS matches_manage ON public.matches;
CREATE POLICY matches_manage ON public.matches FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND (t.created_by = auth.uid() OR public.is_admin()))) WITH CHECK (EXISTS(SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND (t.created_by = auth.uid() OR public.is_admin())));

-- 17. Updated RLS for match_events
DROP POLICY IF EXISTS match_events_read ON public.match_events;
CREATE POLICY match_events_read ON public.match_events FOR SELECT USING (EXISTS(SELECT 1 FROM public.matches m WHERE m.id = match_id AND public.can_read_tournament(m.tournament_id)));

DROP POLICY IF EXISTS match_events_manage ON public.match_events;
CREATE POLICY match_events_manage ON public.match_events FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.matches m JOIN public.tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND (t.created_by = auth.uid() OR public.is_admin()))) WITH CHECK (EXISTS(SELECT 1 FROM public.matches m JOIN public.tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND (t.created_by = auth.uid() OR public.is_admin())));

-- 18. Scorekeeper RPCs (drop first to allow return type changes)
DROP FUNCTION IF EXISTS public.generate_match_access(uuid);
CREATE OR REPLACE FUNCTION public.generate_match_access(target_match uuid)
RETURNS TABLE(pin text, token uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pin text;
  v_token uuid;
  v_expires timestamptz;
  v_user uuid;
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = target_match;
  IF NOT found THEN RAISE EXCEPTION 'Match not found'; END IF;
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = v_match.tournament_id;
  IF auth.uid() IS NULL OR (v_tournament.created_by <> auth.uid() AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  v_user := auth.uid();
  v_expires := now() + interval '12 hours';
  LOOP
    v_pin := lpad(floor(random() * 1000000)::int::text, 6, '0');
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.match_access_codes WHERE pin_hash = v_pin);
  END LOOP;
  v_token := gen_random_uuid();
  INSERT INTO public.match_access_codes (match_id, pin_hash, token, expires_at, created_by)
  VALUES (target_match, v_pin, v_token, v_expires, v_user)
  ON CONFLICT (match_id) DO UPDATE SET pin_hash = excluded.pin_hash, token = excluded.token, expires_at = excluded.expires_at, created_by = excluded.created_by;
  RETURN QUERY SELECT v_pin, v_token, v_expires;
END;
$$;

DROP FUNCTION IF EXISTS public.scorekeeper_match(text);
CREATE OR REPLACE FUNCTION public.scorekeeper_match(secret text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_access public.match_access_codes%rowtype;
  v_match public.matches%rowtype;
BEGIN
  SELECT * INTO v_access FROM public.match_access_codes WHERE (pin_hash = secret OR token::text = secret) AND expires_at > now();
  IF NOT found THEN RAISE EXCEPTION 'Invalid or expired access'; END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = v_access.match_id;
  RETURN jsonb_build_object(
    'match', row_to_json(v_match),
    'homeTeam', (SELECT row_to_json(t) FROM public.teams t WHERE t.id = v_match.home_team_id),
    'awayTeam', (SELECT row_to_json(t) FROM public.teams t WHERE t.id = v_match.away_team_id),
    'events', (SELECT coalesce(jsonb_agg(row_to_json(e) ORDER BY e.created_at, e.id), '[]'::jsonb) FROM public.match_events e WHERE e.match_id = v_match.id),
    'homeRoster', (SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.is_captain DESC, r.last_name, r.first_name), '[]'::jsonb) FROM public.tournament_rosters r JOIN public.tournament_teams tt ON tt.id = r.tournament_team_id WHERE tt.tournament_id = v_match.tournament_id AND tt.team_id = v_match.home_team_id),
    'awayRoster', (SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.is_captain DESC, r.last_name, r.first_name), '[]'::jsonb) FROM public.tournament_rosters r JOIN public.tournament_teams tt ON tt.id = r.tournament_team_id WHERE tt.tournament_id = v_match.tournament_id AND tt.team_id = v_match.away_team_id)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.record_match_event(text, text, uuid, text, uuid);
CREATE OR REPLACE FUNCTION public.record_match_event(secret text, event_name text, target_team uuid, player text, roster uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_access public.match_access_codes%rowtype;
  v_match public.matches%rowtype;
  v_delta_home int := 0;
  v_delta_away int := 0;
  v_clock int;
BEGIN
  SELECT * INTO v_access FROM public.match_access_codes WHERE (pin_hash = secret OR token::text = secret) AND expires_at > now();
  IF NOT found THEN RAISE EXCEPTION 'Invalid or expired access'; END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = v_access.match_id;
  -- Compute current clock value
  v_clock := coalesce(v_match.clock_seconds, 0) + coalesce(extract(epoch from (now() - v_match.clock_started_at))::int, 0);
  IF event_name = 'score' THEN
    IF target_team = v_match.home_team_id THEN v_delta_home := 1; ELSIF target_team = v_match.away_team_id THEN v_delta_away := 1; ELSE RAISE EXCEPTION 'Invalid team'; END IF;
    UPDATE public.matches SET home_score = coalesce(home_score, 0) + v_delta_home, away_score = coalesce(away_score, 0) + v_delta_away WHERE id = v_match.id;
  ELSIF event_name = 'timer_start' THEN
    UPDATE public.matches SET status = 'live', clock_started_at = now(), current_period = CASE WHEN current_period = 0 THEN 1 ELSE current_period END WHERE id = v_match.id;
  ELSIF event_name = 'timer_pause' THEN
    UPDATE public.matches SET clock_seconds = v_clock, clock_started_at = NULL WHERE id = v_match.id;
  ELSIF event_name = 'period_end' THEN
    UPDATE public.matches SET clock_seconds = v_clock, clock_started_at = NULL WHERE id = v_match.id;
  ELSIF event_name = 'period_start' THEN
    UPDATE public.matches SET status = 'live', clock_started_at = now(), current_period = coalesce(v_match.current_period, 0) + 1 WHERE id = v_match.id;
  ELSIF event_name = 'match_end' THEN
    UPDATE public.matches SET status = 'finished', clock_seconds = v_clock, clock_started_at = NULL WHERE id = v_match.id;
  ELSIF event_name NOT IN ('yellow_card', 'red_card') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;
  INSERT INTO public.match_events (match_id, event_type, team_id, player_name, roster_player_id, score_delta_home, score_delta_away, clock_seconds)
  VALUES (v_match.id, event_name, target_team, player, roster, v_delta_home, v_delta_away, v_clock);
END;
$$;

DROP FUNCTION IF EXISTS public.undo_match_event(text);
CREATE OR REPLACE FUNCTION public.undo_match_event(secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_access public.match_access_codes%rowtype;
  v_event public.match_events%rowtype;
BEGIN
  SELECT * INTO v_access FROM public.match_access_codes WHERE (pin_hash = secret OR token::text = secret) AND expires_at > now();
  IF NOT found THEN RAISE EXCEPTION 'Invalid or expired access'; END IF;
  SELECT * INTO v_event FROM public.match_events WHERE match_id = v_access.match_id AND event_type IN ('score', 'yellow_card', 'red_card') ORDER BY created_at DESC, id DESC LIMIT 1;
  IF NOT found THEN RAISE EXCEPTION 'Nothing to undo'; END IF;
  UPDATE public.matches SET home_score = greatest(0, coalesce(home_score, 0) - v_event.score_delta_home), away_score = greatest(0, coalesce(away_score, 0) - v_event.score_delta_away) WHERE id = v_access.match_id;
  DELETE FROM public.match_events WHERE id = v_event.id;
END;
$$;

-- 19. Player stats and user_teams RPCs
DROP FUNCTION IF EXISTS public.player_stats(uuid);
CREATE OR REPLACE FUNCTION public.player_stats(target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_matches int;
  v_goals int;
  v_yellows int;
  v_reds int;
BEGIN
  SELECT count(DISTINCT match_id) INTO v_matches FROM public.match_events WHERE roster_player_id IN (SELECT id FROM public.tournament_rosters WHERE user_id = target);
  SELECT count(*) INTO v_goals FROM public.match_events WHERE event_type = 'score' AND roster_player_id IN (SELECT id FROM public.tournament_rosters WHERE user_id = target);
  SELECT count(*) INTO v_yellows FROM public.match_events WHERE event_type = 'yellow_card' AND roster_player_id IN (SELECT id FROM public.tournament_rosters WHERE user_id = target);
  SELECT count(*) INTO v_reds FROM public.match_events WHERE event_type = 'red_card' AND roster_player_id IN (SELECT id FROM public.tournament_rosters WHERE user_id = target);
  RETURN jsonb_build_object('matchesPlayed', v_matches, 'goals', v_goals, 'yellowCards', v_yellows, 'redCards', v_reds);
END;
$$;

DROP FUNCTION IF EXISTS public.sync_master_roster(uuid);
CREATE OR REPLACE FUNCTION public.sync_master_roster(tournament_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tt public.tournament_teams%rowtype;
  v_tournament public.tournaments%rowtype;
BEGIN
  SELECT * INTO v_tt FROM public.tournament_teams WHERE id = sync_master_roster.tournament_team_id;
  IF NOT found THEN RAISE EXCEPTION 'Tournament team not found'; END IF;
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = v_tt.tournament_id;
  IF auth.uid() IS NULL OR (v_tournament.created_by <> auth.uid() AND NOT public.is_admin()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_tt.rosters_locked THEN RAISE EXCEPTION 'Rosters are locked'; END IF;
  IF EXISTS(SELECT 1 FROM public.tournament_rosters tr WHERE tr.tournament_team_id = sync_master_roster.tournament_team_id) THEN RAISE EXCEPTION 'Roster already exists'; END IF;
  INSERT INTO public.tournament_rosters (tournament_team_id, user_id, first_name, last_name, jersey_number, position, is_captain)
  SELECT sync_master_roster.tournament_team_id, tr.user_id, tr.first_name, tr.last_name, tr.jersey_number, tr.position, tr.is_captain FROM public.team_rosters tr WHERE tr.team_id = v_tt.team_id;
END;
$$;

DROP FUNCTION IF EXISTS public.user_teams(uuid);
CREATE OR REPLACE FUNCTION public.user_teams(target uuid)
RETURNS setof public.teams
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT t.* FROM public.teams t
  JOIN public.team_rosters tr ON tr.team_id = t.id
  WHERE tr.user_id = target
  UNION
  SELECT DISTINCT t.* FROM public.teams t
  JOIN public.tournament_teams tt ON tt.team_id = t.id
  JOIN public.tournament_rosters tor ON tor.tournament_team_id = tt.id
  WHERE tor.user_id = target
  ORDER BY name
$$;

-- 20. Admin delete user
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);
CREATE OR REPLACE FUNCTION public.admin_delete_user(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  DELETE FROM public.tournaments WHERE created_by = target;
  DELETE FROM public.teams WHERE created_by = target;
  DELETE FROM public.profiles WHERE id = target;
  DELETE FROM auth.users WHERE id = target;
END;
$$;

-- 21. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_match_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scorekeeper_match(text) TO public;
GRANT EXECUTE ON FUNCTION public.record_match_event(text, text, uuid, text, uuid) TO public;
GRANT EXECUTE ON FUNCTION public.undo_match_event(text) TO public;
GRANT EXECUTE ON FUNCTION public.player_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_master_roster(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_teams(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_team(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_read_tournament(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_tournament(uuid) TO anon;

-- 22. Pages / CMS / Legal / FAQ
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'faq' CHECK (category IN ('legal', 'faq', 'guide')),
  is_published boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT
);

ALTER TABLE public.pages FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS pages_public_read ON public.pages;
CREATE POLICY pages_public_read ON public.pages FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS pages_admin_manage ON public.pages;
CREATE POLICY pages_admin_manage ON public.pages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.pages (slug, title, content, category, is_published, order_index, created_by)
VALUES
  ('terms', 'Obchodní podmínky', '# Obchodní podmínky\n\nToto jsou vzorové obchodní podmínky. Upravte je v administraci.', 'legal', true, 0, null),
  ('privacy', 'Ochrana osobních údajů', '# Ochrana osobních údajů\n\nToto je vzorové zpracování osobních údajů. Upravte je v administraci.', 'legal', true, 1, null),
  ('cookies', 'Cookies', '# Cookies\n\nTato aplikace používá pouze nezbytné cookies pro zajištění funkcionality. Další kategorie cookies vyžadují váš souhlas.', 'legal', true, 2, null),
  ('faq', 'FAQ / Nápověda', '# Často kladené otázky\n\n- Jak zapsat gól? Použijte scorekeeper rozhraní.\n- Jak vytvořit tým? Jděte do sekce Týmy.', 'faq', true, 0, null)
ON CONFLICT (slug) DO UPDATE SET title = excluded.title, content = excluded.content, category = excluded.category, is_published = excluded.is_published, order_index = excluded.order_index;

-- 23. Playoff bracket support
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'league';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
    WHERE pg_class.relname = 'tournaments' AND pg_constraint.conname = 'tournaments_format_check'
  ) THEN
    ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_format_check CHECK (format IN ('league', 'playoff', 'hybrid'));
  END IF;
END $$;

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS round_number integer;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS bracket_position integer;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS next_match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS next_match_slot text;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
    WHERE pg_class.relname = 'matches' AND pg_constraint.conname = 'matches_next_match_slot_check'
  ) THEN
    ALTER TABLE public.matches ADD CONSTRAINT matches_next_match_slot_check CHECK (next_match_slot IS NULL OR next_match_slot IN ('home', 'away'));
  END IF;
END $$;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS bracket_type text NOT NULL DEFAULT 'winner';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
    WHERE pg_class.relname = 'matches' AND pg_constraint.conname = 'matches_bracket_type_check'
  ) THEN
    ALTER TABLE public.matches ADD CONSTRAINT matches_bracket_type_check CHECK (bracket_type IN ('winner', 'loser', 'third_place'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS matches_bracket_idx ON public.matches(tournament_id, round_number, bracket_position);
