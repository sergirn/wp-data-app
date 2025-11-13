-- =====================================================
-- WATER POLO STATS - COMPLETE DATABASE SCHEMA
-- =====================================================
-- Generated: 2025-01-16
-- Database: PostgreSQL (Supabase)
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- -----------------------------------------------------
-- Table: clubs
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE clubs IS 'Clubs de waterpolo';
COMMENT ON COLUMN clubs.name IS 'Nombre completo del club';
COMMENT ON COLUMN clubs.short_name IS 'Nombre corto o abreviatura';
COMMENT ON COLUMN clubs.logo_url IS 'URL del logo del club';

-- -----------------------------------------------------
-- Table: players
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  number INTEGER NOT NULL,
  position VARCHAR(100),
  is_goalkeeper BOOLEAN DEFAULT FALSE,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, number)
);

COMMENT ON TABLE players IS 'Jugadores de waterpolo';
COMMENT ON COLUMN players.name IS 'Nombre completo del jugador';
COMMENT ON COLUMN players.number IS 'Número de dorsal';
COMMENT ON COLUMN players.position IS 'Posición en el campo';
COMMENT ON COLUMN players.is_goalkeeper IS 'Indica si es portero';

-- -----------------------------------------------------
-- Table: matches
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  opponent VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  is_home BOOLEAN DEFAULT TRUE,
  season VARCHAR(50),
  jornada INTEGER,
  notes TEXT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE matches IS 'Partidos jugados';
COMMENT ON COLUMN matches.match_date IS 'Fecha del partido';
COMMENT ON COLUMN matches.opponent IS 'Equipo rival';
COMMENT ON COLUMN matches.location IS 'Ubicación del partido';
COMMENT ON COLUMN matches.home_score IS 'Goles del equipo local';
COMMENT ON COLUMN matches.away_score IS 'Goles del equipo visitante';
COMMENT ON COLUMN matches.is_home IS 'Indica si jugamos en casa';
COMMENT ON COLUMN matches.season IS 'Temporada (ej: 2024-2025)';
COMMENT ON COLUMN matches.jornada IS 'Número de jornada';

-- -----------------------------------------------------
-- Table: match_stats
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS match_stats (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  
  -- Goles (Jugadores de campo)
  goles_totales INTEGER DEFAULT 0,
  goles_boya_jugada INTEGER DEFAULT 0,
  goles_hombre_mas INTEGER DEFAULT 0,
  goles_lanzamiento INTEGER DEFAULT 0,
  goles_dir_mas_5m INTEGER DEFAULT 0,
  goles_contraataque INTEGER DEFAULT 0,
  goles_penalti_anotado INTEGER DEFAULT 0,
  
  -- Tiros (Jugadores de campo)
  tiros_totales INTEGER DEFAULT 0,
  tiros_hombre_mas INTEGER DEFAULT 0,
  tiros_penalti_fallado INTEGER DEFAULT 0,
  tiros_corner INTEGER DEFAULT 0,
  tiros_fuera INTEGER DEFAULT 0,
  tiros_parados INTEGER DEFAULT 0,
  tiros_bloqueado INTEGER DEFAULT 0,
  tiros_eficiencia INTEGER DEFAULT 0,
  
  -- Faltas (Jugadores de campo)
  faltas_exp_20_1c1 INTEGER DEFAULT 0,
  faltas_exp_20_boya INTEGER DEFAULT 0,
  faltas_penalti INTEGER DEFAULT 0,
  faltas_contrafaltas INTEGER DEFAULT 0,
  
  -- Acciones (Jugadores de campo)
  acciones_bloqueo INTEGER DEFAULT 0,
  acciones_asistencias INTEGER DEFAULT 0,
  acciones_recuperacion INTEGER DEFAULT 0,
  acciones_rebote INTEGER DEFAULT 0,
  acciones_exp_provocada INTEGER DEFAULT 0,
  acciones_penalti_provocado INTEGER DEFAULT 0,
  acciones_recibir_gol INTEGER DEFAULT 0,
  
  -- Goles encajados (Porteros)
  portero_goles_boya_parada INTEGER DEFAULT 0,
  portero_goles_hombre_menos INTEGER DEFAULT 0,
  portero_goles_dir_mas_5m INTEGER DEFAULT 0,
  portero_goles_contraataque INTEGER DEFAULT 0,
  portero_goles_penalti INTEGER DEFAULT 0,
  
  -- Paradas (Porteros)
  portero_paradas_totales INTEGER DEFAULT 0,
  portero_tiros_parada_recup INTEGER DEFAULT 0,
  portero_paradas_fuera INTEGER DEFAULT 0,
  portero_paradas_penalti_parado INTEGER DEFAULT 0,
  portero_paradas_hombre_menos INTEGER DEFAULT 0,
  
  -- Acciones (Porteros)
  portero_acciones_perdida_pos INTEGER DEFAULT 0,
  
  -- Legacy fields (mantener por compatibilidad)
  goles_boya_cada INTEGER DEFAULT 0,
  goles_penalti_juego INTEGER DEFAULT 0,
  goles_penalti_fallo INTEGER DEFAULT 0,
  goles_corner INTEGER DEFAULT 0,
  goles_fuera INTEGER DEFAULT 0,
  goles_parados INTEGER DEFAULT 0,
  goles_bloqueado INTEGER DEFAULT 0,
  goles_eficiencia INTEGER DEFAULT 0,
  tiros_boya_cada INTEGER DEFAULT 0,
  tiros_lanzamiento INTEGER DEFAULT 0,
  tiros_dir_mas_5m INTEGER DEFAULT 0,
  tiros_contraataque INTEGER DEFAULT 0,
  tiros_penalti_juego INTEGER DEFAULT 0,
  faltas_exp_3_int INTEGER DEFAULT 0,
  faltas_exp_3_bruta INTEGER DEFAULT 0,
  acciones_perdida_poco INTEGER DEFAULT 0,
  portero_goles_lanzamiento INTEGER DEFAULT 0,
  portero_goles_penalti_encajado INTEGER DEFAULT 0,
  portero_tiros_parado INTEGER DEFAULT 0,
  portero_faltas_exp_3_int INTEGER DEFAULT 0,
  portero_acciones_rebote INTEGER DEFAULT 0,
  portero_acciones_gol_recibido INTEGER DEFAULT 0,
  portero_paradas_pedida INTEGER DEFAULT 0,
  portero_exp_provocada INTEGER DEFAULT 0,
  portero_penalti_provocado INTEGER DEFAULT 0,
  portero_recibir_gol INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

COMMENT ON TABLE match_stats IS 'Estadísticas de jugadores por partido';
COMMENT ON COLUMN match_stats.goles_totales IS 'Total de goles anotados (calculado)';
COMMENT ON COLUMN match_stats.tiros_totales IS 'Total de tiros (goles + tiros fallados)';
COMMENT ON COLUMN match_stats.tiros_eficiencia IS 'Eficiencia de tiro en porcentaje';
COMMENT ON COLUMN match_stats.portero_paradas_totales IS 'Total de paradas del portero';

-- -----------------------------------------------------
-- Table: profiles
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'viewer',
  club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Perfiles de usuario';
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: admin, coach, viewer';
COMMENT ON COLUMN profiles.club_id IS 'Club al que pertenece el usuario';

-- -----------------------------------------------------
-- Table: audit_logs
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Registro de auditoría de cambios';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de acción: INSERT, UPDATE, DELETE';
COMMENT ON COLUMN audit_logs.table_name IS 'Tabla afectada';
COMMENT ON COLUMN audit_logs.record_id IS 'ID del registro afectado';

-- =====================================================
-- INDEXES
-- =====================================================

-- Clubs
CREATE INDEX idx_clubs_name ON clubs(name);

-- Players
CREATE INDEX idx_players_club_id ON players(club_id);
CREATE INDEX idx_players_number ON players(number);
CREATE INDEX idx_players_is_goalkeeper ON players(is_goalkeeper);

-- Matches
CREATE INDEX idx_matches_club_id ON matches(club_id);
CREATE INDEX idx_matches_date ON matches(match_date DESC);
CREATE INDEX idx_matches_season ON matches(season);
CREATE INDEX idx_matches_jornada ON matches(jornada);

-- Match Stats
CREATE INDEX idx_match_stats_match_id ON match_stats(match_id);
CREATE INDEX idx_match_stats_player_id ON match_stats(player_id);
CREATE INDEX idx_match_stats_goles ON match_stats(goles_totales DESC);
CREATE INDEX idx_match_stats_asistencias ON match_stats(acciones_asistencias DESC);

-- Profiles
CREATE INDEX idx_profiles_club_id ON profiles(club_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_stats_updated_at
  BEFORE UPDATE ON match_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - CLUBS
-- =====================================================

-- Anyone can view clubs
CREATE POLICY "Clubs are viewable by everyone"
  ON clubs FOR SELECT
  USING (true);

-- Only admins can insert clubs
CREATE POLICY "Only admins can insert clubs"
  ON clubs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update clubs
CREATE POLICY "Only admins can update clubs"
  ON clubs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete clubs
CREATE POLICY "Only admins can delete clubs"
  ON clubs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - PLAYERS
-- =====================================================

-- Authenticated users can view players
CREATE POLICY "Players are viewable by authenticated users"
  ON players FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins and coaches can insert players for their club
CREATE POLICY "Admins and coaches can insert players"
  ON players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND (profiles.role = 'admin' OR profiles.club_id = players.club_id)
    )
  );

-- Admins and coaches can update players from their club
CREATE POLICY "Admins and coaches can update players"
  ON players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND (profiles.role = 'admin' OR profiles.club_id = players.club_id)
    )
  );

-- Admins and coaches can delete players from their club
CREATE POLICY "Admins and coaches can delete players"
  ON players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND (profiles.role = 'admin' OR profiles.club_id = players.club_id)
    )
  );

-- =====================================================
-- RLS POLICIES - MATCHES
-- =====================================================

-- Authenticated users can view matches
CREATE POLICY "Matches are viewable by authenticated users"
  ON matches FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins and coaches can insert matches for their club
CREATE POLICY "Admins and coaches can insert matches"
  ON matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND (profiles.role = 'admin' OR profiles.club_id = matches.club_id)
    )
  );

-- Admins and coaches can update matches from their club
CREATE POLICY "Admins and coaches can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND (profiles.role = 'admin' OR profiles.club_id = matches.club_id)
    )
  );

-- Admins and coaches can delete matches from their club
CREATE POLICY "Admins and coaches can delete matches"
  ON matches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND (profiles.role = 'admin' OR profiles.club_id = matches.club_id)
    )
  );

-- =====================================================
-- RLS POLICIES - MATCH_STATS
-- =====================================================

-- Authenticated users can view match stats
CREATE POLICY "Match stats are viewable by authenticated users"
  ON match_stats FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins and coaches can insert match stats
CREATE POLICY "Admins and coaches can insert match stats"
  ON match_stats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN matches ON matches.club_id = profiles.club_id
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND matches.id = match_stats.match_id
    )
  );

-- Admins and coaches can update match stats
CREATE POLICY "Admins and coaches can update match stats"
  ON match_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN matches ON matches.club_id = profiles.club_id
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND matches.id = match_stats.match_id
    )
  );

-- Admins and coaches can delete match stats
CREATE POLICY "Admins and coaches can delete match stats"
  ON match_stats FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN matches ON matches.club_id = profiles.club_id
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach')
      AND matches.id = match_stats.match_id
    )
  );

-- =====================================================
-- RLS POLICIES - PROFILES
-- =====================================================

-- Users can view their own profile and admins can view all
CREATE POLICY "Users can view own profile, admins can view all"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can update their own profile, admins can update all
CREATE POLICY "Users can update own profile, admins can update all"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Profiles are created automatically via trigger
CREATE POLICY "Profiles are created automatically"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - AUDIT_LOGS
-- =====================================================

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample clubs
INSERT INTO clubs (name, short_name, logo_url) VALUES
  ('Club Natació Sant Andreu', 'CN Sant Andreu', '/logos/cn-sant-andreu.png'),
  ('Club Esportiu Mediterrani', 'CE Mediterrani', '/logos/ce-mediterrani.webp'),
  ('Club Natació Barcelona', 'CN Barcelona', '/logos/cn-barcelona.png')
ON CONFLICT DO NOTHING;

-- =====================================================
-- NOTES
-- =====================================================

/*
IMPORTANT NOTES:

1. AUTHENTICATION:
   - Uses Supabase Auth
   - Profiles are auto-created via trigger on user signup
   - Roles: admin, coach, viewer

2. STATISTICS CALCULATIONS:
   - goles_totales: Auto-calculated in frontend (sum of all goal types)
   - tiros_totales: Auto-calculated (goles_totales + missed shots)
   - tiros_eficiencia: (goles_totales / tiros_totales) * 100
   - portero_paradas_totales: Auto-calculated (sum of all save types)
   - Goalkeeper efficiency: (paradas / (paradas + goals conceded)) * 100
   - Man advantage efficiency: (goals / (goals + misses)) * 100

3. ROW LEVEL SECURITY:
   - All tables have RLS enabled
   - Admins have full access
   - Coaches can only manage their club's data
   - Viewers can only read data

4. AUDIT TRAIL:
   - audit_logs table tracks all important operations
   - Includes old and new data for updates

5. DATA INTEGRITY:
   - Foreign keys ensure referential integrity
   - Unique constraints prevent duplicates
   - Cascading deletes maintain consistency

6. PERFORMANCE:
   - Indexes on frequently queried columns
   - Optimized for read-heavy workloads
   - Efficient joins via proper indexing

7. MAINTENANCE:
   - updated_at timestamps auto-update
   - created_at timestamps set on insert
   - Triggers handle automatic operations

For more information, see API_ENDPOINTS_DOCUMENTATION.md
*/
