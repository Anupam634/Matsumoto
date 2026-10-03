# Matsumoto Mining Platform

Cloud mining / reward-**simulation** platform on BNB Chain. See [`SPEC.md`](./SPEC.md) for the full spec.

> "Mining" = scheduled reward accrual (tap-to-earn). The only real on-chain part is the
> Matsumoto BEP-20 token and withdrawal payouts.

## Monorepo layout

```
minig-withdraw/
├── SPEC.md          # Single source of truth for all rules & numbers
├── backend/         # NestJS + Prisma (PostgreSQL) + Redis + ethers.js
├── frontend/        # Next.js (PWA) + Tailwind + next-intl (en/zh/ko)
└── mobile/          # Expo (React Native) app for Google Play — see mobile/README.md
```

## Quick start

### Backend
```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, REDIS_URL, chain vars
npm install
npx prisma migrate dev      # create schema
npm run start:dev           # http://localhost:4000
npm test                    # run mining-engine unit tests
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

### Mobile
```bash
cd mobile
npm install
npx expo start              # scan the QR with Expo Go
```

Same API, same message catalogue (`frontend/messages/*.json` is reused
verbatim), plus two things the web app does not have: a **Settings** screen
and a **notification centre** with OS-scheduled mining reminders.
Build and Play Store submission steps are in [`mobile/README.md`](./mobile/README.md).

## Core modules (backend `src/`)

| Module | Purpose | Built? |
|---|---|---|
| `auth/` | Email + password (scrypt), JWT sessions, `JwtAuthGuard`, referral capture | ✅ |
| `mining/` | Reward accrual engine — base rate × boosters × referral multiplier | ✅ |
| `boosters/` | Paid booster plans ($1/$5/$10/$50, 30d, stackable) | ✅ — bought with on-chain crypto, verified automatically, no admin step |
| `referrals/` | Invite tree + multiplier tiers | ✅ — no separate module; capture lives in `auth/`, the multiplier in `mining/`, the tree in `admin/` |
| `leaderboard/` | Global miner rankings — total mined, points held, miners invited | ✅ — masked identities, blocked accounts excluded |
| `tasks/` | Tweet/follow/repost/YouTube/quiz/spin-wheel rewards (honour-system claims) | ✅ |
| `withdrawals/` | Points → $Matsumoto (3:1), min 100, 1/week, admin-approved | ✅ |
| `wallet/` | **Swappable** chain layer (offchain ↔ testnet ↔ mainnet) | ✅ — `offchain` until the token contract details arrive |
| `admin/` | Miners, referral tree, block, per-country, rate adjust, airdrop | ✅ |
| `antiabuse/` | Multi-account / same-IP / same-device / bot-farm guards | ✅ |
| `kyc/` | Mandatory KYC gate — in-house manual document review | ✅ |

## API (built so far)

All routes are under `/api`. Everything except register/login needs
`Authorization: Bearer <accessToken>`.

| Method | Route | Notes |
|---|---|---|
| POST | `/auth/register` | `{ email, password, referralCode?, countryCode?, deviceFingerprint? }` |
| POST | `/auth/login` | Two steps on every platform: the password answers 401 `OTP_REQUIRED` (code emailed) or `TOTP_REQUIRED` (authenticator app on); repeat with `otp` / `totp` for `{ accessToken, user }` |
| GET | `/auth/me` | Profile, balance, KYC status, referral tier, `twoFactorEnabled` |
| POST | `/auth/2fa/setup` | New authenticator secret + `otpauth://` link (nothing enforced yet) |
| POST | `/auth/2fa/enable` | `{ code, password }` — turns 2FA on, signs other sessions out, returns a fresh `accessToken` |
| POST | `/auth/2fa/disable` | `{ code, password }` — turns it off; same token handling |
| GET | `/mining/status` | Live rate, pending points, cooldown |
| POST | `/mining/claim` | Tap "Mine" — settles accrued points |
| POST | `/withdrawals/send-otp` | Emails the withdrawal confirmation code to the caller |
| POST | `/withdrawals` | `{ points, toAddress, otp \| totp }` — min 100 pts, 1/week, KYC-gated; authenticator code if 2FA is on, else the emailed code |
| GET | `/withdrawals` | Caller's own request history |
| GET | `/tasks` | Active tasks with the caller's cooldown state |
| POST | `/tasks/:id/claim` | Credit a task reward (per-task cooldown) |
| GET | `/leaderboard` | `?category=EARNINGS\|BALANCE\|REFERRALS&period=ALL_TIME\|MONTH\|WEEK&limit=` — ranked miners plus the caller's own standing |
| GET | `/kyc` | Caller's own verification status |
| POST | `/kyc` | Submit identity documents for manual review |
| GET | `/boosters` | Plan catalogue, your active boosters, recent purchases |
| POST | `/boosters/purchase` | Quote a plan — pins price, payee and payer wallet |
| POST | `/boosters/purchase/:id/submit` | Submit the tx hash; verified on chain, activates on success |

### Admin panel (`/api/admin`, SPEC §6)

Separate token type — `typ: 'admin'`; a miner token is rejected on every route
below. Create the first operator with `npm run admin:create -- <email> <pass>`.
Sign-in takes the password and then a 6-digit code mailed to `ADMIN_OTP_EMAIL`;
admin tokens last `ADMIN_SESSION_TTL` (12h). Every sign-in attempt and every
change made through these routes is written to the audit log.

| Method | Route | Notes |
|---|---|---|
| POST | `/admin/login` | `{ email, password }` mails the code (401 `OTP_REQUIRED`); `{ email, password, otp }` returns an admin-scoped `accessToken` |
| GET | `/admin/stats` | Active miners (24h), totals, per-country counts |
| GET | `/admin/users` | Paginated + searchable miner list with live rates |
| GET | `/admin/users/:id` | Detail, referral tree (6 levels), ledger |
| POST | `/admin/users/:id/block` | Block / unblock |
| POST | `/admin/users/:id/rate` | Manual hash-rate adjustment |
| POST | `/admin/users/:id/airdrop` | Manual point grant |
| POST | `/admin/users/:id/2fa/reset` | Remove a miner's authenticator app (lost phone); signs them out, emails them |
| POST | `/admin/users/:id/sessions/revoke` | Sign a miner out of every device |
| GET/POST | `/admin/security/settings` | Sign-up caps and "require authenticator for withdrawals" — panel overrides of the env defaults |
| GET | `/admin/security/audit` | Admin audit trail, newest first, filterable |
| POST | `/admin/security/sessions/revoke-all` | Sign every admin out, everywhere |
| GET | `/admin/email-health?to=` | Send one real message to verify SMTP from the server |
| GET | `/admin/kyc` | KYC review queue, filterable by status |
| GET | `/admin/kyc/:userId` | Applicant detail, including document images |
| POST | `/admin/kyc/:userId/decision` | Approve or reject an application |
| GET | `/admin/withdrawals` | Approval queue, filterable by status |
| POST | `/admin/withdrawals/:id/decision` | Approve (pays out) or reject (refunds) |

UI lives at `/<locale>/admin`.

## Design principles (kept honest)

- Mined units are labelled **"Points"** in UI; value is realised only via the real BEP-20 token.
- Withdrawals settle by transparent, documented rules; admin approval is an ops queue, not a payout blocker.
- All reward math lives in one tested service (`mining/mining.service.ts`).
