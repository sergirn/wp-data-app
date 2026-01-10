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
  players: Array<Player & Partial<{
    totalGoles: number
    totalTiros: number
    totalAsistencias: number
    totalBloqueos: number
    totalPerdidas: number
    eficiencia: number
    matchesPlayed: number
  }>>
  statType: "goals" | "assists" | "efficiency" | "blocks" | "turnovers"
}


export function TopPlayersTable({ players, statType }: TopPlayersTableProps) {
  const meta = {
    goals: {
      title: "Goleadores",
      description: "Máximos anotadores",
      mainLabel: "Goles",
    },
    assists: {
      title: "Asistencias",
      description: "Creadores de juego",
      mainLabel: "Asist.",
    },
    efficiency: {
      title: "Eficiencia",
      description: "Acierto ofensivo",
      mainLabel: "%",
    },
    blocks: {
      title: "Bloqueos",
      description: "Impacto defensivo",
      mainLabel: "Bloq.",
    },
    turnovers: {
      title: "Pérdidas",
      description: "Riesgo ofensivo",
      mainLabel: "Perd.",
    },
  }[statType]

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

  const rankStyles = [
    "bg-yellow-500/15 text-yellow-600 border-yellow-500",
    "bg-gray-400/15 text-gray-600 border-gray-400",
    "bg-amber-600/15 text-amber-600 border-amber-600",
  ]

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">
          {meta.title}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {meta.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="hidden sm:table-cell text-center">
                PJ
              </TableHead>
              <TableHead className="text-center font-semibold">
                {meta.mainLabel}
              </TableHead>
              {statType === "goals" && (
                <>
                  <TableHead className="hidden sm:table-cell text-center">
                    Tiros
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-center">
                    %
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {players.map((player, index) => (
              <TableRow
                key={player.id}
                className={cn(
                  "hover:bg-muted/40 transition-colors",
                  index < 3 && "bg-muted/20"
                )}
              >
                {/* Ranking */}
                <TableCell className="text-center">
                  <div
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold",
                      index < 3
                        ? rankStyles[index]
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>
                </TableCell>

                {/* Jugador */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.name}
                            className="h-full w-full object-cover object-top"
                          />
                        ) : (
                          player.number
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className="leading-tight">
                      <p className="font-medium">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        #{player.number}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* PJ */}
                <TableCell className="hidden sm:table-cell text-center">
                  {player.matchesPlayed}
                </TableCell>

                {/* Stat principal */}
                <TableCell className="text-center text-base font-bold text-primary">
                  {getStatValue(player)}
                </TableCell>

                {/* Extras goles */}
                {statType === "goals" && (
                  <>
                    <TableCell className="hidden sm:table-cell text-center">
                      {player.totalTiros}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
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
