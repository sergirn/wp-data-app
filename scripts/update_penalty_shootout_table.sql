-- Add column to track penalty result type for rival team
ALTER TABLE penalty_shootout_players 
ADD COLUMN IF NOT EXISTS result_type TEXT CHECK (result_type IN ('scored', 'missed', 'saved'));

-- Add comment
COMMENT ON COLUMN penalty_shootout_players.result_type IS 'Type of penalty result: scored (goal), missed (off target), saved (goalkeeper save)';
