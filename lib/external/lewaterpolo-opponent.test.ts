import { describe, expect, it } from "vitest";

import { parseExternalTeamIndex, resolveExternalTeam } from "./lewaterpolo-opponent";

function team(name: string, id: number, slug: string) {
	return `<a class="l26c-team" href="https://lewaterpolo.com/equipo/${id}-dhm-${slug}/"><span class="l26c-team__body"><img class="l26-crest" src="https://storage.lewaterpolo.com/teams/2026-2027/${slug}.png"><span class="l26c-team__txt"><b>${name}</b><small>Ciudad</small></span></span></a>`;
}

describe("LEWaterpolo opponent resolution", () => {
	const html = `<!doctype html>${[
		team("CN Barcelona", 88, "c-n-barcelona"),
		team("Zodiac CN Atlètic-Barceloneta", 87, "c-n-atletic-barceloneta"),
		team("Astralpool CN Sabadell", 95, "c-n-sabadell"),
		team("CN Terrassa", 98, "c-n-terrassa"),
		team("SolarTradex CN Mataró", 92, "c-n-mataro"),
		team("CN Sant Andreu", 96, "c-n-sant-andreu")
	].join("")}<!-- ${"padding ".repeat(600)} -->`;

	it("extracts only fixed LEWaterpolo team URLs", () => {
		const entries = parseExternalTeamIndex(html);
		expect(entries).toHaveLength(6);
		expect(entries[0]).toMatchObject({ name: "CN Barcelona", url: "https://lewaterpolo.com/equipo/88-dhm-c-n-barcelona" });
	});

	it("matches names despite accents, punctuation and sponsor prefixes", () => {
		const entries = parseExternalTeamIndex(html);
		expect(resolveExternalTeam(entries, ["C.N. Barcelona"])?.name).toBe("CN Barcelona");
		expect(resolveExternalTeam(entries, ["CN Sabadell"])?.name).toBe("Astralpool CN Sabadell");
		expect(resolveExternalTeam(entries, ["CN Atletic-Barceloneta"])?.name).toBe("Zodiac CN Atlètic-Barceloneta");
	});

	it("does not invent a link for an unknown abbreviation", () => {
		const entries = parseExternalTeamIndex(html);
		expect(resolveExternalTeam(entries, ["Unknown WP"])).toBeNull();
	});
});
