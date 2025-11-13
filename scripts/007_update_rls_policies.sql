-- Drop existing public access policies
DROP POLICY IF EXISTS "Allow public read access on players" ON players;
DROP POLICY IF EXISTS "Allow public insert on players" ON players;
DROP POLICY IF EXISTS "Allow public update on players" ON players;
DROP POLICY IF EXISTS "Allow public delete on players" ON players;

DROP POLICY IF EXISTS "Allow public read access on matches" ON matches;
DROP POLICY IF EXISTS "Allow public insert on matches" ON matches;
DROP POLICY IF EXISTS "Allow public update on matches" ON matches;
DROP POLICY IF EXISTS "Allow public delete on matches" ON matches;

DROP POLICY IF EXISTS "Allow public read access on match_stats" ON match_stats;
DROP POLICY IF EXISTS "Allow public insert on match_stats" ON match_stats;
DROP POLICY IF EXISTS "Allow public update on match_stats" ON match_stats;
DROP POLICY IF EXISTS "Allow public delete on match_stats" ON match_stats;

-- New RLS policies with role-based access control

-- PLAYERS TABLE
-- Everyone can read players
CREATE POLICY "players_select_authenticated" ON players
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins and coaches can insert players
CREATE POLICY "players_insert_admin_coach" ON players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    )
  );

-- Only admins and coaches can update players
CREATE POLICY "players_update_admin_coach" ON players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    )
  );

-- Only admins can delete players
CREATE POLICY "players_delete_admin" ON players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- MATCHES TABLE
-- Everyone can read matches
CREATE POLICY "matches_select_authenticated" ON matches
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins and coaches can insert matches
CREATE POLICY "matches_insert_admin_coach" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    )
  );

-- Only admins and coaches can update matches
CREATE POLICY "matches_update_admin_coach" ON matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    )
  );

-- Only admins can delete matches
CREATE POLICY "matches_delete_admin" ON matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- MATCH_STATS TABLE
-- Everyone can read match stats
CREATE POLICY "match_stats_select_authenticated" ON match_stats
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins and coaches can insert match stats
CREATE POLICY "match_stats_insert_admin_coach" ON match_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    )
  );

-- Only admins and coaches can update match stats
CREATE POLICY "match_stats_update_admin_coach" ON match_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    )
  );

-- Only admins can delete match stats
CREATE POLICY "match_stats_delete_admin" ON match_stats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
