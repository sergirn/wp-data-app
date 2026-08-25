"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
	const t = useTranslations("PasswordRecovery");
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(searchParams.get("error") === "invalid_link" ? t("invalidLink") : null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim(), website: "" })
			});

			if (response.status === 429) {
				setError(t("rateLimited"));
				return;
			}
			if (!response.ok) {
				setError(t("requestError"));
				return;
			}

			setSent(true);
		} catch {
			setError(t("requestError"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-8">
			<Card className="w-full max-w-md shadow-lg">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
						<Mail className="size-6" />
					</div>
					<CardTitle className="text-2xl">{t("title")}</CardTitle>
					<p className="text-sm text-muted-foreground">{t("description")}</p>
				</CardHeader>
				<CardContent>
					{sent ? (
						<div className="space-y-5">
							<Alert>
								<CheckCircle2 className="size-4" />
								<AlertDescription>{t("success")}</AlertDescription>
							</Alert>
							<Button asChild className="w-full">
								<Link href="/auth/login">{t("backToLogin")}</Link>
							</Button>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="space-y-2">
								<Label htmlFor="recovery-email">{t("email")}</Label>
								<Input
									id="recovery-email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder={t("emailPlaceholder")}
									disabled={loading}
									required
								/>
							</div>

							{error ? (
								<Alert variant="destructive">
									<AlertCircle className="size-4" />
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							) : null}

							<Button type="submit" className="w-full" disabled={loading || !email.trim()}>
								{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
								{loading ? t("sending") : t("send")}
							</Button>
							<Button asChild variant="ghost" className="w-full">
								<Link href="/auth/login"><ArrowLeft className="mr-2 size-4" />{t("backToLogin")}</Link>
							</Button>
						</form>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
