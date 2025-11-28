-- Añadir nuevos campos para acciones del portero
-- Estas columnas almacenan goles y fallos del rival en superioridad numérica

ALTER TABLE match_stats
ADD COLUMN IF NOT EXISTS portero_gol integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_gol_superioridad integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS portero_fallo_superioridad integer DEFAULT 0;

COMMENT ON COLUMN match_stats.portero_gol IS 'Goles normales recibidos por el portero';
COMMENT ON COLUMN match_stats.portero_gol_superioridad IS 'Goles recibidos en superioridad numérica del rival';
COMMENT ON COLUMN match_stats.portero_fallo_superioridad IS 'Fallos del rival en superioridad numérica';
