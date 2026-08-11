import { setRequestLocale } from 'next-intl/server';
import WithdrawClient from './withdraw-client';

export default function WithdrawPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <WithdrawClient />;
}
