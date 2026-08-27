-- Relates scouting notes to the four pre-match preparation areas.
-- Additive and non-destructive: existing notes remain unchanged.

alter table public.opponent_notes
  add column if not exists preparation_area text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.opponent_notes'::regclass
      and conname = 'opponent_notes_preparation_area_check'
  ) then
    alter table public.opponent_notes
      add constraint opponent_notes_preparation_area_check
      check (preparation_area is null or preparation_area in ('general', 'lineup', 'defense', 'powerPlay', 'goalkeeper'));
  end if;
end $$;

comment on column public.opponent_notes.preparation_area is
  'Optional destination of a scouting note: general or one of the four pre-match preparation areas.';
