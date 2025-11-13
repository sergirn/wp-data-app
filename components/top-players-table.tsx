import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Player } from "@/lib/types"

interface TopPlayersTableProps {
  players: Array<
    Player & {
      totalGoles: number
      totalTiros: number
      totalAsistencias: number
      totalBloqueos: number
      totalPerdidas: number
      eficiencia: number
      matchesPlayed: number
    }
  >
  statType: "goals" | "assists" | "efficiency" | "blocks" | "turnovers"
}

export function TopPlayersTable({ players, statType }: TopPlayersTableProps) {
  const getTitle = () => {
    switch (statType) {
      case "goals":
        return "Top Goleadores"
      case "assists":
        return "Top Asistentes"
      case "efficiency":
        return "Mejor Eficiencia"
      case "blocks":
        return "Top Bloqueadores"
      case "turnovers":
        return "Más Pérdidas"
    }
  }

  const getDescription = () => {
    switch (statType) {
      case "goals":
        return "Jugadores con más goles marcados"
      case "assists":
        return "Jugadores con más asistencias"
      case "efficiency":
        return "Jugadores con mejor porcentaje de acierto (mín. 10 tiros)"
      case "blocks":
        return "Jugadores con más bloqueos defensivos"
      case "turnovers":
        return "Jugadores con más pérdidas de posesión"
    }
  }

  const getStatValue = (player: (typeof players)[0]) => {
    switch (statType) {
      case "goals":
        return player.totalGoles
      case "assists":
        return player.totalAsistencias
      case "efficiency":
        return `${player.eficiencia}%`
      case "blocks":
        return player.totalBloqueos
      case "turnovers":
        return player.totalPerdidas
    }
  }

  const getStatLabel = () => {
    switch (statType) {
      case "goals":
        return "Goles"
      case "assists":
        return "Asistencias"
      case "efficiency":
        return "Eficiencia"
      case "blocks":
        return "Bloqueos"
      case "turnovers":
        return "Pérdidas"
    }
  }

  const getRankBadgeColor = (index: number) => {
    if (index === 0) return "bg-yellow-500 text-white"
    if (index === 1) return "bg-gray-400 text-white"
    if (index === 2) return "bg-amber-600 text-white"
    return "bg-muted text-muted-foreground"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="text-center">Partidos</TableHead>
              <TableHead className="text-center">{getStatLabel()}</TableHead>
              {statType === "goals" && <TableHead className="text-center">Tiros</TableHead>}
              {statType === "goals" && <TableHead className="text-center">Eficiencia</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player, index) => (
              <TableRow key={player.id}>
                <TableCell>
                  <Badge className={getRankBadgeColor(index)}>{index + 1}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {player.number}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{player.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">{player.matchesPlayed}</TableCell>
                <TableCell className="text-center font-bold text-primary">{getStatValue(player)}</TableCell>
                {statType === "goals" && <TableCell className="text-center">{player.totalTiros}</TableCell>}
                {statType === "goals" && <TableCell className="text-center">{player.eficiencia}%</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
