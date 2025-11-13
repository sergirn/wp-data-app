-- New script to enforce club data isolation with RLS policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their club's players" ON players;
DROP POLICY IF EXISTS "Users can view their club's matches" ON matches;
DROP POLICY IF EXISTS "Users can view match stats for their club's matches" ON match_stats;
DROP POLICY IF EXISTS "Admins can insert players for their club" ON players;
DROP POLICY IF EXISTS "Admins can update players for their club" ON players;
DROP POLICY IF EXISTS "Admins can delete players for their club" ON players;
DROP POLICY IF EXISTS "Admins can insert matches for their club" ON matches;
DROP POLICY IF EXISTS "Admins can update matches for their club" ON matches;
DROP POLICY IF EXISTS "Admins can delete matches for their club" ON matches;
DROP POLICY IF EXISTS "Admins can insert match stats" ON match_stats;
DROP POLICY IF EXISTS "Admins can update match stats" ON match_stats;
DROP POLICY IF EXISTS "Admins can delete match stats" ON match_stats;

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- PLAYERS TABLE POLICIES
-- Super admins can see all players
CREATE POLICY "Super admins can view all players"
ON players FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Regular users can only see players from their club
CREATE POLICY "Users can view their club's players"
ON players FOR SELECT
TO authenticated
USING (
  club_id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Admins and coaches can insert players for their club
CREATE POLICY "Admins can insert players for their club"
ON players FOR INSERT
TO authenticated
WITH CHECK (
  club_id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Admins and coaches can update players for their club
CREATE POLICY "Admins can update players for their club"
ON players FOR UPDATE
TO authenticated
USING (
  club_id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Admins can delete players for their club
CREATE POLICY "Admins can delete players for their club"
ON players FOR DELETE
TO authenticated
USING (
  club_id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
    AND role = 'admin'
  )
);

-- MATCHES TABLE POLICIES
-- Super admins can see all matches
CREATE POLICY "Super admins can view all matches"
ON matches FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Regular users can only see matches from their club
CREATE POLICY "Users can view their club's matches"
ON matches FOR SELECT
TO authenticated
USING (
  club_id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Admins and coaches can insert matches for their club
CREATE POLICY "Admins can insert matches for their club"
ON matches FOR INSERT
TO authenticated
WITH CHECK (
  club_id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Admins and coaches can update matches for their club
CREATE POLICY "Admins can update matches for their club"
ON matches FOR UPDATE
TO authenticated
USING (
  club_id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
    AND (role = 'admin' OR role = 'coach')
  )
);

-- Admins can delete matches for their club
CREATE POLICY "Admins can delete matches for their club"
ON matches FOR DELETE
TO authenticated
USING (
  club_id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
    AND role = 'admin'
  )
);

-- MATCH_STATS TABLE POLICIES
-- Users can view match stats if they can view the match
CREATE POLICY "Users can view match stats for their club's matches"
ON match_stats FOR SELECT
TO authenticated
USING (
  match_id IN (
    SELECT id FROM matches
    WHERE club_id IN (
      SELECT club_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Admins and coaches can insert match stats for their club's matches
CREATE POLICY "Admins can insert match stats"
ON match_stats FOR INSERT
TO authenticated
WITH CHECK (
  match_id IN (
    SELECT id FROM matches
    WHERE club_id IN (
      SELECT club_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  )
);

-- Admins and coaches can update match stats for their club's matches
CREATE POLICY "Admins can update match stats"
ON match_stats FOR UPDATE
TO authenticated
USING (
  match_id IN (
    SELECT id FROM matches
    WHERE club_id IN (
      SELECT club_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND (role = 'admin' OR role = 'coach')
    )
  )
);

-- Admins can delete match stats for their club's matches
CREATE POLICY "Admins can delete match stats"
ON match_stats FOR DELETE
TO authenticated
USING (
  match_id IN (
    SELECT id FROM matches
    WHERE club_id IN (
      SELECT club_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- CLUBS TABLE POLICIES
-- Super admins can see all clubs
CREATE POLICY "Super admins can view all clubs"
ON clubs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Regular users can only see their own club
CREATE POLICY "Users can view their club"
ON clubs FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT club_id FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Only super admins can modify clubs
CREATE POLICY "Super admins can insert clubs"
ON clubs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

CREATE POLICY "Super admins can update clubs"
ON clubs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

CREATE POLICY "Super admins can delete clubs"
ON clubs FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);
