import type { Match, Player, MatchStats } from "./types"

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Escape commas and quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(","),
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function prepareMatchesForExport(matches: Match[]) {
  return matches.map((match) => ({
    Fecha: new Date(match.match_date).toLocaleDateString("es-ES"),
    Rival: match.opponent,
    Ubicación: match.location || "-",
    "Goles CN Sant Andreu": match.home_score,
    "Goles Rival": match.away_score,
    Resultado:
      match.home_score > match.away_score ? "Victoria" : match.home_score < match.away_score ? "Derrota" : "Empate",
    Temporada: match.season || "-",
    Jornada: match.jornada || "-",
  }))
}

export function preparePlayersForExport(
  players: Array<
    Player & {
      totalGoles: number
      totalTiros: number
      totalAsistencias: number
      eficiencia: number
      matchesPlayed: number
    }
  >,
) {
  return players.map((player) => ({
    Número: player.number,
    Nombre: player.name,
    Posición: player.is_goalkeeper ? "Portero" : "Campo",
    Partidos: player.matchesPlayed,
    Goles: player.totalGoles,
    Tiros: player.totalTiros,
    Asistencias: player.totalAsistencias,
    "Eficiencia (%)": player.eficiencia,
  }))
}

export function prepareMatchStatsForExport(match: Match, players: Player[], stats: MatchStats[]) {
  return stats.map((stat) => {
    const player = players.find((p) => p.id === stat.player_id)
    return {
      Jugador: player?.name || "Desconocido",
      Número: player?.number || "-",
      Goles: stat.goles_totales,
      Tiros: stat.tiros_totales,
      "Eficiencia (%)": stat.goles_eficiencia,
      Asistencias: stat.acciones_asistencias,
      Faltas: stat.faltas_exp_3_int + stat.faltas_exp_3_bruta,
      Recuperaciones: stat.acciones_recuperacion,
    }
  })
}

// Generate simple HTML for PDF printing
export function generateMatchReportHTML(match: Match, players: Player[], stats: MatchStats[]): string {
  const matchDate = new Date(match.match_date).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const result =
    match.home_score > match.away_score ? "Victoria" : match.home_score < match.away_score ? "Derrota" : "Empate"

  const statsRows = stats
    .map((stat) => {
      const player = players.find((p) => p.id === stat.player_id)
      return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${player?.number || "-"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${player?.name || "Desconocido"}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${stat.goles_totales}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${stat.tiros_totales}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${stat.goles_eficiencia}%</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${stat.acciones_asistencias}</td>
      </tr>
    `
    })
    .join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Acta de Partido - ${match.opponent}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
        }
        h1 {
          color: #1e40af;
          text-align: center;
          margin-bottom: 10px;
        }
        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
        }
        .match-info {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .score {
          text-align: center;
          font-size: 48px;
          font-weight: bold;
          margin: 20px 0;
        }
        .result {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .result.victoria { color: #16a34a; }
        .result.derrota { color: #dc2626; }
        .result.empate { color: #ca8a04; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background: #1e40af;
          color: white;
          padding: 12px;
          text-align: left;
        }
        @media print {
          body {
            margin: 0;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <h1>CN Sant Andreu - Waterpolo</h1>
      <div class="subtitle">Acta de Partido</div>
      
      <div class="match-info">
        <p><strong>Fecha:</strong> ${matchDate}</p>
        <p><strong>Rival:</strong> ${match.opponent}</p>
        <p><strong>Ubicación:</strong> ${match.location || "-"}</p>
        <p><strong>Temporada:</strong> ${match.season || "-"}</p>
        <p><strong>Jornada:</strong> ${match.jornada || "-"}</p>
      </div>

      <div class="score">
        ${match.home_score} - ${match.away_score}
      </div>

      <div class="result ${result.toLowerCase()}">
        ${result}
      </div>

      <h2>Estadísticas de Jugadores</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th style="text-align: center;">Goles</th>
            <th style="text-align: center;">Tiros</th>
            <th style="text-align: center;">Eficiencia</th>
            <th style="text-align: center;">Asistencias</th>
          </tr>
        </thead>
        <tbody>
          ${statsRows}
        </tbody>
      </table>
    </body>
    </html>
  `
}

export function printMatchReport(html: string) {
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
}
