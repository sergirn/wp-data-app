-- Professional match review workflow and configurable analysis thresholds.
-- Additive migration: existing matches and statistics are preserved.

alter table public.matches
  add column if not exists review_status text not null default 'pending_review',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_review_status_check'
  ) then
    alter table public.matches
      add constraint matches_review_status_check
      check (review_status in ('pending_review', 'reviewed', 'locked'));
  end if;
end $$;

create index if not exists idx_matches_club_review_status
  on public.matches (club_id, review_status, match_date desc);

create table if not exists public.club_analysis_settings (
  club_id integer primary key references public.clubs(id) on delete cascade,
  shooting_efficiency_target numeric(5,2) not null default 40 check (shooting_efficiency_target between 0 and 100),
  power_play_target numeric(5,2) not null default 45 check (power_play_target between 0 and 100),
  turnover_warning integer not null default 10 check (turnover_warning >= 0),
  save_percentage_target numeric(5,2) not null default 50 check (save_percentage_target between 0 and 100),
  max_goals_against integer not null default 10 check (max_goals_against >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.club_analysis_settings enable row level security;

create or replace function public.can_access_analysis_settings(target_club_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.club_id = target_club_id or coalesce(p.is_super_admin, false))
  );
$$;

create or replace function public.can_manage_analysis_settings(target_club_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (coalesce(p.is_super_admin, false) or (p.club_id = target_club_id and p.role in ('admin', 'coach')))
  );
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'club_analysis_settings'
      and policyname = 'club_analysis_settings_select'
  ) then
    create policy club_analysis_settings_select on public.club_analysis_settings
      for select using (public.can_access_analysis_settings(club_id));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'club_analysis_settings'
      and policyname = 'club_analysis_settings_manage'
  ) then
    create policy club_analysis_settings_manage on public.club_analysis_settings
      for all using (public.can_manage_analysis_settings(club_id))
      with check (public.can_manage_analysis_settings(club_id));
  end if;
end $$;

grant select, insert, update on public.club_analysis_settings to authenticated;

-- Locked matches remain readable, but their sporting data cannot be mutated until
-- an authorised coach explicitly returns them to review.
create or replace function public.guard_locked_match_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.review_status = 'locked' then
    if tg_op = 'DELETE' then
      raise exception 'MATCH_LOCKED' using errcode = 'P0001';
    end if;

    if (to_jsonb(new) - array['review_status', 'reviewed_at', 'reviewed_by', 'locked_at', 'locked_by'])
       is distinct from
       (to_jsonb(old) - array['review_status', 'reviewed_at', 'reviewed_by', 'locked_at', 'locked_by']) then
      raise exception 'MATCH_LOCKED' using errcode = 'P0001';
    end if;
  elsif tg_op = 'UPDATE'
    and (to_jsonb(new) - array['review_status', 'reviewed_at', 'reviewed_by', 'locked_at', 'locked_by'])
        is distinct from
        (to_jsonb(old) - array['review_status', 'reviewed_at', 'reviewed_by', 'locked_at', 'locked_by']) then
    -- Any sporting edit invalidates the previous approval automatically.
    new.review_status := 'pending_review';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.locked_at := null;
    new.locked_by := null;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.matches'::regclass
      and tgname = 'guard_locked_match_row_trigger'
      and not tgisinternal
  ) then
    create trigger guard_locked_match_row_trigger
      before update or delete on public.matches
      for each row execute function public.guard_locked_match_row();
  end if;
end $$;

create or replace function public.guard_locked_match_child()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_match_id integer;
begin
  target_match_id := case when tg_op = 'DELETE' then old.match_id else new.match_id end;
  if exists (
    select 1 from public.matches m
    where m.id = target_match_id and m.review_status = 'locked'
  ) then
    raise exception 'MATCH_LOCKED' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['match_stats', 'match_actions', 'goalkeeper_shots', 'penalty_shootout_players']
  loop
    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and t.tgname = 'guard_locked_match_child_trigger'
        and not t.tgisinternal
    ) then
      execute format(
        'create trigger guard_locked_match_child_trigger before insert or update or delete on public.%I for each row execute function public.guard_locked_match_child()',
        table_name
      );
    end if;
  end loop;
end $$;
