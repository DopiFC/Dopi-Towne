import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBuyTrade,
  calculateClaimableDividends,
  calculateInvestmentFeePct,
  calculateP2PCompanyValuation,
  calculatePortfolioSummary,
  calculateSellTrade,
  createEmptyInvestments,
  getAllStockSnapshots,
  getStockMarketSnapshot,
  MARKET_HISTORY_SESSIONS,
  MARKET_SESSION_MS,
  NPC_STOCKS,
} from './investment';
import type { P2PCompanyDoc, StockCode, StockMarketSnapshot } from './types';

test('Deterministic 15-minute stock engine returns identical 24-session history for all players in the same window', () => {
  const baseTs = 1_760_000_000_000;
  const alignedStart = Math.floor(baseTs / MARKET_SESSION_MS) * MARKET_SESSION_MS;

  const snapA = getStockMarketSnapshot('DAGR', alignedStart + 10_000);
  const snapB = getStockMarketSnapshot('DAGR', alignedStart + 14 * 60_000);

  assert.equal(snapA.history.length, MARKET_HISTORY_SESSIONS);
  assert.equal(snapA.currentPrice, snapB.currentPrice);
  assert.deepEqual(snapA.history, snapB.history);
  assert.equal(snapA.news.headline, snapB.news.headline);

  // All 6 stocks exist and stay strictly within defined min/max bounds
  const all = getAllStockSnapshots(alignedStart + 5_000);
  assert.equal(all.length, 6);
  assert.equal(NPC_STOCKS.find((s) => s.code === 'LUXD')?.currency, 'coins');
  for (const s of all) {
    assert.ok(s.currentPrice >= s.def.minPrice && s.currentPrice <= s.def.maxPrice);
    assert.equal(s.history.length, 24);
  }
});

test('Investment trading fee scales from 4% at VIP 0 down to 1.5% at VIP 10', () => {
  assert.equal(calculateInvestmentFeePct(0), 4);
  assert.equal(calculateInvestmentFeePct(4), 3);
  assert.equal(calculateInvestmentFeePct(10), 1.5);
  assert.equal(calculateInvestmentFeePct(15), 1.5);

  const buyVip0 = calculateBuyTrade(1000, 2, 0);
  assert.equal(buyVip0.gross, 2000);
  assert.equal(buyVip0.feeAmount, 80);
  assert.equal(buyVip0.totalCost, 2080);

  const sellVip10 = calculateSellTrade(1000, 2, 10);
  assert.equal(sellVip10.gross, 2000);
  assert.equal(sellVip10.feeAmount, 30);
  assert.equal(sellVip10.netProceeds, 1970);
});

test('P2P auto-valuation resists manipulation and applies >7-day inactivity penalty & credit downgrade', () => {
  const now = 1_760_000_000_000;
  const active = calculateP2PCompanyValuation({
    level: 25,
    wealthScore: 220_000,
    recentOrders: 40,
    plotCount: 16,
    employeeCount: 6,
    vehicleCount: 4,
    lastActiveAt: now - 300_000,
    nowMs: now,
  });

  const inactive8Days = calculateP2PCompanyValuation({
    level: 25,
    wealthScore: 220_000,
    recentOrders: 40,
    plotCount: 16,
    employeeCount: 6,
    vehicleCount: 4,
    lastActiveAt: now - 9 * 86_400_000,
    nowMs: now,
  });

  assert.equal(active.inactivityPenalized, false);
  assert.equal(inactive8Days.inactivityPenalized, true);
  assert.ok(inactive8Days.sharePrice < active.sharePrice);
  assert.notEqual(inactive8Days.creditRating, active.creditRating);
});

test('Portfolio PnL and combined NPC + P2P dividend calculations work accurately', () => {
  const now = 1_760_000_000_000;
  const all = getAllStockSnapshots(now);
  const snapMap = all.reduce(
    (acc, item) => {
      acc[item.def.code] = item;
      return acc;
    },
    {} as Record<StockCode, StockMarketSnapshot>
  );

  const p2pCompany: P2PCompanyDoc = {
    ownerUid: 'top_tycoon_01',
    businessName: 'Tập Đoàn Nông Sản Hoàng Kim',
    level: 30,
    wealthScore: 300_000,
    plotCount: 20,
    employeeCount: 8,
    vehicleCount: 5,
    recentOrders: 50,
    sharePrice: 1200,
    totalShares: 1000,
    availableShares: 200,
    dividendRate: 8,
    dividendPool: 4000,
    creditRating: 'AAA',
    lastActiveAt: now - 60_000,
    isListed: true,
  };

  const investments = {
    ...createEmptyInvestments(),
    npcHoldings: {
      DAGR: { shares: 10, avgBuyPrice: 150, lockedUntil: now - 1000 },
      LUXD: { shares: 5, avgBuyPrice: 40, lockedUntil: now - 1000 },
    },
    p2pHoldings: {
      top_tycoon_01: {
        ownerUid: 'top_tycoon_01',
        businessName: p2pCompany.businessName,
        shares: 20,
        avgBuyPrice: 1000,
        lockedUntil: now - 1000,
      },
    },
    lastDividendClaimAt: 0,
  };

  const summary = calculatePortfolioSummary(investments, snapMap, [p2pCompany], now);
  assert.equal(summary.totalPositions, 3);
  assert.ok(summary.goldValue > 0);
  assert.ok(summary.coinValue > 0);

  const div = calculateClaimableDividends(investments, snapMap, [p2pCompany], now);
  assert.equal(div.canClaim, true);
  assert.ok(div.npcGoldDividend >= 1);
  assert.ok(div.npcCoinDividend >= 1);
  // 20 / 400 = 5% of 4000 = 200 Gold from P2P dividendPool
  assert.equal(div.p2pGoldDividend, 200);
  assert.equal(div.totalGold, div.npcGoldDividend + 200);
});

test('INVESTMENT_LOCKUP_MS is 0 (T+0 instant trading) and default P2P companies seed 3 valid enterprises', async () => {
  const { INVESTMENT_LOCKUP_MS, createDefaultP2PCompanies, normalizeUserInvestments } = await import('./investment');
  assert.equal(INVESTMENT_LOCKUP_MS, 0);
  const seeded = createDefaultP2PCompanies(1_760_000_000_000);
  assert.equal(seeded.length, 3);
  for (const c of seeded) {
    assert.equal(c.isListed, true);
    assert.ok(c.availableShares > 0);
    assert.ok(c.sharePrice >= 120);
  }
  const norm = normalizeUserInvestments({
    npcHoldings: { DAGR: { shares: 3, avgBuyPrice: 180, lockedUntil: 9999999999999 } },
  });
  assert.equal(norm.npcHoldings.DAGR?.lockedUntil, 0);
});
