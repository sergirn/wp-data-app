import type { Match, MatchStats } from "@/lib/types"

export interface MatchComparisonTotals {
  matchId: number
  jornada: string
  opponent: string
  result: string

  goles: number
  tiros: number
  eficienciaTiro: number
  asistencias: number

  golesHombreMas: number
  fallosHombreMas: number
  eficienciaHombreMas: number

  bloqueos: number
  recuperaciones: number
  perdidas: number
  balancePosesion: number

  golesRecibidos: number

  golesRecibidosHombreMenos: number
  paradasHombreMenos: number
  eficienciaDefensivaHombreMenos: number

  paradasPortero: number
  paradasConRecuperacion: number
  porcentajeParadas: number
}

const sum = (arr: any[], key: string) =>
  arr.reduce((acc, s) => acc + (s[key] || 0), 0)

export function calculateMatchTotals(
  match: Match,
  allStats: MatchStats[],
): MatchComparisonTotals {
  const stats = allStats.filter((s) => s.match_id === match.id)

  const goles = sum(stats, "goles_totales")
  const tiros = sum(stats, "tiros_totales")
  const asistencias = sum(stats, "acciones_asistencias")

  const golesHombreMas = sum(stats, "goles_hombre_mas")
  const fallosHombreMas =
    sum(stats, "tiros_hombre_mas") +
    sum(stats, "tiros_penalti_fallado")

  const bloqueos = sum(stats, "acciones_bloqueo")
  const recuperaciones = sum(stats, "acciones_recuperacion")
  const perdidas = sum(stats, "acciones_perdida_poco")

  const paradasPortero = sum(stats, "portero_paradas_totales")
  const paradasConRecuperacion = sum(
    stats,
    "portero_paradas_parada_recup",
  )

  const golesRecibidosHombreMenos = sum(
    stats,
    "portero_goles_hombre_menos",
  )
  const paradasHombreMenos = sum(
    stats,
    "portero_paradas_hombre_menos",
  )

  const golesRecibidos = match.is_home
    ? match.away_score
    : match.home_score

  return {
    matchId: match.id,
    jornada: `J${match.jornada ?? "-"}`,
    opponent: match.opponent,
    result: `${match.home_score}-${match.away_score}`,

    goles,
    tiros,
    eficienciaTiro: tiros > 0 ? Math.round((goles / tiros) * 100) : 0,
    asistencias,

    golesHombreMas,
    fallosHombreMas,
    eficienciaHombreMas:
      golesHombreMas + fallosHombreMas > 0
        ? Math.round(
            (golesHombreMas /
              (golesHombreMas + fallosHombreMas)) *
              100,
          )
        : 0,

    bloqueos,
    recuperaciones,
    perdidas,
    balancePosesion: recuperaciones - perdidas,

    golesRecibidos,

    golesRecibidosHombreMenos,
    paradasHombreMenos,
    eficienciaDefensivaHombreMenos:
      paradasHombreMenos + golesRecibidosHombreMenos > 0
        ? Math.round(
            (paradasHombreMenos /
              (paradasHombreMenos + golesRecibidosHombreMenos)) *
              100,
          )
        : 0,

    paradasPortero,
    paradasConRecuperacion,
    porcentajeParadas:
      paradasPortero + golesRecibidos > 0
        ? Math.round(
            (paradasPortero /
              (paradasPortero + golesRecibidos)) *
              100,
          )
        : 0,
  }
}
