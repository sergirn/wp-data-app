"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Loader2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

type DeleteMatchButtonProps = {
	matchId: number;
	className?: string;
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	onDeleted?: (matchId: number) => void | Promise<void>;
};

export function DeleteMatchButton({ matchId, className = "", onClick, onDeleted }: DeleteMatchButtonProps) {
	const t = useTranslations("DeleteMatch");
	const common = useTranslations("Common");
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);
	const supabase = createClient();

	const handleDelete = async () => {
		setDeleting(true);
		try {
			const { data: deletedMatches, error } = await supabase
				.from("matches")
				.delete()
				.eq("id", matchId)
				.select("id, opponent_id");

			if (error) throw error;
			if (!deletedMatches?.some((match) => match.id === matchId)) {
				throw new Error("MATCH_NOT_DELETED");
			}

			const opponentId = deletedMatches.find((match) => match.id === matchId)?.opponent_id;
			if (opponentId != null) {
				const { count, error: remainingMatchesError } = await supabase
					.from("matches")
					.select("id", { count: "exact", head: true })
					.eq("opponent_id", opponentId);

				if (remainingMatchesError) console.error("Error checking remaining opponent matches:", remainingMatchesError);
				else if (count === 0) {
					const { error: opponentDeleteError } = await supabase.from("opponents").delete().eq("id", opponentId);
					if (opponentDeleteError) console.error("Error deleting orphaned opponent:", opponentDeleteError);
				}
			}

			if (onDeleted) {
				await onDeleted(matchId);
			} else {
				router.push("/partidos");
				router.refresh();
			}
		} catch (error) {
			console.error("Error deleting match:", error);
			const errorMessage = error instanceof Error
				? error.message
				: typeof error === "object" && error !== null && "message" in error
					? String(error.message)
					: "";

			if (errorMessage.includes("MATCH_LOCKED")) alert(t("lockedError"));
			else if (errorMessage.includes("MATCH_NOT_DELETED")) alert(t("notDeleted"));
			else alert(t("error"));
		} finally {
			setDeleting(false);
		}
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<button
					className={`group flex h-8 w-8 items-center justify-center rounded-md text-red-500/40 hover:text-red-600 transition-all duration-200 ${className}`}
					aria-label={t("buttonLabel")}
					onClick={(e) => {
						e.stopPropagation();
						onClick?.(e);
					}}
				>
					<Trash2 className="h-4 w-4 text-red-500/50 group-hover:text-red-600 transition-colors" />
				</button>
			</AlertDialogTrigger>

			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("title")}</AlertDialogTitle>
					<AlertDialogDescription>
						{t("description")}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel>{common("cancel")}</AlertDialogCancel>

					<AlertDialogAction
						onClick={handleDelete}
						disabled={deleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{deleting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t("deleting")}
							</>
						) : (
							t("delete")
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
