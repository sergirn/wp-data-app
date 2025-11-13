-- Update RLS policies to allow super admins to access all data

-- Players: Super admins can see all players from all clubs
DROP POLICY IF EXISTS "players_select_by_club" ON public.players;
CREATE POLICY "players_select_by_club" ON public.players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_super_admin = true OR club_id = players.club_id)
    )
  );

DROP POLICY IF EXISTS "players_insert_by_club" ON public.players;
CREATE POLICY "players_insert_by_club" ON public.players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_super_admin = true OR club_id = players.club_id)
    )
  );

DROP POLICY IF EXISTS "players_update_by_club" ON public.players;
CREATE POLICY "players_update_by_club" ON public.players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_super_admin = true OR club_id = players.club_id)
    )
  );

DROP POLICY IF EXISTS "players_delete_by_club" ON public.players;
CREATE POLICY "players_delete_by_club" ON public.players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_super_admin = true OR (club_id = players.club_id AND role IN ('admin', 'coach')))
    )
  );

-- Matches: Super admins can see all matches from all clubs
DROP POLICY IF EXISTS "matches_select_by_club" ON public.matches;
CREATE POLICY "matches_select_by_club" ON public.matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_super_admin = true OR club_id = matches.club_id)
    )
  );

DROP POLICY IF EXISTS "matches_insert_by_club" ON public.matches;
CREATE POLICY "matches_insert_by_club" ON public.matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_super_admin = true OR club_id = matches.club_id)
    )
  );

DROP POLICY IF EXISTS "matches_update_by_club" ON public.matches;
CREATE POLICY "matches_update_by_club" ON public.matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_super_admin = true OR club_id = matches.club_id)
    )
  );

DROP POLICY IF EXISTS "matches_delete_by_club" ON public.matches;
CREATE POLICY "matches_delete_by_club" ON public.matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (is_super_admin = true OR (club_id = matches.club_id AND role IN ('admin', 'coach')))
    )
  );

-- Match Stats: Super admins can see all match stats
DROP POLICY IF EXISTS "match_stats_select_by_club" ON public.match_stats;
CREATE POLICY "match_stats_select_by_club" ON public.match_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.matches m ON m.id = match_stats.match_id
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR p.club_id = m.club_id)
    )
  );

DROP POLICY IF EXISTS "match_stats_insert_by_club" ON public.match_stats;
CREATE POLICY "match_stats_insert_by_club" ON public.match_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.matches m ON m.id = match_stats.match_id
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR p.club_id = m.club_id)
    )
  );

DROP POLICY IF EXISTS "match_stats_update_by_club" ON public.match_stats;
CREATE POLICY "match_stats_update_by_club" ON public.match_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.matches m ON m.id = match_stats.match_id
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR p.club_id = m.club_id)
    )
  );

DROP POLICY IF EXISTS "match_stats_delete_by_club" ON public.match_stats;
CREATE POLICY "match_stats_delete_by_club" ON public.match_stats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.matches m ON m.id = match_stats.match_id
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR (p.club_id = m.club_id AND p.role IN ('admin', 'coach')))
    )
  );

-- Profiles: Super admins can manage all profiles
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Super admins can update any profile
CREATE POLICY "profiles_update_super_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );
