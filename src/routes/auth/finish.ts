import { Context } from "hono";
import {
	GuildMemberAddStatus,
	OperationState,
	PatreonOAuthResponseType,
} from "../../types";
import { env } from "cloudflare:workers";
import {
	getFinishQuery,
	exchangeDiscordToken,
	exchangePatreonToken,
	fetchDiscordUser,
	fetchDiscordGuilds,
	fetchPatreonWhoami,
	hasFreePatreonMembership,
	handleDiscordGuildMembership,
	revokeDiscordToken,
	revokePatreonToken,
	htmlOutput,
	getRedirectUri,
} from "../../helpers";
import { RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";

export const finishRoute = (app: any) => {
	app.get("/auth/finish", async (c: Context): Promise<Response> => {
		let htmlTest: boolean = env.ENABLE_DEV && false;
		let state: OperationState = OperationState.NotStarted;
		let errorMsg: string | undefined;
		let discordResponse: RESTPostOAuth2AccessTokenResult | undefined =
			undefined;
		let patreonResponse: PatreonOAuthResponseType | undefined = undefined;
		if (!htmlTest) {
			try {
				const query = getFinishQuery(c);
				if (query.error) {
					state = OperationState.Failure;
					errorMsg = query.error;
				} else {
					discordResponse = await exchangeDiscordToken(query.discord, c);
					patreonResponse = await exchangePatreonToken(query.patreon, c);
					const discordWhoamiResponse = await fetchDiscordUser(
						discordResponse.access_token
					);
					const guilds = await fetchDiscordGuilds(discordResponse.access_token);
					const targetGuildId = await env.DISCORD_GUILD_ID.get();
					const inTargetGuild: boolean = guilds.some(
						(guild) => guild.id === targetGuildId
					);
					const patreonWhoamiResponse = await fetchPatreonWhoami(
						patreonResponse.access_token
					);
					const hasFreeMembership = await hasFreePatreonMembership(
						patreonWhoamiResponse
					);
					const guildMemberAddStatus = await handleDiscordGuildMembership({
						inTargetGuild,
						hasFreeMembership,
						targetGuildId,
						discordWhoamiResponse,
						discordResponse,
						roleId: await env.DISCORD_ROLE_ID.get(),
						botToken: await env.DISCORD_TOKEN.get(),
					});

					if (inTargetGuild && hasFreeMembership) {
						state = OperationState.RolePatch;
					} else if (
						hasFreeMembership &&
						(guildMemberAddStatus === GuildMemberAddStatus.Added ||
							guildMemberAddStatus === GuildMemberAddStatus.AlreadyMember)
					) {
						state = OperationState.GuildAdd;
					} else {
						state = OperationState.Failure;
					}
				}
			} catch (error) {
				console.error("Error finishing auth:", error);
				state = OperationState.Catastrophic;
				if (error instanceof Error) errorMsg = error.message;
			}

			try {
				if (typeof discordResponse?.access_token === "string") {
					await revokeDiscordToken(discordResponse.access_token);
				}
				if (typeof patreonResponse?.access_token === "string") {
					await revokePatreonToken(patreonResponse.access_token);
				}
			} catch (revokeError) {
				console.warn("Failed to revoke tokens:", revokeError);
			}
		}
		if (htmlTest) {
			const testQuery = new URLSearchParams(c.req.query());
			state =
				(testQuery.get("state") as OperationState) || OperationState.NotStarted;
		}
		switch (state) {
			case OperationState.NotStarted:
				return htmlOutput(
					c,
					"Auth Not Started",
					"Authentication Not Started",
					null,
					"Please start the authentication process.",
					null,
					400
				);
			case OperationState.RolePatch:
				return htmlOutput(
					c,
					"Auth Success",
					"Authentication Successful",
					"#ff79c6",
					"You are already a member of the server, but we updated your roles accordingly.",
					"#8be9fd",
					200,
					true,
					`${env.PATREON_ACCOUNT}`,
					`<i>We'll redirect you back to <a href="${env.PATREON_ACCOUNT}">${env.PATREON_ACCOUNT}</a> in <code>10</code> seconds.</i>`
				);
			case OperationState.GuildAdd:
				return htmlOutput(
					c,
					"Auth Success",
					"Authentication Successful",
					"#bd93f9",
					"You have been successfully added to the server!",
					"#f1fa8c",
					200,
					true,
					`${env.PATREON_ACCOUNT}`,
					`<i>We'll redirect you back to <a href="${env.PATREON_ACCOUNT}">${env.PATREON_ACCOUNT}</a> in <code>10</code> seconds.</i>`
				);
			case OperationState.Failure:
				console.warn("Auth operation failed:", errorMsg);
				const restartEntrypoint = getRedirectUri(c, "/auth");
				return htmlOutput(
					c,
					"Auth Failed",
					"Authentication Failed",
					"#ff5555",
					`An error occurred while processing your request. Please try again at <a href="${restartEntrypoint}">${restartEntrypoint}</a>.`,
					"#fc8a11ff",
					400
				);
			default:
				console.error("Unknown error occurred.", errorMsg);
				return htmlOutput(
					c,
					"Unknown Error",
					"Unknown Error",
					"#ff0000",
					"An unknown error occurred while processing your request. Please try again later.",
					"#ff5555",
					500
				);
		}
	});
};
