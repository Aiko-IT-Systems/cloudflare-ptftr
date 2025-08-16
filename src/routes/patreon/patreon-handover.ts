import { Context } from "hono";
import { toPatreonRedirect, getRedirectUri } from "../../helpers";
import { env } from "cloudflare:workers";
import { PatreonOAuthRequest, PatreonOAuthRequestType } from "../../types";

export const patreonHandoverRoute = (app: any) => {
  app.get("/auth/patreon/handover", async (c: Context): Promise<Response> => {
    const query = new URLSearchParams(c.req.query());
    if (!query.has("state")) {
      return c.text("No state provided", 400);
    }
    const request: PatreonOAuthRequestType = await PatreonOAuthRequest.parseAsync({
      client_id: await env.PATREON_CLIENT_ID.get(),
      redirect_uri: getRedirectUri(c, "/auth/patreon/callback"),
      scope: "identity",
      state: query.get("state"),
    });
    return toPatreonRedirect(request);
  });
};
