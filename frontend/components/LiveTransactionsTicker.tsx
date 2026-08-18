'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface ActivityItem {
  id: string;
  type: 'payout' | 'booster' | 'claim' | 'kyc';
  user: string;
  detail: string;
  time: string;
  txHash: string;
}

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'payout',
    user: '0x8f...4e19',
    detail: '350 BONDKOIN ($116.6 on BNB Chain)',
    time: '2s ago',
    txHash: '0x3a9f...8b21',
  },
  {
    id: '2',
    type: 'booster',
    user: '0xd2...91ab',
    detail: 'Deployed $50 Enterprise Rig (+90.0/h)',
    time: '8s ago',
    txHash: '0x7c41...10de',
  },
  {
    id: '3',
    type: 'claim',
    user: '0x44...8c02',
    detail: 'Claimed 21.6 BONDKOIN (24h Window)',
    time: '14s ago',
    txHash: '0x221a...99cf',
  },
  {
    id: '4',
    type: 'kyc',
    user: '0xab...7712',
    detail: 'KYC Verified (Instant Withdrawals Unlocked)',
    time: '21s ago',
    txHash: '0x99dd...fa03',
  },
  {
    id: '5',
    type: 'payout',
    user: '0x19...3ef4',
    detail: '1,200 BONDKOIN ($400 on BNB Chain)',
    time: '34s ago',
    txHash: '0x44fa...7831',
  },
  {
    id: '6',
    type: 'booster',
    user: '0xfe...2290',
    detail: 'Deployed $10 Pro Cluster (+20.0/h)',
    time: '42s ago',
    txHash: '0x6e31...aa94',
  },
];

export function LiveTransactionsTicker() {
  const t = useTranslations('landing.liveFeed');
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomTypes: ('payout' | 'booster' | 'claim' | 'kyc')[] = [
        'payout',
        'booster',
        'claim',
        'kyc',
      ];
      const selectedType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
      const randHex = Math.random().toString(16).substring(2, 6);
      const randHexEnd = Math.random().toString(16).substring(2, 6);
      const randTx = Math.random().toString(16).substring(2, 6);

      let detail = '';
      if (selectedType === 'payout') {
        const amount = Math.floor(Math.random() * 800 + 100);
        detail = `${amount} BONDKOIN ($${(amount / 3).toFixed(1)} on BSC)`;
      } else if (selectedType === 'booster') {
        const packs = ['$1 Starter', '$5 Power', '$10 Pro', '$50 Enterprise'];
        detail = `Deployed ${packs[Math.floor(Math.random() * packs.length)]} Rig`;
      } else if (selectedType === 'claim') {
        detail = `Claimed ${(Math.random() * 40 + 10).toFixed(1)} BONDKOIN 24h Yield`;
      } else {
        detail = 'KYC Level 2 Verified & Approved';
      }

      const newItem: ActivityItem = {
        id: Date.now().toString(),
        type: selectedType,
        user: `0x${randHex}...${randHexEnd}`,
        detail,
        time: 'Just now',
        txHash: `0x${randTx}...${randHex}`,
      };

      setActivities((prev) => [newItem, ...prev.slice(0, 5)]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card overflow-hidden border-slate-800/90 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">{t('title')}</h3>
        </div>

        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-cyan-300">
          {t('liveBadge')}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 text-xs backdrop-blur-sm transition-all hover:border-amber-500/40"
          >
            <div className="flex items-center gap-3">
              <div
                className={`grid h-8 w-8 place-items-center rounded-lg font-bold text-sm ${
                  item.type === 'payout'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : item.type === 'booster'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : item.type === 'kyc'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}
              >
                {item.type === 'payout'
                  ? '💸'
                  : item.type === 'booster'
                  ? '⚡'
                  : item.type === 'kyc'
                  ? '🛡️'
                  : '⛏️'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-200">
                    {item.user}
                  </span>
                  <span className="text-[10px] text-slate-500">{item.time}</span>
                </div>
                <div className="mt-0.5 text-slate-300 line-clamp-1">{item.detail}</div>
              </div>
            </div>

            <span className="font-mono text-[10px] text-slate-500 hover:text-amber-400">
              {item.txHash}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
