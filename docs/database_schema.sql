-- ============================================
-- WaterpoloStats Database Schema
-- PostgreSQL / Supabase
-- ============================================
-- This file contains the complete database schema
-- for the WaterpoloStats application
-- ============================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS match_stats CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;

-- ============================================
-- CLUBS TABLE
-- ============================================
-- Stores information about water polo clubs
CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    short_name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0066cc',
    secondary_color TEXT DEFAULT '#ff6600',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clubs table
CREATE INDEX idx_clubs_name ON clubs(name);
CREATE INDEX idx_clubs_short_name ON clubs(short_name);

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores user profiles and authentication info
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'coach', 'viewer')) DEFAULT 'viewer',
    is_super_admin BOOLEAN DEFAULT FALSE,
    club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles table
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_club_id ON profiles(club_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- PLAYERS TABLE
-- ============================================
-- Stores player information for each club
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    is_goalkeeper BOOLEAN DEFAULT FALSE,
    club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_player_number_per_club UNIQUE (club_id, number)
);

-- Indexes for players table
CREATE INDEX idx_players_club_id ON players(club_id);
CREATE INDEX idx_players_number ON players(number);
CREATE INDEX idx_players_is_goalkeeper ON players(is_goalkeeper);

-- ============================================
-- MATCHES TABLE
-- ============================================
-- Stores match information
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    match_date DATE NOT NULL,
    opponent TEXT NOT NULL,
    location TEXT,
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    is_home BOOLEAN DEFAULT TRUE,
    season TEXT,
    jornada INTEGER,
    notes TEXT,
    club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for matches table
CREATE INDEX idx_matches_club_id ON matches(club_id);
CREATE INDEX idx_matches_match_date ON matches(match_date);
CREATE INDEX idx_matches_season ON matches(season);
CREATE INDEX idx_matches_opponent ON matches(opponent);

-- ============================================
-- MATCH_STATS TABLE
-- ============================================
-- Stores detailed player statistics for each match
CREATE TABLE match_stats (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    -- Goals (Goles)
    goles_totales INTEGER DEFAULT 0,
    goles_boya_jugada INTEGER DEFAULT 0,
    goles_boya_cada INTEGER DEFAULT 0,
    goles_hombre_mas INTEGER DEFAULT 0,
    goles_lanzamiento INTEGER DEFAULT 0,
    goles_dir_mas_5m INTEGER DEFAULT 0,
    goles_contraataque INTEGER DEFAULT 0,
    goles_penalti_anotado INTEGER DEFAULT 0,
    goles_penalti_juego INTEGER DEFAULT 0,
    goles_penalti_fallo INTEGER DEFAULT 0,
    goles_corner INTEGER DEFAULT 0,
    goles_fuera INTEGER DEFAULT 0,
    goles_parados INTEGER DEFAULT 0,
    goles_bloqueado INTEGER DEFAULT 0,
    goles_eficiencia NUMERIC(5,2) DEFAULT 0,
    
    -- Shots (Tiros)
    tiros_totales INTEGER DEFAULT 0,
    tiros_boya_cada INTEGER DEFAULT 0,
    tiros_hombre_mas INTEGER DEFAULT 0,
    tiros_lanzamiento INTEGER DEFAULT 0,
    tiros_dir_mas_5m INTEGER DEFAULT 0,
    tiros_contraataque INTEGER DEFAULT 0,
    tiros_penalti_juego INTEGER DEFAULT 0,
    tiros_penalti_fallado INTEGER DEFAULT 0,
    tiros_corner INTEGER DEFAULT 0,
    tiros_fuera INTEGER DEFAULT 0,
    tiros_parados INTEGER DEFAULT 0,
    tiros_bloqueado INTEGER DEFAULT 0,
    tiros_eficiencia NUMERIC(5,2) DEFAULT 0,
    
    -- Fouls (Faltas)
    faltas_exp_3_int INTEGER DEFAULT 0,
    faltas_exp_3_bruta INTEGER DEFAULT 0,
    faltas_exp_20_1c1 INTEGER DEFAULT 0,
    faltas_exp_20_boya INTEGER DEFAULT 0,
    faltas_penalti INTEGER DEFAULT 0,
    faltas_contrafaltas INTEGER DEFAULT 0,
    
    -- Actions (Acciones)
    acciones_bloqueo INTEGER DEFAULT 0,
    acciones_asistencias INTEGER DEFAULT 0,
    acciones_recuperacion INTEGER DEFAULT 0,
    acciones_rebote INTEGER DEFAULT 0,
    acciones_perdida_poco INTEGER DEFAULT 0,
    acciones_exp_provocada INTEGER DEFAULT 0,
    acciones_penalti_provocado INTEGER DEFAULT 0,
    acciones_penalti_provocado_new INTEGER DEFAULT 0,
    acciones_recibir_gol INTEGER DEFAULT 0,
    
    -- Goalkeeper Goals (Goles del Portero - Goals Conceded)
    portero_goles_totales INTEGER DEFAULT 0,
    portero_goles_boya INTEGER DEFAULT 0,
    portero_goles_boya_parada INTEGER DEFAULT 0,
    portero_goles_hombre_menos INTEGER DEFAULT 0,
    portero_goles_lanzamiento INTEGER DEFAULT 0,
    portero_goles_dir_mas_5m INTEGER DEFAULT 0,
    portero_goles_contraataque INTEGER DEFAULT 0,
    portero_goles_penalti INTEGER DEFAULT 0,
    portero_goles_penalti_encajado INTEGER DEFAULT 0,
    
    -- Goalkeeper Saves (Paradas del Portero)
    portero_paradas_totales INTEGER DEFAULT 0,
    portero_tiros_parado INTEGER DEFAULT 0,
    portero_tiros_parada_recup INTEGER DEFAULT 0,
    portero_paradas_fuera INTEGER DEFAULT 0,
    portero_paradas_parada_fuera INTEGER DEFAULT 0,
    portero_paradas_penalti_parado INTEGER DEFAULT 0,
    portero_paradas_hombre_menos INTEGER DEFAULT 0,
    portero_paradas_pedida INTEGER DEFAULT 0,
    
    -- Goalkeeper Fouls
    portero_faltas_exp_3_int INTEGER DEFAULT 0,
    
    -- Goalkeeper Actions
    portero_acciones_asistencias INTEGER DEFAULT 0,
    portero_acciones_recuperacion INTEGER DEFAULT 0,
    portero_acciones_rebote INTEGER DEFAULT 0,
    portero_acciones_perdida_pos INTEGER DEFAULT 0,
    portero_acciones_gol_recibido INTEGER DEFAULT 0,
    portero_acciones_exp_provocada INTEGER DEFAULT 0,
    portero_exp_provocada INTEGER DEFAULT 0,
    portero_penalti_provocado INTEGER DEFAULT 0,
    portero_recibir_gol INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_match_player UNIQUE (match_id, player_id)
);

-- Indexes for match_stats table
CREATE INDEX idx_match_stats_match_id ON match_stats(match_id);
CREATE INDEX idx_match_stats_player_id ON match_stats(player_id);
CREATE INDEX idx_match_stats_goles_totales ON match_stats(goles_totales);

-- ============================================
-- AUDIT_LOGS TABLE
-- ============================================
-- Stores audit trail for important operations
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    record_id INTEGER,
    action TEXT CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs table
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLUBS RLS POLICIES
-- ============================================
-- Users can view their own club
CREATE POLICY "Users can view their club"
    ON clubs FOR SELECT
    USING (
        id IN (
            SELECT club_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Super admins can view all clubs
CREATE POLICY "Super admins can view all clubs"
    ON clubs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Super admins can insert clubs
CREATE POLICY "Super admins can insert clubs"
    ON clubs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Super admins can update clubs
CREATE POLICY "Super admins can update clubs"
    ON clubs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Super admins can delete clubs
CREATE POLICY "Super admins can delete clubs"
    ON clubs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- ============================================
-- PROFILES RLS POLICIES
-- ============================================
-- All authenticated users can view profiles
CREATE POLICY "profiles_select_all"
    ON profiles FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- Super admins can update any profile
CREATE POLICY "profiles_update_super_admin"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Admins can insert profiles
CREATE POLICY "profiles_insert_admin"
    ON profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete profiles
CREATE POLICY "profiles_delete_admin"
    ON profiles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- PLAYERS RLS POLICIES
-- ============================================
-- Users can view players from their club
CREATE POLICY "Users can view their club's players"
    ON players FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Super admins can view all players
CREATE POLICY "Super admins can view all players"
    ON players FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Admins and coaches can insert players for their club
CREATE POLICY "Admins can insert players for their club"
    ON players FOR INSERT
    WITH CHECK (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'coach')
        )
    );

-- Admins and coaches can update players for their club
CREATE POLICY "Admins can update players for their club"
    ON players FOR UPDATE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'coach')
        )
    );

-- Admins can delete players for their club
CREATE POLICY "Admins can delete players for their club"
    ON players FOR DELETE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================
-- MATCHES RLS POLICIES
-- ============================================
-- Users can view their club's matches
CREATE POLICY "Users can view their club's matches"
    ON matches FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Super admins can view all matches
CREATE POLICY "Super admins can view all matches"
    ON matches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Admins and coaches can insert matches for their club
CREATE POLICY "Admins can insert matches for their club"
    ON matches FOR INSERT
    WITH CHECK (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'coach')
        )
    );

-- Admins and coaches can update matches for their club
CREATE POLICY "Admins can update matches for their club"
    ON matches FOR UPDATE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'coach')
        )
    );

-- Admins can delete matches for their club
CREATE POLICY "Admins can delete matches for their club"
    ON matches FOR DELETE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================
-- MATCH_STATS RLS POLICIES
-- ============================================
-- Users can view match stats for their club's matches
CREATE POLICY "Users can view match stats for their club's matches"
    ON match_stats FOR SELECT
    USING (
        match_id IN (
            SELECT id FROM matches 
            WHERE club_id IN (
                SELECT club_id FROM profiles WHERE id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- Admins and coaches can insert match stats
CREATE POLICY "Admins can insert match stats"
    ON match_stats FOR INSERT
    WITH CHECK (
        match_id IN (
            SELECT id FROM matches 
            WHERE club_id IN (
                SELECT club_id FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'coach')
            )
        )
    );

-- Admins and coaches can update match stats
CREATE POLICY "Admins can update match stats"
    ON match_stats FOR UPDATE
    USING (
        match_id IN (
            SELECT id FROM matches 
            WHERE club_id IN (
                SELECT club_id FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'coach')
            )
        )
    );

-- Admins can delete match stats
CREATE POLICY "Admins can delete match stats"
    ON match_stats FOR DELETE
    USING (
        match_id IN (
            SELECT id FROM matches 
            WHERE club_id IN (
                SELECT club_id FROM profiles 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        )
    );

-- ============================================
-- AUDIT_LOGS RLS POLICIES
-- ============================================
-- System can insert audit logs
CREATE POLICY "audit_logs_insert_system"
    ON audit_logs FOR INSERT
    WITH CHECK (TRUE);

-- Admins and coaches can view audit logs
CREATE POLICY "audit_logs_select_admin_coach"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'coach')
        )
    );

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clubs_updated_at
    BEFORE UPDATE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Example Clubs)
-- ============================================

-- Insert example clubs
INSERT INTO clubs (name, short_name, logo_url, primary_color, secondary_color) VALUES
('Club Natació Barcelona', 'CN Barceloneta', '/images/barceloneta-logo.png', '#0033A0', '#FFD700'),
('Club Natació Atlètic-Barceloneta', 'CNAB', '/images/barceloneta-logo.png', '#0033A0', '#FFD700')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View: Player season statistics
CREATE OR REPLACE VIEW player_season_stats AS
SELECT 
    p.id AS player_id,
    p.name AS player_name,
    p.number,
    p.is_goalkeeper,
    p.club_id,
    c.name AS club_name,
    m.season,
    COUNT(DISTINCT ms.match_id) AS matches_played,
    SUM(ms.goles_totales) AS total_goals,
    SUM(ms.acciones_asistencias) AS total_assists,
    AVG(ms.goles_totales) AS avg_goals_per_match,
    SUM(ms.tiros_totales) AS total_shots,
    CASE 
        WHEN SUM(ms.tiros_totales) > 0 
        THEN ROUND((SUM(ms.goles_totales)::NUMERIC / SUM(ms.tiros_totales)::NUMERIC) * 100, 2)
        ELSE 0 
    END AS shooting_efficiency,
    SUM(ms.portero_paradas_totales) AS total_saves,
    SUM(ms.portero_goles_totales) AS total_goals_conceded
FROM players p
JOIN clubs c ON p.club_id = c.id
JOIN match_stats ms ON p.id = ms.player_id
JOIN matches m ON ms.match_id = m.id
GROUP BY p.id, p.name, p.number, p.is_goalkeeper, p.club_id, c.name, m.season;

-- View: Team season statistics
CREATE OR REPLACE VIEW team_season_stats AS
SELECT 
    c.id AS club_id,
    c.name AS club_name,
    m.season,
    COUNT(*) AS matches_played,
    SUM(CASE WHEN m.home_score > m.away_score THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN m.home_score < m.away_score THEN 1 ELSE 0 END) AS losses,
    SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) AS draws,
    SUM(m.home_score) AS total_goals_scored,
    SUM(m.away_score) AS total_goals_conceded,
    ROUND(AVG(m.home_score), 2) AS avg_goals_scored,
    ROUND(AVG(m.away_score), 2) AS avg_goals_conceded
FROM clubs c
JOIN matches m ON c.id = m.club_id
GROUP BY c.id, c.name, m.season;

-- ============================================
-- END OF SCHEMA
-- ============================================
