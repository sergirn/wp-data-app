-- Season and roster management.
-- Additive migration: it does not delete matches, statistics or players.

create table if not exists public.club_seasons (
  id bigint generated always as identity primary key,
  club_id integer not null references public.clubs(id) on delete cascade,
  name text not null check (name ~ '^[0-9]{4}-[0-9]{4}$'),
  start_year smallint not null check (start_year between 2000 and 2200),
  end_year smallint not null check (end_year = start_year + 1),
  status text not null default 'archived' check (status in ('planned', 'active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_seasons_club_start_key unique (club_id, start_year),
  constraint club_seasons_id_club_key unique (id, club_id)
);

create unique index if not exists club_seasons_one_active_per_club
  on public.club_seasons(club_id)
  where status = 'active';

create table if not exists public.player_seasons (
  id bigint generated always as identity primary key,
  club_season_id bigint not null,
  club_id integer not null,
  player_id integer not null references public.players(id) on delete cascade,
  number integer not null check (number >= 0),
  is_goalkeeper boolean not null default false,
  is_active boolean not null default true,
  joined_at date,
  left_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_seasons_season_club_fkey
    foreign key (club_season_id, club_id)
    references public.club_seasons(id, club_id)
    on delete cascade,
  constraint player_seasons_season_player_key unique (club_season_id, player_id)
);

create index if not exists idx_player_seasons_club_season
  on public.player_seasons(club_id, club_season_id, is_active);
create index if not exists idx_player_seasons_player
  on public.player_seasons(player_id, club_season_id);

alter table public.matches
  add column if not exists season_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_season_club_fkey'
  ) then
    alter table public.matches
      add constraint matches_season_club_fkey
      foreign key (season_id, club_id)
      references public.club_seasons(id, club_id);
  end if;
end $$;

create index if not exists idx_matches_season_id on public.matches(season_id);

alter table public.club_seasons enable row level security;
alter table public.player_seasons enable row level security;

create or replace function public.can_access_season_club(target_club_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.club_id = target_club_id or p.is_super_admin = true)
  );
$$;

create or replace function public.can_manage_season_club(target_club_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_super_admin = true or (p.club_id = target_club_id and p.role in ('admin', 'coach')))
  );
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'club_seasons' and policyname = 'club_seasons_select_by_club') then
    create policy club_seasons_select_by_club on public.club_seasons
      for select using (public.can_access_season_club(club_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'club_seasons' and policyname = 'club_seasons_manage_by_club') then
    create policy club_seasons_manage_by_club on public.club_seasons
      for all using (public.can_manage_season_club(club_id))
      with check (public.can_manage_season_club(club_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_seasons' and policyname = 'player_seasons_select_by_club') then
    create policy player_seasons_select_by_club on public.player_seasons
      for select using (public.can_access_season_club(club_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_seasons' and policyname = 'player_seasons_manage_by_club') then
    create policy player_seasons_manage_by_club on public.player_seasons
      for all using (public.can_manage_season_club(club_id))
      with check (public.can_manage_season_club(club_id));
  end if;
end $$;

-- Import valid historical season labels already present in matches.
insert into public.club_seasons (club_id, name, start_year, end_year, status)
select distinct
  m.club_id,
  replace(trim(m.season), '/', '-'),
  split_part(replace(trim(m.season), '/', '-'), '-', 1)::smallint,
  split_part(replace(trim(m.season), '/', '-'), '-', 2)::smallint,
  'archived'
from public.matches m
where trim(coalesce(m.season, '')) ~ '^[0-9]{4}[-/][0-9]{4}$'
  and split_part(replace(trim(m.season), '/', '-'), '-', 2)::integer
      = split_part(replace(trim(m.season), '/', '-'), '-', 1)::integer + 1
on conflict (club_id, start_year) do nothing;

-- Clubs without historical matches still receive the season inferred by the
-- same September boundary previously used by the application.
insert into public.club_seasons (club_id, name, start_year, end_year, status)
select
  c.id,
  inferred.start_year::text || '-' || (inferred.start_year + 1)::text,
  inferred.start_year,
  inferred.start_year + 1,
  'archived'
from public.clubs c
cross join lateral (
  select case when extract(month from current_date) >= 9
    then extract(year from current_date)::smallint
    else (extract(year from current_date)::smallint - 1)
  end as start_year
) inferred
where not exists (select 1 from public.club_seasons cs where cs.club_id = c.id)
on conflict (club_id, start_year) do nothing;

-- The most recent imported season becomes the operational season. These are
-- separate statements so rerunning the migration cannot temporarily violate
-- the one-active-season index.
update public.club_seasons
set status = 'archived', updated_at = now()
where status = 'active';

with latest as (
  select club_id, max(start_year) as start_year
  from public.club_seasons
  group by club_id
)
update public.club_seasons cs
set status = 'active', updated_at = now()
from latest
where latest.club_id = cs.club_id
  and cs.start_year = latest.start_year;

update public.matches m
set season_id = cs.id,
    season = cs.name
from public.club_seasons cs
where m.season_id is null
  and cs.club_id = m.club_id
  and replace(trim(coalesce(m.season, '')), '/', '-') = cs.name;

-- Reconstruct historical rosters from players who have match statistics.
insert into public.player_seasons (club_season_id, club_id, player_id, number, is_goalkeeper, is_active)
select distinct cs.id, m.club_id, p.id, greatest(p.number, 0), coalesce(p.is_goalkeeper, false), true
from public.match_stats ms
join public.matches m on m.id = ms.match_id
join public.club_seasons cs on cs.id = m.season_id
join public.players p on p.id = ms.player_id and p.club_id = m.club_id
where ms.player_id is not null
on conflict (club_season_id, player_id) do nothing;

-- Ensure the currently active players form the current operational roster.
insert into public.player_seasons (club_season_id, club_id, player_id, number, is_goalkeeper, is_active)
select cs.id, p.club_id, p.id, greatest(p.number, 0), coalesce(p.is_goalkeeper, false), true
from public.players p
join public.club_seasons cs on cs.club_id = p.club_id and cs.status = 'active'
where p.is_active = true
on conflict (club_season_id, player_id)
do update set
  number = excluded.number,
  is_goalkeeper = excluded.is_goalkeeper,
  is_active = true,
  updated_at = now();

create or replace function public.resolve_match_season()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved public.club_seasons%rowtype;
begin
  if new.season_id is not null then
    select * into resolved from public.club_seasons
    where id = new.season_id and club_id = new.club_id;
  elsif trim(coalesce(new.season, '')) <> '' then
    select * into resolved from public.club_seasons
    where club_id = new.club_id
      and name = replace(trim(new.season), '/', '-')
    limit 1;
  else
    select * into resolved from public.club_seasons
    where club_id = new.club_id and status = 'active'
    limit 1;
  end if;

  if resolved.id is null then
    raise exception 'SEASON_NOT_FOUND' using errcode = '23503';
  end if;

  new.season_id := resolved.id;
  new.season := resolved.name;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'matches_resolve_season') then
    create trigger matches_resolve_season
      before insert or update of season, season_id, club_id on public.matches
      for each row execute function public.resolve_match_season();
  end if;
end $$;

create or replace function public.sync_player_to_active_roster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_season_id bigint;
begin
  select id into active_season_id
  from public.club_seasons
  where club_id = new.club_id and status = 'active'
  limit 1;

  if active_season_id is null then return new; end if;

  insert into public.player_seasons (
    club_season_id, club_id, player_id, number, is_goalkeeper, is_active
  ) values (
    active_season_id, new.club_id, new.id, greatest(new.number, 0),
    coalesce(new.is_goalkeeper, false), coalesce(new.is_active, true)
  )
  on conflict (club_season_id, player_id)
  do update set
    number = excluded.number,
    is_goalkeeper = excluded.is_goalkeeper,
    is_active = excluded.is_active,
    updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'players_sync_active_roster') then
    create trigger players_sync_active_roster
      after insert or update of number, is_goalkeeper, is_active on public.players
      for each row execute function public.sync_player_to_active_roster();
  end if;
end $$;

create or replace function public.rollover_club_season(
  p_club_id integer,
  p_start_year integer,
  p_roster jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_season public.club_seasons%rowtype;
  roster_item jsonb;
  resolved_player_id integer;
  roster_name text := p_start_year::text || '-' || (p_start_year + 1)::text;
begin
  if not public.can_manage_season_club(p_club_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_start_year < 2000 or p_start_year > 2200 then
    raise exception 'INVALID_SEASON';
  end if;
  if jsonb_typeof(p_roster) <> 'array' or jsonb_array_length(p_roster) = 0 then
    raise exception 'EMPTY_ROSTER';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_roster) item
    group by (item ->> 'number')::integer
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_NUMBER' using errcode = '23505';
  end if;

  insert into public.club_seasons (club_id, name, start_year, end_year, status, created_by)
  values (p_club_id, roster_name, p_start_year, p_start_year + 1, 'planned', auth.uid())
  on conflict (club_id, start_year)
  do update set name = excluded.name, updated_at = now()
  returning * into target_season;

  update public.club_seasons set status = 'archived', updated_at = now()
  where club_id = p_club_id and status = 'active';

  update public.players set is_active = false where club_id = p_club_id;
  update public.player_seasons set is_active = false, updated_at = now()
  where club_season_id = target_season.id;

  for roster_item in select value from jsonb_array_elements(p_roster)
  loop
    resolved_player_id := nullif(roster_item ->> 'id', '')::integer;
    if trim(coalesce(roster_item ->> 'name', '')) = '' then raise exception 'INVALID_PLAYER_NAME'; end if;
    if (roster_item ->> 'number')::integer < 0 then raise exception 'INVALID_PLAYER_NUMBER'; end if;

    if resolved_player_id is null then
      insert into public.players (club_id, number, name, is_goalkeeper, is_active)
      values (
        p_club_id,
        (roster_item ->> 'number')::integer,
        trim(roster_item ->> 'name'),
        coalesce((roster_item ->> 'is_goalkeeper')::boolean, false),
        false
      ) returning id into resolved_player_id;
    elsif not exists (select 1 from public.players where id = resolved_player_id and club_id = p_club_id) then
      raise exception 'PLAYER_NOT_IN_CLUB' using errcode = '42501';
    end if;

    insert into public.player_seasons (
      club_season_id, club_id, player_id, number, is_goalkeeper, is_active
    ) values (
      target_season.id, p_club_id, resolved_player_id,
      (roster_item ->> 'number')::integer,
      coalesce((roster_item ->> 'is_goalkeeper')::boolean, false), true
    )
    on conflict (club_season_id, player_id)
    do update set
      number = excluded.number,
      is_goalkeeper = excluded.is_goalkeeper,
      is_active = true,
      updated_at = now();

    update public.players
    set name = trim(roster_item ->> 'name'),
        number = (roster_item ->> 'number')::integer,
        is_goalkeeper = coalesce((roster_item ->> 'is_goalkeeper')::boolean, false)
    where id = resolved_player_id;
  end loop;

  update public.club_seasons set status = 'active', updated_at = now()
  where id = target_season.id;
  update public.players p
  set is_active = true
  where p.club_id = p_club_id
    and exists (
      select 1 from public.player_seasons ps
      where ps.club_season_id = target_season.id
        and ps.player_id = p.id and ps.is_active = true
    );

  return jsonb_build_object(
    'season_id', target_season.id,
    'season', target_season.name,
    'players', jsonb_array_length(p_roster)
  );
end;
$$;

create or replace function public.set_active_club_season(
  p_club_id integer,
  p_season_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_season_club(p_club_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (select 1 from public.club_seasons where id = p_season_id and club_id = p_club_id) then
    raise exception 'SEASON_NOT_FOUND' using errcode = '23503';
  end if;

  update public.club_seasons set status = 'archived', updated_at = now()
  where club_id = p_club_id and status = 'active';
  update public.players set is_active = false where club_id = p_club_id;
  update public.club_seasons set status = 'active', updated_at = now() where id = p_season_id;
  update public.players p
  set is_active = ps.is_active,
      number = ps.number,
      is_goalkeeper = ps.is_goalkeeper
  from public.player_seasons ps
  where ps.club_season_id = p_season_id
    and ps.player_id = p.id
    and p.club_id = p_club_id;
end;
$$;

grant select on public.club_seasons, public.player_seasons to authenticated;
grant insert, update on public.club_seasons, public.player_seasons to authenticated;
grant usage, select on sequence public.club_seasons_id_seq, public.player_seasons_id_seq to authenticated;
grant execute on function public.rollover_club_season(integer, integer, jsonb) to authenticated;
grant execute on function public.set_active_club_season(integer, bigint) to authenticated;
revoke execute on function public.rollover_club_season(integer, integer, jsonb) from anon;
revoke execute on function public.set_active_club_season(integer, bigint) from anon;
