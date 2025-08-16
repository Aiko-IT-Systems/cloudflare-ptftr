import { Context } from "hono";
import { toFinishRedirect } from "../../helpers";

export const patreonCallbackRoute = (app: any) => {
  app.get("/auth/patreon/callback", (c: Context): Response => {
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
    if (!query.get("state")?.includes(" ")) {
      return c.text("Invalid state provided", 400);
    }
    const [state, discord_code]: string[] = query.get("state").split(" ");
    const patreon_code: string = query.get("code");
    return toFinishRedirect(state, discord_code, patreon_code);
  });
};
