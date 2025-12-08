-- Add goalkeeper_id column to penalty_shootout_players table
-- This tracks which goalkeeper made a save during penalty shootouts

ALTER TABLE penalty_shootout_players 
ADD COLUMN IF NOT EXISTS goalkeeper_id INTEGER REFERENCES players(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_penalty_shootout_goalkeeper 
ON penalty_shootout_players(goalkeeper_id);

-- Add comment to document the column
COMMENT ON COLUMN penalty_shootout_players.goalkeeper_id IS 'ID of the goalkeeper who made the save (only for result_type = saved)';
