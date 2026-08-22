import { getTranslations } from 'next-intl/server';
import { locales } from '../../../i18n';
import ReferralsClient from './referrals-client';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale: params.locale, namespace: 'referrals' });
  return {
    title: `${t('title')} | BONDKOIN Labs`,
    description: t('subtitle'),
  };
}

export default function ReferralsPage({
  params,
}: {
  params: { locale: string };
}) {
  return <ReferralsClient locale={params.locale} />;
}
