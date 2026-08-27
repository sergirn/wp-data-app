-- Configurable season objectives. Additive and non-destructive migration.
-- Stores a maximum of nine compact objective definitions in the existing club row.

alter table public.club_analysis_settings
  add column if not exists objectives jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.club_analysis_settings'::regclass
      and conname = 'club_analysis_settings_objectives_check'
  ) then
    alter table public.club_analysis_settings
      add constraint club_analysis_settings_objectives_check
      check (
        objectives is null
        or (jsonb_typeof(objectives) = 'array' and jsonb_array_length(objectives) <= 9)
      );
  end if;
end $$;

comment on column public.club_analysis_settings.objectives is
  'Up to nine ordered club objectives: title, metric, unit, comparator and target.';
