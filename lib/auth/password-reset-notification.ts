const DEFAULT_NOTIFICATION_TO = "sergirojasnavarro@gmail.com";

type PasswordResetNotification = {
	email: string;
	requestedAt: string;
	fullName?: string | null;
	clubId?: number | null;
};

export function buildPasswordResetNotificationText(input: PasswordResetNotification) {
	return [
		"Se ha solicitado recuperar una contraseña en WaterpoloStats.",
		"",
		`Usuario: ${input.fullName?.trim() || "Sin nombre"}`,
		`Email: ${input.email}`,
		`Club ID: ${input.clubId ?? "Sin club"}`,
		`Fecha: ${input.requestedAt}`,
		"",
		"Supabase ha enviado el enlace de recuperación directamente al usuario."
	].join("\n");
}

export async function sendPasswordResetNotification(input: PasswordResetNotification) {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.PASSWORD_RESET_NOTIFICATION_FROM;
	const to = process.env.PASSWORD_RESET_NOTIFICATION_TO || DEFAULT_NOTIFICATION_TO;

	if (!apiKey || !from) {
		return { sent: false as const, reason: "not_configured" as const };
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			from,
			to: [to],
			subject: "Solicitud de recuperación de contraseña · WaterpoloStats",
			text: buildPasswordResetNotificationText(input)
		}),
		cache: "no-store"
	});

	if (!response.ok) {
		throw new Error(`Password reset notification failed (${response.status})`);
	}

	return { sent: true as const };
}
