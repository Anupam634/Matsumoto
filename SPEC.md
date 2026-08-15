# Matsumoto Mining Platform — Technical Specification

> Cloud mining / reward-**simulation** platform on BNB Chain.
> "Mining" is a scheduled reward accrual (tap-to-earn), NOT real PoW hardware.
> The only real on-chain component is the Matsumoto BEP-20 token + withdrawal payouts.

---

## 1. Product summary

- **Registration:** free.
- **Mining:** user taps "Mine" once per 24h; accrues **Matsumoto Points** at a per-hour rate.
- **Boosters:** bought with real crypto; increase the per-hour rate; 30 days each; stackable (buy as many as you want).
- **Referrals:** invited-user count sets a mining-rate multiplier (see table).
- **Tasks:** tweet, follow, repost, watch YouTube, quiz, spin wheel — grant point rewards.
- **KYC:** mandatory for all users (stated reason: fair coin distribution).
- **Withdrawal:** points convert to on-chain $Matsumoto and are paid out, subject to admin approval.
- **Platform:** responsive website + installable app (PWA).
- **Languages:** English, 中文 (Chinese), 한국어 (Korean).

---

## 2. Mining reward math

- **Base rate:** `0.9 Matsumoto Points / hour`.
- **Effective rate:**
  `rate = base_rate × booster_multiplier_sum × referral_multiplier`
  - Booster note from client: "$1 package boosts to 2.9/hr" → a $1 booster **adds +2.0/hr** on top of the 0.9 base (0.9 → 2.9). Confirm whether multiple boosters add flat +2.0 each or stack multiplicatively. **OPEN — see §9.**
- **Claim cadence:** user must press "Mine" once per 24h to keep accruing. Confirm whether accrual is continuous (server-side) or only while claimed window is active. **OPEN — see §9.**

### Booster packages (real money in)
| Price (USD) | Resulting rate |
|---|---|
| $1  | 2.9 Matsumoto/hr |
| $5  | 10.9 Matsumoto/hr |
| $10 | 20.9 Matsumoto/hr |
| $50 | 90.9 Matsumoto/hr |
- Duration: **30 days** each. Stackable, unlimited quantity.

### Referral multiplier (by invited-user count)
| Invited users | Level | Multiplier |
|---|---|---|
| 0 | 1 | ×1 |
| 1–5 | 2 | ×3 |
| 6–10 | 3 | ×4 |
| 11–20 | 4 | ×5 |
| 21–30 | 5 | ×6 |
| 31–2000 | 6 | ×8 |

---

## 3. Token & conversion

- **Token:** Matsumoto, BEP-20 on BNB Chain — client states it is **already deployed**. (Need: contract address + ABI + decimals.)
- **Conversion:** `3 Matsumoto Points = 1 mainnet $Matsumoto`.
- **Listing:** client intends to list the coin after reaching 500k users (business milestone, not an engineering task).
- Points are internal DB units; $Matsumoto is the real transferable asset paid on withdrawal.

---

## 4. Withdrawal rules

- **Minimum:** 100 Matsumoto Points.
- **Frequency:** 1 withdrawal request per week per user.
- **Approval:** manual admin review before on-chain payout.
- **KYC:** must be completed/approved before withdrawal.
- Fees: **OPEN** — client hasn't specified a withdrawal fee. **See §9.**

---

## 5. Tasks / engagement

Reward-granting tasks: tweet, follow, repost, watch YouTube video, quiz participation, spin wheel.
- Each task = configurable point reward, verification method, and cooldown. (Verification depth per task is OPEN.)

---

## 6. Admin panel

- Active miners count.
- Referral count + full referral tree per user.
- User balances.
- Block / unblock user.
- User counts by country.
- Increase / decrease a user's hash (mining) rate manually.
- Manual airdrop claim function.
- Withdrawal approval queue (implied by manual-approval rule).

---

## 7. Anti-abuse (required by client)

Limits/detection for: multiple accounts, same IP address, same device (fingerprint), fake referrals, bot farming.

---

## 8. Proposed architecture

- **Frontend:** Next.js (React) + Tailwind, PWA, i18n via next-intl (en/zh/ko).
- **Backend:** Node (NestJS) + PostgreSQL (Prisma) + Redis (accrual jobs, rate limits, anti-abuse counters).
- **Chain:** ethers.js on BNB Chain; WalletConnect/MetaMask link; swappable `WalletService`
  (real contract ↔ BSC-testnet mock ↔ off-chain-points-first).
- **Realtime:** Socket.IO for live hash rate / active miners / earnings.
- **Auth:** email/OTP or wallet; JWT sessions; KYC provider integration.

---

## 9. QUESTION LOG

### 9a. Answered by the client (Jul 3 call)

| # | Question | Answer |
|---|---|---|
| 1 | Real mining hardware or simulation? | Simulation, "like periacoin com" |
| 2 | Accrual model | User taps "Mine" once per 24h. Implemented as continuous server-side accrual capped at a 24h window, settled by the tap. |
| 3 | Booster quantity | "user can buy maximum booster they wish" — unlimited, stackable, 30 days each |
| 4 | Referral structure | Not a % commission — an invite-count → mining-rate multiplier (§2 table) |
| 5 | Withdrawal minimum / frequency | 100 Matsumoto Points, 1 request per week |
| 6 | Withdrawal approval | Manual admin review |
| 7 | Conversion rate | 3 Matsumoto Points = 1 mainnet $Matsumoto |
| 8 | KYC scope | Mandatory for all users, "for fairness of coin distribution" |
| 9 | Listing | After 500k users (business milestone, not engineering) |
| 10 | UI/UX + branding assets | None supplied — "its all your imagization to start with" |

### 9b. BLOCKING — still unanswered, needed before a real-money launch

1. **Token details:** client says the BEP-20 is "created already" on BNB Chain, but has not supplied the **contract address, ABI, or decimals**. Until then `WALLET_MODE=offchain` is the only honest setting — no real payout can be wired.
2. **Deposit / payment rail:** "people use real money to buy booster plans" — but *how*? Direct BNB/USDT transfer, on-page wallet payment, or a card processor? Nothing can be charged until this is chosen.
3. **Withdrawal fee:** asked, not answered. Any % or flat deduction? Who pays gas — user or platform?
4. **KYC provider:** mandatory KYC confirmed, but no provider named (Sumsub / Onfido / manual doc upload). Gates every payout.
5. **Task verification depth:** task types confirmed (tweet, follow, repost, YouTube, quiz, spin wheel) but not whether they need real X/YouTube API checks or honour-system + admin spot-check.

### 9c. AMBIGUOUS — our reading, needs confirmation

**Does the referral multiplier apply to booster bonuses, or only to the base rate?**

The client's only worked example (`$1 booster → 2.9/hr`) was given at 0 invites, where the
multiplier is ×1 — so it does **not** disambiguate the two readings. The financial
difference is very large:

| Reading | Formula | $50 booster + 31 invites |
|---|---|---|
| **A — current implementation** | `(base + Σ bonuses) × multiplier` | **727.2 /hr** |
| B — multiplier on base only | `(base × multiplier) + Σ bonuses` | 97.2 /hr |

Reading A is ~7.5× more expensive to the platform, and because boosters are **unlimited and
stackable** the effective rate is unbounded: 10 × $50 boosters at 31+ invites yields
~7,207 points/hr ≈ 57,650 $Matsumoto/day for a $500 outlay. Confirm the intended formula and
whether a rate cap is wanted before any real-money launch.

### 9d. CONTRADICTION — resolved in favour of the client's direct answer

The job post asks for "**instant** withdrawal" with "automated transaction processing", but
in conversation the client said withdrawals "undergo admin preview manually". Built as
manual admin approval (§4). Worth re-confirming, since the two statements conflict.
