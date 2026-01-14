export type Category = "Goles" | "Tiros" | "Acciones" | "Faltas" | "Portero"

export type StatItem = {
  value: string
  label: string
  category: "Goles" | "Tiros" | "Acciones" | "Faltas" | "Portero"
  group: string
}

export const AVAILABLE_STATS: StatItem[] = [
  // GOLES
  { value: "goles_totales", label: "Total de Goles", category: "Goles", group: "Resumen" },
  { value: "goles_lanzamiento", label: "Goles de Lanzamiento", category: "Goles", group: "Por situación" },
  { value: "goles_corner", label: "Goles de Corner", category: "Goles", group: "Por situación" },
  { value: "goles_contraataque", label: "Goles de Contraataque", category: "Goles", group: "Por situación" },
  { value: "goles_boya_cada", label: "Goles Boya Cada", category: "Goles", group: "Boya" },
  { value: "goles_boya_jugada", label: "Goles Boya Jugada", category: "Goles", group: "Boya" },
  { value: "goles_hombre_mas", label: "Goles en Superioridad", category: "Goles", group: "Superioridad/Inferioridad" },
  { value: "goles_penalti_anotado", label: "Penaltis Anotados", category: "Goles", group: "Penaltis" },

  // TIROS
  { value: "tiros_totales", label: "Total de Tiros", category: "Tiros", group: "Resumen" },
  { value: "tiros_fuera", label: "Tiros Fuera", category: "Tiros", group: "Resultado del tiro" },
  { value: "tiros_parados", label: "Tiros Parados", category: "Tiros", group: "Resultado del tiro" },
  { value: "tiros_bloqueado", label: "Tiros Bloqueados", category: "Tiros", group: "Resultado del tiro" },

  // ACCIONES
  { value: "acciones_asistencias", label: "Asistencias", category: "Acciones", group: "Ofensivas" },
  { value: "acciones_recuperacion", label: "Recuperaciones", category: "Acciones", group: "Defensivas" },
  { value: "acciones_bloqueo", label: "Bloqueos", category: "Acciones", group: "Defensivas" },
  { value: "acciones_rebote", label: "Rebotes", category: "Acciones", group: "Balón dividido" },
  { value: "rebote_recup_hombre_mas", label: "Rebotes Recuperados (Sup.)", category: "Acciones", group: "Balón dividido" },

  // FALTAS
  { value: "faltas_penalti", label: "Penaltis Provocados", category: "Faltas", group: "Penaltis" },
  { value: "faltas_exp_3_bruta", label: "Exclusiones Brutales", category: "Faltas", group: "Exclusiones" },
  { value: "faltas_exp_3_int", label: "Exclusiones Intencionales", category: "Faltas", group: "Exclusiones" },
  { value: "faltas_exp_20_1c1", label: "Expulsiones 20s (1c1)", category: "Faltas", group: "Exclusiones" },
  { value: "faltas_exp_20_boya", label: "Expulsiones 20s (Boya)", category: "Faltas", group: "Exclusiones" },

  // PORTERO
  { value: "portero_paradas_totales", label: "Paradas Totales", category: "Portero", group: "Paradas" },
  { value: "portero_paradas_penalti_parado", label: "Penaltis Parados", category: "Portero", group: "Paradas" },
  { value: "portero_paradas_hombre_menos", label: "Paradas en Inferioridad", category: "Portero", group: "Paradas" },
  { value: "portero_goles_totales", label: "Goles Recibidos", category: "Portero", group: "Goles encajados" },
]
