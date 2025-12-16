-- Add new goalkeeper inferiority detail fields to match_stats table
ALTER TABLE match_stats
  ADD COLUMN IF NOT EXISTS portero_inferioridad_fuera integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portero_inferioridad_bloqueo integer DEFAULT 0;

COMMENT ON COLUMN match_stats.portero_inferioridad_fuera IS 'Goalkeeper: Shots that went out during man-down situations';
COMMENT ON COLUMN match_stats.portero_inferioridad_bloqueo IS 'Goalkeeper: Blocked shots during man-down situations';
