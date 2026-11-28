import {
  BASE_PLOT_COST,
  BASE_STORAGE_UPGRADE_COST,
  CROPS,
  EMPLOYEES,
  EMPLOYEE_UPGRADE_EXP_BASE,
  ENTERPRISE_CAMPAIGNS,
  ENTERPRISE_SPECIALISTS,
  EXPONENTIAL_GROWTH_BASE,
  FACTORIES,
  INITIAL_PLOTS,
  INITIAL_STORAGE_CAPACITY,
  ITEM_CATALOG,
  MAX_PLAYER_LEVEL,
  MAX_VIP_LEVEL,
  RECIPES,
  STORAGE_UPGRADE_STEP,
  TREASURES,
  VEHICLES,
  VIP_TIERS,
} from './constants';
import {
  createEmptyInvestments,
  normalizeUserInvestments,
} from './investment';
import type {
  DailyQuest,
  EmployeeId,
  EnterpriseLedgerEntry,
  EnterpriseSpecialistId,
  EnterpriseState,
  FarmPlot,
  MarketSurgeEvent,
  NpcOrder,
  PublicFarmData,
  RedeemCodeDoc,
  RushOrder,
  UserGameData,
  VipTier,
} from './types';

export function calculateVipLevel(totalRechargedCoins: number): number {
  const safeTotal = Math.max(0, Math.floor(totalRechargedCoins));
  let tier = 0;
  for (const v of VIP_TIERS) {
    if (safeTotal >= v.requiredCoins) {
      tier = v.level;
    }
  }
  return Math.min(MAX_VIP_LEVEL, tier);
}

export function getVipPerks(vipLevel: number): VipTier {
  const clamped = Math.max(0, Math.min(MAX_VIP_LEVEL, Math.floor(vipLevel)));
  return VIP_TIERS[clamped] ?? VIP_TIERS[0];
}

export function getNextVipTier(vipLevel: number): VipTier | null {
  if (vipLevel >= MAX_VIP_LEVEL) return null;
  return VIP_TIERS[vipLevel + 1] ?? null;
}

export function calculatePlotCost(currentPlotCount: number): number {
  const purchasedCount = Math.max(0, currentPlotCount - INITIAL_PLOTS);
  return Math.round(BASE_PLOT_COST * Math.pow(EXPONENTIAL_GROWTH_BASE, purchasedCount));
}

export function calculateStorageUpgradeCost(currentCapacity: number): number {
  const upgradeCount = Math.max(
    0,
    Math.floor((currentCapacity - INITIAL_STORAGE_CAPACITY) / STORAGE_UPGRADE_STEP)
  );
  return Math.round(
    BASE_STORAGE_UPGRADE_COST * Math.pow(EXPONENTIAL_GROWTH_BASE, upgradeCount)
  );
}

export function calculateEmployeeUpgradeCost(
  employeeId: EmployeeId,
  currentLevel: number
): { gold: number; coins: number } {
  const def = EMPLOYEES.find((e) => e.id === employeeId);
  if (!def) return { gold: 999_999, coins: 0 };
  const safeLevel = Math.max(0, currentLevel);
  const gold = Math.round(
    def.baseHireGold * Math.pow(EMPLOYEE_UPGRADE_EXP_BASE, safeLevel)
  );
  // Từ cấp 4 trở lên yêu cầu kết hợp cả Vàng lẫn Xu DOPI
  const coins =
    safeLevel >= 3
      ? Math.round(def.baseUpgradeCoins * Math.pow(1.6, safeLevel - 3))
      : 0;
  return { gold, coins };
}

export function createInitialSpecialists(): Record<EnterpriseSpecialistId, number> {
  return {
    lean_engineer: 0,
    cost_auditor: 0,
    bio_agronomist: 0,
    b2b_director: 0,
    logistics_architect: 0,
    cfo_treasurer: 0,
  };
}

export function calculateSpecialistHireOrUpgradeCost(
  specialistId: EnterpriseSpecialistId,
  currentLevel: number,
  headhuntDiscountPct: number = 0
): { rawCost: number; finalCost: number; discountSaved: number } {
  const def = ENTERPRISE_SPECIALISTS.find((s) => s.id === specialistId);
  if (!def) {
    return { rawCost: 999_999, finalCost: 999_999, discountSaved: 0 };
  }
  const safeLevel = Math.max(0, Math.floor(currentLevel || 0));
  const rawCost = Math.round(def.baseHireFundCost * Math.pow(1.62, safeLevel));
  const safeDiscount = Math.max(0, Math.min(35, Math.floor(headhuntDiscountPct || 0)));
  const finalCost = Math.max(100, Math.round(rawCost * (1 - safeDiscount / 100)));
  return {
    rawCost,
    finalCost,
    discountSaved: Math.max(0, rawCost - finalCost),
  };
}

export function calculateDepartmentUpgradeCost(
  currentLevel: number,
  cfoDiscountPct: number = 0
): number {
  const safeLv = Math.max(1, Math.floor(currentLevel));
  const baseCost = Math.round(3200 * Math.pow(1.55, safeLv - 1));
  const safeDisc = Math.max(0, Math.min(35, Math.floor(cfoDiscountPct || 0)));
  return Math.max(500, Math.round(baseCost * (1 - safeDisc / 100)));
}

export function calculateMonthlyPayroll(
  employees: Record<EmployeeId, number>,
  operationsLevel: number = 1,
  specialists?: Partial<Record<EnterpriseSpecialistId, number>> | null
): {
  grossSalary: number;
  discountPct: number;
  opsDiscountPct: number;
  auditorDiscountPct: number;
  netSalary: number;
  headcount: number;
  breakdown: {
    id: string;
    name: string;
    emoji: string;
    role: string;
    level: number;
    monthlySalary: number;
    isSpecialist?: boolean;
  }[];
} {
  const safeOps = Math.max(1, Math.min(10, Math.floor(operationsLevel || 1)));
  const opsDiscountPct = (safeOps - 1) * 3; // Up to 27% overhead savings at Lv 10
  const auditorLv = Math.max(0, Math.min(5, Math.floor(specialists?.cost_auditor || 0)));
  const auditorDiscountPct = auditorLv * 5; // Up to 25% extra operating & payroll cost savings
  const discountPct = Math.min(50, opsDiscountPct + auditorDiscountPct);

  const baseMonthlyRate: Record<EmployeeId, number> = {
    diligent_farmer: 420,
    agri_engineer: 650,
    factory_manager: 880,
    sales_director: 1150,
  };

  let grossSalary = 0;
  let headcount = 0;
  const breakdown: {
    id: string;
    name: string;
    emoji: string;
    role: string;
    level: number;
    monthlySalary: number;
    isSpecialist?: boolean;
  }[] = EMPLOYEES.map((def) => {
    const lv = Math.max(0, Math.floor(employees?.[def.id] || 0));
    if (lv > 0) headcount += 1;
    const monthlySalary =
      lv > 0 ? Math.round(baseMonthlyRate[def.id] * lv * (1 + (lv - 1) * 0.12)) : 0;
    grossSalary += monthlySalary;
    return {
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      role: def.role,
      level: lv,
      monthlySalary,
      isSpecialist: false,
    };
  });

  for (const spec of ENTERPRISE_SPECIALISTS) {
    const lv = Math.max(0, Math.min(spec.maxLevel, Math.floor(specialists?.[spec.id] || 0)));
    if (lv > 0) headcount += 1;
    const monthlySalary =
      lv > 0 ? Math.round(spec.monthlySalaryGold * lv * (1 + (lv - 1) * 0.08)) : 0;
    grossSalary += monthlySalary;
    breakdown.push({
      id: spec.id,
      name: spec.name,
      emoji: spec.emoji,
      role: `Chuyên Gia · ${spec.skillBadge}`,
      level: lv,
      monthlySalary,
      isSpecialist: true,
    });
  }

  const netSalary = Math.max(
    0,
    Math.round(grossSalary * (1 - discountPct / 100))
  );

  return {
    grossSalary,
    discountPct,
    opsDiscountPct,
    auditorDiscountPct,
    netSalary,
    headcount,
    breakdown,
  };
}

export function calculateInventoryValuation(
  inventory: Record<string, number>,
  nowMs: number = Date.now()
): {
  totalMarketValue: number;
  cropValue: number;
  productValue: number;
  boosterValue: number;
  cropUnits: number;
  productUnits: number;
  boosterUnits: number;
} {
  const surge = getHourlyMarketSurge(nowMs);
  let cropValue = 0;
  let productValue = 0;
  let boosterValue = 0;
  let cropUnits = 0;
  let productUnits = 0;
  let boosterUnits = 0;

  for (const [itemId, rawQty] of Object.entries(inventory || {})) {
    const qty = Math.max(0, Math.floor(rawQty || 0));
    if (qty <= 0) continue;
    const entry = ITEM_CATALOG[itemId];
    if (!entry) continue;
    const unitPrice = getItemSellPriceWithSurge(itemId, surge);
    const val = unitPrice * qty;
    if (entry.category === 'crop') {
      cropValue += val;
      cropUnits += qty;
    } else if (entry.category === 'product') {
      productValue += val;
      productUnits += qty;
    } else {
      boosterValue += val;
      boosterUnits += qty;
    }
  }

  return {
    totalMarketValue: cropValue + productValue + boosterValue,
    cropValue,
    productValue,
    boosterValue,
    cropUnits,
    productUnits,
    boosterUnits,
  };
}

export function getBusinessBonuses(
  user: Pick<UserGameData, 'employees' | 'vehicles' | 'enterprise'>,
  nowMs: number = Date.now()
): {
  autoHarvestEnabled: boolean;
  extraYieldChancePct: number;
  factorySpeedReductionPct: number;
  orderRewardBonusPct: number;
  wholesaleBonusPct: number;
  orderRefreshReductionPct: number;
  moraleEfficiencyPct: number;
  bestVehicleId: string | null;
  operatingCostReductionPct: number;
  campaignCostReductionPct: number;
  cropSpeedReductionPct: number;
  seedDiscountPct: number;
  corporateFundContractBonusPct: number;
  quickSellBonusPct: number;
  deptUpgradeDiscountPct: number;
  specialistsCount: number;
  totalSpecialistLevels: number;
} {
  const emp = user.employees ?? {
    diligent_farmer: 0,
    agri_engineer: 0,
    factory_manager: 0,
    sales_director: 0,
  };
  const ownedVehicles = user.vehicles ?? [];
  const ent = user.enterprise;
  const specs = ent?.specialists ?? createInitialSpecialists();

  const leanLv = Math.max(0, Math.min(5, Math.floor(specs.lean_engineer || 0)));
  const auditorLv = Math.max(0, Math.min(5, Math.floor(specs.cost_auditor || 0)));
  const bioLv = Math.max(0, Math.min(5, Math.floor(specs.bio_agronomist || 0)));
  const b2bLv = Math.max(0, Math.min(5, Math.floor(specs.b2b_director || 0)));
  const logisticsLv = Math.max(0, Math.min(5, Math.floor(specs.logistics_architect || 0)));
  const cfoLv = Math.max(0, Math.min(5, Math.floor(specs.cfo_treasurer || 0)));

  let specialistsCount = 0;
  let totalSpecialistLevels = 0;
  for (const lv of [leanLv, auditorLv, bioLv, b2bLv, logisticsLv, cfoLv]) {
    if (lv > 0) specialistsCount += 1;
    totalSpecialistLevels += lv;
  }

  let bestVehicleRewardPct = 0;
  let bestVehicleRefreshPct = 0;
  let bestVehicleId: string | null = null;

  for (const v of VEHICLES) {
    if (ownedVehicles.includes(v.id)) {
      if (v.orderRewardBonusPct >= bestVehicleRewardPct) {
        bestVehicleRewardPct = v.orderRewardBonusPct;
        bestVehicleRefreshPct = v.orderRefreshReductionPct;
        bestVehicleId = v.id;
      }
    }
  }

  const rdBonusPct = ent ? Math.max(0, (ent.rdLevel - 1) * 3) : 0;
  const mktBonusPct = ent ? Math.max(0, (ent.marketingLevel - 1) * 4) : 0;
  const opsBonusPct = ent ? Math.max(0, (ent.operationsLevel - 1) * 3) : 0;
  const morale = ent?.morale ?? 85;
  const baseMoraleEff =
    morale >= 90 ? 115 : morale >= 70 ? 100 : morale >= 45 ? 85 : 70;
  const moraleEfficiencyPct = baseMoraleEff + auditorLv * 2;

  let campOrderBonus = 0;
  let campWholesaleBonus = 0;
  if (ent && ent.activeCampaignId && ent.activeCampaignUntil > nowMs) {
    const camp = ENTERPRISE_CAMPAIGNS.find((c) => c.id === ent.activeCampaignId);
    if (camp) {
      campOrderBonus = camp.orderBonusPct;
      campWholesaleBonus = camp.wholesaleBonusPct;
    }
  }

  const empScale = moraleEfficiencyPct / 100;

  return {
    autoHarvestEnabled: (emp.diligent_farmer || 0) >= 1,
    extraYieldChancePct: Math.min(
      90,
      Math.round((emp.agri_engineer || 0) * 8 * empScale + rdBonusPct + leanLv * 3)
    ),
    factorySpeedReductionPct: Math.min(
      65,
      Math.round(
        (emp.factory_manager || 0) * 6 * empScale +
          Math.floor(rdBonusPct / 2) +
          leanLv * 5
      )
    ),
    orderRewardBonusPct:
      Math.round((emp.sales_director || 0) * 7 * empScale) +
      bestVehicleRewardPct +
      mktBonusPct +
      campOrderBonus +
      b2bLv * 6,
    wholesaleBonusPct:
      bestVehicleRewardPct +
      mktBonusPct +
      rdBonusPct +
      campWholesaleBonus +
      b2bLv * 6,
    orderRefreshReductionPct: Math.min(60, bestVehicleRefreshPct + logisticsLv * 3),
    moraleEfficiencyPct,
    bestVehicleId,
    operatingCostReductionPct: Math.min(50, opsBonusPct + auditorLv * 5),
    campaignCostReductionPct: auditorLv * 5,
    cropSpeedReductionPct: bioLv * 4,
    seedDiscountPct: bioLv * 4,
    corporateFundContractBonusPct: b2bLv * 5,
    quickSellBonusPct: logisticsLv * 4,
    deptUpgradeDiscountPct: cfoLv * 5,
    specialistsCount,
    totalSpecialistLevels,
  };
}

export function calculateWealthScore(
  user: Pick<
    UserGameData,
    | 'level'
    | 'farmPlots'
    | 'employees'
    | 'vehicles'
    | 'treasures'
    | 'vipLevel'
    | 'reputation'
    | 'enterprise'
  >
): number {
  const levelScore = (user.level || 1) * 500;
  const plotScore = (user.farmPlots?.length || INITIAL_PLOTS) * 350;
  const vipScore = (user.vipLevel || 0) * 1500;
  const repScore = (user.reputation || 0) * 5;

  let empScore = 0;
  const empMap = user.employees ?? {
    diligent_farmer: 0,
    agri_engineer: 0,
    factory_manager: 0,
    sales_director: 0,
  };
  for (const def of EMPLOYEES) {
    empScore += (empMap[def.id] || 0) * def.wealthPerLevel;
  }

  let specialistScore = 0;
  const specMap = user.enterprise?.specialists;
  if (specMap) {
    for (const def of ENTERPRISE_SPECIALISTS) {
      specialistScore += Math.max(0, Math.floor(specMap[def.id] || 0)) * def.wealthPerLevel;
    }
  }

  let vehicleScore = 0;
  for (const vId of user.vehicles ?? []) {
    const v = VEHICLES.find((item) => item.id === vId);
    if (v) vehicleScore += v.wealthBonus;
  }

  let treasureScore = 0;
  for (const tId of user.treasures ?? []) {
    const t = TREASURES.find((item) => item.id === tId);
    if (t) treasureScore += t.wealthBonus;
  }

  const enterpriseScore = user.enterprise
    ? Math.floor((user.enterprise.corporateFund || 0) * 0.25) +
      ((user.enterprise.rdLevel || 1) - 1) * 1500 +
      ((user.enterprise.marketingLevel || 1) - 1) * 1500 +
      ((user.enterprise.operationsLevel || 1) - 1) * 1500 +
      specialistScore
    : 0;

  return Math.round(
    levelScore +
      plotScore +
      vipScore +
      repScore +
      empScore +
      vehicleScore +
      treasureScore +
      enterpriseScore
  );
}

export function calculateGrowthDurationMs(
  cropId: string,
  vipLevel: number,
  autoSprinklerActive = false,
  extraCropSpeedReductionPct = 0
): number {
  const crop = CROPS.find((c) => c.id === cropId);
  if (!crop) return 60_000;
  const perks = getVipPerks(vipLevel);
  const totalReductionPct = Math.min(
    60,
    perks.growthReductionPct +
      (autoSprinklerActive ? 15 : 0) +
      Math.max(0, extraCropSpeedReductionPct)
  );
  const multiplier = 1 - totalReductionPct / 100;
  return Math.max(5_000, Math.round(crop.growthSeconds * 1000 * multiplier));
}

export function calculateMarketTax(
  grossPrice: number,
  sellerVipLevel: number
): { taxRatePct: number; taxAmount: number; netSellerPayout: number } {
  const perks = getVipPerks(sellerVipLevel);
  const safeGross = Math.max(1, Math.floor(grossPrice));
  const taxRatePct = perks.marketTaxPct;
  const taxAmount = Math.max(
    safeGross >= 10 ? 1 : 0,
    Math.floor((safeGross * taxRatePct) / 100)
  );
  const netSellerPayout = Math.max(1, safeGross - taxAmount);
  return { taxRatePct, taxAmount, netSellerPayout };
}

export function getHourlyMarketSurge(nowMs: number = Date.now()): MarketSurgeEvent {
  const hourKey = Math.floor(nowMs / 3_600_000);
  const surgePool = [
    ...CROPS.map((c) => c.id),
    ...RECIPES.map((r) => r.outputItemId),
  ];
  const hash = Math.abs((hourKey * 2654435761) % 2147483647);
  const itemId = surgePool[hash % surgePool.length];
  const bonusPercent = 35 + ((hash >> 4) % 6) * 5;
  const endsAt = (hourKey + 1) * 3_600_000;
  return { itemId, bonusPercent, endsAt, hourKey };
}

export function getItemSellPriceWithSurge(
  itemId: string,
  surge: MarketSurgeEvent
): number {
  const entry = ITEM_CATALOG[itemId];
  if (!entry) return 0;
  if (surge.itemId === itemId) {
    return Math.round(entry.baseSellPrice * (1 + surge.bonusPercent / 100));
  }
  return entry.baseSellPrice;
}

export function getTotalInventoryCount(inventory: Record<string, number>): number {
  return Object.values(inventory).reduce(
    (sum, qty) => sum + Math.max(0, Math.floor(qty || 0)),
    0
  );
}

export function getExpRequiredForLevel(level: number): number {
  const safeLv = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level || 1)));
  // Đường cong EXP mượt mà từ Lv.1 đến Lv.999 (không bao giờ tràn số như hàm mũ 1.32^level cũ)
  return Math.round(100 + Math.pow(Math.max(0, safeLv - 1), 1.45) * 35);
}

export function applyExpAndLevelUp(
  currentLevel: number,
  currentExp: number,
  gainedExp: number
): { level: number; exp: number; leveledUp: boolean } {
  let level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(currentLevel || 1)));
  let exp = Math.max(0, Math.floor(currentExp || 0)) + Math.max(0, Math.floor(gainedExp || 0));
  let leveledUp = false;
  while (level < MAX_PLAYER_LEVEL) {
    const needed = getExpRequiredForLevel(level);
    if (exp >= needed) {
      exp -= needed;
      level += 1;
      leveledUp = true;
    } else {
      break;
    }
  }
  return { level, exp, leveledUp };
}

export function getTodayDateKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getCurrentMonthKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentWeekKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86_400_000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

const WEEKLY_THEMES = [
  {
    name: 'Mùa Vàng DOPI',
    subtitle: 'Thu hoạch nông sản nhận +1 Vé · Giao đơn NPC nhận +2 Vé Sự Kiện',
    emoji: '🌾',
  },
  {
    name: 'Lễ Hội Nông Sản Cao Nguyên',
    subtitle: 'Cày đơn hàng & thu hoạch thả ga, đổi ngay vật phẩm quý trong Shop Sự Kiện',
    emoji: '☕',
  },
  {
    name: 'Tuần Lễ Thương Gia Thị Trấn',
    subtitle: 'Săn Vé Sự Kiện đổi Thuốc Đột Biến Vàng & Thẻ Kho Cao Cấp',
    emoji: '🎪',
  },
];

export function getWeeklyEventInfo(nowMs: number = Date.now()) {
  const weekKey = getCurrentWeekKey(nowMs);
  const weekNumber = Number(weekKey.split('-W')[1] || 1);
  const theme = WEEKLY_THEMES[weekNumber % WEEKLY_THEMES.length];
  return { weekKey, ...theme };
}

export function generateRushOrder(
  playerLevel: number,
  nowMs: number = Date.now()
): RushOrder {
  const unlockedCrops = CROPS.filter((c) => c.unlockLevel <= playerLevel);
  const c1 = unlockedCrops[0] ?? CROPS[0];
  const c2 = unlockedCrops[Math.min(1, unlockedCrops.length - 1)] ?? CROPS[0];
  const items: Record<string, number> = {
    [c1.id]: 6 + Math.min(10, playerLevel),
  };
  if (c2.id !== c1.id) {
    items[c2.id] = 4 + Math.min(8, Math.floor(playerLevel / 2));
  }
  const baseValue = Object.entries(items).reduce(
    (sum, [id, qty]) => sum + (ITEM_CATALOG[id]?.baseSellPrice || 20) * qty,
    0
  );

  return {
    id: `rush_${nowMs}`,
    title: 'Đơn Hàng Khẩn Cấp Hội Chợ Thị Trấn',
    items,
    rewardGold: Math.round(baseValue * 1.9),
    rewardExp: Math.max(90, playerLevel * 35),
    rewardReputation: 80 + playerLevel * 10,
    rewardTickets: 6,
    expiresAt: nowMs + 4 * 3_600_000,
    completed: false,
  };
}

export function generateDailyQuests(): DailyQuest[] {
  return [
    {
      id: 'dq_plant',
      type: 'plant',
      title: 'Gieo hạt 6 lần trên nông trại',
      target: 6,
      progress: 0,
      rewardGold: 120,
      rewardCoins: 2,
      claimed: false,
    },
    {
      id: 'dq_harvest',
      type: 'harvest',
      title: 'Thu hoạch 6 vụ nông sản',
      target: 6,
      progress: 0,
      rewardGold: 150,
      rewardCoins: 2,
      claimed: false,
    },
    {
      id: 'dq_produce',
      type: 'produce',
      title: 'Thu nhận 2 thành phẩm nhà máy',
      target: 2,
      progress: 0,
      rewardGold: 180,
      rewardCoins: 2,
      claimed: false,
    },
    {
      id: 'dq_order',
      type: 'order',
      title: 'Giao thành công 2 đơn hàng NPC',
      target: 2,
      progress: 0,
      rewardGold: 220,
      rewardCoins: 2,
      claimed: false,
    },
    {
      id: 'dq_help',
      type: 'help_friend',
      title: 'Tưới cây hỗ trợ bạn bè 2 lần',
      target: 2,
      progress: 0,
      rewardGold: 100,
      rewardCoins: 2,
      claimed: false,
    },
  ];
}

const NPC_CUSTOMERS = [
  { name: 'Bác Hai Tiệm Tạp Hóa', emoji: '👨‍🍳' },
  { name: 'Cô Lan Quán Cà Phê', emoji: '👩‍💼' },
  { name: 'Chú Tư Siêu Thị Xanh', emoji: '🧔' },
  { name: 'Bé Na Tiệm Bánh Ngọt', emoji: '👧' },
  { name: 'Ông Bảy Đầu Bếp', emoji: '👴' },
];

export function generateNpcOrders(
  playerLevel: number,
  nowMs: number = Date.now(),
  seedOffset = 0,
  refreshReductionPct = 0
): NpcOrder[] {
  const unlockedCrops = CROPS.filter((c) => c.unlockLevel <= playerLevel);
  const unlockedRecipes = RECIPES.filter((r) => r.unlockLevel <= playerLevel);
  const surge = getHourlyMarketSurge(nowMs);
  const orders: NpcOrder[] = [];
  const durationMs = Math.round(
    30 * 60_000 * (1 - Math.min(50, refreshReductionPct) / 100)
  );

  for (let i = 0; i < 3; i++) {
    const seed = Math.floor(nowMs / 60_000) + i * 17 + seedOffset * 31;
    const customer = NPC_CUSTOMERS[(seed + i) % NPC_CUSTOMERS.length];
    const items: Record<string, number> = {};

    const crop1 = unlockedCrops[seed % unlockedCrops.length];
    items[crop1.id] = 2 + (seed % 3);

    if (unlockedCrops.length > 1 && i >= 1) {
      const crop2 = unlockedCrops[(seed + 1) % unlockedCrops.length];
      items[crop2.id] = (items[crop2.id] ?? 0) + 1 + (seed % 2);
    }

    if (unlockedRecipes.length > 0 && i === 2) {
      const recipe = unlockedRecipes[seed % unlockedRecipes.length];
      items[recipe.outputItemId] = 1;
    }

    let rawValue = 0;
    let totalExp = 0;
    for (const [itemId, qty] of Object.entries(items)) {
      const price = getItemSellPriceWithSurge(itemId, surge);
      rawValue += price * qty;
      totalExp += qty * 10;
    }

    const rewardGold = Math.round(rawValue * 1.25);
    const rewardExp = Math.max(20, Math.round(totalExp * 1.15));

    orders.push({
      id: `order_${nowMs}_${i}_${seedOffset}`,
      customerName: customer.name,
      customerEmoji: customer.emoji,
      items,
      rewardGold,
      rewardExp,
      expiresAt: nowMs + durationMs,
    });
  }

  return orders;
}

export function generateRandomRedeemCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = (len: number) => {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  };
  return `DOPI-${segment(4)}-${segment(4)}`;
}

export function generateTransferCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `NAP-DOPI-${suffix}`;
}

export function validateRedeemCodeState(
  codeDoc: RedeemCodeDoc | null,
  uid: string,
  nowMs: number = Date.now()
): { valid: true } | { valid: false; reason: string } {
  if (!codeDoc) {
    return { valid: false, reason: 'Mã nạp không tồn tại.' };
  }
  if (!codeDoc.isActive) {
    return { valid: false, reason: 'Mã nạp này đã bị vô hiệu hóa.' };
  }
  if (codeDoc.expiresAt <= nowMs) {
    return { valid: false, reason: 'Mã nạp đã hết hạn sử dụng.' };
  }
  if (codeDoc.usedCount >= codeDoc.maxUses) {
    return { valid: false, reason: 'Mã nạp đã hết lượt sử dụng.' };
  }
  if (codeDoc.usedBy.includes(uid)) {
    return { valid: false, reason: 'Tài khoản của bạn đã sử dụng mã này rồi.' };
  }
  return { valid: true };
}

export function sanitizeForFirestore<T>(input: T): T {
  if (input === null || input === undefined) {
    return null as unknown as T;
  }
  if (typeof input === 'number') {
    return (Number.isFinite(input) ? input : 0) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (val !== undefined) {
        out[key] = sanitizeForFirestore(val);
      }
    }
    return out as T;
  }
  return input;
}

export function normalizeFarmPlots(
  rawPlots?: FarmPlot[] | null,
  nowMs: number = Date.now()
): FarmPlot[] {
  const source = Array.isArray(rawPlots) ? rawPlots : [];
  if (source.length === 0) {
    return Array.from({ length: INITIAL_PLOTS }, (_, idx) => ({
      id: idx,
      cropId: idx < 2 ? 'wheat' : null,
      plantedAt: idx < 2 ? nowMs - 20_000 : null,
      readyAt: idx < 2 ? nowMs + 10_000 : null,
      wateredBy: null,
      wateredAt: null,
      yieldBoosted: false,
      mutationBoosted: false,
    }));
  }
  return source.map((p, idx) => ({
    id: typeof p?.id === 'number' ? p.id : idx,
    cropId: typeof p?.cropId === 'string' && p.cropId ? p.cropId : null,
    plantedAt: typeof p?.plantedAt === 'number' ? p.plantedAt : null,
    readyAt: typeof p?.readyAt === 'number' ? p.readyAt : null,
    wateredBy: typeof p?.wateredBy === 'string' ? p.wateredBy : null,
    wateredAt: typeof p?.wateredAt === 'number' ? p.wateredAt : null,
    yieldBoosted: Boolean(p?.yieldBoosted),
    mutationBoosted: Boolean(p?.mutationBoosted),
  }));
}

export function createInitialEnterpriseState(nowMs: number = Date.now()): EnterpriseState {
  return {
    corporateFund: 2500,
    payrollReserveRatio: 40,
    rdLevel: 1,
    marketingLevel: 1,
    operationsLevel: 1,
    morale: 92,
    lastPayrollMonth: getCurrentMonthKey(nowMs),
    lastPayrollPaidAt: nowMs,
    autoPaySalary: true,
    totalRevenueGold: 2500,
    totalPayrollPaidGold: 0,
    totalContractsDone: 0,
    activeCampaignId: null,
    activeCampaignName: '',
    activeCampaignUntil: 0,
    specialists: createInitialSpecialists(),
    headhuntDiscountPct: 0,
    headhuntCount: 0,
    ledger: [
      {
        id: `ldg_init_${nowMs}`,
        type: 'deposit',
        title: 'Vốn điều lệ khởi tạo Quỹ Doanh Nghiệp',
        amountGold: 2500,
        isPositive: true,
        createdAt: nowMs,
      },
    ],
  };
}

export function normalizeEnterpriseState(
  raw?: Partial<EnterpriseState> | null,
  nowMs: number = Date.now()
): EnterpriseState {
  if (!raw || typeof raw !== 'object') {
    return createInitialEnterpriseState(nowMs);
  }
  const cleanLedger: EnterpriseLedgerEntry[] = Array.isArray(raw.ledger)
    ? raw.ledger
        .filter((e): e is EnterpriseLedgerEntry => Boolean(e && typeof e === 'object'))
        .slice(0, 20)
        .map((e, idx) => ({
          id: typeof e.id === 'string' && e.id ? e.id : `ldg_${nowMs}_${idx}`,
          type: e.type || 'deposit',
          title: (e.title || 'Giao dịch quỹ').slice(0, 120),
          amountGold: Math.max(0, Math.floor(Number(e.amountGold) || 0)),
          isPositive: Boolean(e.isPositive ?? true),
          createdAt: Number(e.createdAt) || nowMs,
        }))
    : [];

  const rawSpecs = (raw.specialists ?? {}) as Partial<Record<EnterpriseSpecialistId, number>>;
  const normalizedSpecialists: Record<EnterpriseSpecialistId, number> = {
    lean_engineer: Math.max(0, Math.min(5, Math.floor(Number(rawSpecs.lean_engineer) || 0))),
    cost_auditor: Math.max(0, Math.min(5, Math.floor(Number(rawSpecs.cost_auditor) || 0))),
    bio_agronomist: Math.max(0, Math.min(5, Math.floor(Number(rawSpecs.bio_agronomist) || 0))),
    b2b_director: Math.max(0, Math.min(5, Math.floor(Number(rawSpecs.b2b_director) || 0))),
    logistics_architect: Math.max(
      0,
      Math.min(5, Math.floor(Number(rawSpecs.logistics_architect) || 0))
    ),
    cfo_treasurer: Math.max(0, Math.min(5, Math.floor(Number(rawSpecs.cfo_treasurer) || 0))),
  };

  return {
    corporateFund: Math.max(0, Math.floor(Number(raw.corporateFund ?? 2500))),
    payrollReserveRatio: Math.max(
      10,
      Math.min(80, Math.floor(Number(raw.payrollReserveRatio ?? 40)))
    ),
    rdLevel: Math.max(1, Math.min(10, Math.floor(Number(raw.rdLevel) || 1))),
    marketingLevel: Math.max(
      1,
      Math.min(10, Math.floor(Number(raw.marketingLevel) || 1))
    ),
    operationsLevel: Math.max(
      1,
      Math.min(10, Math.floor(Number(raw.operationsLevel) || 1))
    ),
    morale: Math.max(0, Math.min(100, Math.floor(Number(raw.morale ?? 92)))),
    lastPayrollMonth:
      typeof raw.lastPayrollMonth === 'string' && raw.lastPayrollMonth
        ? raw.lastPayrollMonth
        : getCurrentMonthKey(nowMs),
    lastPayrollPaidAt: Math.max(0, Number(raw.lastPayrollPaidAt) || nowMs),
    autoPaySalary: Boolean(raw.autoPaySalary ?? true),
    totalRevenueGold: Math.max(0, Math.floor(Number(raw.totalRevenueGold ?? 2500))),
    totalPayrollPaidGold: Math.max(
      0,
      Math.floor(Number(raw.totalPayrollPaidGold) || 0)
    ),
    totalContractsDone: Math.max(
      0,
      Math.floor(Number(raw.totalContractsDone) || 0)
    ),
    activeCampaignId:
      typeof raw.activeCampaignId === 'string' && raw.activeCampaignId
        ? raw.activeCampaignId
        : null,
    activeCampaignName:
      typeof raw.activeCampaignName === 'string' ? raw.activeCampaignName : '',
    activeCampaignUntil: Math.max(0, Number(raw.activeCampaignUntil) || 0),
    specialists: normalizedSpecialists,
    headhuntDiscountPct: Math.max(
      0,
      Math.min(35, Math.floor(Number(raw.headhuntDiscountPct) || 0))
    ),
    headhuntCount: Math.max(0, Math.floor(Number(raw.headhuntCount) || 0)),
    ledger: cleanLedger,
  };
}

export function normalizePublicFarmData(
  raw: Partial<PublicFarmData> & { uid?: string },
  nowMs: number = Date.now()
): PublicFarmData {
  const safeBusinessName =
    (raw.businessName || '').trim().slice(0, 40) || 'Nông Trại DOPI';
  const safeDisplayName =
    (raw.displayName || '').trim().slice(0, 60) || safeBusinessName;
  const safeAvatar = (raw.avatarEmoji || '').trim().slice(0, 16) || '🧑‍🌾';

  return {
    uid: raw.uid || 'unknown_uid',
    isPublic: raw.isPublic ?? true,
    businessName: safeBusinessName.length >= 2 ? safeBusinessName : 'Nông Trại DOPI',
    displayName: safeDisplayName.length >= 1 ? safeDisplayName : 'Nông Dân',
    avatarEmoji: safeAvatar,
    level: Math.max(
      1,
      Math.min(MAX_PLAYER_LEVEL, Math.floor(Number(raw.level) || 1))
    ),
    vipLevel: Math.max(
      0,
      Math.min(MAX_VIP_LEVEL, Math.floor(Number(raw.vipLevel) || 0))
    ),
    totalRechargedCoins: Math.max(0, Math.floor(Number(raw.totalRechargedCoins) || 0)),
    wealthScore: Math.max(0, Math.round(Number(raw.wealthScore) || 0)),
    vehicles: Array.isArray(raw.vehicles)
      ? raw.vehicles.filter((v): v is string => typeof v === 'string').slice(0, 20)
      : [],
    treasures: Array.isArray(raw.treasures)
      ? raw.treasures.filter((t): t is string => typeof t === 'string').slice(0, 30)
      : [],
    farmPlots: normalizeFarmPlots(raw.farmPlots, nowMs),
    updatedAt: Number(raw.updatedAt) || nowMs,
  };
}

export function normalizeUserData(
  raw: Partial<UserGameData> & { uid: string; email: string },
  nowMs: number = Date.now()
): UserGameData {
  const monthKey = getCurrentMonthKey(nowMs);
  const weekKey = getCurrentWeekKey(nowMs);
  const sameMonth = raw.eventMonthKey === monthKey;

  const safeEmail = (raw.email || '').trim() || `${raw.uid}@dopi.local`;
  const fallbackName = (safeEmail.split('@')[0] || 'Nông Dân').slice(0, 32);
  const safeDisplayName =
    (raw.profile?.displayName || '').trim().slice(0, 60) || fallbackName || 'Nông Dân';
  const safeAvatar = (raw.profile?.avatarEmoji || '').trim().slice(0, 16) || '🧑‍🌾';
  const rawBiz = (raw.businessName || '').trim().slice(0, 40);
  const safeBusinessName =
    rawBiz.length >= 2 ? rawBiz : `Nông Trại ${safeDisplayName}`.slice(0, 40);

  const rawFactories = Array.isArray(raw.factories) ? raw.factories : [];
  const normalizedFactories = FACTORIES.map((def) => {
    const found = rawFactories.find((f) => f && f.id === def.id);
    return {
      id: def.id,
      unlocked: found ? Boolean(found.unlocked) : def.unlockCostGold === 0,
      queue: Array.isArray(found?.queue)
        ? found.queue.map((q, idx) => ({
            id: q?.id || `q_${nowMs}_${idx}`,
            recipeId: q?.recipeId || 'butter_bread',
            startedAt: Number(q?.startedAt) || nowMs,
            readyAt: Number(q?.readyAt) || nowMs + 60_000,
          }))
        : [],
    };
  });

  const cleanFriends = Array.isArray(raw.friends)
    ? Array.from(
        new Set(
          raw.friends.filter(
            (f): f is string => typeof f === 'string' && f.trim().length > 0 && f !== raw.uid
          )
        )
      ).slice(0, 100)
    : [];

  const rawLevel = Math.max(
    1,
    Math.min(MAX_PLAYER_LEVEL, Math.floor(Number(raw.level) || 1))
  );
  const rawExp = Math.max(0, Math.floor(Number(raw.exp) || 0));
  const rolledExp = applyExpAndLevelUp(rawLevel, rawExp, 0);

  const totalRecharged = Math.max(0, Math.floor(Number(raw.totalRechargedCoins) || 0));
  const computedVip = calculateVipLevel(totalRecharged);
  const rawVip = Math.max(
    0,
    Math.min(MAX_VIP_LEVEL, Math.floor(Number(raw.vipLevel) || 0))
  );

  const normalized: UserGameData = {
    uid: raw.uid,
    email: safeEmail,
    profile: {
      displayName: safeDisplayName,
      avatarEmoji: safeAvatar,
      joinedAt: Number(raw.profile?.joinedAt) || nowMs,
    },
    businessName: safeBusinessName,
    level: rolledExp.level,
    exp: rolledExp.exp,
    gold: Math.max(0, Math.floor(Number(raw.gold ?? 450))),
    dopiCoins: Math.max(0, Math.floor(Number(raw.dopiCoins ?? 15))),
    totalRechargedCoins: totalRecharged,
    vipLevel: Math.max(rawVip, computedVip),
    farmPlots: normalizeFarmPlots(raw.farmPlots, nowMs),
    factories: normalizedFactories,
    inventory: raw.inventory && typeof raw.inventory === 'object' ? { ...raw.inventory } : {},
    storageCapacity: Math.max(
      20,
      Math.floor(Number(raw.storageCapacity) || INITIAL_STORAGE_CAPACITY)
    ),
    friends: cleanFriends,
    dailyQuests:
      Array.isArray(raw.dailyQuests) && raw.dailyQuests.length > 0
        ? raw.dailyQuests
        : generateDailyQuests(),
    achievements:
      raw.achievements && typeof raw.achievements === 'object' ? { ...raw.achievements } : {},
    npcOrders:
      Array.isArray(raw.npcOrders) && raw.npcOrders.length > 0
        ? raw.npcOrders
        : generateNpcOrders(rolledExp.level, nowMs),
    lastDailyReset: raw.lastDailyReset || getTodayDateKey(nowMs),
    helpCountToday: Math.max(0, Math.floor(Number(raw.helpCountToday) || 0)),
    helpedFriendsToday: Array.isArray(raw.helpedFriendsToday)
      ? raw.helpedFriendsToday.filter((x): x is string => typeof x === 'string').slice(0, 10)
      : [],
    stats: {
      totalHarvested: Math.max(0, Math.floor(Number(raw.stats?.totalHarvested) || 0)),
      totalOrdersDone: Math.max(0, Math.floor(Number(raw.stats?.totalOrdersDone) || 0)),
      totalSoldMarket: Math.max(0, Math.floor(Number(raw.stats?.totalSoldMarket) || 0)),
      totalProduced: Math.max(0, Math.floor(Number(raw.stats?.totalProduced) || 0)),
      totalFriendsHelped: Math.max(0, Math.floor(Number(raw.stats?.totalFriendsHelped) || 0)),
    },
    hasFirstTopup: Boolean(raw.hasFirstTopup),
    firstTopupClaimed: Boolean(raw.firstTopupClaimed),
    eventRechargedCoins: sameMonth ? Math.max(0, Math.floor(Number(raw.eventRechargedCoins) || 0)) : 0,
    eventMonthKey: monthKey,
    monthlyTopupClaimed: sameMonth && Array.isArray(raw.monthlyTopupClaimed)
      ? raw.monthlyTopupClaimed
      : [],
    checkInStreak: Math.max(0, Math.min(7, Math.floor(Number(raw.checkInStreak) || 0))),
    lastCheckInDate: typeof raw.lastCheckInDate === 'string' ? raw.lastCheckInDate : '',
    eventTickets: Math.max(0, Math.floor(Number(raw.eventTickets) || 0)),
    eventWeekKey: raw.eventWeekKey || weekKey,
    rushOrder:
      raw.rushOrder && raw.rushOrder.expiresAt > nowMs
        ? raw.rushOrder
        : generateRushOrder(rolledExp.level, nowMs),
    reputation: Math.max(0, Math.floor(Number(raw.reputation) || 0)),
    autoWaterUntil: Math.max(0, Number(raw.autoWaterUntil) || 0),
    treasures: Array.isArray(raw.treasures)
      ? raw.treasures.filter((t): t is string => typeof t === 'string')
      : [],
    employees: {
      diligent_farmer: Math.max(0, Math.floor(Number(raw.employees?.diligent_farmer) || 0)),
      agri_engineer: Math.max(0, Math.floor(Number(raw.employees?.agri_engineer) || 0)),
      factory_manager: Math.max(0, Math.floor(Number(raw.employees?.factory_manager) || 0)),
      sales_director: Math.max(0, Math.floor(Number(raw.employees?.sales_director) || 0)),
    },
    vehicles: Array.isArray(raw.vehicles)
      ? raw.vehicles.filter((v): v is string => typeof v === 'string')
      : [],
    wealthScore: Math.max(0, Math.round(Number(raw.wealthScore) || 0)),
    investments: normalizeUserInvestments(raw.investments),
    enterprise: normalizeEnterpriseState(raw.enterprise, nowMs),
    createdAt: Number(raw.createdAt) || nowMs,
    updatedAt: Number(raw.updatedAt) || nowMs,
  };

  normalized.wealthScore = calculateWealthScore(normalized);
  return sanitizeForFirestore(normalized);
}

export function createInitialUserData(
  uid: string,
  email: string,
  displayName: string,
  nowMs: number = Date.now()
): UserGameData {
  const safeEmail = (email || '').trim() || `${uid}@dopi.local`;
  const safeName = (displayName.trim() || safeEmail.split('@')[0] || 'Nông Dân').slice(0, 32);
  const businessName = `Nông Trại ${safeName}`.slice(0, 40);

  const base: UserGameData = {
    uid,
    email: safeEmail,
    profile: {
      displayName: safeName,
      avatarEmoji: '🧑‍🌾',
      joinedAt: nowMs,
    },
    businessName,
    level: 1,
    exp: 0,
    gold: 450,
    dopiCoins: 15,
    totalRechargedCoins: 0,
    vipLevel: 0,
    farmPlots: Array.from({ length: INITIAL_PLOTS }, (_, idx) => ({
      id: idx,
      cropId: idx < 2 ? 'wheat' : null,
      plantedAt: idx < 2 ? nowMs - 20_000 : null,
      readyAt: idx < 2 ? nowMs + 10_000 : null,
      wateredBy: null,
      wateredAt: null,
      yieldBoosted: false,
      mutationBoosted: false,
    })),
    factories: FACTORIES.map((f) => ({
      id: f.id,
      unlocked: f.unlockCostGold === 0,
      queue: [],
    })),
    inventory: {
      wheat: 4,
      tomato: 2,
      basic_fertilizer: 2,
      fast_fertilizer: 2,
    },
    storageCapacity: INITIAL_STORAGE_CAPACITY,
    friends: [],
    dailyQuests: generateDailyQuests(),
    achievements: {},
    npcOrders: generateNpcOrders(1, nowMs),
    lastDailyReset: getTodayDateKey(nowMs),
    helpCountToday: 0,
    helpedFriendsToday: [],
    stats: {
      totalHarvested: 0,
      totalOrdersDone: 0,
      totalSoldMarket: 0,
      totalProduced: 0,
      totalFriendsHelped: 0,
    },
    hasFirstTopup: false,
    firstTopupClaimed: false,
    eventRechargedCoins: 0,
    eventMonthKey: getCurrentMonthKey(nowMs),
    monthlyTopupClaimed: [],
    checkInStreak: 0,
    lastCheckInDate: '',
    eventTickets: 3,
    eventWeekKey: getCurrentWeekKey(nowMs),
    rushOrder: generateRushOrder(1, nowMs),
    reputation: 0,
    autoWaterUntil: 0,
    treasures: [],
    employees: {
      diligent_farmer: 0,
      agri_engineer: 0,
      factory_manager: 0,
      sales_director: 0,
    },
    vehicles: [],
    wealthScore: 0,
    investments: createEmptyInvestments(),
    enterprise: createInitialEnterpriseState(nowMs),
    createdAt: nowMs,
    updatedAt: nowMs,
  };

  base.wealthScore = calculateWealthScore(base);
  return base;
}

export function encodeEmailKey(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/@/g, '_at_')
    .replace(/[^a-z0-9_.-]/g, '_');
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Sẵn sàng';
  const totalSec = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${hours}g ${String(mins).padStart(2, '0')}p`;
  }
  if (mins > 0) {
    return `${mins}p ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.floor(n));
}
