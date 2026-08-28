import { getTranslations } from 'next-intl/server';
import { locales } from '../../../i18n';
import LeaderboardClient from './leaderboard-client';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'leaderboard',
  });
  return {
    title: `${t('title')} | BONDKOIN Labs`,
    description: t('subtitle'),
  };
}

export default function LeaderboardPage({
  params,
}: {
  params: { locale: string };
}) {
  return <LeaderboardClient locale={params.locale} />;
}
