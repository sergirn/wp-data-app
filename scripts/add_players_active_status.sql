-- Permite desactivar jugadores sin eliminar su historial.
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_players_club_active
ON public.players (club_id, is_active);

-- Guarda altas y modificaciones como una única operación. Primero libera los
-- dorsales de los registros editados para permitir intercambios y reutilización.
CREATE OR REPLACE FUNCTION public.save_club_players(
  p_club_id integer,
  p_players jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  player_data jsonb;
  player_id integer;
BEGIN
  IF jsonb_typeof(p_players) <> 'array' THEN
    RAISE EXCEPTION 'p_players must be a JSON array';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (club_id = p_club_id OR is_super_admin = true)
      AND (role IN ('admin', 'coach') OR is_super_admin = true)
  ) THEN
    RAISE EXCEPTION 'Not authorized to manage players'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.players
  SET
    is_active = false,
    number = -1000000000 - id
  WHERE club_id = p_club_id
    AND id IN (
      SELECT (item ->> 'id')::integer
      FROM jsonb_array_elements(p_players) AS entries(item)
      WHERE item ->> 'id' IS NOT NULL
    );

  FOR player_data IN SELECT value FROM jsonb_array_elements(p_players)
  LOOP
    player_id := NULLIF(player_data ->> 'id', '')::integer;

    IF player_id IS NULL THEN
      INSERT INTO public.players (club_id, number, name, is_goalkeeper, is_active)
      VALUES (
        p_club_id,
        (player_data ->> 'number')::integer,
        TRIM(player_data ->> 'name'),
        COALESCE((player_data ->> 'is_goalkeeper')::boolean, false),
        COALESCE((player_data ->> 'is_active')::boolean, true)
      );
    ELSE
      UPDATE public.players
      SET
        number = (player_data ->> 'number')::integer,
        name = TRIM(player_data ->> 'name'),
        is_goalkeeper = COALESCE((player_data ->> 'is_goalkeeper')::boolean, false),
        is_active = COALESCE((player_data ->> 'is_active')::boolean, true)
      WHERE id = player_id AND club_id = p_club_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Player % does not belong to club %', player_id, p_club_id
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.save_club_players(integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_club_players(integer, jsonb) TO authenticated;
