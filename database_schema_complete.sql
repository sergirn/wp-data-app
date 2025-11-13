-- =====================================================
-- WATER POLO STATS - COMPLETE DATABASE SCHEMA
-- =====================================================
-- This file contains the complete database schema including:
-- - All tables with columns and constraints
-- - All indexes for performance optimization
-- - Row Level Security (RLS) policies
-- - Functions and triggers
-- - Sample data for three clubs
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- -----------------------------------------------------
-- Table: clubs
-- Stores information about water polo clubs
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS clubs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#1E40AF',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Table: profiles
-- Extends Supabase auth.users with application-specific data
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'coach', 'viewer')),
    club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Table: players
-- Stores player information
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    is_goalkeeper BOOLEAN DEFAULT FALSE,
    club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(club_id, number)
);

-- -----------------------------------------------------
-- Table: matches
-- Stores match information
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    match_date DATE NOT NULL,
    opponent TEXT NOT NULL,
    location TEXT,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    is_home BOOLEAN DEFAULT TRUE,
    season TEXT,
    jornada INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Table: match_stats
-- Stores detailed statistics for each player in each match
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS match_stats (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    -- Goals (Field Players)
    goles_totales INTEGER DEFAULT 0,
    goles_boya_jugada INTEGER DEFAULT 0,
    goles_hombre_mas INTEGER DEFAULT 0,
    goles_lanzamiento INTEGER DEFAULT 0,
    goles_dir_mas_5m INTEGER DEFAULT 0,
    goles_contraataque INTEGER DEFAULT 0,
    goles_penalti_anotado INTEGER DEFAULT 0,
    
    -- Legacy goal fields
    goles_boya_cada INTEGER DEFAULT 0,
    goles_penalti_juego INTEGER DEFAULT 0,
    goles_penalti_fallo INTEGER DEFAULT 0,
    goles_corner INTEGER DEFAULT 0,
    goles_fuera INTEGER DEFAULT 0,
    goles_parados INTEGER DEFAULT 0,
    goles_bloqueado INTEGER DEFAULT 0,
    goles_eficiencia NUMERIC(5,2) DEFAULT 0,
    
    -- Shots (Field Players)
    tiros_totales INTEGER DEFAULT 0,
    tiros_hombre_mas INTEGER DEFAULT 0, -- Man advantage missed shots
    tiros_penalti_fallado INTEGER DEFAULT 0,
    tiros_corner INTEGER DEFAULT 0,
    tiros_fuera INTEGER DEFAULT 0,
    tiros_parados INTEGER DEFAULT 0,
    tiros_bloqueado INTEGER DEFAULT 0,
    tiros_eficiencia NUMERIC(5,2) DEFAULT 0,
    
    -- Legacy shot fields
    tiros_boya_cada INTEGER DEFAULT 0,
    tiros_lanzamiento INTEGER DEFAULT 0,
    tiros_dir_mas_5m INTEGER DEFAULT 0,
    tiros_contraataque INTEGER DEFAULT 0,
    tiros_penalti_juego INTEGER DEFAULT 0,
    tiros_penalti_fallo INTEGER DEFAULT 0,
    
    -- Fouls
    faltas_exp_20_1c1 INTEGER DEFAULT 0,
    faltas_exp_20_boya INTEGER DEFAULT 0,
    faltas_penalti INTEGER DEFAULT 0,
    faltas_contrafaltas INTEGER DEFAULT 0,
    faltas_exp_3_int INTEGER DEFAULT 0,
    faltas_exp_3_bruta INTEGER DEFAULT 0,
    
    -- Actions (Field Players)
    acciones_bloqueo INTEGER DEFAULT 0,
    acciones_asistencias INTEGER DEFAULT 0,
    acciones_recuperacion INTEGER DEFAULT 0,
    acciones_rebote INTEGER DEFAULT 0,
    acciones_exp_provocada INTEGER DEFAULT 0,
    acciones_penalti_provocado INTEGER DEFAULT 0,
    acciones_recibir_gol INTEGER DEFAULT 0,
    acciones_perdida_poco INTEGER DEFAULT 0,
    
    -- Goalkeeper - Goals Conceded
    portero_goles_totales INTEGER DEFAULT 0,
    portero_goles_boya INTEGER DEFAULT 0,
    portero_goles_boya_parada INTEGER DEFAULT 0,
    portero_goles_hombre_menos INTEGER DEFAULT 0,
    portero_goles_lanzamiento INTEGER DEFAULT 0,
    portero_goles_dir_mas_5m INTEGER DEFAULT 0,
    portero_goles_contraataque INTEGER DEFAULT 0,
    portero_goles_penalti INTEGER DEFAULT 0,
    portero_goles_penalti_encajado INTEGER DEFAULT 0,
    
    -- Goalkeeper - Saves
    portero_paradas_totales INTEGER DEFAULT 0,
    portero_tiros_parado INTEGER DEFAULT 0,
    portero_tiros_parada_recup INTEGER DEFAULT 0,
    portero_paradas_fuera INTEGER DEFAULT 0,
    portero_paradas_penalti_parado INTEGER DEFAULT 0,
    portero_paradas_hombre_menos INTEGER DEFAULT 0, -- Man down saves
    portero_paradas_parada_recup INTEGER DEFAULT 0,
    portero_paradas_pedida INTEGER DEFAULT 0,
    
    -- Goalkeeper - Actions
    portero_acciones_asistencias INTEGER DEFAULT 0,
    portero_acciones_recuperacion INTEGER DEFAULT 0,
    portero_acciones_rebote INTEGER DEFAULT 0,
    portero_acciones_perdida_pos INTEGER DEFAULT 0,
    portero_acciones_exp_provocada INTEGER DEFAULT 0,
    portero_acciones_gol_recibido INTEGER DEFAULT 0,
    portero_faltas_exp_3_int INTEGER DEFAULT 0,
    portero_exp_provocada INTEGER DEFAULT 0,
    portero_penalti_provocado INTEGER DEFAULT 0,
    portero_recibir_gol INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

-- -----------------------------------------------------
-- Table: audit_logs
-- Tracks changes to important tables
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON profiles(club_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Players indexes
CREATE INDEX IF NOT EXISTS idx_players_club_id ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_is_goalkeeper ON players(is_goalkeeper);
CREATE INDEX IF NOT EXISTS idx_players_number ON players(number);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON matches(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_jornada ON matches(jornada);

-- Match stats indexes
CREATE INDEX IF NOT EXISTS idx_match_stats_match_id ON match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_player_id ON match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_goles ON match_stats(goles_totales DESC);
CREATE INDEX IF NOT EXISTS idx_match_stats_paradas ON match_stats(portero_paradas_totales DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- RLS Policies: clubs
-- -----------------------------------------------------

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

-- -----------------------------------------------------
-- RLS Policies: profiles
-- -----------------------------------------------------

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Only admins can insert profiles
CREATE POLICY "Only admins can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- -----------------------------------------------------
-- RLS Policies: players
-- -----------------------------------------------------

-- Anyone can view players
CREATE POLICY "Players are viewable by everyone"
    ON players FOR SELECT
    USING (true);

-- Admins and coaches can insert players for their club
CREATE POLICY "Admins and coaches can insert players"
    ON players FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coach')
            AND (profiles.club_id = players.club_id OR profiles.role = 'admin')
        )
    );

-- Admins and coaches can update players for their club
CREATE POLICY "Admins and coaches can update players"
    ON players FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coach')
            AND (profiles.club_id = players.club_id OR profiles.role = 'admin')
        )
    );

-- Admins and coaches can delete players for their club
CREATE POLICY "Admins and coaches can delete players"
    ON players FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coach')
            AND (profiles.club_id = players.club_id OR profiles.role = 'admin')
        )
    );

-- -----------------------------------------------------
-- RLS Policies: matches
-- -----------------------------------------------------

-- Anyone can view matches
CREATE POLICY "Matches are viewable by everyone"
    ON matches FOR SELECT
    USING (true);

-- Admins and coaches can insert matches for their club
CREATE POLICY "Admins and coaches can insert matches"
    ON matches FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coach')
            AND (profiles.club_id = matches.club_id OR profiles.role = 'admin')
        )
    );

-- Admins and coaches can update matches for their club
CREATE POLICY "Admins and coaches can update matches"
    ON matches FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coach')
            AND (profiles.club_id = matches.club_id OR profiles.role = 'admin')
        )
    );

-- Admins and coaches can delete matches for their club
CREATE POLICY "Admins and coaches can delete matches"
    ON matches FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coach')
            AND (
                profiles.club_id = matches.club_id 
                OR profiles.role = 'admin'
            )
        )
    );

-- -----------------------------------------------------
-- RLS Policies: match_stats
-- -----------------------------------------------------

-- Anyone can view match stats
CREATE POLICY "Match stats are viewable by everyone"
    ON match_stats FOR SELECT
    USING (true);

-- Admins and coaches can insert match stats for their club
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
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins and coaches can update match stats for their club
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
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins and coaches can delete match stats for their club
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
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- -----------------------------------------------------
-- RLS Policies: audit_logs
-- -----------------------------------------------------

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

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- -----------------------------------------------------
-- Function: handle_new_user
-- Automatically creates a profile when a new user signs up
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------
-- Function: update_updated_at_column
-- Updates the updated_at timestamp
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: update_clubs_updated_at
DROP TRIGGER IF EXISTS update_clubs_updated_at ON clubs;
CREATE TRIGGER update_clubs_updated_at
    BEFORE UPDATE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_profiles_updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample clubs
INSERT INTO clubs (name, short_name, logo_url, primary_color, secondary_color) VALUES
('CN Sant Andreu', 'CN Sant Andreu', '/logos/cn-sant-andreu.png', '#003366', '#6699CC'),
('CE Mediterrani', 'CE Mediterrani', '/logos/ce-mediterrani.webp', '#FF6600', '#00CC66'),
('CN Barcelona', 'CN Barcelona', '/logos/cn-barcelona.png', '#FF0000', '#FFFF00')
ON CONFLICT DO NOTHING;

-- =====================================================
-- NOTES
-- =====================================================

/*
IMPORTANT FIELD NOTES:

1. Man Advantage (Hombre +):
   - goles_hombre_mas: Goals scored in man advantage
   - tiros_hombre_mas: Missed shots in man advantage
   - Efficiency = (goles_hombre_mas / (goles_hombre_mas + tiros_hombre_mas)) * 100

2. Goalkeeper Goals Conceded:
   - All portero_goles_* fields represent goals conceded by the team
   - These automatically sum to the away_score in the match
   - portero_goles_boya_parada: Center shot goals conceded
   - portero_goles_hombre_menos: Goals conceded when playing man down
   - portero_goles_dir_mas_5m: Direct +5m goals conceded
   - portero_goles_contraataque: Counterattack goals conceded
   - portero_goles_penalti: Penalty goals conceded

3. Goalkeeper Saves:
   - portero_paradas_totales: Total saves (auto-calculated)
   - portero_tiros_parada_recup: Saves with recovery
   - portero_paradas_fuera: Saves out
   - portero_paradas_penalti_parado: Penalty saves
   - portero_paradas_hombre_menos: Saves when playing man down

4. Auto-calculated Fields:
   - goles_totales: Sum of all goal types
   - tiros_totales: Sum of goals + missed shots
   - tiros_eficiencia: (goles_totales / tiros_totales) * 100
   - portero_paradas_totales: Sum of all save types

5. Match Scores:
   - home_score: Automatically calculated from field players' goals
   - away_score: Automatically calculated from goalkeeper's goals conceded
*/
