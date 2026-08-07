import { setRequestLocale } from 'next-intl/server';
import DashboardClient from './dashboard-client';

/**
 * Server entry for the dashboard route. It only pins the locale so the page
 * can be statically rendered — the interactive part is the client component.
 */
export default function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <DashboardClient />;
}
