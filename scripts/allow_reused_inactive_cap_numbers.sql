-- Permite reutilizar el gorro de un jugador inactivo sin borrar ni modificar
-- su historial. La exclusividad del dorsal solo se aplica a la plantilla activa.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'unique_player_number_per_club'
  ) then
    alter table public.players
      drop constraint unique_player_number_per_club;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_club_id_number_key'
  ) then
    alter table public.players
      drop constraint players_club_id_number_key;
  end if;
end $$;

create unique index if not exists unique_active_player_number_per_club
  on public.players (club_id, number)
  where is_active = true;
