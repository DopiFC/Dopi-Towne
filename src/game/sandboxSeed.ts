import { ADMIN_EMAIL } from '../firebaseConfig';
import {
  calculateWealthScore,
  createInitialUserData,
  generateNpcOrders,
  generateRushOrder,
  getCurrentMonthKey,
  getCurrentWeekKey,
} from './economy';
import { calculateP2PCompanyValuation } from './investment';
import type {
  FriendRequestDoc,
  MarketListing,
  P2PCompanyDoc,
  PublicFarmData,
  RedeemCodeDoc,
  TopupRequestDoc,
  UserGameData,
} from './types';

/**
 * Dữ liệu mẫu chỉ kích hoạt khi mở đường dẫn kiểm thử `?autostart=1` (không hiển thị nút khách/demo trên giao diện thật).
 */
export function createSandboxBundle(isAdminPreview: boolean): {
  user: UserGameData;
  marketListings: MarketListing[];
  friendsFarms: PublicFarmData[];
  serverLeaderboard: PublicFarmData[];
  incomingRequests: FriendRequestDoc[];
  redeemCodes: RedeemCodeDoc[];
  topupRequests: TopupRequestDoc[];
  p2pCompanies: P2PCompanyDoc[];
} {
  const now = Date.now();
  const base = createInitialUserData(
    'sandbox_owner_01',
    isAdminPreview ? ADMIN_EMAIL : 'farmer.dopi@example.com',
    'Minh Khang',
    now - 86_400_000 * 3
  );

  const user: UserGameData = {
    ...base,
    businessName: 'Trang Trại Nắng Mai',
    level: 10,
    exp: 140,
    gold: 28500,
    dopiCoins: 420,
    totalRechargedCoins: 1650,
    vipLevel: 4,
    farmPlots: [
      { id: 0, cropId: 'wheat', plantedAt: now - 40_000, readyAt: now - 5_000, wateredBy: null, wateredAt: null },
      { id: 1, cropId: 'tomato', plantedAt: now - 90_000, readyAt: now - 2_000, wateredBy: null, wateredAt: null, yieldBoosted: true },
      { id: 2, cropId: 'strawberry', plantedAt: now - 50_000, readyAt: now + 180_000, wateredBy: null, wateredAt: null, mutationBoosted: true },
      { id: 3, cropId: 'corn', plantedAt: now - 40_000, readyAt: now + 95_000, wateredBy: 'friend_linh_02', wateredAt: now - 20_000 },
      { id: 4, cropId: null, plantedAt: null, readyAt: null, wateredBy: null, wateredAt: null },
      { id: 5, cropId: null, plantedAt: null, readyAt: null, wateredBy: null, wateredAt: null },
      { id: 6, cropId: null, plantedAt: null, readyAt: null, wateredBy: null, wateredAt: null },
      { id: 7, cropId: null, plantedAt: null, readyAt: null, wateredBy: null, wateredAt: null },
    ],
    factories: [
      {
        id: 'bakery',
        unlocked: true,
        queue: [
          {
            id: 'q_bread_1',
            recipeId: 'butter_bread',
            startedAt: now - 70_000,
            readyAt: now - 10_000,
          },
          {
            id: 'q_tart_2',
            recipeId: 'strawberry_tart',
            startedAt: now - 10_000,
            readyAt: now + 160_000,
          },
        ],
      },
      {
        id: 'coffee_roastery',
        unlocked: true,
        queue: [],
      },
      {
        id: 'dairy_plant',
        unlocked: false,
        queue: [],
      },
    ],
    inventory: {
      wheat: 18,
      tomato: 14,
      corn: 8,
      strawberry: 5,
      coffee: 3,
      butter_bread: 2,
      basic_fertilizer: 3,
      fast_fertilizer: 3,
      instant_fertilizer: 1,
      nutrient_water: 2,
      factory_oil: 2,
      mutation_serum: 2,
    },
    storageCapacity: 110,
    friends: ['friend_linh_02', 'friend_tuan_03'],
    dailyQuests: base.dailyQuests.map((q, idx) =>
      idx === 0 ? { ...q, progress: q.target } : idx === 1 ? { ...q, progress: 3 } : q
    ),
    npcOrders: generateNpcOrders(10, now, 1, 5),
    stats: {
      totalHarvested: 28,
      totalOrdersDone: 7,
      totalSoldMarket: 4,
      totalProduced: 9,
      totalFriendsHelped: 6,
    },
    hasFirstTopup: true,
    firstTopupClaimed: false,
    eventRechargedCoins: 650,
    eventMonthKey: getCurrentMonthKey(now),
    monthlyTopupClaimed: [],
    checkInStreak: 2,
    lastCheckInDate: '',
    eventTickets: 14,
    eventWeekKey: getCurrentWeekKey(now),
    rushOrder: generateRushOrder(10, now),
    reputation: 240,
    autoWaterUntil: 0,
    treasures: [],
    employees: {
      diligent_farmer: 0,
      agri_engineer: 1,
      factory_manager: 1,
      sales_director: 1,
    },
    vehicles: ['cargo_bike'],
    wealthScore: 0,
    investments: {
      npcHoldings: {
        DAGR: {
          shares: 15,
          avgBuyPrice: 172,
          lockedUntil: now - 600_000, // Đã mở khóa để test bán nhanh
        },
        WARE: {
          shares: 4,
          avgBuyPrice: 905,
          lockedUntil: now - 300_000,
        },
      },
      p2pHoldings: {
        top_tycoon_01: {
          ownerUid: 'top_tycoon_01',
          businessName: 'Tập Đoàn Nông Sản Hoàng Kim',
          shares: 10,
          avgBuyPrice: 1750,
          lockedUntil: now - 600_000,
        },
      },
      totalInvested: 23700,
      realizedProfit: 1450,
      lastDividendClaimAt: 0,
    },
  };
  user.wealthScore = calculateWealthScore(user);

  const marketListings: MarketListing[] = [
    {
      id: 'mkt_seed_1',
      sellerUid: 'friend_linh_02',
      sellerName: 'Vườn Dâu Thảo Nguyên',
      sellerVipLevel: 5,
      itemId: 'strawberry',
      quantity: 3,
      currency: 'gold',
      price: 590,
      status: 'active',
      createdAt: now - 600_000,
      updatedAt: now - 600_000,
    },
    {
      id: 'mkt_seed_2',
      sellerUid: 'friend_tuan_03',
      sellerName: 'Xưởng Rang Cao Nguyên',
      sellerVipLevel: 2,
      itemId: 'phin_coffee',
      quantity: 2,
      currency: 'gold',
      price: 1180,
      status: 'active',
      createdAt: now - 300_000,
      updatedAt: now - 300_000,
    },
    {
      id: 'mkt_seed_3',
      sellerUid: 'friend_linh_02',
      sellerName: 'Vườn Dâu Thảo Nguyên',
      sellerVipLevel: 5,
      itemId: 'dopi_durian',
      quantity: 1,
      currency: 'coins',
      price: 12,
      status: 'active',
      createdAt: now - 120_000,
      updatedAt: now - 120_000,
    },
  ];

  const friendsFarms: PublicFarmData[] = [
    {
      uid: 'friend_linh_02',
      isPublic: true,
      businessName: 'Vườn Dâu Thảo Nguyên',
      displayName: 'Thảo Linh',
      avatarEmoji: '🍓',
      level: 16,
      vipLevel: 6,
      totalRechargedCoins: 6800,
      wealthScore: 78500,
      vehicles: ['cargo_bike', 'tricycle_cart', 'mini_truck', 'reefer_truck'],
      treasures: ['golden_dopi_statue'],
      farmPlots: [
        { id: 0, cropId: 'strawberry', plantedAt: now - 30_000, readyAt: now + 210_000, wateredBy: null, wateredAt: null },
        { id: 1, cropId: 'coffee', plantedAt: now - 60_000, readyAt: now + 350_000, wateredBy: null, wateredAt: null },
        { id: 2, cropId: 'dopi_durian', plantedAt: now - 120_000, readyAt: now + 700_000, wateredBy: null, wateredAt: null },
        { id: 3, cropId: 'wheat', plantedAt: now - 40_000, readyAt: now - 5_000, wateredBy: null, wateredAt: null },
      ],
      updatedAt: now - 10_000,
    },
    {
      uid: 'friend_tuan_03',
      isPublic: true,
      businessName: 'Xưởng Rang Cao Nguyên',
      displayName: 'Hoàng Tuấn',
      avatarEmoji: '☕',
      level: 12,
      vipLevel: 3,
      totalRechargedCoins: 920,
      wealthScore: 34200,
      vehicles: ['cargo_bike', 'tricycle_cart', 'mini_truck'],
      treasures: [],
      farmPlots: [
        { id: 0, cropId: 'coffee', plantedAt: now - 40_000, readyAt: now + 380_000, wateredBy: null, wateredAt: null },
        { id: 1, cropId: 'corn', plantedAt: now - 20_000, readyAt: now + 120_000, wateredBy: null, wateredAt: null },
      ],
      updatedAt: now - 25_000,
    },
  ];

  const myPublicFarm: PublicFarmData = {
    uid: user.uid,
    isPublic: true,
    businessName: user.businessName,
    displayName: user.profile.displayName,
    avatarEmoji: user.profile.avatarEmoji,
    level: user.level,
    vipLevel: user.vipLevel,
    totalRechargedCoins: user.totalRechargedCoins,
    wealthScore: user.wealthScore,
    vehicles: user.vehicles,
    treasures: user.treasures,
    farmPlots: user.farmPlots,
    updatedAt: now,
  };

  const serverLeaderboard: PublicFarmData[] = [
    {
      uid: 'top_tycoon_01',
      isPublic: true,
      businessName: 'Tập Đoàn Nông Sản Hoàng Kim',
      displayName: 'Quốc Bảo',
      avatarEmoji: '👑',
      level: 42,
      vipLevel: 10,
      totalRechargedCoins: 128000,
      wealthScore: 985000,
      vehicles: ['dopi_container', 'cargo_helicopter', 'dopi_supercar'],
      treasures: ['golden_dopi_statue', 'diamond_seed_relic', 'farmer_crown', 'dopi_corp_shares'],
      farmPlots: [
        { id: 0, cropId: 'dopi_agarwood', plantedAt: now - 120_000, readyAt: now + 3200_000, wateredBy: null, wateredAt: null },
        { id: 1, cropId: 'ginseng', plantedAt: now - 60_000, readyAt: now + 1900_000, wateredBy: null, wateredAt: null },
        { id: 2, cropId: 'purple_grape', plantedAt: now - 40_000, readyAt: now + 1200_000, wateredBy: null, wateredAt: null },
      ],
      updatedAt: now - 5_000,
    },
    {
      uid: 'top_tycoon_02',
      isPublic: true,
      businessName: 'Điền Trang Cacao Xanh',
      displayName: 'Ngọc Hân',
      avatarEmoji: '🍫',
      level: 31,
      vipLevel: 8,
      totalRechargedCoins: 32500,
      wealthScore: 412000,
      vehicles: ['reefer_truck', 'dopi_container', 'cargo_helicopter'],
      treasures: ['golden_dopi_statue', 'diamond_seed_relic', 'farmer_crown'],
      farmPlots: [
        { id: 0, cropId: 'cacao', plantedAt: now - 50_000, readyAt: now + 900_000, wateredBy: null, wateredAt: null },
        { id: 1, cropId: 'dopi_durian', plantedAt: now - 90_000, readyAt: now + 500_000, wateredBy: null, wateredAt: null },
      ],
      updatedAt: now - 12_000,
    },
    ...friendsFarms,
    myPublicFarm,
  ];

  const incomingRequests: FriendRequestDoc[] = [
    {
      id: 'fr_seed_1',
      fromUid: 'player_an_04',
      fromEmail: 'hoangan@example.com',
      fromName: 'Nông Trại Bình Minh',
      toUid: user.uid,
      status: 'pending',
      createdAt: now - 1_800_000,
    },
  ];

  const redeemCodes: RedeemCodeDoc[] = [
    {
      code: 'DOPI-WELCOME-2026',
      amount: 500,
      maxUses: 100,
      usedCount: 12,
      usedBy: ['friend_linh_02'],
      expiresAt: now + 86_400_000 * 30,
      createdBy: ADMIN_EMAIL,
      createdAt: now - 86_400_000,
      isActive: true,
    },
    {
      code: 'DOPI-VIP1-GIFT',
      amount: 100,
      maxUses: 1,
      usedCount: 0,
      usedBy: [],
      expiresAt: now + 86_400_000 * 7,
      createdBy: ADMIN_EMAIL,
      createdAt: now - 3_600_000,
      isActive: true,
    },
  ];

  const topupRequests: TopupRequestDoc[] = [
    {
      id: 'topup_seed_pending_1',
      uid: user.uid,
      email: user.email,
      businessName: user.businessName,
      amount: 1000,
      transferCode: 'NAP-DOPI-8K2M',
      note: 'Chuyển khoản gói 1.000 Xu DOPI qua Vietcombank',
      status: 'pending',
      rejectReason: '',
      createdAt: now - 900_000,
      processedAt: 0,
    },
    {
      id: 'topup_seed_approved_2',
      uid: user.uid,
      email: user.email,
      businessName: user.businessName,
      amount: 500,
      transferCode: 'NAP-DOPI-4R9Q',
      note: 'Nạp lần đầu kích hoạt Quà Nạp Đầu',
      status: 'approved',
      rejectReason: '',
      createdAt: now - 86_400_000,
      processedAt: now - 85_400_000,
    },
  ];

  const buildSeedCompany = (
    ownerUid: string,
    businessName: string,
    level: number,
    wealthScore: number,
    plotCount: number,
    employeeCount: number,
    vehicleCount: number,
    recentOrders: number,
    availableShares: number,
    dividendRate: number,
    dividendPool: number,
    lastActiveAt: number
  ): P2PCompanyDoc => {
    const val = calculateP2PCompanyValuation({
      level,
      wealthScore,
      recentOrders,
      plotCount,
      employeeCount,
      vehicleCount,
      lastActiveAt,
      nowMs: now,
    });
    return {
      ownerUid,
      businessName,
      level,
      wealthScore,
      plotCount,
      employeeCount,
      vehicleCount,
      recentOrders,
      sharePrice: val.sharePrice,
      totalShares: 1000,
      availableShares,
      dividendRate,
      dividendPool,
      creditRating: val.creditRating,
      lastActiveAt,
      isListed: true,
    };
  };

  const p2pCompanies: P2PCompanyDoc[] = [
    buildSeedCompany(
      'top_tycoon_01',
      'Tập Đoàn Nông Sản Hoàng Kim',
      42,
      985_000,
      24,
      12,
      7,
      148,
      180,
      9,
      9600,
      now - 180_000
    ),
    buildSeedCompany(
      'top_tycoon_02',
      'Điền Trang Cacao Xanh',
      31,
      412_000,
      18,
      8,
      5,
      86,
      260,
      8,
      4200,
      now - 900_000
    ),
    buildSeedCompany(
      'friend_linh_02',
      'Vườn Dâu Thảo Nguyên',
      16,
      78_500,
      12,
      4,
      4,
      39,
      310,
      7,
      1850,
      now - 2_400_000
    ),
    buildSeedCompany(
      'friend_tuan_03',
      'Xưởng Rang Cao Nguyên',
      12,
      34_200,
      9,
      2,
      3,
      18,
      370,
      6,
      620,
      now - 9 * 86_400_000 // Vắng mặt > 7 ngày để minh họa tự động hạ tín nhiệm & giảm định giá
    ),
  ];

  return {
    user,
    marketListings,
    friendsFarms,
    serverLeaderboard,
    incomingRequests,
    redeemCodes,
    topupRequests,
    p2pCompanies,
  };
}
