import { describe, expect, it } from "vitest"

import { calculateMatchTotals } from "./match-comparison"
import type { Match, MatchStats } from "./types"

const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 7,
  match_date: "2026-08-19",
  opponent: "Rival",
  location: null,
  home_score: 8,
  away_score: 6,
  is_home: true,
  season: "2026/27",
  jornada: 3,
  notes: null,
  club_id: 1,
  penalty_home_score: null,
  penalty_away_score: null,
  stats_enabled: true,
  ...overrides,
})

const stats = [
  {
    match_id: 7,
    player_id: 10,
    goles_totales: 4,
    tiros_totales: 8,
    acciones_asistencias: 2,
    goles_hombre_mas: 2,
    tiros_hombre_mas: 1,
    tiros_penalti_fallado: 1,
    acciones_bloqueo: 3,
    acciones_recuperacion: 5,
    acciones_perdida_poco: 2,
    portero_paradas_totales: 6,
    portero_paradas_parada_recup: 4,
    portero_goles_hombre_menos: 1,
    portero_paradas_hombre_menos: 3,
  },
] as unknown as MatchStats[]

describe("calculateMatchTotals", () => {
  it("calcula porcentajes y balances a partir de las estadísticas del partido", () => {
    const result = calculateMatchTotals(makeMatch(), stats)

    expect(result).toMatchObject({
      result: "8-6",
      goles: 4,
      tiros: 8,
      eficienciaTiro: 50,
      eficienciaHombreMas: 50,
      balancePosesion: 3,
      eficienciaDefensivaHombreMenos: 75,
      porcentajeParadas: 50,
    })
  })

  it("interpreta away_score como goles del rival también cuando se juega fuera", () => {
    const result = calculateMatchTotals(makeMatch({ is_home: false }), stats)

    expect(result.golesRecibidos).toBe(6)
    expect(result.result).toBe("8-6")
  })

  it("devuelve porcentajes cero cuando no hay intentos", () => {
    const result = calculateMatchTotals(makeMatch({ away_score: 0 }), [])

    expect(result.eficienciaTiro).toBe(0)
    expect(result.eficienciaHombreMas).toBe(0)
    expect(result.eficienciaDefensivaHombreMenos).toBe(0)
    expect(result.porcentajeParadas).toBe(0)
  })
})
