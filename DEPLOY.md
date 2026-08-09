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

- **Boosters**: the booster catalogue (`prisma/seed.ts`) isn't run by
  `npx prisma db seed` — `package.json` is missing the `"prisma": {
  "seed": ... }` block, so `npx prisma migrate dev` won't seed it
  automatically. Doesn't block the core register/mine/withdraw flow.
- **Admin panel**: built (SPEC §6) at `/<locale>/admin`. There is no admin
  self-signup — create the first operator account from the `backend/`
  directory:
  ```bash
  npm run admin:create -- admin@yourdomain.com 'a-strong-password'
  ```
  Then sign in at e.g. `http://localhost:3000/en/admin`. Admin sessions use a
  separate token type from miner sessions, so a miner's token cannot reach
  any admin route.
- **KYC / withdrawals payout**: withdrawal requests can be created via the
  API, but there's no KYC provider wired up, so a fresh account's
  `kycStatus` stays `NONE` and withdrawal is blocked by design.

---

## Public deploy (shareable URL)

For a real link you can open on a phone, without running anything
locally. Free tiers are enough for testing.

### Backend + database — [Render](https://render.com)

1. Sign in to Render with GitHub, and give it access to this repo.
2. **New → PostgreSQL** — free tier is fine. Copy the **Internal Database URL** once it's provisioned.
3. **New → Redis** (Render calls it "Key Value") — free tier. Copy its internal URL.
4. **New → Web Service** → pick this repo.
   - **Root directory**: `backend`
   - **Build command**: `npm install && npx prisma generate && npm run build`
   - **Start command**: `npx prisma migrate deploy && npm run start:prod`
   - **Environment variables**: copy every key from `backend/.env.example`, with:
     - `DATABASE_URL` → the Postgres URL from step 2
     - `REDIS_URL` → the Redis URL from step 3
     - `JWT_SECRET` → any long random string (`openssl rand -hex 32`)
     - `WALLET_MODE` → leave as `offchain` for testing — no real chain calls, no private key needed
5. Deploy. Render gives you a URL like `https://matsumoto-api.onrender.com`. Confirm it's alive:
   ```bash
   curl https://matsumoto-api.onrender.com/api/auth/register -X POST \
     -H "Content-Type: application/json" -d '{"email":"you@example.com","password":"testpass123"}'
   ```

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
