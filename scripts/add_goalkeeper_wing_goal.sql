-- Añade el gol rival marcado desde el extremo al desglose de portería.
-- Es una migración aditiva: no elimina ni modifica estadísticas existentes.

alter table public.match_stats
  add column if not exists portero_goles_extremo integer not null default 0;

comment on column public.match_stats.portero_goles_extremo is
  'Goles del rival recibidos desde la posición de extremo';
