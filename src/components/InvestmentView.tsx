import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Eye,
  Landmark,
  Lock,
  Newspaper,
  Search,
  TrendingUp,
  Unlock,
  Wallet,
} from 'lucide-react';
import { formatNumber, formatTimeRemaining } from '../game/economy';
import {
  buildP2PCompanyPayload,
  calculateBuyTrade,
  calculateClaimableDividends,
  calculateInvestmentFeePct,
  calculatePortfolioSummary,
  calculateSellTrade,
  formatRelativeActiveTime,
  getAllStockSnapshots,
  getEffectiveP2PCompanyState,
  getMarketSessionIndex,
  getMarketTickerHeadlines,
  normalizeUserInvestments,
  P2P_MAX_DIVIDEND_RATE,
  P2P_MAX_PUBLIC_SHARES,
  P2P_MIN_DIVIDEND_RATE,
  P2P_MIN_IPO_LEVEL,
  P2P_TOTAL_SHARES,
} from '../game/investment';
import type {
  CreditRating,
  P2PCompanyDoc,
  PublicFarmData,
  StockCode,
  StockMarketSnapshot,
  StockRiskLevel,
  UserGameData,
} from '../game/types';
import { FarmVisitModal } from './FarmVisitModal';
import { InvestmentGlossaryModal } from './InvestmentGlossaryModal';
import { MiniSparkline, StockPriceChart } from './StockPriceChart';

type InvestSubTab = 'stocks' | 'p2p' | 'portfolio';

interface InvestmentViewProps {
  user: UserGameData;
  nowMs: number;
  p2pCompanies: P2PCompanyDoc[];
  myP2PCompany: P2PCompanyDoc | null;
  onBuyNpcStock: (code: StockCode, quantity: number) => Promise<void>;
  onSellNpcStock: (code: StockCode, quantity: number) => Promise<void>;
  onToggleMyIpo: (dividendRate: number, isListed: boolean) => Promise<void>;
  onBuyP2PShares: (ownerUid: string, quantity: number) => Promise<void>;
  onSellP2PShares: (ownerUid: string, quantity: number) => Promise<void>;
  onClaimDividends: () => Promise<void>;
  onVisitCompanyFarm: (ownerUid: string) => Promise<PublicFarmData | null>;
  onWaterFriendPlot: (
    friendUid: string,
    plotId: number
  ) => Promise<PublicFarmData | null>;
}

const RISK_LABEL: Record<StockRiskLevel, { text: string; colorClass: string }> = {
  low: { text: 'Thấp', colorClass: 'text-emerald-700' },
  medium: { text: 'Trung bình', colorClass: 'text-amber-700' },
  high: { text: 'Cao', colorClass: 'text-orange-700' },
  very_high: { text: 'Rất cao', colorClass: 'text-rose-700' },
};

const CREDIT_STYLE: Record<CreditRating, string> = {
  AAA: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  AA: 'text-teal-700 bg-teal-50 border-teal-200',
  A: 'text-sky-700 bg-sky-50 border-sky-200',
  B: 'text-amber-700 bg-amber-50 border-amber-200',
  C: 'text-rose-700 bg-rose-50 border-rose-200',
};

export const InvestmentView: React.FC<InvestmentViewProps> = ({
  user,
  nowMs,
  p2pCompanies,
  myP2PCompany,
  onBuyNpcStock,
  onSellNpcStock,
  onToggleMyIpo,
  onBuyP2PShares,
  onSellP2PShares,
  onClaimDividends,
  onVisitCompanyFarm,
  onWaterFriendPlot,
}) => {
  const [subTab, setSubTab] = useState<InvestSubTab>('stocks');
  const [selectedCode, setSelectedCode] = useState<StockCode>('DAGR');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [tradeQty, setTradeQty] = useState<number>(5);
  const [submittingTrade, setSubmittingTrade] = useState(false);

  const [tickerIdx, setTickerIdx] = useState(0);
  const [showGlossary, setShowGlossary] = useState(false);

  // P2P IPO & Filter State
  const [ipoDividendRate, setIpoDividendRate] = useState<number>(
    myP2PCompany?.dividendRate ?? 7
  );
  const [savingIpo, setSavingIpo] = useState(false);
  const [p2pSearch, setP2pSearch] = useState('');
  const [creditFilter, setCreditFilter] = useState<'ALL' | CreditRating>('ALL');
  const [p2pBuyQtys, setP2pBuyQtys] = useState<Record<string, number>>({});
  const [busyP2PUid, setBusyP2PUid] = useState<string | null>(null);
  const [visitingFarm, setVisitingFarm] = useState<PublicFarmData | null>(null);
  const [loadingVisitUid, setLoadingVisitUid] = useState<string | null>(null);

  // Portfolio Quick Sell & Dividend State
  const [claimingDividend, setClaimingDividend] = useState(false);
  const [sellingKey, setSellingKey] = useState<string | null>(null);

  const sessionKey = getMarketSessionIndex(nowMs);
  const allSnapshots = useMemo(
    () => getAllStockSnapshots(sessionKey * 15 * 60_000 + 1000),
    [sessionKey]
  );

  const snapshotMap = useMemo(() => {
    return allSnapshots.reduce(
      (acc, snap) => {
        acc[snap.def.code] = snap;
        return acc;
      },
      {} as Record<StockCode, StockMarketSnapshot>
    );
  }, [allSnapshots]);

  const tickerItems = useMemo(
    () => getMarketTickerHeadlines(sessionKey * 15 * 60_000 + 1000),
    [sessionKey]
  );

  const activeTicker = tickerItems[tickerIdx % tickerItems.length];
  const selectedStock = snapshotMap[selectedCode] ?? allSnapshots[0];
  const nextSessionInMs = Math.max(0, selectedStock.nextSessionAt - nowMs);

  const investments = useMemo(
    () => normalizeUserInvestments(user.investments),
    [user.investments]
  );

  const feePct = calculateInvestmentFeePct(user.vipLevel);

  const effectiveP2PCompanies = useMemo(() => {
    return p2pCompanies.map((c) => getEffectiveP2PCompanyState(c, nowMs));
  }, [p2pCompanies, nowMs]);

  const filteredP2PCompanies = useMemo(() => {
    const q = p2pSearch.trim().toLowerCase();
    return effectiveP2PCompanies.filter((comp) => {
      if (creditFilter !== 'ALL' && comp.creditRating !== creditFilter) {
        return false;
      }
      if (q && !comp.businessName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [effectiveP2PCompanies, p2pSearch, creditFilter]);

  const myIpoPreview = useMemo(
    () =>
      buildP2PCompanyPayload(
        user,
        ipoDividendRate,
        myP2PCompany?.isListed ?? true,
        myP2PCompany,
        nowMs
      ),
    [user, ipoDividendRate, myP2PCompany, nowMs]
  );

  const portfolioSummary = useMemo(
    () => calculatePortfolioSummary(investments, snapshotMap, p2pCompanies, nowMs),
    [investments, snapshotMap, p2pCompanies, nowMs]
  );

  const dividendInfo = useMemo(
    () => calculateClaimableDividends(investments, snapshotMap, p2pCompanies, nowMs),
    [investments, snapshotMap, p2pCompanies, nowMs]
  );

  // Selected NPC stock trade math
  const selectedHolding = investments.npcHoldings[selectedStock.def.code];
  const ownedSelectedShares = selectedHolding?.shares || 0;
  const selectedLockedMs = Math.max(
    0,
    (selectedHolding?.lockedUntil || 0) - nowMs
  );
  const isCoinStock = selectedStock.def.currency === 'coins';
  const unitCurrencyLabel = isCoinStock ? 'Xu DOPI' : 'Vàng';

  const safeTradeQty = Math.max(1, Math.floor(tradeQty || 1));
  const buyPreview = calculateBuyTrade(
    selectedStock.currentPrice,
    safeTradeQty,
    user.vipLevel
  );
  const sellPreview = calculateSellTrade(
    selectedStock.currentPrice,
    Math.min(Math.max(1, ownedSelectedShares), safeTradeQty),
    user.vipLevel
  );

  const maxAffordableQty = useMemo(() => {
    const balance = isCoinStock ? user.dopiCoins : user.gold;
    const approxUnitWithFee = selectedStock.currentPrice * (1 + feePct / 100);
    if (approxUnitWithFee <= 0) return 0;
    let qty = Math.floor(balance / approxUnitWithFee);
    while (
      qty > 0 &&
      calculateBuyTrade(selectedStock.currentPrice, qty, user.vipLevel).totalCost >
        balance
    ) {
      qty -= 1;
    }
    return Math.min(999, Math.max(0, qty));
  }, [isCoinStock, user.dopiCoins, user.gold, selectedStock.currentPrice, feePct, user.vipLevel]);

  const canSubmitNpcTrade =
    tradeMode === 'buy'
      ? (isCoinStock ? user.dopiCoins : user.gold) >= buyPreview.totalCost
      : ownedSelectedShares >= safeTradeQty && selectedLockedMs === 0;

  const handleSubmitNpcTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitNpcTrade || submittingTrade) return;
    setSubmittingTrade(true);
    try {
      if (tradeMode === 'buy') {
        await onBuyNpcStock(selectedStock.def.code, safeTradeQty);
      } else {
        await onSellNpcStock(selectedStock.def.code, safeTradeQty);
      }
    } finally {
      setSubmittingTrade(false);
    }
  };

  const handleOpenVisitFarm = async (ownerUid: string) => {
    setLoadingVisitUid(ownerUid);
    try {
      const farm = await onVisitCompanyFarm(ownerUid);
      if (farm) {
        setVisitingFarm(farm);
      }
    } finally {
      setLoadingVisitUid(null);
    }
  };

  const handleQuickSellNpc = async (code: StockCode, qty: number) => {
    setSellingKey(`npc_${code}`);
    try {
      await onSellNpcStock(code, qty);
    } finally {
      setSellingKey(null);
    }
  };

  const handleQuickSellP2P = async (ownerUid: string, qty: number) => {
    setSellingKey(`p2p_${ownerUid}`);
    try {
      await onSellP2PShares(ownerUid, qty);
    } finally {
      setSellingKey(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Market Ticker Strip + Glossary Trigger */}
      <section
        aria-label="Bản tin kinh tế DOPI"
        className="rounded-2xl bg-white border border-[#DCE7D3] px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 whitespace-nowrap shrink-0">
            <Newspaper className="w-4 h-4 text-emerald-600" />
            <span>Bản Tin Kinh Tế DOPI</span>
          </div>

          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            |
          </span>

          {activeTicker && (
            <button
              type="button"
              onClick={() => {
                setSelectedCode(activeTicker.code);
                setSubTab('stocks');
              }}
              className="text-left text-xs sm:text-sm text-slate-700 hover:text-emerald-800 transition-colors line-clamp-2 sm:line-clamp-none sm:truncate cursor-pointer flex-1 min-w-0"
              title={`${activeTicker.headline} — ${activeTicker.summary}`}
            >
              <span className="font-mono-num font-bold text-slate-900 mr-1.5">
                [{activeTicker.code}]
              </span>
              <span
                className={`font-semibold mr-1.5 ${
                  activeTicker.impact === 'positive'
                    ? 'text-emerald-700'
                    : activeTicker.impact === 'negative'
                      ? 'text-rose-700'
                      : 'text-slate-600'
                }`}
              >
                {activeTicker.impact === 'positive'
                  ? '▲'
                  : activeTicker.impact === 'negative'
                    ? '▼'
                    : '•'}
              </span>
              <span>{activeTicker.headline}</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setTickerIdx(
                  (prev) => (prev - 1 + tickerItems.length) % tickerItems.length
                )
              }
              aria-label="Tin kinh tế trước"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono-num text-slate-500 px-1">
              {(tickerIdx % tickerItems.length) + 1}/{tickerItems.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setTickerIdx((prev) => (prev + 1) % tickerItems.length)
              }
              aria-label="Tin kinh tế tiếp theo"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-xs text-slate-500 font-mono-num whitespace-nowrap hidden sm:inline">
            Phiên mới: {formatTimeRemaining(nextSessionInMs)}
          </span>

          <button
            type="button"
            onClick={() => setShowGlossary(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Giải thích chỉ số</span>
          </button>
        </div>
      </section>

      {/* 2. Header Row + Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Trung Tâm Đầu Tư DOPI
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Phí sàn hiện tại của bạn:{' '}
            <strong className="font-mono-num text-emerald-700">{feePct}%</strong>{' '}
            (VIP {user.vipLevel}) · Khóa lệnh T+30 phút sau khi mua
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Phân khu đầu tư"
          className="flex items-center gap-1 p-1 rounded-2xl bg-[#EAF2E4] border border-[#DCE7D3] w-full sm:w-auto max-w-full overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'stocks'}
            onClick={() => setSubTab('stocks')}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              subTab === 'stocks'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Thị Trường DOPI</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'p2p'}
            onClick={() => setSubTab('p2p')}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              subTab === 'p2p'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Doanh Nghiệp P2P</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'portfolio'}
            onClick={() => setSubTab('portfolio')}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              subTab === 'portfolio'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Danh Mục & Cổ Tức</span>
            {dividendInfo.canClaim && (
              <span className="font-mono-num text-[11px] font-bold px-1.5 rounded-md bg-emerald-600 text-white">
                Nhận
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: DEFAULT STOCK MARKET ==================== */}
      {subTab === 'stocks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: 6-Stock Market Watchlist */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#DCE7D3] overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Bảng Giá 6 Mã Cổ Phiếu DOPI
              </h3>
              <span className="text-xs text-slate-500 font-mono-num whitespace-nowrap shrink-0">
                Đồng bộ 15p/phiên
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {allSnapshots.map((snap) => {
                const active = snap.def.code === selectedStock.def.code;
                const up = snap.changePct >= 0;
                const held = investments.npcHoldings[snap.def.code]?.shares || 0;
                const coinCurrency = snap.def.currency === 'coins';

                return (
                  <button
                    key={snap.def.code}
                    type="button"
                    onClick={() => {
                      setSelectedCode(snap.def.code);
                      setTradeQty(1);
                    }}
                    className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#EEF7E7]'
                        : 'bg-white hover:bg-[#FAFDF8]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-2xl bg-[#F4FAF0] border border-[#DCE7D3] flex items-center justify-center text-xl shrink-0">
                        {snap.def.emoji}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-num font-bold text-sm text-slate-900">
                            {snap.def.code}
                          </span>
                          <span className="text-xs text-slate-500">
                            {coinCurrency ? '💎 Xu DOPI' : 'Vàng'}
                          </span>
                          {held > 0 && (
                            <span className="text-xs font-mono-num font-semibold text-emerald-700">
                              · Giữ {held}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          {snap.def.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Rủi ro:{' '}
                          <span className={RISK_LABEL[snap.def.risk].colorClass}>
                            {RISK_LABEL[snap.def.risk].text}
                          </span>
                          {' · '}Cổ tức {snap.dividendDailyPct}%/ngày
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:block">
                        <MiniSparkline history={snap.history} />
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-mono-num font-bold text-sm ${
                            coinCurrency ? 'text-violet-700' : 'text-slate-900'
                          }`}
                        >
                          {formatNumber(snap.currentPrice)}
                        </div>
                        <div
                          className={`inline-flex items-center justify-end gap-0.5 text-xs font-mono-num font-semibold ${
                            up ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {up ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {up ? '+' : ''}
                            {snap.changePct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Detailed Stock Analysis, SVG Chart & Order Panel */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#DCE7D3] p-5 sm:p-6 space-y-5">
            {/* Stock Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-2xl bg-[#F4FAF0] border border-[#DCE7D3] flex items-center justify-center text-2xl shrink-0">
                  {selectedStock.def.emoji}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                      {selectedStock.def.code} — {selectedStock.def.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-1">
                    <span>{selectedStock.def.sector}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Rủi ro:{' '}
                      <strong className={RISK_LABEL[selectedStock.def.risk].colorClass}>
                        {RISK_LABEL[selectedStock.def.risk].text}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Giao dịch bằng{' '}
                      <strong className={isCoinStock ? 'text-violet-700' : 'text-amber-700'}>
                        {unitCurrencyLabel}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div
                  className={`text-2xl font-bold font-mono-num ${
                    isCoinStock ? 'text-violet-700' : 'text-slate-900'
                  }`}
                >
                  {formatNumber(selectedStock.currentPrice)}{' '}
                  <span className="text-xs font-semibold text-slate-500">
                    {unitCurrencyLabel}
                  </span>
                </div>
                <div
                  className={`inline-flex items-center gap-1 text-xs font-mono-num font-semibold mt-0.5 ${
                    selectedStock.changePct >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {selectedStock.changePct >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span>
                    {selectedStock.changePct >= 0 ? '+' : ''}
                    {selectedStock.changePct.toFixed(2)}% so với phiên trước
                  </span>
                </div>
              </div>
            </div>

            {/* 24-Session Pure SVG Price Chart */}
            <StockPriceChart
              history={selectedStock.history}
              currency={selectedStock.def.currency}
              stockCode={selectedStock.def.code}
            />

            {/* Business Fundamentals Strip (4 KPIs) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="rounded-2xl bg-[#FAFDF8] border border-slate-100 px-3.5 py-2.5">
                <div className="text-[11px] text-slate-500">Chỉ số P/E</div>
                <div className="font-mono-num font-bold text-base text-slate-900 mt-0.5">
                  {selectedStock.peRatio.toFixed(1)}x
                </div>
              </div>
              <div className="rounded-2xl bg-[#FAFDF8] border border-slate-100 px-3.5 py-2.5">
                <div className="text-[11px] text-slate-500">Doanh thu kỳ gần nhất</div>
                <div className="font-mono-num font-bold text-base text-slate-900 mt-0.5">
                  {formatNumber(selectedStock.latestRevenue)}V
                </div>
              </div>
              <div className="rounded-2xl bg-[#FAFDF8] border border-slate-100 px-3.5 py-2.5">
                <div className="text-[11px] text-slate-500">Biên lợi nhuận</div>
                <div className="font-mono-num font-bold text-base text-emerald-700 mt-0.5">
                  {selectedStock.profitMarginPct.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-2xl bg-[#FAFDF8] border border-slate-100 px-3.5 py-2.5">
                <div className="text-[11px] text-slate-500">Tỷ suất cổ tức</div>
                <div className="font-mono-num font-bold text-base text-amber-700 mt-0.5">
                  {selectedStock.dividendDailyPct}% / ngày
                </div>
              </div>
            </div>

            {/* Latest Sector News */}
            <div className="rounded-2xl bg-[#F4FAF0] border border-[#DCE7D3] p-4 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Newspaper className="w-4 h-4 text-emerald-700" />
                  Tin tức ngành mới nhất
                </span>
                <span
                  className={`font-semibold ${
                    selectedStock.news.impact === 'positive'
                      ? 'text-emerald-700'
                      : selectedStock.news.impact === 'negative'
                        ? 'text-rose-700'
                        : 'text-slate-600'
                  }`}
                >
                  {selectedStock.news.impactHint}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedStock.news.headline}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedStock.news.summary}
              </p>
            </div>

            {/* Order Desk: Buy / Sell */}
            <form
              onSubmit={handleSubmitNpcTrade}
              className="border-t border-slate-100 pt-4 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setTradeMode('buy')}
                    className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      tradeMode === 'buy'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mua {selectedStock.def.code}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeMode('sell')}
                    className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      tradeMode === 'sell'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bán {selectedStock.def.code}
                  </button>
                </div>

                <div className="text-xs text-slate-600 font-mono-num">
                  Đang nắm giữ:{' '}
                  <strong className="text-slate-900">{ownedSelectedShares} CP</strong>
                  {ownedSelectedShares > 0 && selectedLockedMs > 0 && (
                    <span className="text-amber-700 ml-2 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Khóa {formatTimeRemaining(selectedLockedMs)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5 space-y-1.5">
                  <label
                    htmlFor="npc-stock-qty"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Số lượng cổ phiếu
                  </label>
                  <input
                    id="npc-stock-qty"
                    type="number"
                    min={1}
                    max={tradeMode === 'sell' ? Math.max(1, ownedSelectedShares) : 999}
                    value={tradeQty}
                    onChange={(e) =>
                      setTradeQty(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#FAFDF8] font-mono-num text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="sm:col-span-7 flex flex-wrap items-center gap-1.5">
                  {[1, 5, 10, 25].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTradeQty(preset)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono-num font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {preset} CP
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setTradeQty(
                        Math.max(
                          1,
                          tradeMode === 'buy'
                            ? maxAffordableQty
                            : ownedSelectedShares
                        )
                      )
                    }
                    className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    Tối đa
                  </button>
                </div>
              </div>

              {/* Fee & Lock-Up Breakdown */}
              <div className="rounded-2xl bg-[#FAFDF8] border border-slate-200/80 px-4 py-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span>
                    Giá trị lệnh ({safeTradeQty} ×{' '}
                    {formatNumber(selectedStock.currentPrice)} {unitCurrencyLabel})
                  </span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {formatNumber(
                      tradeMode === 'buy' ? buyPreview.gross : sellPreview.gross
                    )}{' '}
                    {unitCurrencyLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>
                    Phí giao dịch sàn ({feePct}% · ưu đãi VIP {user.vipLevel})
                  </span>
                  <span className="font-mono-num font-semibold text-amber-700">
                    {tradeMode === 'buy' ? '+' : '-'}
                    {formatNumber(
                      tradeMode === 'buy'
                        ? buyPreview.feeAmount
                        : sellPreview.feeAmount
                    )}{' '}
                    {unitCurrencyLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70 text-sm font-bold text-slate-900">
                  <span>
                    {tradeMode === 'buy'
                      ? 'Tổng thanh toán'
                      : 'Thực nhận sau phí'}
                  </span>
                  <span
                    className={`font-mono-num ${
                      isCoinStock ? 'text-violet-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatNumber(
                      tradeMode === 'buy'
                        ? buyPreview.totalCost
                        : sellPreview.netProceeds
                    )}{' '}
                    {unitCurrencyLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {tradeMode === 'buy'
                    ? 'Cổ phiếu mua mới sẽ khóa lệnh T+30 phút để chống spam.'
                    : selectedLockedMs > 0
                      ? `Đang khóa T+30p (còn ${formatTimeRemaining(selectedLockedMs)}).`
                      : 'Cổ phiếu đã mở khóa, sẵn sàng khớp lệnh bán ngay.'}
                </span>

                <button
                  type="submit"
                  disabled={!canSubmitNpcTrade || submittingTrade}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed ${
                    tradeMode === 'buy'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingTrade
                    ? 'Đang khớp lệnh...'
                    : tradeMode === 'buy'
                      ? `Mua ${safeTradeQty} ${selectedStock.def.code}`
                      : `Bán ${safeTradeQty} ${selectedStock.def.code}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: P2P COMPANY EXCHANGE & IPO ==================== */}
      {subTab === 'p2p' && (
        <div className="space-y-5">
          {/* Owner IPO Management Card */}
          <section className="bg-white rounded-3xl border border-[#DCE7D3] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-700" />
                  Gọi Vốn / Niêm Yết Doanh Nghiệp Của Bạn (IPO)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Bán tối đa 400 / 1.000 cổ phần (40%) để huy động Vàng mở rộng nông trại. Giá cổ phần được hệ thống tự động định giá chống gian lận.
                </p>
              </div>

              {myP2PCompany?.isListed && (
                <span className="text-xs font-bold text-emerald-700">
                  ● Đang niêm yết trên sàn P2P
                </span>
              )}
            </div>

            {user.level < P2P_MIN_IPO_LEVEL ? (
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-amber-950 space-y-1">
                  <p className="font-bold">
                    Yêu cầu đạt Level {P2P_MIN_IPO_LEVEL} để mở khóa Niêm Yết IPO (hiện tại: Lv.{user.level})
                  </p>
                  <p className="text-amber-800">
                    Trong lúc cày cấp, bạn vẫn có thể đầu tư mua cổ phần các nông trại uy tín ở danh sách bên dưới để hưởng cổ tức thực từ đơn hàng NPC của họ.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-[#FAFDF8] border border-slate-100 p-3">
                    <div className="text-[11px] text-slate-500">Định giá tự động</div>
                    <div className="font-mono-num font-bold text-base text-slate-900 mt-0.5">
                      {formatNumber(myIpoPreview.sharePrice)}V
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#FAFDF8] border border-slate-100 p-3">
                    <div className="text-[11px] text-slate-500">Tín nhiệm</div>
                    <div className="font-mono-num font-bold text-base text-emerald-700 mt-0.5">
                      Hạng {myIpoPreview.creditRating}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#FAFDF8] border border-slate-100 p-3">
                    <div className="text-[11px] text-slate-500">Cổ phần đã bán</div>
                    <div className="font-mono-num font-bold text-base text-slate-900 mt-0.5">
                      {P2P_MAX_PUBLIC_SHARES - myIpoPreview.availableShares}/
                      {P2P_MAX_PUBLIC_SHARES}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#FAFDF8] border border-slate-100 p-3">
                    <div className="text-[11px] text-slate-500">Quỹ cổ tức</div>
                    <div className="font-mono-num font-bold text-base text-amber-700 mt-0.5">
                      {formatNumber(myIpoPreview.dividendPool)}V
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-4">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="ipo-dividend-slider"
                      className="font-semibold text-slate-700"
                    >
                      Cam kết chia cổ tức (đơn NPC):
                    </label>
                    <span className="font-mono-num font-bold text-emerald-700 text-sm">
                      {ipoDividendRate}% doanh thu
                    </span>
                  </div>
                  <input
                    id="ipo-dividend-slider"
                    type="range"
                    min={P2P_MIN_DIVIDEND_RATE}
                    max={P2P_MAX_DIVIDEND_RATE}
                    step={1}
                    value={ipoDividendRate}
                    onChange={(e) => setIpoDividendRate(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={savingIpo}
                      onClick={async () => {
                        setSavingIpo(true);
                        try {
                          await onToggleMyIpo(ipoDividendRate, true);
                        } finally {
                          setSavingIpo(false);
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                    >
                      {myP2PCompany?.isListed
                        ? 'Cập nhật hồ sơ IPO'
                        : 'Niêm yết doanh nghiệp (IPO)'}
                    </button>

                    {myP2PCompany?.isListed && (
                      <button
                        type="button"
                        disabled={savingIpo}
                        onClick={async () => {
                          setSavingIpo(true);
                          try {
                            await onToggleMyIpo(ipoDividendRate, false);
                          } finally {
                            setSavingIpo(false);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                      >
                        Tạm ngừng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Filter Bar for P2P Market */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={p2pSearch}
                onChange={(e) => setP2pSearch(e.target.value)}
                placeholder="Tìm tên doanh nghiệp niêm yết..."
                aria-label="Tìm tên doanh nghiệp P2P"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#DCE7D3] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-[#DCE7D3] overflow-x-auto">
              {(['ALL', 'AAA', 'AA', 'A', 'B', 'C'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setCreditFilter(tier)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    creditFilter === tier
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tier === 'ALL' ? 'Tất cả' : `Hạng ${tier}`}
                </button>
              ))}
            </div>
          </div>

          {/* Listed P2P Companies Grid */}
          {filteredP2PCompanies.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#DCE7D3] p-10 text-center space-y-2">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Chưa tìm thấy doanh nghiệp niêm yết phù hợp
              </p>
              <p className="text-xs text-slate-500">
                Hãy thử đổi bộ lọc hạng tín nhiệm hoặc niêm yết chính doanh nghiệp của bạn ở khung trên.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredP2PCompanies.map((comp) => {
                const isMine = comp.ownerUid === user.uid;
                const qty = Math.max(1, p2pBuyQtys[comp.ownerUid] ?? 5);
                const trade = calculateBuyTrade(
                  comp.sharePrice,
                  qty,
                  user.vipLevel
                );
                const ownedByMe =
                  investments.p2pHoldings[comp.ownerUid]?.shares || 0;
                const soldShares = P2P_MAX_PUBLIC_SHARES - comp.availableShares;
                const canBuy =
                  !isMine &&
                  comp.availableShares >= qty &&
                  user.gold >= trade.totalCost;

                return (
                  <article
                    key={comp.ownerUid}
                    className="bg-white rounded-3xl border border-[#DCE7D3] p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-900 truncate">
                              {comp.businessName}
                            </h4>
                            {isMine && (
                              <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                                (Của bạn)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono-num">Lv.{comp.level}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                comp.inactivityPenalized
                                  ? 'text-rose-600 font-semibold'
                                  : 'text-emerald-700'
                              }
                            >
                              {formatRelativeActiveTime(comp.lastActiveAt, nowMs)}
                            </span>
                            {ownedByMe > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono-num font-semibold text-emerald-800">
                                  Đang giữ {ownedByMe} CP
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div
                          className={`px-2.5 py-1 rounded-xl border text-xs font-mono-num font-bold shrink-0 ${
                            CREDIT_STYLE[comp.creditRating]
                          }`}
                        >
                          Tín nhiệm {comp.creditRating}
                        </div>
                      </div>

                      {comp.inactivityPenalized && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>
                            Chủ nông trại vắng mặt trên 7 ngày: hệ thống đã tự động giảm định giá & hạ bậc tín nhiệm.
                          </span>
                        </div>
                      )}

                      {/* Farm Scale & Business Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="rounded-xl bg-[#FAFDF8] border border-slate-100 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Quy mô</div>
                          <div className="font-mono-num font-bold text-slate-900 mt-0.5">
                            {comp.plotCount} đất · {comp.employeeCount} NV · {comp.vehicleCount} xe
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#FAFDF8] border border-slate-100 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Tài Phú</div>
                          <div className="font-mono-num font-bold text-emerald-700 mt-0.5">
                            {formatNumber(comp.wealthScore)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#FAFDF8] border border-slate-100 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Đơn NPC gần đây</div>
                          <div className="font-mono-num font-bold text-slate-900 mt-0.5">
                            {formatNumber(comp.recentOrders)} đơn
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#FAFDF8] border border-slate-100 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Cổ tức cam kết</div>
                          <div className="font-mono-num font-bold text-amber-700 mt-0.5">
                            {comp.dividendRate}% · Quỹ {formatNumber(comp.dividendPool)}V
                          </div>
                        </div>
                      </div>

                      {/* Share Price & Availability */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div>
                          <span className="text-slate-500">Giá cổ phần: </span>
                          <strong className="font-mono-num text-base text-slate-900">
                            {formatNumber(comp.sharePrice)} Vàng
                          </strong>
                        </div>
                        <div className="font-mono-num text-slate-600">
                          Còn mở bán:{' '}
                          <strong className="text-slate-900">
                            {comp.availableShares}
                          </strong>{' '}
                          / {P2P_MAX_PUBLIC_SHARES} CP (Đã gọi vốn {soldShares}/{P2P_TOTAL_SHARES})
                        </div>
                      </div>
                    </div>

                    {/* Actions: Visit Farm + Buy Shares */}
                    <div className="border-t border-slate-100 pt-3.5 flex flex-wrap items-center justify-between gap-2.5">
                      <button
                        type="button"
                        disabled={loadingVisitUid === comp.ownerUid}
                        onClick={() => handleOpenVisitFarm(comp.ownerUid)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {loadingVisitUid === comp.ownerUid
                            ? 'Đang mở...'
                            : 'Ghé thăm nông trại'}
                        </span>
                      </button>

                      {!isMine && (
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, comp.availableShares)}
                            value={qty}
                            aria-label={`Số cổ phần muốn mua của ${comp.businessName}`}
                            onChange={(e) =>
                              setP2pBuyQtys((prev) => ({
                                ...prev,
                                [comp.ownerUid]: Math.max(
                                  1,
                                  Math.min(
                                    Math.max(1, comp.availableShares),
                                    Number(e.target.value) || 1
                                  )
                                ),
                              }))
                            }
                            className="w-16 px-2.5 py-2 rounded-xl border border-slate-200 bg-[#FAFDF8] font-mono-num text-xs font-bold text-center"
                          />
                          <button
                            type="button"
                            disabled={!canBuy || busyP2PUid === comp.ownerUid}
                            onClick={async () => {
                              setBusyP2PUid(comp.ownerUid);
                              try {
                                await onBuyP2PShares(comp.ownerUid, qty);
                              } finally {
                                setBusyP2PUid(null);
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                            title={`Gồm ${formatNumber(trade.gross)}V vốn + ${formatNumber(trade.feeAmount)}V phí sàn (${trade.feePct}%)`}
                          >
                            {busyP2PUid === comp.ownerUid
                              ? 'Đang giao dịch...'
                              : comp.availableShares === 0
                                ? 'Hết cổ phần'
                                : `Mua (${formatNumber(trade.totalCost)}V)`}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 3: MY PORTFOLIO & DIVIDENDS ==================== */}
      {subTab === 'portfolio' && (
        <div className="space-y-5">
          {/* Top Overview KPI Strip + Dividend Claim Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#DCE7D3] p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Tổng giá trị danh mục</div>
                <div className="font-mono-num font-bold text-xl text-slate-900">
                  {formatNumber(portfolioSummary.goldValue)}{' '}
                  <span className="text-xs text-amber-700">Vàng</span>
                </div>
                {portfolioSummary.coinValue > 0 && (
                  <div className="font-mono-num font-bold text-sm text-violet-700">
                    + {formatNumber(portfolioSummary.coinValue)} Xu DOPI
                  </div>
                )}
                <div className="text-[11px] text-slate-500">
                  {portfolioSummary.totalPositions} mã đang nắm giữ
                </div>
              </div>

              <div className="space-y-1 sm:border-l sm:border-slate-100 sm:pl-4">
                <div className="text-xs text-slate-500">Lãi / Lỗ tạm tính (PnL)</div>
                <div
                  className={`font-mono-num font-bold text-xl ${
                    portfolioSummary.goldPnl >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {portfolioSummary.goldPnl >= 0 ? '+' : ''}
                  {formatNumber(portfolioSummary.goldPnl)}V
                </div>
                <div
                  className={`font-mono-num text-xs font-semibold ${
                    portfolioSummary.goldPnl >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {portfolioSummary.goldPnlPct >= 0 ? '+' : ''}
                  {portfolioSummary.goldPnlPct.toFixed(2)}%
                  {portfolioSummary.coinCost > 0 && (
                    <span className="ml-2 text-violet-700">
                      · LUXD: {portfolioSummary.coinPnl >= 0 ? '+' : ''}
                      {formatNumber(portfolioSummary.coinPnl)} Xu
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 sm:border-l sm:border-slate-100 sm:pl-4">
                <div className="text-xs text-slate-500">Lợi nhuận đã chốt</div>
                <div
                  className={`font-mono-num font-bold text-xl ${
                    investments.realizedProfit >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {investments.realizedProfit >= 0 ? '+' : ''}
                  {formatNumber(investments.realizedProfit)}V
                </div>
                <div className="text-[11px] text-slate-500 font-mono-num">
                  Tổng vốn đã rót: {formatNumber(investments.totalInvested)}
                </div>
              </div>
            </div>

            {/* Dividend Claim Box */}
            <div className="lg:col-span-5 bg-[#F4FAF0] rounded-3xl border border-[#DCE7D3] p-5 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-600" />
                    Cổ Tức Định Kỳ (NPC + P2P)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {dividendInfo.nextClaimAt > nowMs ? (
                      <>
                        Kỳ kế tiếp sau:{' '}
                        <strong className="font-mono-num text-slate-900">
                          {formatTimeRemaining(dividendInfo.nextClaimAt - nowMs)}
                        </strong>
                      </>
                    ) : (
                      'Đã đến kỳ nhận cổ tức! Bấm nhận ngay.'
                    )}
                  </p>
                </div>

                <div className="text-right font-mono-num">
                  <div className="text-base font-bold text-emerald-800">
                    +{formatNumber(dividendInfo.totalGold)} Vàng
                  </div>
                  {dividendInfo.totalCoins > 0 && (
                    <div className="text-xs font-bold text-violet-700">
                      +{formatNumber(dividendInfo.totalCoins)} Xu DOPI
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-t border-[#DCE7D3] pt-2.5">
                <span className="font-mono-num">
                  NPC: +{formatNumber(dividendInfo.npcGoldDividend)}V · P2P: +
                  {formatNumber(dividendInfo.p2pGoldDividend)}V
                </span>

                <button
                  type="button"
                  disabled={!dividendInfo.canClaim || claimingDividend}
                  onClick={async () => {
                    setClaimingDividend(true);
                    try {
                      await onClaimDividends();
                    } finally {
                      setClaimingDividend(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  {claimingDividend
                    ? 'Đang nhận...'
                    : dividendInfo.canClaim
                      ? 'Nhận Cổ Tức'
                      : dividendInfo.nextClaimAt > nowMs
                        ? `Chờ ${formatTimeRemaining(dividendInfo.nextClaimAt - nowMs)}`
                        : 'Chưa có cổ tức'}
                </button>
              </div>
            </div>
          </div>

          {/* Holdings List (NPC + P2P) */}
          <div className="bg-white rounded-3xl border border-[#DCE7D3] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Danh Sách Cổ Phiếu & Cổ Phần Đang Nắm Giữ
              </h3>
              <span className="text-xs text-slate-500">
                Phí bán hiện tại: {feePct}% (VIP {user.vipLevel})
              </span>
            </div>

            {portfolioSummary.totalPositions === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Danh mục đầu tư của bạn đang trống
                </p>
                <p className="text-xs text-slate-500">
                  Hãy bắt đầu mua cổ phiếu trên Thị Trường DOPI hoặc góp vốn vào Doanh Nghiệp P2P để nhận cổ tức định kỳ.
                </p>
                <button
                  type="button"
                  onClick={() => setSubTab('stocks')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  Xem bảng giá cổ phiếu
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-[#FAFDF8]">
                      <th className="py-3 px-4">Mã / Doanh nghiệp</th>
                      <th className="py-3 px-3 text-right">Số lượng</th>
                      <th className="py-3 px-3 text-right">Giá vốn TB</th>
                      <th className="py-3 px-3 text-right">Giá hiện tại</th>
                      <th className="py-3 px-3 text-right">Lãi / Lỗ</th>
                      <th className="py-3 px-3">Trạng thái T+</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {/* NPC Stock Rows */}
                    {Object.entries(investments.npcHoldings).map(([code, h]) => {
                      if (!h || h.shares <= 0) return null;
                      const snap = snapshotMap[code as StockCode];
                      if (!snap) return null;
                      const curr = snap.def.currency === 'coins' ? 'Xu' : 'V';
                      const cost = Math.round(h.avgBuyPrice * h.shares);
                      const value = snap.currentPrice * h.shares;
                      const pnl = value - cost;
                      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                      const lockMs = Math.max(0, h.lockedUntil - nowMs);
                      const busy = sellingKey === `npc_${code}`;

                      return (
                        <tr key={`npc_${code}`} className="hover:bg-[#FAFDF8]">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{snap.def.emoji}</span>
                              <div>
                                <div className="font-bold text-slate-900 font-mono-num">
                                  {snap.def.code}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {snap.def.name} · Thị trường DOPI
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num font-bold text-slate-900">
                            {formatNumber(h.shares)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num text-slate-600">
                            {formatNumber(Math.round(h.avgBuyPrice))}
                            {curr}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                            {formatNumber(snap.currentPrice)}
                            {curr}
                          </td>
                          <td
                            className={`py-3.5 px-3 text-right font-mono-num font-bold ${
                              pnl >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {pnl >= 0 ? '+' : ''}
                            {formatNumber(pnl)}
                            {curr} ({pnlPct >= 0 ? '+' : ''}
                            {pnlPct.toFixed(1)}%)
                          </td>
                          <td className="py-3.5 px-3 text-xs whitespace-nowrap">
                            {lockMs > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-mono-num">
                                <Lock className="w-3.5 h-3.5" />
                                Khóa {formatTimeRemaining(lockMs)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <Unlock className="w-3.5 h-3.5" />
                                Sẵn sàng bán
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={lockMs > 0 || busy}
                                onClick={() =>
                                  handleQuickSellNpc(snap.def.code, 1)
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Bán 1
                              </button>
                              <button
                                type="button"
                                disabled={lockMs > 0 || busy}
                                onClick={() =>
                                  handleQuickSellNpc(snap.def.code, h.shares)
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Bán hết
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* P2P Company Holding Rows */}
                    {Object.entries(investments.p2pHoldings).map(
                      ([ownerUid, h]) => {
                        if (!h || h.shares <= 0) return null;
                        const comp = effectiveP2PCompanies.find(
                          (c) => c.ownerUid === ownerUid
                        );
                        const livePrice = comp?.sharePrice ?? Math.round(h.avgBuyPrice);
                        const cost = Math.round(h.avgBuyPrice * h.shares);
                        const value = livePrice * h.shares;
                        const pnl = value - cost;
                        const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                        const lockMs = Math.max(0, h.lockedUntil - nowMs);
                        const busy = sellingKey === `p2p_${ownerUid}`;

                        return (
                          <tr key={`p2p_${ownerUid}`} className="hover:bg-[#FAFDF8]">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">🏢</span>
                                <div>
                                  <div className="font-bold text-slate-900">
                                    {comp?.businessName || h.businessName}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Doanh nghiệp P2P
                                    {comp
                                      ? ` · Tín nhiệm ${comp.creditRating} · Cổ tức ${comp.dividendRate}%`
                                      : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num font-bold text-slate-900">
                              {formatNumber(h.shares)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num text-slate-600">
                              {formatNumber(Math.round(h.avgBuyPrice))}V
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                              {formatNumber(livePrice)}V
                            </td>
                            <td
                              className={`py-3.5 px-3 text-right font-mono-num font-bold ${
                                pnl >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {pnl >= 0 ? '+' : ''}
                              {formatNumber(pnl)}V ({pnlPct >= 0 ? '+' : ''}
                              {pnlPct.toFixed(1)}%)
                            </td>
                            <td className="py-3.5 px-3 text-xs whitespace-nowrap">
                              {lockMs > 0 ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-mono-num">
                                  <Lock className="w-3.5 h-3.5" />
                                  Khóa {formatTimeRemaining(lockMs)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                  <Unlock className="w-3.5 h-3.5" />
                                  Sẵn sàng bán
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={lockMs > 0 || busy}
                                  onClick={() =>
                                    handleQuickSellP2P(ownerUid, 1)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  Bán 1
                                </button>
                                <button
                                  type="button"
                                  disabled={lockMs > 0 || busy}
                                  onClick={() =>
                                    handleQuickSellP2P(ownerUid, h.shares)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  Bán hết
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Glossary Modal */}
      {showGlossary && (
        <InvestmentGlossaryModal onClose={() => setShowGlossary(false)} />
      )}

      {/* Farm Visit Verification Modal for P2P Investors */}
      {visitingFarm && (
        <FarmVisitModal
          farm={visitingFarm}
          currentUser={user}
          nowMs={nowMs}
          onClose={() => setVisitingFarm(null)}
          onWaterPlot={onWaterFriendPlot}
          onFarmUpdated={(updated) => setVisitingFarm(updated)}
        />
      )}
    </div>
  );
};
