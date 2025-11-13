-- Create clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add club_id to existing tables
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create indexes for club_id
CREATE INDEX IF NOT EXISTS idx_players_club_id ON public.players(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON public.matches(club_id);
CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON public.profiles(club_id);

-- Enable RLS on clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Policies for clubs table
-- Anyone authenticated can read clubs
CREATE POLICY "clubs_select_authenticated" ON public.clubs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only super admins can insert clubs
CREATE POLICY "clubs_insert_super_admin" ON public.clubs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Only super admins can update clubs
CREATE POLICY "clubs_update_super_admin" ON public.clubs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Only super admins can delete clubs
CREATE POLICY "clubs_delete_super_admin" ON public.clubs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Update RLS policies for players to filter by club_id
DROP POLICY IF EXISTS "Allow authenticated read access on players" ON public.players;
DROP POLICY IF EXISTS "Allow authenticated insert on players" ON public.players;
DROP POLICY IF EXISTS "Allow authenticated update on players" ON public.players;
DROP POLICY IF EXISTS "Allow authenticated delete on players" ON public.players;

CREATE POLICY "players_select_by_club" ON public.players
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "players_insert_by_club" ON public.players
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "players_update_by_club" ON public.players
  FOR UPDATE USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "players_delete_by_club" ON public.players
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );

-- Update RLS policies for matches to filter by club_id
DROP POLICY IF EXISTS "Allow authenticated read access on matches" ON public.matches;
DROP POLICY IF EXISTS "Allow authenticated insert on matches" ON public.matches;
DROP POLICY IF EXISTS "Allow authenticated update on matches" ON public.matches;
DROP POLICY IF EXISTS "Allow authenticated delete on matches" ON public.matches;

CREATE POLICY "matches_select_by_club" ON public.matches
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "matches_insert_by_club" ON public.matches
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "matches_update_by_club" ON public.matches
  FOR UPDATE USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "matches_delete_by_club" ON public.matches
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
    )
  );

-- Update RLS policies for match_stats (inherits from matches)
DROP POLICY IF EXISTS "Allow authenticated read access on match_stats" ON public.match_stats;
DROP POLICY IF EXISTS "Allow authenticated insert on match_stats" ON public.match_stats;
DROP POLICY IF EXISTS "Allow authenticated update on match_stats" ON public.match_stats;
DROP POLICY IF EXISTS "Allow authenticated delete on match_stats" ON public.match_stats;

CREATE POLICY "match_stats_select_by_club" ON public.match_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = match_stats.match_id AND m.club_id = p.club_id
    )
  );

CREATE POLICY "match_stats_insert_by_club" ON public.match_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = match_stats.match_id AND m.club_id = p.club_id
    )
  );

CREATE POLICY "match_stats_update_by_club" ON public.match_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = match_stats.match_id AND m.club_id = p.club_id
    )
  );

CREATE POLICY "match_stats_delete_by_club" ON public.match_stats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = match_stats.match_id AND m.club_id = p.club_id
      AND p.role IN ('admin', 'coach')
    )
  );

-- Insert CN Sant Andreu as the first club
INSERT INTO public.clubs (name, short_name, logo_url, primary_color, secondary_color)
VALUES (
  'Club Natació Sant Andreu',
  'CN Sant Andreu',
  '/cn-sant-andreu.png',
  '#1e3a8a',
  '#3b82f6'
)
ON CONFLICT DO NOTHING;

-- Update existing data to belong to CN Sant Andreu (club_id = 1)
UPDATE public.players SET club_id = 1 WHERE club_id IS NULL;
UPDATE public.matches SET club_id = 1 WHERE club_id IS NULL;
UPDATE public.profiles SET club_id = 1 WHERE club_id IS NULL;

-- Make club_id NOT NULL after migration
ALTER TABLE public.players ALTER COLUMN club_id SET NOT NULL;
ALTER TABLE public.matches ALTER COLUMN club_id SET NOT NULL;
