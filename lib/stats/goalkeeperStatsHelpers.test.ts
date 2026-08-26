import { describe, expect, it } from "vitest";

import { accumulateGoalkeeperStats, getGoalkeeperDerived } from "./goalkeeperStatsHelpers";

describe("goalkeeper wing goals", () => {
	it("counts wing goals as conceded goals and shots received", () => {
		const derived = getGoalkeeperDerived({ portero_goles_extremo: 2, portero_tiros_parada_recup: 3 });

		expect(derived.goalsConceded).toBe(2);
		expect(derived.shotsReceived).toBe(5);
		expect(derived.savePct).toBe(60);
	});

	it("accumulates wing goals across matches", () => {
		const totals = accumulateGoalkeeperStats([{ portero_goles_extremo: 1 }, { portero_goles_extremo: 2 }]);

		expect(totals.portero_goles_extremo).toBe(3);
	});
});
