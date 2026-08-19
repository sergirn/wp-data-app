"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Loader2, Shield, User, Mail } from "lucide-react";
import { StatWeightsConfig } from "@/components/StatWeightsConfig";
import { useTranslations } from "next-intl";

export default function AjustesPage() {
	const t = useTranslations("Pages");
	const settings = useTranslations("Settings");
	const common = useTranslations("Common");
	const { theme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setMounted(true);
		loadProfile();
	}, []);

	const loadProfile = async () => {
		const supabase = createClient();
		if (!supabase) {
			setLoading(false);
			return;
		}

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (user) {
			const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
			setProfile(profileData);
		}
		setLoading(false);
	};

	const getRoleBadge = (role: string) => {
		const badges = {
			admin: { label: settings("roles.admin"), variant: "destructive" as const },
			coach: { label: settings("roles.coach"), variant: "default" as const },
			viewer: { label: settings("roles.viewer"), variant: "secondary" as const }
		};
		return badges[role as keyof typeof badges] || badges.viewer;
	};

	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-8">
				<div className="max-w-2xl mx-auto space-y-6">
					<div>
						<h1 className="text-3xl font-bold mb-2">{t("settings")}</h1>
						<p className="text-muted-foreground">{settings("subtitle")}</p>
					</div>

					{loading ? (
						<Card>
							<CardContent className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-primary" />
							</CardContent>
						</Card>
					) : profile ? (
						<Card>
							<CardHeader>
								<CardTitle>{settings("profileTitle")}</CardTitle>
								<CardDescription>{settings("profileDescription")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center gap-3">
									<div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
										<User className="h-8 w-8 text-primary-foreground" />
									</div>
									<div className="flex-1">
										<p className="font-semibold text-lg">{profile.full_name || common("user")}</p>
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<Mail className="h-3 w-3" />
											{profile.email}
										</div>
									</div>
								</div>
								<div className="pt-4 border-t">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Shield className="h-4 w-4 text-muted-foreground" />
											<span className="text-sm font-medium">{settings("role")}</span>
										</div>
										<Badge variant={getRoleBadge(profile.role).variant}>{getRoleBadge(profile.role).label}</Badge>
									</div>
									<p className="text-xs text-muted-foreground mt-2">
										{profile.role === "admin" && settings("permissions.admin")}
										{profile.role === "coach" && settings("permissions.coach")}
										{profile.role === "viewer" && settings("permissions.viewer")}
									</p>
								</div>
							</CardContent>
						</Card>
					) : null}

					<Card>
						<CardHeader>
							<CardTitle>{settings("appearance")}</CardTitle>
							<CardDescription>{settings("appearanceDescription")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label className="text-base">{settings("theme")}</Label>
									<p className="text-sm text-muted-foreground">
										{mounted ? (theme === "dark" ? settings("darkEnabled") : settings("lightEnabled")) : common("loading")}
									</p>
								</div>
								<ThemeToggle />
							</div>
							<p className="text-sm text-muted-foreground">
								{settings("darkHint")}
							</p>
						</CardContent>
					</Card>

					<StatWeightsConfig />

					<Card>
						<CardHeader>
							<CardTitle>{settings("information")}</CardTitle>
							<CardDescription>{settings("informationDescription")}</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">{settings("version")}</span>
									<span className="font-medium">1.0.0</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">{settings("club")}</span>
									<span className="font-medium">CN Sant Andreu</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">{settings("sport")}</span>
									<span className="font-medium">Waterpolo</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
