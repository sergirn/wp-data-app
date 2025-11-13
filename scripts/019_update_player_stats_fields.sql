-- Update player statistics fields to match new requirements
-- This script adds new fields and updates existing ones for better stat tracking

-- Add new goal type fields for players
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS goles_boya_jugada INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goles_penalti_anotado INTEGER DEFAULT 0;

-- Add new shot fields for players
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS tiros_penalti_fallado INTEGER DEFAULT 0;

-- Add new foul fields for players
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS faltas_exp_20_1c1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS faltas_exp_20_boya INTEGER DEFAULT 0;

-- Add new action fields for players
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS acciones_penalti_provocado_new INTEGER DEFAULT 0;

-- Update comments for clarity
COMMENT ON COLUMN match_stats.goles_boya_jugada IS 'Goals from boya/jugada (center position play)';
COMMENT ON COLUMN match_stats.goles_hombre_mas IS 'Goals scored with man advantage';
COMMENT ON COLUMN match_stats.goles_lanzamiento IS 'Goals from lanzamiento (drive shot)';
COMMENT ON COLUMN match_stats.goles_dir_mas_5m IS 'Goals from direct shot beyond 5m';
COMMENT ON COLUMN match_stats.goles_contraataque IS 'Goals from counterattack';
COMMENT ON COLUMN match_stats.goles_penalti_anotado IS 'Penalty goals scored';

COMMENT ON COLUMN match_stats.tiros_penalti_fallado IS 'Missed penalty shots';
COMMENT ON COLUMN match_stats.tiros_corner IS 'Corner shots (missed)';
COMMENT ON COLUMN match_stats.tiros_fuera IS 'Shots that went out';
COMMENT ON COLUMN match_stats.tiros_parados IS 'Shots saved by goalkeeper';
COMMENT ON COLUMN match_stats.tiros_bloqueado IS 'Shots blocked by defenders';
COMMENT ON COLUMN match_stats.tiros_eficiencia IS 'Shooting efficiency percentage';

COMMENT ON COLUMN match_stats.faltas_exp_20_1c1 IS '20 second exclusion for 1-on-1 foul';
COMMENT ON COLUMN match_stats.faltas_exp_20_boya IS '20 second exclusion for boya foul';
COMMENT ON COLUMN match_stats.faltas_penalti IS 'Penalty fouls committed';
COMMENT ON COLUMN match_stats.faltas_contrafaltas IS 'Counter fouls';

COMMENT ON COLUMN match_stats.acciones_bloqueo IS 'Blocks made';
COMMENT ON COLUMN match_stats.acciones_asistencias IS 'Assists';
COMMENT ON COLUMN match_stats.acciones_recuperacion IS 'Ball recoveries';
COMMENT ON COLUMN match_stats.acciones_rebote IS 'Rebounds';
COMMENT ON COLUMN match_stats.acciones_exp_provocada IS 'Exclusions drawn';
COMMENT ON COLUMN match_stats.acciones_penalti_provocado IS 'Penalties drawn';
COMMENT ON COLUMN match_stats.acciones_recibir_gol IS 'Goals received (for tracking)';
