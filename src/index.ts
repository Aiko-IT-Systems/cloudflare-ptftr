import { Context, Hono } from "hono";
import { env } from "cloudflare:workers";
import { authInitRoute } from "./routes/auth/auth";
import { discordCallbackRoute } from "./routes/discord/discord-callback";
import { patreonHandoverRoute } from "./routes/patreon/patreon-handover";
import { patreonCallbackRoute } from "./routes/patreon/patreon-callback";
import { discordInitRoute } from "./routes/discord/discord-init";
import { exportWranglerSecretsRoute } from "./routes/dev/export-wrangler-secrets";
import { finishRoute } from "./routes/auth/finish";
import { getFaviconDataUri, getLogoDataUri } from "./images";
import { htmlOutput } from "./helpers";

const app = new Hono<{ Bindings: Env }>();
if (env.ENABLE_DEV) {
	exportWranglerSecretsRoute(app);
}
authInitRoute(app);
discordInitRoute(app);
discordCallbackRoute(app);
patreonHandoverRoute(app);
patreonCallbackRoute(app);
finishRoute(app);
app.get('/favicon.ico', (c) => {
  const bytes = Uint8Array.from(atob(getFaviconDataUri()), (ch) => ch.charCodeAt(0))
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
})
app.get('/logo.png', (c) => {
  const base64 = getLogoDataUri();
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
});
app.notFound((c: Context): Response =>
  htmlOutput(
    c,
    "404 Not Found",
    "Page Not Found",
    "#ff5555",
    "The page you requested does not exist.",
    "#ffb86c",
    404
  )
);

export default app;
