-- ============================================
-- WATER POLO STATS - COMPLETE DATABASE SCHEMA
-- ============================================
-- Este archivo contiene el esquema completo de la base de datos
-- para la aplicación de estadísticas de waterpolo
-- 
-- Versión: 1.0
-- Fecha: 2025-01-15
-- ============================================

-- ============================================
-- 1. CREAR TABLAS PRINCIPALES
-- ============================================

-- Tabla de Clubs
CREATE TABLE IF NOT EXISTS public.clubs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Jugadores
CREATE TABLE IF NOT EXISTS public.players (
  id SERIAL PRIMARY KEY,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_goalkeeper BOOLEAN DEFAULT FALSE,
  club_id INTEGER NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(number, club_id)
);

-- Tabla de Partidos
CREATE TABLE IF NOT EXISTS public.matches (
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
  club_id INTEGER NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Estadísticas de Partido
CREATE TABLE IF NOT EXISTS public.match_stats (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  
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
  
  -- ESTADÍSTICAS DE PORTERO - Goles Encajados
  portero_goles_boya_parada INTEGER DEFAULT 0,
  portero_goles_lanzamiento INTEGER DEFAULT 0,
  portero_goles_dir_mas_5m INTEGER DEFAULT 0,
  portero_goles_penalti_encajado INTEGER DEFAULT 0,
  
  -- ESTADÍSTICAS DE PORTERO - Paradas
  portero_paradas_totales INTEGER DEFAULT 0,
  portero_tiros_parado INTEGER DEFAULT 0,
  portero_tiros_parada_recup INTEGER DEFAULT 0,
  portero_paradas_penalti_parado INTEGER DEFAULT 0,
  
  -- ESTADÍSTICAS DE PORTERO - Faltas
  portero_faltas_exp_3_int INTEGER DEFAULT 0,
  
  -- ESTADÍSTICAS DE PORTERO - Acciones
  portero_acciones_rebote INTEGER DEFAULT 0,
  portero_acciones_perdida_pos INTEGER DEFAULT 0,
  portero_acciones_gol_recibido INTEGER DEFAULT 0,
  
  -- Campos legacy de portero
  portero_paradas_pedida INTEGER DEFAULT 0,
  portero_exp_provocada INTEGER DEFAULT 0,
  portero_penalti_provocado INTEGER DEFAULT 0,
  portero_recibir_gol INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- ============================================
-- 2. TABLAS DE AUTENTICACIÓN Y PERFILES
-- ============================================

-- Tabla de Perfiles (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'coach', 'viewer')),
  club_id INTEGER REFERENCES public.clubs(id) ON DELETE SET NULL,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Logs de Auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_players_club_id ON public.players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_number ON public.players(number);
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON public.matches(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_season ON public.matches(season);
CREATE INDEX IF NOT EXISTS idx_match_stats_match_id ON public.match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_player_id ON public.match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON public.profiles(club_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. POLÍTICAS RLS PARA CLUBS
-- ============================================

-- Cualquier usuario autenticado puede leer clubs
CREATE POLICY "clubs_select_authenticated" ON public.clubs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo super admins pueden insertar clubs
CREATE POLICY "clubs_insert_super_admin" ON public.clubs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Solo super admins pueden actualizar clubs
CREATE POLICY "clubs_update_super_admin" ON public.clubs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Solo super admins pueden eliminar clubs
CREATE POLICY "clubs_delete_super_admin" ON public.clubs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================
-- 6. POLÍTICAS RLS PARA PLAYERS
-- ============================================

-- Los usuarios solo pueden ver jugadores de su club
CREATE POLICY "players_select_by_club" ON public.players
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Los usuarios pueden insertar jugadores en su club
CREATE POLICY "players_insert_by_club" ON public.players
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Los usuarios pueden actualizar jugadores de su club
CREATE POLICY "players_update_by_club" ON public.players
  FOR UPDATE USING (
    club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Solo admins y coaches pueden eliminar jugadores de su club
CREATE POLICY "players_delete_by_club" ON public.players
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================
-- 7. POLÍTICAS RLS PARA MATCHES
-- ============================================

-- Los usuarios solo pueden ver partidos de su club
CREATE POLICY "matches_select_by_club" ON public.matches
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM public.profiles WHERE id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Los usuarios pueden insertar partidos en su club
CREATE POLICY "matches_insert_by_club" ON public.matches
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Los usuarios pueden actualizar partidos de su club
CREATE POLICY "matches_update_by_club" ON public.matches
  FOR UPDATE USING (
    club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Solo admins y coaches pueden eliminar partidos de su club
CREATE POLICY "matches_delete_by_club" ON public.matches
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================
-- 8. POLÍTICAS RLS PARA MATCH_STATS
-- ============================================

-- Los usuarios pueden ver estadísticas de partidos de su club
CREATE POLICY "match_stats_select_by_club" ON public.match_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = match_stats.match_id 
      AND (m.club_id = p.club_id OR p.is_super_admin = true)
    )
  );

-- Los usuarios pueden insertar estadísticas en partidos de su club
CREATE POLICY "match_stats_insert_by_club" ON public.match_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = match_stats.match_id 
      AND (m.club_id = p.club_id OR p.is_super_admin = true)
      AND p.role IN ('admin', 'coach')
    )
  );

-- Los usuarios pueden actualizar estadísticas de partidos de su club
CREATE POLICY "match_stats_update_by_club" ON public.match_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = match_stats.match_id 
      AND (m.club_id = p.club_id OR p.is_super_admin = true)
      AND p.role IN ('admin', 'coach')
    )
  );

-- Solo admins y coaches pueden eliminar estadísticas
CREATE POLICY "match_stats_delete_by_club" ON public.match_stats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = match_stats.match_id 
      AND (m.club_id = p.club_id OR p.is_super_admin = true)
      AND p.role IN ('admin', 'coach')
    )
  );

-- ============================================
-- 9. POLÍTICAS RLS PARA PROFILES
-- ============================================

-- Todos pueden leer perfiles (para mostrar información de usuario)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Solo super admins pueden insertar perfiles
CREATE POLICY "profiles_insert_super_admin" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Solo super admins pueden eliminar perfiles
CREATE POLICY "profiles_delete_super_admin" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================
-- 10. POLÍTICAS RLS PARA AUDIT_LOGS
-- ============================================

-- Solo admins y coaches pueden ver logs de auditoría
CREATE POLICY "audit_logs_select_admin_coach" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin', 'coach') OR is_super_admin = true)
    )
  );

-- El sistema puede insertar logs de auditoría
CREATE POLICY "audit_logs_insert_system" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 11. FUNCIONES Y TRIGGERS
-- ============================================

-- Función para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para auto-crear perfil al registrar usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 12. DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Insertar clubs de ejemplo
INSERT INTO public.clubs (name, short_name, logo_url, primary_color, secondary_color)
VALUES 
  ('Club Natació Sant Andreu', 'CN Sant Andreu', '/logos/cn-sant-andreu.png', '#1e3a8a', '#3b82f6'),
  ('Club Esportiu Mediterrani', 'CE Mediterrani', '/logos/ce-mediterrani.webp', '#059669', '#10b981'),
  ('Club Natació Barcelona', 'CN Barcelona', '/logos/cn-barcelona.png', '#dc2626', '#ef4444')
ON CONFLICT DO NOTHING;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Para ejecutar este script:
-- 1. Conéctate a tu base de datos Supabase
-- 2. Ejecuta este script completo
-- 3. Verifica que todas las tablas se hayan creado correctamente
-- 4. Crea el usuario super admin usando el endpoint /api/setup-admin

-- Credenciales del super admin por defecto:
-- Email: admin@waterpolostats.com
-- Password: Admin123!
