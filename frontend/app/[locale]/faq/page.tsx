import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Article, StaticPage } from '../../../components/StaticPage';

/** Section keys, in the order they are shown. */
const KEYS = ['mining','cooldown','conversion','minWithdrawal','withdrawTime','kyc','boosters','boosterFailed','referrals','tasks'] as const;

export default async function FaqPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('faq');
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
