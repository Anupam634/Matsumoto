import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Article, StaticPage } from '../../../components/StaticPage';

/** Section keys, in the order they are shown. */
const KEYS = ['service','eligibility','points','payouts','conduct','liability','changes'] as const;

export default async function TermsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('terms');
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
