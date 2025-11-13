-- Add all missing player stat columns
ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS faltas_exp_20_1c1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS faltas_exp_20_boya INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goles_penalti_anotado INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tiros_penalti_fallado INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_totales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_boya INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_hombre_menos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_contraataque INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_goles_penalti INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_paradas_parada_fuera INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_paradas_hombre_menos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_acciones_asistencias INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_acciones_recuperacion INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_acciones_exp_provocada INTEGER DEFAULT 0;

-- Update existing NULL values to 0
UPDATE match_stats
SET 
  faltas_exp_20_1c1 = COALESCE(faltas_exp_20_1c1, 0),
  faltas_exp_20_boya = COALESCE(faltas_exp_20_boya, 0),
  goles_penalti_anotado = COALESCE(goles_penalti_anotado, 0),
  tiros_penalti_fallado = COALESCE(tiros_penalti_fallado, 0),
  portero_goles_totales = COALESCE(portero_goles_totales, 0),
  portero_goles_boya = COALESCE(portero_goles_boya, 0),
  portero_goles_hombre_menos = COALESCE(portero_goles_hombre_menos, 0),
  portero_goles_contraataque = COALESCE(portero_goles_contraataque, 0),
  portero_goles_penalti = COALESCE(portero_goles_penalti, 0),
  portero_paradas_parada_fuera = COALESCE(portero_paradas_parada_fuera, 0),
  portero_paradas_hombre_menos = COALESCE(portero_paradas_hombre_menos, 0),
  portero_acciones_asistencias = COALESCE(portero_acciones_asistencias, 0),
  portero_acciones_recuperacion = COALESCE(portero_acciones_recuperacion, 0),
  portero_acciones_exp_provocada = COALESCE(portero_acciones_exp_provocada, 0);
