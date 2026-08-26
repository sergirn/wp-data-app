import { describe, expect, it } from "vitest";

import { buildTeamDashboardStats } from "./buildTeamDashboardStats";

describe("buildTeamDashboardStats", () => {
	it("exposes accumulated wing goals for goalkeeper dashboard cards", () => {
		const [goalkeeper] = buildTeamDashboardStats(
			[{ id: 13, name: "Portero", is_goalkeeper: true }],
			[
				{ player_id: 13, portero_goles_extremo: 1 },
				{ player_id: 13, portero_goles_extremo: 2 }
			]
		);

		expect(goalkeeper.portero_goles_extremo).toBe(3);
	});
});
