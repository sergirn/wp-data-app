-- Reliable, compact and transactional match saving.
-- Run this complete script once in the Supabase SQL editor.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_save_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND conname = 'matches_updated_by_fkey'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_last_save_id
  ON public.matches (last_save_id)
  WHERE last_save_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_drafts_expires_at
  ON public.match_drafts (expires_at);

CREATE OR REPLACE FUNCTION public.cleanup_expired_match_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.match_drafts
  WHERE expires_at <= now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_match_drafts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_match_drafts() TO service_role;

CREATE OR REPLACE FUNCTION public.save_match_bundle(
  p_payload JSONB,
  p_save_id UUID,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_match JSONB;
  v_stats JSONB;
  v_actions JSONB;
  v_penalties JSONB;
  v_shots JSONB;
  v_normalized_stats JSONB;
  v_match_id INTEGER;
  v_requested_match_id INTEGER;
  v_club_id INTEGER;
  v_current_club_id INTEGER;
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_updated_at TIMESTAMPTZ;
  v_competition_id INTEGER;
  v_stat_columns TEXT;
  v_count INTEGER;
  v_distinct_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'AUTH_REQUIRED';
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR p_save_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PAYLOAD';
  END IF;

  IF octet_length(p_payload::TEXT) > 2000000 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PAYLOAD';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'AUTH_REQUIRED';
  END IF;

  IF NOT coalesce(v_profile.is_super_admin, false) AND v_profile.role NOT IN ('admin', 'coach') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FORBIDDEN';
  END IF;

  v_match := p_payload -> 'match';
  v_stats := coalesce(p_payload -> 'stats', '[]'::jsonb);
  v_actions := coalesce(p_payload -> 'actions', '[]'::jsonb);
  v_penalties := coalesce(p_payload -> 'penalties', '[]'::jsonb);
  v_shots := coalesce(p_payload -> 'goalkeeper_shots', '[]'::jsonb);

  IF v_match IS NULL
    OR jsonb_typeof(v_match) <> 'object'
    OR jsonb_typeof(v_stats) <> 'array'
    OR jsonb_typeof(v_actions) <> 'array'
    OR jsonb_typeof(v_penalties) <> 'array'
    OR jsonb_typeof(v_shots) <> 'array'
    OR nullif(btrim(v_match ->> 'opponent'), '') IS NULL
    OR nullif(v_match ->> 'match_date', '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PAYLOAD';
  END IF;

  IF jsonb_array_length(v_stats) > 30
    OR jsonb_array_length(v_actions) > 5000
    OR jsonb_array_length(v_penalties) > 100
    OR jsonb_array_length(v_shots) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PAYLOAD';
  END IF;

  IF coalesce((v_match ->> 'home_score')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'away_score')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'q1_score')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'q2_score')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'q3_score')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'q4_score')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'q1_score_rival')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'q2_score_rival')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'q3_score_rival')::INTEGER, 0) < 0
    OR coalesce((v_match ->> 'q4_score_rival')::INTEGER, 0) < 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PAYLOAD';
  END IF;

  v_requested_match_id := NULLIF(v_match ->> 'id', '')::INTEGER;
  v_club_id := CASE
    WHEN coalesce(v_profile.is_super_admin, false) THEN NULLIF(v_match ->> 'club_id', '')::INTEGER
    ELSE v_profile.club_id
  END;

  IF v_club_id IS NULL OR NULLIF(v_match ->> 'club_id', '')::INTEGER IS DISTINCT FROM v_club_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FORBIDDEN';
  END IF;

  -- Serializes identical simultaneous retries without storing an operations table.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_save_id::TEXT, 0));

  -- An identical retry returns the already committed result without writing again.
  SELECT id, club_id, version, updated_at
  INTO v_match_id, v_current_club_id, v_new_version, v_updated_at
  FROM public.matches
  WHERE last_save_id = p_save_id;

  IF FOUND THEN
    IF NOT coalesce(v_profile.is_super_admin, false) AND v_current_club_id <> v_profile.club_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FORBIDDEN';
    END IF;

    RETURN jsonb_build_object(
      'match_id', v_match_id,
      'version', v_new_version,
      'already_processed', true,
      'updated_at', v_updated_at
    );
  END IF;

  SELECT count(*), count(DISTINCT (entry ->> 'player_id')::INTEGER)
  INTO v_count, v_distinct_count
  FROM jsonb_array_elements(v_stats) AS stat(entry);

  IF v_count = 0 OR v_count > 30 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PAYLOAD';
  END IF;

  IF v_count <> v_distinct_count THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DUPLICATE_PLAYERS';
  END IF;

  SELECT count(*) INTO v_count
  FROM jsonb_array_elements(v_stats) AS stat(entry)
  LEFT JOIN public.players player ON player.id = (stat.entry ->> 'player_id')::INTEGER
  WHERE player.id IS NULL OR player.club_id <> v_club_id;

  IF v_count > 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PLAYER_OUTSIDE_CLUB';
  END IF;

  SELECT count(*) INTO v_count
  FROM (
    SELECT (entry ->> 'player_id')::INTEGER AS player_id
    FROM jsonb_array_elements(v_actions) AS action(entry)
    UNION ALL
    SELECT (entry ->> 'goalkeeper_player_id')::INTEGER
    FROM jsonb_array_elements(v_shots) AS shot(entry)
    UNION ALL
    SELECT (entry ->> 'player_id')::INTEGER
    FROM jsonb_array_elements(v_penalties) AS penalty(entry)
    WHERE entry ->> 'player_id' IS NOT NULL
    UNION ALL
    SELECT (entry ->> 'goalkeeper_id')::INTEGER
    FROM jsonb_array_elements(v_penalties) AS penalty(entry)
    WHERE entry ->> 'goalkeeper_id' IS NOT NULL
    UNION ALL
    SELECT NULLIF(v_match ->> 'sprint1_winner_player_id', '')::INTEGER
    UNION ALL SELECT NULLIF(v_match ->> 'sprint2_winner_player_id', '')::INTEGER
    UNION ALL SELECT NULLIF(v_match ->> 'sprint3_winner_player_id', '')::INTEGER
    UNION ALL SELECT NULLIF(v_match ->> 'sprint4_winner_player_id', '')::INTEGER
  ) referenced
  WHERE referenced.player_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_stats) AS stat(entry)
      WHERE (stat.entry ->> 'player_id')::INTEGER = referenced.player_id
    );

  IF v_count > 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PLAYER_OUTSIDE_LINEUP';
  END IF;

  SELECT count(*) INTO v_count
  FROM (
    SELECT entry ->> 'client_id' AS value
    FROM jsonb_array_elements(v_actions) AS action(entry)
    GROUP BY entry ->> 'client_id'
    HAVING count(*) > 1
    UNION ALL
    SELECT entry ->> 'sequence'
    FROM jsonb_array_elements(v_actions) AS action(entry)
    GROUP BY entry ->> 'sequence'
    HAVING count(*) > 1
  ) duplicates;

  IF v_count > 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DUPLICATE_ACTIONS';
  END IF;

  SELECT count(*) INTO v_count
  FROM (
    SELECT entry ->> 'shot_order'
    FROM jsonb_array_elements(v_penalties) AS penalty(entry)
    GROUP BY entry ->> 'shot_order'
    HAVING count(*) > 1
  ) duplicates;

  IF v_count > 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DUPLICATE_PENALTY_ORDER';
  END IF;

  v_competition_id := NULLIF(v_match ->> 'competition_id', '')::INTEGER;
  IF v_competition_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.competitions WHERE id = v_competition_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PAYLOAD';
  END IF;

  IF v_requested_match_id IS NULL THEN
    INSERT INTO public.matches (
      club_id, match_date, opponent, location, home_score, away_score, is_home,
      season, jornada, notes, q1_score, q2_score, q3_score, q4_score,
      q1_score_rival, q2_score_rival, q3_score_rival, q4_score_rival,
      sprint1_winner, sprint2_winner, sprint3_winner, sprint4_winner,
      sprint1_winner_player_id, sprint2_winner_player_id,
      sprint3_winner_player_id, sprint4_winner_player_id,
      max_players_on_field, penalty_home_score, penalty_away_score,
      competition_id, stats_enabled, version, last_save_id, updated_at, updated_by
    ) VALUES (
      v_club_id,
      (v_match ->> 'match_date')::DATE,
      btrim(v_match ->> 'opponent'),
      NULLIF(btrim(v_match ->> 'location'), ''),
      coalesce((v_match ->> 'home_score')::INTEGER, 0),
      coalesce((v_match ->> 'away_score')::INTEGER, 0),
      coalesce((v_match ->> 'is_home')::BOOLEAN, true),
      NULLIF(btrim(v_match ->> 'season'), ''),
      NULLIF(v_match ->> 'jornada', '')::INTEGER,
      NULLIF(v_match ->> 'notes', ''),
      coalesce((v_match ->> 'q1_score')::INTEGER, 0),
      coalesce((v_match ->> 'q2_score')::INTEGER, 0),
      coalesce((v_match ->> 'q3_score')::INTEGER, 0),
      coalesce((v_match ->> 'q4_score')::INTEGER, 0),
      coalesce((v_match ->> 'q1_score_rival')::INTEGER, 0),
      coalesce((v_match ->> 'q2_score_rival')::INTEGER, 0),
      coalesce((v_match ->> 'q3_score_rival')::INTEGER, 0),
      coalesce((v_match ->> 'q4_score_rival')::INTEGER, 0),
      NULLIF(v_match ->> 'sprint1_winner', '')::INTEGER,
      NULLIF(v_match ->> 'sprint2_winner', '')::INTEGER,
      NULLIF(v_match ->> 'sprint3_winner', '')::INTEGER,
      NULLIF(v_match ->> 'sprint4_winner', '')::INTEGER,
      NULLIF(v_match ->> 'sprint1_winner_player_id', '')::INTEGER,
      NULLIF(v_match ->> 'sprint2_winner_player_id', '')::INTEGER,
      NULLIF(v_match ->> 'sprint3_winner_player_id', '')::INTEGER,
      NULLIF(v_match ->> 'sprint4_winner_player_id', '')::INTEGER,
      coalesce((v_match ->> 'max_players_on_field')::INTEGER, 0),
      NULLIF(v_match ->> 'penalty_home_score', '')::INTEGER,
      NULLIF(v_match ->> 'penalty_away_score', '')::INTEGER,
      v_competition_id,
      coalesce((v_match ->> 'stats_enabled')::BOOLEAN, true),
      1,
      p_save_id,
      now(),
      v_user_id
    )
    RETURNING id, version, updated_at INTO v_match_id, v_new_version, v_updated_at;
  ELSE
    SELECT club_id, version
    INTO v_current_club_id, v_current_version
    FROM public.matches
    WHERE id = v_requested_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'MATCH_NOT_FOUND';
    END IF;

    IF v_current_club_id <> v_club_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'FORBIDDEN';
    END IF;

    IF p_expected_version IS NULL OR p_expected_version <> v_current_version THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'MATCH_VERSION_CONFLICT',
        DETAIL = format('expected=%s current=%s', p_expected_version, v_current_version);
    END IF;

    UPDATE public.matches SET
      match_date = (v_match ->> 'match_date')::DATE,
      opponent = btrim(v_match ->> 'opponent'),
      location = NULLIF(btrim(v_match ->> 'location'), ''),
      home_score = coalesce((v_match ->> 'home_score')::INTEGER, 0),
      away_score = coalesce((v_match ->> 'away_score')::INTEGER, 0),
      is_home = coalesce((v_match ->> 'is_home')::BOOLEAN, true),
      season = NULLIF(btrim(v_match ->> 'season'), ''),
      jornada = NULLIF(v_match ->> 'jornada', '')::INTEGER,
      notes = NULLIF(v_match ->> 'notes', ''),
      q1_score = coalesce((v_match ->> 'q1_score')::INTEGER, 0),
      q2_score = coalesce((v_match ->> 'q2_score')::INTEGER, 0),
      q3_score = coalesce((v_match ->> 'q3_score')::INTEGER, 0),
      q4_score = coalesce((v_match ->> 'q4_score')::INTEGER, 0),
      q1_score_rival = coalesce((v_match ->> 'q1_score_rival')::INTEGER, 0),
      q2_score_rival = coalesce((v_match ->> 'q2_score_rival')::INTEGER, 0),
      q3_score_rival = coalesce((v_match ->> 'q3_score_rival')::INTEGER, 0),
      q4_score_rival = coalesce((v_match ->> 'q4_score_rival')::INTEGER, 0),
      sprint1_winner = NULLIF(v_match ->> 'sprint1_winner', '')::INTEGER,
      sprint2_winner = NULLIF(v_match ->> 'sprint2_winner', '')::INTEGER,
      sprint3_winner = NULLIF(v_match ->> 'sprint3_winner', '')::INTEGER,
      sprint4_winner = NULLIF(v_match ->> 'sprint4_winner', '')::INTEGER,
      sprint1_winner_player_id = NULLIF(v_match ->> 'sprint1_winner_player_id', '')::INTEGER,
      sprint2_winner_player_id = NULLIF(v_match ->> 'sprint2_winner_player_id', '')::INTEGER,
      sprint3_winner_player_id = NULLIF(v_match ->> 'sprint3_winner_player_id', '')::INTEGER,
      sprint4_winner_player_id = NULLIF(v_match ->> 'sprint4_winner_player_id', '')::INTEGER,
      max_players_on_field = coalesce((v_match ->> 'max_players_on_field')::INTEGER, 0),
      penalty_home_score = NULLIF(v_match ->> 'penalty_home_score', '')::INTEGER,
      penalty_away_score = NULLIF(v_match ->> 'penalty_away_score', '')::INTEGER,
      competition_id = v_competition_id,
      stats_enabled = coalesce((v_match ->> 'stats_enabled')::BOOLEAN, true),
      version = version + 1,
      last_save_id = p_save_id,
      updated_at = now(),
      updated_by = v_user_id
    WHERE id = v_requested_match_id
    RETURNING id, version, updated_at INTO v_match_id, v_new_version, v_updated_at;
  END IF;

  -- All child replacement happens inside this same PostgreSQL transaction.
  DELETE FROM public.goalkeeper_shots WHERE match_id = v_match_id;
  DELETE FROM public.penalty_shootout_players WHERE match_id = v_match_id;
  DELETE FROM public.match_actions WHERE match_id = v_match_id;
  DELETE FROM public.match_stats WHERE match_id = v_match_id;

  SELECT coalesce(
    jsonb_agg((entry - 'id' - 'match_id' - 'created_at') || jsonb_build_object('match_id', v_match_id)),
    '[]'::jsonb
  )
  INTO v_normalized_stats
  FROM jsonb_array_elements(v_stats) AS stat(entry);

  SELECT string_agg(format('%I', attribute.attname), ', ' ORDER BY attribute.attnum)
  INTO v_stat_columns
  FROM pg_attribute attribute
  WHERE attribute.attrelid = 'public.match_stats'::regclass
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped
    AND attribute.attname NOT IN ('id', 'created_at');

  EXECUTE format(
    'INSERT INTO public.match_stats (%1$s) SELECT %1$s FROM jsonb_populate_recordset(NULL::public.match_stats, $1)',
    v_stat_columns
  ) USING v_normalized_stats;

  INSERT INTO public.match_actions (
    client_id, match_id, player_id, quarter, sequence, action_key, created_by
  )
  SELECT
    action.client_id,
    v_match_id,
    action.player_id,
    action.quarter,
    action.sequence,
    btrim(action.action_key),
    v_user_id
  FROM jsonb_to_recordset(v_actions) AS action(
    client_id UUID,
    player_id INTEGER,
    quarter SMALLINT,
    sequence INTEGER,
    action_key TEXT
  );

  INSERT INTO public.penalty_shootout_players (
    match_id, player_id, shot_order, scored, result_type, goalkeeper_id
  )
  SELECT
    v_match_id,
    penalty.player_id,
    penalty.shot_order,
    penalty.scored,
    penalty.result_type,
    penalty.goalkeeper_id
  FROM jsonb_to_recordset(v_penalties) AS penalty(
    player_id INTEGER,
    shot_order INTEGER,
    scored BOOLEAN,
    result_type TEXT,
    goalkeeper_id INTEGER
  );

  INSERT INTO public.goalkeeper_shots (
    match_id, goalkeeper_player_id, quarter, shot_index, result, x, y
  )
  SELECT
    v_match_id,
    shot.goalkeeper_player_id,
    shot.quarter,
    shot.shot_index,
    shot.result,
    shot.x,
    shot.y
  FROM jsonb_to_recordset(v_shots) AS shot(
    goalkeeper_player_id INTEGER,
    quarter SMALLINT,
    shot_index INTEGER,
    result TEXT,
    x REAL,
    y REAL
  );

  IF nullif(btrim(p_payload ->> 'draft_key'), '') IS NOT NULL THEN
    DELETE FROM public.match_drafts
    WHERE user_id = v_user_id
      AND club_id = v_club_id
      AND draft_key = p_payload ->> 'draft_key';
  END IF;

  RETURN jsonb_build_object(
    'match_id', v_match_id,
    'version', v_new_version,
    'already_processed', false,
    'updated_at', v_updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_match_bundle(JSONB, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_match_bundle(JSONB, UUID, INTEGER) TO authenticated;

-- Makes the new RPC visible to PostgREST immediately in Supabase.
NOTIFY pgrst, 'reload schema';

-- Optional verification after executing the migration:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'matches'
--   AND column_name IN ('version', 'last_save_id', 'updated_at', 'updated_by');
