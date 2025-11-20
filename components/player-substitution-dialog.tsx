"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Player } from "@/lib/types";

interface PlayerSubstitutionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentPlayer: Player;
	availablePlayers: Player[];
	onSubstitute: (newPlayerId: number) => void;
	onRemove?: (playerId: number) => void;
}

export function PlayerSubstitutionDialog({
	open,
	onOpenChange,
	currentPlayer,
	availablePlayers,
	onSubstitute,
	onRemove
}: PlayerSubstitutionDialogProps) {
	const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
	const [removeMode, setRemoveMode] = useState(false);

	const handleSubstitute = () => {
		if (selectedPlayerId) {
			onSubstitute(Number.parseInt(selectedPlayerId));
			setSelectedPlayerId("");
			setRemoveMode(false);
			onOpenChange(false);
		}
	};

	const handleRemove = () => {
		if (onRemove) {
			onRemove(currentPlayer.id);
			setRemoveMode(false);
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<RefreshCw className="h-5 w-5" />
						Sustituir Jugador
					</DialogTitle>
					<DialogDescription>
						{removeMode ? `¿Desconvocar a ${currentPlayer.name}?` : `Sustituye a ${currentPlayer.name} por otro jugador o desconvócalo`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>Solo puedes sustituir jugadores que no tengan estadísticas registradas en este partido.</AlertDescription>
					</Alert>

					{removeMode ? (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								Esto dejará el puesto vacío en la alineación. Podrás convocarlo de nuevo más tarde.
							</p>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setRemoveMode(false)}>
									Cancelar
								</Button>
								<Button variant="destructive" onClick={handleRemove}>
									<Trash2 className="mr-2 h-4 w-4" />
									Confirmar Desconvocatoria
								</Button>
							</div>
						</div>
					) : (
						<>
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
								{onRemove && (
									<Button variant="secondary" onClick={() => setRemoveMode(true)}>
										<Trash2 className="mr-2 h-4 w-4" />
										Desconvocar
									</Button>
								)}
								<Button onClick={handleSubstitute} disabled={!selectedPlayerId || availablePlayers.length === 0}>
									<RefreshCw className="mr-2 h-4 w-4" />
									Sustituir
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
