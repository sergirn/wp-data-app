-- Add new goalkeeper-specific fields based on the provided image

-- Add new goalkeeper goal fields
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_goles_boya_parada INTEGER DEFAULT 0;
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_goles_lanzamiento INTEGER DEFAULT 0;
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_goles_dir_mas_5m INTEGER DEFAULT 0;

-- Add new goalkeeper shot fields
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_tiros_parado INTEGER DEFAULT 0;
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_tiros_parada_recup INTEGER DEFAULT 0;

-- Add new goalkeeper foul fields
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_faltas_exp_3_int INTEGER DEFAULT 0;

-- Add new goalkeeper action fields
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_acciones_rebote INTEGER DEFAULT 0;
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_acciones_perdida_pos INTEGER DEFAULT 0;
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS portero_acciones_gol_recibido INTEGER DEFAULT 0;
