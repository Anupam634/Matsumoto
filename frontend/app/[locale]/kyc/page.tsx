import { setRequestLocale } from 'next-intl/server';
import KycClient from './kyc-client';

export default function KycPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <KycClient />;
}
