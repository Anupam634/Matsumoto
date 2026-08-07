# Matsumoto Mining Platform

Cloud mining / reward-**simulation** platform on BNB Chain. See [`SPEC.md`](./SPEC.md) for the full spec.

> "Mining" = scheduled reward accrual (tap-to-earn). The only real on-chain part is the
> Matsumoto BEP-20 token and withdrawal payouts.

## Monorepo layout

```
minig-withdraw/
├── SPEC.md          # Single source of truth for all rules & numbers
├── backend/         # NestJS + Prisma (PostgreSQL) + Redis + ethers.js
└── frontend/        # Next.js (PWA) + Tailwind + next-intl (en/zh/ko)
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

## Core modules (backend `src/`)

| Module | Purpose |
|---|---|
| `auth/` | Email + password (scrypt), JWT sessions, `JwtAuthGuard`, referral capture |
| `mining/` | Reward accrual engine — base rate × boosters × referral multiplier |
| `boosters/` | Paid booster plans ($1/$5/$10/$50, 30d, stackable) |
| `referrals/` | Invite tree + multiplier tiers |
| `tasks/` | Tweet/follow/repost/YouTube/quiz/spin-wheel rewards |
| `withdrawals/` | Points → $Matsumoto (3:1), min 100, 1/week, admin-approved |
| `wallet/` | **Swappable** chain layer (offchain ↔ testnet ↔ mainnet) |
| `admin/` | Miners, referral tree, block, per-country, rate adjust, airdrop |
| `antiabuse/` | Multi-account / same-IP / same-device / bot-farm guards |
| `kyc/` | Mandatory KYC gate |

## API (built so far)

All routes are under `/api`. Everything except register/login needs
`Authorization: Bearer <accessToken>`.

| Method | Route | Notes |
|---|---|---|
| POST | `/auth/register` | `{ email, password, referralCode?, countryCode?, deviceFingerprint? }` |
| POST | `/auth/login` | Returns `{ accessToken, user }` |
| GET | `/auth/me` | Profile, balance, KYC status, referral tier |
| GET | `/mining/status` | Live rate, pending points, cooldown |
| POST | `/mining/claim` | Tap "Mine" — settles accrued points |
| POST | `/withdrawals` | `{ points, toAddress }` — min 100 pts, 1/week, KYC-gated |
| GET | `/withdrawals` | Caller's own request history |

Admin routes (approval queue, block, airdrop) land with the `admin/` module.

## Design principles (kept honest)

- Mined units are labelled **"Points"** in UI; value is realised only via the real BEP-20 token.
- Withdrawals settle by transparent, documented rules; admin approval is an ops queue, not a payout blocker.
- All reward math lives in one tested service (`mining/mining.service.ts`).
