"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
	const t = useTranslations("PasswordRecovery");
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);
	const [validSession, setValidSession] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const supabase = createClient();
		let mounted = true;
		void supabase.auth.getUser().then(({ data }) => {
			if (!mounted) return;
			setValidSession(Boolean(data.user));
			setCheckingSession(false);
		});
		const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
			if (!mounted) return;
			if (event === "PASSWORD_RECOVERY" || session?.user) {
				setValidSession(true);
				setCheckingSession(false);
			}
		});
		return () => {
			mounted = false;
			listener.subscription.unsubscribe();
		};
	}, []);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		if (password.length < 8) {
			setError(t("passwordLength"));
			return;
		}
		if (password !== confirmation) {
			setError(t("passwordMismatch"));
			return;
		}

		setSaving(true);
		const supabase = createClient();
		const { error: updateError } = await supabase.auth.updateUser({ password });
		if (updateError) {
			setError(t("updateError"));
			setSaving(false);
			return;
		}

		setSaved(true);
		await supabase.auth.signOut({ scope: "local" });
		window.setTimeout(() => router.replace("/auth/login?reset=success"), 1200);
	};

	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-8">
			<Card className="w-full max-w-md shadow-lg">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="size-6" /></div>
					<CardTitle className="text-2xl">{t("resetTitle")}</CardTitle>
					<p className="text-sm text-muted-foreground">{t("resetDescription")}</p>
				</CardHeader>
				<CardContent>
					{checkingSession ? (
						<div className="flex items-center justify-center py-8"><Loader2 className="size-6 animate-spin text-primary" /></div>
					) : !validSession ? (
						<Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{t("invalidLink")}</AlertDescription></Alert>
					) : saved ? (
						<Alert><CheckCircle2 className="size-4" /><AlertDescription>{t("updated")}</AlertDescription></Alert>
					) : (
						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="space-y-2">
								<Label htmlFor="new-password">{t("newPassword")}</Label>
								<div className="relative">
									<Input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-10" required />
									<button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? t("hidePassword") : t("showPassword")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><span className="sr-only">{showPassword ? t("hidePassword") : t("showPassword")}</span>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
								<Input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
							</div>
							{error ? <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert> : null}
							<Button type="submit" className="w-full" disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{saving ? t("updating") : t("update")}</Button>
						</form>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
