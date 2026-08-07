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

## 9. OPEN QUESTIONS (need client answers before final build)

1. **Booster stacking math:** does each additional booster add a flat +rate, or multiply? What's the max reachable rate?
2. **Accrual model:** continuous server-side accrual, or only counts when user is within a claimed 24h window?
3. **Withdrawal fee:** any % or flat fee deducted? Gas paid by user or platform?
4. **Token details:** real contract address, ABI, decimals — or build against a testnet mock for now?
5. **Deposit/payment rail:** how do users pay for boosters — direct BNB/USDT transfer, on-page wallet payment, or a payment processor?
6. **KYC provider:** which service (Sumsub, Onfido, manual doc upload)?
7. **Task verification:** how strict — real API checks (X/YouTube) or honor-system + admin spot-check?
