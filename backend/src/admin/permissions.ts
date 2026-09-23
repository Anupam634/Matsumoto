/**
 * Fine-grained admin permissions, beyond the coarse `role` field.
 *
 * An admin with `role === 'super'` is treated as holding every permission
 * (see PermissionGuard) — this list is for granting a *specific* extra
 * capability to an otherwise-ordinary admin without making them super.
 */
export const PERMISSIONS = {
  /**
   * View the crypto-payment finance module: the full list of booster
   * purchases across every collector wallet, per-purchase detail (wallet,
   * tx hash), and each collector's daily-cap status.
   *
   * Deliberately separate from the general admin role: an admin without
   * this permission still sees crypto revenue inside the normal revenue
   * totals (that money is real platform revenue and is never excluded from
   * them) but cannot see which wallet collected it or any transaction hash
   * for a non-default collector.
   */
  CRYPTO_PAYMENT_VIEW: 'CRYPTO_PAYMENT_VIEW',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
