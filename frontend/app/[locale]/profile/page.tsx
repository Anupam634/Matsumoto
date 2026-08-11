import { setRequestLocale } from 'next-intl/server';
import ProfileClient from './profile-client';

export default function ProfilePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <ProfileClient />;
}
