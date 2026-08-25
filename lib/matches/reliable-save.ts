import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const nullableInteger = z.number().int().nullable();

const matchSchema = z.object({
	id: nullableInteger,
	club_id: z.number().int().positive(),
	match_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	opponent: z.string().trim().min(1).max(200),
	location: z.string().trim().max(300).nullable(),
	home_score: z.number().int().nonnegative(),
	away_score: z.number().int().nonnegative(),
	is_home: z.boolean(),
	season: z.string().trim().max(40).nullable(),
	jornada: nullableInteger,
	notes: z.string().max(10_000).nullable(),
	q1_score: z.number().int().nonnegative(),
	q2_score: z.number().int().nonnegative(),
	q3_score: z.number().int().nonnegative(),
	q4_score: z.number().int().nonnegative(),
	q1_score_rival: z.number().int().nonnegative(),
	q2_score_rival: z.number().int().nonnegative(),
	q3_score_rival: z.number().int().nonnegative(),
	q4_score_rival: z.number().int().nonnegative(),
	sprint1_winner: nullableInteger,
	sprint2_winner: nullableInteger,
	sprint3_winner: nullableInteger,
	sprint4_winner: nullableInteger,
	sprint1_winner_player_id: nullableInteger,
	sprint2_winner_player_id: nullableInteger,
	sprint3_winner_player_id: nullableInteger,
	sprint4_winner_player_id: nullableInteger,
	max_players_on_field: z.number().int().nonnegative(),
	penalty_home_score: nullableInteger,
	penalty_away_score: nullableInteger,
	competition_id: nullableInteger,
	stats_enabled: z.boolean()
});

const statSchema = z.object({
	player_id: z.number().int().positive()
}).catchall(z.union([z.number(), z.string(), z.boolean(), z.null()]));

const actionSchema = z.object({
	client_id: z.string().uuid(),
	player_id: z.number().int().positive(),
	quarter: z.number().int().min(1).max(4),
	sequence: z.number().int().positive(),
	action_key: z.string().trim().min(1).max(120)
});

const penaltySchema = z.object({
	player_id: nullableInteger,
	shot_order: z.number().int().positive(),
	scored: z.boolean(),
	result_type: z.enum(["scored", "missed", "saved"]),
	goalkeeper_id: nullableInteger
});

const goalkeeperShotSchema = z.object({
	goalkeeper_player_id: z.number().int().positive(),
	quarter: z.number().int().min(1).max(4).nullable(),
	shot_index: z.number().int().positive(),
	result: z.enum(["goal", "save", "out"]),
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1)
});

export const matchSavePayloadSchema = z.object({
	draft_key: z.string().trim().min(1).max(160).nullable(),
	match: matchSchema,
	stats: z.array(statSchema).min(1).max(30),
	actions: z.array(actionSchema).max(5_000),
	penalties: z.array(penaltySchema).max(100),
	goalkeeper_shots: z.array(goalkeeperShotSchema).max(2_000)
});

export type MatchSavePayload = z.infer<typeof matchSavePayloadSchema>;

export type MatchSaveResult = {
	matchId: number;
	version: number;
	alreadyProcessed: boolean;
	updatedAt: string;
};

export type MatchSaveErrorCode =
	| "AUTH_REQUIRED"
	| "FORBIDDEN"
	| "INVALID_PAYLOAD"
	| "MATCH_NOT_FOUND"
	| "MATCH_VERSION_CONFLICT"
	| "PLAYER_OUTSIDE_CLUB"
	| "PLAYER_OUTSIDE_LINEUP"
	| "DUPLICATE_PLAYERS"
	| "DUPLICATE_ACTIONS"
	| "DUPLICATE_PENALTY_ORDER"
	| "SAVE_RPC_NOT_INSTALLED"
	| "SAVE_FAILED";

export class MatchSaveError extends Error {
	constructor(
		public readonly code: MatchSaveErrorCode,
		message: string,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = "MatchSaveError";
	}
}

function getErrorCode(error: { message?: string; code?: string } | null): MatchSaveErrorCode {
	const message = error?.message ?? "";
	const knownCodes: MatchSaveErrorCode[] = [
		"AUTH_REQUIRED",
		"FORBIDDEN",
		"INVALID_PAYLOAD",
		"MATCH_NOT_FOUND",
		"MATCH_VERSION_CONFLICT",
		"PLAYER_OUTSIDE_CLUB",
		"PLAYER_OUTSIDE_LINEUP",
		"DUPLICATE_PLAYERS",
		"DUPLICATE_ACTIONS",
		"DUPLICATE_PENALTY_ORDER"
	];
	const matched = knownCodes.find((code) => message.includes(code));
	if (matched) return matched;
	if (error?.code === "PGRST202" || message.includes("save_match_bundle")) return "SAVE_RPC_NOT_INSTALLED";
	return "SAVE_FAILED";
}

export function stripManagedStatFields(stat: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(stat).filter(
			([key, value]) => !["id", "match_id", "created_at"].includes(key) && value !== undefined
		)
	);
}

export async function createSaveId(payload: MatchSavePayload) {
	const encoded = new TextEncoder().encode(JSON.stringify(payload));
	const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
	const bytes = digest.slice(0, 16);
	bytes[6] = (bytes[6] & 0x0f) | 0x50;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function saveMatchBundle(
	supabase: SupabaseClient,
	input: MatchSavePayload,
	expectedVersion: number | null
): Promise<MatchSaveResult> {
	const parsed = matchSavePayloadSchema.safeParse(input);
	if (!parsed.success) {
		throw new MatchSaveError("INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid match payload", parsed.error);
	}

	const saveId = await createSaveId(parsed.data);
	const { data, error } = await supabase.rpc("save_match_bundle", {
		p_payload: parsed.data,
		p_save_id: saveId,
		p_expected_version: expectedVersion
	});

	if (error) {
		const code = getErrorCode(error);
		throw new MatchSaveError(code, error.message, error);
	}

	const result = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
	if (!result || !Number.isInteger(Number(result.match_id)) || !Number.isInteger(Number(result.version))) {
		throw new MatchSaveError("SAVE_FAILED", "Supabase returned an invalid save result");
	}

	return {
		matchId: Number(result.match_id),
		version: Number(result.version),
		alreadyProcessed: Boolean(result.already_processed),
		updatedAt: String(result.updated_at ?? new Date().toISOString())
	};
}
