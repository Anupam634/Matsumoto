import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { startOfUtcDay } from '../common/revenue-buckets';
import {
  COLLECTORS,
  DEFAULT_COLLECTOR,
  collectorById,
  type CollectorConfig,
} from './collectors';

/**
 * Decides which configured wallet a new purchase should be quoted to pay,
 * and reports how full each capped wallet is for the current UTC day.
 *
 * The cap is enforced at quote time, not at confirmation time: a capped
 * collector is only offered a purchase whose price still fits under its
 * remaining daily headroom, so a purchase already routed to it and later
 * confirmed cannot push that wallet's day over its cap. A purchase that
 * never confirms (abandoned, failed, expired) never counted against the cap
 * in the first place, since headroom is computed from CONFIRMED rows only.
 */
@Injectable()
export class CollectorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sum of this collector's CONFIRMED purchases since UTC midnight today. */
  async collectedTodayUsd(collectorId: string): Promise<number> {
    const agg = await this.prisma.boosterPurchase.aggregate({
      where: {
        collectorId,
        status: 'CONFIRMED',
        confirmedAt: { gte: startOfUtcDay(new Date()) },
      },
      _sum: { priceUsd: true },
    });
    return agg._sum.priceUsd ?? 0;
  }

  /**
   * Pick a collector for a purchase priced at `priceUsd`. Capped collectors
   * are tried in list order; the first with enough headroom left today wins.
   * Falls back to the uncapped collector once every capped one is full.
   */
  async pickCollector(priceUsd: number): Promise<CollectorConfig> {
    for (const c of COLLECTORS) {
      if (c.dailyCapUsd == null) continue; // the uncapped fallback below
      // A cap of 0 means the wallet is switched off. Checked before the
      // arithmetic because a zero-priced purchase would otherwise satisfy
      // `0 + 0 <= 0` and route there.
      if (c.dailyCapUsd <= 0) continue;
      const collected = await this.collectedTodayUsd(c.id);
      if (collected + priceUsd <= c.dailyCapUsd) return c;
    }
    return DEFAULT_COLLECTOR;
  }

  /** Every collector's today-so-far total and remaining headroom, for the finance panel. */
  async dailyStatus() {
    return Promise.all(
      COLLECTORS.map(async (c) => {
        const collectedUsd = await this.collectedTodayUsd(c.id);
        return {
          id: c.id,
          label: c.label,
          walletAddress: c.walletAddress,
          dailyCapUsd: c.dailyCapUsd,
          collectedTodayUsd: collectedUsd,
          remainingUsd:
            c.dailyCapUsd == null ? null : Math.max(0, c.dailyCapUsd - collectedUsd),
          capReached: c.dailyCapUsd != null && collectedUsd >= c.dailyCapUsd,
        };
      }),
    );
  }

  find(id: string): CollectorConfig {
    const c = collectorById(id);
    if (!c) throw new Error(`Unknown collector id: ${id}`);
    return c;
  }
}
