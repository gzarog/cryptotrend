# Authentication — Cloudflare Access (OTP, allowlist)

This app uses **Cloudflare Access One-Time PIN (OTP)** for registration / sign-in.
There is **no database, no email service, and no auth code to maintain** — Cloudflare
handles identity, PIN delivery, and session cookies at the edge.

How it works for a visitor:

1. They open the app's URL.
2. Cloudflare Access intercepts the request and shows a login page.
3. They enter their email and click **Send me a code**.
4. If their email is on the allowlist, Cloudflare emails them a one-time PIN
   (valid ~10 minutes).
5. They enter the PIN and are let into the app.

Only emails/domains **you approve** can get in — this is the allowlist model.

---

## One-time setup (Cloudflare Zero Trust dashboard)

The app is already deployed on Cloudflare Workers (see `wrangler.toml`), so it is
behind Cloudflare and Access applies directly — no infrastructure changes needed.

### 1. Enable Zero Trust
In the Cloudflare dashboard, open **Zero Trust**. If it's your first time, choose a team
name and the **Free** plan (covers up to 50 users).

### 2. Confirm One-time PIN is enabled
**Settings → Authentication → Login methods** → ensure **One-time PIN** is present and
enabled. It's on by default and needs no identity provider.

> Docs: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/

### 3. Add the application
**Access → Applications → Add an application → Self-hosted**.

- **Application name**: e.g. `CryptoTrend`
- **Session Duration**: e.g. 24 hours (how long before users must re-authenticate)
- **Application domain**: the app's hostname — your Worker custom domain
  (e.g. `cryptotrend.app`) or its `*.workers.dev` route.

### 4. Add an Allow policy (the allowlist)
On the application, add a policy:

- **Action**: `Allow`
- **Configure rules** — choose one (or both):
  - **Emails** → enter the specific addresses you want to grant access to, or
  - **Emails ending in** → allow an entire domain, e.g. `@yourcompany.com`.

Anyone not matching is rejected at the login page.

> Docs: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/

### 5. Keep API + cron working — bypass `/api/*`
This app exposes server-to-server routes under `/api/*` (push subscription) and runs a
scheduled cron Worker. These have no browser session and must **not** be gated by Access.

Add a **second application** (or a path rule) covering `https://<domain>/api/*` with a
policy of **Action: `Bypass`** and rule **Everyone**. This leaves the SPA gated while the
API stays reachable.

> Note: `GET /api/me` (used to show the signed-in email in the header) reads the
> `Cf-Access-Authenticated-User-Email` request header. It works whether or not `/api/*`
> is bypassed — if bypassed, the header simply isn't present and the UI hides the email.

---

## Logout

Send users to:

```
https://<your-domain>/cdn-cgi/access/logout
```

The in-app header shows a **Logout** link pointing here whenever a user is signed in.

---

## Local development

Outside Cloudflare Access (e.g. `npm run dev`), `/api/me` returns `{ "email": null }`,
so the email badge and Logout link are hidden and the app runs normally with no login.
