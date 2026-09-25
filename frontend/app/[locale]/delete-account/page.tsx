import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Article, StaticPage } from '../../../components/StaticPage';

/**
 * Public account-deletion page, linked from the Google Play listing.
 *
 * Play requires it to be reachable without the app or a session, so it only
 * explains the request flow; the request itself goes through support.
 */
const KEYS = ['app','web','deleted','kept','timing','partial'] as const;

export default async function DeleteAccountPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('deleteAccount');
  return (
    <StaticPage
      locale={locale}
      title={t('title')}
      intro={t('intro')}
      backLabel={t('backHome')}
    >
      {KEYS.map((k) => (
        <Article key={k} title={t(`q.${k}.q`)} body={t(`q.${k}.a`)} />
      ))}
    </StaticPage>
  );
}
