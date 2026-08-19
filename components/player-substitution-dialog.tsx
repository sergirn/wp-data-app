"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Player } from "@/lib/types";
import { useTranslations } from "next-intl";

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
	const t = useTranslations("Substitution");
	const common = useTranslations("Common");
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
						{t("title")}
					</DialogTitle>
					<DialogDescription>
						{removeMode ? t("removeQuestion", { player: currentPlayer.name }) : t("description", { player: currentPlayer.name })}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{t("statsWarning")}</AlertDescription>
					</Alert>

					{removeMode ? (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								{t("removeHint")}
							</p>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setRemoveMode(false)}>
									{common("cancel")}
								</Button>
								<Button variant="destructive" onClick={handleRemove}>
									<Trash2 className="mr-2 h-4 w-4" />
									{t("confirmRemoval")}
								</Button>
							</div>
						</div>
					) : (
						<>
							<div className="space-y-2">
								<Label htmlFor="replacement-player">{t("selectReplacement")}</Label>
								<Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
									<SelectTrigger id="replacement-player">
									<SelectValue placeholder={t("choosePlayer")} />
									</SelectTrigger>
									<SelectContent>
										{availablePlayers.length === 0 ? (
										<div className="p-2 text-sm text-muted-foreground text-center">{t("noPlayers")}</div>
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
									{common("cancel")}
								</Button>
								{onRemove && (
									<Button variant="secondary" onClick={() => setRemoveMode(true)}>
										<Trash2 className="mr-2 h-4 w-4" />
										{t("remove")}
									</Button>
								)}
								<Button onClick={handleSubstitute} disabled={!selectedPlayerId || availablePlayers.length === 0}>
									<RefreshCw className="mr-2 h-4 w-4" />
									{t("substitute")}
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
