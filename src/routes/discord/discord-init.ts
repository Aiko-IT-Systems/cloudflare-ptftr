import { Context } from "hono";
import { toDiscordRedirect } from "../../helpers";
import { env } from "cloudflare:workers";
import { RESTOAuth2AuthorizationQuery } from "discord-api-types/v10";
import { getRedirectUri } from "../../helpers";

export const discordInitRoute = (app: any) => {
  app.get("/auth/discord/init", async (c: Context): Promise<Response> => {
    const request: RESTOAuth2AuthorizationQuery = {
      client_id: await env.DISCORD_CLIENT_ID.get(),
      response_type: "code",
      redirect_uri: getRedirectUri(c, "/auth/discord/callback"),
      scope: "identify guilds guilds.join",
      state:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
      prompt: "none",
    };
    return toDiscordRedirect(request);
  });
};
