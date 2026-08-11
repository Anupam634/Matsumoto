import { setRequestLocale } from 'next-intl/server';
import SupportClient from './support-client';

export default function SupportPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <SupportClient />;
}
