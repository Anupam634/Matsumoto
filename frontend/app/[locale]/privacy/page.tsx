import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Article, StaticPage } from '../../../components/StaticPage';

/** Section keys, in the order they are shown. */
const KEYS = ['collect','kycData','use','share','retain','rights','contact'] as const;

export default async function PrivacyPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('privacy');
  return (
    <StaticPage
      locale={locale}
      title={t('title')}
      intro={t('intro')}
      backLabel={t('backHome')}
      updated={t('updated')}
    >
      {KEYS.map((k) => (
        <Article key={k} title={t(`q.${k}.q`)} body={t(`q.${k}.a`)} />
      ))}
    </StaticPage>
  );
}
