'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppHeader } from '../../../components/AppHeader';
import { MobileTabBar } from '../../../components/MobileTabBar';
import { BnbBadge } from '../../../components/BnbLogo';
import { getProfile, type Profile } from '../../../lib/api';

interface ProductItem {
  id: string;
  name: string;
  category: 'hardware' | 'merch' | 'digital' | 'regional' | 'vouchers';
  categoryLabel: string;
  bondkoinPrice: number;
  usdEquivalent: number;
  merchant: string;
  merchantVerified: boolean;
  region: string;
  imageSrc: string;
  badge?: string;
  description: string;
  inStock: number;
  deliveryDays: string;
}

const PRODUCTS: ProductItem[] = [
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
    imageSrc: '/products/hardware_wallet.jpg',
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
    imageSrc: '/products/node_rig.jpg',
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
    imageSrc: '/products/stealth_hoodie.jpg',
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
    imageSrc: '/products/cloud_vps.jpg',
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
    imageSrc: '/products/coffee_crate.jpg',
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
    imageSrc: '/products/privacy_vpn.jpg',
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
    imageSrc: '/products/gas_voucher.jpg',
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
    imageSrc: '/products/thermal_tumbler.jpg',
    badge: 'Double Wall Vacuum',
    description:
      'Matte black 750ml food-grade 304 stainless steel tumbler with laser-engraved BONDKOIN emblem & temperature gauge.',
    inStock: 110,
    deliveryDays: '3-5 Business Days',
  },
];

export default function MarketplaceClient() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'en';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [checkoutProduct, setCheckoutProduct] = useState<ProductItem | null>(null);
  const [showLetter, setShowLetter] = useState<boolean>(false);
  const [showMerchantModal, setShowMerchantModal] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [merchantSuccess, setMerchantSuccess] = useState<boolean>(false);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {});
  }, []);

  const points = profile?.pointsBalance ?? 0;
  const tokenEquivalent = profile ? (points / 3).toFixed(2) : '0.00';

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app-shell min-h-dvh">
      <AppHeader
        locale={locale}
        backLabel="Back to dashboard"
        maxWidth="max-w-6xl"
      />

      <main
        className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6"
        style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}
      >
        {/* ─── Hero Announcement & Ecosystem Vision ─── */}
        <section className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-cyan-600/15 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
                <span>🛒</span>
                <span>BONDKOIN Network Ecosystem Utility</span>
              </div>
              <BnbBadge label="BNB Chain Commerce" />
            </div>

            <h1 className="mt-4 text-2xl sm:text-4xl font-black tracking-tight text-white">
              BONDKOIN Network Marketplace
            </h1>
            <p className="mt-2 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              Shop real-world goods from verified merchants, pay directly using{' '}
              <strong className="text-cyan-300 font-mono">$BONDKOIN</strong>, and
              explore regional commerce expanding to global trade.
            </p>

            {/* Development Status Notice */}
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
              <div className="flex items-start gap-2.5">
                <span className="text-base">🚧</span>
                <div>
                  <strong className="font-bold text-amber-300 uppercase tracking-wide block">
                    Current Development Status (Testnet Preview)
                  </strong>
                  <p className="mt-1 leading-relaxed opacity-90">
                    The BONDKOIN Network Marketplace is currently under active development.
                    Catalog listings, 3D product previews, and simulated wallet checkouts demonstrate
                    the upcoming commercial release. Verified merchant registrations are now open!
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowMerchantModal(true)}
                className="btn-gold rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-blue-500/20"
              >
                🏪 Apply for Merchant Program
              </button>

              <button
                type="button"
                onClick={() => setShowLetter((v) => !v)}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-xs font-bold text-slate-200 hover:border-blue-500/50 hover:text-blue-300 transition-all backdrop-blur-md"
              >
                {showLetter ? 'Hide Community Announcement ▲' : 'Read Official Announcement ▼'}
              </button>

              {profile && (
                <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2 text-xs">
                  <span className="text-slate-400">Your Balance:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    ≈ {tokenEquivalent} $BONDKOIN
                  </span>
                  <span className="text-slate-500 font-mono">({points.toFixed(1)} PTS)</span>
                </div>
              )}
            </div>

            {/* Expandable Official Community Letter */}
            {showLetter && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/90 p-5 sm:p-7 text-xs sm:text-sm text-slate-300 space-y-4 animate-in fade-in duration-300 font-sans leading-relaxed">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="font-mono text-xs font-bold uppercase text-blue-400">
                    Official Community Announcement · Ecosystem Roadmap
                  </span>
                  <span className="text-xs text-slate-500">August 2026</span>
                </div>

                <p className="font-medium text-slate-200">
                  <strong>Dear BONDKOIN Network Community,</strong>
                  <br />
                  As part of our commitment to developing real world utilities around{' '}
                  <strong className="text-cyan-300 font-mono">$BONDKOIN</strong>, we are
                  pleased to share an update on one of the core Ecosystem utilities currently
                  under development: the <strong>BONDKOIN Network Marketplace</strong>.
                </p>

                <div className="space-y-3">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wide text-blue-300">
                    🛒 Shopping, Merchants & Regional Commerce
                  </h3>
                  <p>
                    The BONDKOIN Network Marketplace will allow users to shop for goods from
                    participating merchants, pay with $BONDKOIN, and have their purchases delivered
                    to their location. Through our Merchant Program, verified businesses will be
                    able to register their stores and upload products for buyers to discover and
                    purchase.
                  </p>
                  <p>
                    The Marketplace will initially support regional commerce, connecting buyers
                    with merchants within or close to their region. As the merchant network grows,
                    our goal is to expand beyond regional commerce into a global marketplace where
                    users can purchase goods from merchants around the world and have them
                    delivered to their locations.
                  </p>

                  <h3 className="font-bold text-white text-sm uppercase tracking-wide text-blue-300 pt-2">
                    💰 $BONDKOIN As A Means Of Payment
                  </h3>
                  <p>
                    At the heart of the Marketplace is $BONDKOIN as the means of payment. Goods
                    and services offered through the platform will be purchased using $BONDKOIN,
                    giving the coin a direct and practical function within the ecosystem. Merchants
                    joining the Merchant Program will be required to accept $BONDKOIN and comply
                    with applicable Marketplace policies covering product standards, merchant
                    conduct, pricing, transactions, fulfilment, delivery and the applicable
                    $BONDKOIN valuation.
                  </p>

                  <h3 className="font-bold text-white text-sm uppercase tracking-wide text-blue-300 pt-2">
                    🛠️ One Of Many BONDKOIN Network Utilities
                  </h3>
                  <p>
                    The Marketplace is one of many utilities planned for the BONDKOIN Network
                    ecosystem and an important step toward our broader vision. Mining is only one
                    part of that journey. We are building an ecosystem where $BONDKOIN is supported
                    by genuine utility and can be used across products, services and utilities
                    built around BONDKOIN Network.
                  </p>

                  <p className="font-bold text-white pt-2">
                    Thank you for continuing to build with us. The future is{' '}
                    <span className="text-cyan-300">BONDKOIN NETWORK</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── 4 Core Pillars ─── */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="text-2xl mb-2">🛒</div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Regional Commerce
            </h3>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Direct regional fulfillment connecting local verified merchants with buyers.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              $BONDKOIN Payment
            </h3>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Seamless checkout with BEP-20 $BONDKOIN on BNB Smart Chain.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="text-2xl mb-2">🏪</div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Verified Merchant
            </h3>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Standardized merchant quality reviews, escrow settlement, and dispute safety.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="text-2xl mb-2">🌏</div>
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Global Logistics
            </h3>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Scalable shipping network expanding from regional clusters to worldwide delivery.
            </p>
          </div>
        </section>

        {/* ─── Storefront Section ─── */}
        <section className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>🛍️ Explore Marketplace Items</span>
                <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-cyan-300 font-mono">
                  {filteredProducts.length} Listings
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse official ecosystem goods, node hardware, and verified merchant products
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or stores…"
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 pl-9 text-xs text-slate-200 outline-none focus:border-blue-500 transition-colors"
              />
              <span className="pointer-events-none absolute left-3 top-2.5 text-xs text-slate-400">
                🔍
              </span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'hardware', label: 'Hardware & Nodes' },
              { id: 'merch', label: 'Official Merch' },
              { id: 'digital', label: 'Digital Services' },
              { id: 'regional', label: 'Regional Goods' },
              { id: 'vouchers', label: 'Gift Vouchers' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'border border-white/5 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product Cards Grid with 3D Renders */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-xl backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-cyan-500/60 hover:shadow-[0_20px_40px_rgba(6,182,212,0.15)]"
              >
                <div>
                  {/* 3D Product Image Showcase Box */}
                  <div className="marketplace-img-container relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-700/50 shadow-md">
                    <img
                      src={prod.imageSrc}
                      alt={prod.name}
                      className="marketplace-3d-img block h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />

                    {/* 3D Floating Badge */}
                    {prod.badge && (
                      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/80 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-md shadow-lg">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>{prod.badge}</span>
                      </div>
                    )}

                    {/* Category tag */}
                    <div className="absolute bottom-2.5 right-2.5 z-10 rounded-md border border-white/15 bg-black/80 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300 backdrop-blur-md">
                      {prod.categoryLabel}
                    </div>
                  </div>

                  {/* Merchant & Region */}
                  <div className="mt-3.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1">
                      {prod.merchantVerified && <span className="text-emerald-400">✓</span>}
                      {prod.merchant}
                    </span>
                    <span className="font-mono text-slate-500">{prod.region}</span>
                  </div>

                  {/* Product Title */}
                  <h3 className="mt-2 text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
                    {prod.name}
                  </h3>

                  {/* Product Description */}
                  <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>
                </div>

                {/* Pricing & Buy Action */}
                <div className="mt-4 border-t border-white/[0.08] pt-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="font-mono text-lg font-black text-amber-300">
                        {prod.bondkoinPrice}{' '}
                        <span className="text-xs font-bold text-cyan-400">$BONDKOIN</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        ≈ ${prod.usdEquivalent}.00 USD
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      <span>Stock: </span>
                      <strong className="text-emerald-400">{prod.inStock}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCheckoutProduct(prod)}
                    className="btn-gold mt-3 block w-full rounded-xl py-2.5 text-center text-xs font-black uppercase tracking-wider text-slate-950 shadow-md shadow-blue-500/20 group-hover:shadow-cyan-500/40"
                  >
                    Buy with $BONDKOIN →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center text-slate-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm font-bold text-white">No products found matching your search</p>
              <p className="text-xs mt-1 text-slate-500">Try changing your search terms or filter.</p>
            </div>
          )}
        </section>
      </main>

      {/* ─── Simulated Checkout Modal with 3D Preview ─── */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-slate-950/95 p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl ring-1 ring-white/10">
            {orderSuccess ? (
              <div className="text-center py-4 space-y-4">
                <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-3xl shadow-inner">
                  🎉
                </div>
                <h3 className="text-xl font-black text-white">Order Simulated Successfully!</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  Your purchase testnet transaction has been recorded. In the upcoming live release,
                  this will deduct{' '}
                  <strong className="text-cyan-300 font-mono">
                    {checkoutProduct.bondkoinPrice} $BONDKOIN
                  </strong>{' '}
                  and dispatch your shipment.
                </p>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs font-mono text-slate-400 text-left">
                  <div>
                    Order Ref: <span className="text-white">{orderSuccess}</span>
                  </div>
                  <div>
                    Item: <span className="text-cyan-300">{checkoutProduct.name}</span>
                  </div>
                  <div>
                    Merchant: <span className="text-slate-300">{checkoutProduct.merchant}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOrderSuccess(null);
                    setCheckoutProduct(null);
                  }}
                  className="btn-gold w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider text-slate-950"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={checkoutProduct.imageSrc}
                      alt={checkoutProduct.name}
                      className="h-12 w-16 rounded-xl object-cover border border-white/10"
                    />
                    <div>
                      <h3 className="font-bold text-white text-sm">{checkoutProduct.name}</h3>
                      <p className="text-[11px] text-cyan-400">
                        {checkoutProduct.merchant} · {checkoutProduct.region}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutProduct(null)}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-slate-900 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    <span className="text-slate-400">Item Price:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {checkoutProduct.bondkoinPrice} $BONDKOIN (~${checkoutProduct.usdEquivalent}.00)
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    <span className="text-slate-400">Estimated Shipping:</span>
                    <span className="font-mono text-emerald-400 font-bold">FREE (Testnet Promo)</span>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Shipping / Delivery Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Street Address, City, Country"
                      defaultValue="100 Web3 Blvd, Suite 400"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Recipient Contact (Telegram / Email)
                    </label>
                    <input
                      type="text"
                      placeholder="@telegram_handle or miner@domain.com"
                      defaultValue="@bondkoin_miner"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-[11px] text-blue-200">
                    💡 Payment will settle directly in BEP-20 $BONDKOIN on BNB Smart Chain.
                  </div>
                </div>

                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCheckoutProduct(null)}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900 py-3 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOrderSuccess(
                        `BND-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                      )
                    }
                    className="btn-gold flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-blue-500/20"
                  >
                    Confirm Purchase ({checkoutProduct.bondkoinPrice} $BONDKOIN)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Merchant Program Application Modal ─── */}
      {showMerchantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-slate-950/95 p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl ring-1 ring-white/10">
            {merchantSuccess ? (
              <div className="text-center py-4 space-y-4">
                <div className="grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-3xl shadow-inner">
                  🏪
                </div>
                <h3 className="text-xl font-black text-white">Application Received!</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  Thank you for applying to the BONDKOIN Merchant Network. Our onboarding team will
                  review your store details and contact you to configure your product catalog and
                  $BONDKOIN settlement wallet.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMerchantSuccess(false);
                    setShowMerchantModal(false);
                  }}
                  className="btn-gold w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider text-slate-950"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setMerchantSuccess(true);
                }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏪</span>
                    <div>
                      <h3 className="font-bold text-white text-base">
                        Merchant Program Registration
                      </h3>
                      <p className="text-xs text-slate-400">
                        Join the BONDKOIN regional & global commerce network
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMerchantModal(false)}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-slate-900 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400">
                      Store / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Hardware Store"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400">
                        Primary Region / Country
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Singapore, UAE, UK"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400">
                        Product Category
                      </label>
                      <select className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500">
                        <option>Electronics & Hardware</option>
                        <option>Apparel & Merchandise</option>
                        <option>Digital Services</option>
                        <option>Regional Goods</option>
                        <option>Gift Cards</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400">
                      Official Contact Email / Telegram
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="merchant@store.com or @telegram_handle"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-[11px] text-slate-400 leading-relaxed">
                    📜 By applying, merchants agree to accept $BONDKOIN on BNB Smart Chain and comply
                    with product fulfillment standards and customer delivery policies.
                  </div>
                </div>

                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowMerchantModal(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900 py-3 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-gold flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-blue-500/20"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <MobileTabBar locale={locale} />
    </div>
  );
}
