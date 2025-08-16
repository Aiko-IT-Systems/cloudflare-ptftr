import { Str, Num } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

/**
 * Zod schema for a generic OAuth request.
 * Includes client_id, response_type, redirect_uri, scope, and state.
 */
const OAuthRequest = z.object({
	client_id: Str({ required: true }),
	response_type: Str({ required: true, default: "code", example: "code" }),
	redirect_uri: Str({
		example: "https://example.com/callback",
		required: true,
	}),
	scope: Str({ required: true }),
	state: Str({ required: true }),
});

/**
 * Zod schema for exchanging an OAuth code for a token.
 * Includes grant_type, code, and redirect_uri.
 */
const OAuthExchange = z.object({
	grant_type: Str({
		required: true,
		default: "authorization_code",
		example: "authorization_code",
	}),
	code: Str({ required: true }),
	redirect_uri: Str({
		example: "https://example.com/callback",
		required: true,
	}),
});

/**
 * Zod schema for an OAuth token response.
 * Includes access_token, refresh_token, expires_in, scope, and token_type.
 */
const OAuthToken = z.object({
	access_token: Str({ required: true }),
	refresh_token: Str({ required: true }),
	expires_in: Num({ required: true }),
	scope: Str({ required: true }),
	token_type: Str({ required: true, example: "Bearer" }),
});

/**
 * Zod schema for revoking an OAuth token.
 * Includes token and token_type_hint.
 */
const OAuthRevocation = z.object({
	token: Str({ required: true }),
	token_type_hint: Str({ required: true, default: "access_token", example: "refresh_token" }),
});

/**
 * Patreon OAuth exchange schema.
 * Extends OAuthExchange with client_id and client_secret.
 */
export const PatreonOAuthExchange = OAuthExchange.merge(
	z.object({
		client_id: Str({ required: true }),
		client_secret: Str({ required: true }),
	})
);

/**
 * Patreon OAuth revocation schema.
 * Extends OAuthRevocation with client_id and client_secret.
 */
export const PatreonOAuthRevocation = OAuthRevocation.merge(
	z.object({
		client_id: Str({ required: true }),
		client_secret: Str({ required: true }),
	})
);

/**
 * Patreon OAuth request schema.
 * Extends the generic OAuthRequest schema.
 */
export const PatreonOAuthRequest = OAuthRequest;

/**
 * Patreon OAuth response schema.
 * Uses the generic OAuthToken schema.
 */
export const PatreonOAuthResponse = OAuthToken;

/**
 * Type for Patreon OAuth request parameters.
 */
export type PatreonOAuthRequestType = z.infer<typeof PatreonOAuthRequest>;

/**
 * Type for Patreon OAuth exchange parameters.
 */
export type PatreonOAuthExchangeType = z.infer<typeof PatreonOAuthExchange>;

/**
 * Type for Patreon OAuth response.
 */
export type PatreonOAuthResponseType = z.infer<typeof PatreonOAuthResponse>;

/**
 * Type for Patreon OAuth revocation parameters.
 */
export type PatreonOAuthRevocationType = z.infer<typeof PatreonOAuthRevocation>;

/**
 * Application context type for Hono with custom bindings.
 */
export type AppContext = Context<{ Bindings: Env }>;

/**
 * Status of a guild member addition attempt.
 */
export enum GuildMemberAddStatus {
	Unknown = "unknown",
	AlreadyMember = "already_member",
	Added = "added",
	Failed = "failed",
}

/**
 * State of the operation.
 */
export enum OperationState {
	NotStarted = "not_started",
	GuildAdd = "guild_add",
	RolePatch = "role_patch",
	Failure = "failure",
	Catastrophic = "catastrophic"
}

/**
 * Type representing a Patreon API v2 identity response (patreonWhoami).
 */
export interface PatreonWhoamiResponse {
	data: {
		id: string;
		type: "user";
		attributes: {
			about: string | null;
			created: string;
		};
		relationships: {
			memberships: {
				data: Array<{
					id: string;
					type: "member";
				}>;
			};
			campaign: {
				data: {
					id: string;
					type: "campaign";
				};
				links: {
					related: string;
				};
			};
		};
	};
	included: Array<
		| {
				id: string;
				type: "campaign";
				attributes: {
					summary: string;
					creation_name: string;
					is_monthly: boolean;
				};
		  }
		| {
				id: string;
				type: "member";
				attributes: {
					patron_status: string | null;
					currently_entitled_amount_cents: number;
					pledge_cadence: number | null;
					is_free_trial: boolean;
				};
		  }
	>;
	links: {
		self: string;
	};
}

/**
 * Type representing a Patreon API v2 membership response (PatreonMembershipResponse).
 */
export interface PatreonMembershipResponse {
	data: {
		id: string;
		type: "member";
		attributes: {
			is_follower: boolean;
			last_charge_date: string | null;
		};
		relationships: {
			currently_entitled_tiers: {
				data: Array<{
					id: string;
					type: "tier";
				}>;
			};
			user: {
				data: {
					id: string;
					type: "user";
				};
				links: {
					related: string;
				};
			};
		};
	};
	included: Array<
		| {
				id: string;
				type: "user";
				attributes: Record<string, unknown>;
		  }
		| {
				id: string;
				type: "tier";
				attributes: Record<string, unknown>;
		  }
	>;
	links: {
		self: string;
	};
}
