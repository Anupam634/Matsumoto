# Running & deploying Matsumoto

Two paths, depending on what you need right now:

- **[Local test](#local-test-fastest)** — everything on your own machine, free, ~5 minutes. Good for "does this work end to end."
- **[Public deploy](#public-deploy-shareable-url)** — a real URL you (or anyone) can open from a phone. Needs free accounts on two hosts.

Both were verified end to end while writing this: register → login → mining status → claim, through the real UI hitting the real API.

---

## Local test (fastest)

### 1. Start Postgres + Redis

```bash
docker compose up -d
```

This starts the two services the backend needs, using the same
credentials already in `backend/.env.example`. Nothing else runs in
Docker — the API and the frontend run directly with `npm` so you get fast
reloads.

Don't have Docker? Install Postgres 16 and Redis locally instead, then
create a `matsumoto` database with user/password `postgres`/`postgres`
(or edit `backend/.env` to match whatever you already have running).

### 2. Backend

```bash
cd backend
cp .env.example .env      # defaults already point at the docker-compose services
npm install
npx prisma migrate dev    # creates the schema
npm run start:dev         # http://localhost:4000/api
```

Leave this running. You should see `Matsumoto API listening on
http://localhost:4000/api` in the log, and routes like
`{/api/auth/register, POST}` listed above it.

Sanity-check it directly, no frontend needed:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"testpass123"}'
```

You should get back `{ "accessToken": "...", "user": {...} }`.

### 3. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL="http://localhost:4000/api" — already correct for local
npm install
npm run dev                  # http://localhost:3000
```

Open `http://localhost:3000/en`, click **Create free account**, register,
and you should land on `/en/dashboard` with a live hash rate, pending
points, and a working **Mine** button pulling real numbers from the API
you started in step 2.

### What's not wired up yet

- **Seeding is automatic.** `npm run start:prod` applies migrations and seeds
  the four booster plans and six tasks from SPEC on every deploy. The seed is
  idempotent, so it fills an empty catalogue once and does nothing thereafter.
  To run it by hand against a local database:
  ```bash
  cd backend && npm run seed
  ```
- **Boosters**: fully purchasable, paid on BNB Chain and verified
  automatically — no admin approval. Purchases stay **disabled until you
  configure a receiving wallet**, and the UI says so plainly rather than
  offering a button that cannot work. To enable, set in the backend env:
  ```
  BOOSTER_PAY_TO_ADDRESS=0xYourReceivingWallet
  BOOSTER_PAY_TOKEN=USDT                 # or BNB
  BOOSTER_PAY_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955
  BOOSTER_PAY_TOKEN_DECIMALS=18
  BOOSTER_MIN_CONFIRMATIONS=6
  BOOSTER_RPC_URL=https://bsc-dataseed.binance.org/
  ```
  Plans are priced in USD, so a dollar stablecoin (USDT) maps 1:1 and needs
  no price feed. Paying in **BNB** additionally requires `BOOSTER_BNB_PER_USD`
  — without an explicit rate, BNB payments stay disabled rather than being
  priced by a guess.
- **Admin panel**: built (SPEC §6) at `/<locale>/admin`. There is no admin
  self-signup — create the first operator account from the `backend/`
  directory:
  ```bash
  npm run admin:create -- admin@yourdomain.com 'a-strong-password'
  ```
  Then sign in at e.g. `http://localhost:3000/en/admin`. Admin sessions use a
  separate token type from miner sessions, so a miner's token cannot reach
  any admin route.
- **KYC**: built as **in-house manual review** — miners upload documents at
  `/<locale>/kyc` and an operator approves or rejects them from the admin
  panel's KYC tab. No third-party provider is wired up, because the client
  hasn't chosen one (SPEC §9b.4). Document images are stored base64 in
  Postgres; that is fine for manual review at this scale, but move them to
  object storage before serious volume.
- **Withdrawal payouts** still settle through the swappable `WalletService`,
  which stays in `offchain` mode until the client supplies the token's
  contract address, ABI and decimals.

---

## Public deploy (shareable URL)

For a real link you can open on a phone, without running anything
locally. Free tiers are enough for testing.

### Backend + database — [Render](https://render.com)

Migrations and catalogue seeding run from `npm run start:prod`, so they happen
on every deploy no matter how the dashboard is configured. Nothing needs to be
run by hand, and nothing breaks if a start command is later edited.

1. Sign in to Render with GitHub, and give it access to this repo.
2. **New → PostgreSQL** — free tier is fine. Copy the **Internal Database URL**.
3. **New → Web Service** → pick this repo.
   - **Root directory**: `backend`
   - **Build command**: `npm install && npx prisma generate && npm run build`
   - **Start command**: `npm run start:prod`
   - **Health check path**: `/api/health`
   - **Environment variables**: copy every key from `backend/.env.example`, with:
     - `DATABASE_URL` → the Postgres URL from step 2
     - `JWT_SECRET` → any long random string (`openssl rand -hex 32`)
     - `WALLET_MODE` → leave as `offchain` for testing — no real chain calls, no private key needed

   To reach the admin panel, also set:
     - `ADMIN_EMAIL` → the login you want, e.g. `ops@yourdomain.com`
     - `ADMIN_PASSWORD` → at least 12 characters

   The account is created on boot. There is no admin self-signup, and the
   free tier has no shell to run `npm run admin:create` from, so without
   these two variables a fresh deployment cannot get into its own admin
   panel. `ADMIN_PASSWORD` is the source of truth — to rotate or recover a
   forgotten password, change it and redeploy. Sign in at
   `https://your-frontend/en/admin`.

   Redis is optional but no longer unused: pending verification codes live in
   it when `REDIS_URL` is set, and in the API process when it is not. Provision
   one or leave the variable unset — do not point it at a Redis that isn't
   there (see [Verification codes](#verification-codes-are-in-memory-unless-redis-is-configured)).

4. Deploy. Render gives you a URL like `https://matsumoto-api.onrender.com`.
   Check it came up, and that the database is reachable from it:
   ```bash
   curl https://matsumoto-api.onrender.com/api/health
   # {"status":"ok","database":"ok"}   — 503 means it cannot reach Postgres
   ```

Alternatively, **New → Blueprint** and point Render at `render.yaml` in the
repo root, which carries all of the above. An existing service keeps its own
dashboard settings when you adopt a blueprint, so compare the two afterwards.

#### If a new feature 500s after a deploy

Almost always an unapplied migration. Setting environment variables does not
run migrations — Prisma never migrates on its own, something has to call
`prisma migrate deploy`. That call now lives inside `start:prod`, so:

- Confirm the start command is `npm run start:prod` and not `node dist/main`
  or `nest start`, both of which skip migrations entirely.
- Check the deploy log for `migrations have been applied` or `No pending
  migrations`. If neither line appears, the migrate step never ran.
- A failed migration stops the service from starting, so a running service
  with a missing table means the step was skipped rather than that it failed.

### Frontend — [Vercel](https://vercel.com)

1. Sign in with GitHub, **Add New → Project**, pick this repo.
2. **Root directory**: `frontend`
3. **Environment variable**: `NEXT_PUBLIC_API_URL` = `https://matsumoto-api.onrender.com/api` (your Render URL + `/api`)
4. Deploy. Vercel gives you `https://<something>.vercel.app` — that's the link to open and test, on desktop or phone.

### Notes

- CORS is an **allowlist**, not wide open. Set `CORS_ORIGINS` to a
  comma-separated list of the front-end origins (e.g.
  `https://bondkoinlabs.com,https://www.bondkoinlabs.com`). With it unset
  the defaults in `src/common/cors-origins.ts` apply, which do not include
  a `*.vercel.app` preview URL — add it there or the preview's API calls
  will be blocked by the browser.
- Render's free web service and Postgres both spin down on inactivity —
  the first request after a while will be slow (cold start), not broken.
- Don't put a real `HOT_WALLET_PRIVATE_KEY` or mainnet contract address
  into a free-tier test deploy's environment variables.

## Breaking changes to carry into an existing deployment

- **`JWT_SECRET` is now required.** There is no fallback any more: the API
  refuses to boot without one, and rejects the two example values that used
  to ship in the repo. If the running deployment relied on the fallback,
  setting a real secret invalidates every existing session — miners and
  admins both sign in again once. Generate with `openssl rand -hex 32`.
- **Run the new migration.** `20260904140000_task_config_columns` moves the
  admin-editable quiz questions, wheel segments and bounty URLs onto the
  `Task` row. They previously lived in memory, so whatever is configured in
  the running instance is not in the database and has to be re-entered once
  after deploying. `start:prod` applies migrations automatically.
- **`NEXT_PUBLIC_API_URL` must be set at frontend build time.** It was
  already inlined into the bundle; it now also feeds the `connect-src`
  directive of the Content-Security-Policy in `next.config.js`. Building
  without it produces a policy that blocks the app's own API calls, and the
  only symptom is a console error in the browser.
- **Deploy the new nginx config** — see "CORS" below.

## Production hardening still owed on the server

These are host-side, not code: the app cannot fix them from inside.

### CORS: deploy the current nginx config

`backend/nginx/bondkoin.conf` no longer touches CORS — the `add_header
Access-Control-*` lines and the `if ($request_method = 'OPTIONS')` block are
gone, so the app's allowlist in `src/common/cors-origins.ts` is the single
source of truth. **The running server keeps whatever config was installed
there**, so copy the current file over and reload:

```
sudo cp backend/nginx/bondkoin.conf /etc/nginx/sites-available/bondkoin
sudo nginx -t && sudo systemctl reload nginx
```

Then verify an unlisted origin is refused — this must come back with **no**
`Access-Control-Allow-Origin` header at all:

```
curl -sS -X OPTIONS -D - -o /dev/null \
  -H 'Origin: https://evil.example.com' \
  -H 'Access-Control-Request-Method: POST' \
  https://api.bondkoinlabs.com/api/auth/login
```

If it still echoes `Access-Control-Allow-Origin: https://evil.example.com`,
the old config is still installed: nginx is reflecting whatever origin asks,
which makes every endpoint callable from any page on the internet.

### The API is HTTP/1.1 with no TLS-level caching

The front end is served over HTTP/2 from a CDN; the API is plain HTTP/1.1.
Enabling `listen 443 ssl http2;` on the API vhost removes a round trip per
connection. Responses are gzipped by the app itself now (`compression`
middleware in `main.ts`), so nginx does not need `gzip on` for proxied JSON.

### Apex redirects to www on every request

`https://bondkoinlabs.com/en` answers `308` to `https://www.bondkoinlabs.com/en`,
so every cold navigation pays an extra round trip. Pick one canonical host in
the DNS/CDN config and point the other at it at the edge, or serve the apex
directly.

### Verification codes are in memory unless Redis is configured

`REDIS_URL` unset means pending OTPs live in the API process and are lost on
every restart or deploy — a user mid-signup has to request a new code. Set
`REDIS_URL` and they survive restarts and a second instance.

A `REDIS_URL` that points at nothing is worse than none at all if you leave
it in `.env` and never provision the server: the API logs
`OTP store … failed` and quietly serves codes from memory. Either run a
Redis at that address or take the line out — copying `.env.example` verbatim
sets `redis://localhost:6379`, which is a real Redis on nobody's box.

## Turning on booster payments

Boosters are paid by direct transfer — the miner sends USDT from their own
wallet to a receiving address, then submits the transaction hash, which the
server verifies on-chain. There is no deposit step and the platform never
custodies user funds.

Until the receiving address and token contract are set, `GET /api/boosters`
reports `payment.enabled: false` and the boosters page shows a "not
configured" banner instead of letting anyone pay.

Set these on the backend:

```
BOOSTER_PAY_TO_ADDRESS=      # wallet that receives booster payments
BOOSTER_PAY_TOKEN_ADDRESS=   # USDT BEP-20 contract on the target network
```

The rest already default correctly for BSC and only need changing to
override: `BOOSTER_PAY_TOKEN=USDT`, `BOOSTER_PAY_TOKEN_DECIMALS=18` (BSC
USDT uses 18 decimals, unlike the 6 used on Ethereum),
`BOOSTER_MIN_CONFIRMATIONS=6`, and `BOOSTER_RPC_URL`, which falls back to
`BSC_RPC_URL`.

**Verify the token contract address on BscScan before setting it.** A wrong
contract means payments in a worthless token are accepted as real ones.

Test on BSC testnet first: point `BSC_RPC_URL` at the testnet RPC and
`BOOSTER_PAY_TOKEN_ADDRESS` at a testnet BEP-20, then run one real purchase
end to end. `payment.rules.ts` rejects a wrong token, wrong recipient, wrong
sender, underpayment, too few confirmations, a reverted transaction, and a
stale one — each with its own reason, so a failed attempt tells you which.
