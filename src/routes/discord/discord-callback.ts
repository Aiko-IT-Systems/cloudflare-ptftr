import { Context } from "hono";
import { toHandoverRedirect } from "../../helpers";

export const discordCallbackRoute = (app: any) => {
  app.get("/auth/discord/callback", (c: Context): Response => {
    const query = new URLSearchParams(c.req.query());
    if (query.has("error")) {
      return c.text(
        `Error: ${query.get("error")} - ${query.get("error_description")}`,
        400
      );
    }
    if (!query.has("code")) {
      return c.text("No code provided", 400);
    }
    if (!query.has("state")) {
      return c.text("No state provided", 400);
    }
    return toHandoverRedirect(`${query.get("state")} ${query.get("code")}`);
  });
};
