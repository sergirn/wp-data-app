-- Add penalty shootout columns to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS penalty_home_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS penalty_away_score INTEGER DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN matches.penalty_home_score IS 'Goles anotados por el equipo local en la tanda de penaltis (solo si hubo empate)';
COMMENT ON COLUMN matches.penalty_away_score IS 'Goles anotados por el equipo rival en la tanda de penaltis (solo si hubo empate)';
