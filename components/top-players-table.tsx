import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
  const getTitle = () => ({
    goals: "Top Goleadores",
    assists: "Top Asistentes",
    efficiency: "Mejor Eficiencia",
    blocks: "Top Bloqueadores",
    turnovers: "Más Pérdidas",
  }[statType])

  const getDescription = () => ({
    goals: "Jugadores con más goles anotados",
    assists: "Jugadores con más asistencias",
    efficiency: "Mejor porcentaje de acierto (mín. 10 tiros)",
    blocks: "Más acciones defensivas",
    turnovers: "Mayor número de pérdidas",
  }[statType])

  const getStatValue = (p: TopPlayersTableProps["players"][0]) => {
    switch (statType) {
      case "goals":
        return p.totalGoles
      case "assists":
        return p.totalAsistencias
      case "efficiency":
        return `${p.eficiencia}%`
      case "blocks":
        return p.totalBloqueos
      case "turnovers":
        return p.totalPerdidas
    }
  }

  const getRankStyles = (index: number) => {
    if (index === 0) return "bg-yellow-500/10 text-yellow-600 border-yellow-500"
    if (index === 1) return "bg-gray-400/10 text-gray-600 border-gray-400"
    if (index === 2) return "bg-amber-600/10 text-amber-600 border-amber-600"
    return "bg-muted text-muted-foreground"
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">#</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="text-center">PJ</TableHead>
              <TableHead className="text-center font-semibold">
                {statType === "efficiency" ? "%" : "Total"}
              </TableHead>
              {statType === "goals" && (
                <>
                  <TableHead className="text-center">Tiros</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {players.map((player, index) => (
              <TableRow
                key={player.id}
                className={cn(
                  "transition-colors hover:bg-muted/50",
                  index < 3 && "bg-muted/30"
                )}
              >
                {/* Ranking */}
                <TableCell className="text-center">
                  <div
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold",
                      getRankStyles(index)
                    )}
                  >
                    {index + 1}
                  </div>
                </TableCell>

                {/* Jugador */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {player.photo_url ? (
                          <img 
                            src={player.photo_url || "/placeholder.svg"} 
                            alt={player.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <span className="text-primary-foreground font-bold text-base sm:text-lg">{player.number}</span>
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        #{player.number}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Partidos */}
                <TableCell className="text-center">
                  {player.matchesPlayed}
                </TableCell>

                {/* Stat principal */}
                <TableCell className="text-center text-lg font-bold text-primary">
                  {getStatValue(player)}
                </TableCell>

                {/* Extras goles */}
                {statType === "goals" && (
                  <>
                    <TableCell className="text-center">
                      {player.totalTiros}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {player.eficiencia}%
                      </Badge>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
