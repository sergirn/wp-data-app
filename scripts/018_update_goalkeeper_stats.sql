-- Add new goalkeeper statistics fields for better tracking

-- Goals conceded fields (already exist, but adding missing ones)
ALTER TABLE match_stats 
ADD COLUMN IF NOT EXISTS portero_goles_hombre_menos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_contraataque INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_penalti INTEGER DEFAULT 0;

-- Saves fields (paradas)
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS portero_paradas_fuera INTEGER DEFAULT 0;

-- Update comments for clarity
COMMENT ON COLUMN match_stats.portero_goles_boya_parada IS 'Goals conceded from center (boya)';
COMMENT ON COLUMN match_stats.portero_goles_lanzamiento IS 'Goals conceded from lanzamiento';
COMMENT ON COLUMN match_stats.portero_goles_dir_mas_5m IS 'Goals conceded from direct shot +5m';
COMMENT ON COLUMN match_stats.portero_goles_hombre_menos IS 'Goals conceded when man down';
COMMENT ON COLUMN match_stats.portero_goles_contraataque IS 'Goals conceded from counterattack';
COMMENT ON COLUMN match_stats.portero_goles_penalti IS 'Goals conceded from penalty';

COMMENT ON COLUMN match_stats.portero_paradas_totales IS 'Total saves';
COMMENT ON COLUMN match_stats.portero_tiros_parada_recup IS 'Saves with recovery';
COMMENT ON COLUMN match_stats.portero_paradas_fuera IS 'Saves out (ball goes out)';
COMMENT ON COLUMN match_stats.portero_paradas_penalti_parado IS 'Penalty saves';
