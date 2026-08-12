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

   Redis is not required. `REDIS_URL` appears in `.env.example` and `ioredis`
   is installed, but nothing in `src/` imports it yet, so there is no Redis
   instance to provision.

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

- CORS is wide open on the backend (`app.enableCors()` with no
  restriction), so the Render URL will accept requests from the Vercel
  URL with no extra config.
- Render's free web service and Postgres both spin down on inactivity —
  the first request after a while will be slow (cold start), not broken.
- Don't put a real `HOT_WALLET_PRIVATE_KEY` or mainnet contract address
  into a free-tier test deploy's environment variables.

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
