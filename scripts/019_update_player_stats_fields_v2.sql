-- Update player and goalkeeper statistics fields to match new requirements
-- This script adds all new fields needed for the updated stat tracking system

-- ============================================
-- PLAYER FIELDS - Goals
-- ============================================
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS goles_boya_jugada INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goles_penalti_anotado INTEGER DEFAULT 0;

-- Note: These already exist in the schema:
-- goles_hombre_mas, goles_lanzamiento, goles_dir_mas_5m, goles_contraataque

-- ============================================
-- PLAYER FIELDS - Shots (Tiros)
-- ============================================
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS tiros_penalti_fallado INTEGER DEFAULT 0;

-- Note: These already exist: tiros_corner, tiros_fuera, tiros_parados, tiros_bloqueado

-- ============================================
-- PLAYER FIELDS - Fouls (Faltas)
-- ============================================
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS faltas_exp_20_1c1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS faltas_exp_20_boya INTEGER DEFAULT 0;

-- Note: faltas_penalti and faltas_contrafaltas already exist

-- ============================================
-- GOALKEEPER FIELDS - Goals Conceded
-- ============================================
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS portero_goles_totales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_hombre_menos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_contraataque INTEGER DEFAULT 0;

-- Rename existing goalkeeper goal fields for clarity
-- portero_goles_boya_parada -> tracks boya goals conceded
-- portero_goles_lanzamiento -> tracks lanzamiento goals conceded
-- portero_goles_dir_mas_5m -> tracks dir +5m goals conceded
-- portero_goles_penalti_encajado -> tracks penalty goals conceded

-- ============================================
-- GOALKEEPER FIELDS - Saves (Paradas)
-- ============================================
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS portero_paradas_fuera INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_paradas_hombre_menos INTEGER DEFAULT 0;

-- Note: portero_paradas_totales, portero_tiros_parada_recup, portero_paradas_penalti_parado already exist

-- ============================================
-- GOALKEEPER FIELDS - Actions
-- ============================================
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS portero_acciones_asistencias INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_acciones_recuperacion INTEGER DEFAULT 0;

-- Note: portero_acciones_perdida_pos, portero_exp_provocada already exist

-- ============================================
-- Add helpful comments
-- ============================================
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

COMMENT ON COLUMN match_stats.portero_goles_totales IS 'Total goals conceded by goalkeeper';
COMMENT ON COLUMN match_stats.portero_goles_boya_parada IS 'Goals conceded from boya';
COMMENT ON COLUMN match_stats.portero_goles_hombre_menos IS 'Goals conceded in man down situation';
COMMENT ON COLUMN match_stats.portero_goles_lanzamiento IS 'Goals conceded from lanzamiento';
COMMENT ON COLUMN match_stats.portero_goles_dir_mas_5m IS 'Goals conceded from direct shot +5m';
COMMENT ON COLUMN match_stats.portero_goles_contraataque IS 'Goals conceded from counterattack';
COMMENT ON COLUMN match_stats.portero_goles_penalti_encajado IS 'Penalty goals conceded';

COMMENT ON COLUMN match_stats.portero_paradas_totales IS 'Total saves made';
COMMENT ON COLUMN match_stats.portero_tiros_parada_recup IS 'Saves with recovery';
COMMENT ON COLUMN match_stats.portero_paradas_fuera IS 'Saves that went out';
COMMENT ON COLUMN match_stats.portero_paradas_hombre_menos IS 'Saves made in man down situation';
COMMENT ON COLUMN match_stats.portero_paradas_penalti_parado IS 'Penalty saves';

COMMENT ON COLUMN match_stats.portero_acciones_asistencias IS 'Goalkeeper assists';
COMMENT ON COLUMN match_stats.portero_acciones_recuperacion IS 'Goalkeeper ball recoveries';
COMMENT ON COLUMN match_stats.portero_acciones_perdida_pos IS 'Goalkeeper turnovers';
COMMENT ON COLUMN match_stats.portero_exp_provocada IS 'Exclusions drawn by goalkeeper';
