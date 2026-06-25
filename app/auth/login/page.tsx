"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [remember, setRemember] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			const supabase = createClient();
			const { data, error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});

			if (error) throw error;

			if (data.session) {
				document.cookie = `sb-access-token=${data.session.access_token}; path=/; ${remember ? "max-age=2592000;" : ""}`;
				window.location.href = "/";
				return;
			}

			setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
			setIsLoading(false);
		} catch {
			setError("Email o contraseña incorrectos");
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-background px-4 py-8 sm:px-6">
			<div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
				<div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
					{/* Header */}
					<div className="mb-6 text-center sm:mb-8">
						<div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-card shadow-sm sm:h-24 sm:w-24">
							<Image
								src="/icons/icon-192.png"
								alt="WaterpoloStats"
								width={96}
								height={96}
								priority
								className="h-full w-full object-cover"
							/>
						</div>

						<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">WaterpoloStats</h1>
						<p className="mt-1 text-sm text-muted-foreground">Sistema de estadísticas deportivas</p>
					</div>

					{/* Card */}
					<Card className="border bg-card shadow-sm">
						<CardContent className="p-5 sm:p-6 md:p-8">
							<div className="mb-6 ">
								<h2 className="text-xl font-semibold">Acceso al sistema</h2>
								<p className="mt-1 text-sm text-muted-foreground">Gestiona el rendimiento de tu equipo</p>
							</div>

							<form onSubmit={handleLogin} className="space-y-5">
								{/* Email */}
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										placeholder="tu@email.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										disabled={isLoading}
										autoComplete="email"
										className="h-11"
										required
									/>
								</div>

								{/* Password */}
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-3">
										<Label htmlFor="password">Contraseña</Label>
										<Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
											¿Olvidaste tu contraseña?
										</Link>
									</div>

									<div className="relative">
										<Input
											id="password"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											disabled={isLoading}
											autoComplete="current-password"
											className="h-11 pr-10"
											required
										/>
										<button
											type="button"
											onClick={() => setShowPassword((v) => !v)}
											aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
										>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									</div>
								</div>

								{error && (
									<Alert variant="destructive">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}

								<Button type="submit" className="h-11 w-full" disabled={isLoading || !email.trim() || !password.trim()}>
									{isLoading ? (
										<span className="flex items-center gap-2">
											<Loader2 className="h-4 w-4 animate-spin" />
											Entrando...
										</span>
									) : (
										"Entrar"
									)}
								</Button>
							</form>

							<div className="mt-4 space-y-2 text-center text-sm">
								<p className="text-muted-foreground">
									¿Aún no tienes acceso?{" "}
									<a
										href="mailto:sergirojasnavarro@gmail.com?subject=Solicitud%20de%20demo%20-%20WaterpoloStats"
										className="font-medium text-primary underline underline-offset-4"
									>
										Solicitar demo
									</a>
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Footer */}
					<div className="mt-6 flex flex-col items-center gap-3 text-center">
						<p className="text-xs text-muted-foreground">
							POWERED BY <span className="font-medium">TFT</span> &amp; <span className="font-medium">BWMF</span>
						</p>

						<div className="flex items-center justify-center gap-4 sm:gap-5">
							<Image
								src="/images/logo-sponsor/TFT_LOGO.webp"
								alt="TFT"
								width={60}
								height={60}
								className="h-10 w-auto object-contain sm:h-12 dark:invert dark:brightness-0 dark:contrast-200"
							/>

							<Image
								src="/images/logo-sponsor/bwmf.svg"
								alt="BWMF"
								width={86}
								height={38}
								className="h-7 w-auto object-contain sm:h-8"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
