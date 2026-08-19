import type React from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ClientLayout from "./client-layout";
import "./globals.css";
import { getCurrentProfile, getCurrentClub, getAllClubs } from "@/lib/auth";
import { Suspense } from "react";
import { Bai_Jamjuree } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-sans"
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-mono"
});

const baiJamjuree = Bai_Jamjuree({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	variable: "--font-sans",
	display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("Metadata");
	return {
		title: t("title"),
		description: t("description"),
		generator: "v0.app"
	};
}

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const profile = await getCurrentProfile();
	const currentClub = profile ? await getCurrentClub() : null;
	const allClubs = profile ? await getAllClubs() : [];
	const locale = await getLocale();

	return (
		<html lang={locale} className={baiJamjuree.variable} suppressHydrationWarning>
			<head>
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#000000" />
			</head>

			<body className={baiJamjuree.className}>
				<NextIntlClientProvider>
				<SerwistProvider swUrl="/serwist/sw.js">
					<Suspense fallback={<div aria-hidden="true" className="min-h-screen" />}>
						<ClientLayout profile={profile} currentClub={currentClub} allClubs={allClubs}>
							{children}
						</ClientLayout>
					</Suspense>
					<Analytics />
				</SerwistProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
