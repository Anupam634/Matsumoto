# BONDKOIN — mobile app

The native app for the BONDKOIN mining platform. Expo (SDK 57) + expo-router,
talking to the same API as `../frontend`, with the web app's message catalogue
reused verbatim so both clients say the same thing in en / 中文 / 한국어.

```
mobile/
├── app/                     # routes (expo-router, file-based)
│   ├── _layout.tsx          # providers, auth gate, splash
│   ├── (auth)/              # welcome, sign-in, sign-up, forgot
│   ├── (tabs)/              # Mine · Boost · Market · Ranks · Account
│   ├── settings/            # appearance, language, notifications, about
│   ├── support/             # inbox + thread
│   ├── legal/[doc].tsx      # FAQ, Terms, Privacy (shared copy)
│   ├── tasks · withdraw · referrals · kyc · history · notifications
│   └── product/[id].tsx     # marketplace detail
└── src/
    ├── api/                 # client (SecureStore JWT) + typed endpoints
    ├── components/ui/       # the design system
    ├── components/…         # mining dial, task sheets, app lock, pickers
    ├── i18n/                # web message catalogue + mobile-only strings
    ├── store/               # session, settings, notification centre
    ├── theme/               # tokens + light/dark provider
    └── lib/                 # push, haptics + sound, formatting, hooks
```

## Run it

```bash
cd mobile
npm install
npx expo start                 # then scan the QR with Expo Go
npx expo start --android       # or boot straight into an emulator
```

Everything in the app runs in **Expo Go** except remote push tokens, which need
a development build (Android dropped Expo Go push support in SDK 53). Local
scheduled notifications — the mining reminder, bounty and booster nudges — work
in Expo Go.

Point the app at a different API by editing `expo.extra.apiUrl` in `app.json`:

```jsonc
"extra": {
  "apiUrl": "https://api.bondkoinlabs.com/api",   // or http://192.168.x.x:3001/api for local dev
  "webUrl": "https://bondkoinlabs.com"
}
```

Use your machine's LAN IP for local development, not `localhost` — that
resolves to the phone itself. The API allows requests with no `Origin` header,
so a native client needs no CORS changes.

## What's in it

| Area | Screen | Notes |
|---|---|---|
| Auth | welcome · sign-in · sign-up · forgot | Email OTP, country picker, `?ref=` capture |
| Mining | Mine tab | Live accrual dial, 24h ring, one-tap claim, haptics + sound |
| Bounties | `/tasks` | Spin wheel, quiz, watch-to-earn, social tasks |
| Boosters | Boost tab | Plans, active boosters, 2-step USDT checkout, history |
| Marketplace | Market tab | Catalogue, product detail, simulated checkout, merchant sign-up |
| Rankings | Ranks tab | Three boards × three periods, your standing pinned |
| Referrals | `/referrals` | Code, native share, tier ladder, roster with filters |
| Withdrawals | `/withdraw` | 3:1 conversion, gates, address confirmation, BscScan links |
| Identity | `/kyc` | Camera capture, on-device downscale, status tracking |
| Support | `/support` | Ticket inbox and a real conversation thread |
| **Settings** | `/settings` | Theme, language, haptics, sound, app lock, private balance, data, about |
| **Notifications** | `/notifications` | In-app centre + OS scheduling with quiet hours |

The two bold rows are new on mobile — the web app has no equivalent.

### How notifications work

The API has no notifications endpoint, so the app builds them itself:

- **Scheduled locally** — "your node is ready" fires at the exact moment the
  24-hour cooldown lifts, plus nudges for bounty cooldowns and boosters about
  to expire. These arrive with the app closed.
- **Derived on refresh** — a background poll compares fresh state against the
  last snapshot and records what changed (withdrawal paid, KYC decided, support
  replied, new referral, tier upgrade) into the notification centre.
- **Quiet hours** shift a delivery out of the window rather than dropping it.

Every category is individually switchable in Settings → Notifications, and the
master switch cancels what is already scheduled.

## Publishing to Google Play

### 1. One-time setup

```bash
npm install -g eas-cli
eas login
eas init                       # writes a real projectId into app.json → extra.eas
```

Replace the placeholder `extra.eas.projectId` in `app.json` (currently all
zeros) — push tokens and OTA updates both key off it.

### 2. Build the release bundle

```bash
npm run build:preview          # APK for internal testing
npm run build:android          # AAB for the Play Store
```

`eas.json` already defines the three profiles (`development`, `preview`,
`production`). Production uses `appVersionSource: remote` with
`autoIncrement`, so EAS manages `versionCode` for you — bump
`expo.version` in `app.json` for user-visible releases.

### 3. Submit

```bash
npm run submit:android
```

Needs a Google Play service-account key at `./play-service-account.json`
(Play Console → Setup → API access). The profile targets the **internal** track
as a **draft** — promote it in the Play Console once you have checked the
listing.

### 4. Store listing checklist

- **Package**: `com.bondkoinlabs.app` (set in `app.json`, cannot change later)
- **Icon**: 512×512 PNG — `assets/icon.png`
- **Feature graphic**: 1024×500 — not in the repo, needs designing
- **Screenshots**: at least 2 phone shots; capture Mine, Boost, Ranks, Account
- **Short description** (80 chars):
  `Mine BONDKOIN points daily on BNB Chain. Boosters, bounties, on-chain payouts.`
- **Category**: Finance
- **Content rating**: complete the questionnaire; the app has no ads and no
  user-generated content beyond support tickets
- **Privacy policy URL**: `https://bondkoinlabs.com/en/privacy` (required —
  the app collects email, country, device id and KYC documents)

### 5. Data safety form

Declare, because the app genuinely collects them:

| Data | Purpose | Notes |
|---|---|---|
| Email address | Account management | Required to register |
| Country | Analytics, fraud prevention | Chosen at signup |
| Device ID | Fraud prevention | Anti-abuse (SPEC §7) |
| Government ID + selfie | Identity verification | KYC, reviewed manually |
| Wallet address | App functionality | Withdrawal destination |

Everything is transmitted over HTTPS. Nothing is sold. The JWT lives in the OS
keychain via `expo-secure-store`.

### 6. Financial-app policy

Play reviews crypto apps closely. Points are labelled **Points** everywhere in
the UI and the payout rules (3:1, 100-point minimum, one request a week,
KYC-gated, operator-reviewed) are stated on the withdrawal screen and in the
in-app Terms — keep it that way. The app does not sell tokens, run a wallet, or
custody keys; boosters are paid from the miner's own wallet on BNB Chain.

## Checks

```bash
npm run lint                   # tsc --noEmit
npm run doctor                 # expo-doctor: dependency and config audit
npx expo export --platform android   # full Metro bundle, catches import errors
```

## Not included

The web app's **admin panel** (`/[locale]/admin`) is deliberately absent. It is
an operator tool behind a separate admin token, and shipping an admin login
inside a consumer app invites both Play policy trouble and credential
phishing. If operators want it on a phone, it belongs in its own build with its
own package name.
