import { setRequestLocale } from 'next-intl/server';
import BoostersClient from './boosters-client';

export default function BoostersPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <BoostersClient />;
}
