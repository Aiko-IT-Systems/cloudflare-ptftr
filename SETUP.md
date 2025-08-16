# Cloudflare Patreon-Discord OAuth Worker Setup Guide

This guide will help you set up the Cloudflare Patreon-Discord OAuth Worker to automate Discord access for your Patreon supporters.

---

## Prerequisites
- [Cloudflare Workers](https://workers.dev) account (free tier is sufficient)
- [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/)
- Discord server (with permissions to add bots and manage roles)
- Patreon creator account

---

## Prepare wrangler.jsonc

> [!NOTE]
> Your workers url will be `<YOUR_WORKER_NAME>.<YOUR_ACCOUNT_ID_OR_NAME>.workers.dev` after deployment.

Edit `wrangler.jsonc` to include your own data.

- Remove the `routes` if you do not have a custom domain.
- If you have routes, you can set `workers_dev` to `false`.
- Set the `account_id` to your Cloudflare account ID. (You can find it in your Cloudflare dashboard in the address bar. i.e. `https://dash.cloudflare.com/<ACCOUNT_ID>/workers/overview`)
- In `vars` set the following fields:
    - `PATREON_ACCOUNT`: Your Patreon account URL (e.g., `https://www.patreon.com/yourusername`)
    - `REMOTE_STORE_ID`: Your Secret Store ID (You'll find it in the Cloudflare dashboard under *Secrets Store*. <https://dash.cloudflare.com/?to=/:account/secrets-store>)
- For `secrets_store_secrets` you'll need to adjust the `store_id` to your own Secret Store ID.

![Cloudflare Secrets Store](images/cloudflare_secrets_store.png)

---

## Setting up the Clients / Tokens

### Discord

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application.
3. Navigate to the "Installation" tab and set "Install Link" to **None**.

![Discord Installation Settings](images/discord_installation_settings.png)

4. Navigate to the "Bot" tab and copy the **Token**.  
5. Disable the **Public Bot** option.

![Discord Bot Settings](images/discord_bot_settings.png)

6. Under "OAuth2", set the **Redirects** to `http://127.0.0.1:8787/auth/discord/callback` and `https://YOUR-WORKER-URL/auth/discord/callback`. (You get the worker url upon deployment)

![Discord OAuth2 Settings](images/discord_oauth2_settings.png)

7. Note down your **Client ID** and **Client Secret** from the "OAuth2" tab.
8. In the **OAuth2 URL Generator**, select the `bot` scope and set the **Bot Permissions** to `Manage Roles` & `Create Instant Invite`. Then, use the generated URL to add the bot to your Discord server.
10. Create a new role in your Discord server that you want to assign to free Patreon supporters and note its ID. (Make sure the bot's role is above this role in the role hierarchy)

You should have the following credentials now:
- **DISCORD_CLIENT_ID**
- **DISCORD_CLIENT_SECRET**
- **DISCORD_TOKEN**
- **DISCORD_GUILD_ID** (Your Discord server ID)
- **DISCORD_ROLE_ID** (Role to assign to free Patreon supporters)

### Patreon

1. Go to the [Patreon Developer Portal](https://www.patreon.com/portal/registration/register-clients).
2. Create a new client.

![Patreon Client Creation](images/patreon_client_creation.png)

3. Add the **Redirect URIs**:
   - `http://127.0.0.1:8787/auth/patreon/callback`
   - `https://YOUR-WORKER-URL/auth/patreon/callback` (You get the worker url upon deployment)
4. Note down your **Client ID**, **Client Secret**, **Creator's Access Token** and **Creator's Refresh Token**.
5. For the **PATREON_ACCOUNT** use your patreon's url (e.g., `https://www.patreon.com/yourusername`).

#### Patreon Free Tier ID

> [!NOTE]
> For this you need your **PATREON_CREATOR_ACCESS_TOKEN**

Execute the following command in your Windows Terminal or Linux shell to get your Patreon Free Tier ID:
```sh
curl --location --globoff "https://www.patreon.com/api/oauth2/v2/campaigns?include=tiers&fields[tier]=amount_cents%2Ctitle" --header "Authorization: Bearer PATREON_CREATOR_ACCESS_TOKEN"
```

You'll receive a JSON response similar to this:
```json
{"data":[{"id":"123456","type":"campaign","attributes":{},"relationships":{"tiers":{"data":[{"id":"234567","type":"tier"},{"id":"2345678","type":"tier"}]}}}],"included":[{"id":"234567","type":"tier","attributes":{"amount_cents":0,"title":"Free"}},{"id":"2345678","type":"tier","attributes":{"amount_cents":500,"title":"Official Patron"}}],"meta":{"pagination":{"total":1,"cursors":{"next":null}}}}
```

You can use the [JSON Formatter](https://jsonformatter.curiousconcept.com/) to format the JSON response to something like this:
```json
{
   "data":[
      {
         "id":"123456",
         "type":"campaign",
         "attributes":{
            
         },
         "relationships":{
            "tiers":{
               "data":[
                  {
                     "id":"234567",
                     "type":"tier"
                  },
                  {
                     "id":"2345678",
                     "type":"tier"
                  }
               ]
            }
         }
      }
   ],
   "included":[
      {
         "id":"234567", // You are looking for this tier
         "type":"tier",
         "attributes":{
            "amount_cents":0,
            "title":"Free"
         }
      },
      {
         "id":"2345678",
         "type":"tier",
         "attributes":{
            "amount_cents":500,
            "title":"Official Patron"
         }
      }
   ],
   "meta":{
      "pagination":{
         "total":1,
         "cursors":{
            "next":null
         }
      }
   }
}
```

The **PATREON_FREE_TIER_ID** is the ID of the tier with `"amount_cents": 0` and `"title": "Free"`. For example, in the JSON above, the Free Tier ID is `234567`.

You should have the following credentials now:
- **PATREON_CLIENT_ID**
- **PATREON_CLIENT_SECRET**
- **PATREON_CREATOR_ACCESS_TOKEN**
- **PATREON_CREATOR_REFRESH_TOKEN**
- **PATREON_FREE_TIER_ID**
- **PATREON_ACCOUNT**

---

## Installation & Deployment

### Step 1: Clone the Repository
```sh
git clone https://github.com/Aiko-IT-Systems/cloudflare-ptftr.git
cd cloudflare-ptftr
```

### Step 2: Install Dependencies
```sh
npm install --include=dev
```

### Step 3: Login to Cloudflare
```sh
npx wrangler login
```

### Step 4: Configure Secrets
Set up your Discord and Patreon credentials as secrets using Wrangler. Example:
```sh
# Set the secrets in the Secrets Store
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_CLIENT_ID --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_CLIENT_SECRET --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_TOKEN --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_GUILD_ID --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_ROLE_ID --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_CLIENT_ID --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_CLIENT_SECRET --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_CREATOR_ACCESS_TOKEN --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_CREATOR_REFRESH_TOKEN --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_FREE_TIER_ID --scopes workers --remote
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_ACCOUNT --scopes workers --remote

# Validate the secrets
npx wrangler secrets-store secret list YOUR_STORE_ID --remote

🔐 Listing secrets... (store-id: YOUR_STORE_ID, page: 1, per-page: 10)
┌─────────────────────────────────────┬──────────────────────────────────┬─────────┬─────────┬─────────┬──────────────────────┬──────────────────────┐
│ Name                                │ ID                               │ Comment │ Scopes  │ Status  │ Created              │ Modified             │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_DISCORD_CLIENT_ID             │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:00:41 │ 14/08/2025, 15:00:42 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_DISCORD_CLIENT_SECRET         │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:00:54 │ 14/08/2025, 15:00:58 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_DISCORD_TOKEN                 │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:01:10 │ 14/08/2025, 15:01:12 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_PATREON_CLIENT_ID             │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:01:16 │ 14/08/2025, 15:01:18 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_PATREON_CLIENT_SECRET         │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:01:22 │ 14/08/2025, 15:01:24 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_PATREON_CREATOR_ACCESS_TOKEN  │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:01:28 │ 14/08/2025, 15:01:28 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_PATREON_CREATOR_REFRESH_TOKEN │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:01:34 │ 14/08/2025, 15:01:38 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_DISCORD_GUILD_ID              │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:01:39 │ 14/08/2025, 15:01:42 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_DISCORD_ROLE_ID               │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:01:47 │ 14/08/2025, 15:01:48 │
├─────────────────────────────────────┼──────────────────────────────────┼─────────┼─────────┼─────────┼──────────────────────┼──────────────────────┤
│ PTFTR_PATREON_FREE_TIER_ID          │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │ workers │ active  │ 14/08/2025, 15:01:52 │ 14/08/2025, 15:01:54 │
└─────────────────────────────────────┴──────────────────────────────────┴─────────┴─────────┴─────────┴──────────────────────┴──────────────────────┘
```

### Step 5: Deploy to Cloudflare
```sh
npx wrangler deploy
```

### Step 6: Test Locally (Optional)
```sh
# Set the secrets in the Secrets Store
# You need to set the secrets locally for testing (Note the absence of --remote)
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_CLIENT_ID --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_CLIENT_SECRET --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_TOKEN --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_GUILD_ID --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name DISCORD_ROLE_ID --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_CLIENT_ID --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_CLIENT_SECRET --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_CREATOR_ACCESS_TOKEN --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_CREATOR_REFRESH_TOKEN --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_FREE_TIER_ID --scopes workers
npx wrangler secrets-store secret create YOUR_STORE_ID --name PATREON_ACCOUNT --scopes workers

# Validate the secrets
npx wrangler secrets-store secret list YOUR_STORE_ID

🔐 Listing secrets... (store-id: YOUR_STORE_ID, page: 1, per-page: 10)
┌───────────────────────────────┬──────────────────────────────────┬─────────┬────────┬─────────┬──────────────────────┬──────────────────────┐
│ Name                          │ ID                               │ Comment │ Scopes │ Status  │ Created              │ Modified             │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ DISCORD_CLIENT_ID             │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ DISCORD_CLIENT_SECRET         │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ DISCORD_GUILD_ID              │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ DISCORD_ROLE_ID               │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ DISCORD_TOKEN                 │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ PATREON_CLIENT_ID             │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ PATREON_CLIENT_SECRET         │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ PATREON_CREATOR_ACCESS_TOKEN  │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ PATREON_CREATOR_REFRESH_TOKEN │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
├───────────────────────────────┼──────────────────────────────────┼─────────┼────────┼─────────┼──────────────────────┼──────────────────────┤
│ PATREON_FREE_TIER_ID          │ XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │         │        │ active  │ 16/08/2025, 20:50:51 │ 16/08/2025, 20:50:51 │
└───────────────────────────────┴──────────────────────────────────┴─────────┴────────┴─────────┴──────────────────────┴──────────────────────┘

# Start the local development server
npx wrangler dev
```
Visit [http://127.0.0.1:8787/](http://127.0.0.1:8787/) and use `/auth` to test OAuth flows.

### Step 7: Share the Authentication Link
Share the url of the worker with your Patreon supporters.
You can set it as welcome message for the free tier at <https://www.patreon.com/edit/welcome>.

![Free tier welcome message](images/free_tier_welcome_message.png)

They will log in with Discord and Patreon, and if eligible, will be added to your Discord server and assigned the correct role.

---

## Troubleshooting
- Ensure all secrets are set correctly in Cloudflare.
- Make sure your Discord bot has the necessary permissions.
- Check Cloudflare Worker logs for errors.
- Refer to the official docs:
  - [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
  - [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
  - [Discord Developer Portal](https://discord.com/developers/docs/intro)
  - [Patreon API Docs](https://docs.patreon.com/)

---

## Security Notes
- OAuth2 is used for both Discord and Patreon; passwords are never stored or seen.
- All secrets are managed securely in Cloudflare.
- Tokens are revoked after use for extra security.
- No personal data is stored on the worker.

---

## Need Help?
- Open an issue on GitHub
- Ask in our [Discord server](https://discord.gg/RXA6u3jxdU)
- Refer to the [README](/README.md) for more details
