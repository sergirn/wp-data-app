export function sortMatches(matches: any[]) {
  return [...(matches ?? [])].sort((a, b) => {
    const aj = a?.jornada ?? 9999
    const bj = b?.jornada ?? 9999
    if (aj !== bj) return aj - bj
    return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  })
}

export function formatMatchRow(match: any, idx: number) {
  const jornadaNumber = match?.jornada ?? idx + 1
  const fullDate = match?.match_date ? new Date(match.match_date).toLocaleDateString("es-ES") : ""
  return {
    matchId: match?.id,
    jornadaNumber,
    jornada: `J${jornadaNumber}`,
    rival: match?.opponent ?? "-",
    fullDate,
  }
}

export function sumField(rows: any[], field: string) {
  return rows.reduce((acc, r) => acc + (Number(r?.[field]) || 0), 0)
}
