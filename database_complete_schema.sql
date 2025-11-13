-- =====================================================
-- WATER POLO STATS - COMPLETE DATABASE SCHEMA
-- =====================================================
-- Este archivo contiene el esquema completo de la base de datos
-- para la aplicación de estadísticas de waterpolo
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: clubs
-- Almacena información de los clubes de waterpolo
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clubs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para clubs
CREATE INDEX IF NOT EXISTS idx_clubs_short_name ON public.clubs(short_name);

-- =====================================================
-- TABLA: players
-- Almacena información de los jugadores
-- =====================================================
CREATE TABLE IF NOT EXISTS public.players (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    is_goalkeeper BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(club_id, number)
);

-- Índices para players
CREATE INDEX IF NOT EXISTS idx_players_club_id ON public.players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_is_goalkeeper ON public.players(is_goalkeeper);
CREATE INDEX IF NOT EXISTS idx_players_number ON public.players(number);

-- =====================================================
-- TABLA: matches
-- Almacena información de los partidos
-- =====================================================
CREATE TABLE IF NOT EXISTS public.matches (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    opponent TEXT NOT NULL,
    match_date DATE NOT NULL,
    location TEXT NOT NULL,
    is_home BOOLEAN DEFAULT TRUE,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    jornada INTEGER NOT NULL,
    season TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para matches
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON public.matches(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_season ON public.matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_jornada ON public.matches(jornada);

-- =====================================================
-- TABLA: match_stats
-- Almacena estadísticas detalladas de cada jugador por partido
-- =====================================================
CREATE TABLE IF NOT EXISTS public.match_stats (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    
    -- ESTADÍSTICAS DE JUGADORES DE CAMPO
    -- Goles
    goles_totales INTEGER DEFAULT 0,
    goles_boya_jugada INTEGER DEFAULT 0,
    goles_hombre_mas INTEGER DEFAULT 0,
    goles_lanzamiento INTEGER DEFAULT 0,
    goles_dir_mas_5m INTEGER DEFAULT 0,
    goles_contraataque INTEGER DEFAULT 0,
    goles_penalti_anotado INTEGER DEFAULT 0,
    
    -- Tiros (fallados)
    tiros_totales INTEGER DEFAULT 0,
    tiros_penalti_fallado INTEGER DEFAULT 0,
    tiros_corner INTEGER DEFAULT 0,
    tiros_fuera INTEGER DEFAULT 0,
    tiros_parados INTEGER DEFAULT 0,
    tiros_bloqueado INTEGER DEFAULT 0,
    
    -- Faltas
    faltas_exp_20_1c1 INTEGER DEFAULT 0,
    faltas_exp_20_boya INTEGER DEFAULT 0,
    faltas_penalti INTEGER DEFAULT 0,
    faltas_contrafaltas INTEGER DEFAULT 0,
    
    -- Acciones
    acciones_bloqueo INTEGER DEFAULT 0,
    acciones_asistencias INTEGER DEFAULT 0,
    acciones_recuperacion INTEGER DEFAULT 0,
    acciones_rebote INTEGER DEFAULT 0,
    acciones_exp_provocada INTEGER DEFAULT 0,
    acciones_penalti_provocado INTEGER DEFAULT 0,
    acciones_recibir_gol INTEGER DEFAULT 0,
    
    -- ESTADÍSTICAS DE PORTEROS
    -- Goles Recibidos
    portero_goles_totales INTEGER DEFAULT 0,
    portero_goles_boya INTEGER DEFAULT 0,
    portero_goles_hombre_menos INTEGER DEFAULT 0,
    portero_goles_dir_mas_5m INTEGER DEFAULT 0,
    portero_goles_contraataque INTEGER DEFAULT 0,
    portero_goles_penalti INTEGER DEFAULT 0,
    
    -- Paradas
    portero_paradas_totales INTEGER DEFAULT 0,
    portero_paradas_parada_recup INTEGER DEFAULT 0,
    portero_paradas_fuera INTEGER DEFAULT 0,
    portero_paradas_penalti_parado INTEGER DEFAULT 0,
    portero_paradas_hombre_menos INTEGER DEFAULT 0,
    
    -- Acciones de Portero
    portero_acciones_asistencias INTEGER DEFAULT 0,
    portero_acciones_recuperacion INTEGER DEFAULT 0,
    portero_acciones_perdida_pos INTEGER DEFAULT 0,
    portero_acciones_exp_provocada INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

-- Índices para match_stats
CREATE INDEX IF NOT EXISTS idx_match_stats_match_id ON public.match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_player_id ON public.match_stats(player_id);

-- =====================================================
-- TABLA: profiles
-- Almacena perfiles de usuario vinculados a auth.users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'coach', 'viewer')),
    club_id INTEGER REFERENCES public.clubs(id) ON DELETE SET NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON public.profiles(club_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- =====================================================
-- TABLA: audit_logs
-- Registra cambios en las tablas principales
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para clubs
DROP TRIGGER IF EXISTS update_clubs_updated_at ON public.clubs;
CREATE TRIGGER update_clubs_updated_at
    BEFORE UPDATE ON public.clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para clubs
DROP POLICY IF EXISTS "Clubs are viewable by everyone" ON public.clubs;
CREATE POLICY "Clubs are viewable by everyone"
    ON public.clubs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Clubs are editable by admins" ON public.clubs;
CREATE POLICY "Clubs are editable by admins"
    ON public.clubs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
        )
    );

-- Políticas para players
DROP POLICY IF EXISTS "Players are viewable by everyone" ON public.players;
CREATE POLICY "Players are viewable by everyone"
    ON public.players FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Players are editable by club admins and coaches" ON public.players;
CREATE POLICY "Players are editable by club admins and coaches"
    ON public.players FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.is_super_admin = true
                OR (profiles.club_id = players.club_id AND profiles.role IN ('admin', 'coach'))
            )
        )
    );

-- Políticas para matches
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON public.matches;
CREATE POLICY "Matches are viewable by everyone"
    ON public.matches FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Matches are editable by club admins and coaches" ON public.matches;
CREATE POLICY "Matches are editable by club admins and coaches"
    ON public.matches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.is_super_admin = true
                OR (profiles.club_id = matches.club_id AND profiles.role IN ('admin', 'coach'))
            )
        )
    );

-- Políticas para match_stats
DROP POLICY IF EXISTS "Match stats are viewable by everyone" ON public.match_stats;
CREATE POLICY "Match stats are viewable by everyone"
    ON public.match_stats FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Match stats are editable by club admins and coaches" ON public.match_stats;
CREATE POLICY "Match stats are editable by club admins and coaches"
    ON public.match_stats FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            JOIN public.matches ON matches.id = match_stats.match_id
            WHERE profiles.id = auth.uid()
            AND (
                profiles.is_super_admin = true
                OR (profiles.club_id = matches.club_id AND profiles.role IN ('admin', 'coach'))
            )
        )
    );

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role = 'admin' OR p.is_super_admin = true)
        )
    );

-- Políticas para audit_logs
DROP POLICY IF EXISTS "Audit logs are viewable by admins" ON public.audit_logs;
CREATE POLICY "Audit logs are viewable by admins"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
        )
    );

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================

-- Insertar clubes de ejemplo
INSERT INTO public.clubs (name, short_name, logo_url, primary_color, secondary_color) VALUES
('Club Natació Sant Andreu', 'CN Sant Andreu', '/logos/cn-sant-andreu.png', '#003366', '#FFFFFF'),
('Club Esportiu Mediterrani', 'CE Mediterrani', '/logos/ce-mediterrani.webp', '#FF6600', '#FFFFFF'),
('Club Natació Barcelona', 'CN Barcelona', '/logos/cn-barcelona.png', '#0099CC', '#FFFFFF')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTARIOS EN TABLAS Y COLUMNAS
-- =====================================================

COMMENT ON TABLE public.clubs IS 'Almacena información de los clubes de waterpolo';
COMMENT ON TABLE public.players IS 'Almacena información de los jugadores';
COMMENT ON TABLE public.matches IS 'Almacena información de los partidos';
COMMENT ON TABLE public.match_stats IS 'Almacena estadísticas detalladas de cada jugador por partido';
COMMENT ON TABLE public.profiles IS 'Almacena perfiles de usuario vinculados a auth.users';
COMMENT ON TABLE public.audit_logs IS 'Registra cambios en las tablas principales para auditoría';

COMMENT ON COLUMN public.players.is_goalkeeper IS 'Indica si el jugador es portero (true) o jugador de campo (false)';
COMMENT ON COLUMN public.matches.is_home IS 'Indica si el partido es en casa (true) o fuera (false)';
COMMENT ON COLUMN public.matches.home_score IS 'Goles anotados por el equipo local';
COMMENT ON COLUMN public.matches.away_score IS 'Goles anotados por el equipo visitante';
COMMENT ON COLUMN public.profiles.is_super_admin IS 'Indica si el usuario tiene permisos de super administrador';

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
