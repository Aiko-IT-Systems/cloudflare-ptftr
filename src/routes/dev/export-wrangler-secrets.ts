import { Context } from "hono";
import { env } from "cloudflare:workers";
import { htmlOutput } from "../../helpers";

export const exportWranglerSecretsRoute = (app: any) => {
	app.get(
		"/dev/export-wrangler-secrets",
		async (c: Context): Promise<Response> => {
			if (c.req.header("Host") !== "127.0.0.1:8787") {
				return c.text("This route is only available in development mode.", 403);
			}
			const secrets = {
				DISCORD_CLIENT_ID: await env.DISCORD_CLIENT_ID.get(),
				DISCORD_CLIENT_SECRET: await env.DISCORD_CLIENT_SECRET.get(),
				DISCORD_TOKEN: await env.DISCORD_TOKEN.get(),
				PATREON_CLIENT_ID: await env.PATREON_CLIENT_ID.get(),
				PATREON_CLIENT_SECRET: await env.PATREON_CLIENT_SECRET.get(),
				PATREON_CREATOR_ACCESS_TOKEN:
					await env.PATREON_CREATOR_ACCESS_TOKEN.get(),
				PATREON_CREATOR_REFRESH_TOKEN:
					await env.PATREON_CREATOR_REFRESH_TOKEN.get(),
				DISCORD_GUILD_ID: await env.DISCORD_GUILD_ID.get(),
				DISCORD_ROLE_ID: await env.DISCORD_ROLE_ID.get(),
				PATREON_FREE_TIER_ID: await env.PATREON_FREE_TIER_ID.get(),
			};
			const customCss = `
      .secrets-list { margin: 0 auto; }
      .secret-row { display: flex; align-items: center; margin-bottom: 1em; }
      code { background: #282a36; color: #50fa7b; padding: 0.3em 0.6em; border-radius: 6px; font-size: 1em; margin-right: 1em; font-family: inherit; }
      .secret-value { background: #282a36; color: #8be9fd; padding: 0.3em 0.6em; border-radius: 6px; font-size: 1em; margin-right: 1em; font-family: inherit; }
    `;
			const secretsHtml = `<div class="secrets-list">
      ${Object.entries(secrets)
				.map(
					([name, value]) =>
						`<div class="secret-row"><code>npx wrangler secrets-store secret create ${env.REMOTE_STORE_ID} --name ${name} --scopes workers --remote --value <span class="secret-value">${value}</span></code></div>`
				)
				.join("")}
      </div>`;
			return htmlOutput(
				c,
				"Wrangler Secrets Export",
				"Wrangler Secrets Export",
				"#8be9fd",
				secretsHtml,
				"#50fa7b",
				200,
				false,
				null,
				null,
				customCss
			);
		}
	);
};
