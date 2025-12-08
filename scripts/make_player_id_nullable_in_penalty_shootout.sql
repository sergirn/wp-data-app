-- Make player_id nullable in penalty_shootout_players table
-- This allows storing penalty kicks from the opposing team without requiring a player_id

ALTER TABLE penalty_shootout_players 
ALTER COLUMN player_id DROP NOT NULL;

-- Add a comment to clarify the purpose
COMMENT ON COLUMN penalty_shootout_players.player_id IS 'Player ID for our team penalties. NULL for opponent team penalties.';
