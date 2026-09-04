import type { ImageSourcePropType } from 'react-native';

/**
 * Marketplace catalogue.
 *
 * The same eight listings the web app ships, with the images bundled rather
 * than fetched — the marketplace is a preview of the coming commercial
 * release, so the catalogue is static on both clients until the merchant API
 * exists.
 */

export type ProductCategory =
  | 'hardware'
  | 'merch'
  | 'digital'
  | 'regional'
  | 'vouchers';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  bondkoinPrice: number;
  usdEquivalent: number;
  merchant: string;
  merchantVerified: boolean;
  region: string;
  image: ImageSourcePropType;
  badge?: string;
  description: string;
  inStock: number;
  deliveryDays: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'BONDKOIN Genesis Hardware Security Key',
    category: 'hardware',
    categoryLabel: 'Hardware & Devices',
    bondkoinPrice: 450,
    usdEquivalent: 150,
    merchant: 'BONDKOIN Hardware Labs',
    merchantVerified: true,
    region: 'Global Shipping',
    image: require('../../assets/products/hardware_wallet.jpg'),
    badge: 'Official Ecosystem Device',
    description:
      'Military-grade tamper-proof hardware authentication and cold storage key for BNB Chain & Web3 assets.',
    inStock: 85,
    deliveryDays: '3-5 Business Days',
  },
  {
    id: 'prod-2',
    name: 'High-Hashrate Eco Node Rig (Mini-Cluster)',
    category: 'hardware',
    categoryLabel: 'Hardware & Devices',
    bondkoinPrice: 1200,
    usdEquivalent: 400,
    merchant: 'NodeTech Global Corp',
    merchantVerified: true,
    region: 'Regional & International',
    image: require('../../assets/products/node_rig.jpg'),
    badge: 'Popular Node Rig',
    description:
      'Plug-and-play low-wattage eco hardware node with pre-installed BONDKOIN network telemetry and auto-sync.',
    inStock: 24,
    deliveryDays: '4-7 Business Days',
  },
  {
    id: 'prod-3',
    name: 'BONDKOIN Cyber Stealth Heavyweight Hoodie',
    category: 'merch',
    categoryLabel: 'Official Apparel',
    bondkoinPrice: 120,
    usdEquivalent: 40,
    merchant: 'Web3 Streetwear Co.',
    merchantVerified: true,
    region: 'Worldwide Express',
    image: require('../../assets/products/stealth_hoodie.jpg'),
    badge: 'Limited Edition 2026',
    description:
      'Premium 450 GSM heavyweight organic cotton hoodie embroidered with reflective BONDKOIN monogram & BNB Chain badge.',
    inStock: 150,
    deliveryDays: '2-4 Business Days',
  },
  {
    id: 'prod-4',
    name: '1-Year Dedicated Cloud Node VPS Tier-1',
    category: 'digital',
    categoryLabel: 'Digital Services',
    bondkoinPrice: 240,
    usdEquivalent: 80,
    merchant: 'EtherCloud Infrastructure',
    merchantVerified: true,
    region: 'Instant Digital Delivery',
    image: require('../../assets/products/cloud_vps.jpg'),
    badge: 'Instant Activation',
    description:
      'High-speed NVMe 8GB RAM Linux server in 12 global regions, tuned for 24/7 Web3 node connectivity and uptime.',
    inStock: 999,
    deliveryDays: 'Instant Access',
  },
  {
    id: 'prod-5',
    name: 'Regional Artisan Coffee & Tea Gift Crate',
    category: 'regional',
    categoryLabel: 'Regional Commerce',
    bondkoinPrice: 60,
    usdEquivalent: 20,
    merchant: 'Pacific Heritage Roasters',
    merchantVerified: true,
    region: 'Asia-Pacific / Regional Dispatch',
    image: require('../../assets/products/coffee_crate.jpg'),
    badge: 'Local Verified Merchant',
    description:
      'Handcrafted single-origin roast coffee and organic highland tea beans sourced from certified regional farmers.',
    inStock: 60,
    deliveryDays: '2-3 Regional Days',
  },
  {
    id: 'prod-6',
    name: 'Web3 Quantum Privacy VPN Subscription (Annual)',
    category: 'digital',
    categoryLabel: 'Digital Services',
    bondkoinPrice: 90,
    usdEquivalent: 30,
    merchant: 'ZeroTrace Cybersec',
    merchantVerified: true,
    region: 'Global Digital Key',
    image: require('../../assets/products/privacy_vpn.jpg'),
    badge: 'No Logs Verified',
    description:
      'Multi-hop encrypted VPN with WireGuard protocol, decentralized DNS routing, and zero data logging.',
    inStock: 500,
    deliveryDays: 'Instant Delivery',
  },
  {
    id: 'prod-7',
    name: 'BNB Smart Chain Gas Credit Voucher (0.1 BNB)',
    category: 'vouchers',
    categoryLabel: 'Vouchers & Credits',
    bondkoinPrice: 180,
    usdEquivalent: 60,
    merchant: 'DeFi Bridge Services',
    merchantVerified: true,
    region: 'On-Chain Code',
    image: require('../../assets/products/gas_voucher.jpg'),
    badge: 'Gas Voucher',
    description:
      'Prepaid BNB gas credit voucher code for smart contract deployment, token transfers, and DeFi swap fees.',
    inStock: 300,
    deliveryDays: 'Instant On-Chain Code',
  },
  {
    id: 'prod-8',
    name: 'BONDKOIN Thermal Traveler Tumbler Kit',
    category: 'merch',
    categoryLabel: 'Official Apparel & Goods',
    bondkoinPrice: 75,
    usdEquivalent: 25,
    merchant: 'BONDKOIN Hardware Labs',
    merchantVerified: true,
    region: 'Global Shipping',
    image: require('../../assets/products/thermal_tumbler.jpg'),
    badge: 'Double Wall Vacuum',
    description:
      'Matte black 750ml food-grade 304 stainless steel tumbler with laser-engraved BONDKOIN emblem & temperature gauge.',
    inStock: 110,
    deliveryDays: '3-5 Business Days',
  },
];

/** Filter order on the storefront. Labels live in i18n: `marketScreen.cat.<id>`. */
export const CATEGORY_IDS: ProductCategory[] = [
  'hardware',
  'merch',
  'digital',
  'regional',
  'vouchers',
];

/**
 * Categories a merchant can apply under — the web form's five options.
 * Labels live in i18n: `marketScreen.merchantCat.<id>`.
 */
export const MERCHANT_CATEGORIES = [
  'electronics',
  'apparel',
  'digital',
  'regional',
  'giftcards',
] as const;
export type MerchantCategory = (typeof MERCHANT_CATEGORIES)[number];

export interface LetterSection {
  title: string;
  paragraphs: string[];
}

export interface MarketLetter {
  greeting: string;
  intro: string;
  sections: LetterSection[];
  closing: string;
}

/**
 * The official community announcement the web marketplace publishes above
 * the storefront. English only for now; once the `marketScreen.letter*` keys
 * land in the catalogue this constant can be replaced by `t()` lookups.
 */
export const MARKET_LETTER: MarketLetter = {
  greeting: 'Dear BONDKOIN Network Community,',
  intro:
    'As part of our commitment to developing real world utilities around $BONDKOIN, we are pleased to share an update on one of the core Ecosystem utilities currently under development: the BONDKOIN Network Marketplace.',
  sections: [
    {
      title: 'Shopping, Merchants & Regional Commerce',
      paragraphs: [
        'The BONDKOIN Network Marketplace will allow users to shop for goods from participating merchants, pay with $BONDKOIN, and have their purchases delivered to their location. Through our Merchant Program, verified businesses will be able to register their stores and upload products for buyers to discover and purchase.',
        'The Marketplace will initially support regional commerce, connecting buyers with merchants within or close to their region. As the merchant network grows, our goal is to expand beyond regional commerce into a global marketplace where users can purchase goods from merchants around the world and have them delivered to their locations.',
      ],
    },
    {
      title: '$BONDKOIN As A Means Of Payment',
      paragraphs: [
        'At the heart of the Marketplace is $BONDKOIN as the means of payment. Goods and services offered through the platform will be purchased using $BONDKOIN, giving the coin a direct and practical function within the ecosystem. Merchants joining the Merchant Program will be required to accept $BONDKOIN and comply with applicable Marketplace policies covering product standards, merchant conduct, pricing, transactions, fulfilment, delivery and the applicable $BONDKOIN valuation.',
      ],
    },
    {
      title: 'One Of Many BONDKOIN Network Utilities',
      paragraphs: [
        'The Marketplace is one of many utilities planned for the BONDKOIN Network ecosystem and an important step toward our broader vision. Mining is only one part of that journey. We are building an ecosystem where $BONDKOIN is supported by genuine utility and can be used across products, services and utilities built around BONDKOIN Network.',
      ],
    },
  ],
  closing: 'Thank you for continuing to build with us. The future is BONDKOIN NETWORK.',
};

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
