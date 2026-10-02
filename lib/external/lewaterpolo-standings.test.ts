import { describe, expect, it } from "vitest";

import { parseLeWaterpoloStandings } from "./lewaterpolo-standings";

function row(position: number, name: string, shortName: string) {
	return `<tr>
		<td>${position}</td>
		<td><a class="l26-teamlink"><img src="https://storage.lewaterpolo.com/team-${position}.png"><span><span class="l26c-nfull">${name}</span><span class="l26c-nshort">${shortName}</span></span></a></td>
		<td>3</td><td>2</td><td>1</td><td>0</td><td>0</td><td>${30 + position}</td><td>${20 + position}</td><td>10</td><td>6</td>
		<td><span class="l26-form__pill l26-form__pill--w">V</span><span class="l26-form__pill l26-form__pill--l">D</span></td>
	</tr>`;
}

function document(rows: string) {
	return `<!doctype html><html><body>
		<h1>Temporada 2026-2027 · tras la jornada 3</h1>
		<div data-l26-panel="l26c-clas:general"><table class="l26-table l26c-standings"><tbody>${rows}</tbody></table></div>
		<!-- ${"padding ".repeat(120)} -->
	</body></html>`;
}

describe("parseLeWaterpoloStandings", () => {
	it("extracts and normalizes the general league table", () => {
		const html = document([
			row(1, "CN Barcelona", "BAR"),
			row(2, "CN Atlètic-Barceloneta", "CAB"),
			row(3, "CN Sabadell", "SAB"),
			row(4, "CN Terrassa", "TER"),
			row(5, "CN Mataró", "MAT"),
			row(6, "CN Sant Andreu", "CNSA")
		].join(""));

		const result = parseLeWaterpoloStandings(html, "2026-2027");

		expect(result.round).toBe(3);
		expect(result.teams).toHaveLength(6);
		expect(result.teams[0]).toMatchObject({
			position: 1,
			team: "CN Barcelona",
			shortName: "BAR",
			played: 3,
			won: 2,
			lost: 1,
			goalsFor: 31,
			goalsAgainst: 21,
			goalDifference: 10,
			points: 6,
			form: ["W", "L"]
		});
	});

	it("rejects data from a different season", () => {
		const html = document(Array.from({ length: 6 }, (_, index) => row(index + 1, `Team ${index + 1}`, `T${index + 1}`)).join(""));
		expect(() => parseLeWaterpoloStandings(html, "2025-2026")).toThrow("Unexpected standings season");
	});

	it("rejects an incomplete response instead of displaying misleading data", () => {
		const html = document(row(1, "Only Team", "ONE"));
		expect(() => parseLeWaterpoloStandings(html, "2026-2027")).toThrow("Implausible number of teams");
	});
});
