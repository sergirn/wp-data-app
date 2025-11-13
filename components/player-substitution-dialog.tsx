"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Player } from "@/lib/types"

interface PlayerSubstitutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlayer: Player
  availablePlayers: Player[]
  onSubstitute: (newPlayerId: number) => void
}

export function PlayerSubstitutionDialog({
  open,
  onOpenChange,
  currentPlayer,
  availablePlayers,
  onSubstitute,
}: PlayerSubstitutionDialogProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")

  const handleSubstitute = () => {
    if (selectedPlayerId) {
      onSubstitute(Number.parseInt(selectedPlayerId))
      setSelectedPlayerId("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sustituir Jugador
          </DialogTitle>
          <DialogDescription>
            Sustituye a <span className="font-semibold">{currentPlayer.name}</span> por otro jugador de la plantilla
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Solo puedes sustituir jugadores que no tengan estadísticas registradas en este partido.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="replacement-player">Selecciona el jugador sustituto</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger id="replacement-player">
                <SelectValue placeholder="Elige un jugador..." />
              </SelectTrigger>
              <SelectContent>
                {availablePlayers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">No hay jugadores disponibles</div>
                ) : (
                  availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      #{player.number} - {player.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubstitute} disabled={!selectedPlayerId || availablePlayers.length === 0}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sustituir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
