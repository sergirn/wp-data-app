-- Table: user_stat_weights
-- Each user can assign a numeric weight (positive or negative) to each match_stats field.
-- This is independent per user and per club.

CREATE TABLE IF NOT EXISTS public.user_stat_weights (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id integer NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  stat_key text NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, club_id, stat_key)
);

-- Enable RLS
ALTER TABLE public.user_stat_weights ENABLE ROW LEVEL SECURITY;

-- Policies: each user can only read/write their own weights
CREATE POLICY "select own stat weights"
  ON public.user_stat_weights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert own stat weights"
  ON public.user_stat_weights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own stat weights"
  ON public.user_stat_weights
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "delete own stat weights"
  ON public.user_stat_weights
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_stat_weights_user_club
  ON public.user_stat_weights(user_id, club_id);
