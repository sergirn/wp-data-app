"use client";

import { useState } from "react";
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

export function DeleteMatchButton({ matchId, className = "", onClick }: { matchId: number; className?: string; onClick?: (e?: any) => void }) {
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);
	const supabase = createClient();

	const handleDelete = async () => {
		setDeleting(true);
		try {
			const { error } = await supabase.from("matches").delete().eq("id", matchId);

			if (error) throw error;

			router.push("/partidos");
			router.refresh();
		} catch (error) {
			console.error("Error deleting match:", error);
			alert("Error al eliminar el partido");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<button
					className={`group flex h-8 w-8 items-center justify-center rounded-md 
                               text-red-500/40 hover:text-red-600 
                               transition-all duration-200 ${className}`}
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
					<AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará el partido y todas sus estadísticas de forma permanente.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>

					<AlertDialogAction
						onClick={handleDelete}
						disabled={deleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{deleting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Eliminando...
							</>
						) : (
							"Eliminar"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
