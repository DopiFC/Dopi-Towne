import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExpAndLevelUp,
  calculateEmployeeUpgradeCost,
  calculateGrowthDurationMs,
  calculateMarketTax,
  calculatePlotCost,
  calculateStorageUpgradeCost,
  calculateVipLevel,
  calculateWealthScore,
  createInitialUserData,
  generateDailyQuests,
  generateRandomRedeemCode,
  generateRushOrder,
  generateTransferCode,
  getBusinessBonuses,
  getHourlyMarketSurge,
  getTotalInventoryCount,
  getVipPerks,
  normalizeUserData,
  validateRedeemCodeState,
} from './economy';
import type { RedeemCodeDoc } from './types';

test('VIP thresholds map accurately from VIP 0 to VIP 20', () => {
  assert.equal(calculateVipLevel(0), 0);
  assert.equal(calculateVipLevel(99), 0);
  assert.equal(calculateVipLevel(100), 1);
  assert.equal(calculateVipLevel(300), 2);
  assert.equal(calculateVipLevel(700), 3);
  assert.equal(calculateVipLevel(1500), 4);
  assert.equal(calculateVipLevel(3000), 5);
  assert.equal(calculateVipLevel(6000), 6);
  assert.equal(calculateVipLevel(12000), 7);
  assert.equal(calculateVipLevel(25000), 8);
  assert.equal(calculateVipLevel(50000), 9);
  assert.equal(calculateVipLevel(100000), 10);
  assert.equal(calculateVipLevel(150000), 11);
  assert.equal(calculateVipLevel(500000), 15);
  assert.equal(calculateVipLevel(2000000), 20);
  assert.equal(calculateVipLevel(9999999), 20);
});

test('VIP perks and auto-sprinkler apply growth speed reduction accurately', () => {
  assert.equal(getVipPerks(0).marketTaxPct, 8);
  assert.equal(getVipPerks(10).marketTaxPct, 3);
  assert.equal(getVipPerks(3).harvestAllUnlocked, false);
  assert.equal(getVipPerks(4).harvestAllUnlocked, true);

  assert.equal(calculateGrowthDurationMs('wheat', 0), 30_000);
  assert.equal(calculateGrowthDurationMs('wheat', 1), 28_500);
  assert.equal(calculateGrowthDurationMs('wheat', 10), 24_000);
  // With auto-sprinkler active (+15% extra reduction): VIP 0 -> 15% faster = 25,500ms
  assert.equal(calculateGrowthDurationMs('wheat', 0, true), 25_500);
});

test('Exponential expansion cost follows base * 1.45^level for plots and storage', () => {
  assert.equal(calculatePlotCost(6), 180);
  assert.equal(calculatePlotCost(7), Math.round(180 * 1.45));
  assert.equal(calculatePlotCost(8), Math.round(180 * Math.pow(1.45, 2)));

  assert.equal(calculateStorageUpgradeCost(50), 240);
  assert.equal(calculateStorageUpgradeCost(70), Math.round(240 * 1.45));
  assert.equal(calculateStorageUpgradeCost(90), Math.round(240 * Math.pow(1.45, 2)));
});

test('Employee upgrade cost scales at 1.8^level and requires DOPI Coins from Lv 4+', () => {
  const lv0 = calculateEmployeeUpgradeCost('diligent_farmer', 0);
  assert.equal(lv0.gold, 2500);
  assert.equal(lv0.coins, 0);

  const lv1 = calculateEmployeeUpgradeCost('diligent_farmer', 1);
  assert.equal(lv1.gold, Math.round(2500 * 1.8));
  assert.equal(lv1.coins, 0);

  const lv3 = calculateEmployeeUpgradeCost('diligent_farmer', 3);
  assert.equal(lv3.gold, Math.round(2500 * Math.pow(1.8, 3)));
  assert.ok(lv3.coins > 0);
});

test('Wealth score increases with employees, vehicles, and treasures', () => {
  const user = createInitialUserData('u1', 'farmer@test.com', 'Minh', 1_760_000_000_000);
  const baseWealth = calculateWealthScore(user);
  const upgradedWealth = calculateWealthScore({
    ...user,
    employees: { ...user.employees, diligent_farmer: 2 },
    vehicles: ['cargo_bike', 'mini_truck'],
    treasures: ['golden_dopi_statue'],
  });
  assert.ok(upgradedWealth > baseWealth + 20_000);

  const bonuses = getBusinessBonuses({
    employees: {
      diligent_farmer: 1,
      agri_engineer: 2,
      factory_manager: 2,
      sales_director: 2,
    },
    vehicles: ['cargo_bike', 'mini_truck'],
  });
  assert.equal(bonuses.autoHarvestEnabled, true);
  assert.equal(bonuses.extraYieldChancePct, 16);
  assert.equal(bonuses.factorySpeedReductionPct, 12);
  assert.equal(bonuses.orderRewardBonusPct, 14 + 10);
  assert.equal(bonuses.bestVehicleId, 'mini_truck');
});

test('P2P Market tax deducts accurately from seller payout according to VIP level', () => {
  const vip0 = calculateMarketTax(1000, 0);
  assert.equal(vip0.taxRatePct, 8);
  assert.equal(vip0.taxAmount, 80);
  assert.equal(vip0.netSellerPayout, 920);

  const vip10 = calculateMarketTax(1000, 10);
  assert.equal(vip10.taxRatePct, 3);
  assert.equal(vip10.taxAmount, 30);
  assert.equal(vip10.netSellerPayout, 970);
});

test('Daily quests award at most 10 DOPI Coins total per day', () => {
  const quests = generateDailyQuests();
  assert.equal(quests.length, 5);
  const totalCoins = quests.reduce((sum, q) => sum + q.rewardCoins, 0);
  assert.equal(totalCoins, 10);
});

test('Hourly market surge is deterministic within the same hour and bounded 35%-60%', () => {
  const t1 = 1_760_000_000_000;
  const s1 = getHourlyMarketSurge(t1);
  const s2 = getHourlyMarketSurge(t1 + 60_000);
  assert.equal(s1.itemId, s2.itemId);
  assert.equal(s1.bonusPercent, s2.bonusPercent);
  assert.ok(s1.bonusPercent >= 35 && s1.bonusPercent <= 60);
});

test('EXP rollover handles multi-level upgrades cleanly up to Level 999 and Enterprise ERP calculates payroll & stock valuation', async () => {
  const {
    calculateDepartmentUpgradeCost,
    calculateInventoryValuation,
    calculateMonthlyPayroll,
    getExpRequiredForLevel,
  } = await import('./economy');

  const res = applyExpAndLevelUp(1, 0, 300);
  assert.equal(res.leveledUp, true);
  assert.equal(res.level, 3);
  assert.ok(res.exp >= 0);

  // Verify high-level EXP stays reasonable and caps at 999
  assert.ok(getExpRequiredForLevel(100) < 50_000);
  assert.ok(getExpRequiredForLevel(500) < 400_000);
  const nearMax = applyExpAndLevelUp(998, 0, 5_000_000);
  assert.equal(nearMax.level, 999);

  // Verify Enterprise ERP monthly payroll and inventory valuation
  const payroll = calculateMonthlyPayroll(
    {
      diligent_farmer: 2,
      agri_engineer: 1,
      factory_manager: 0,
      sales_director: 1,
    },
    3
  );
  assert.ok(payroll.grossSalary > payroll.netSalary);
  assert.equal(payroll.discountPct, 6);
  assert.equal(calculateDepartmentUpgradeCost(1), 3200);

  const stockVal = calculateInventoryValuation({
    wheat: 10,
    butter_bread: 4,
    fast_fertilizer: 2,
  });
  assert.ok(stockVal.totalMarketValue > 0);
  assert.ok(stockVal.cropValue > 0);
  assert.ok(stockVal.productValue > 0);
  assert.equal(
    stockVal.cropUnits + stockVal.productUnits + stockVal.boosterUnits,
    16
  );
});

test('Redeem code validation and transfer code generation', () => {
  const now = 1_760_000_000_000;
  const baseCode: RedeemCodeDoc = {
    code: 'DOPI-ABCD-1234',
    amount: 500,
    maxUses: 2,
    usedCount: 1,
    usedBy: ['user_1'],
    expiresAt: now + 3600_000,
    createdBy: 'admin@example.com',
    createdAt: now - 1000,
    isActive: true,
  };

  assert.equal(validateRedeemCodeState(baseCode, 'user_2', now).valid, true);
  assert.equal(validateRedeemCodeState(baseCode, 'user_1', now).valid, false);
  assert.match(generateRandomRedeemCode(), /^DOPI-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.match(generateTransferCode(), /^NAP-DOPI-[A-Z0-9]{4}$/);
});

test('normalizeUserData safely upgrades legacy user docs and Rush Order builds valid bundle', () => {
  const now = 1_760_000_000_000;
  const legacy = normalizeUserData(
    { uid: 'legacy_1', email: 'old@test.com', level: 5, gold: 1000 },
    now
  );
  assert.equal(legacy.hasFirstTopup, false);
  assert.equal(legacy.employees.diligent_farmer, 0);
  assert.deepEqual(legacy.vehicles, []);
  assert.deepEqual(legacy.treasures, []);
  assert.ok(legacy.wealthScore > 0);
  assert.ok(legacy.rushOrder && legacy.rushOrder.rewardGold > 0);

  const rush = generateRushOrder(6, now);
  assert.ok(rush.rewardReputation >= 140);
  assert.ok(getTotalInventoryCount(createInitialUserData('u1', 'a@b.c', 'A', now).inventory) >= 8);

  // Verify sanitizeForFirestore strips undefined and normalizeUserData guarantees 6 valid plots and 3 factories
  assert.equal(legacy.farmPlots.length, 6);
  assert.equal(legacy.factories.length, 3);
  assert.ok(legacy.profile.displayName.length >= 1);
  assert.ok(legacy.businessName.length >= 2);
});

test('Enterprise Special-Skill Specialists recruitment costs, operating cost reduction, and production speed bonuses', async () => {
  const {
    calculateDepartmentUpgradeCost,
    calculateMonthlyPayroll,
    calculateSpecialistHireOrUpgradeCost,
    createInitialEnterpriseState,
  } = await import('./economy');

  // 1. Specialist recruitment cost & Headhunt discount
  const hireLv0 = calculateSpecialistHireOrUpgradeCost('lean_engineer', 0, 0);
  assert.equal(hireLv0.rawCost, 1600);
  assert.equal(hireLv0.finalCost, 1600);

  const hireWithDiscount = calculateSpecialistHireOrUpgradeCost('lean_engineer', 0, 20);
  assert.equal(hireWithDiscount.finalCost, 1280);
  assert.equal(hireWithDiscount.discountSaved, 320);

  // 2. Specialist skills boost production speed, reduce operating costs, and discount dept upgrades
  const ent = createInitialEnterpriseState(1_760_000_000_000);
  ent.specialists = {
    lean_engineer: 3, // -15% factory time, +9% double harvest
    cost_auditor: 2, // -10% operating/payroll/campaign cost
    bio_agronomist: 2, // -8% crop time, -8% seed cost
    b2b_director: 2, // +12% order & B2B revenue, +10% corporate fund bonus
    logistics_architect: 3, // +12% warehouse quick-sell bonus
    cfo_treasurer: 4, // -20% department upgrade cost
  };

  const bonuses = getBusinessBonuses({
    employees: {
      diligent_farmer: 1,
      agri_engineer: 0,
      factory_manager: 0,
      sales_director: 0,
    },
    vehicles: [],
    enterprise: ent,
  });

  assert.equal(bonuses.specialistsCount, 6);
  assert.equal(bonuses.totalSpecialistLevels, 16);
  assert.equal(bonuses.factorySpeedReductionPct, 15);
  assert.equal(bonuses.extraYieldChancePct, 9);
  assert.equal(bonuses.operatingCostReductionPct, 10);
  assert.equal(bonuses.campaignCostReductionPct, 10);
  assert.equal(bonuses.cropSpeedReductionPct, 8);
  assert.equal(bonuses.seedDiscountPct, 8);
  assert.equal(bonuses.quickSellBonusPct, 12);
  assert.equal(bonuses.deptUpgradeDiscountPct, 20);

  // 3. CFO reduces department upgrade cost by 20%
  assert.equal(
    calculateDepartmentUpgradeCost(1, bonuses.deptUpgradeDiscountPct),
    2560
  );

  // 4. Cost Auditor reduces monthly payroll overhead by an additional 10%
  const payroll = calculateMonthlyPayroll(
    {
      diligent_farmer: 2,
      agri_engineer: 1,
      factory_manager: 1,
      sales_director: 0,
    },
    2, // ops Lv 2 = 3%
    ent.specialists // auditor Lv 2 = 10% -> total 13% discount
  );
  assert.equal(payroll.opsDiscountPct, 3);
  assert.equal(payroll.auditorDiscountPct, 10);
  assert.equal(payroll.discountPct, 13);

  // 5. Bio Agronomist speeds up crop growth duration
  assert.equal(
    calculateGrowthDurationMs('wheat', 0, false, bonuses.cropSpeedReductionPct),
    27_600
  );
});

