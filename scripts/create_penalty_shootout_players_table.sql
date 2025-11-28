-- Create table to store penalty shootout players
CREATE TABLE IF NOT EXISTS penalty_shootout_players (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  shot_order INTEGER NOT NULL,
  scored BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, shot_order)
);

-- Add RLS policies
ALTER TABLE penalty_shootout_players ENABLE ROW LEVEL SECURITY;

-- Users can view penalty shootout players for their club's matches
CREATE POLICY penalty_shootout_players_select_by_club ON penalty_shootout_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      INNER JOIN profiles p ON p.club_id = m.club_id
      WHERE m.id = penalty_shootout_players.match_id
      AND p.id = auth.uid()
    )
  );

-- Admins can insert penalty shootout players for their club's matches
CREATE POLICY penalty_shootout_players_insert_by_club ON penalty_shootout_players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      INNER JOIN profiles p ON p.club_id = m.club_id
      WHERE m.id = penalty_shootout_players.match_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'coach')
    )
  );

-- Admins can update penalty shootout players for their club's matches
CREATE POLICY penalty_shootout_players_update_by_club ON penalty_shootout_players
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      INNER JOIN profiles p ON p.club_id = m.club_id
      WHERE m.id = penalty_shootout_players.match_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'coach')
    )
  );

-- Admins can delete penalty shootout players for their club's matches
CREATE POLICY penalty_shootout_players_delete_by_club ON penalty_shootout_players
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      INNER JOIN profiles p ON p.club_id = m.club_id
      WHERE m.id = penalty_shootout_players.match_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'coach')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_penalty_shootout_players_match_id ON penalty_shootout_players(match_id);
CREATE INDEX IF NOT EXISTS idx_penalty_shootout_players_player_id ON penalty_shootout_players(player_id);
