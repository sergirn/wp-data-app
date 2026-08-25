-- Non-destructive hotfix for an existing match_actions table.
-- This aligns match_actions permissions with the working match_stats policies.

ALTER TABLE public.match_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_actions'
      AND policyname = 'match_actions_select_by_club'
  ) THEN
    CREATE POLICY match_actions_select_by_club
      ON public.match_actions FOR SELECT
      USING (FALSE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_actions'
      AND policyname = 'match_actions_insert_by_club'
  ) THEN
    CREATE POLICY match_actions_insert_by_club
      ON public.match_actions FOR INSERT
      WITH CHECK (FALSE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_actions'
      AND policyname = 'match_actions_update_by_club'
  ) THEN
    CREATE POLICY match_actions_update_by_club
      ON public.match_actions FOR UPDATE
      USING (FALSE)
      WITH CHECK (FALSE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_actions'
      AND policyname = 'match_actions_delete_by_club'
  ) THEN
    CREATE POLICY match_actions_delete_by_club
      ON public.match_actions FOR DELETE
      USING (FALSE);
  END IF;
END
$$;

ALTER POLICY match_actions_select_by_club
  ON public.match_actions
  USING (
    match_id IN (
      SELECT m.id
      FROM public.matches m
      WHERE m.club_id IN (
        SELECT p.club_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_super_admin = TRUE
    )
  );

ALTER POLICY match_actions_insert_by_club
  ON public.match_actions
  WITH CHECK (
    match_id IN (
      SELECT m.id
      FROM public.matches m
      WHERE m.club_id IN (
        SELECT p.club_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'coach')
      )
    )
  );

ALTER POLICY match_actions_update_by_club
  ON public.match_actions
  USING (
    match_id IN (
      SELECT m.id
      FROM public.matches m
      WHERE m.club_id IN (
        SELECT p.club_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'coach')
      )
    )
  )
  WITH CHECK (
    match_id IN (
      SELECT m.id
      FROM public.matches m
      WHERE m.club_id IN (
        SELECT p.club_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'coach')
      )
    )
  );

ALTER POLICY match_actions_delete_by_club
  ON public.match_actions
  USING (
    match_id IN (
      SELECT m.id
      FROM public.matches m
      WHERE m.club_id IN (
        SELECT p.club_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'coach')
      )
    )
  );
