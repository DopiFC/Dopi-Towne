export type GameTab =
  | 'farm'
  | 'factory'
  | 'shop'
  | 'market'
  | 'invest'
  | 'friends'
  | 'events'
  | 'business'
  | 'leaderboard'
  | 'quests';

export type ItemCategory = 'crop' | 'product' | 'booster' | 'treasure';
export type CurrencyType = 'gold' | 'coins';

export interface CropDef {
  id: string;
  name: string;
  emoji: string;
  seedPrice: number;
  baseSellPrice: number;
  growthSeconds: number;
  expReward: number;
  unlockLevel: number;
  description: string;
}

export interface RecipeDef {
  id: string;
  factoryId: FactoryId;
  outputItemId: string;
  name: string;
  emoji: string;
  ingredients: Record<string, number>;
  productionSeconds: number;
  baseSellPrice: number;
  expReward: number;
  unlockLevel: number;
}

export type FactoryId = 'bakery' | 'coffee_roastery' | 'dairy_plant';

export interface FactoryDef {
  id: FactoryId;
  name: string;
  emoji: string;
  description: string;
  unlockCostGold: number;
  unlockLevel: number;
  accentColor: string;
}

export type BoosterEffectType =
  | 'speed_plot'
  | 'yield_boost'
  | 'factory_oil'
  | 'mutation_serum'
  | 'auto_sprinkler'
  | 'premium_storage';

export interface BoosterDef {
  id: string;
  name: string;
  emoji: string;
  currency: CurrencyType;
  price: number;
  minLevel: number;
  effectType: BoosterEffectType;
  description: string;
  speedReductionPercent: number;
}

export interface TreasureDef {
  id: string;
  name: string;
  emoji: string;
  minLevel: number;
  priceGold: number;
  priceCoins?: number;
  wealthBonus: number;
  description: string;
}

export type EmployeeId =
  | 'diligent_farmer'
  | 'agri_engineer'
  | 'factory_manager'
  | 'sales_director';

export interface EmployeeDef {
  id: EmployeeId;
  name: string;
  emoji: string;
  role: string;
  description: string;
  baseHireGold: number;
  baseUpgradeCoins: number; // Applied from Lv 4+
  maxLevel: number;
  wealthPerLevel: number;
}

export interface VehicleDef {
  id: string;
  name: string;
  emoji: string;
  minLevel: number;
  priceGold: number;
  priceCoins: number;
  orderRewardBonusPct: number;
  orderRefreshReductionPct: number;
  wealthBonus: number;
  description: string;
}

export interface ItemCatalogEntry {
  id: string;
  name: string;
  emoji: string;
  category: ItemCategory;
  baseSellPrice: number;
}

export interface VipTier {
  level: number;
  requiredCoins: number;
  growthReductionPct: number;
  marketTaxPct: number;
  factoryQueueSlots: number;
  harvestAllUnlocked: boolean;
  frameTitle: string;
  frameRingClass: string;
  badgeColorClass: string;
}

export interface FarmPlot {
  id: number;
  cropId: string | null;
  plantedAt: number | null;
  readyAt: number | null;
  wateredBy: string | null;
  wateredAt: number | null;
  yieldBoosted?: boolean;
  mutationBoosted?: boolean;
}

export interface FactoryQueueItem {
  id: string;
  recipeId: string;
  startedAt: number;
  readyAt: number;
}

export interface FactoryState {
  id: FactoryId;
  unlocked: boolean;
  queue: FactoryQueueItem[];
}

export interface NpcOrder {
  id: string;
  customerName: string;
  customerEmoji: string;
  items: Record<string, number>;
  rewardGold: number;
  rewardExp: number;
  expiresAt: number;
}

export interface RushOrder {
  id: string;
  title: string;
  items: Record<string, number>;
  rewardGold: number;
  rewardExp: number;
  rewardReputation: number;
  rewardTickets: number;
  expiresAt: number;
  completed: boolean;
}

export type QuestActionType =
  | 'harvest'
  | 'plant'
  | 'produce'
  | 'order'
  | 'help_friend';

export interface DailyQuest {
  id: string;
  type: QuestActionType;
  title: string;
  target: number;
  progress: number;
  rewardGold: number;
  rewardCoins: number;
  claimed: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  statKey: keyof PlayerStats;
  target: number;
  rewardGold: number;
  rewardCoins: number;
  emoji: string;
}

export interface AchievementProgress {
  claimed: boolean;
}

export interface PlayerStats {
  totalHarvested: number;
  totalOrdersDone: number;
  totalSoldMarket: number;
  totalProduced: number;
  totalFriendsHelped: number;
}

export interface UserGameData {
  uid: string;
  email: string;
  profile: {
    displayName: string;
    avatarEmoji: string;
    joinedAt: number;
  };
  businessName: string;
  level: number;
  exp: number;
  gold: number;
  dopiCoins: number;
  totalRechargedCoins: number;
  vipLevel: number;
  farmPlots: FarmPlot[];
  factories: FactoryState[];
  inventory: Record<string, number>;
  storageCapacity: number;
  friends: string[];
  dailyQuests: DailyQuest[];
  achievements: Record<string, AchievementProgress>;
  npcOrders: NpcOrder[];
  lastDailyReset: string;
  helpCountToday: number;
  helpedFriendsToday: string[];
  stats: PlayerStats;
  // Upgraded v2 fields (with safe defaults via normalizeUserData)
  hasFirstTopup: boolean;
  firstTopupClaimed: boolean;
  eventRechargedCoins: number;
  eventMonthKey: string;
  monthlyTopupClaimed: number[];
  checkInStreak: number;
  lastCheckInDate: string;
  eventTickets: number;
  eventWeekKey: string;
  rushOrder: RushOrder | null;
  reputation: number;
  autoWaterUntil: number;
  treasures: string[];
  employees: Record<EmployeeId, number>;
  vehicles: string[];
  wealthScore: number;
  investments?: UserInvestments;
  createdAt: number;
  updatedAt: number;
}

export interface PublicFarmData {
  uid: string;
  isPublic?: boolean;
  businessName: string;
  displayName: string;
  avatarEmoji: string;
  level: number;
  vipLevel: number;
  totalRechargedCoins?: number;
  wealthScore?: number;
  vehicles?: string[];
  treasures?: string[];
  farmPlots: FarmPlot[];
  updatedAt: number;
}

export interface TopupRequestDoc {
  id: string;
  uid: string;
  email: string;
  businessName: string;
  amount: number;
  transferCode: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason: string;
  createdAt: number;
  processedAt: number;
}

export interface RedeemCodeDoc {
  code: string;
  amount: number;
  maxUses: number;
  usedCount: number;
  usedBy: string[];
  expiresAt: number;
  createdBy: string;
  createdAt: number;
  isActive: boolean;
}

export interface MarketListing {
  id: string;
  sellerUid: string;
  sellerName: string;
  sellerVipLevel: number;
  itemId: string;
  quantity: number;
  currency: CurrencyType;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  buyerUid?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FriendRequestDoc {
  id: string;
  fromUid: string;
  fromEmail: string;
  fromName: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  updatedAt?: number;
}

export interface MarketSurgeEvent {
  itemId: string;
  bonusPercent: number;
  endsAt: number;
  hourKey: number;
}

export interface CheckInDayReward {
  day: number;
  label: string;
  gold: number;
  coins: number;
  tickets: number;
  itemId?: string;
  itemQty?: number;
}

export interface MonthlyTopupMilestone {
  threshold: number;
  title: string;
  rewardGold: number;
  rewardTickets: number;
  rewardItemId?: string;
  rewardItemQty?: number;
  rewardVehicleId?: string;
  description: string;
}

export interface EventShopItem {
  id: string;
  name: string;
  emoji: string;
  ticketCost: number;
  itemId?: string;
  itemQty?: number;
  goldReward?: number;
  reputationReward?: number;
  description: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

// ==================== INVESTMENT & P2P EXCHANGE TYPES ====================

export type StockCode = 'DAGR' | 'COFF' | 'DLOG' | 'WARE' | 'BIOF' | 'LUXD';
export type StockRiskLevel = 'low' | 'medium' | 'high' | 'very_high';
export type CreditRating = 'AAA' | 'AA' | 'A' | 'B' | 'C';

export interface NpcStockDef {
  code: StockCode;
  name: string;
  sector: string;
  emoji: string;
  currency: CurrencyType;
  risk: StockRiskLevel;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  volatility: number;
  dividendDailyPct: number;
  basePE: number;
  revenueBase: number;
  profitMarginPct: number;
  description: string;
}

export interface StockSessionPoint {
  sessionIndex: number;
  timestamp: number;
  label: string;
  price: number;
}

export interface StockNewsItem {
  code: StockCode;
  stockName: string;
  headline: string;
  summary: string;
  impact: 'positive' | 'negative' | 'neutral';
  impactHint: string;
}

export interface StockMarketSnapshot {
  def: NpcStockDef;
  currentPrice: number;
  previousPrice: number;
  changePct: number;
  history: StockSessionPoint[];
  peRatio: number;
  latestRevenue: number;
  profitMarginPct: number;
  dividendDailyPct: number;
  news: StockNewsItem;
  nextSessionAt: number;
}

export interface P2PCompanyDoc {
  ownerUid: string;
  businessName: string;
  level: number;
  wealthScore: number;
  plotCount: number;
  employeeCount: number;
  vehicleCount: number;
  recentOrders: number;
  sharePrice: number;
  totalShares: number;
  availableShares: number;
  dividendRate: number;
  dividendPool: number;
  creditRating: CreditRating;
  lastActiveAt: number;
  isListed: boolean;
}

export interface NpcStockHolding {
  shares: number;
  avgBuyPrice: number;
  lockedUntil: number;
}

export interface P2PStockHolding {
  ownerUid: string;
  businessName: string;
  shares: number;
  avgBuyPrice: number;
  lockedUntil: number;
}

export interface UserInvestments {
  npcHoldings: Record<string, NpcStockHolding>;
  p2pHoldings: Record<string, P2PStockHolding>;
  totalInvested: number;
  realizedProfit: number;
  lastDividendClaimAt: number;
}

