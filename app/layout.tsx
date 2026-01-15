import type React from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ClientLayout from "./client-layout";
import "./globals.css";
import { getCurrentProfile, getCurrentClub, getAllClubs } from "@/lib/auth";
import { Suspense } from "react";

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-sans"
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-mono"
});

export const metadata: Metadata = {
	title: "Estadísticas Waterpolo - Sistema Multi-Club",
	description: "Sistema de estadísticas para equipos de waterpolo",
	generator: "v0.app"
};

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const profile = await getCurrentProfile();
	const currentClub = profile ? await getCurrentClub() : null;
	const allClubs = profile ? await getAllClubs() : [];

	return (
		<html lang="es" suppressHydrationWarning>
			<head>
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#000000" />
			</head>

			<body className={`font-sans ${geistSans.variable} ${geistMono.variable}`}>
				<Suspense fallback={<div>Loading...</div>}>
					<ClientLayout profile={profile} currentClub={currentClub} allClubs={allClubs}>
						{children}
					</ClientLayout>
				</Suspense>
				<Analytics />
			</body>
		</html>
	);
}
