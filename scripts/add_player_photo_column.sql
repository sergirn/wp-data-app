-- Add photo_url column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment to column
COMMENT ON COLUMN players.photo_url IS 'URL of the player photo, displayed in player cards';
