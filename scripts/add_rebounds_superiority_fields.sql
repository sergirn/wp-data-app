-- Add rebound fields for superiority stats
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS rebote_recup_hombre_mas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rebote_perd_hombre_mas integer DEFAULT 0;

COMMENT ON COLUMN match_stats.rebote_recup_hombre_mas IS 'Rebounds recovered during man advantage (superioridad)';
COMMENT ON COLUMN match_stats.rebote_perd_hombre_mas IS 'Rebounds lost during man advantage (superioridad)';
