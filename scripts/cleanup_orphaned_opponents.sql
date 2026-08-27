-- Removes an opponent automatically when its last linked match is deleted.
-- Existing opponents are not modified when this migration is installed.

create or replace function public.cleanup_orphaned_opponent_after_match_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.opponent_id is not null and not exists (
    select 1
    from public.matches m
    where m.opponent_id = old.opponent_id
  ) then
    delete from public.opponents o
    where o.id = old.opponent_id
      and o.club_id = old.club_id;
  end if;

  return old;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.matches'::regclass
      and tgname = 'cleanup_orphaned_opponent_after_match_delete_trigger'
      and not tgisinternal
  ) then
    create trigger cleanup_orphaned_opponent_after_match_delete_trigger
      after delete on public.matches
      for each row execute function public.cleanup_orphaned_opponent_after_match_delete();
  end if;
end $$;

comment on function public.cleanup_orphaned_opponent_after_match_delete() is
  'Deletes an opponent and its cascading scouting data after its last linked match is deleted.';
