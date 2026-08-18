'use client';

import React, { useState, useEffect } from 'react';

export interface AdminProduct {
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
  status: 'ACTIVE' | 'DRAFT' | 'SOLD_OUT';
}

export interface AdminMerchantApp {
  id: string;
  storeName: string;
  region: string;
  category: string;
  contact: string;
  appliedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
}

export interface AdminOrder {
  id: string;
  productName: string;
  customerHandle: string;
  shippingAddress: string;
  bondkoinAmount: number;
  status: 'RECEIVED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'REFUNDED';
  trackingNumber?: string;
  orderedAt: string;
}

const INITIAL_PRODUCTS: AdminProduct[] = [
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
    status: 'ACTIVE',
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
    status: 'ACTIVE',
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
    status: 'ACTIVE',
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
    status: 'ACTIVE',
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
    status: 'ACTIVE',
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
    status: 'ACTIVE',
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
    status: 'ACTIVE',
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
    status: 'ACTIVE',
  },
];

const INITIAL_MERCHANTS: AdminMerchantApp[] = [
  {
    id: 'm-1',
    storeName: 'Apex Hardware Lab',
    region: 'Singapore & Southeast Asia',
    category: 'Electronics & Hardware',
    contact: '@apex_hw (apex@store.io)',
    appliedAt: '2026-08-18 10:15',
    status: 'PENDING',
    notes: 'Requested hardware listing approval and direct $BONDKOIN settlement.',
  },
  {
    id: 'm-2',
    storeName: 'Nordic Web3 Roastery',
    region: 'Europe / Scandinavia',
    category: 'Regional Goods',
    contact: 'nordic@roastery.se',
    appliedAt: '2026-08-17 16:40',
    status: 'APPROVED',
    notes: 'Verified business documentation and regional shipping fleet.',
  },
  {
    id: 'm-3',
    storeName: 'Solana & BNB CyberThreads',
    region: 'North America',
    category: 'Apparel & Merchandise',
    contact: '@cyber_threads',
    appliedAt: '2026-08-16 11:20',
    status: 'APPROVED',
    notes: 'Premium organic cotton official distributor.',
  },
];

const INITIAL_ORDERS: AdminOrder[] = [
  {
    id: 'ORD-88219',
    productName: 'BONDKOIN Genesis Hardware Security Key',
    customerHandle: '@miner_alpha (0x81...9e2)',
    shippingAddress: '42 Orchard Road, Singapore',
    bondkoinAmount: 450,
    status: 'SHIPPED',
    trackingNumber: 'DHL-SG-9920194',
    orderedAt: '2026-08-18 09:30',
  },
  {
    id: 'ORD-88218',
    productName: 'BONDKOIN Cyber Stealth Heavyweight Hoodie',
    customerHandle: '@crypto_hustle (0x4b...11a)',
    shippingAddress: '120 Oxford St, London, UK',
    bondkoinAmount: 120,
    status: 'PROCESSING',
    orderedAt: '2026-08-18 08:14',
  },
  {
    id: 'ORD-88217',
    productName: '1-Year Dedicated Cloud Node VPS Tier-1',
    customerHandle: '@node_runner (0x33...8fc)',
    shippingAddress: 'Instant Digital Key (admin@cloud.io)',
    bondkoinAmount: 240,
    status: 'DELIVERED',
    trackingNumber: 'VPS-KEY-88217',
    orderedAt: '2026-08-17 22:45',
  },
];

export function MarketplaceAdminTab() {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'merchants' | 'orders' | 'settings'>('products');
  const [products, setProducts] = useState<AdminProduct[]>(INITIAL_PRODUCTS);
  const [merchants, setMerchants] = useState<AdminMerchantApp[]>(INITIAL_MERCHANTS);
  const [orders, setOrders] = useState<AdminOrder[]>(INITIAL_ORDERS);

  // Modals state
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isNewProductModal, setIsNewProductModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Marketplace Settings state
  const [bondkoinUsdRate, setBondkoinUsdRate] = useState('0.3333');
  const [marketplaceActive, setMarketplaceActive] = useState(true);
  const [merchantSelfReg, setMerchantSelfReg] = useState(true);
  const [escrowDays, setEscrowDays] = useState('7');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = (formData.get('id') as string) || `prod-${Date.now()}`;
    const name = formData.get('name') as string;
    const category = formData.get('category') as AdminProduct['category'];
    const bondkoinPrice = Number(formData.get('bondkoinPrice'));
    const usdEquivalent = Number(formData.get('usdEquivalent'));
    const merchant = formData.get('merchant') as string;
    const region = formData.get('region') as string;
    const inStock = Number(formData.get('inStock'));
    const badge = (formData.get('badge') as string) || undefined;
    const imageSrc = (formData.get('imageSrc') as string) || '/products/hardware_wallet.jpg';
    const description = formData.get('description') as string;
    const status = formData.get('status') as AdminProduct['status'];

    const newProd: AdminProduct = {
      id,
      name,
      category,
      categoryLabel: category.toUpperCase(),
      bondkoinPrice,
      usdEquivalent,
      merchant,
      merchantVerified: true,
      region,
      imageSrc,
      badge,
      description,
      inStock,
      deliveryDays: '3-5 Business Days',
      status,
    };

    if (editingProduct) {
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? newProd : p)));
      showToast(`Product "${name}" updated successfully!`);
      setEditingProduct(null);
    } else {
      setProducts((prev) => [newProd, ...prev]);
      showToast(`New product "${name}" added to Marketplace!`);
      setIsNewProductModal(false);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the Marketplace?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast(`Product removed.`);
    }
  };

  const handleMerchantStatus = (id: string, status: AdminMerchantApp['status']) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
    showToast(`Merchant application marked as ${status}.`);
  };

  const handleOrderStatus = (id: string, status: AdminOrder['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
    showToast(`Order ${id} updated to ${status}.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 px-5 py-3 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5">
          ✓ {toastMsg}
        </div>
      )}

      {/* Header Overview Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/30 p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                Ecosystem Commerce Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">BNB Smart Chain</span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🛒 Marketplace Management</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-2xl">
              Control the BONDKOIN Network Marketplace catalog, approve verified regional merchants,
              track user product orders, and configure $BONDKOIN token payment parameters.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNewProductModal(true)}
              className="btn-gold rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-blue-500/20"
            >
              + Add New Product
            </button>
          </div>
        </div>

        {/* 4 Overview Quick Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 border-t border-white/[0.08] pt-5">
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Listed Items</div>
            <div className="mt-1 text-xl font-black font-mono text-cyan-300">{products.length}</div>
            <div className="text-[10px] text-emerald-400 font-mono">● {products.filter(p => p.status === 'ACTIVE').length} Active</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Merchant Network</div>
            <div className="mt-1 text-xl font-black font-mono text-amber-300">{merchants.length} Stores</div>
            <div className="text-[10px] text-cyan-300 font-mono">{merchants.filter(m => m.status === 'PENDING').length} Applications Pending</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders (GMV)</div>
            <div className="mt-1 text-xl font-black font-mono text-emerald-400">{orders.length} Orders</div>
            <div className="text-[10px] text-slate-400 font-mono">≈ 810 $BONDKOIN Volume</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Token Valuation</div>
            <div className="mt-1 text-xl font-black font-mono text-purple-300">1 BND = ${bondkoinUsdRate}</div>
            <div className="text-[10px] text-slate-400 font-mono">Ecosystem Reference Price</div>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { key: 'products', label: '🛍️ Products & Catalog', count: products.length },
          { key: 'merchants', label: '🏪 Merchant Applications', count: merchants.filter(m => m.status === 'PENDING').length },
          { key: 'orders', label: '📦 Orders & Shipments', count: orders.length },
          { key: 'settings', label: '⚙️ Marketplace Settings', count: null },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSubTab(tab.key as any)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeSubTab === tab.key
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'border border-white/5 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`rounded-full px-2 py-0.2 text-[10px] font-mono font-bold ${
                activeSubTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: Products & Catalog ─── */}
      {activeSubTab === 'products' && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Active Product Listings ({products.length})</h3>
            <span className="text-xs text-slate-400 font-mono">Live on bondkoinlabs.com/marketplace</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-3.5">Product & 3D Preview</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Price ($BONDKOIN / USD)</th>
                  <th className="p-3.5">Merchant & Region</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageSrc}
                          alt={p.name}
                          className="marketplace-3d-img h-12 w-16 rounded-xl object-cover border border-slate-700/50 shadow-md"
                        />
                        <div>
                          <div className="font-bold text-white max-w-xs">{p.name}</div>
                          {p.badge && (
                            <span className="inline-block mt-0.5 rounded bg-blue-500/20 text-cyan-300 text-[9px] px-1.5 py-0.2 font-mono">
                              {p.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-300 font-mono">{p.categoryLabel}</td>
                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-amber-300">{p.bondkoinPrice} $BONDKOIN</div>
                      <div className="text-[10px] text-slate-500">≈ ${p.usdEquivalent}.00</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-cyan-400 font-medium">{p.merchant}</div>
                      <div className="text-[10px] text-slate-500">{p.region}</div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className={p.inStock < 30 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {p.inStock}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(p)}
                        className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:border-cyan-500 hover:text-cyan-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="rounded-lg border border-red-500/20 bg-red-950/40 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-900/60"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Merchant Applications ─── */}
      {activeSubTab === 'merchants' && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Merchant Partner Program Applications</h3>
            <span className="text-xs text-slate-400 font-mono">{merchants.length} Stores Registered</span>
          </div>

          <div className="space-y-3">
            {merchants.map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{m.storeName}</h4>
                    <span className={`rounded-full px-2 py-0.2 text-[9px] font-mono font-bold ${
                      m.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : m.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-slate-400">
                    <span>Region: <strong className="text-slate-200">{m.region}</strong></span>
                    <span>Category: <strong className="text-cyan-400">{m.category}</strong></span>
                    <span>Contact: <strong className="text-slate-200">{m.contact}</strong></span>
                  </div>
                  {m.notes && <p className="mt-1 text-[11px] text-slate-500 italic">“{m.notes}”</p>}
                </div>

                <div className="flex items-center gap-2">
                  {m.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMerchantStatus(m.id, 'APPROVED')}
                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        ✓ Approve Store
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMerchantStatus(m.id, 'REJECTED')}
                        className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/60"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                  {m.status === 'APPROVED' && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <span>✓</span> Verified Merchant Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Orders & Shipments ─── */}
      {activeSubTab === 'orders' && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Customer Orders & Deliveries</h3>
            <span className="text-xs text-slate-400 font-mono">Settled in $BONDKOIN BEP-20</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-3.5">Order Ref</th>
                  <th className="p-3.5">Item Purchased</th>
                  <th className="p-3.5">Buyer & Address</th>
                  <th className="p-3.5">Total $BONDKOIN</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-cyan-300">
                      {o.id}
                      <div className="text-[10px] text-slate-500 font-normal">{o.orderedAt}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-white max-w-xs">{o.productName}</td>
                    <td className="p-3.5">
                      <div className="text-slate-300">{o.customerHandle}</div>
                      <div className="text-[10px] text-slate-500">{o.shippingAddress}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-amber-300">
                      {o.bondkoinAmount} $BONDKOIN
                    </td>
                    <td className="p-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                        o.status === 'DELIVERED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : o.status === 'SHIPPED'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {o.status}
                      </span>
                      {o.trackingNumber && (
                        <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                          Track: {o.trackingNumber}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      {o.status !== 'DELIVERED' && (
                        <button
                          type="button"
                          onClick={() => handleOrderStatus(o.id, 'DELIVERED')}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {o.status === 'RECEIVED' && (
                        <button
                          type="button"
                          onClick={() => handleOrderStatus(o.id, 'SHIPPED')}
                          className="rounded-lg bg-cyan-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-cyan-500"
                        >
                          Ship Order
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: Marketplace Settings ─── */}
      {activeSubTab === 'settings' && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl backdrop-blur-xl max-w-3xl space-y-6">
          <div>
            <h3 className="font-bold text-white text-base">Marketplace Protocol Parameters</h3>
            <p className="text-xs text-slate-400">Configure ecosystem currency valuation and merchant policies</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-between">
              <div>
                <strong className="text-white block text-sm">Marketplace Storefront Status</strong>
                <span className="text-slate-400">Enable or disable public access to the Marketplace.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMarketplaceActive(!marketplaceActive);
                  showToast(`Marketplace status toggled.`);
                }}
                className={`rounded-xl px-4 py-2 font-bold ${
                  marketplaceActive ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}
              >
                {marketplaceActive ? 'ONLINE (Active)' : 'MAINTENANCE'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-between">
              <div>
                <strong className="text-white block text-sm">Merchant Self-Application Portal</strong>
                <span className="text-slate-400">Allow verified businesses to register their stores online.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMerchantSelfReg(!merchantSelfReg);
                  showToast(`Merchant self-registration updated.`);
                }}
                className={`rounded-xl px-4 py-2 font-bold ${
                  merchantSelfReg ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {merchantSelfReg ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
              <label className="block font-bold text-white text-sm">
                $BONDKOIN Reference Valuation (USD)
              </label>
              <p className="text-slate-400">
                Official estimated price per 1 $BONDKOIN token used for product USD conversions.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={bondkoinUsdRate}
                  onChange={(e) => setBondkoinUsdRate(e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 font-mono text-cyan-300 text-sm w-48 outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => showToast(`Valuation updated to $${bondkoinUsdRate} USD per $BONDKOIN`)}
                  className="btn-gold rounded-xl px-4 py-2 text-xs font-bold text-slate-950"
                >
                  Save Rate
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
              <label className="block font-bold text-white text-sm">
                Merchant Escrow Settlement Lock (Days)
              </label>
              <p className="text-slate-400">
                Holding duration before customer $BONDKOIN payment is released to merchant wallet.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={escrowDays}
                  onChange={(e) => setEscrowDays(e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 font-mono text-white text-sm w-32 outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => showToast(`Escrow lock updated to ${escrowDays} days.`)}
                  className="btn-gold rounded-xl px-4 py-2 text-xs font-bold text-slate-950"
                >
                  Save Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD / EDIT PRODUCT MODAL ─── */}
      {(isNewProductModal || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-slate-950 p-6 shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white text-base">
                {editingProduct ? 'Edit Marketplace Product' : 'Add New Marketplace Product'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsNewProductModal(false);
                }}
                className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-slate-900 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 text-xs">
              <input type="hidden" name="id" defaultValue={editingProduct?.id || ''} />

              <div>
                <label className="block font-bold text-slate-400 uppercase">Product Title</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingProduct?.name || ''}
                  placeholder="e.g. BONDKOIN Hardware Security Key"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 uppercase">Category</label>
                  <select
                    name="category"
                    defaultValue={editingProduct?.category || 'hardware'}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="hardware">Hardware & Devices</option>
                    <option value="merch">Official Merch</option>
                    <option value="digital">Digital Services</option>
                    <option value="regional">Regional Goods</option>
                    <option value="vouchers">Gift Vouchers</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-400 uppercase">Status</label>
                  <select
                    name="status"
                    defaultValue={editingProduct?.status || 'ACTIVE'}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="SOLD_OUT">SOLD OUT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 uppercase">Price in $BONDKOIN</label>
                  <input
                    type="number"
                    name="bondkoinPrice"
                    required
                    defaultValue={editingProduct?.bondkoinPrice || 100}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-amber-300 font-mono font-bold outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 uppercase">USD Equivalent</label>
                  <input
                    type="number"
                    name="usdEquivalent"
                    required
                    defaultValue={editingProduct?.usdEquivalent || 33}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white font-mono outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 uppercase">Merchant Store Name</label>
                  <input
                    type="text"
                    name="merchant"
                    required
                    defaultValue={editingProduct?.merchant || 'BONDKOIN Hardware Labs'}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 uppercase">Region / Coverage</label>
                  <input
                    type="text"
                    name="region"
                    required
                    defaultValue={editingProduct?.region || 'Global Shipping'}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 uppercase">Stock Count</label>
                  <input
                    type="number"
                    name="inStock"
                    required
                    defaultValue={editingProduct?.inStock || 50}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white font-mono outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 uppercase">Badge (Optional)</label>
                  <input
                    type="text"
                    name="badge"
                    defaultValue={editingProduct?.badge || ''}
                    placeholder="e.g. Official Ecosystem Device"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase">3D Image Asset URL</label>
                <input
                  type="text"
                  name="imageSrc"
                  required
                  defaultValue={editingProduct?.imageSrc || '/products/hardware_wallet.jpg'}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-cyan-300 font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  required
                  defaultValue={editingProduct?.description || ''}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsNewProductModal(false);
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900 py-3 font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold flex-1 rounded-xl py-3 font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-blue-500/20"
                >
                  {editingProduct ? 'Save Changes' : 'Publish to Marketplace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
