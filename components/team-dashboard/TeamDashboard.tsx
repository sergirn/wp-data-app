"use client"

import { useState } from "react"
import { AttackBlock } from "./AttackBlock"
import { DefenseBlock } from "./DefenseBlock"
import { GoalkeeperBlock } from "./GoalkeeperBlock"
import { PlayerStatCard } from "./PlayerStatCard"
import { CustomStatCardDialog } from "./CustomStatCardDialog"
import { UserX, Target, Activity, Crosshair } from "lucide-react"

interface TeamDashboardProps {
  teamStats?: any
}

export function TeamDashboard({ teamStats }: TeamDashboardProps) {
  const [customCards, setCustomCards] = useState<Array<{ statField: string; statLabel: string }>>([])

  const playerStats =
    (Array.isArray(teamStats) && teamStats) ||
    (Array.isArray(teamStats?.playerStats) && teamStats.playerStats) ||
    (Array.isArray(teamStats?.players) && teamStats.players) ||
    []

  const fieldPlayers = playerStats.filter((p: any) => !p.is_goalkeeper)
  const goalkeepers = playerStats.filter((p: any) => p.is_goalkeeper)

  const getMostExpelledPlayer = () => {
    if (fieldPlayers.length === 0) return null

    return fieldPlayers.reduce((max: any, player: any) => {
      const totalExpulsions =
        (player.faltas_exp_3_bruta || 0) +
        (player.faltas_exp_3_int || 0) +
        (player.faltas_exp_20_1c1 || 0) +
        (player.faltas_exp_20_boya || 0)

      const maxExpulsions =
        (max.faltas_exp_3_bruta || 0) +
        (max.faltas_exp_3_int || 0) +
        (max.faltas_exp_20_1c1 || 0) +
        (max.faltas_exp_20_boya || 0)

      return totalExpulsions > maxExpulsions ? player : max
    })
  }

  const getMostAssistsPlayer = () => {
    if (fieldPlayers.length === 0) return null

    return fieldPlayers.reduce((max: any, player: any) => {
      const assists = player.acciones_asistencias || 0
      const maxAssists = max.acciones_asistencias || 0
      return assists > maxAssists ? player : max
    })
  }

  const getMostRecoveriesPlayer = () => {
    if (fieldPlayers.length === 0) return null

    return fieldPlayers.reduce((max: any, player: any) => {
      const recoveries = player.acciones_recuperacion || 0
      const maxRecoveries = max.acciones_recuperacion || 0
      return recoveries > maxRecoveries ? player : max
    })
  }

  const getBestPenaltyPlayer = () => {
    if (fieldPlayers.length === 0) return null

    const playersWithPenalties = fieldPlayers.filter(
      (p: any) => (p.goles_penalti_anotado || 0) + (p.goles_penalti_fallo || 0) > 0,
    )

    if (playersWithPenalties.length === 0) return null

    return playersWithPenalties.reduce((max: any, player: any) => {
      const scored = player.goles_penalti_anotado || 0
      const missed = player.goles_penalti_fallo || 0
      const total = scored + missed
      const efficiency = total > 0 ? (scored / total) * 100 : 0

      const maxScored = max.goles_penalti_anotado || 0
      const maxMissed = max.goles_penalti_fallo || 0
      const maxTotal = maxScored + maxMissed
      const maxEfficiency = maxTotal > 0 ? (maxScored / maxTotal) * 100 : 0

      return efficiency > maxEfficiency ? player : max
    })
  }

  const getTopPlayerForStat = (statField: string) => {
    const allPlayers = [...fieldPlayers, ...goalkeepers]
    if (allPlayers.length === 0) return null

    // Filtrar jugadores que tienen un valor válido para esta estadística
    const playersWithStat = allPlayers.filter((player: any) => {
      const value = player[statField]
      return value !== null && value !== undefined && value > 0
    })

    if (playersWithStat.length === 0) {
      console.log(`[v0] No players found with stat: ${statField}`)
      return null
    }

    const topPlayer = playersWithStat.reduce((max: any, player: any) => {
      const value = Number(player[statField]) || 0
      const maxValue = Number(max[statField]) || 0
      return value > maxValue ? player : max
    })

    console.log(`[v0] Top player for ${statField}:`, {
      name: topPlayer.name,
      value: topPlayer[statField],
      allValues: playersWithStat.map((p: any) => ({ name: p.name, value: p[statField] })),
    })

    return topPlayer
  }

  const mostExpelledPlayer = getMostExpelledPlayer()
  const mostAssistsPlayer = getMostAssistsPlayer()
  const mostRecoveriesPlayer = getMostRecoveriesPlayer()
  const bestPenaltyPlayer = getBestPenaltyPlayer()

  const handleAddCustomCard = (statField: string, statLabel: string) => {
    setCustomCards([...customCards, { statField, statLabel }])
  }

  return (
    <section className="space-y-6">
      {/* Bloques principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AttackBlock playerStats={fieldPlayers} />
        <DefenseBlock playerStats={fieldPlayers} />
        <GoalkeeperBlock playerStats={goalkeepers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Jugador más expulsado */}
        {mostExpelledPlayer && (
          <PlayerStatCard
            title="Más Expulsado"
            icon={UserX}
            player={mostExpelledPlayer}
            statLabel="Más Expulsado"
            statValue={
              (mostExpelledPlayer.faltas_exp_3_bruta || 0) +
              (mostExpelledPlayer.faltas_exp_3_int || 0) +
              (mostExpelledPlayer.faltas_exp_20_1c1 || 0) +
              (mostExpelledPlayer.faltas_exp_20_boya || 0)
            }
            details={[
              { label: "Exp. sencilla", value: mostExpelledPlayer.faltas_exp_20_1c1 || 0 }
            ]}
          />
        )}

        {/* Más asistidor */}
        {mostAssistsPlayer && (
          <PlayerStatCard
            title="Más Asistidor"
            icon={Target}
            player={mostAssistsPlayer}
            statLabel="Más Asistidor"
            statValue={mostAssistsPlayer.acciones_asistencias || 0}
            details={[
              { label: "Goles", value: mostAssistsPlayer.goles_totales || 0 },
              { label: "Tiros", value: mostAssistsPlayer.tiros_totales || 0 },
            ]}
          />
        )}

        {/* Más recuperaciones */}
        {mostRecoveriesPlayer && (
          <PlayerStatCard
            title="Más Recuperaciones"
            icon={Activity}
            player={mostRecoveriesPlayer}
            statLabel="Más Recuperaciones"
            statValue={mostRecoveriesPlayer.acciones_recuperacion || 0}
            details={[
              { label: "Bloqueos", value: mostRecoveriesPlayer.acciones_bloqueo || 0 },
              { label: "Rebotes", value: mostRecoveriesPlayer.acciones_rebote || 0 },
            ]}
          />
        )}

        {/* Mayor eficiencia en penaltis */}
        {bestPenaltyPlayer && (
          <PlayerStatCard
            title="Mejor en Penaltis"
            icon={Crosshair}
            player={bestPenaltyPlayer}
            statLabel="Eficiencia en Penaltis"
            statValue={`${(
              ((bestPenaltyPlayer.goles_penalti_anotado || 0) /
                ((bestPenaltyPlayer.goles_penalti_anotado || 0) + (bestPenaltyPlayer.goles_penalti_fallo || 0))) *
                100
            ).toFixed(0)}%`}
            details={[
              { label: "Anotados", value: bestPenaltyPlayer.goles_penalti_anotado || 0 },
              { label: "Fallados", value: bestPenaltyPlayer.goles_penalti_fallo || 0 },
            ]}
          />
        )}

        {customCards.map((card, index) => {
          const topPlayer = getTopPlayerForStat(card.statField)
          if (!topPlayer) return null

          return (
            <PlayerStatCard
              key={`custom-${index}-${card.statField}`}
              title={card.statLabel}
              icon={Target}
              player={topPlayer}
              statLabel={card.statLabel}
              statValue={topPlayer[card.statField] || 0}
              details={[{ label: "Total", value: topPlayer[card.statField] || 0 }]}
            />
          )
        })}

        {/* Botón para añadir card personalizada */}
        <CustomStatCardDialog onAddCard={handleAddCustomCard} />
      </div>
    </section>
  )
}
