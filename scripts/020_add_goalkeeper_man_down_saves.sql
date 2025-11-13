-- Add goalkeeper man down save field
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS portero_paradas_hombre_menos INTEGER DEFAULT 0;

-- Update the comment
COMMENT ON COLUMN match_stats.portero_paradas_hombre_menos IS 'Goalkeeper saves/defenses in man down situations';
