import {
	GuildMemberAddStatus,
	PatreonOAuthExchange,
	PatreonOAuthExchangeType,
	PatreonOAuthResponseType,
	PatreonOAuthRevocation,
	PatreonOAuthRevocationType,
	PatreonMembershipResponse,
	PatreonOAuthRequestType,
	PatreonWhoamiResponse,
} from "./types";
import type { Context } from "hono";
import {
	OAuth2Routes,
	RESTGetAPICurrentUserGuildsResult,
	RESTGetAPIUserResult,
	RESTOAuth2AuthorizationQuery,
	RESTPostOAuth2AccessTokenResult,
	RESTPostOAuth2AccessTokenURLEncodedData,
	RESTPostOAuth2TokenRevocationQuery,
	RESTPutAPIGuildMemberJSONBody,
	RouteBases,
	Routes,
} from "discord-api-types/v10";
import { env } from "cloudflare:workers";
import { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Generates a redirect response to Discord's OAuth2 authorization endpoint.
 * @param request - The Discord OAuth request parameters.
 * @returns A Response object that redirects to Discord's OAuth2 authorization page.
 */
export function toDiscordRedirect(
	request: RESTOAuth2AuthorizationQuery
): Response {
	return Response.redirect(
		`${OAuth2Routes.authorizationURL}?${new URLSearchParams(
			request as any
		).toString()}`,
		302
	);
}

/**
 * Redirects the user to the Patreon finish page.
 * @returns A Response object that redirects to the Patreon finish page.
 */
export function toPatreonFinishRedirect(): Response {
	return Response.redirect(env.PATREON_ACCOUNT, 302);
}

/**
 * Generates a redirect response to Patreon's OAuth2 authorization endpoint.
 * @param request - The Patreon OAuth request parameters.
 * @returns A Response object that redirects to Patreon's OAuth2 authorization page.
 */
export function toPatreonRedirect(request: PatreonOAuthRequestType): Response {
	return Response.redirect(
		`https://www.patreon.com/oauth2/authorize?${new URLSearchParams(
			request
		).toString()}`,
		302
	);
}

/**
 * Generates a redirect response to the Patreon handover endpoint with a state parameter.
 * @param state - The state string to pass to the handover endpoint.
 * @returns A Response object that redirects to the handover endpoint.
 */
export function toHandoverRedirect(state: string): Response {
	return new Response(null, {
		headers: {
			Location: `/auth/patreon/handover?state=${encodeURIComponent(state)}`,
		},
		status: 302,
	});
}

/**
 * Generates a redirect response to the finish endpoint with state, discord, and patreon parameters.
 * @param state - The state string to pass to the finish endpoint.
 * @param discord - The Discord code to exchange for a token.
 * @param patreon - The Patreon code to exchange for a token.
 * @returns A Response object that redirects to the finish endpoint.
 */
export function toFinishRedirect(
	state: string,
	discord: string,
	patreon: string
): Response {
	return new Response(null, {
		headers: {
			Location: `/auth/finish?state=${encodeURIComponent(
				state
			)}&discord=${encodeURIComponent(discord)}&patreon=${encodeURIComponent(
				patreon
			)}`,
		},
		status: 302,
	});
}

/**
 * Computes the redirect URI based on the incoming request's host and protocol.
 * Uses X-Forwarded-Proto if available, otherwise falls back to the request protocol or defaults to http for localhost.
 * @param c - Hono context
 * @param path - The callback path (e.g., /auth/discord/callback)
 */
export function getRedirectUri(c: Context, path: string): string {
	const host = c.req.header("host");
	let protocol = c.req.header("x-forwarded-proto");
	if (!protocol) {
		protocol =
			host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
				? "http"
				: "https";
	}
	return `${protocol}://${host}${path}`;
}

/**
 * Extracts and validates the query parameters for /auth/finish.
 */
export function getFinishQuery(c: Context) {
	const query = new URLSearchParams(c.req.query());
	if (!query.has("state")) return { error: "No state provided" };
	if (!query.has("discord")) return { error: "No discord code provided" };
	if (!query.has("patreon")) return { error: "No patreon code provided" };
	return {
		state: query.get("state"),
		discord: query.get("discord"),
		patreon: query.get("patreon"),
	};
}

/**
 * Generates an HTML response.
 * @param c - The context object.
 * @param title - The title of the page.
 * @param header - The header text.
 * @param message - The main message body.
 * @param status - The HTTP status code.
 * @param withRedirect - Whether to include a redirect meta tag.
 * @param redirectTo - The URL to redirect to (if applicable).
 * @param additionalCss - Any additional CSS styles to include.
 * @returns A Response object containing the HTML.
 */
export function htmlOutput(
	c: Context,
	title: string,
	header: string,
	headerColor: string | null = "#8be9fd",
	message: string,
	messageColor: string | null = "#50fa7b",
	status: ContentfulStatusCode,
	withRedirect: boolean | false = false,
	redirectTo: string | null = null,
	redirectMessage: string | null = "a",
	additionalCss: string | null = null
): Response {
	const html = `
    <html>
    <head>
      <meta charset="utf-8">
	  ${
			withRedirect
				? `<meta http-equiv="refresh" content="10;url=${redirectTo}">`
				: ""
		}
      <title>${title}</title>
      <style>
        body { background: #181818; color: #f8f8f2; font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace; margin: 0; padding: 2em; }
		.message-header { color: ${headerColor}; text-align: center; }
        .message-body { margin: 0 auto; color: ${messageColor}; text-align: center; }
		.redirect-message { color: #ff79c6; font-size: 0.9em; text-align: center; }
		.footer { margin-top: 2em; color: #6272a4; font-size: 0.95em; text-align: center; }
		.footer a { color: #8be9fd; text-decoration: underline; }
		.logo-img { height: 128px; max-width: 90vw; object-fit: contain; }
		.logo-container { text-align: center; margin-bottom: 1em; }
		${additionalCss || ""}
      </style>
    </head>
    <body>
	  <div class="logo-container">
        <img src="/logo.png" alt="Logo" class="logo-img" />
	  </div>
      <h2 class="message-header">${header}</h2>
      <div class="message-body">${message}</div>
	  ${
			withRedirect && redirectMessage
				? `<br/><div class="redirect-message">${redirectMessage}</div>`
				: ""
		}
      <div class="footer">
        &copy; ${new Date().getFullYear()} Aiko IT Systems<br/>
		Made with ❤️ by <a href="https://github.com/Lulalaby" target="_blank">Lala Sabathil</a><br/>
		View the <a href="https://github.com/Aiko-IT-Systems/cloudflare-ptftr" target="_blank">Source Code</a>
      </div>
    </body>
    </html>
    `;
	return c.html(html, status, {
		"Content-Type": "text/html; charset=utf-8",
	});
}

/**
 * Exchanges Discord code for an access token.
 */
export async function exchangeDiscordToken(
	discordCode: string,
	c: Context
): Promise<RESTPostOAuth2AccessTokenResult> {
	const discordExchangeRequest: RESTPostOAuth2AccessTokenURLEncodedData = {
		code: discordCode,
		redirect_uri: getRedirectUri(c, "/auth/discord/callback"),
		grant_type: "authorization_code",
	};
	return await (
		await fetch(OAuth2Routes.tokenURL, {
			body: new URLSearchParams(discordExchangeRequest).toString(),
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization:
					"Basic " +
					btoa(
						`${await env.DISCORD_CLIENT_ID.get()}:${await env.DISCORD_CLIENT_SECRET.get()}`
					),
			},
		})
	).json();
}

/**
 * Exchanges Patreon code for an access token.
 */
export async function exchangePatreonToken(
	patreonCode: string,
	c: Context
): Promise<PatreonOAuthResponseType> {
	const patreonExchangeRequest: PatreonOAuthExchangeType =
		await PatreonOAuthExchange.parseAsync({
			client_id: await env.PATREON_CLIENT_ID.get(),
			client_secret: await env.PATREON_CLIENT_SECRET.get(),
			code: patreonCode,
			redirect_uri: getRedirectUri(c, "/auth/patreon/callback"),
		});
	return await (
		await fetch("https://www.patreon.com/api/oauth2/token", {
			body: new URLSearchParams(patreonExchangeRequest).toString(),
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		})
	).json();
}

/**
 * Revokes a Discord OAuth2 access token.
 */
export async function revokeDiscordToken(token: string): Promise<Response> {
	const revokeRequest: RESTPostOAuth2TokenRevocationQuery = {
		token,
		token_type_hint: "access_token",
	};
	return await fetch(RouteBases.api + Routes.oauth2TokenRevocation(), {
		body: new URLSearchParams(revokeRequest as any).toString(),
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization:
				"Basic " +
				btoa(
					`${await env.DISCORD_CLIENT_ID.get()}:${await env.DISCORD_CLIENT_SECRET.get()}`
				),
		},
	});
}

/**
 * Revokes a Patreon OAuth2 access token.
 */
export async function revokePatreonToken(token: string): Promise<Response> {
	const patreonRevokeRequest: PatreonOAuthRevocationType =
		await PatreonOAuthRevocation.parseAsync({
			client_id: await env.PATREON_CLIENT_ID.get(),
			client_secret: await env.PATREON_CLIENT_SECRET.get(),
			token,
			token_type_hint: "access_token",
		});
	return await fetch("https://www.patreon.com/api/oauth2/token/revoke", {
		body: new URLSearchParams(patreonRevokeRequest).toString(),
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});
}

/**
 * Fetches Discord user info using access token.
 */
export async function fetchDiscordUser(
	accessToken: string
): Promise<RESTGetAPIUserResult> {
	return await (
		await fetch(RouteBases.api + Routes.user("@me"), {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
	).json();
}

/**
 * Fetches Discord guilds for user using access token.
 */
export async function fetchDiscordGuilds(
	accessToken: string
): Promise<RESTGetAPICurrentUserGuildsResult> {
	return await (
		await fetch(RouteBases.api + Routes.userGuilds(), {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
	).json();
}

/**
 * Fetches Patreon user info using access token.
 */
export async function fetchPatreonWhoami(
	accessToken: string
): Promise<PatreonWhoamiResponse> {
	return await (
		await fetch(
			"https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[member]=is_free_trial,currently_entitled_amount_cents,patron_status,pledge_cadence",
			{
				headers: { Authorization: `Bearer ${accessToken}` },
			}
		)
	).json();
}

/**
 * Fetches Patreon membership info for a given membership ID.
 */
export async function fetchPatreonMembership(
	membershipId: string,
	creatorToken: string
): Promise<PatreonMembershipResponse> {
	return await (
		await fetch(
			`https://www.patreon.com/api/oauth2/v2/members/${membershipId}?fields[member]=is_follower,last_charge_date&include=user,currently_entitled_tiers`,
			{
				headers: { Authorization: `Bearer ${creatorToken}` },
			}
		)
	).json();
}

/**
 * Adds a Discord user to a guild with a role.
 */
export async function addDiscordGuildMember(
	guildId: string,
	userId: string,
	accessToken: string,
	roleId: string,
	botToken: string
): Promise<GuildMemberAddStatus> {
	const guildAddRequest: RESTPutAPIGuildMemberJSONBody = {
		access_token: accessToken,
		roles: [roleId],
	};
	var response: Response = await fetch(
		RouteBases.api + Routes.guildMember(guildId, userId),
		{
			body: JSON.stringify(guildAddRequest),
			method: "PUT",
			headers: {
				Authorization: `Bot ${botToken}`,
				"Content-Type": "application/json",
				"X-Audit-Log-Reason": "Patreon: free membership granted",
			},
		}
	);
	switch (response.status) {
		case 204:
			return GuildMemberAddStatus.AlreadyMember;
		case 201:
			return GuildMemberAddStatus.Added;
		default:
			return GuildMemberAddStatus.Failed;
	}
}

/**
 * Adds a role to a Discord guild member.
 */
export async function addDiscordGuildMemberRole(
	guildId: string,
	userId: string,
	roleId: string,
	botToken: string
): Promise<Response> {
	return await fetch(
		RouteBases.api + Routes.guildMemberRole(guildId, userId, roleId),
		{
			method: "PUT",
			headers: {
				Authorization: `Bot ${botToken}`,
				"Content-Type": "application/json",
				"X-Audit-Log-Reason": "Patreon: free membership granted",
			},
		}
	);
}

/**
 * Checks if the Patreon membership response qualifies as a free membership.
 */
export async function hasFreePatreonMembership(
	patreonWhoamiResponse: PatreonWhoamiResponse
): Promise<boolean> {
	if (patreonWhoamiResponse.data.relationships.memberships.data.length === 0)
		return false;
	const membershipId =
		patreonWhoamiResponse.data.relationships.memberships.data[0].id;
	const patreonMembershipResponse = await fetchPatreonMembership(
		membershipId,
		await env.PATREON_CREATOR_ACCESS_TOKEN.get()
	);
	if (
		patreonMembershipResponse.data.relationships.currently_entitled_tiers.data
			.length === 1
	) {
		return (
			patreonMembershipResponse.data.relationships.currently_entitled_tiers
				.data[0].id === (await env.PATREON_FREE_TIER_ID.get())
		);
	}
	return false;
}

/**
 * Handles Discord guild member addition and role assignment for free Patreon members.
 */
export async function handleDiscordGuildMembership({
	inTargetGuild,
	hasFreeMembership,
	targetGuildId,
	discordWhoamiResponse,
	discordResponse,
	roleId,
	botToken,
}: {
	inTargetGuild: boolean;
	hasFreeMembership: boolean;
	targetGuildId: string;
	discordWhoamiResponse: RESTGetAPIUserResult;
	discordResponse: RESTPostOAuth2AccessTokenResult;
	roleId: string;
	botToken: string;
}): Promise<GuildMemberAddStatus> {
	let guildMemberAddStatus: GuildMemberAddStatus = GuildMemberAddStatus.Unknown;
	if (!inTargetGuild && hasFreeMembership) {
		guildMemberAddStatus = await addDiscordGuildMember(
			targetGuildId,
			discordWhoamiResponse.id,
			discordResponse.access_token,
			roleId,
			botToken
		);
	}
	if (
		hasFreeMembership &&
		(guildMemberAddStatus === GuildMemberAddStatus.AlreadyMember ||
			inTargetGuild)
	) {
		await addDiscordGuildMemberRole(
			targetGuildId,
			discordWhoamiResponse.id,
			roleId,
			botToken
		);
	}
	return guildMemberAddStatus;
}
