import { setRequestLocale } from 'next-intl/server';
import FinanceClient from './finance-client';

/**
 * Separate entry point for the crypto-payment finance module — its own URL,
 * not a tab inside the general admin panel (`/admin`), and not linked from
 * it. Signing in here uses the same admin credentials as `/admin` (one
 * AdminUser table), but every read is gated server-side on the
 * CRYPTO_PAYMENT_VIEW permission (or role: 'super') by PermissionGuard; an
 * admin without it authenticates fine and then gets 403s from every call,
 * same as if this page didn't exist for them.
 */
export default function AdminFinancePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <FinanceClient />;
}
