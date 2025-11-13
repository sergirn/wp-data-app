-- Add new goalkeeper fields for saves and penalties
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS portero_paradas_totales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_paradas_penalti_parado INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_faltas_penalti_encajado INTEGER DEFAULT 0;

-- Update existing data if needed
UPDATE match_stats SET portero_paradas_totales = 0 WHERE portero_paradas_totales IS NULL;
UPDATE match_stats SET portero_paradas_penalti_parado = 0 WHERE portero_paradas_penalti_parado IS NULL;
UPDATE match_stats SET portero_faltas_penalti_encajado = 0 WHERE portero_faltas_penalti_encajado IS NULL;
