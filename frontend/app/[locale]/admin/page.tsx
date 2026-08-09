import { setRequestLocale } from 'next-intl/server';
import AdminClient from './admin-client';

/**
 * Server entry for the admin panel. Deliberately not linked from the miner
 * UI — operators reach it by URL and sign in with an admin account created
 * via `npm run admin:create` (there is no admin self-signup).
 */
export default function AdminPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <AdminClient />;
}
