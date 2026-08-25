import { describe, expect, it } from "vitest";

import { buildPasswordResetNotificationText } from "./password-reset-notification";

describe("password reset notification", () => {
	it("includes the requesting user without exposing a reset token", () => {
		const text = buildPasswordResetNotificationText({
			email: "coach@example.com",
			fullName: "Coach Example",
			clubId: 7,
			requestedAt: "2026-08-25T10:00:00.000Z"
		});

		expect(text).toContain("coach@example.com");
		expect(text).toContain("Coach Example");
		expect(text).not.toMatch(/token|contraseña nueva/i);
	});
});
