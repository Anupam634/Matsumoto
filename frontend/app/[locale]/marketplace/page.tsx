import { setRequestLocale } from 'next-intl/server';
import MarketplaceClient from './marketplace-client';

export const metadata = {
  title: 'BONDKOIN Network Marketplace | Real-World Utilities on BNB Chain',
  description:
    'Shop with $BONDKOIN on BNB Smart Chain. Discover regional commerce, verified merchants, and real-world utilities powered by BONDKOIN.',
};

export default function MarketplacePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <MarketplaceClient />;
}
