import { Context } from "hono";

export const authInitRoute = (app: any) => {
  app.get("/", (c: Context): Response => c.redirect("/auth/discord/init"));
  app.get("/auth", (c: Context): Response => c.redirect("/auth/discord/init"));
};
