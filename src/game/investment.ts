import { getHourlyMarketSurge } from './economy';
import type {
  CreditRating,
  NpcStockDef,
  P2PCompanyDoc,
  StockCode,
  StockMarketSnapshot,
  StockNewsItem,
  StockSessionPoint,
  UserGameData,
  UserInvestments,
} from './types';

export const MARKET_SESSION_MS = 15 * 60_000; // 15 phút mỗi phiên
export const MARKET_HISTORY_SESSIONS = 24; // 24 phiên = 6 giờ gần nhất
export const INVESTMENT_LOCKUP_MS = 30 * 60_000; // Khóa lệnh T+30 phút chống spam
export const DIVIDEND_CYCLE_MS = 4 * 3_600_000; // Chu kỳ nhận cổ tức 4 giờ/lần (6 kỳ/ngày)

export const P2P_TOTAL_SHARES = 1000;
export const P2P_MAX_PUBLIC_SHARES = 400; // Tối đa bán 40% cổ phần
export const P2P_MIN_IPO_LEVEL = 10;
export const P2P_MIN_DIVIDEND_RATE = 5;
export const P2P_MAX_DIVIDEND_RATE = 10;
export const P2P_INACTIVITY_PENALTY_DAYS = 7;

export const NPC_STOCKS: NpcStockDef[] = [
  {
    code: 'DAGR',
    name: 'Tập đoàn Nông Sản DOPI',
    sector: 'Nông nghiệp cốt lõi',
    emoji: '🌾',
    currency: 'gold',
    risk: 'low',
    basePrice: 180,
    minPrice: 110,
    maxPrice: 320,
    volatility: 0.045,
    dividendDailyPct: 2.2,
    basePE: 12.4,
    revenueBase: 485_000,
    profitMarginPct: 18.5,
    description:
      'Doanh nghiệp nông sản đầu ngành cung cấp lúa mì, ngô và thực phẩm thiết yếu. Biến động thấp, cổ tức tiền mặt ổn định.',
  },
  {
    code: 'COFF',
    name: 'VinaCoffee Tech',
    sector: 'Cà phê & Chế biến',
    emoji: '☕',
    currency: 'gold',
    risk: 'medium',
    basePrice: 420,
    minPrice: 220,
    maxPrice: 780,
    volatility: 0.085,
    dividendDailyPct: 1.6,
    basePE: 17.8,
    revenueBase: 820_000,
    profitMarginPct: 22.0,
    description:
      'Chuỗi rang xay công nghệ cao của DOPI Towne. Giá cổ phiếu phản ứng mạnh theo xu hướng tiêu thụ và sự kiện tăng giá cà phê.',
  },
  {
    code: 'DLOG',
    name: 'DOPI Logistics & Xe Tải',
    sector: 'Vận tải & Hậu cần',
    emoji: '🚚',
    currency: 'gold',
    risk: 'medium',
    basePrice: 650,
    minPrice: 380,
    maxPrice: 1150,
    volatility: 0.065,
    dividendDailyPct: 1.9,
    basePE: 15.2,
    revenueBase: 1_240_000,
    profitMarginPct: 16.8,
    description:
      'Đội xe vận chuyển nông sản liên vùng và kho lạnh. Tăng trưởng doanh thu đều đặn khi thị trường đơn hàng sôi động.',
  },
  {
    code: 'WARE',
    name: 'Bất Động Sản Kho Bãi',
    sector: 'Hạ tầng & Cho thuê kho',
    emoji: '🏭',
    currency: 'gold',
    risk: 'low',
    basePrice: 920,
    minPrice: 620,
    maxPrice: 1480,
    volatility: 0.038,
    dividendDailyPct: 3.1,
    basePE: 11.6,
    revenueBase: 960_000,
    profitMarginPct: 34.5,
    description:
      'Sở hữu mạng lưới kho chứa nông sản quy mô lớn. Rủi ro thấp, biên lợi nhuận cao và tỷ suất cổ tức hấp dẫn nhất sàn.',
  },
  {
    code: 'BIOF',
    name: 'Công Nghệ Phân Bón Sinh Học',
    sector: 'Công nghệ sinh học',
    emoji: '🧪',
    currency: 'gold',
    risk: 'high',
    basePrice: 1350,
    minPrice: 600,
    maxPrice: 2750,
    volatility: 0.145,
    dividendDailyPct: 0.9,
    basePE: 26.5,
    revenueBase: 610_000,
    profitMarginPct: 28.0,
    description:
      'Nghiên cứu thuốc đột biến và phân bón siêu tốc thế hệ mới. Biên độ dao động giá mạnh, cơ hội lướt sóng sinh lời lớn.',
  },
  {
    code: 'LUXD',
    name: 'Tập Đoàn Xa Xỉ DOPI',
    sector: 'Hàng hiệu & Báu vật',
    emoji: '💎',
    currency: 'coins',
    risk: 'very_high',
    basePrice: 45,
    minPrice: 18,
    maxPrice: 110,
    volatility: 0.175,
    dividendDailyPct: 1.4,
    basePE: 31.2,
    revenueBase: 3_400_000,
    profitMarginPct: 41.0,
    description:
      'Tập đoàn chế tác báu vật và siêu xe DOPI Limited, niêm yết trực tiếp bằng Xu DOPI. Lợi nhuận kỳ vọng và rủi ro đều rất cao.',
  },
];

export const NPC_STOCK_MAP: Record<StockCode, NpcStockDef> = NPC_STOCKS.reduce(
  (acc, item) => {
    acc[item.code] = item;
    return acc;
  },
  {} as Record<StockCode, NpcStockDef>
);

const SECTOR_NEWS_TEMPLATES: Record<
  StockCode,
  {
    positive: { headline: string; summary: string }[];
    negative: { headline: string; summary: string }[];
    neutral: { headline: string; summary: string }[];
  }
> = {
  DAGR: {
    positive: [
      {
        headline: 'DAGR trúng gói thầu cung ứng nông sản sạch toàn vùng',
        summary: 'Sản lượng tiêu thụ lúa mì và rau quả quý này vượt 18% kế hoạch, dòng tiền dồi dào.',
      },
      {
        headline: 'Mùa vụ thuận lợi giúp DAGR mở rộng biên lợi nhuận nông nghiệp',
        summary: 'Chi phí tưới tiêu giảm nhờ hệ thống tự động hóa mới đưa vào vận hành.',
      },
    ],
    negative: [
      {
        headline: 'Chi phí hạt giống nhập khẩu nhích nhẹ gây áp lực lên DAGR',
        summary: 'Biên lợi nhuận ngắn hạn bị thu hẹp nhẹ, cổ phiếu điều chỉnh tích lũy.',
      },
    ],
    neutral: [
      {
        headline: 'DAGR duy trì chính sách trả cổ tức tiền mặt đều đặn',
        summary: 'Tập đoàn giữ ổn định vùng cung ứng và tập trung tối ưu chất lượng nông sản.',
      },
    ],
  },
  COFF: {
    positive: [
      {
        headline: 'Cơn sốt cà phê đặc sản đẩy đơn hàng VinaCoffee Tech tăng vọt',
        summary: 'Chuỗi quán cà phê đồng loạt nhập thêm hạt rang xay cao cấp trong tuần này.',
      },
      {
        headline: 'COFF ra mắt dây chuyền rang lạnh tự động tăng 24% công suất',
        summary: 'Giới phân tích nâng dự báo tăng trưởng doanh thu của ngành cà phê.',
      },
    ],
    negative: [
      {
        headline: 'Nguồn cung hạt cà phê cao nguyên biến động mạnh',
        summary: 'Giá nguyên liệu đầu vào tăng khiến nhà đầu tư ngắn hạn chốt lời COFF.',
      },
    ],
    neutral: [
      {
        headline: 'VinaCoffee Tech giữ vững thị phần xuất khẩu cà phê phin',
        summary: 'Nhu cầu tiêu thụ ổn định tại các thành phố lớn, chờ cú hích sự kiện ngành.',
      },
    ],
  },
  DLOG: {
    positive: [
      {
        headline: 'Lưu lượng giao đơn NPC tăng kỷ lục, DLOG hưởng lợi lớn',
        summary: 'Đội xe tải lạnh hoạt động hết công suất, cước vận tải cải thiện tích cực.',
      },
      {
        headline: 'DLOG khai trương tuyến vận tải tốc hành nối liền 4 nông trường',
        summary: 'Thời gian luân chuyển hàng hóa giảm 20%, thu hút thêm khách hàng doanh nghiệp.',
      },
    ],
    negative: [
      {
        headline: 'Giá nhiên liệu vận tải tăng nhẹ ảnh hưởng biên lãi DLOG',
        summary: 'Doanh nghiệp đang tái cơ cấu tuyến đường để tiết giảm chi phí vận hành.',
      },
    ],
    neutral: [
      {
        headline: 'DOPI Logistics hoàn tất bảo dưỡng định kỳ đội xe tải nặng',
        summary: 'Hoạt động vận chuyển duy trì nhịp độ đều đặn, thanh khoản cổ phiếu cân bằng.',
      },
    ],
  },
  WARE: {
    positive: [
      {
        headline: 'Tỷ lệ lấp đầy kho chứa nông sản của WARE đạt mốc 96%',
        summary: 'Nhu cầu mở rộng kho từ các chủ nông trại lớn đẩy doanh thu cho thuê tăng bền vững.',
      },
      {
        headline: 'WARE khánh thành cụm kho lạnh tự động chuẩn quốc tế',
        summary: 'Tài sản cố định tăng trưởng vững chắc, củng cố nền tảng chia cổ tức cao.',
      },
    ],
    negative: [
      {
        headline: 'Chi phí nâng cấp hệ thống làm lạnh khiến WARE tạm chậm đà tăng',
        summary: 'Khoản đầu tư dài hạn làm giảm lợi nhuận ngắn hạn nhưng tăng sức chứa quý sau.',
      },
    ],
    neutral: [
      {
        headline: 'Bất Động Sản Kho Bãi WARE tiếp tục là điểm trú ẩn an toàn',
        summary: 'Dòng tiền phòng thủ tìm đến cổ phiếu cổ tức cao khi thị trường rung lắc.',
      },
    ],
  },
  BIOF: {
    positive: [
      {
        headline: 'BIOF thử nghiệm thành công chế phẩm rút ngắn 35% thời gian chín',
        summary: 'Cổ phiếu công nghệ sinh học bứt phá mạnh nhờ kỳ vọng doanh số phân bón siêu tốc.',
      },
      {
        headline: 'Đơn đặt hàng Thuốc Đột Biến Vàng của BIOF tăng gấp đôi',
        summary: 'Nhiều nông trại cấp cao sẵn sàng trả giá tốt cho sản phẩm năng suất cao.',
      },
    ],
    negative: [
      {
        headline: 'Chi phí R&D tăng cao khiến kết quả ngắn hạn của BIOF biến động mạnh',
        summary: 'Nhà đầu tư thận trọng trước áp lực chốt lời sau nhịp tăng nóng.',
      },
    ],
    neutral: [
      {
        headline: 'BIOF công bố lộ trình nghiên cứu dòng phân bón hữu cơ thế hệ 3',
        summary: 'Thị trường chờ đợi kết quả kiểm định thực tế trước khi xác lập xu hướng mới.',
      },
    ],
  },
  LUXD: {
    positive: [
      {
        headline: 'Giới siêu giàu DOPI Towne săn đón bộ sưu tập Báu Vật mới của LUXD',
        summary: 'Doanh số tính bằng Xu DOPI tăng vọt, biên lợi nhuận xa xỉ dẫn đầu toàn sàn.',
      },
      {
        headline: 'Siêu Xe DOPI Limited cháy hàng ngay phiên mở bán đầu tiên',
        summary: 'Cổ phiếu LUXD thu hút dòng vốn Xu DOPI mạnh mẽ với kỳ vọng định giá mới.',
      },
    ],
    negative: [
      {
        headline: 'Lực chốt lời mạnh xuất hiện ở nhóm cổ phiếu xa xỉ LUXD',
        summary: 'Biên độ dao động lớn khiến nhà đầu tư ngắn hạn phải quản trị rủi ro chặt chẽ.',
      },
    ],
    neutral: [
      {
        headline: 'Tập Đoàn Xa Xỉ DOPI giữ chiến lược sản xuất giới hạn độc bản',
        summary: 'Giá trị thương hiệu duy trì ở mức cao, giao dịch bằng Xu DOPI khá sôi động.',
      },
    ],
  },
};

export function createEmptyInvestments(): UserInvestments {
  return {
    npcHoldings: {},
    p2pHoldings: {},
    totalInvested: 0,
    realizedProfit: 0,
    lastDividendClaimAt: 0,
  };
}

export function normalizeUserInvestments(
  raw?: Partial<UserInvestments> | null
): UserInvestments {
  return {
    npcHoldings: raw?.npcHoldings ? { ...raw.npcHoldings } : {},
    p2pHoldings: raw?.p2pHoldings ? { ...raw.p2pHoldings } : {},
    totalInvested: Math.max(0, Number(raw?.totalInvested || 0)),
    realizedProfit: Number(raw?.realizedProfit || 0),
    lastDividendClaimAt: Math.max(0, Number(raw?.lastDividendClaimAt || 0)),
  };
}

/**
 * Deterministic hash -> [0, 1) strictly from string + integer seed (zero server cost)
 */
function deterministicUnit(seedKey: string, sessionIndex: number): number {
  let h = 2166136261 ^ sessionIndex;
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function getMarketSessionIndex(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / MARKET_SESSION_MS);
}

export function getNextSessionTimestamp(nowMs: number = Date.now()): number {
  return (getMarketSessionIndex(nowMs) + 1) * MARKET_SESSION_MS;
}

function formatSessionTimeLabel(timestampMs: number): string {
  const d = new Date(timestampMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Computes deterministic 24-session price series for a stock at any timestamp.
 * Every player worldwide sees the exact same chart and price within the same 15-minute window.
 */
function computeDeterministicPriceAtSession(
  def: NpcStockDef,
  sessionIndex: number
): number {
  // Anchor wave + multi-horizon deterministic random walk with mean reversion
  const anchorCycle = Math.sin(sessionIndex * 0.21 + def.code.charCodeAt(0) * 0.7);
  const microCycle = Math.cos(sessionIndex * 0.57 + def.code.charCodeAt(1) * 1.3);
  const u1 = deterministicUnit(def.code, sessionIndex);
  const u2 = deterministicUnit(`${def.code}_prev`, sessionIndex - 1);
  const u3 = deterministicUnit(`${def.code}_macro`, Math.floor(sessionIndex / 4));

  // Combine centered impulses (-1..+1) scaled by stock volatility
  const combinedWave =
    anchorCycle * 0.45 +
    microCycle * 0.25 +
    (u1 - 0.5) * 1.35 +
    (u2 - 0.5) * 0.55 +
    (u3 - 0.5) * 0.9;

  let factor = 1 + combinedWave * def.volatility * 1.85;

  // COFF reacts directly to hourly coffee surge events in the game
  if (def.code === 'COFF') {
    const sessionMs = sessionIndex * MARKET_SESSION_MS;
    const surge = getHourlyMarketSurge(sessionMs);
    if (
      surge.itemId === 'coffee' ||
      surge.itemId === 'phin_coffee' ||
      surge.itemId === 'milk_coffee'
    ) {
      factor *= 1.09;
    }
  }

  const rawPrice = def.basePrice * factor;
  const clamped = Math.max(def.minPrice, Math.min(def.maxPrice, rawPrice));
  return Math.max(1, Math.round(clamped));
}

export function getStockMarketSnapshot(
  code: StockCode,
  nowMs: number = Date.now()
): StockMarketSnapshot {
  const def = NPC_STOCK_MAP[code];
  const currentSession = getMarketSessionIndex(nowMs);
  const startSession = currentSession - (MARKET_HISTORY_SESSIONS - 1);

  const history: StockSessionPoint[] = [];
  for (let s = startSession; s <= currentSession; s++) {
    const ts = s * MARKET_SESSION_MS;
    history.push({
      sessionIndex: s,
      timestamp: ts,
      label: formatSessionTimeLabel(ts),
      price: computeDeterministicPriceAtSession(def, s),
    });
  }

  const currentPrice = history[history.length - 1].price;
  const previousPrice =
    history.length >= 2 ? history[history.length - 2].price : currentPrice;
  const changePct =
    previousPrice > 0
      ? Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2))
      : 0;

  // Dynamic fundamental ratios synchronized with current price & session
  const priceRatio = currentPrice / def.basePrice;
  const peRatio = Number(Math.max(4.5, def.basePE * priceRatio).toFixed(1));
  const revFactor = 0.92 + deterministicUnit(`${def.code}_rev`, Math.floor(currentSession / 8)) * 0.22;
  const latestRevenue = Math.round(def.revenueBase * revFactor);
  const marginDelta = (deterministicUnit(`${def.code}_mgn`, Math.floor(currentSession / 8)) - 0.5) * 3.2;
  const profitMarginPct = Number(Math.max(6, def.profitMarginPct + marginDelta).toFixed(1));

  // Determine sector news matching price momentum (with special COFF surge news)
  const surge = getHourlyMarketSurge(nowMs);
  let news: StockNewsItem;

  if (
    def.code === 'COFF' &&
    (surge.itemId === 'coffee' ||
      surge.itemId === 'phin_coffee' ||
      surge.itemId === 'milk_coffee')
  ) {
    news = {
      code: 'COFF',
      stockName: def.name,
      headline: `Sự kiện giờ vàng tăng giá Cà phê (+${surge.bonusPercent}%) kích hoạt sóng tăng COFF`,
      summary:
        'Giá bán nông sản cà phê tăng đột biến trên toàn thị trấn giúp VinaCoffee Tech bùng nổ kỳ vọng lợi nhuận.',
      impact: 'positive',
      impactHint: 'Tích cực · Hỗ trợ đà tăng giá',
    };
  } else {
    const pool = SECTOR_NEWS_TEMPLATES[def.code];
    const impact: StockNewsItem['impact'] =
      changePct >= 1.2 ? 'positive' : changePct <= -1.2 ? 'negative' : 'neutral';
    const list = pool[impact];
    const pickIdx = Math.floor(
      deterministicUnit(`${def.code}_news`, currentSession) * list.length
    );
    const chosen = list[pickIdx] ?? list[0];
    news = {
      code: def.code,
      stockName: def.name,
      headline: chosen.headline,
      summary: chosen.summary,
      impact,
      impactHint:
        impact === 'positive'
          ? 'Tích cực · Lực cầu tăng'
          : impact === 'negative'
            ? 'Thận trọng · Áp lực điều chỉnh'
            : 'Trung lập · Giao dịch ổn định',
    };
  }

  return {
    def,
    currentPrice,
    previousPrice,
    changePct,
    history,
    peRatio,
    latestRevenue,
    profitMarginPct,
    dividendDailyPct: def.dividendDailyPct,
    news,
    nextSessionAt: getNextSessionTimestamp(nowMs),
  };
}

export function getAllStockSnapshots(
  nowMs: number = Date.now()
): StockMarketSnapshot[] {
  return NPC_STOCKS.map((s) => getStockMarketSnapshot(s.code, nowMs));
}

export function getMarketTickerHeadlines(
  nowMs: number = Date.now()
): StockNewsItem[] {
  return getAllStockSnapshots(nowMs).map((snap) => snap.news);
}

/**
 * Phí giao dịch chứng khoán & cổ phần P2P:
 * VIP 0 = 4.0%, giảm dần 0.25% mỗi cấp VIP xuống còn 1.5% ở VIP 10.
 */
export function calculateInvestmentFeePct(vipLevel: number): number {
  const clamped = Math.max(0, Math.min(10, Math.floor(vipLevel)));
  return Number(Math.max(1.5, 4 - clamped * 0.25).toFixed(2));
}

export function calculateBuyTrade(
  unitPrice: number,
  quantity: number,
  vipLevel: number
): { gross: number; feePct: number; feeAmount: number; totalCost: number } {
  const safeQty = Math.max(1, Math.floor(quantity));
  const safePrice = Math.max(1, Math.floor(unitPrice));
  const gross = safePrice * safeQty;
  const feePct = calculateInvestmentFeePct(vipLevel);
  const feeAmount = Math.max(1, Math.ceil((gross * feePct) / 100));
  return {
    gross,
    feePct,
    feeAmount,
    totalCost: gross + feeAmount,
  };
}

export function calculateSellTrade(
  unitPrice: number,
  quantity: number,
  vipLevel: number
): { gross: number; feePct: number; feeAmount: number; netProceeds: number } {
  const safeQty = Math.max(1, Math.floor(quantity));
  const safePrice = Math.max(1, Math.floor(unitPrice));
  const gross = safePrice * safeQty;
  const feePct = calculateInvestmentFeePct(vipLevel);
  const feeAmount = Math.max(1, Math.floor((gross * feePct) / 100));
  return {
    gross,
    feePct,
    feeAmount,
    netProceeds: Math.max(1, gross - feeAmount),
  };
}

// ==================== P2P AUTO-VALUATION & CREDIT RATING ====================

const CREDIT_TIERS: CreditRating[] = ['AAA', 'AA', 'A', 'B', 'C'];

export function calculateP2PCompanyValuation(params: {
  level: number;
  wealthScore: number;
  recentOrders: number;
  plotCount: number;
  employeeCount: number;
  vehicleCount: number;
  lastActiveAt: number;
  nowMs?: number;
}): {
  sharePrice: number;
  creditRating: CreditRating;
  inactiveDays: number;
  inactivityPenalized: boolean;
} {
  const nowMs = params.nowMs ?? Date.now();
  const safeLevel = Math.max(1, Math.floor(params.level || 1));
  const safeWealth = Math.max(0, Number(params.wealthScore || 0));
  const safeOrders = Math.max(0, Math.floor(params.recentOrders || 0));
  const safePlots = Math.max(1, Math.floor(params.plotCount || 6));
  const safeEmployees = Math.max(0, Math.floor(params.employeeCount || 0));
  const safeVehicles = Math.max(0, Math.floor(params.vehicleCount || 0));

  const inactiveMs = Math.max(0, nowMs - (params.lastActiveAt || nowMs));
  const inactiveDays = Math.floor(inactiveMs / 86_400_000);
  const inactivityPenalized = inactiveDays > P2P_INACTIVITY_PENALTY_DAYS;

  // Deterministic anti-cheat share price formula from wealthScore, level & recentOrders
  const baseSharePrice = Math.max(
    50,
    Math.round(
      60 +
        safeLevel * 14 +
        Math.sqrt(safeWealth) * 1.15 +
        Math.min(500, safeOrders) * 4.5
    )
  );

  let sharePrice = baseSharePrice;
  if (inactiveDays > 14) {
    sharePrice = Math.max(30, Math.round(baseSharePrice * 0.45));
  } else if (inactiveDays > P2P_INACTIVITY_PENALTY_DAYS) {
    sharePrice = Math.max(40, Math.round(baseSharePrice * 0.65));
  }

  // Composite credit score (0..100+)
  const compositeScore =
    safeLevel * 1.5 +
    Math.min(40, Math.sqrt(safeWealth) / 22) +
    Math.min(25, safeOrders * 0.7) +
    safePlots * 0.8 +
    safeEmployees * 2.5 +
    safeVehicles * 3;

  let tierIdx = 4; // C
  if (compositeScore >= 82) tierIdx = 0; // AAA
  else if (compositeScore >= 60) tierIdx = 1; // AA
  else if (compositeScore >= 40) tierIdx = 2; // A
  else if (compositeScore >= 24) tierIdx = 3; // B

  // Downgrade credit rating if owner inactive > 7 days
  if (inactiveDays > 14) {
    tierIdx = Math.min(4, tierIdx + 2);
  } else if (inactiveDays > P2P_INACTIVITY_PENALTY_DAYS) {
    tierIdx = Math.min(4, tierIdx + 1);
  }

  return {
    sharePrice,
    creditRating: CREDIT_TIERS[tierIdx],
    inactiveDays,
    inactivityPenalized,
  };
}

export function buildP2PCompanyPayload(
  user: UserGameData,
  dividendRate: number,
  isListed: boolean,
  existing?: Partial<P2PCompanyDoc> | null,
  nowMs: number = Date.now()
): P2PCompanyDoc {
  const safeRate = Math.max(
    P2P_MIN_DIVIDEND_RATE,
    Math.min(P2P_MAX_DIVIDEND_RATE, Math.round(dividendRate))
  );
  const employeeCount = Object.values(user.employees ?? {}).reduce(
    (sum, lv) => sum + Math.max(0, Math.floor(lv || 0)),
    0
  );
  const plotCount = Math.max(1, user.farmPlots.length);
  const vehicleCount = (user.vehicles ?? []).length;
  const recentOrders = Math.max(0, user.stats?.totalOrdersDone || 0);

  const valuation = calculateP2PCompanyValuation({
    level: user.level,
    wealthScore: user.wealthScore,
    recentOrders,
    plotCount,
    employeeCount,
    vehicleCount,
    lastActiveAt: nowMs,
    nowMs,
  });

  return {
    ownerUid: user.uid,
    businessName: user.businessName.slice(0, 40) || 'Nông Trại DOPI',
    level: Math.floor(user.level),
    wealthScore: Math.round(user.wealthScore || 0),
    plotCount,
    employeeCount,
    vehicleCount,
    recentOrders,
    sharePrice: valuation.sharePrice,
    totalShares: P2P_TOTAL_SHARES,
    availableShares:
      existing?.availableShares !== undefined
        ? Math.max(0, Math.min(P2P_MAX_PUBLIC_SHARES, Math.floor(existing.availableShares)))
        : P2P_MAX_PUBLIC_SHARES,
    dividendRate: safeRate,
    dividendPool: Math.max(0, Math.round(existing?.dividendPool || 0)),
    creditRating: valuation.creditRating,
    lastActiveAt: nowMs,
    isListed,
  };
}

/**
 * Returns live effective share price and credit rating of a P2P company doc,
 * applying the >7 day inactivity penalty automatically on read as well.
 */
export function getEffectiveP2PCompanyState(
  company: P2PCompanyDoc,
  nowMs: number = Date.now()
): P2PCompanyDoc & { inactiveDays: number; inactivityPenalized: boolean } {
  const val = calculateP2PCompanyValuation({
    level: company.level,
    wealthScore: company.wealthScore,
    recentOrders: company.recentOrders,
    plotCount: company.plotCount,
    employeeCount: company.employeeCount,
    vehicleCount: company.vehicleCount,
    lastActiveAt: company.lastActiveAt,
    nowMs,
  });
  return {
    ...company,
    sharePrice: val.sharePrice,
    creditRating: val.creditRating,
    inactiveDays: val.inactiveDays,
    inactivityPenalized: val.inactivityPenalized,
  };
}

export function formatRelativeActiveTime(lastActiveAt: number, nowMs: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - lastActiveAt) / 1000));
  if (diffSec < 120) return 'Đang hoạt động';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Online ${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Online ${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `Vắng mặt ${diffDays} ngày`;
}

// ==================== PORTFOLIO & DIVIDEND CALCULATIONS ====================

export function calculateP2PShareholderDividend(
  company: P2PCompanyDoc | undefined,
  ownedShares: number
): number {
  if (!company || ownedShares <= 0 || company.dividendPool <= 0) return 0;
  // Proportional to the 400 public shares float so investors share the real dividendPool
  const raw = Math.floor((company.dividendPool * ownedShares) / P2P_MAX_PUBLIC_SHARES);
  if (raw > 0) return Math.min(company.dividendPool, raw);
  // If pool has small positive gold, allow at least 1 gold if pool >= 1
  return company.dividendPool >= 1 ? 1 : 0;
}

export interface ClaimableDividendBreakdown {
  canClaim: boolean;
  nextClaimAt: number;
  npcGoldDividend: number;
  npcCoinDividend: number;
  p2pGoldDividend: number;
  p2pBreakdown: { ownerUid: string; businessName: string; amount: number }[];
  totalGold: number;
  totalCoins: number;
}

export function calculateClaimableDividends(
  investments: UserInvestments,
  stockSnapshots: Record<StockCode, StockMarketSnapshot>,
  p2pCompanies: P2PCompanyDoc[],
  nowMs: number = Date.now()
): ClaimableDividendBreakdown {
  const nextClaimAt =
    investments.lastDividendClaimAt > 0
      ? investments.lastDividendClaimAt + DIVIDEND_CYCLE_MS
      : 0;
  const cooldownReady = nextClaimAt <= nowMs;

  let npcGoldDividend = 0;
  let npcCoinDividend = 0;

  for (const [code, holding] of Object.entries(investments.npcHoldings)) {
    if (!holding || holding.shares <= 0) continue;
    const snap = stockSnapshots[code as StockCode];
    if (!snap) continue;
    // 6 dividend cycles per day (every 4 hours) -> each cycle pays dailyDividendPct / 6
    const positionValue = snap.currentPrice * holding.shares;
    const cyclePayout = Math.max(
      1,
      Math.floor((positionValue * (snap.dividendDailyPct / 6)) / 100)
    );
    if (snap.def.currency === 'gold') {
      npcGoldDividend += cyclePayout;
    } else {
      npcCoinDividend += cyclePayout;
    }
  }

  let p2pGoldDividend = 0;
  const p2pBreakdown: { ownerUid: string; businessName: string; amount: number }[] = [];
  const compMap = new Map(p2pCompanies.map((c) => [c.ownerUid, c]));

  for (const [ownerUid, holding] of Object.entries(investments.p2pHoldings)) {
    if (!holding || holding.shares <= 0) continue;
    const company = compMap.get(ownerUid);
    const payout = calculateP2PShareholderDividend(company, holding.shares);
    if (payout > 0) {
      p2pGoldDividend += payout;
      p2pBreakdown.push({
        ownerUid,
        businessName: company?.businessName || holding.businessName,
        amount: payout,
      });
    }
  }

  const totalGold = npcGoldDividend + p2pGoldDividend;
  const totalCoins = npcCoinDividend;

  return {
    canClaim: cooldownReady && (totalGold > 0 || totalCoins > 0),
    nextClaimAt,
    npcGoldDividend,
    npcCoinDividend,
    p2pGoldDividend,
    p2pBreakdown,
    totalGold,
    totalCoins,
  };
}

export interface PortfolioSummary {
  goldValue: number;
  goldCost: number;
  goldPnl: number;
  goldPnlPct: number;
  coinValue: number;
  coinCost: number;
  coinPnl: number;
  coinPnlPct: number;
  totalPositions: number;
}

export function calculatePortfolioSummary(
  investments: UserInvestments,
  stockSnapshots: Record<StockCode, StockMarketSnapshot>,
  p2pCompanies: P2PCompanyDoc[],
  nowMs: number = Date.now()
): PortfolioSummary {
  let goldValue = 0;
  let goldCost = 0;
  let coinValue = 0;
  let coinCost = 0;
  let totalPositions = 0;

  for (const [code, holding] of Object.entries(investments.npcHoldings)) {
    if (!holding || holding.shares <= 0) continue;
    const snap = stockSnapshots[code as StockCode];
    if (!snap) continue;
    totalPositions += 1;
    const value = snap.currentPrice * holding.shares;
    const cost = Math.round(holding.avgBuyPrice * holding.shares);
    if (snap.def.currency === 'gold') {
      goldValue += value;
      goldCost += cost;
    } else {
      coinValue += value;
      coinCost += cost;
    }
  }

  const compMap = new Map(p2pCompanies.map((c) => [c.ownerUid, c]));
  for (const [ownerUid, holding] of Object.entries(investments.p2pHoldings)) {
    if (!holding || holding.shares <= 0) continue;
    totalPositions += 1;
    const comp = compMap.get(ownerUid);
    const livePrice = comp
      ? getEffectiveP2PCompanyState(comp, nowMs).sharePrice
      : holding.avgBuyPrice;
    goldValue += livePrice * holding.shares;
    goldCost += Math.round(holding.avgBuyPrice * holding.shares);
  }

  const goldPnl = goldValue - goldCost;
  const goldPnlPct =
    goldCost > 0 ? Number(((goldPnl / goldCost) * 100).toFixed(2)) : 0;
  const coinPnl = coinValue - coinCost;
  const coinPnlPct =
    coinCost > 0 ? Number(((coinPnl / coinCost) * 100).toFixed(2)) : 0;

  return {
    goldValue,
    goldCost,
    goldPnl,
    goldPnlPct,
    coinValue,
    coinCost,
    coinPnl,
    coinPnlPct,
    totalPositions,
  };
}
