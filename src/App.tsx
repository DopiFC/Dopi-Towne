import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  ADMIN_EMAIL,
  auth,
  isFirebaseConfigured,
  testFirestoreConnection,
} from './firebaseConfig';
import {
  ACHIEVEMENTS,
  BOOSTERS,
  CHECKIN_REWARDS,
  CROPS,
  EMPLOYEES,
  ENTERPRISE_CAMPAIGNS,
  ENTERPRISE_SPECIALISTS,
  EVENT_SHOP_ITEMS,
  FACTORIES,
  FRIEND_HELP_REWARD_GOLD,
  FRIEND_WATER_REDUCTION_RATIO,
  HEADHUNT_COST_GOLD,
  ITEM_CATALOG,
  MAX_FRIEND_HELPS_PER_DAY,
  MAX_PLOTS,
  MONTHLY_TOPUP_MILESTONES,
  PREMIUM_STORAGE_STEP,
  RECIPES,
  STORAGE_UPGRADE_STEP,
  TREASURES,
  VEHICLES,
  WHOLESALE_CONTRACTS,
} from './game/constants';
import {
  applyExpAndLevelUp,
  calculateDepartmentUpgradeCost,
  calculateEmployeeUpgradeCost,
  calculateGrowthDurationMs,
  calculateMarketTax,
  calculateMonthlyPayroll,
  calculatePlotCost,
  calculateSpecialistHireOrUpgradeCost,
  calculateStorageUpgradeCost,
  calculateVipLevel,
  calculateWealthScore,
  createInitialEnterpriseState,
  createInitialSpecialists,
  formatNumber,
  generateNpcOrders,
  generateRushOrder,
  getBusinessBonuses,
  getCurrentMonthKey,
  getHourlyMarketSurge,
  getItemSellPriceWithSurge,
  getTodayDateKey,
  getTotalInventoryCount,
  getVipPerks,
  validateRedeemCodeState,
} from './game/economy';
import {
  buildP2PCompanyPayload,
  calculateBuyTrade,
  calculateClaimableDividends,
  calculateP2PShareholderDividend,
  calculateSellTrade,
  getAllStockSnapshots,
  getEffectiveP2PCompanyState,
  getStockMarketSnapshot,
  INVESTMENT_LOCKUP_MS,
  normalizeUserInvestments,
  P2P_MAX_PUBLIC_SHARES,
} from './game/investment';
import { createSandboxBundle } from './game/sandboxSeed';
import type {
  CurrencyType,
  EmployeeId,
  EnterpriseLedgerEntry,
  EnterpriseSpecialistId,
  FactoryId,
  FriendChatMessage,
  FriendRequestDoc,
  GameTab,
  MarketListing,
  NpcOrder,
  P2PCompanyDoc,
  PublicFarmData,
  RedeemCodeDoc,
  StockCode,
  StockMarketSnapshot,
  ToastMessage,
  TopupRequestDoc,
  UserGameData,
} from './game/types';
import {
  buildFriendChatId,
  createRedeemCode,
  createTopupRequest,
  deleteRedeemCode,
  ensureUserDocument,
  fetchPublicFarmByUid,
  fetchPublicFarmsByUids,
  fetchServerLeaderboard,
  findPlayerByUidOrEmail,
  flushPendingUserSave,
  rejectTopupRequest,
  respondFriendRequest,
  saveUserState,
  sendFriendChatMessage,
  sendFriendRequest,
  subscribeActiveMarketListings,
  subscribeAllRedeemCodes,
  subscribeAllTopupRequests,
  subscribeFriendChatMessages,
  subscribeFriendRequests,
  subscribeListedP2PCompanies,
  subscribeMyP2PCompany,
  subscribeMyPublicFarm,
  subscribeUserData,
  subscribeUserTopupRequests,
  syncP2PCompanyDividendFromOrder,
  toggleRedeemCodeActive,
  txApproveTopupRequest,
  txBuyMarketListing,
  txBuyNewPlot,
  txBuyP2PShares,
  txCancelMarketListing,
  txClaimDividends,
  txCreateMarketListing,
  txExpandStorage,
  txRedeemCode,
  txSellP2PShares,
  txUnlockFactory,
  txWaterFriendPlot,
  upsertMyP2PCompanyIpo,
} from './services/gameService';
import { soundEngine } from './utils/soundEngine';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AuthScreen } from './components/AuthScreen';
import { BrandCrest } from './components/BrandCrest';
import { BusinessView } from './components/BusinessView';
import { EventsView } from './components/EventsView';
import { FactoryOrdersView } from './components/FactoryOrdersView';
import { FarmView } from './components/FarmView';
import { FriendsView } from './components/FriendsView';
import { HudHeader } from './components/HudHeader';
import { InvestmentView } from './components/InvestmentView';
import { LeaderboardView } from './components/LeaderboardView';
import { MarketplaceView } from './components/MarketplaceView';
import { QuestsVipView } from './components/QuestsVipView';
import { RedeemCodeModal } from './components/RedeemCodeModal';
import { SetupGuideScreen } from './components/SetupGuideScreen';
import { ShopStorageView } from './components/ShopStorageView';
import { ToastStack } from './components/ToastStack';
import { GuideView } from './components/GuideView';
import { DonateView } from './components/DonateView';

function getSearchParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function App() {
  const configured = isFirebaseConfigured();
  const params = useMemo(() => getSearchParams(), []);
  const isSandboxMode = params.get('autostart') === '1';
  const isSandboxAdmin = params.get('admin') === '1';

  const initialSandbox = useMemo(
    () => (isSandboxMode ? createSandboxBundle(isSandboxAdmin) : null),
    [isSandboxMode, isSandboxAdmin]
  );

  const [authReady, setAuthReady] = useState(isSandboxMode);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserGameData | null>(() =>
    initialSandbox ? initialSandbox.user : null
  );
  const [marketListings, setMarketListings] = useState<MarketListing[]>(() =>
    initialSandbox ? initialSandbox.marketListings : []
  );
  const [friendsFarms, setFriendsFarms] = useState<PublicFarmData[]>(() =>
    initialSandbox ? initialSandbox.friendsFarms : []
  );
  const [serverLeaderboard, setServerLeaderboard] = useState<PublicFarmData[]>(() =>
    initialSandbox ? initialSandbox.serverLeaderboard : []
  );
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [incomingReqs, setIncomingReqs] = useState<FriendRequestDoc[]>(() =>
    initialSandbox ? initialSandbox.incomingRequests : []
  );
  const [outgoingReqs, setOutgoingReqs] = useState<FriendRequestDoc[]>([]);
  const [adminCodes, setAdminCodes] = useState<RedeemCodeDoc[]>(() =>
    initialSandbox ? initialSandbox.redeemCodes : []
  );
  const [myTopupRequests, setMyTopupRequests] = useState<TopupRequestDoc[]>(() =>
    initialSandbox ? initialSandbox.topupRequests : []
  );
  const [allTopupRequests, setAllTopupRequests] = useState<TopupRequestDoc[]>(() =>
    initialSandbox ? initialSandbox.topupRequests : []
  );
  const [p2pCompanies, setP2pCompanies] = useState<P2PCompanyDoc[]>(() =>
    initialSandbox ? initialSandbox.p2pCompanies : []
  );
  const [myP2PCompany, setMyP2PCompany] = useState<P2PCompanyDoc | null>(null);
  const [activeChatFriendUid, setActiveChatFriendUid] = useState<string | null>(() =>
    initialSandbox && initialSandbox.friendsFarms.length > 0
      ? initialSandbox.friendsFarms[0].uid
      : null
  );
  const [chatMessages, setChatMessages] = useState<FriendChatMessage[]>(() =>
    initialSandbox ? initialSandbox.friendMessages : []
  );

  const [activeTab, setActiveTab] = useState<GameTab>('farm');
  const [preselectedMarketItem, setPreselectedMarketItem] = useState<string | null>(
    null
  );
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bgmEnabled, setBgmEnabled] = useState(() => soundEngine.isBgmEnabled());
  const [sfxEnabled, setSfxEnabled] = useState(() => soundEngine.isSfxEnabled());

  const autoHarvestLockRef = useRef<number>(0);
  const lastLocalCommitAtRef = useRef<number>(0);

  const pushToast = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-1), { id, type, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Unlock Web Audio API on first user interaction (browser autoplay compliance)
  useEffect(() => {
    const unlock = () => {
      soundEngine.unlockAndAutoStart();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Master 1-second timer (pauses when tab is hidden to save CPU)
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Boot Firestore connection check & Auth listener
  useEffect(() => {
    if (!configured || isSandboxMode || !auth) return;
    testFirestoreConnection();

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.emailVerified) {
        try {
          await fbUser.getIdToken(true).catch(() => undefined);
          const docData = await ensureUserDocument(
            fbUser.uid,
            fbUser.email || '',
            fbUser.displayName || ''
          );
          setUserData(docData);
        } catch (err) {
          console.error(err);
        }
      } else {
        setUserData(null);
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, [configured, isSandboxMode]);

  const isVerifiedAuthenticated =
    !isSandboxMode && Boolean(firebaseUser && firebaseUser.emailVerified);
  const isAdmin = Boolean(
    userData &&
      userData.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  // Real-time Firestore subscriptions when authenticated
  useEffect(() => {
    if (!isVerifiedAuthenticated || !firebaseUser) return;

    const uid = firebaseUser.uid;
    const unsubUser = subscribeUserData(uid, (data) => {
      // Prevent stale intermediate Firestore snapshot echoes from overwriting newer optimistic state
      if (
        Date.now() - lastLocalCommitAtRef.current < 750 &&
        (data.updatedAt || 0) < lastLocalCommitAtRef.current
      ) {
        return;
      }
      setUserData(data);
    });
    const unsubMarket = subscribeActiveMarketListings(setMarketListings);
    const unsubFriends = subscribeFriendRequests(
      uid,
      setIncomingReqs,
      setOutgoingReqs
    );
    const unsubMyTopups = subscribeUserTopupRequests(uid, setMyTopupRequests);
    const unsubP2P = subscribeListedP2PCompanies(setP2pCompanies);
    const unsubMyP2P = subscribeMyP2PCompany(uid, setMyP2PCompany);

    // Merge friend waterings from public_farms back into user's farmPlots
    const unsubPublic = subscribeMyPublicFarm(uid, (pubFarm) => {
      setUserData((prev) => {
        if (!prev) return prev;
        let changed = false;
        const mergedPlots = prev.farmPlots.map((plot) => {
          const pubPlot = pubFarm.farmPlots.find((p) => p.id === plot.id);
          if (
            pubPlot &&
            pubPlot.wateredBy &&
            pubPlot.wateredAt &&
            pubPlot.readyAt &&
            plot.cropId &&
            plot.readyAt &&
            pubPlot.readyAt < plot.readyAt &&
            pubPlot.wateredAt > (plot.wateredAt || 0)
          ) {
            changed = true;
            return {
              ...plot,
              readyAt: pubPlot.readyAt,
              wateredBy: pubPlot.wateredBy,
              wateredAt: pubPlot.wateredAt,
            };
          }
          return plot;
        });
        if (!changed) return prev;
        const next = { ...prev, farmPlots: mergedPlots, updatedAt: Date.now() };
        void saveUserState(next);
        return next;
      });
    });

    return () => {
      unsubUser();
      unsubMarket();
      unsubFriends();
      unsubMyTopups();
      unsubP2P();
      unsubMyP2P();
      unsubPublic();
    };
  }, [isVerifiedAuthenticated, firebaseUser]);

  // Admin real-time top-up requests listener (always active for verified Admin so HUD badge is live)
  useEffect(() => {
    if (!isVerifiedAuthenticated || !isAdmin) return;
    const unsub = subscribeAllTopupRequests(setAllTopupRequests);
    return () => unsub();
  }, [isVerifiedAuthenticated, isAdmin]);

  // Admin real-time redeem codes listener (when modal open)
  useEffect(() => {
    if (!isVerifiedAuthenticated || !isAdmin || !showAdminModal) return;
    const unsub = subscribeAllRedeemCodes(setAdminCodes);
    return () => unsub();
  }, [isVerifiedAuthenticated, isAdmin, showAdminModal]);

  // Sync accepted outgoing friend requests into user.friends
  useEffect(() => {
    if (!isVerifiedAuthenticated || !userData) return;
    const currentFriends = Array.isArray(userData.friends)
      ? userData.friends
      : [];
    const acceptedNewUids = outgoingReqs
      .filter(
        (r) =>
          r.status === 'accepted' &&
          r.toUid !== userData.uid &&
          !currentFriends.includes(r.toUid)
      )
      .map((r) => r.toUid);
    if (acceptedNewUids.length > 0) {
      const mergedFriends = Array.from(
        new Set([...currentFriends, ...acceptedNewUids])
      ).slice(0, 100);
      const next: UserGameData = {
        ...userData,
        friends: mergedFriends,
        updatedAt: Date.now(),
      };
      setUserData(next);
      saveUserState(next).catch((err) => {
        console.warn('Sync accepted friend warning:', err);
      });
    }
  }, [outgoingReqs, userData, isVerifiedAuthenticated]);

  // Load friend public farms when friends list changes
  useEffect(() => {
    if (!isVerifiedAuthenticated || !userData) return;
    if (userData.friends.length === 0) {
      setFriendsFarms([]);
      return;
    }
    let cancelled = false;
    fetchPublicFarmsByUids(userData.friends).then((farms) => {
      if (!cancelled) setFriendsFarms(farms);
    });
    return () => {
      cancelled = true;
    };
  }, [isVerifiedAuthenticated, userData?.friends.join(',')]);

  // Real-time Friend Chat subscription (only active for the selected friend to prevent lag)
  useEffect(() => {
    if (!isVerifiedAuthenticated || !userData || !activeChatFriendUid) return;
    const unsub = subscribeFriendChatMessages(
      userData.uid,
      activeChatFriendUid,
      setChatMessages
    );
    return () => unsub();
  }, [isVerifiedAuthenticated, userData?.uid, activeChatFriendUid]);

  const handleRefreshLeaderboard = useCallback(async () => {
    if (isSandboxMode) {
      pushToast('info', 'Đã làm mới Bảng Xếp Hạng.');
      return;
    }
    if (!isVerifiedAuthenticated) return;
    setLoadingLeaderboard(true);
    try {
      const list = await fetchServerLeaderboard();
      setServerLeaderboard(list);
    } catch (err) {
      console.error(err);
      pushToast('error', 'Không thể tải Bảng Xếp Hạng lúc này.');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [isSandboxMode, isVerifiedAuthenticated, pushToast]);

  // Auto-fetch Server Leaderboard when opening leaderboard or friends tab
  useEffect(() => {
    if (
      (activeTab === 'leaderboard' ||
        (activeTab === 'friends' && serverLeaderboard.length === 0)) &&
      isVerifiedAuthenticated
    ) {
      void handleRefreshLeaderboard();
    }
  }, [
    activeTab,
    isVerifiedAuthenticated,
    handleRefreshLeaderboard,
    serverLeaderboard.length,
  ]);

  const commitUserUpdate = useCallback(
    async (updater: (prev: UserGameData) => UserGameData) => {
      if (!userData) return;
      const now = Date.now();
      lastLocalCommitAtRef.current = now;
      const rawNext = updater(userData);
      const next: UserGameData = {
        ...rawNext,
        wealthScore: calculateWealthScore(rawNext),
        updatedAt: now,
      };
      setUserData(next);
      if (!isSandboxMode) {
        try {
          await saveUserState(next);
        } catch (err) {
          console.error('Lỗi đồng bộ dữ liệu Firestore:', err);
          pushToast(
            'error',
            err instanceof Error
              ? err.message
              : 'Không thể lưu thao tác lên máy chủ.'
          );
        }
      }
    },
    [userData, isSandboxMode, pushToast]
  );

  // Diligent Farmer auto-harvest while online (throttled to every 4s, writes only when crops are ready)
  useEffect(() => {
    if (!userData) return;
    if ((userData.employees?.diligent_farmer || 0) < 1) return;
    if (nowMs - autoHarvestLockRef.current < 4000) return;

    const readyPlots = userData.farmPlots.filter(
      (p) => p.cropId && p.readyAt !== null && p.readyAt <= nowMs
    );
    if (readyPlots.length === 0) return;

    const used = getTotalInventoryCount(userData.inventory);
    const availableSpace = userData.storageCapacity - used;
    if (availableSpace <= 0) return;

    autoHarvestLockRef.current = nowMs;
    const toHarvest = readyPlots.slice(0, availableSpace);
    const harvestIds = new Set(toHarvest.map((p) => p.id));
    const bonuses = getBusinessBonuses(userData);
    let totalExp = 0;
    let bonusGold = 0;
    let totalUnits = 0;
    const nextInv = { ...userData.inventory };
    let remainingSpace = availableSpace;

    for (const p of toHarvest) {
      if (!p.cropId) continue;
      const crop = CROPS.find((c) => c.id === p.cropId);
      if (!crop) continue;

      let qty = 1;
      const extraChance =
        bonuses.extraYieldChancePct + (p.yieldBoosted ? 25 : 0);
      if (extraChance > 0 && Math.random() * 100 < extraChance && remainingSpace >= 2) {
        qty = 2;
      }
      if (p.mutationBoosted && Math.random() < 0.2) {
        bonusGold += crop.baseSellPrice * 3;
      }

      const addQty = Math.min(qty, remainingSpace);
      if (addQty > 0) {
        nextInv[crop.id] = (nextInv[crop.id] || 0) + addQty;
        remainingSpace -= addQty;
        totalUnits += addQty;
      }
      totalExp += crop.expReward;
    }

    const expRes = applyExpAndLevelUp(userData.level, userData.exp, totalExp);
    void commitUserUpdate((prev) => ({
      ...prev,
      level: expRes.level,
      exp: expRes.exp,
      gold: prev.gold + bonusGold,
      eventTickets: (prev.eventTickets || 0) + toHarvest.length,
      inventory: nextInv,
      farmPlots: prev.farmPlots.map((p) =>
        harvestIds.has(p.id)
          ? {
              ...p,
              cropId: null,
              plantedAt: null,
              readyAt: null,
              wateredBy: null,
              wateredAt: null,
              yieldBoosted: false,
              mutationBoosted: false,
            }
          : p
      ),
      dailyQuests: prev.dailyQuests.map((q) =>
        q.type === 'harvest'
          ? { ...q, progress: Math.min(q.target, q.progress + toHarvest.length) }
          : q
      ),
      stats: {
        ...prev.stats,
        totalHarvested: (prev.stats?.totalHarvested || 0) + toHarvest.length,
      },
    }));

    soundEngine.playHarvest();
    pushToast(
      'info',
      `🧑‍🌾 Nông Dân Cần Cù vừa tự thu hoạch ${totalUnits} nông sản (+${toHarvest.length} Vé Sự Kiện)!`
    );
  }, [nowMs, userData, commitUserUpdate, pushToast]);

  // ==================== AUDIO HANDLERS ====================
  const handleToggleBgm = () => {
    const next = !bgmEnabled;
    soundEngine.setBgmEnabled(next);
    setBgmEnabled(next);
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    soundEngine.setSfxEnabled(next);
    setSfxEnabled(next);
  };

  // ==================== FARM HANDLERS ====================
  const handlePlantPlot = async (plotId: number, cropId: string) => {
    if (!userData) return;
    const crop = CROPS.find((c) => c.id === cropId);
    if (!crop) return;
    if (userData.level < crop.unlockLevel) {
      soundEngine.playError();
      pushToast('warning', `Cần đạt Level ${crop.unlockLevel} để trồng ${crop.name}.`);
      return;
    }
    const now = Date.now();
    const bonuses = getBusinessBonuses(userData, now);
    const effectiveSeedPrice = Math.max(
      1,
      Math.round(crop.seedPrice * (1 - bonuses.seedDiscountPct / 100))
    );
    if (userData.gold < effectiveSeedPrice) {
      soundEngine.playError();
      pushToast('error', `Không đủ Vàng (cần ${formatNumber(effectiveSeedPrice)} Vàng).`);
      return;
    }
    const target = userData.farmPlots.find((p) => p.id === plotId);
    if (!target || target.cropId) return;

    const sprinklerActive = (userData.autoWaterUntil || 0) > now;
    const duration = calculateGrowthDurationMs(
      crop.id,
      userData.vipLevel,
      sprinklerActive,
      bonuses.cropSpeedReductionPct
    );

    await commitUserUpdate((prev) => ({
      ...prev,
      gold: prev.gold - effectiveSeedPrice,
      farmPlots: prev.farmPlots.map((p) =>
        p.id === plotId
          ? {
              ...p,
              cropId: crop.id,
              plantedAt: now,
              readyAt: now + duration,
              wateredBy: null,
              wateredAt: null,
              yieldBoosted: false,
              mutationBoosted: false,
            }
          : p
      ),
      dailyQuests: prev.dailyQuests.map((q) =>
        q.type === 'plant'
          ? { ...q, progress: Math.min(q.target, q.progress + 1) }
          : q
      ),
    }));
    soundEngine.playPlant();
    pushToast(
      'info',
      `Đã gieo ${crop.emoji} ${crop.name} ở ô #${plotId + 1}${
        bonuses.seedDiscountPct > 0
          ? ` (Giảm -${bonuses.seedDiscountPct}% giá giống & -${bonuses.cropSpeedReductionPct}% TG chín)`
          : '.'
      }`
    );
  };

  const handleHarvestPlot = async (plotId: number) => {
    if (!userData) return;
    const plot = userData.farmPlots.find((p) => p.id === plotId);
    if (!plot || !plot.cropId || !plot.readyAt || plot.readyAt > Date.now()) return;
    const crop = CROPS.find((c) => c.id === plot.cropId);
    if (!crop) return;

    const used = getTotalInventoryCount(userData.inventory);
    const available = userData.storageCapacity - used;
    if (available < 1) {
      soundEngine.playError();
      pushToast('error', 'Kho đã đầy! Hãy bán bớt nông sản hoặc mở rộng kho.');
      return;
    }

    const bonuses = getBusinessBonuses(userData);
    const extraChance =
      bonuses.extraYieldChancePct + (plot.yieldBoosted ? 25 : 0);
    const harvestedQty =
      extraChance > 0 && Math.random() * 100 < extraChance && available >= 2
        ? 2
        : 1;
    const goldenHit = Boolean(plot.mutationBoosted && Math.random() < 0.2);
    const goldenBonusGold = goldenHit ? crop.baseSellPrice * 3 : 0;

    const expRes = applyExpAndLevelUp(userData.level, userData.exp, crop.expReward);

    await commitUserUpdate((prev) => ({
      ...prev,
      level: expRes.level,
      exp: expRes.exp,
      gold: prev.gold + goldenBonusGold,
      eventTickets: (prev.eventTickets || 0) + 1,
      inventory: {
        ...prev.inventory,
        [crop.id]: (prev.inventory[crop.id] || 0) + harvestedQty,
      },
      farmPlots: prev.farmPlots.map((p) =>
        p.id === plotId
          ? {
              ...p,
              cropId: null,
              plantedAt: null,
              readyAt: null,
              wateredBy: null,
              wateredAt: null,
              yieldBoosted: false,
              mutationBoosted: false,
            }
          : p
      ),
      dailyQuests: prev.dailyQuests.map((q) =>
        q.type === 'harvest'
          ? { ...q, progress: Math.min(q.target, q.progress + 1) }
          : q
      ),
      stats: {
        ...prev.stats,
        totalHarvested: (prev.stats?.totalHarvested || 0) + 1,
      },
    }));

    if (goldenHit || expRes.leveledUp) {
      soundEngine.playFanfare();
    } else {
      soundEngine.playHarvest();
    }

    pushToast(
      'success',
      `Thu hoạch +${harvestedQty} ${crop.emoji} ${crop.name} (+${crop.expReward} EXP, +1 Vé)${
        goldenHit ? ` · ✨ Đột biến Vàng +${formatNumber(goldenBonusGold)}V!` : ''
      }${expRes.leveledUp ? ` · Lên cấp Lv.${expRes.level}!` : ''}`
    );
  };

  const handleHarvestAll = async () => {
    if (!userData) return;
    if (!getVipPerks(userData.vipLevel).harvestAllUnlocked) {
      soundEngine.playError();
      pushToast('warning', 'Tính năng Thu hoạch tất cả mở khóa từ VIP 4.');
      return;
    }

    const now = Date.now();
    const readyPlots = userData.farmPlots.filter(
      (p) => p.cropId && p.readyAt !== null && p.readyAt <= now
    );
    if (readyPlots.length === 0) return;

    const used = getTotalInventoryCount(userData.inventory);
    let availableSpace = userData.storageCapacity - used;
    if (availableSpace <= 0) {
      soundEngine.playError();
      pushToast('error', 'Kho đã đầy, không thể thu hoạch thêm!');
      return;
    }

    const toHarvest = readyPlots.slice(0, availableSpace);
    const harvestIds = new Set(toHarvest.map((p) => p.id));
    const bonuses = getBusinessBonuses(userData);
    let totalExp = 0;
    let totalGoldenBonus = 0;
    let totalUnits = 0;
    const nextInv = { ...userData.inventory };

    for (const p of toHarvest) {
      if (!p.cropId) continue;
      const crop = CROPS.find((c) => c.id === p.cropId);
      if (!crop) continue;

      const extraChance =
        bonuses.extraYieldChancePct + (p.yieldBoosted ? 25 : 0);
      let qty = 1;
      if (extraChance > 0 && Math.random() * 100 < extraChance && availableSpace >= 2) {
        qty = 2;
      }
      if (p.mutationBoosted && Math.random() < 0.2) {
        totalGoldenBonus += crop.baseSellPrice * 3;
      }

      const addQty = Math.min(qty, availableSpace);
      if (addQty > 0) {
        nextInv[crop.id] = (nextInv[crop.id] || 0) + addQty;
        availableSpace -= addQty;
        totalUnits += addQty;
      }
      totalExp += crop.expReward;
    }

    const expRes = applyExpAndLevelUp(userData.level, userData.exp, totalExp);

    await commitUserUpdate((prev) => ({
      ...prev,
      level: expRes.level,
      exp: expRes.exp,
      gold: prev.gold + totalGoldenBonus,
      eventTickets: (prev.eventTickets || 0) + toHarvest.length,
      inventory: nextInv,
      farmPlots: prev.farmPlots.map((p) =>
        harvestIds.has(p.id)
          ? {
              ...p,
              cropId: null,
              plantedAt: null,
              readyAt: null,
              wateredBy: null,
              wateredAt: null,
              yieldBoosted: false,
              mutationBoosted: false,
            }
          : p
      ),
      dailyQuests: prev.dailyQuests.map((q) =>
        q.type === 'harvest'
          ? { ...q, progress: Math.min(q.target, q.progress + toHarvest.length) }
          : q
      ),
      stats: {
        ...prev.stats,
        totalHarvested: (prev.stats?.totalHarvested || 0) + toHarvest.length,
      },
    }));

    soundEngine.playHarvest();
    pushToast(
      'success',
      `Đã thu hoạch nhanh ${totalUnits} nông sản (+${totalExp} EXP, +${toHarvest.length} Vé)${
        totalGoldenBonus > 0 ? ` · Đột biến +${formatNumber(totalGoldenBonus)}V!` : ''
      }`
    );
  };

  const handleUseBooster = async (plotId: number, boosterId: string) => {
    if (!userData) return;
    const booster = BOOSTERS.find((b) => b.id === boosterId);
    if (!booster) return;
    const owned = userData.inventory[boosterId] || 0;
    if (owned <= 0) {
      soundEngine.playError();
      pushToast('warning', `Bạn đã hết ${booster.name}. Hãy mua thêm ở Cửa Hàng.`);
      return;
    }

    const plot = userData.farmPlots.find((p) => p.id === plotId);
    const now = Date.now();
    if (!plot || !plot.cropId || !plot.readyAt || plot.readyAt <= now) return;

    if (booster.effectType === 'yield_boost' && plot.yieldBoosted) return;
    if (booster.effectType === 'mutation_serum' && plot.mutationBoosted) return;

    const remaining = plot.readyAt - now;
    const nextReadyAt =
      booster.effectType === 'speed_plot'
        ? booster.speedReductionPercent >= 100
          ? now
          : now + Math.round(remaining * (1 - booster.speedReductionPercent / 100))
        : plot.readyAt;

    await commitUserUpdate((prev) => {
      const nextInv = { ...prev.inventory };
      if (owned - 1 <= 0) delete nextInv[boosterId];
      else nextInv[boosterId] = owned - 1;

      return {
        ...prev,
        inventory: nextInv,
        farmPlots: prev.farmPlots.map((p) =>
          p.id === plotId
            ? {
                ...p,
                readyAt: nextReadyAt,
                yieldBoosted:
                  booster.effectType === 'yield_boost' ? true : p.yieldBoosted,
                mutationBoosted:
                  booster.effectType === 'mutation_serum'
                    ? true
                    : p.mutationBoosted,
              }
            : p
        ),
      };
    });

    soundEngine.playPlant();
    pushToast(
      'success',
      booster.effectType === 'yield_boost'
        ? `Đã tưới Dinh Dưỡng cho ô #${plotId + 1} (+25% tỉ lệ thu đôi)!`
        : booster.effectType === 'mutation_serum'
          ? `Đã dùng Thuốc Đột Biến Vàng cho ô #${plotId + 1} (20% thưởng x3 Vàng)!`
          : booster.speedReductionPercent >= 100
            ? `Ô #${plotId + 1} đã chín ngay lập tức!`
            : `Đã bón ${booster.name} cho ô #${plotId + 1} (-${booster.speedReductionPercent}% thời gian)!`
    );
  };

  const handleBuyPlot = async () => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        if (userData.farmPlots.length >= MAX_PLOTS) {
          throw new Error('Bạn đã mở tối đa 30 ô đất.');
        }
        const cost = calculatePlotCost(userData.farmPlots.length);
        if (userData.gold < cost) throw new Error(`Cần ${formatNumber(cost)} Vàng.`);
        await commitUserUpdate((prev) => ({
          ...prev,
          gold: prev.gold - cost,
          farmPlots: [
            ...prev.farmPlots,
            {
              id: prev.farmPlots.length,
              cropId: null,
              plantedAt: null,
              readyAt: null,
              wateredBy: null,
              wateredAt: null,
            },
          ],
        }));
        soundEngine.playCoin();
        pushToast('success', `Đã mở thêm ô đất #${userData.farmPlots.length + 1}!`);
      } else {
        const res = await txBuyNewPlot(userData.uid);
        soundEngine.playCoin();
        pushToast(
          'success',
          `Đã mua ô đất #${res.totalPlots} với giá ${formatNumber(res.cost)} Vàng!`
        );
      }
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể mua ô đất.');
    }
  };

  // ==================== FACTORY & ORDERS HANDLERS ====================
  const handleUnlockFactory = async (factoryId: FactoryId) => {
    if (!userData) return;
    const def = FACTORIES.find((f) => f.id === factoryId);
    if (!def) return;
    try {
      if (isSandboxMode) {
        if (userData.level < def.unlockLevel) {
          throw new Error(`Cần đạt Level ${def.unlockLevel}.`);
        }
        if (userData.gold < def.unlockCostGold) {
          throw new Error(`Cần ${formatNumber(def.unlockCostGold)} Vàng.`);
        }
        await commitUserUpdate((prev) => ({
          ...prev,
          gold: prev.gold - def.unlockCostGold,
          factories: prev.factories.map((f) =>
            f.id === factoryId ? { ...f, unlocked: true } : f
          ),
        }));
      } else {
        await txUnlockFactory(userData.uid, factoryId);
      }
      soundEngine.playFanfare();
      pushToast('success', `Đã xây dựng thành công ${def.emoji} ${def.name}!`);
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể mở khóa xưởng.');
    }
  };

  const handleStartRecipe = async (factoryId: FactoryId, recipeId: string) => {
    if (!userData) return;
    const recipe = RECIPES.find((r) => r.id === recipeId);
    const factory = userData.factories.find((f) => f.id === factoryId);
    if (!recipe || !factory || !factory.unlocked) return;

    const maxSlots = getVipPerks(userData.vipLevel).factoryQueueSlots;
    if (factory.queue.length >= maxSlots) {
      soundEngine.playError();
      pushToast('warning', `Hàng đợi đã đầy (${maxSlots} ô).`);
      return;
    }

    for (const [itemId, need] of Object.entries(recipe.ingredients)) {
      if ((userData.inventory[itemId] || 0) < need) {
        soundEngine.playError();
        pushToast('error', 'Không đủ nguyên liệu trong kho.');
        return;
      }
    }

    const bonuses = getBusinessBonuses(userData);
    const effectiveDurationMs = Math.max(
      5_000,
      Math.round(
        recipe.productionSeconds *
          1000 *
          (1 - bonuses.factorySpeedReductionPct / 100)
      )
    );

    const now = Date.now();
    const lastFinish =
      factory.queue.length > 0
        ? Math.max(now, factory.queue[factory.queue.length - 1].readyAt)
        : now;
    const nextInv = { ...userData.inventory };
    for (const [itemId, need] of Object.entries(recipe.ingredients)) {
      const rem = (nextInv[itemId] || 0) - need;
      if (rem <= 0) delete nextInv[itemId];
      else nextInv[itemId] = rem;
    }

    const qItem = {
      id: `q_${now}_${Math.random().toString(36).slice(2, 6)}`,
      recipeId: recipe.id,
      startedAt: lastFinish,
      readyAt: lastFinish + effectiveDurationMs,
    };

    await commitUserUpdate((prev) => ({
      ...prev,
      inventory: nextInv,
      factories: prev.factories.map((f) =>
        f.id === factoryId ? { ...f, queue: [...f.queue, qItem] } : f
      ),
    }));

    soundEngine.playClick();
    pushToast('info', `Đã đưa ${recipe.emoji} ${recipe.name} vào dây chuyền sản xuất.`);
  };

  const handleUseFactoryOil = async (factoryId: FactoryId) => {
    if (!userData) return;
    const oilOwned = userData.inventory.factory_oil || 0;
    if (oilOwned <= 0) {
      soundEngine.playError();
      pushToast('warning', 'Bạn đã hết Dầu Bôi Trơn Xưởng.');
      return;
    }
    const factory = userData.factories.find((f) => f.id === factoryId);
    const now = Date.now();
    if (!factory || !factory.queue.some((q) => q.readyAt > now)) return;

    await commitUserUpdate((prev) => {
      const nextInv = { ...prev.inventory };
      if (oilOwned - 1 <= 0) delete nextInv.factory_oil;
      else nextInv.factory_oil = oilOwned - 1;

      return {
        ...prev,
        inventory: nextInv,
        factories: prev.factories.map((f) =>
          f.id === factoryId
            ? {
                ...f,
                queue: f.queue.map((q) => {
                  if (q.readyAt <= now) return q;
                  const remain = q.readyAt - now;
                  return { ...q, readyAt: now + Math.round(remain * 0.75) };
                }),
              }
            : f
        ),
      };
    });

    soundEngine.playPlant();
    pushToast('success', 'Đã tra Dầu Bôi Trơn (-25% thời gian cho toàn bộ hàng đợi xưởng)!');
  };

  const handleCollectFactoryItem = async (
    factoryId: FactoryId,
    queueItemId: string
  ) => {
    if (!userData) return;
    const factory = userData.factories.find((f) => f.id === factoryId);
    const qItem = factory?.queue.find((q) => q.id === queueItemId);
    if (!factory || !qItem || qItem.readyAt > Date.now()) return;

    const recipe = RECIPES.find((r) => r.id === qItem.recipeId);
    if (!recipe) return;

    if (getTotalInventoryCount(userData.inventory) + 1 > userData.storageCapacity) {
      soundEngine.playError();
      pushToast('error', 'Kho đã đầy! Hãy giải phóng hoặc mở rộng kho.');
      return;
    }

    const expRes = applyExpAndLevelUp(userData.level, userData.exp, recipe.expReward);

    await commitUserUpdate((prev) => ({
      ...prev,
      level: expRes.level,
      exp: expRes.exp,
      inventory: {
        ...prev.inventory,
        [recipe.outputItemId]: (prev.inventory[recipe.outputItemId] || 0) + 1,
      },
      factories: prev.factories.map((f) =>
        f.id === factoryId
          ? { ...f, queue: f.queue.filter((q) => q.id !== queueItemId) }
          : f
      ),
      dailyQuests: prev.dailyQuests.map((q) =>
        q.type === 'produce'
          ? { ...q, progress: Math.min(q.target, q.progress + 1) }
          : q
      ),
      stats: {
        ...prev.stats,
        totalProduced: (prev.stats?.totalProduced || 0) + 1,
      },
    }));

    soundEngine.playHarvest();
    pushToast(
      'success',
      `Thu nhận +1 ${recipe.emoji} ${recipe.name} (+${recipe.expReward} EXP)!`
    );
  };

  const handleDeliverNpcOrder = async (order: NpcOrder) => {
    if (!userData) return;
    for (const [itemId, qty] of Object.entries(order.items)) {
      if ((userData.inventory[itemId] || 0) < qty) {
        soundEngine.playError();
        pushToast('error', 'Kho chưa đủ hàng để giao đơn này.');
        return;
      }
    }

    const nextInv = { ...userData.inventory };
    for (const [itemId, qty] of Object.entries(order.items)) {
      const rem = (nextInv[itemId] || 0) - qty;
      if (rem <= 0) delete nextInv[itemId];
      else nextInv[itemId] = rem;
    }

    const bonuses = getBusinessBonuses(userData);
    const grossGold = Math.round(
      order.rewardGold * (1 + bonuses.orderRewardBonusPct / 100)
    );
    // Nếu chủ nông trại đã niêm yết IPO, trích % doanh thu vào Quỹ cổ tức P2P (không in thêm tiền)
    const ipoListed = Boolean(myP2PCompany?.isListed);
    const ipoDividendCut = ipoListed
      ? Math.max(1, Math.floor((grossGold * (myP2PCompany?.dividendRate || 5)) / 100))
      : 0;
    const ownerNetGold = Math.max(1, grossGold - ipoDividendCut);

    const expRes = applyExpAndLevelUp(userData.level, userData.exp, order.rewardExp);
    const replacement = generateNpcOrders(
      expRes.level,
      Date.now(),
      Math.floor(Math.random() * 97),
      bonuses.orderRefreshReductionPct
    )[0];

    const nextUserSnapshot: UserGameData = {
      ...userData,
      level: expRes.level,
      exp: expRes.exp,
      gold: userData.gold + ownerNetGold,
      eventTickets: (userData.eventTickets || 0) + 2,
      inventory: nextInv,
      npcOrders: userData.npcOrders.map((o) => (o.id === order.id ? replacement : o)),
      dailyQuests: userData.dailyQuests.map((q) =>
        q.type === 'order'
          ? { ...q, progress: Math.min(q.target, q.progress + 1) }
          : q
      ),
      stats: {
        ...userData.stats,
        totalOrdersDone: (userData.stats?.totalOrdersDone || 0) + 1,
      },
    };

    await commitUserUpdate(() => nextUserSnapshot);

    if (ipoListed && ipoDividendCut > 0) {
      if (isSandboxMode && myP2PCompany) {
        const updatedComp = buildP2PCompanyPayload(
          nextUserSnapshot,
          myP2PCompany.dividendRate,
          true,
          {
            ...myP2PCompany,
            dividendPool: myP2PCompany.dividendPool + ipoDividendCut,
          },
          Date.now()
        );
        setMyP2PCompany(updatedComp);
        setP2pCompanies((prev) =>
          prev.map((c) => (c.ownerUid === userData.uid ? updatedComp : c))
        );
      } else if (!isSandboxMode) {
        void syncP2PCompanyDividendFromOrder(nextUserSnapshot, grossGold);
      }
    }

    soundEngine.playOrder();
    pushToast(
      'success',
      `Giao đơn cho ${order.customerName} thành công! +${formatNumber(ownerNetGold)} Vàng, +${order.rewardExp} EXP, +2 Vé Sự Kiện.${
        ipoDividendCut > 0
          ? ` (Trích +${formatNumber(ipoDividendCut)}V vào Quỹ Cổ Tức IPO)`
          : ''
      }`
    );
  };

  const handleRefreshNpcOrders = async () => {
    if (!userData) return;
    const bonuses = getBusinessBonuses(userData);
    const refreshed = generateNpcOrders(
      userData.level,
      Date.now(),
      Math.floor(Math.random() * 500),
      bonuses.orderRefreshReductionPct
    );
    await commitUserUpdate((prev) => ({
      ...prev,
      npcOrders: refreshed,
    }));
    soundEngine.playClick();
    pushToast('info', 'Đã làm mới 3 đơn hàng NPC mới.');
  };

  // ==================== SHOP, TREASURES & STORAGE HANDLERS ====================
  const handleBuyBooster = async (boosterId: string) => {
    if (!userData) return;
    const booster = BOOSTERS.find((b) => b.id === boosterId);
    if (!booster) return;

    if (userData.level < booster.minLevel) {
      soundEngine.playError();
      pushToast('warning', `Cần đạt Lv.${booster.minLevel} để mua ${booster.name}.`);
      return;
    }

    if (getTotalInventoryCount(userData.inventory) + 1 > userData.storageCapacity) {
      soundEngine.playError();
      pushToast('error', 'Kho đã đầy, không thể mua thêm vật phẩm.');
      return;
    }

    if (booster.currency === 'gold' && userData.gold < booster.price) {
      soundEngine.playError();
      pushToast('error', 'Bạn không đủ Vàng.');
      return;
    }
    if (booster.currency === 'coins' && userData.dopiCoins < booster.price) {
      soundEngine.playError();
      pushToast('error', 'Bạn không đủ Xu DOPI.');
      return;
    }

    await commitUserUpdate((prev) => ({
      ...prev,
      gold: booster.currency === 'gold' ? prev.gold - booster.price : prev.gold,
      dopiCoins:
        booster.currency === 'coins'
          ? prev.dopiCoins - booster.price
          : prev.dopiCoins,
      inventory: {
        ...prev.inventory,
        [booster.id]: (prev.inventory[booster.id] || 0) + 1,
      },
    }));

    soundEngine.playCoin();
    pushToast('success', `Đã mua +1 ${booster.emoji} ${booster.name}.`);
  };

  const handleBuyTreasure = async (treasureId: string) => {
    if (!userData) return;
    const treasure = TREASURES.find((t) => t.id === treasureId);
    if (!treasure) return;
    if ((userData.treasures ?? []).includes(treasureId)) return;
    if (userData.level < treasure.minLevel) {
      soundEngine.playError();
      pushToast('warning', `Cần đạt Lv.${treasure.minLevel} để sở hữu ${treasure.name}.`);
      return;
    }
    const needCoins = treasure.priceCoins || 0;
    if (userData.gold < treasure.priceGold || userData.dopiCoins < needCoins) {
      soundEngine.playError();
      pushToast('error', 'Không đủ Vàng hoặc Xu DOPI để sở hữu báu vật này.');
      return;
    }

    await commitUserUpdate((prev) => ({
      ...prev,
      gold: prev.gold - treasure.priceGold,
      dopiCoins: prev.dopiCoins - needCoins,
      treasures: [...(prev.treasures ?? []), treasure.id],
    }));

    soundEngine.playFanfare();
    pushToast(
      'success',
      `🎉 Đã sở hữu báu vật ${treasure.emoji} ${treasure.name} (+${formatNumber(treasure.wealthBonus)} Tài Phú)!`
    );
  };

  const handleActivateUtilityItem = async (itemId: string) => {
    if (!userData) return;
    const owned = userData.inventory[itemId] || 0;
    if (owned <= 0) return;

    if (itemId === 'auto_sprinkler_2h') {
      const baseTime = Math.max(Date.now(), userData.autoWaterUntil || 0);
      await commitUserUpdate((prev) => {
        const nextInv = { ...prev.inventory };
        if (owned - 1 <= 0) delete nextInv[itemId];
        else nextInv[itemId] = owned - 1;
        return {
          ...prev,
          inventory: nextInv,
          autoWaterUntil: baseTime + 2 * 3_600_000,
        };
      });
      soundEngine.playFanfare();
      pushToast('success', '🚿 Đã kích hoạt Bình Tưới Tự Động (+2 giờ, -15% thời gian chín)!');
      return;
    }

    if (itemId === 'premium_storage_card') {
      await commitUserUpdate((prev) => {
        const nextInv = { ...prev.inventory };
        if (owned - 1 <= 0) delete nextInv[itemId];
        else nextInv[itemId] = owned - 1;
        return {
          ...prev,
          inventory: nextInv,
          storageCapacity: Math.min(10_000, prev.storageCapacity + PREMIUM_STORAGE_STEP),
        };
      });
      soundEngine.playFanfare();
      pushToast('success', `🪪 Đã dùng Thẻ Kho Cao Cấp: +${PREMIUM_STORAGE_STEP} sức chứa kho!`);
    }
  };

  const handleExpandStorage = async () => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        const cost = calculateStorageUpgradeCost(userData.storageCapacity);
        if (userData.gold < cost) throw new Error(`Cần ${formatNumber(cost)} Vàng.`);
        await commitUserUpdate((prev) => ({
          ...prev,
          gold: prev.gold - cost,
          storageCapacity: prev.storageCapacity + STORAGE_UPGRADE_STEP,
        }));
        soundEngine.playCoin();
        pushToast(
          'success',
          `Đã nâng cấp sức chứa kho lên ${userData.storageCapacity + STORAGE_UPGRADE_STEP}!`
        );
      } else {
        const res = await txExpandStorage(userData.uid);
        soundEngine.playCoin();
        pushToast(
          'success',
          `Mở rộng kho thành công lên ${res.newCapacity} ô (-${formatNumber(res.cost)} Vàng)!`
        );
      }
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể mở rộng kho.');
    }
  };

  const handleSellToNpc = async (itemId: string, quantity: number) => {
    if (!userData) return;
    const owned = userData.inventory[itemId] || 0;
    const sellQty = Math.min(owned, Math.max(1, quantity));
    if (sellQty <= 0) return;

    const now = Date.now();
    const surge = getHourlyMarketSurge(now);
    const bonuses = getBusinessBonuses(userData, now);
    const unitPrice = getItemSellPriceWithSurge(itemId, surge);
    const totalGold = Math.round(
      unitPrice * sellQty * (1 + bonuses.quickSellBonusPct / 100)
    );
    const item = ITEM_CATALOG[itemId];
    const bonusExp = Math.max(3, sellQty * 2);
    const expRes = applyExpAndLevelUp(userData.level, userData.exp, bonusExp);

    await commitUserUpdate((prev) => {
      const nextInv = { ...prev.inventory };
      if (owned - sellQty <= 0) delete nextInv[itemId];
      else nextInv[itemId] = owned - sellQty;
      return {
        ...prev,
        level: expRes.level,
        exp: expRes.exp,
        gold: prev.gold + totalGold,
        inventory: nextInv,
      };
    });

    soundEngine.playCoin();
    pushToast(
      'success',
      `Đã bán ${sellQty} ${item?.name ?? itemId} thu về +${formatNumber(totalGold)} Vàng (+${bonusExp} EXP)${
        bonuses.quickSellBonusPct > 0
          ? ` [Thưởng Kho Vận +${bonuses.quickSellBonusPct}%]`
          : '!'
      }`
    );
  };

  const handleBulkSellToNpc = async (
    itemsToSell: Record<string, number>,
    label: string
  ) => {
    if (!userData) return;
    const entries = Object.entries(itemsToSell).filter(([, q]) => q > 0);
    if (entries.length === 0) return;

    const now = Date.now();
    const surge = getHourlyMarketSurge(now);
    const bonuses = getBusinessBonuses(userData, now);
    let rawGold = 0;
    let totalUnits = 0;
    const nextInv = { ...userData.inventory };

    for (const [itemId, requestedQty] of entries) {
      const owned = nextInv[itemId] || 0;
      const sellQty = Math.min(owned, Math.max(0, Math.floor(requestedQty)));
      if (sellQty <= 0) continue;

      const unitPrice = getItemSellPriceWithSurge(itemId, surge);
      rawGold += unitPrice * sellQty;
      totalUnits += sellQty;

      if (owned - sellQty <= 0) delete nextInv[itemId];
      else nextInv[itemId] = owned - sellQty;
    }

    if (totalUnits <= 0) return;
    const totalGold = Math.round(rawGold * (1 + bonuses.quickSellBonusPct / 100));
    const bonusExp = Math.max(5, totalUnits * 2);
    const expRes = applyExpAndLevelUp(userData.level, userData.exp, bonusExp);

    await commitUserUpdate((prev) => ({
      ...prev,
      level: expRes.level,
      exp: expRes.exp,
      gold: prev.gold + totalGold,
      inventory: nextInv,
    }));

    soundEngine.playCoin();
    pushToast(
      'success',
      `Đã bán nhanh ${label} (×${formatNumber(totalUnits)}) thu về +${formatNumber(totalGold)} Vàng (+${bonusExp} EXP)${
        bonuses.quickSellBonusPct > 0
          ? ` [Thưởng Kho Vận +${bonuses.quickSellBonusPct}%]`
          : ''
      }${expRes.leveledUp ? ` · Lên cấp Lv.${expRes.level}!` : '!'}`
    );
  };

  // ==================== EVENTS & CHALLENGES HANDLERS ====================
  const handleClaimCheckIn = async () => {
    if (!userData) return;
    const today = getTodayDateKey();
    if (userData.lastCheckInDate === today) return;

    const nextDay = (userData.checkInStreak % 7) + 1;
    const reward = CHECKIN_REWARDS.find((r) => r.day === nextDay) ?? CHECKIN_REWARDS[0];

    await commitUserUpdate((prev) => {
      const nextInv = { ...prev.inventory };
      if (reward.itemId && reward.itemQty) {
        nextInv[reward.itemId] = (nextInv[reward.itemId] || 0) + reward.itemQty;
      }
      return {
        ...prev,
        gold: prev.gold + reward.gold,
        dopiCoins: prev.dopiCoins + reward.coins,
        eventTickets: (prev.eventTickets || 0) + reward.tickets,
        checkInStreak: nextDay,
        lastCheckInDate: today,
        inventory: nextInv,
      };
    });

    soundEngine.playFanfare();
    pushToast(
      'success',
      `Điểm danh Ngày ${nextDay} thành công: +${formatNumber(reward.gold)}V, +${reward.tickets} Vé${
        reward.coins > 0 ? `, +${reward.coins} Xu DOPI` : ''
      }!`
    );
  };

  const handleClaimFirstTopup = async () => {
    if (!userData || !userData.hasFirstTopup || userData.firstTopupClaimed) return;

    await commitUserUpdate((prev) => ({
      ...prev,
      firstTopupClaimed: true,
      gold: prev.gold + 15000,
      eventTickets: (prev.eventTickets || 0) + 30,
      inventory: {
        ...prev.inventory,
        super_fertilizer: (prev.inventory.super_fertilizer || 0) + 5,
        mutation_serum: (prev.inventory.mutation_serum || 0) + 3,
        auto_sprinkler_2h: (prev.inventory.auto_sprinkler_2h || 0) + 1,
      },
    }));

    soundEngine.playFanfare();
    pushToast(
      'success',
      '🎁 Đã nhận trọn gói Quà Nạp Đầu: +15.000V, +30 Vé Sự Kiện & bộ vật phẩm siêu cấp!'
    );
  };

  const handleClaimMonthlyMilestone = async (threshold: number) => {
    if (!userData) return;
    const ms = MONTHLY_TOPUP_MILESTONES.find((m) => m.threshold === threshold);
    if (!ms) return;
    const monthKey = getCurrentMonthKey();
    const currentCoins =
      userData.eventMonthKey === monthKey ? userData.eventRechargedCoins : 0;
    if (currentCoins < ms.threshold) return;
    if ((userData.monthlyTopupClaimed ?? []).includes(ms.threshold)) return;

    const alreadyOwnsVehicle =
      ms.rewardVehicleId && (userData.vehicles ?? []).includes(ms.rewardVehicleId);

    await commitUserUpdate((prev) => {
      const nextInv = { ...prev.inventory };
      if (ms.rewardItemId && ms.rewardItemQty) {
        nextInv[ms.rewardItemId] =
          (nextInv[ms.rewardItemId] || 0) + ms.rewardItemQty;
      }
      const nextVehicles =
        ms.rewardVehicleId && !alreadyOwnsVehicle
          ? [...(prev.vehicles ?? []), ms.rewardVehicleId]
          : prev.vehicles ?? [];
      const bonusCompensationGold = alreadyOwnsVehicle ? 100000 : 0;

      return {
        ...prev,
        gold: prev.gold + ms.rewardGold + bonusCompensationGold,
        eventTickets: (prev.eventTickets || 0) + ms.rewardTickets,
        inventory: nextInv,
        vehicles: nextVehicles,
        monthlyTopupClaimed: [...(prev.monthlyTopupClaimed ?? []), ms.threshold],
      };
    });

    soundEngine.playFanfare();
    pushToast('success', `🎉 Đã nhận thưởng ${ms.title}!`);
  };

  const handleRedeemEventShop = async (shopItemId: string) => {
    if (!userData) return;
    const item = EVENT_SHOP_ITEMS.find((i) => i.id === shopItemId);
    if (!item) return;
    if ((userData.eventTickets || 0) < item.ticketCost) {
      soundEngine.playError();
      pushToast('error', 'Không đủ Vé Sự Kiện.');
      return;
    }

    await commitUserUpdate((prev) => {
      const nextInv = { ...prev.inventory };
      if (item.itemId && item.itemQty) {
        nextInv[item.itemId] = (nextInv[item.itemId] || 0) + item.itemQty;
      }
      return {
        ...prev,
        eventTickets: (prev.eventTickets || 0) - item.ticketCost,
        gold: prev.gold + (item.goldReward || 0),
        reputation: (prev.reputation || 0) + (item.reputationReward || 0),
        inventory: nextInv,
      };
    });

    soundEngine.playCoin();
    pushToast('success', `Đổi thành công ${item.emoji} ${item.name}!`);
  };

  const handleDeliverRushOrder = async () => {
    if (!userData || !userData.rushOrder || userData.rushOrder.completed) return;
    const rush = userData.rushOrder;
    if (rush.expiresAt <= Date.now()) {
      soundEngine.playError();
      pushToast('warning', 'Đơn khẩn cấp đã hết hạn, hãy bấm làm mới.');
      return;
    }

    for (const [itemId, qty] of Object.entries(rush.items)) {
      if ((userData.inventory[itemId] || 0) < qty) {
        soundEngine.playError();
        pushToast('error', 'Kho chưa đủ nông sản cho Đơn Khẩn Cấp.');
        return;
      }
    }

    const nextInv = { ...userData.inventory };
    for (const [itemId, qty] of Object.entries(rush.items)) {
      const rem = (nextInv[itemId] || 0) - qty;
      if (rem <= 0) delete nextInv[itemId];
      else nextInv[itemId] = rem;
    }

    const bonuses = getBusinessBonuses(userData);
    const finalGold = Math.round(
      rush.rewardGold * (1 + bonuses.orderRewardBonusPct / 100)
    );
    const expRes = applyExpAndLevelUp(userData.level, userData.exp, rush.rewardExp);

    await commitUserUpdate((prev) => ({
      ...prev,
      level: expRes.level,
      exp: expRes.exp,
      gold: prev.gold + finalGold,
      reputation: (prev.reputation || 0) + rush.rewardReputation,
      eventTickets: (prev.eventTickets || 0) + rush.rewardTickets,
      inventory: nextInv,
      rushOrder: prev.rushOrder ? { ...prev.rushOrder, completed: true } : null,
      stats: {
        ...prev.stats,
        totalOrdersDone: (prev.stats?.totalOrdersDone || 0) + 1,
      },
    }));

    soundEngine.playFanfare();
    pushToast(
      'success',
      `🔥 Hoàn thành Đơn Khẩn Cấp! +${formatNumber(finalGold)}V, +${rush.rewardReputation} Danh Vọng, +${rush.rewardTickets} Vé!`
    );
  };

  const handleRefreshRushOrder = async () => {
    if (!userData) return;
    const fresh = generateRushOrder(userData.level, Date.now());
    await commitUserUpdate((prev) => ({
      ...prev,
      rushOrder: fresh,
    }));
    soundEngine.playClick();
    pushToast('info', 'Đã nhận Thử Thách Đơn Hàng Khẩn Cấp mới!');
  };

  // ==================== BUSINESS: EMPLOYEES & VEHICLES ====================
  const handleUpgradeEmployee = async (employeeId: EmployeeId) => {
    if (!userData) return;
    const def = EMPLOYEES.find((e) => e.id === employeeId);
    if (!def) return;
    const currentLv = userData.employees?.[employeeId] || 0;
    if (currentLv >= def.maxLevel) return;

    const cost = calculateEmployeeUpgradeCost(employeeId, currentLv);
    if (userData.gold < cost.gold || userData.dopiCoins < cost.coins) {
      soundEngine.playError();
      pushToast('error', 'Không đủ Vàng hoặc Xu DOPI để nâng cấp nhân viên.');
      return;
    }

    await commitUserUpdate((prev) => ({
      ...prev,
      gold: prev.gold - cost.gold,
      dopiCoins: prev.dopiCoins - cost.coins,
      employees: {
        ...prev.employees,
        [employeeId]: currentLv + 1,
      },
    }));

    soundEngine.playFanfare();
    pushToast(
      'success',
      `${def.emoji} ${def.name} đã đạt Lv.${currentLv + 1}! (+${formatNumber(def.wealthPerLevel)} Tài Phú)`
    );
  };

  const handleBuyVehicle = async (vehicleId: string) => {
    if (!userData) return;
    const vehicle = VEHICLES.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    if ((userData.vehicles ?? []).includes(vehicleId)) return;
    if (userData.level < vehicle.minLevel) {
      soundEngine.playError();
      pushToast('warning', `Cần đạt Lv.${vehicle.minLevel} để mua ${vehicle.name}.`);
      return;
    }
    if (userData.gold < vehicle.priceGold || userData.dopiCoins < vehicle.priceCoins) {
      soundEngine.playError();
      pushToast('error', 'Không đủ Vàng hoặc Xu DOPI để mua xe này.');
      return;
    }

    await commitUserUpdate((prev) => ({
      ...prev,
      gold: prev.gold - vehicle.priceGold,
      dopiCoins: prev.dopiCoins - vehicle.priceCoins,
      vehicles: [...(prev.vehicles ?? []), vehicle.id],
    }));

    soundEngine.playFanfare();
    pushToast(
      'success',
      `🎉 Đã rước ${vehicle.emoji} ${vehicle.name} về Showroom (+${formatNumber(vehicle.wealthBonus)} Tài Phú)!`
    );
  };

  // ==================== ENTERPRISE ERP SIMULATION HANDLERS ====================
  const handleDepositCorporateFund = async (amountGold: number) => {
    if (!userData) return;
    const amt = Math.max(100, Math.floor(amountGold));
    if (userData.gold < amt) {
      soundEngine.playError();
      pushToast('error', `Ví cá nhân không đủ ${formatNumber(amt)} Vàng.`);
      return;
    }

    const now = Date.now();
    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const nextFund = ent.corporateFund + amt;
      const entry: EnterpriseLedgerEntry = {
        id: `led_${now}`,
        type: 'deposit',
        title: `Nạp vốn lưu động vào Quỹ Doanh Nghiệp`,
        amountGold: amt,
        isPositive: true,
        createdAt: now,
      };
      return {
        ...prev,
        gold: prev.gold - amt,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
      };
    });

    soundEngine.playCoin();
    pushToast(
      'success',
      `Đã nạp +${formatNumber(amt)} Vàng vào Quỹ Doanh Nghiệp!`
    );
  };

  const handleWithdrawCorporateFund = async (amountGold: number) => {
    if (!userData) return;
    const entCurrent = userData.enterprise ?? createInitialEnterpriseState(Date.now());
    const amt = Math.max(100, Math.floor(amountGold));
    if (entCurrent.corporateFund < amt) {
      soundEngine.playError();
      pushToast('error', `Quỹ Doanh Nghiệp không đủ ${formatNumber(amt)} Vàng.`);
      return;
    }

    const now = Date.now();
    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const nextFund = Math.max(0, ent.corporateFund - amt);
      const entry: EnterpriseLedgerEntry = {
        id: `led_${now}`,
        type: 'withdraw',
        title: `Rút vốn từ Quỹ Doanh Nghiệp về Ví cá nhân`,
        amountGold: amt,
        isPositive: false,
        createdAt: now,
      };
      return {
        ...prev,
        gold: prev.gold + amt,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
      };
    });

    soundEngine.playCoin();
    pushToast(
      'info',
      `Đã rút ${formatNumber(amt)} Vàng từ Quỹ Doanh Nghiệp về Ví cá nhân.`
    );
  };

  const handleUpgradeEnterpriseDept = async (
    dept: 'rd' | 'marketing' | 'operations'
  ) => {
    if (!userData) return;
    const now = Date.now();
    const entCurrent = userData.enterprise ?? createInitialEnterpriseState(now);
    const bonuses = getBusinessBonuses(userData, now);
    const currentLv =
      dept === 'rd'
        ? entCurrent.rdLevel
        : dept === 'marketing'
          ? entCurrent.marketingLevel
          : entCurrent.operationsLevel;
    if (currentLv >= 10) return;

    const cost = calculateDepartmentUpgradeCost(
      currentLv,
      bonuses.deptUpgradeDiscountPct
    );
    if (entCurrent.corporateFund < cost) {
      soundEngine.playError();
      pushToast(
        'error',
        `Quỹ Doanh Nghiệp cần ít nhất ${formatNumber(cost)} Vàng để nâng cấp phòng ban này.`
      );
      return;
    }

    const deptLabel =
      dept === 'rd'
        ? 'Phòng R&D Nông Nghiệp'
        : dept === 'marketing'
          ? 'Phòng Marketing & Thương Hiệu'
          : 'Phòng Vận Hành & Nhân Sự';

    const expRes = applyExpAndLevelUp(userData.level, userData.exp, 150);

    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const nextFund = Math.max(0, ent.corporateFund - cost);
      const entry: EnterpriseLedgerEntry = {
        id: `led_${now}`,
        type: 'dept_upgrade',
        title: `Nâng cấp ${deptLabel} lên Lv.${currentLv + 1}`,
        amountGold: cost,
        isPositive: false,
        createdAt: now,
      };
      return {
        ...prev,
        level: expRes.level,
        exp: expRes.exp,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          rdLevel: dept === 'rd' ? currentLv + 1 : ent.rdLevel,
          marketingLevel:
            dept === 'marketing' ? currentLv + 1 : ent.marketingLevel,
          operationsLevel:
            dept === 'operations' ? currentLv + 1 : ent.operationsLevel,
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
      };
    });

    soundEngine.playFanfare();
    pushToast(
      'success',
      `🏢 Đã nâng cấp ${deptLabel} lên Lv.${currentLv + 1} (+1.500 Tài Phú, +150 EXP)!`
    );
  };

  const handleHireOrUpgradeSpecialist = async (
    specialistId: EnterpriseSpecialistId
  ) => {
    if (!userData) return;
    const def = ENTERPRISE_SPECIALISTS.find((s) => s.id === specialistId);
    if (!def) return;
    const now = Date.now();
    const entCurrent = userData.enterprise ?? createInitialEnterpriseState(now);
    const currentSpecs = entCurrent.specialists ?? createInitialSpecialists();
    const currentLv = Math.max(0, Math.floor(currentSpecs[specialistId] || 0));
    if (currentLv >= def.maxLevel) return;

    const costInfo = calculateSpecialistHireOrUpgradeCost(
      specialistId,
      currentLv,
      entCurrent.headhuntDiscountPct || 0
    );

    if (entCurrent.corporateFund < costInfo.finalCost) {
      soundEngine.playError();
      pushToast(
        'error',
        `Quỹ Doanh Nghiệp cần ${formatNumber(costInfo.finalCost)} Vàng để ${
          currentLv === 0 ? 'tuyển dụng' : 'đào tạo'
        } ${def.name}.`
      );
      return;
    }

    const expGain = 140 + currentLv * 45;
    const expRes = applyExpAndLevelUp(userData.level, userData.exp, expGain);

    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const specs = ent.specialists ?? createInitialSpecialists();
      const nextFund = Math.max(0, ent.corporateFund - costInfo.finalCost);
      const actionTitle =
        currentLv === 0
          ? `Tuyển dụng Chuyên gia ${def.name} (Kỹ năng: ${def.skillName})`
          : `Đào tạo ${def.name} lên Lv.${currentLv + 1} (${def.skillName})`;
      const entry: EnterpriseLedgerEntry = {
        id: `led_spec_${now}`,
        type: 'hire_specialist',
        title: actionTitle,
        amountGold: costInfo.finalCost,
        isPositive: false,
        createdAt: now,
      };
      return {
        ...prev,
        level: expRes.level,
        exp: expRes.exp,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          specialists: {
            ...specs,
            [specialistId]: currentLv + 1,
          },
          headhuntDiscountPct: 0,
          morale: Math.min(100, ent.morale + 3),
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
      };
    });

    soundEngine.playFanfare();
    pushToast(
      'success',
      `${def.emoji} ${
        currentLv === 0 ? 'Đã tuyển dụng' : 'Đã đào tạo'
      } ${def.name} Lv.${currentLv + 1} [Kỹ năng "${def.skillName}" kích hoạt, +${formatNumber(
        def.wealthPerLevel
      )} Tài Phú, +${expGain} EXP]!`
    );
  };

  const handleHeadhuntSpecialist = async () => {
    if (!userData) return;
    const now = Date.now();
    const entCurrent = userData.enterprise ?? createInitialEnterpriseState(now);
    if (entCurrent.corporateFund < HEADHUNT_COST_GOLD) {
      soundEngine.playError();
      pushToast(
        'error',
        `Quỹ Doanh Nghiệp cần ${formatNumber(HEADHUNT_COST_GOLD)} Vàng để Săn Đầu Người.`
      );
      return;
    }

    const rolledDiscount = 14 + Math.floor(Math.random() * 17); // 14%..30%
    const bestDiscount = Math.max(entCurrent.headhuntDiscountPct || 0, rolledDiscount);
    const expRes = applyExpAndLevelUp(userData.level, userData.exp, 50);

    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const nextFund = Math.max(0, ent.corporateFund - HEADHUNT_COST_GOLD);
      const entry: EnterpriseLedgerEntry = {
        id: `led_hh_${now}`,
        type: 'headhunt',
        title: `Chiến dịch Săn Đầu Người (Đàm phán giảm -${bestDiscount}% phí tuyển Chuyên gia)`,
        amountGold: HEADHUNT_COST_GOLD,
        isPositive: false,
        createdAt: now,
      };
      return {
        ...prev,
        level: expRes.level,
        exp: expRes.exp,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          headhuntDiscountPct: bestDiscount,
          headhuntCount: (ent.headhuntCount || 0) + 1,
          morale: Math.min(100, ent.morale + 4),
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
      };
    });

    soundEngine.playCoin();
    pushToast(
      'success',
      `🔍 Đã tìm được hồ sơ Chuyên gia xuất sắc: Giảm ngay -${bestDiscount}% chi phí Quỹ cho lượt Tuyển dụng / Đào tạo tiếp theo (+4% Tinh thần)!`
    );
  };

  const handleLaunchEnterpriseCampaign = async (campaignId: string) => {
    if (!userData) return;
    const camp = ENTERPRISE_CAMPAIGNS.find((c) => c.id === campaignId);
    if (!camp) return;
    const now = Date.now();
    const entCurrent = userData.enterprise ?? createInitialEnterpriseState(now);
    const bonuses = getBusinessBonuses(userData, now);
    const effectiveCost = Math.max(
      500,
      Math.round(camp.costGold * (1 - bonuses.campaignCostReductionPct / 100))
    );
    if (entCurrent.corporateFund < effectiveCost) {
      soundEngine.playError();
      pushToast(
        'error',
        `Quỹ Doanh Nghiệp cần ${formatNumber(effectiveCost)} Vàng để triển khai chiến dịch này.`
      );
      return;
    }

    const expRes = applyExpAndLevelUp(userData.level, userData.exp, 120);

    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const nextFund = Math.max(0, ent.corporateFund - effectiveCost);
      const entry: EnterpriseLedgerEntry = {
        id: `led_${now}`,
        type: 'campaign',
        title: `Triển khai ${camp.name} (${camp.durationHours}h)`,
        amountGold: effectiveCost,
        isPositive: false,
        createdAt: now,
      };
      return {
        ...prev,
        level: expRes.level,
        exp: expRes.exp,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          activeCampaignId: camp.id,
          activeCampaignName: camp.name,
          activeCampaignUntil: now + camp.durationHours * 3_600_000,
          morale: Math.min(100, ent.morale + camp.moraleBoost),
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
      };
    });

    soundEngine.playFanfare();
    pushToast(
      'success',
      `📣 Đã kích hoạt "${camp.name}": +${camp.orderBonusPct}% Đơn NPC / +${camp.wholesaleBonusPct}% B2B trong ${camp.durationHours} giờ!`
    );
  };

  const handleFulfillWholesaleContract = async (contractId: string) => {
    if (!userData) return;
    const contract = WHOLESALE_CONTRACTS.find((c) => c.id === contractId);
    if (!contract) return;
    if (userData.level < contract.minLevel) {
      soundEngine.playError();
      pushToast('warning', `Cần đạt Lv.${contract.minLevel} để ký hợp đồng B2B này.`);
      return;
    }

    for (const [itemId, need] of Object.entries(contract.items)) {
      if ((userData.inventory[itemId] || 0) < need) {
        soundEngine.playError();
        pushToast('error', 'Kho hàng chưa đủ số lượng cho Hợp đồng B2B này.');
        return;
      }
    }

    const now = Date.now();
    const bonuses = getBusinessBonuses(userData, now);
    const boostedGold = Math.round(
      contract.rewardGold * (1 + bonuses.wholesaleBonusPct / 100)
    );
    const boostedFundBonus = Math.round(
      contract.corporateFundBonus *
        (1 + bonuses.corporateFundContractBonusPct / 100)
    );
    const expRes = applyExpAndLevelUp(userData.level, userData.exp, contract.rewardExp);

    await commitUserUpdate((prev) => {
      const nextInv = { ...prev.inventory };
      for (const [itemId, need] of Object.entries(contract.items)) {
        const rem = (nextInv[itemId] || 0) - need;
        if (rem <= 0) delete nextInv[itemId];
        else nextInv[itemId] = rem;
      }
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const nextFund = ent.corporateFund + boostedFundBonus;
      const entry: EnterpriseLedgerEntry = {
        id: `led_${now}`,
        type: 'wholesale',
        title: `Thưởng Quỹ từ ${contract.title} (${contract.partnerName})`,
        amountGold: boostedFundBonus,
        isPositive: true,
        createdAt: now,
      };

      return {
        ...prev,
        level: expRes.level,
        exp: expRes.exp,
        gold: prev.gold + boostedGold,
        reputation: (prev.reputation || 0) + contract.rewardReputation,
        inventory: nextInv,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          totalRevenueGold:
            ent.totalRevenueGold + boostedGold + boostedFundBonus,
          totalContractsDone: ent.totalContractsDone + 1,
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
        stats: {
          ...prev.stats,
          totalOrdersDone: (prev.stats?.totalOrdersDone || 0) + 1,
        },
      };
    });

    soundEngine.playFanfare();
    pushToast(
      'success',
      `🚢 Xuất kho B2B "${contract.title}" thành công: +${formatNumber(boostedGold)}V, +${formatNumber(boostedFundBonus)}V vào Quỹ, +${contract.rewardExp} EXP!${
        expRes.leveledUp ? ` · Thăng cấp Lv.${expRes.level}!` : ''
      }`
    );
  };

  const handlePayMonthlySalary = async () => {
    if (!userData) return;
    const now = Date.now();
    const entCurrent = userData.enterprise ?? createInitialEnterpriseState(now);
    const payroll = calculateMonthlyPayroll(
      userData.employees,
      entCurrent.operationsLevel,
      entCurrent.specialists
    );
    const amount = payroll.netSalary;
    if (amount <= 0) return;

    const payFromFund = entCurrent.corporateFund >= amount;
    if (!payFromFund && userData.gold < amount) {
      soundEngine.playError();
      pushToast(
        'error',
        `Cần ${formatNumber(amount)} Vàng trong Quỹ Doanh Nghiệp hoặc Ví cá nhân để thanh toán lương tháng.`
      );
      return;
    }

    const periodKey = new Date(now).toISOString().slice(0, 7);
    const expRes = applyExpAndLevelUp(userData.level, userData.exp, 100);

    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const useFund = ent.corporateFund >= amount;
      const nextFund = useFund ? ent.corporateFund - amount : ent.corporateFund;
      const entry: EnterpriseLedgerEntry = {
        id: `led_${now}`,
        type: 'payroll',
        title: `Chi trả bảng lương nhân sự kỳ ${periodKey}${
          useFund ? ' (Trích Quỹ DN)' : ' (Từ Ví cá nhân)'
        }`,
        amountGold: amount,
        isPositive: false,
        createdAt: now,
      };
      return {
        ...prev,
        level: expRes.level,
        exp: expRes.exp,
        gold: useFund ? prev.gold : prev.gold - amount,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          lastPayrollPaidAt: now,
          lastPayrollMonth: periodKey,
          morale: Math.min(100, ent.morale + 10),
          totalPayrollPaidGold: ent.totalPayrollPaidGold + amount,
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
      };
    });

    soundEngine.playFanfare();
    pushToast(
      'success',
      `💼 Đã thanh toán ${formatNumber(amount)} Vàng lương nhân sự kỳ ${periodKey} (+10% Tinh thần, +100 EXP)!`
    );
  };

  const handleBonusEmployeeMorale = async () => {
    if (!userData) return;
    const now = Date.now();
    const bonusCost = 1500;
    const entCurrent = userData.enterprise ?? createInitialEnterpriseState(now);
    const useFund = entCurrent.corporateFund >= bonusCost;
    if (!useFund && userData.gold < bonusCost) {
      soundEngine.playError();
      pushToast('error', 'Cần 1.500 Vàng trong Quỹ hoặc Ví để thưởng nóng nhân sự.');
      return;
    }

    const expRes = applyExpAndLevelUp(userData.level, userData.exp, 60);

    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      const fromFund = ent.corporateFund >= bonusCost;
      const nextFund = fromFund ? ent.corporateFund - bonusCost : ent.corporateFund;
      const entry: EnterpriseLedgerEntry = {
        id: `led_${now}`,
        type: 'bonus',
        title: `Thưởng nóng khích lệ tinh thần toàn bộ nhân sự (+12% Morale)`,
        amountGold: bonusCost,
        isPositive: false,
        createdAt: now,
      };
      return {
        ...prev,
        level: expRes.level,
        exp: expRes.exp,
        gold: fromFund ? prev.gold : prev.gold - bonusCost,
        enterprise: {
          ...ent,
          corporateFund: nextFund,
          morale: Math.min(100, ent.morale + 12),
          totalPayrollPaidGold: ent.totalPayrollPaidGold + bonusCost,
          ledger: [entry, ...ent.ledger].slice(0, 15),
        },
      };
    });

    soundEngine.playFanfare();
    pushToast(
      'success',
      '🎁 Đã thưởng nóng nhân sự: +12% Tinh thần làm việc & +60 EXP!'
    );
  };

  const handleToggleAutoPaySalary = async () => {
    if (!userData) return;
    const now = Date.now();
    await commitUserUpdate((prev) => {
      const ent = prev.enterprise ?? createInitialEnterpriseState(now);
      return {
        ...prev,
        enterprise: {
          ...ent,
          autoPaySalary: !ent.autoPaySalary,
        },
      };
    });
    soundEngine.playClick();
  };

  // ==================== P2P MARKETPLACE HANDLERS ====================
  const handleCreateListing = async (
    itemId: string,
    quantity: number,
    currency: CurrencyType,
    price: number
  ) => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        const owned = userData.inventory[itemId] || 0;
        if (owned < quantity) throw new Error('Không đủ hàng trong kho.');
        const now = Date.now();
        const nextInv = { ...userData.inventory };
        if (owned - quantity <= 0) delete nextInv[itemId];
        else nextInv[itemId] = owned - quantity;
        await commitUserUpdate((prev) => ({
          ...prev,
          inventory: nextInv,
          stats: {
            ...prev.stats,
            totalSoldMarket: (prev.stats?.totalSoldMarket || 0) + 1,
          },
        }));
        setMarketListings((prev) => [
          {
            id: `mkt_${now}`,
            sellerUid: userData.uid,
            sellerName: userData.businessName,
            sellerVipLevel: userData.vipLevel,
            itemId,
            quantity,
            currency,
            price,
            status: 'active',
            createdAt: now,
            updatedAt: now,
          },
          ...prev,
        ]);
      } else {
        await txCreateMarketListing(userData.uid, itemId, quantity, currency, price);
      }
      soundEngine.playCoin();
      pushToast('success', 'Đã treo bán mặt hàng lên Chợ P2P thành công!');
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể treo bán.');
    }
  };

  const handleBuyListing = async (listing: MarketListing) => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        if (
          getTotalInventoryCount(userData.inventory) + listing.quantity >
          userData.storageCapacity
        ) {
          throw new Error('Kho không đủ sức chứa.');
        }
        if (listing.currency === 'gold' && userData.gold < listing.price) {
          throw new Error('Không đủ Vàng.');
        }
        if (listing.currency === 'coins' && userData.dopiCoins < listing.price) {
          throw new Error('Không đủ Xu DOPI.');
        }
        const taxInfo = calculateMarketTax(listing.price, listing.sellerVipLevel);
        await commitUserUpdate((prev) => ({
          ...prev,
          gold: listing.currency === 'gold' ? prev.gold - listing.price : prev.gold,
          dopiCoins:
            listing.currency === 'coins'
              ? prev.dopiCoins - listing.price
              : prev.dopiCoins,
          inventory: {
            ...prev.inventory,
            [listing.itemId]:
              (prev.inventory[listing.itemId] || 0) + listing.quantity,
          },
        }));
        setMarketListings((prev) => prev.filter((l) => l.id !== listing.id));
        soundEngine.playCoin();
        pushToast(
          'success',
          `Mua thành công ×${listing.quantity} ${ITEM_CATALOG[listing.itemId]?.name ?? listing.itemId} (Thuế sàn ${taxInfo.taxRatePct}% đã trừ phía người bán).`
        );
      } else {
        const res = await txBuyMarketListing(userData.uid, listing.id);
        soundEngine.playCoin();
        pushToast(
          'success',
          `Mua thành công ×${res.quantity} ${ITEM_CATALOG[res.itemId]?.name ?? res.itemId} trên Chợ P2P!`
        );
      }
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Giao dịch mua thất bại.');
    }
  };

  const handleCancelListing = async (listingId: string) => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        const target = marketListings.find((l) => l.id === listingId);
        if (!target) return;
        setMarketListings((prev) => prev.filter((l) => l.id !== listingId));
        await commitUserUpdate((prev) => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            [target.itemId]:
              (prev.inventory[target.itemId] || 0) + target.quantity,
          },
        }));
      } else {
        await txCancelMarketListing(userData.uid, listingId);
      }
      soundEngine.playClick();
      pushToast('info', 'Đã hủy đơn treo bán và hoàn vật phẩm về kho.');
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể hủy đơn.');
    }
  };

  // ==================== INVESTMENT & P2P EXCHANGE HANDLERS ====================
  const handleBuyNpcStock = async (code: StockCode, quantity: number) => {
    if (!userData) return;
    const safeQty = Math.max(1, Math.floor(quantity));
    const now = Date.now();
    const snap = getStockMarketSnapshot(code, now);
    const trade = calculateBuyTrade(snap.currentPrice, safeQty, userData.vipLevel);
    const isCoin = snap.def.currency === 'coins';

    if (isCoin && userData.dopiCoins < trade.totalCost) {
      soundEngine.playError();
      pushToast('error', `Không đủ Xu DOPI (cần ${formatNumber(trade.totalCost)} Xu gồm phí).`);
      return;
    }
    if (!isCoin && userData.gold < trade.totalCost) {
      soundEngine.playError();
      pushToast('error', `Không đủ Vàng (cần ${formatNumber(trade.totalCost)} Vàng gồm phí).`);
      return;
    }

    await commitUserUpdate((prev) => {
      const inv = normalizeUserInvestments(prev.investments);
      const prevH = inv.npcHoldings[code];
      const prevShares = prevH?.shares || 0;
      const prevCost = prevShares * (prevH?.avgBuyPrice || 0);
      const nextShares = prevShares + safeQty;
      const nextAvg = Number(((prevCost + trade.totalCost) / nextShares).toFixed(2));

      return {
        ...prev,
        gold: isCoin ? prev.gold : prev.gold - trade.totalCost,
        dopiCoins: isCoin ? prev.dopiCoins - trade.totalCost : prev.dopiCoins,
        investments: {
          ...inv,
          npcHoldings: {
            ...inv.npcHoldings,
            [code]: {
              shares: nextShares,
              avgBuyPrice: nextAvg,
              lockedUntil: now + INVESTMENT_LOCKUP_MS,
            },
          },
          totalInvested: inv.totalInvested + trade.totalCost,
        },
      };
    });

    soundEngine.playOrder();
    pushToast(
      'success',
      `Khớp lệnh Mua ${safeQty} ${code} với tổng ${formatNumber(trade.totalCost)} ${
        isCoin ? 'Xu DOPI' : 'Vàng'
      } (phí ${trade.feePct}%).`
    );
  };

  const handleSellNpcStock = async (code: StockCode, quantity: number) => {
    if (!userData) return;
    const safeQty = Math.max(1, Math.floor(quantity));
    const now = Date.now();
    const inv = normalizeUserInvestments(userData.investments);
    const holding = inv.npcHoldings[code];

    if (!holding || holding.shares < safeQty) {
      soundEngine.playError();
      pushToast('error', `Bạn không đủ cổ phiếu ${code} để bán.`);
      return;
    }
    if (holding.lockedUntil > now) {
      soundEngine.playError();
      pushToast('warning', `Cổ phiếu ${code} đang khóa lệnh T+30 phút.`);
      return;
    }

    const snap = getStockMarketSnapshot(code, now);
    const trade = calculateSellTrade(snap.currentPrice, safeQty, userData.vipLevel);
    const isCoin = snap.def.currency === 'coins';
    const profit = trade.netProceeds - Math.round(holding.avgBuyPrice * safeQty);

    await commitUserUpdate((prev) => {
      const prevInv = normalizeUserInvestments(prev.investments);
      const cur = prevInv.npcHoldings[code];
      if (!cur) return prev;
      const nextNpcHoldings = { ...prevInv.npcHoldings };
      if (cur.shares - safeQty <= 0) {
        delete nextNpcHoldings[code];
      } else {
        nextNpcHoldings[code] = { ...cur, shares: cur.shares - safeQty };
      }

      return {
        ...prev,
        gold: isCoin ? prev.gold : prev.gold + trade.netProceeds,
        dopiCoins: isCoin ? prev.dopiCoins + trade.netProceeds : prev.dopiCoins,
        investments: {
          ...prevInv,
          npcHoldings: nextNpcHoldings,
          realizedProfit: prevInv.realizedProfit + (isCoin ? 0 : profit),
        },
      };
    });

    soundEngine.playCoin();
    pushToast(
      'success',
      `Khớp lệnh Bán ${safeQty} ${code} thu về +${formatNumber(trade.netProceeds)} ${
        isCoin ? 'Xu DOPI' : 'Vàng'
      } (đã trừ phí ${trade.feePct}%).`
    );
  };

  const handleToggleMyIpo = async (dividendRate: number, isListed: boolean) => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        const updated = buildP2PCompanyPayload(
          userData,
          dividendRate,
          isListed,
          myP2PCompany,
          Date.now()
        );
        setMyP2PCompany(updated);
        setP2pCompanies((prev) => {
          const others = prev.filter((c) => c.ownerUid !== userData.uid);
          return isListed ? [updated, ...others] : others;
        });
      } else {
        const saved = await upsertMyP2PCompanyIpo(userData, dividendRate, isListed);
        setMyP2PCompany(saved);
      }
      soundEngine.playFanfare();
      pushToast(
        'success',
        isListed
          ? `Đã niêm yết IPO "${userData.businessName}" (cam kết cổ tức ${dividendRate}% đơn hàng NPC)!`
          : 'Đã tạm ngừng gọi vốn IPO doanh nghiệp.'
      );
    } catch (err) {
      soundEngine.playError();
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Không thể cập nhật trạng thái IPO.'
      );
    }
  };

  const handleBuyP2PShares = async (ownerUid: string, quantity: number) => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        const target = p2pCompanies.find((c) => c.ownerUid === ownerUid);
        if (!target || !target.isListed) throw new Error('Doanh nghiệp không khả dụng.');
        if (target.ownerUid === userData.uid) {
          throw new Error('Không thể tự mua cổ phần của chính mình.');
        }
        const safeQty = Math.max(1, Math.floor(quantity));
        if (target.availableShares < safeQty) {
          throw new Error(`Chỉ còn ${target.availableShares} cổ phần mở bán.`);
        }
        const now = Date.now();
        const eff = getEffectiveP2PCompanyState(target, now);
        const trade = calculateBuyTrade(eff.sharePrice, safeQty, userData.vipLevel);
        if (userData.gold < trade.totalCost) {
          throw new Error(`Không đủ Vàng (cần ${formatNumber(trade.totalCost)}V).`);
        }

        setP2pCompanies((prev) =>
          prev.map((c) =>
            c.ownerUid === ownerUid
              ? { ...c, availableShares: c.availableShares - safeQty }
              : c
          )
        );
        await commitUserUpdate((prev) => {
          const inv = normalizeUserInvestments(prev.investments);
          const cur = inv.p2pHoldings[ownerUid];
          const prevShares = cur?.shares || 0;
          const prevCost = prevShares * (cur?.avgBuyPrice || 0);
          const nextShares = prevShares + safeQty;
          return {
            ...prev,
            gold: prev.gold - trade.totalCost,
            investments: {
              ...inv,
              p2pHoldings: {
                ...inv.p2pHoldings,
                [ownerUid]: {
                  ownerUid,
                  businessName: target.businessName,
                  shares: nextShares,
                  avgBuyPrice: Number(
                    ((prevCost + trade.totalCost) / nextShares).toFixed(2)
                  ),
                  lockedUntil: now + INVESTMENT_LOCKUP_MS,
                },
              },
              totalInvested: inv.totalInvested + trade.totalCost,
            },
          };
        });
        soundEngine.playOrder();
        pushToast(
          'success',
          `Đã đầu tư mua ${safeQty} cổ phần ${target.businessName} (-${formatNumber(trade.totalCost)}V gồm phí ${trade.feePct}%).`
        );
        return;
      }

      const res = await txBuyP2PShares(userData.uid, ownerUid, quantity);
      soundEngine.playOrder();
      pushToast(
        'success',
        `Đã mua ${res.quantity} cổ phần ${res.businessName} (-${formatNumber(res.totalCost)}V gồm phí sàn).`
      );
    } catch (err) {
      soundEngine.playError();
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Không thể mua cổ phần P2P.'
      );
    }
  };

  const handleSellP2PShares = async (ownerUid: string, quantity: number) => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        const now = Date.now();
        const inv = normalizeUserInvestments(userData.investments);
        const holding = inv.p2pHoldings[ownerUid];
        const safeQty = Math.max(1, Math.floor(quantity));
        if (!holding || holding.shares < safeQty) {
          throw new Error('Không đủ cổ phần để bán.');
        }
        if (holding.lockedUntil > now) {
          throw new Error('Cổ phần đang khóa lệnh T+30 phút.');
        }
        const target = p2pCompanies.find((c) => c.ownerUid === ownerUid);
        const unitPrice = target
          ? getEffectiveP2PCompanyState(target, now).sharePrice
          : Math.round(holding.avgBuyPrice);
        const trade = calculateSellTrade(unitPrice, safeQty, userData.vipLevel);
        const profit = trade.netProceeds - Math.round(holding.avgBuyPrice * safeQty);

        setP2pCompanies((prev) =>
          prev.map((c) =>
            c.ownerUid === ownerUid
              ? {
                  ...c,
                  availableShares: Math.min(
                    P2P_MAX_PUBLIC_SHARES,
                    c.availableShares + safeQty
                  ),
                }
              : c
          )
        );

        await commitUserUpdate((prev) => {
          const prevInv = normalizeUserInvestments(prev.investments);
          const nextMap = { ...prevInv.p2pHoldings };
          if (holding.shares - safeQty <= 0) delete nextMap[ownerUid];
          else nextMap[ownerUid] = { ...holding, shares: holding.shares - safeQty };
          return {
            ...prev,
            gold: prev.gold + trade.netProceeds,
            investments: {
              ...prevInv,
              p2pHoldings: nextMap,
              realizedProfit: prevInv.realizedProfit + profit,
            },
          };
        });
        soundEngine.playCoin();
        pushToast(
          'success',
          `Đã bán ${safeQty} cổ phần ${holding.businessName} thu về +${formatNumber(trade.netProceeds)} Vàng!`
        );
        return;
      }

      const res = await txSellP2PShares(userData.uid, ownerUid, quantity);
      soundEngine.playCoin();
      pushToast(
        'success',
        `Đã bán ${res.quantity} cổ phần ${res.businessName} thu về +${formatNumber(res.netProceeds)} Vàng!`
      );
    } catch (err) {
      soundEngine.playError();
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Không thể bán cổ phần P2P.'
      );
    }
  };

  const handleClaimDividends = async () => {
    if (!userData) return;
    const now = Date.now();
    const snaps = getAllStockSnapshots(now).reduce(
      (acc, s) => {
        acc[s.def.code] = s;
        return acc;
      },
      {} as Record<StockCode, StockMarketSnapshot>
    );

    try {
      if (isSandboxMode) {
        const inv = normalizeUserInvestments(userData.investments);
        const div = calculateClaimableDividends(inv, snaps, p2pCompanies, now);
        if (!div.canClaim) {
          throw new Error('Chưa đến kỳ nhận cổ tức hoặc chưa có cổ tức khả dụng.');
        }

        // Deduct claimed P2P dividend share from each company's dividendPool
        setP2pCompanies((prev) =>
          prev.map((comp) => {
            const h = inv.p2pHoldings[comp.ownerUid];
            if (!h) return comp;
            const payout = calculateP2PShareholderDividend(comp, h.shares);
            return payout > 0
              ? { ...comp, dividendPool: Math.max(0, comp.dividendPool - payout) }
              : comp;
          })
        );

        await commitUserUpdate((prev) => ({
          ...prev,
          gold: prev.gold + div.totalGold,
          dopiCoins: prev.dopiCoins + div.totalCoins,
          investments: {
            ...normalizeUserInvestments(prev.investments),
            lastDividendClaimAt: now,
          },
        }));

        soundEngine.playFanfare();
        pushToast(
          'success',
          `Nhận cổ tức thành công: +${formatNumber(div.totalGold)} Vàng${
            div.totalCoins > 0 ? ` & +${formatNumber(div.totalCoins)} Xu DOPI` : ''
          }! (NPC: +${formatNumber(div.npcGoldDividend)}V · P2P: +${formatNumber(div.p2pGoldDividend)}V)`
        );
        return;
      }

      const res = await txClaimDividends(userData.uid, snaps);
      soundEngine.playFanfare();
      pushToast(
        'success',
        `Nhận cổ tức thành công: +${formatNumber(res.totalGold)} Vàng${
          res.totalCoins > 0 ? ` & +${formatNumber(res.totalCoins)} Xu DOPI` : ''
        }!`
      );
    } catch (err) {
      soundEngine.playError();
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Không thể nhận cổ tức lúc này.'
      );
    }
  };

  const handleVisitCompanyFarm = async (
    ownerUid: string
  ): Promise<PublicFarmData | null> => {
    if (isSandboxMode) {
      const found =
        serverLeaderboard.find((f) => f.uid === ownerUid) ||
        friendsFarms.find((f) => f.uid === ownerUid) ||
        null;
      if (!found) {
        pushToast('info', 'Không tìm thấy dữ liệu nông trại công khai của doanh nghiệp này.');
      }
      return found;
    }
    try {
      const farm = await fetchPublicFarmByUid(ownerUid);
      if (!farm) {
        pushToast('info', 'Doanh nghiệp này chưa đồng bộ bản xem trước nông trại.');
      }
      return farm;
    } catch (err) {
      console.error(err);
      pushToast('error', 'Không thể mở nông trại để kiểm chứng lúc này.');
      return null;
    }
  };

  // ==================== FRIENDS HANDLERS ====================
  const handleSearchPlayer = async (query: string) => {
    if (isSandboxMode) {
      const q = query.trim().toLowerCase();
      return (
        friendsFarms.find(
          (f) =>
            f.uid.toLowerCase() === q ||
            f.businessName.toLowerCase().includes(q)
        ) ?? null
      );
    }
    try {
      return await findPlayerByUidOrEmail(query);
    } catch (err) {
      pushToast('error', 'Không thể tìm kiếm người chơi lúc này.');
      console.error(err);
      return null;
    }
  };

  const handleSendFriendRequest = async (toUid: string) => {
    if (!userData) return;
    try {
      if (!isSandboxMode) {
        await sendFriendRequest(userData, toUid);
      }
      soundEngine.playClick();
      pushToast('success', 'Đã gửi lời mời kết bạn!');
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể gửi lời mời.');
    }
  };

  const handleRespondRequest = async (req: FriendRequestDoc, accept: boolean) => {
    if (!userData) return;
    try {
      setIncomingReqs((prev) => prev.filter((r) => r.id !== req.id));
      if (isSandboxMode) {
        if (accept) {
          await commitUserUpdate((prev) => ({
            ...prev,
            friends: Array.from(new Set([...prev.friends, req.fromUid])),
          }));
          setFriendsFarms((prev) => [
            ...prev.filter((f) => f.uid !== req.fromUid),
            {
              uid: req.fromUid,
              isPublic: true,
              businessName: req.fromName,
              displayName: req.fromName,
              avatarEmoji: '🌻',
              level: 3,
              vipLevel: 1,
              wealthScore: 5400,
              vehicles: [],
              treasures: [],
              farmPlots: [
                {
                  id: 0,
                  cropId: 'tomato',
                  plantedAt: Date.now() - 20_000,
                  readyAt: Date.now() + 55_000,
                  wateredBy: null,
                  wateredAt: null,
                },
              ],
              updatedAt: Date.now(),
            },
          ]);
        }
      } else {
        const nextFriends = await respondFriendRequest(req, accept, userData);
        if (accept) {
          setUserData((prev) =>
            prev
              ? {
                  ...prev,
                  friends: nextFriends,
                  updatedAt: Date.now(),
                }
              : prev
          );
          const farms = await fetchPublicFarmsByUids(nextFriends);
          setFriendsFarms(farms);
        }
      }
      soundEngine.playClick();
      pushToast(
        accept ? 'success' : 'info',
        accept
          ? `Đã kết bạn với ${req.fromName}!`
          : `Đã từ chối lời mời của ${req.fromName}.`
      );
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể xử lý lời mời.');
    }
  };

  const handleWaterFriendPlot = async (
    friendUid: string,
    plotId: number
  ): Promise<PublicFarmData | null> => {
    if (!userData) return null;
    try {
      if (isSandboxMode) {
        if (userData.helpCountToday >= MAX_FRIEND_HELPS_PER_DAY) {
          throw new Error(
            `Bạn đã tưới tối đa ${MAX_FRIEND_HELPS_PER_DAY} lần hôm nay.`
          );
        }
        let updatedFarm: PublicFarmData | null = null;
        const now = Date.now();
        const updateFarmList = (list: PublicFarmData[]) =>
          list.map((farm) => {
            if (farm.uid !== friendUid) return farm;
            const nextPlots = farm.farmPlots.map((p) => {
              if (p.id !== plotId || !p.readyAt) return p;
              const rem = Math.max(0, p.readyAt - now);
              return {
                ...p,
                readyAt: Math.round(p.readyAt - rem * FRIEND_WATER_REDUCTION_RATIO),
                wateredBy: userData.uid,
                wateredAt: now,
              };
            });
            updatedFarm = { ...farm, farmPlots: nextPlots, updatedAt: now };
            return updatedFarm;
          });

        setFriendsFarms(updateFarmList);
        setServerLeaderboard(updateFarmList);
        await commitUserUpdate((prev) => ({
          ...prev,
          gold: prev.gold + FRIEND_HELP_REWARD_GOLD,
          helpCountToday: prev.helpCountToday + 1,
          dailyQuests: prev.dailyQuests.map((q) =>
            q.type === 'help_friend'
              ? { ...q, progress: Math.min(q.target, q.progress + 1) }
              : q
          ),
          stats: {
            ...prev.stats,
            totalFriendsHelped: (prev.stats?.totalFriendsHelped || 0) + 1,
          },
        }));
        soundEngine.playCoin();
        pushToast(
          'success',
          `Đã tưới cây giúp bạn bè! Nhận +${FRIEND_HELP_REWARD_GOLD} Vàng.`
        );
        return updatedFarm;
      }

      const updated = await txWaterFriendPlot(userData.uid, friendUid, plotId);
      setFriendsFarms((prev) =>
        prev.map((f) => (f.uid === friendUid ? updated : f))
      );
      setServerLeaderboard((prev) =>
        prev.map((f) => (f.uid === friendUid ? updated : f))
      );
      soundEngine.playCoin();
      pushToast(
        'success',
        `Tưới cây thành công! Bạn nhận +${FRIEND_HELP_REWARD_GOLD} Vàng.`
      );
      return updated;
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể tưới cây.');
      return null;
    }
  };

  const handleSendChatMessage = useCallback(
    async (recipientUid: string, text: string) => {
      if (!userData) return;
      const cleaned = text.trim().slice(0, 280);
      if (!cleaned) return;
      const now = Date.now();
      const optimisticMsg: FriendChatMessage = {
        id: `msg_${now}_${Math.random().toString(36).slice(2, 6)}`,
        chatId: buildFriendChatId(userData.uid, recipientUid),
        senderUid: userData.uid,
        senderName:
          userData.businessName ||
          userData.profile?.displayName ||
          'Nông Trại DOPI',
        senderAvatar: userData.profile?.avatarEmoji || '🧑‍🌾',
        recipientUid,
        text: cleaned,
        createdAt: now,
      };

      setChatMessages((prev) => [...prev, optimisticMsg]);
      soundEngine.playClick();

      if (!isSandboxMode) {
        try {
          await sendFriendChatMessage({
            senderUid: userData.uid,
            senderName:
              userData.businessName ||
              userData.profile?.displayName ||
              'Nông Trại DOPI',
            senderAvatar: userData.profile?.avatarEmoji || '🧑‍🌾',
            recipientUid,
            text: cleaned,
          });
        } catch (err) {
          console.error('Send friend chat error:', err);
          pushToast('error', 'Không thể gửi tin nhắn lúc này.');
        }
      }
    },
    [userData, isSandboxMode, pushToast]
  );

  // ==================== QUESTS & ACHIEVEMENTS HANDLERS ====================
  const handleClaimDailyQuest = async (questId: string) => {
    if (!userData) return;
    const quest = userData.dailyQuests.find((q) => q.id === questId);
    if (!quest || quest.claimed || quest.progress < quest.target) return;

    await commitUserUpdate((prev) => ({
      ...prev,
      gold: prev.gold + quest.rewardGold,
      dopiCoins: prev.dopiCoins + quest.rewardCoins,
      dailyQuests: prev.dailyQuests.map((q) =>
        q.id === questId ? { ...q, claimed: true } : q
      ),
    }));

    soundEngine.playCoin();
    pushToast(
      'success',
      `Nhận thưởng nhiệm vụ: +${formatNumber(quest.rewardGold)} Vàng & +${quest.rewardCoins} Xu DOPI!`
    );
  };

  const handleClaimAchievement = async (achId: string) => {
    if (!userData) return;
    const ach = ACHIEVEMENTS.find((a) => a.id === achId);
    if (!ach) return;
    if (userData.achievements?.[achId]?.claimed) return;
    if ((userData.stats?.[ach.statKey] || 0) < ach.target) return;

    await commitUserUpdate((prev) => ({
      ...prev,
      gold: prev.gold + ach.rewardGold,
      dopiCoins: prev.dopiCoins + ach.rewardCoins,
      achievements: {
        ...prev.achievements,
        [achId]: { claimed: true },
      },
    }));

    soundEngine.playFanfare();
    pushToast(
      'success',
      `Hoàn thành thành tựu "${ach.title}": +${formatNumber(ach.rewardGold)} Vàng & +${ach.rewardCoins} Xu DOPI!`
    );
  };

  // ==================== DIRECT TOP-UP, REDEEM CODE & ADMIN HANDLERS ====================
  const handleCreateTopupRequest = async (params: {
    amount: number;
    transferCode: string;
    note: string;
  }) => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        const now = Date.now();
        const newReq: TopupRequestDoc = {
          id: `topup_${now}`,
          uid: userData.uid,
          email: userData.email,
          businessName: userData.businessName,
          amount: Math.floor(params.amount),
          transferCode: params.transferCode.trim().toUpperCase(),
          note: params.note.trim().slice(0, 200),
          status: 'pending',
          rejectReason: '',
          createdAt: now,
          processedAt: 0,
        };
        setMyTopupRequests((prev) => [newReq, ...prev]);
        setAllTopupRequests((prev) => [newReq, ...prev]);
      } else {
        await createTopupRequest({
          uid: userData.uid,
          email: userData.email,
          businessName: userData.businessName,
          amount: params.amount,
          transferCode: params.transferCode,
          note: params.note,
        });
      }
      soundEngine.playOrder();
      pushToast(
        'success',
        `Đã tạo lệnh nạp +${formatNumber(params.amount)} Xu (${params.transferCode}). Chờ Admin duyệt!`
      );
    } catch (err) {
      soundEngine.playError();
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Không thể tạo lệnh nạp Xu.'
      );
    }
  };

  const handleAdminApproveTopup = async (reqId: string) => {
    if (!isAdmin) return;
    try {
      if (isSandboxMode) {
        const target = allTopupRequests.find((r) => r.id === reqId);
        if (!target || target.status !== 'pending') {
          throw new Error('Lệnh nạp đã được xử lý trước đó.');
        }
        const now = Date.now();
        const monthKey = getCurrentMonthKey(now);
        const markApproved = (list: TopupRequestDoc[]) =>
          list.map((r) =>
            r.id === reqId ? { ...r, status: 'approved' as const, processedAt: now } : r
          );
        setAllTopupRequests(markApproved);
        setMyTopupRequests(markApproved);

        if (userData && target.uid === userData.uid) {
          const nextTotal = (userData.totalRechargedCoins || 0) + target.amount;
          const nextVip = calculateVipLevel(nextTotal);
          const nextEventRecharged =
            (userData.eventMonthKey === monthKey ? userData.eventRechargedCoins : 0) +
            target.amount;
          await commitUserUpdate((prev) => ({
            ...prev,
            dopiCoins: prev.dopiCoins + target.amount,
            totalRechargedCoins: nextTotal,
            vipLevel: nextVip,
            eventRechargedCoins: nextEventRecharged,
            eventMonthKey: monthKey,
            hasFirstTopup: true,
          }));
        }
        soundEngine.playFanfare();
        pushToast(
          'success',
          `Đã duyệt lệnh ${target.transferCode}: +${formatNumber(target.amount)} Xu DOPI cho ${target.businessName}!`
        );
        return;
      }

      const res = await txApproveTopupRequest(reqId);
      soundEngine.playFanfare();
      pushToast(
        'success',
        `Đã duyệt nạp +${formatNumber(res.amount)} Xu DOPI cho ${res.businessName} (VIP ${res.newVipLevel})!`
      );
    } catch (err) {
      soundEngine.playError();
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Không thể duyệt lệnh nạp.'
      );
    }
  };

  const handleAdminRejectTopup = async (reqId: string, reason: string) => {
    if (!isAdmin) return;
    const cleanReason =
      reason.trim() || 'Không tìm thấy giao dịch chuyển khoản tương ứng.';
    try {
      if (isSandboxMode) {
        const now = Date.now();
        const markRejected = (list: TopupRequestDoc[]) =>
          list.map((r) =>
            r.id === reqId
              ? {
                  ...r,
                  status: 'rejected' as const,
                  rejectReason: cleanReason,
                  processedAt: now,
                }
              : r
          );
        setAllTopupRequests(markRejected);
        setMyTopupRequests(markRejected);
      } else {
        await rejectTopupRequest(reqId, cleanReason);
      }
      soundEngine.playClick();
      pushToast('info', 'Đã từ chối lệnh nạp Xu.');
    } catch (err) {
      soundEngine.playError();
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Không thể từ chối lệnh nạp.'
      );
    }
  };

  const handleRedeemCode = async (code: string) => {
    if (!userData) return;
    try {
      if (isSandboxMode) {
        const target = adminCodes.find((c) => c.code === code) ?? null;
        const check = validateRedeemCodeState(target, userData.uid, Date.now());
        if (!check.valid) throw new Error(check.reason);
        const validCode = target as RedeemCodeDoc;
        const nextTotal = userData.totalRechargedCoins + validCode.amount;
        const nextVip = calculateVipLevel(nextTotal);
        setAdminCodes((prev) =>
          prev.map((c) =>
            c.code === code
              ? {
                  ...c,
                  usedCount: c.usedCount + 1,
                  usedBy: [...c.usedBy, userData.uid],
                }
              : c
          )
        );
        await commitUserUpdate((prev) => ({
          ...prev,
          dopiCoins: prev.dopiCoins + validCode.amount,
          totalRechargedCoins: nextTotal,
          vipLevel: nextVip,
        }));
        soundEngine.playFanfare();
        pushToast(
          'success',
          `Nạp thành công +${formatNumber(validCode.amount)} Xu DOPI!${
            nextVip > userData.vipLevel ? ` Chúc mừng thăng hạng VIP ${nextVip}!` : ''
          }`
        );
        return;
      }

      const res = await txRedeemCode(userData.uid, code);
      soundEngine.playFanfare();
      pushToast(
        'success',
        `Nạp thành công +${formatNumber(res.amount)} Xu DOPI!${
          res.newVipLevel > res.prevVipLevel
            ? ` Chúc mừng thăng hạng VIP ${res.newVipLevel}!`
            : ''
        }`
      );
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Mã nạp không hợp lệ.');
    }
  };

  const handleAdminCreateCode = async (params: {
    code: string;
    amount: number;
    maxUses: number;
    expiresAt: number;
  }) => {
    if (!userData || !isAdmin) return;
    try {
      if (isSandboxMode) {
        if (adminCodes.some((c) => c.code === params.code)) {
          throw new Error(`Mã "${params.code}" đã tồn tại.`);
        }
        const docItem: RedeemCodeDoc = {
          code: params.code,
          amount: params.amount,
          maxUses: params.maxUses,
          usedCount: 0,
          usedBy: [],
          expiresAt: params.expiresAt,
          createdBy: userData.email,
          createdAt: Date.now(),
          isActive: true,
        };
        setAdminCodes((prev) => [docItem, ...prev]);
      } else {
        await createRedeemCode({ ...params, createdBy: userData.email });
      }
      soundEngine.playCoin();
      pushToast(
        'success',
        `Đã phát hành mã ${params.code} (+${formatNumber(params.amount)} Xu DOPI).`
      );
    } catch (err) {
      soundEngine.playError();
      pushToast('error', err instanceof Error ? err.message : 'Không thể tạo mã.');
    }
  };

  const handleAdminToggleCode = async (code: string, nextActive: boolean) => {
    if (!isAdmin) return;
    try {
      if (isSandboxMode) {
        setAdminCodes((prev) =>
          prev.map((c) => (c.code === code ? { ...c, isActive: nextActive } : c))
        );
      } else {
        await toggleRedeemCodeActive(code, nextActive);
      }
      soundEngine.playClick();
      pushToast(
        'info',
        nextActive ? `Đã kích hoạt lại mã ${code}.` : `Đã vô hiệu hóa mã ${code}.`
      );
    } catch {
      soundEngine.playError();
      pushToast('error', 'Không thể cập nhật trạng thái mã.');
    }
  };

  const handleAdminDeleteCode = async (code: string) => {
    if (!isAdmin) return;
    try {
      if (isSandboxMode) {
        setAdminCodes((prev) => prev.filter((c) => c.code !== code));
      } else {
        await deleteRedeemCode(code);
      }
      soundEngine.playClick();
      pushToast('info', `Đã xóa mã ${code}.`);
    } catch {
      soundEngine.playError();
      pushToast('error', 'Không thể xóa mã nạp.');
    }
  };

  const handleCopyText = (text: string, label: string) => {
    soundEngine.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => pushToast('success', `Đã sao chép ${label}: ${text}`),
        () => pushToast('info', `${label}: ${text}`)
      );
    } else {
      pushToast('info', `${label}: ${text}`);
    }
  };

  const handleSignOut = async () => {
    if (isSandboxMode) {
      window.location.href = window.location.pathname;
      return;
    }
    if (auth) {
      await signOut(auth);
      setUserData(null);
      pushToast('info', 'Đã đăng xuất khỏi DOPI TOWNE.');
    }
  };

  // ==================== RENDER STATES ====================
  if (!configured && !isSandboxMode) {
    return <SetupGuideScreen />;
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F6F9F2] flex flex-col items-center justify-center gap-4 p-6">
        <BrandCrest size={56} className="animate-float-gentle" />
        <div className="text-center">
          <div className="font-display font-bold text-xl text-emerald-950">
            DOPI TOWNE
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Đang đồng bộ nông trại từ Cloud Firestore...
          </div>
        </div>
      </div>
    );
  }

  if (!isSandboxMode && (!firebaseUser || !firebaseUser.emailVerified || !userData)) {
    return (
      <>
        <AuthScreen
          unverifiedUser={
            firebaseUser && !firebaseUser.emailVerified ? firebaseUser : null
          }
          onRefreshVerification={async () => {
            if (!firebaseUser) return;
            await firebaseUser.reload();
            if (auth?.currentUser?.emailVerified) {
              await auth.currentUser.getIdToken(true).catch(() => undefined);
              const docData = await ensureUserDocument(
                auth.currentUser.uid,
                auth.currentUser.email || '',
                auth.currentUser.displayName || ''
              );
              setFirebaseUser(auth.currentUser);
              setUserData(docData);
              pushToast(
                'success',
                'Xác minh email thành công! Chào mừng đến với DOPI TOWNE.'
              );
            } else {
              pushToast(
                'warning',
                'Email vẫn chưa được xác minh. Hãy bấm liên kết trong hộp thư.'
              );
            }
          }}
          onToast={pushToast}
        />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (!userData) return null;

  const pendingFriendRequests = incomingReqs.filter(
    (r) => r.status === 'pending'
  ).length;
  const claimableQuestsCount =
    userData.dailyQuests.filter((q) => !q.claimed && q.progress >= q.target)
      .length +
    ACHIEVEMENTS.filter(
      (a) =>
        !userData.achievements?.[a.id]?.claimed &&
        (userData.stats?.[a.statKey] || 0) >= a.target
    ).length;

  const todayKey = getTodayDateKey(nowMs);
  const currentMonthKey = getCurrentMonthKey(nowMs);
  const currentMonthCoins =
    userData.eventMonthKey === currentMonthKey
      ? userData.eventRechargedCoins || 0
      : 0;
  const claimableEventsCount =
    (userData.lastCheckInDate !== todayKey ? 1 : 0) +
    (userData.hasFirstTopup && !userData.firstTopupClaimed ? 1 : 0) +
    MONTHLY_TOPUP_MILESTONES.filter(
      (m) =>
        currentMonthCoins >= m.threshold &&
        !(userData.monthlyTopupClaimed ?? []).includes(m.threshold)
    ).length;

  const pendingTopupCount = allTopupRequests.filter(
    (r) => r.status === 'pending'
  ).length;

  return (
    <div className="min-h-screen bg-[#F6F9F2] flex flex-col">
      <HudHeader
        user={userData}
        activeTab={activeTab}
        isAdmin={isAdmin}
        pendingFriendRequests={pendingFriendRequests}
        claimableQuestsCount={claimableQuestsCount}
        claimableEventsCount={claimableEventsCount}
        pendingTopupCount={pendingTopupCount}
        bgmEnabled={bgmEnabled}
        sfxEnabled={sfxEnabled}
        onToggleBgm={handleToggleBgm}
        onToggleSfx={handleToggleSfx}
        onSelectTab={(tab) => {
          soundEngine.playClick();
          setActiveTab(tab);
        }}
        onOpenRedeemModal={() => {
          soundEngine.playClick();
          setShowRedeemModal(true);
        }}
        onOpenAdminPanel={() => {
          soundEngine.playClick();
          setShowAdminModal(true);
        }}
        onUpdateProfile={async (businessName, avatarEmoji) => {
          await commitUserUpdate((prev) => ({
            ...prev,
            businessName,
            profile: { ...prev.profile, avatarEmoji },
          }));
          pushToast('success', 'Đã cập nhật hồ sơ doanh nghiệp!');
        }}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'farm' && (
          <FarmView
            user={userData}
            nowMs={nowMs}
            onPlantPlot={handlePlantPlot}
            onHarvestPlot={handleHarvestPlot}
            onHarvestAll={handleHarvestAll}
            onUseBooster={handleUseBooster}
            onBuyPlot={handleBuyPlot}
          />
        )}

        {activeTab === 'factory' && (
          <FactoryOrdersView
            user={userData}
            nowMs={nowMs}
            onUnlockFactory={handleUnlockFactory}
            onStartRecipe={handleStartRecipe}
            onCollectFactoryItem={handleCollectFactoryItem}
            onUseFactoryOil={handleUseFactoryOil}
            onDeliverNpcOrder={handleDeliverNpcOrder}
            onRefreshNpcOrders={handleRefreshNpcOrders}
          />
        )}

        {activeTab === 'shop' && (
          <ShopStorageView
            user={userData}
            nowMs={nowMs}
            onBuyBooster={handleBuyBooster}
            onBuyTreasure={handleBuyTreasure}
            onActivateUtilityItem={handleActivateUtilityItem}
            onExpandStorage={handleExpandStorage}
            onSellToNpc={handleSellToNpc}
            onBulkSellToNpc={handleBulkSellToNpc}
            onGoToMarketWithItem={(itemId) => {
              setPreselectedMarketItem(itemId);
              setActiveTab('market');
            }}
          />
        )}

        {activeTab === 'market' && (
          <MarketplaceView
            user={userData}
            listings={marketListings}
            preselectedItemId={preselectedMarketItem}
            onClearPreselected={() => setPreselectedMarketItem(null)}
            onCreateListing={handleCreateListing}
            onBuyListing={handleBuyListing}
            onCancelListing={handleCancelListing}
          />
        )}

        {activeTab === 'invest' && (
          <InvestmentView
            user={userData}
            nowMs={nowMs}
            p2pCompanies={p2pCompanies}
            myP2PCompany={myP2PCompany}
            onBuyNpcStock={handleBuyNpcStock}
            onSellNpcStock={handleSellNpcStock}
            onToggleMyIpo={handleToggleMyIpo}
            onBuyP2PShares={handleBuyP2PShares}
            onSellP2PShares={handleSellP2PShares}
            onClaimDividends={handleClaimDividends}
            onVisitCompanyFarm={handleVisitCompanyFarm}
            onWaterFriendPlot={handleWaterFriendPlot}
          />
        )}

        {activeTab === 'events' && (
          <EventsView
            user={userData}
            nowMs={nowMs}
            onClaimCheckIn={handleClaimCheckIn}
            onClaimFirstTopup={handleClaimFirstTopup}
            onClaimMonthlyMilestone={handleClaimMonthlyMilestone}
            onRedeemEventShop={handleRedeemEventShop}
            onDeliverRushOrder={handleDeliverRushOrder}
            onRefreshRushOrder={handleRefreshRushOrder}
            onOpenTopupModal={() => setShowRedeemModal(true)}
          />
        )}

        {activeTab === 'business' && (
          <BusinessView
            user={userData}
            nowMs={
              userData.enterprise?.activeCampaignId &&
              (userData.enterprise?.activeCampaignUntil || 0) > nowMs
                ? nowMs
                : Math.floor(nowMs / 15_000) * 15_000
            }
            onUpgradeEmployee={handleUpgradeEmployee}
            onBuyVehicle={handleBuyVehicle}
            onDepositFund={handleDepositCorporateFund}
            onWithdrawFund={handleWithdrawCorporateFund}
            onUpgradeDepartment={handleUpgradeEnterpriseDept}
            onHireOrUpgradeSpecialist={handleHireOrUpgradeSpecialist}
            onHeadhuntSpecialist={handleHeadhuntSpecialist}
            onLaunchCampaign={handleLaunchEnterpriseCampaign}
            onFulfillWholesaleContract={handleFulfillWholesaleContract}
            onPayMonthlySalary={handlePayMonthlySalary}
            onBonusEmployeeMorale={handleBonusEmployeeMorale}
            onToggleAutoPaySalary={handleToggleAutoPaySalary}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            user={userData}
            nowMs={nowMs}
            serverFarms={serverLeaderboard}
            friendsFarms={friendsFarms}
            loading={loadingLeaderboard}
            onRefreshServer={handleRefreshLeaderboard}
            onWaterFriendPlot={handleWaterFriendPlot}
          />
        )}

        {activeTab === 'friends' && (
          <FriendsView
            user={userData}
            nowMs={nowMs}
            friendsFarms={friendsFarms}
            suggestedFarms={serverLeaderboard}
            incomingRequests={incomingReqs}
            outgoingRequests={outgoingReqs}
            chatMessages={chatMessages.filter(
              (m) =>
                !activeChatFriendUid ||
                m.chatId === buildFriendChatId(userData.uid, activeChatFriendUid)
            )}
            activeChatFriendUid={activeChatFriendUid}
            onSelectChatFriend={setActiveChatFriendUid}
            onSendChatMessage={handleSendChatMessage}
            onSearchPlayer={handleSearchPlayer}
            onSendFriendRequest={handleSendFriendRequest}
            onRespondRequest={handleRespondRequest}
            onWaterFriendPlot={handleWaterFriendPlot}
            onCopyUid={(uid) => handleCopyText(uid, 'UID')}
          />
        )}

        {activeTab === 'quests' && (
          <QuestsVipView
            user={userData}
            onClaimDailyQuest={handleClaimDailyQuest}
            onClaimAchievement={handleClaimAchievement}
            onOpenRedeemModal={() => setShowRedeemModal(true)}
          />
        )}

        {activeTab === 'guide' && (
          <GuideView
            onNavigateTab={(tab) => {
              soundEngine.playClick();
              setActiveTab(tab);
            }}
          />
        )}

        {activeTab === 'donate' && (
          <DonateView
            onNavigateTab={(tab) => {
              soundEngine.playClick();
              setActiveTab(tab);
            }}
            onOpenTopupModal={() => {
              soundEngine.playClick();
              setShowRedeemModal(true);
            }}
          />
        )}
      </main>

      {showRedeemModal && (
        <RedeemCodeModal
          user={userData}
          myTopupRequests={myTopupRequests}
          onClose={() => setShowRedeemModal(false)}
          onRedeem={handleRedeemCode}
          onCreateTopupRequest={handleCreateTopupRequest}
          onCopyText={handleCopyText}
        />
      )}

      {showAdminModal && isAdmin && (
        <AdminPanelModal
          adminEmail={userData.email}
          codes={adminCodes}
          topupRequests={allTopupRequests}
          onClose={() => setShowAdminModal(false)}
          onCreateCode={handleAdminCreateCode}
          onToggleActive={handleAdminToggleCode}
          onDeleteCode={handleAdminDeleteCode}
          onCopyCode={(code) => handleCopyText(code, 'Mã nạp')}
          onApproveTopup={handleAdminApproveTopup}
          onRejectTopup={handleAdminRejectTopup}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
