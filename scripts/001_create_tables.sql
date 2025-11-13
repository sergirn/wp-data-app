-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_goalkeeper BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  opponent TEXT NOT NULL,
  location TEXT,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  is_home BOOLEAN DEFAULT TRUE,
  season TEXT,
  jornada INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_stats table for player statistics per match
CREATE TABLE IF NOT EXISTS match_stats (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  
  -- GOLES (Goals)
  goles_totales INTEGER DEFAULT 0,
  goles_boya_cada INTEGER DEFAULT 0,
  goles_hombre_mas INTEGER DEFAULT 0,
  goles_lanzamiento INTEGER DEFAULT 0,
  goles_dir_mas_5m INTEGER DEFAULT 0,
  goles_contraataque INTEGER DEFAULT 0,
  goles_penalti_juego INTEGER DEFAULT 0,
  goles_penalti_fallo INTEGER DEFAULT 0,
  goles_corner INTEGER DEFAULT 0,
  goles_fuera INTEGER DEFAULT 0,
  goles_parados INTEGER DEFAULT 0,
  goles_bloqueado INTEGER DEFAULT 0,
  goles_eficiencia DECIMAL(5,2) DEFAULT 0,
  
  -- TIROS (Shots)
  tiros_totales INTEGER DEFAULT 0,
  tiros_boya_cada INTEGER DEFAULT 0,
  tiros_hombre_mas INTEGER DEFAULT 0,
  tiros_lanzamiento INTEGER DEFAULT 0,
  tiros_dir_mas_5m INTEGER DEFAULT 0,
  tiros_contraataque INTEGER DEFAULT 0,
  tiros_penalti_juego INTEGER DEFAULT 0,
  tiros_penalti_fallo INTEGER DEFAULT 0,
  tiros_corner INTEGER DEFAULT 0,
  tiros_fuera INTEGER DEFAULT 0,
  tiros_parados INTEGER DEFAULT 0,
  tiros_bloqueado INTEGER DEFAULT 0,
  tiros_eficiencia DECIMAL(5,2) DEFAULT 0,
  
  -- FALTAS (Fouls)
  faltas_exp_3_int INTEGER DEFAULT 0,
  faltas_exp_3_bruta INTEGER DEFAULT 0,
  faltas_penalti INTEGER DEFAULT 0,
  faltas_contrafaltas INTEGER DEFAULT 0,
  
  -- ACCIONES (Actions)
  acciones_bloqueo INTEGER DEFAULT 0,
  acciones_asistencias INTEGER DEFAULT 0,
  acciones_recuperacion INTEGER DEFAULT 0,
  acciones_rebote INTEGER DEFAULT 0,
  acciones_perdida_poco INTEGER DEFAULT 0,
  acciones_exp_provocada INTEGER DEFAULT 0,
  acciones_penalti_provocado INTEGER DEFAULT 0,
  acciones_recibir_gol INTEGER DEFAULT 0,
  
  -- Added goalkeeper specific stats fields
  -- Goalkeeper goals conceded
  portero_goles_boya_parada INTEGER DEFAULT 0,
  portero_goles_lanzamiento INTEGER DEFAULT 0,
  portero_goles_dir_mas_5m INTEGER DEFAULT 0,
  portero_goles_penalti_encajado INTEGER DEFAULT 0,
  
  -- Goalkeeper saves
  portero_paradas_totales INTEGER DEFAULT 0,
  portero_tiros_parado INTEGER DEFAULT 0,
  portero_tiros_parada_recup INTEGER DEFAULT 0,
  portero_paradas_penalti_parado INTEGER DEFAULT 0,
  
  -- Goalkeeper fouls
  portero_faltas_exp_3_int INTEGER DEFAULT 0,
  
  -- Goalkeeper actions
  portero_acciones_rebote INTEGER DEFAULT 0,
  portero_acciones_perdida_pos INTEGER DEFAULT 0,
  portero_acciones_gol_recibido INTEGER DEFAULT 0,
  
  -- Legacy goalkeeper fields
  portero_paradas_pedida INTEGER DEFAULT 0,
  portero_exp_provocada INTEGER DEFAULT 0,
  portero_penalti_provocado INTEGER DEFAULT 0,
  portero_recibir_gol INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read access on players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on players" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete on players" ON players FOR DELETE USING (true);

CREATE POLICY "Allow authenticated read access on matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on matches" ON matches FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete on matches" ON matches FOR DELETE USING (true);

CREATE POLICY "Allow authenticated read access on match_stats" ON match_stats FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on match_stats" ON match_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on match_stats" ON match_stats FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete on match_stats" ON match_stats FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_match_stats_match_id ON match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_player_id ON match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
