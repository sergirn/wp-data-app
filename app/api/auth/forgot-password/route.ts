import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendPasswordResetNotification } from "@/lib/auth/password-reset-notification";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
	email: z.string().trim().email().max(320),
	website: z.string().max(200).optional().default("")
});

function getSiteUrl(request: Request) {
	const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
	if (configured) return configured.replace(/\/$/, "");
	return new URL(request.url).origin;
}

async function findProfile(email: string) {
	const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceRoleKey) return null;

	const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
	const { data } = await admin
		.from("profiles")
		.select("full_name, club_id")
		.eq("email", email)
		.maybeSingle();
	return data;
}

export async function POST(request: Request) {
	const parsed = requestSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json({ error: "invalid_data" }, { status: 400 });
	if (parsed.data.website) return NextResponse.json({ success: true });

	const supabase = await createClient();
	if (!supabase) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });

	const email = parsed.data.email.toLowerCase();
	const callbackUrl = new URL("/auth/callback", getSiteUrl(request));
	callbackUrl.searchParams.set("next", "/auth/reset-password");

	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: callbackUrl.toString()
	});

	if (error) {
		console.error("Password reset request failed:", error.message);
		const isRateLimited = error.status === 429 || /rate limit/i.test(error.message);
		return NextResponse.json({ error: isRateLimited ? "rate_limited" : "request_failed" }, { status: isRateLimited ? 429 : 503 });
	}

	// Supabase deliberately returns success for unknown addresses. Notify the
	// administrator only when the address belongs to a real application profile.
	const profile = await findProfile(email).catch(() => null);
	if (profile) {
		await sendPasswordResetNotification({
			email,
			fullName: profile.full_name,
			clubId: profile.club_id,
			requestedAt: new Date().toISOString()
		}).catch((notificationError) => console.error("Password reset admin notification failed:", notificationError));
	}

	return NextResponse.json({ success: true });
}
