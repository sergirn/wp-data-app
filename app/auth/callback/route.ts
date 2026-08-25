import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
	return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const next = safeNextPath(requestUrl.searchParams.get("next"));

	if (code) {
		const supabase = await createClient();
		if (supabase) {
			const { error } = await supabase.auth.exchangeCodeForSession(code);
			if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin));
		}
	}

	const failedUrl = new URL("/auth/forgot-password", requestUrl.origin);
	failedUrl.searchParams.set("error", "invalid_link");
	return NextResponse.redirect(failedUrl);
}
