-- Opponent scouting: stable opponent identity, aliases, notes and match linking.
-- Safe to run after the existing clubs, profiles and matches tables exist.

create or replace function public.normalize_opponent_label(value text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(
    regexp_replace(
      translate(trim(coalesce(value, '')), 'áéíóúüñàèìòùäëïöüç', 'aeiouunaeiouaeiouc'),
      '[^a-zA-Z0-9]+',
      '',
      'g'
    )
  );
$$;

create table if not exists public.opponents (
  id bigint generated always as identity primary key,
  club_id integer not null references public.clubs(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  short_name text,
  logo_url text,
  normalized_name text generated always as (public.normalize_opponent_label(name)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opponents_id_club_key unique (id, club_id),
  constraint opponents_club_normalized_key unique (club_id, normalized_name)
);

create table if not exists public.opponent_aliases (
  id bigint generated always as identity primary key,
  opponent_id bigint not null,
  club_id integer not null,
  alias text not null check (length(trim(alias)) > 0),
  normalized_alias text generated always as (public.normalize_opponent_label(alias)) stored,
  created_at timestamptz not null default now(),
  constraint opponent_aliases_opponent_club_fkey
    foreign key (opponent_id, club_id)
    references public.opponents(id, club_id)
    on delete cascade,
  constraint opponent_aliases_club_normalized_key unique (club_id, normalized_alias)
);

create table if not exists public.opponent_notes (
  id bigint generated always as identity primary key,
  opponent_id bigint not null,
  club_id integer not null,
  category text not null default 'general'
    check (category in ('general', 'lineup', 'player', 'tactical', 'other')),
  title text,
  body text not null check (length(trim(body)) > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opponent_notes_opponent_club_fkey
    foreign key (opponent_id, club_id)
    references public.opponents(id, club_id)
    on delete cascade
);

alter table public.matches
  add column if not exists opponent_id bigint references public.opponents(id) on delete set null;

-- Prevent a match from ever pointing to an opponent owned by another club.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_opponent_same_club_fkey'
  ) then
    alter table public.matches
      add constraint matches_opponent_same_club_fkey
      foreign key (opponent_id, club_id)
      references public.opponents(id, club_id)
      on delete set null (opponent_id);
  end if;
end $$;

create index if not exists idx_opponents_club on public.opponents(club_id);
create index if not exists idx_opponent_aliases_opponent on public.opponent_aliases(opponent_id);
create index if not exists idx_opponent_notes_opponent_updated on public.opponent_notes(opponent_id, updated_at desc);
create index if not exists idx_matches_opponent_id on public.matches(opponent_id);

alter table public.opponents enable row level security;
alter table public.opponent_aliases enable row level security;
alter table public.opponent_notes enable row level security;

create or replace function public.can_access_opponent_club(target_club_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.club_id = target_club_id or p.is_super_admin = true)
  );
$$;

create or replace function public.can_manage_opponent_club(target_club_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_super_admin = true or (p.club_id = target_club_id and p.role in ('admin', 'coach')))
  );
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'opponents' and policyname = 'opponents_select_by_club') then
    create policy opponents_select_by_club on public.opponents for select using (public.can_access_opponent_club(club_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'opponents' and policyname = 'opponents_manage_by_club') then
    create policy opponents_manage_by_club on public.opponents for all using (public.can_manage_opponent_club(club_id)) with check (public.can_manage_opponent_club(club_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'opponent_aliases' and policyname = 'opponent_aliases_select_by_club') then
    create policy opponent_aliases_select_by_club on public.opponent_aliases for select using (public.can_access_opponent_club(club_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'opponent_aliases' and policyname = 'opponent_aliases_manage_by_club') then
    create policy opponent_aliases_manage_by_club on public.opponent_aliases for all using (public.can_manage_opponent_club(club_id)) with check (public.can_manage_opponent_club(club_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'opponent_notes' and policyname = 'opponent_notes_select_by_club') then
    create policy opponent_notes_select_by_club on public.opponent_notes for select using (public.can_access_opponent_club(club_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'opponent_notes' and policyname = 'opponent_notes_manage_by_club') then
    create policy opponent_notes_manage_by_club on public.opponent_notes for all using (public.can_manage_opponent_club(club_id)) with check (public.can_manage_opponent_club(club_id));
  end if;
end $$;

-- Create one opponent per normalized historical name and link existing matches.
insert into public.opponents (club_id, name)
select distinct on (m.club_id, public.normalize_opponent_label(m.opponent))
  m.club_id,
  trim(m.opponent)
from public.matches m
where length(public.normalize_opponent_label(m.opponent)) > 0
order by m.club_id, public.normalize_opponent_label(m.opponent), m.match_date desc
on conflict (club_id, normalized_name) do nothing;

update public.matches m
set opponent_id = o.id
from public.opponents o
where m.opponent_id is null
  and o.club_id = m.club_id
  and o.normalized_name = public.normalize_opponent_label(m.opponent);

create or replace function public.resolve_match_opponent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_id bigint;
begin
  -- Editing the free-text opponent must resolve the identity again. Otherwise an
  -- edited match could remain linked to the previous rival.
  if tg_op = 'UPDATE' and (
    new.opponent is distinct from old.opponent
    or new.club_id is distinct from old.club_id
  ) then
    new.opponent_id := null;
  end if;

  if new.opponent_id is not null then
    return new;
  end if;

  select o.id into resolved_id
  from public.opponents o
  where o.club_id = new.club_id
    and o.normalized_name = public.normalize_opponent_label(new.opponent)
  limit 1;

  if resolved_id is null then
    select a.opponent_id into resolved_id
    from public.opponent_aliases a
    where a.club_id = new.club_id
      and a.normalized_alias = public.normalize_opponent_label(new.opponent)
    limit 1;
  end if;

  if resolved_id is null then
    insert into public.opponents (club_id, name)
    values (new.club_id, trim(new.opponent))
    on conflict (club_id, normalized_name)
    do update set name = public.opponents.name
    returning id into resolved_id;
  end if;

  new.opponent_id := resolved_id;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'matches_resolve_opponent') then
    create trigger matches_resolve_opponent
      before insert or update of opponent, club_id, opponent_id on public.matches
      for each row execute function public.resolve_match_opponent();
  end if;
end $$;

-- Adds an alias to a rival. If that alias already exists as a separate rival,
-- its matches and notes are merged into the selected rival.
create or replace function public.assign_opponent_alias(p_opponent_id bigint, p_alias text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.opponents%rowtype;
  source_id bigint;
  alias_norm text := public.normalize_opponent_label(p_alias);
  linked_count integer := 0;
  newly_linked integer := 0;
begin
  select * into target_row from public.opponents where id = p_opponent_id;
  if target_row.id is null then raise exception 'OPPONENT_NOT_FOUND'; end if;
  if not public.can_manage_opponent_club(target_row.club_id) then raise exception 'FORBIDDEN'; end if;
  if length(alias_norm) = 0 then raise exception 'INVALID_ALIAS'; end if;

  select o.id into source_id
  from public.opponents o
  where o.club_id = target_row.club_id
    and o.id <> target_row.id
    and o.normalized_name = alias_norm
  limit 1;

  if source_id is null then
    select a.opponent_id into source_id
    from public.opponent_aliases a
    where a.club_id = target_row.club_id
      and a.opponent_id <> target_row.id
      and a.normalized_alias = alias_norm
    limit 1;
  end if;

  if source_id is not null then
    update public.matches set opponent_id = target_row.id where opponent_id = source_id;
    get diagnostics linked_count = row_count;
    update public.opponent_notes set opponent_id = target_row.id where opponent_id = source_id;
    update public.opponent_aliases
    set opponent_id = target_row.id
    where opponent_id = source_id;
    delete from public.opponents where id = source_id;
  end if;

  insert into public.opponent_aliases (opponent_id, club_id, alias)
  values (target_row.id, target_row.club_id, trim(p_alias))
  on conflict (club_id, normalized_alias)
  do update set opponent_id = excluded.opponent_id, alias = excluded.alias;

  update public.matches
  set opponent_id = target_row.id
  where club_id = target_row.club_id
    and public.normalize_opponent_label(opponent) = alias_norm
    and opponent_id is distinct from target_row.id;
  get diagnostics newly_linked = row_count;
  linked_count := linked_count + newly_linked;

  return jsonb_build_object('opponent_id', target_row.id, 'linked_matches', linked_count);
end;
$$;

grant select on public.opponents, public.opponent_aliases, public.opponent_notes to authenticated;
grant insert, update, delete on public.opponents, public.opponent_aliases, public.opponent_notes to authenticated;
grant usage, select on sequence public.opponents_id_seq, public.opponent_aliases_id_seq, public.opponent_notes_id_seq to authenticated;
grant execute on function public.assign_opponent_alias(bigint, text) to authenticated;
revoke execute on function public.assign_opponent_alias(bigint, text) from anon;
