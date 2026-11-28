import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  logFirestoreListenerError,
  OperationType,
} from '../firebaseConfig';
import {
  FACTORIES,
  FRIEND_HELP_REWARD_GOLD,
  FRIEND_WATER_REDUCTION_RATIO,
  MAX_FRIEND_HELPS_PER_DAY,
  MAX_PLOTS,
  STORAGE_UPGRADE_STEP,
} from '../game/constants';
import {
  calculateMarketTax,
  calculatePlotCost,
  calculateStorageUpgradeCost,
  calculateVipLevel,
  calculateWealthScore,
  createInitialUserData,
  encodeEmailKey,
  generateDailyQuests,
  getCurrentMonthKey,
  getTodayDateKey,
  getTotalInventoryCount,
  normalizePublicFarmData,
  normalizeUserData,
  sanitizeForFirestore,
  validateRedeemCodeState,
} from '../game/economy';
import {
  buildP2PCompanyPayload,
  calculateBuyTrade,
  calculateClaimableDividends,
  calculateP2PShareholderDividend,
  calculateSellTrade,
  createDefaultP2PCompanies,
  DIVIDEND_CYCLE_MS,
  getEffectiveP2PCompanyState,
  INVESTMENT_LOCKUP_MS,
  normalizeUserInvestments,
  P2P_MAX_PUBLIC_SHARES,
  P2P_MIN_IPO_LEVEL,
} from '../game/investment';
import type {
  CurrencyType,
  FactoryId,
  FriendRequestDoc,
  MarketListing,
  P2PCompanyDoc,
  PublicFarmData,
  RedeemCodeDoc,
  StockCode,
  StockMarketSnapshot,
  TopupRequestDoc,
  UserGameData,
} from '../game/types';

function requireDb() {
  if (!db) {
    throw new Error('Firebase chưa được cấu hình.');
  }
  return db;
}

export async function syncPublicProjections(
  user: UserGameData,
  syncEmailDir: boolean = true
): Promise<void> {
  const firestore = requireDb();
  const normalizedUser = normalizeUserData(user);
  const wealthScore = calculateWealthScore(normalizedUser);

  const publicFarm: PublicFarmData = normalizePublicFarmData({
    uid: normalizedUser.uid,
    isPublic: true,
    businessName: normalizedUser.businessName.slice(0, 40),
    displayName: normalizedUser.profile.displayName.slice(0, 60),
    avatarEmoji: normalizedUser.profile.avatarEmoji.slice(0, 16),
    level: Math.floor(normalizedUser.level),
    vipLevel: Math.floor(normalizedUser.vipLevel),
    totalRechargedCoins: Math.floor(normalizedUser.totalRechargedCoins || 0),
    wealthScore,
    vehicles: (normalizedUser.vehicles ?? []).slice(0, 20),
    treasures: (normalizedUser.treasures ?? []).slice(0, 30),
    farmPlots: normalizedUser.farmPlots.slice(0, MAX_PLOTS),
    updatedAt: Date.now(),
  });

  try {
    await setDoc(
      doc(firestore, 'public_farms', normalizedUser.uid),
      sanitizeForFirestore(publicFarm),
      { merge: false }
    );
  } catch (error) {
    logFirestoreListenerError(
      error,
      OperationType.WRITE,
      `public_farms/${normalizedUser.uid}`
    );
  }

  if (!syncEmailDir || !normalizedUser.email) return;

  const emailKey = encodeEmailKey(normalizedUser.email);
  if (!emailKey) return;

  try {
    await setDoc(
      doc(firestore, 'email_directory', emailKey),
      sanitizeForFirestore({
        uid: normalizedUser.uid,
        businessName: publicFarm.businessName,
        displayName: publicFarm.displayName,
        avatarEmoji: publicFarm.avatarEmoji,
        level: publicFarm.level,
        vipLevel: publicFarm.vipLevel,
      }),
      { merge: false }
    );
  } catch (error) {
    logFirestoreListenerError(
      error,
      OperationType.WRITE,
      `email_directory/${emailKey}`
    );
  }
}

export async function ensureUserDocument(
  uid: string,
  email: string,
  displayName: string
): Promise<UserGameData> {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const rawData = snap.data() as Partial<UserGameData>;
      const existing = normalizeUserData({
        ...rawData,
        uid,
        email: rawData.email || email || `${uid}@dopi.local`,
      });
      const today = getTodayDateKey();
      if (existing.lastDailyReset !== today) {
        const refreshed: UserGameData = normalizeUserData({
          ...existing,
          lastDailyReset: today,
          dailyQuests: generateDailyQuests(),
          helpCountToday: 0,
          helpedFriendsToday: [],
          updatedAt: Date.now(),
        });
        await setDoc(userRef, sanitizeForFirestore(refreshed));
        await syncPublicProjections(refreshed, true);
        return refreshed;
      }
      // Persist normalized schema so legacy user documents always have all required fields
      await setDoc(userRef, sanitizeForFirestore(existing));
      await syncPublicProjections(existing, true);
      return existing;
    }

    const fresh = createInitialUserData(uid, email, displayName);
    await setDoc(userRef, sanitizeForFirestore(fresh));
    await syncPublicProjections(fresh, true);
    return fresh;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export function subscribeUserData(
  uid: string,
  onData: (data: UserGameData) => void
): Unsubscribe {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as Partial<UserGameData>;
        onData(
          normalizeUserData({
            ...raw,
            uid,
            email: raw.email || `${uid}@dopi.local`,
          })
        );
      }
    },
    (error) => {
      logFirestoreListenerError(error, OperationType.GET, `users/${uid}`);
    }
  );
}

export function subscribeMyPublicFarm(
  uid: string,
  onData: (farm: PublicFarmData) => void
): Unsubscribe {
  const firestore = requireDb();
  const ref = doc(firestore, 'public_farms', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onData(
          normalizePublicFarmData({
            ...(snap.data() as Partial<PublicFarmData>),
            uid,
          })
        );
      }
    },
    (error) => {
      logFirestoreListenerError(error, OperationType.GET, `public_farms/${uid}`);
    }
  );
}

export async function saveUserState(
  nextUser: UserGameData,
  syncEmailDir: boolean = false
): Promise<void> {
  const firestore = requireDb();
  const payload = normalizeUserData({
    ...nextUser,
    businessName: nextUser.businessName.trim().slice(0, 40) || 'Nông Trại DOPI',
    updatedAt: Date.now(),
  });
  try {
    await setDoc(doc(firestore, 'users', payload.uid), sanitizeForFirestore(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${payload.uid}`);
  }
  await syncPublicProjections(payload, syncEmailDir);
}

/**
 * Giao dịch Nạp Code Xu DOPI bằng Firestore runTransaction() chống cộng đúp tiền
 */
export async function txRedeemCode(
  uid: string,
  rawCode: string
): Promise<{ amount: number; newVipLevel: number; prevVipLevel: number }> {
  const firestore = requireDb();
  const normalizedCode = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{4,40}$/.test(normalizedCode)) {
    throw new Error('Định dạng mã nạp không hợp lệ.');
  }

  const codeRef = doc(firestore, 'redeem_codes', normalizedCode);
  const userRef = doc(firestore, 'users', uid);

  try {
    const result = await runTransaction(firestore, async (tx) => {
      const [codeSnap, userSnap] = await Promise.all([
        tx.get(codeRef),
        tx.get(userRef),
      ]);

      if (!userSnap.exists()) {
        throw new Error('Không tìm thấy hồ sơ người chơi.');
      }

      const codeDoc = codeSnap.exists()
        ? (codeSnap.data() as RedeemCodeDoc)
        : null;
      const check = validateRedeemCodeState(codeDoc, uid, Date.now());
      if (!check.valid) {
        throw new Error(check.reason);
      }

      const validCode = codeDoc as RedeemCodeDoc;
      const userData = normalizeUserData({
        ...(userSnap.data() as Partial<UserGameData>),
        uid,
        email: (userSnap.data() as Partial<UserGameData>).email || `${uid}@dopi.local`,
      });
      const nextTotalRecharged =
        (userData.totalRechargedCoins || 0) + validCode.amount;
      const nextVipLevel = calculateVipLevel(nextTotalRecharged);
      const now = Date.now();

      tx.update(codeRef, {
        usedCount: validCode.usedCount + 1,
        usedBy: [...validCode.usedBy, uid],
      });

      const updatedUser = normalizeUserData({
        ...userData,
        dopiCoins: userData.dopiCoins + validCode.amount,
        totalRechargedCoins: nextTotalRecharged,
        vipLevel: nextVipLevel,
        updatedAt: now,
      });

      tx.set(userRef, sanitizeForFirestore(updatedUser));

      return {
        amount: validCode.amount,
        newVipLevel: nextVipLevel,
        prevVipLevel: userData.vipLevel,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `redeem_codes/${normalizedCode}`
    );
  }
}

/**
 * Mua thêm ô đất bằng Firestore runTransaction()
 */
export async function txBuyNewPlot(
  uid: string
): Promise<{ cost: number; totalPlots: number }> {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', uid);
  try {
    return await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('Không tìm thấy dữ liệu người chơi.');
      const user = normalizeUserData({
        ...(snap.data() as Partial<UserGameData>),
        uid,
        email: (snap.data() as Partial<UserGameData>).email || `${uid}@dopi.local`,
      });
      if (user.farmPlots.length >= MAX_PLOTS) {
        throw new Error('Bạn đã mở khóa tối đa 30 ô đất.');
      }
      const cost = calculatePlotCost(user.farmPlots.length);
      if (user.gold < cost) {
        throw new Error(`Cần ${cost} Vàng để mở ô đất mới.`);
      }
      const nextPlots = [
        ...user.farmPlots,
        {
          id: user.farmPlots.length,
          cropId: null,
          plantedAt: null,
          readyAt: null,
          wateredBy: null,
          wateredAt: null,
          yieldBoosted: false,
          mutationBoosted: false,
        },
      ];
      const updatedUser = normalizeUserData({
        ...user,
        gold: user.gold - cost,
        farmPlots: nextPlots,
        updatedAt: Date.now(),
      });
      tx.set(userRef, sanitizeForFirestore(updatedUser));
      return { cost, totalPlots: nextPlots.length };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Mở rộng kho bằng Firestore runTransaction()
 */
export async function txExpandStorage(
  uid: string
): Promise<{ cost: number; newCapacity: number }> {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', uid);
  try {
    return await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('Không tìm thấy dữ liệu người chơi.');
      const user = normalizeUserData({
        ...(snap.data() as Partial<UserGameData>),
        uid,
        email: (snap.data() as Partial<UserGameData>).email || `${uid}@dopi.local`,
      });
      if (user.storageCapacity >= 5000) {
        throw new Error('Kho đã đạt sức chứa tối đa.');
      }
      const cost = calculateStorageUpgradeCost(user.storageCapacity);
      if (user.gold < cost) {
        throw new Error(`Cần ${cost} Vàng để mở rộng kho.`);
      }
      const newCapacity = user.storageCapacity + STORAGE_UPGRADE_STEP;
      const updatedUser = normalizeUserData({
        ...user,
        gold: user.gold - cost,
        storageCapacity: newCapacity,
        updatedAt: Date.now(),
      });
      tx.set(userRef, sanitizeForFirestore(updatedUser));
      return { cost, newCapacity };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Mở khóa nhà máy bằng Firestore runTransaction()
 */
export async function txUnlockFactory(
  uid: string,
  factoryId: FactoryId
): Promise<{ cost: number }> {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', uid);
  const factoryDef = FACTORIES.find((f) => f.id === factoryId);
  if (!factoryDef) throw new Error('Nhà máy không tồn tại.');

  try {
    return await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('Không tìm thấy dữ liệu người chơi.');
      const user = normalizeUserData({
        ...(snap.data() as Partial<UserGameData>),
        uid,
        email: (snap.data() as Partial<UserGameData>).email || `${uid}@dopi.local`,
      });
      if (user.level < factoryDef.unlockLevel) {
        throw new Error(`Cần đạt Level ${factoryDef.unlockLevel} để mở khóa.`);
      }
      const existingFactory = user.factories.find((f) => f.id === factoryId);
      if (existingFactory?.unlocked) {
        throw new Error('Nhà máy này đã được mở khóa.');
      }
      if (user.gold < factoryDef.unlockCostGold) {
        throw new Error(`Cần ${factoryDef.unlockCostGold} Vàng để xây dựng.`);
      }
      const nextFactories = user.factories.map((f) =>
        f.id === factoryId ? { ...f, unlocked: true } : f
      );
      const updatedUser = normalizeUserData({
        ...user,
        gold: user.gold - factoryDef.unlockCostGold,
        factories: nextFactories,
        updatedAt: Date.now(),
      });
      tx.set(userRef, sanitizeForFirestore(updatedUser));
      return { cost: factoryDef.unlockCostGold };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Chợ P2P: Lắng nghe danh sách rao bán đang hoạt động
 * (Sắp xếp client-side để không phụ thuộc composite index trên Firestore)
 */
export function subscribeActiveMarketListings(
  onData: (listings: MarketListing[]) => void
): Unsubscribe {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'market_listings'),
    where('status', '==', 'active')
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: MarketListing[] = snap.docs
        .map((d) => ({
          ...(d.data() as Omit<MarketListing, 'id'>),
          id: d.id,
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(items);
    },
    (error) => {
      logFirestoreListenerError(error, OperationType.LIST, 'market_listings');
    }
  );
}

/**
 * Chợ P2P: Treo bán hàng bằng runTransaction()
 */
export async function txCreateMarketListing(
  sellerUid: string,
  itemId: string,
  quantity: number,
  currency: CurrencyType,
  price: number
): Promise<void> {
  const firestore = requireDb();
  const safeQty = Math.floor(quantity);
  const safePrice = Math.floor(price);
  if (safeQty < 1 || safeQty > 999) {
    throw new Error('Số lượng bán phải từ 1 đến 999.');
  }
  if (safePrice < 1 || safePrice > 10_000_000) {
    throw new Error('Giá bán không hợp lệ.');
  }

  const userRef = doc(firestore, 'users', sellerUid);
  const listingId = `mkt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const listingRef = doc(firestore, 'market_listings', listingId);

  try {
    await runTransaction(firestore, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('Không tìm thấy tài khoản.');
      const user = normalizeUserData({
        ...(userSnap.data() as Partial<UserGameData>),
        uid: sellerUid,
        email:
          (userSnap.data() as Partial<UserGameData>).email || `${sellerUid}@dopi.local`,
      });
      const owned = user.inventory[itemId] || 0;
      if (owned < safeQty) {
        throw new Error('Số lượng vật phẩm trong kho không đủ.');
      }

      const nextInventory = { ...user.inventory };
      if (owned - safeQty <= 0) {
        delete nextInventory[itemId];
      } else {
        nextInventory[itemId] = owned - safeQty;
      }

      const now = Date.now();
      const updatedUser = normalizeUserData({
        ...user,
        inventory: nextInventory,
        stats: {
          ...user.stats,
          totalSoldMarket: (user.stats?.totalSoldMarket || 0) + 1,
        },
        updatedAt: now,
      });

      tx.set(userRef, sanitizeForFirestore(updatedUser));

      tx.set(
        listingRef,
        sanitizeForFirestore({
          sellerUid: user.uid,
          sellerName: (user.businessName || 'Nông Trại DOPI').slice(0, 40),
          sellerVipLevel: Math.floor(user.vipLevel || 0),
          itemId,
          quantity: safeQty,
          currency,
          price: safePrice,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
      );
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'market_listings');
  }
}

/**
 * Chợ P2P: Hủy đơn treo bán & hoàn vật phẩm về kho bằng runTransaction()
 */
export async function txCancelMarketListing(
  sellerUid: string,
  listingId: string
): Promise<void> {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', sellerUid);
  const listingRef = doc(firestore, 'market_listings', listingId);

  try {
    await runTransaction(firestore, async (tx) => {
      const [listingSnap, userSnap] = await Promise.all([
        tx.get(listingRef),
        tx.get(userRef),
      ]);
      if (!listingSnap.exists()) throw new Error('Đơn hàng không tồn tại.');
      if (!userSnap.exists()) throw new Error('Không tìm thấy tài khoản.');

      const listing = listingSnap.data() as Omit<MarketListing, 'id'>;
      const user = normalizeUserData({
        ...(userSnap.data() as Partial<UserGameData>),
        uid: sellerUid,
        email:
          (userSnap.data() as Partial<UserGameData>).email || `${sellerUid}@dopi.local`,
      });
      if (listing.sellerUid !== sellerUid) {
        throw new Error('Bạn không thể hủy đơn của người khác.');
      }
      if (listing.status !== 'active') {
        throw new Error('Đơn hàng đã kết thúc hoặc đã bán.');
      }

      const nextInventory = {
        ...user.inventory,
        [listing.itemId]: (user.inventory[listing.itemId] || 0) + listing.quantity,
      };
      const now = Date.now();

      tx.update(listingRef, {
        status: 'cancelled',
        updatedAt: now,
      });

      const updatedUser = normalizeUserData({
        ...user,
        inventory: nextInventory,
        updatedAt: now,
      });
      tx.set(userRef, sanitizeForFirestore(updatedUser));
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `market_listings/${listingId}`
    );
  }
}

/**
 * Chợ P2P: Mua hàng bằng runTransaction(), tự động trừ thuế sàn theo VIP người bán
 */
export async function txBuyMarketListing(
  buyerUid: string,
  listingId: string
): Promise<{
  taxAmount: number;
  netSellerPayout: number;
  itemId: string;
  quantity: number;
}> {
  const firestore = requireDb();
  const buyerRef = doc(firestore, 'users', buyerUid);
  const listingRef = doc(firestore, 'market_listings', listingId);

  try {
    return await runTransaction(firestore, async (tx) => {
      const [listingSnap, buyerSnap] = await Promise.all([
        tx.get(listingRef),
        tx.get(buyerRef),
      ]);

      if (!listingSnap.exists()) throw new Error('Mặt hàng không còn tồn tại.');
      if (!buyerSnap.exists())
        throw new Error('Không tìm thấy tài khoản người mua.');

      const listing = listingSnap.data() as Omit<MarketListing, 'id'>;
      const buyer = normalizeUserData({
        ...(buyerSnap.data() as Partial<UserGameData>),
        uid: buyerUid,
        email:
          (buyerSnap.data() as Partial<UserGameData>).email || `${buyerUid}@dopi.local`,
      });

      if (listing.status !== 'active') {
        throw new Error('Mặt hàng này vừa có người khác mua mất rồi.');
      }
      if (listing.sellerUid === buyerUid) {
        throw new Error('Không thể tự mua mặt hàng do chính bạn đăng bán.');
      }

      const sellerRef = doc(firestore, 'users', listing.sellerUid);
      const sellerSnap = await tx.get(sellerRef);

      const totalStored = getTotalInventoryCount(buyer.inventory);
      if (totalStored + listing.quantity > buyer.storageCapacity) {
        throw new Error(
          'Kho của bạn không đủ sức chứa. Hãy mở rộng kho trước.'
        );
      }

      if (listing.currency === 'gold' && buyer.gold < listing.price) {
        throw new Error('Bạn không đủ Vàng để mua đơn này.');
      }
      if (listing.currency === 'coins' && buyer.dopiCoins < listing.price) {
        throw new Error('Bạn không đủ Xu DOPI để mua đơn này.');
      }

      const { taxAmount, netSellerPayout } = calculateMarketTax(
        listing.price,
        listing.sellerVipLevel
      );
      const now = Date.now();

      const nextBuyerInventory = {
        ...buyer.inventory,
        [listing.itemId]:
          (buyer.inventory[listing.itemId] || 0) + listing.quantity,
      };

      tx.update(listingRef, {
        status: 'sold',
        buyerUid,
        updatedAt: now,
      });

      const updatedBuyer = normalizeUserData({
        ...buyer,
        gold:
          listing.currency === 'gold'
            ? buyer.gold - listing.price
            : buyer.gold,
        dopiCoins:
          listing.currency === 'coins'
            ? buyer.dopiCoins - listing.price
            : buyer.dopiCoins,
        inventory: nextBuyerInventory,
        updatedAt: now,
      });

      tx.set(buyerRef, sanitizeForFirestore(updatedBuyer));

      if (sellerSnap.exists()) {
        if (listing.currency === 'gold') {
          tx.update(sellerRef, {
            gold: increment(netSellerPayout),
            updatedAt: now,
          });
        } else {
          tx.update(sellerRef, {
            dopiCoins: increment(netSellerPayout),
            updatedAt: now,
          });
        }
      }

      return {
        taxAmount,
        netSellerPayout,
        itemId: listing.itemId,
        quantity: listing.quantity,
      };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `market_listings/${listingId}`
    );
  }
}

/**
 * Bạn bè: Tìm người chơi theo UID, Email, Tên Nông Trại hoặc Tên Hiển Thị
 */
export async function findPlayerByUidOrEmail(
  rawQuery: string
): Promise<PublicFarmData | null> {
  const firestore = requireDb();
  const q = rawQuery.trim();
  if (!q) return null;

  // 1. Tìm theo Email qua email_directory
  if (q.includes('@')) {
    const key = encodeEmailKey(q);
    try {
      const dirSnap = await getDoc(doc(firestore, 'email_directory', key));
      if (dirSnap.exists()) {
        const { uid } = dirSnap.data() as { uid: string };
        const farmSnap = await getDoc(doc(firestore, 'public_farms', uid));
        if (farmSnap.exists()) {
          return normalizePublicFarmData({
            ...(farmSnap.data() as Partial<PublicFarmData>),
            uid,
          });
        }
      }
    } catch (error) {
      logFirestoreListenerError(
        error,
        OperationType.GET,
        `email_directory/${key}`
      );
    }
  }

  // 2. Tìm trực tiếp theo UID chính xác
  if (/^[a-zA-Z0-9_-]{1,128}$/.test(q)) {
    try {
      const farmSnap = await getDoc(doc(firestore, 'public_farms', q));
      if (farmSnap.exists()) {
        return normalizePublicFarmData({
          ...(farmSnap.data() as Partial<PublicFarmData>),
          uid: q,
        });
      }
    } catch (error) {
      logFirestoreListenerError(error, OperationType.GET, `public_farms/${q}`);
    }
  }

  // 3. Tìm kiếm linh hoạt không phân biệt hoa thường theo UID, Tên Nông Trại hoặc Tên Hiển Thị trên public_farms
  try {
    const snap = await getDocs(
      query(collection(firestore, 'public_farms'), limit(100))
    );
    const lower = q.toLowerCase();
    for (const d of snap.docs) {
      const data = normalizePublicFarmData({
        ...(d.data() as Partial<PublicFarmData>),
        uid: d.id,
      });
      if (
        data.uid.toLowerCase() === lower ||
        data.businessName.toLowerCase().includes(lower) ||
        data.displayName.toLowerCase().includes(lower)
      ) {
        return data;
      }
    }
  } catch (error) {
    logFirestoreListenerError(error, OperationType.LIST, 'public_farms');
  }

  return null;
}

export async function fetchPublicFarmsByUids(
  uids: string[]
): Promise<PublicFarmData[]> {
  const firestore = requireDb();
  const uniqueUids = Array.from(
    new Set(uids.filter((u) => typeof u === 'string' && u.trim().length > 0))
  ).slice(0, 50);

  const results = await Promise.all(
    uniqueUids.map(async (uid) => {
      try {
        const snap = await getDoc(doc(firestore, 'public_farms', uid));
        return snap.exists()
          ? normalizePublicFarmData({
              ...(snap.data() as Partial<PublicFarmData>),
              uid,
            })
          : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((x): x is PublicFarmData => x !== null);
}

export function subscribeFriendRequests(
  myUid: string,
  onIncoming: (reqs: FriendRequestDoc[]) => void,
  onOutgoing: (reqs: FriendRequestDoc[]) => void
): Unsubscribe {
  const firestore = requireDb();
  const qIn = query(
    collection(firestore, 'friend_requests'),
    where('toUid', '==', myUid)
  );
  const qOut = query(
    collection(firestore, 'friend_requests'),
    where('fromUid', '==', myUid)
  );

  const unsub1 = onSnapshot(
    qIn,
    (snap) => {
      onIncoming(
        snap.docs.map((d) => ({
          ...(d.data() as Omit<FriendRequestDoc, 'id'>),
          id: d.id,
        }))
      );
    },
    (error) =>
      logFirestoreListenerError(error, OperationType.LIST, 'friend_requests')
  );

  const unsub2 = onSnapshot(
    qOut,
    (snap) => {
      onOutgoing(
        snap.docs.map((d) => ({
          ...(d.data() as Omit<FriendRequestDoc, 'id'>),
          id: d.id,
        }))
      );
    },
    (error) =>
      logFirestoreListenerError(error, OperationType.LIST, 'friend_requests')
  );

  return () => {
    unsub1();
    unsub2();
  };
}

export async function sendFriendRequest(
  fromUser: UserGameData,
  toUid: string
): Promise<void> {
  const firestore = requireDb();
  const cleanToUid = toUid.trim();
  if (!cleanToUid) {
    throw new Error('UID người nhận không hợp lệ.');
  }
  if (fromUser.uid === cleanToUid) {
    throw new Error('Không thể tự gửi lời mời kết bạn cho chính mình.');
  }
  if (fromUser.friends.includes(cleanToUid)) {
    throw new Error('Người này đã nằm trong danh sách bạn bè.');
  }

  const reqId = `fr_${fromUser.uid}_${cleanToUid}`.slice(0, 128);
  const reqRef = doc(firestore, 'friend_requests', reqId);
  const now = Date.now();
  try {
    await setDoc(
      reqRef,
      sanitizeForFirestore({
        fromUid: fromUser.uid,
        fromEmail: (fromUser.email || '').slice(0, 254),
        fromName: (fromUser.businessName || 'Nông Trại DOPI').slice(0, 60),
        toUid: cleanToUid,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `friend_requests/${reqId}`);
  }
}

export async function respondFriendRequest(
  req: FriendRequestDoc,
  accept: boolean,
  currentUser: UserGameData
): Promise<string[]> {
  const firestore = requireDb();
  const reqRef = doc(firestore, 'friend_requests', req.id);
  const myUserRef = doc(firestore, 'users', currentUser.uid);
  const senderUserRef = doc(firestore, 'users', req.fromUid);
  const now = Date.now();

  try {
    await updateDoc(reqRef, {
      status: accept ? 'accepted' : 'rejected',
      updatedAt: now,
    });

    const nextFriends = accept
      ? Array.from(new Set([...currentUser.friends, req.fromUid]))
          .filter((uid) => uid && uid !== currentUser.uid)
          .slice(0, 100)
      : currentUser.friends;

    if (accept) {
      const normalizedMe = normalizeUserData({
        ...currentUser,
        friends: nextFriends,
        updatedAt: now,
      });
      await setDoc(myUserRef, sanitizeForFirestore(normalizedMe));

      // Đồng bộ luôn danh sách bạn bè phía người gửi lời mời (nếu hồ sơ tồn tại)
      try {
        const senderSnap = await getDoc(senderUserRef);
        if (senderSnap.exists()) {
          await updateDoc(senderUserRef, {
            friends: arrayUnion(currentUser.uid),
            updatedAt: now,
          });
        }
      } catch (peerErr) {
        logFirestoreListenerError(
          peerErr,
          OperationType.UPDATE,
          `users/${req.fromUid}`
        );
      }
    }

    return nextFriends;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `friend_requests/${req.id}`
    );
  }
}

/**
 * Tưới cây giúp bạn bè bằng runTransaction(): giảm 15% thời gian chín, thưởng 20 Vàng (tối đa 5 lần/ngày)
 */
export async function txWaterFriendPlot(
  helperUid: string,
  friendUid: string,
  plotId: number
): Promise<PublicFarmData> {
  const firestore = requireDb();
  const helperRef = doc(firestore, 'users', helperUid);
  const friendFarmRef = doc(firestore, 'public_farms', friendUid);

  try {
    return await runTransaction(firestore, async (tx) => {
      const [helperSnap, farmSnap] = await Promise.all([
        tx.get(helperRef),
        tx.get(friendFarmRef),
      ]);

      if (!helperSnap.exists())
        throw new Error('Không tìm thấy tài khoản của bạn.');
      if (!farmSnap.exists())
        throw new Error('Không tìm thấy nông trại bạn bè.');

      const helper = normalizeUserData({
        ...(helperSnap.data() as Partial<UserGameData>),
        uid: helperUid,
        email:
          (helperSnap.data() as Partial<UserGameData>).email ||
          `${helperUid}@dopi.local`,
      });
      const farm = normalizePublicFarmData({
        ...(farmSnap.data() as Partial<PublicFarmData>),
        uid: friendUid,
      });
      const now = Date.now();

      if (helper.helpCountToday >= MAX_FRIEND_HELPS_PER_DAY) {
        throw new Error(
          `Bạn đã đạt giới hạn tưới cây ${MAX_FRIEND_HELPS_PER_DAY} lần hôm nay.`
        );
      }

      const targetPlot = farm.farmPlots.find((p) => p.id === plotId);
      if (!targetPlot || !targetPlot.cropId || !targetPlot.readyAt) {
        throw new Error('Ô đất này chưa trồng cây.');
      }
      if (targetPlot.readyAt <= now) {
        throw new Error('Cây này đã chín rồi, không cần tưới thêm.');
      }
      if (targetPlot.wateredBy === helperUid) {
        throw new Error('Bạn đã tưới cho ô cây này rồi.');
      }

      const remaining = targetPlot.readyAt - now;
      const reducedReadyAt = Math.max(
        now,
        Math.round(targetPlot.readyAt - remaining * FRIEND_WATER_REDUCTION_RATIO)
      );

      const nextFarmPlots = farm.farmPlots.map((p) =>
        p.id === plotId
          ? {
              ...p,
              readyAt: reducedReadyAt,
              wateredBy: helperUid,
              wateredAt: now,
            }
          : p
      );

      const nextQuests = helper.dailyQuests.map((q) =>
        q.type === 'help_friend'
          ? { ...q, progress: Math.min(q.target, q.progress + 1) }
          : q
      );

      const nextHelpedFriends = helper.helpedFriendsToday.includes(friendUid)
        ? helper.helpedFriendsToday
        : [...helper.helpedFriendsToday, friendUid].slice(0, 5);

      tx.update(friendFarmRef, {
        farmPlots: sanitizeForFirestore(nextFarmPlots),
        updatedAt: now,
      });

      const updatedHelper = normalizeUserData({
        ...helper,
        gold: helper.gold + FRIEND_HELP_REWARD_GOLD,
        helpCountToday: helper.helpCountToday + 1,
        helpedFriendsToday: nextHelpedFriends,
        dailyQuests: nextQuests,
        stats: {
          ...helper.stats,
          totalFriendsHelped: (helper.stats?.totalFriendsHelped || 0) + 1,
        },
        updatedAt: now,
      });

      tx.set(helperRef, sanitizeForFirestore(updatedHelper));

      return {
        ...farm,
        farmPlots: nextFarmPlots,
        updatedAt: now,
      };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `public_farms/${friendUid}`
    );
  }
}

// ==================== ADMIN PANEL FUNCTIONS ====================

export function subscribeAllRedeemCodes(
  onData: (codes: RedeemCodeDoc[]) => void
): Unsubscribe {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'redeem_codes'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as RedeemCodeDoc));
    },
    (error) => logFirestoreListenerError(error, OperationType.LIST, 'redeem_codes')
  );
}

export async function createRedeemCode(params: {
  code: string;
  amount: number;
  maxUses: number;
  expiresAt: number;
  createdBy: string;
}): Promise<RedeemCodeDoc> {
  const firestore = requireDb();
  const normalized = params.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{4,40}$/.test(normalized)) {
    throw new Error('Mã chỉ gồm chữ in hoa, số, dấu gạch ngang (4-40 ký tự).');
  }
  const amount = Math.floor(params.amount);
  const maxUses = Math.floor(params.maxUses);
  if (amount < 1 || amount > 1_000_000) {
    throw new Error('Mệnh giá Xu DOPI phải từ 1 đến 1.000.000.');
  }
  if (maxUses < 1 || maxUses > 500) {
    throw new Error('Số lượt dùng tối đa phải từ 1 đến 500.');
  }

  const ref = doc(firestore, 'redeem_codes', normalized);
  const existingSnap = await getDoc(ref);
  if (existingSnap.exists()) {
    throw new Error(`Mã "${normalized}" đã tồn tại trên hệ thống.`);
  }

  const payload: RedeemCodeDoc = {
    code: normalized,
    amount,
    maxUses,
    usedCount: 0,
    usedBy: [],
    expiresAt: params.expiresAt,
    createdBy: params.createdBy,
    createdAt: Date.now(),
    isActive: true,
  };

  try {
    await setDoc(ref, sanitizeForFirestore(payload));
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `redeem_codes/${normalized}`);
  }
}

export async function toggleRedeemCodeActive(
  code: string,
  nextActive: boolean
): Promise<void> {
  const firestore = requireDb();
  try {
    await updateDoc(doc(firestore, 'redeem_codes', code), {
      isActive: nextActive,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `redeem_codes/${code}`);
  }
}

export async function deleteRedeemCode(code: string): Promise<void> {
  const firestore = requireDb();
  try {
    await deleteDoc(doc(firestore, 'redeem_codes', code));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `redeem_codes/${code}`);
  }
}

// ==================== DIRECT TOP-UP REQUESTS ====================

export async function createTopupRequest(params: {
  uid: string;
  email: string;
  businessName: string;
  amount: number;
  transferCode: string;
  note: string;
}): Promise<TopupRequestDoc> {
  const firestore = requireDb();
  const safeAmount = Math.floor(params.amount);
  if (safeAmount < 10 || safeAmount > 1_000_000) {
    throw new Error('Số Xu nạp phải từ 10 đến 1.000.000 Xu.');
  }
  const cleanCode = params.transferCode.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{6,32}$/.test(cleanCode)) {
    throw new Error('Mã giao dịch không hợp lệ.');
  }

  const reqId = `topup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const payload: Omit<TopupRequestDoc, 'id'> = {
    uid: params.uid,
    email: params.email,
    businessName: (params.businessName.trim() || 'Nông Trại DOPI').slice(0, 40),
    amount: safeAmount,
    transferCode: cleanCode,
    note: params.note.trim().slice(0, 200),
    status: 'pending',
    rejectReason: '',
    createdAt: now,
    processedAt: 0,
  };

  try {
    await setDoc(
      doc(firestore, 'topup_requests', reqId),
      sanitizeForFirestore(payload)
    );
    return { id: reqId, ...payload };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `topup_requests/${reqId}`);
  }
}

export function subscribeUserTopupRequests(
  uid: string,
  onData: (reqs: TopupRequestDoc[]) => void
): Unsubscribe {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'topup_requests'),
    where('uid', '==', uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: TopupRequestDoc[] = snap.docs
        .map((d) => ({
          ...(d.data() as Omit<TopupRequestDoc, 'id'>),
          id: d.id,
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
      onData(list);
    },
    (error) =>
      logFirestoreListenerError(error, OperationType.LIST, 'topup_requests')
  );
}

export function subscribeAllTopupRequests(
  onData: (reqs: TopupRequestDoc[]) => void
): Unsubscribe {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'topup_requests'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: TopupRequestDoc[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<TopupRequestDoc, 'id'>),
        id: d.id,
      }));
      onData(list);
    },
    (error) =>
      logFirestoreListenerError(error, OperationType.LIST, 'topup_requests')
  );
}

/**
 * Admin duyệt lệnh nạp bằng Firestore runTransaction():
 * - Kiểm tra status === 'pending'
 * - Đổi status thành 'approved'
 * - Tự động cộng dopiCoins, totalRechargedCoins, cập nhật vipLevel, eventRechargedCoins và hasFirstTopup = true
 */
export async function txApproveTopupRequest(
  reqId: string
): Promise<{
  uid: string;
  businessName: string;
  amount: number;
  newVipLevel: number;
}> {
  const firestore = requireDb();
  const reqRef = doc(firestore, 'topup_requests', reqId);

  try {
    return await runTransaction(firestore, async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) {
        throw new Error('Không tìm thấy lệnh nạp.');
      }
      const req = reqSnap.data() as Omit<TopupRequestDoc, 'id'>;
      if (req.status !== 'pending') {
        throw new Error('Lệnh nạp này đã được xử lý trước đó.');
      }

      const userRef = doc(firestore, 'users', req.uid);
      const pubFarmRef = doc(firestore, 'public_farms', req.uid);
      const [userSnap, pubFarmSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(pubFarmRef),
      ]);

      if (!userSnap.exists()) {
        throw new Error('Không tìm thấy tài khoản người chơi nhận Xu.');
      }

      const now = Date.now();
      const monthKey = getCurrentMonthKey(now);
      const userData = normalizeUserData(
        {
          ...(userSnap.data() as Partial<UserGameData>),
          uid: req.uid,
          email:
            (userSnap.data() as Partial<UserGameData>).email ||
            req.email ||
            `${req.uid}@dopi.local`,
        },
        now
      );

      const nextDopiCoins = userData.dopiCoins + req.amount;
      const nextTotalRecharged = (userData.totalRechargedCoins || 0) + req.amount;
      const nextVipLevel = calculateVipLevel(nextTotalRecharged);
      const nextEventRecharged =
        (userData.eventMonthKey === monthKey ? userData.eventRechargedCoins : 0) +
        req.amount;

      tx.update(reqRef, {
        status: 'approved',
        rejectReason: '',
        processedAt: now,
      });

      const updatedUser = normalizeUserData({
        ...userData,
        dopiCoins: nextDopiCoins,
        totalRechargedCoins: nextTotalRecharged,
        vipLevel: nextVipLevel,
        eventRechargedCoins: nextEventRecharged,
        eventMonthKey: monthKey,
        hasFirstTopup: true,
        updatedAt: now,
      });

      tx.set(userRef, sanitizeForFirestore(updatedUser));

      if (pubFarmSnap.exists()) {
        tx.update(pubFarmRef, {
          vipLevel: nextVipLevel,
          totalRechargedCoins: nextTotalRecharged,
          wealthScore: updatedUser.wealthScore,
          updatedAt: now,
        });
      }

      return {
        uid: req.uid,
        businessName: req.businessName,
        amount: req.amount,
        newVipLevel: nextVipLevel,
      };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `topup_requests/${reqId}`
    );
  }
}

export async function rejectTopupRequest(
  reqId: string,
  reason: string
): Promise<void> {
  const firestore = requireDb();
  const cleanReason =
    reason.trim().slice(0, 200) ||
    'Không tìm thấy giao dịch chuyển khoản tương ứng.';
  try {
    await updateDoc(doc(firestore, 'topup_requests', reqId), {
      status: 'rejected',
      rejectReason: cleanReason,
      processedAt: Date.now(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `topup_requests/${reqId}`
    );
  }
}

// ==================== SERVER LEADERBOARD ====================

export async function fetchServerLeaderboard(): Promise<PublicFarmData[]> {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'public_farms'),
    where('isPublic', '==', true),
    limit(100)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      normalizePublicFarmData({
        ...(d.data() as Partial<PublicFarmData>),
        uid: d.id,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'public_farms');
  }
}

export async function fetchPublicFarmByUid(
  uid: string
): Promise<PublicFarmData | null> {
  const firestore = requireDb();
  try {
    const snap = await getDoc(doc(firestore, 'public_farms', uid));
    return snap.exists()
      ? normalizePublicFarmData({
          ...(snap.data() as Partial<PublicFarmData>),
          uid,
        })
      : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `public_farms/${uid}`);
  }
}

// ==================== P2P INVESTMENT EXCHANGE & DIVIDENDS ====================

let seededDefaultP2P = false;

export function subscribeListedP2PCompanies(
  onData: (companies: P2PCompanyDoc[]) => void
): Unsubscribe {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'p2p_companies'),
    where('isListed', '==', true),
    limit(80)
  );
  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty && !seededDefaultP2P) {
        seededDefaultP2P = true;
        const defaults = createDefaultP2PCompanies(Date.now());
        onData(defaults);
        // Seed default community IPO companies into Firestore so transactions succeed
        void Promise.all(
          defaults.map((comp) =>
            setDoc(
              doc(firestore, 'p2p_companies', comp.ownerUid),
              sanitizeForFirestore(comp)
            ).catch(() => {})
          )
        );
        return;
      }
      const list = snap.docs
        .map((d) => d.data() as P2PCompanyDoc)
        .sort((a, b) => b.wealthScore - a.wealthScore);
      onData(list);
    },
    (error) =>
      logFirestoreListenerError(error, OperationType.LIST, 'p2p_companies')
  );
}

export function subscribeMyP2PCompany(
  uid: string,
  onData: (company: P2PCompanyDoc | null) => void
): Unsubscribe {
  const firestore = requireDb();
  const ref = doc(firestore, 'p2p_companies', uid);
  return onSnapshot(
    ref,
    (snap) => {
      onData(snap.exists() ? (snap.data() as P2PCompanyDoc) : null);
    },
    (error) =>
      logFirestoreListenerError(error, OperationType.GET, `p2p_companies/${uid}`)
  );
}

/**
 * Niêm yết / Cập nhật IPO cho doanh nghiệp của chính người chơi (yêu cầu Level >= 10).
 * Định giá sharePrice và xếp hạng tín nhiệm được hệ thống tính tự động chống gian lận.
 */
export async function upsertMyP2PCompanyIpo(
  user: UserGameData,
  dividendRate: number,
  isListed: boolean
): Promise<P2PCompanyDoc> {
  if (user.level < P2P_MIN_IPO_LEVEL) {
    throw new Error(`Cần đạt Level ${P2P_MIN_IPO_LEVEL} trở lên để niêm yết IPO.`);
  }
  const firestore = requireDb();
  const compRef = doc(firestore, 'p2p_companies', user.uid);

  try {
    return await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(compRef);
      const existing = snap.exists() ? (snap.data() as P2PCompanyDoc) : null;
      const payload = buildP2PCompanyPayload(
        user,
        dividendRate,
        isListed,
        existing,
        Date.now()
      );
      tx.set(compRef, sanitizeForFirestore(payload));
      return payload;
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `p2p_companies/${user.uid}`);
  }
}

/**
 * Khi chủ doanh nghiệp đã IPO giao đơn NPC thành công:
 * Tự động trích dividendRate% doanh thu vào dividendPool và cập nhật định giá mới.
 */
export async function syncP2PCompanyDividendFromOrder(
  user: UserGameData,
  grossOrderGold: number
): Promise<{ contributed: number; dividendRate: number }> {
  const firestore = requireDb();
  const compRef = doc(firestore, 'p2p_companies', user.uid);
  try {
    return await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(compRef);
      if (!snap.exists()) return { contributed: 0, dividendRate: 0 };
      const existing = snap.data() as P2PCompanyDoc;
      if (!existing.isListed) return { contributed: 0, dividendRate: 0 };

      const contributed = Math.max(
        1,
        Math.floor((grossOrderGold * existing.dividendRate) / 100)
      );
      const updated = buildP2PCompanyPayload(
        user,
        existing.dividendRate,
        true,
        {
          ...existing,
          dividendPool: (existing.dividendPool || 0) + contributed,
        },
        Date.now()
      );

      tx.set(compRef, sanitizeForFirestore(updated));

      return { contributed, dividendRate: existing.dividendRate };
    });
  } catch (error) {
    console.warn('Could not sync P2P dividend pool:', error);
    return { contributed: 0, dividendRate: 0 };
  }
}

/**
 * Mua cổ phần doanh nghiệp P2P bằng Firestore runTransaction():
 * - Trừ Vàng người mua (giá cổ phần + phí sàn 4% giảm theo VIP)
 * - Chuyển vốn Vàng (gross) cho chủ doanh nghiệp IPO (nếu là người chơi thực)
 * - Trừ availableShares trên p2p_companies/{ownerUid}
 * - Lưu vào investments.p2pHoldings
 */
export async function txBuyP2PShares(
  buyerUid: string,
  ownerUid: string,
  quantity: number
): Promise<{
  businessName: string;
  unitPrice: number;
  quantity: number;
  feeAmount: number;
  totalCost: number;
}> {
  if (buyerUid === ownerUid) {
    throw new Error('Không thể tự mua cổ phần của chính doanh nghiệp mình.');
  }
  const safeQty = Math.floor(quantity);
  if (safeQty < 1 || safeQty > P2P_MAX_PUBLIC_SHARES) {
    throw new Error('Số lượng cổ phần mua không hợp lệ.');
  }

  const firestore = requireDb();
  const buyerRef = doc(firestore, 'users', buyerUid);
  const ownerRef = doc(firestore, 'users', ownerUid);
  const compRef = doc(firestore, 'p2p_companies', ownerUid);

  try {
    return await runTransaction(firestore, async (tx) => {
      const [buyerSnap, compSnap, ownerSnap] = await Promise.all([
        tx.get(buyerRef),
        tx.get(compRef),
        tx.get(ownerRef),
      ]);

      if (!buyerSnap.exists())
        throw new Error('Không tìm thấy hồ sơ nhà đầu tư.');

      let rawComp: P2PCompanyDoc | undefined;
      if (compSnap.exists()) {
        rawComp = compSnap.data() as P2PCompanyDoc;
      } else {
        rawComp = createDefaultP2PCompanies(Date.now()).find(
          (c) => c.ownerUid === ownerUid
        );
      }

      if (!rawComp) {
        throw new Error('Doanh nghiệp này chưa niêm yết IPO.');
      }

      const buyer = normalizeUserData({
        ...(buyerSnap.data() as Partial<UserGameData>),
        uid: buyerUid,
        email:
          (buyerSnap.data() as Partial<UserGameData>).email ||
          `${buyerUid}@dopi.local`,
      });
      if (!rawComp.isListed) {
        throw new Error('Doanh nghiệp này đã tạm ngừng gọi vốn.');
      }
      if (rawComp.availableShares < safeQty) {
        throw new Error(
          `Chỉ còn ${rawComp.availableShares} cổ phần khả dụng để mua.`
        );
      }

      const now = Date.now();
      const effectiveComp = getEffectiveP2PCompanyState(rawComp, now);
      const trade = calculateBuyTrade(
        effectiveComp.sharePrice,
        safeQty,
        buyer.vipLevel
      );

      if (buyer.gold < trade.totalCost) {
        throw new Error(
          `Không đủ Vàng (cần ${trade.totalCost.toLocaleString('vi-VN')} Vàng gồm phí sàn ${trade.feePct}%).`
        );
      }

      const inv = normalizeUserInvestments(buyer.investments);
      const prevHolding = inv.p2pHoldings[ownerUid];
      const prevShares = prevHolding?.shares || 0;
      const prevCost = prevShares * (prevHolding?.avgBuyPrice || 0);
      const nextShares = prevShares + safeQty;
      const nextAvgPrice = Number(
        ((prevCost + trade.totalCost) / nextShares).toFixed(2)
      );

      const nextInvestments = {
        ...inv,
        p2pHoldings: {
          ...inv.p2pHoldings,
          [ownerUid]: {
            ownerUid,
            businessName: rawComp.businessName,
            shares: nextShares,
            avgBuyPrice: nextAvgPrice,
            lockedUntil: INVESTMENT_LOCKUP_MS > 0 ? now + INVESTMENT_LOCKUP_MS : 0,
          },
        },
        totalInvested: inv.totalInvested + trade.totalCost,
      };

      tx.set(
        compRef,
        sanitizeForFirestore({
          ...rawComp,
          availableShares: Math.max(0, rawComp.availableShares - safeQty),
        })
      );

      const updatedBuyer = normalizeUserData({
        ...buyer,
        gold: buyer.gold - trade.totalCost,
        investments: nextInvestments,
        updatedAt: now,
      });

      tx.set(buyerRef, sanitizeForFirestore(updatedBuyer));

      // Chuyển vốn IPO trực tiếp cho chủ doanh nghiệp nếu là tài khoản người chơi thực
      if (ownerSnap.exists()) {
        tx.update(ownerRef, {
          gold: increment(trade.gross),
          updatedAt: now,
        });
      }

      return {
        businessName: rawComp.businessName,
        unitPrice: effectiveComp.sharePrice,
        quantity: safeQty,
        feeAmount: trade.feeAmount,
        totalCost: trade.totalCost,
      };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `p2p_companies/${ownerUid}`);
  }
}

/**
 * Bán cổ phần P2P bằng Firestore runTransaction():
 * - Trừ cổ phần trong danh mục, cộng Vàng ròng (đã trừ phí sàn theo VIP)
 * - Hoàn cổ phần về availableShares của doanh nghiệp (tối đa 400)
 */
export async function txSellP2PShares(
  sellerUid: string,
  ownerUid: string,
  quantity: number
): Promise<{
  businessName: string;
  unitPrice: number;
  quantity: number;
  feeAmount: number;
  netProceeds: number;
  profit: number;
}> {
  const safeQty = Math.floor(quantity);
  if (safeQty < 1 || safeQty > P2P_MAX_PUBLIC_SHARES) {
    throw new Error('Số lượng cổ phần bán không hợp lệ.');
  }

  const firestore = requireDb();
  const sellerRef = doc(firestore, 'users', sellerUid);
  const compRef = doc(firestore, 'p2p_companies', ownerUid);

  try {
    return await runTransaction(firestore, async (tx) => {
      const [sellerSnap, compSnap] = await Promise.all([
        tx.get(sellerRef),
        tx.get(compRef),
      ]);

      if (!sellerSnap.exists())
        throw new Error('Không tìm thấy hồ sơ tài khoản.');

      const seller = normalizeUserData({
        ...(sellerSnap.data() as Partial<UserGameData>),
        uid: sellerUid,
        email:
          (sellerSnap.data() as Partial<UserGameData>).email ||
          `${sellerUid}@dopi.local`,
      });
      const inv = normalizeUserInvestments(seller.investments);
      const holding = inv.p2pHoldings[ownerUid];

      if (!holding || holding.shares < safeQty) {
        throw new Error('Bạn không sở hữu đủ số cổ phần để bán.');
      }

      const now = Date.now();
      const rawComp = compSnap.exists()
        ? (compSnap.data() as P2PCompanyDoc)
        : createDefaultP2PCompanies(now).find((c) => c.ownerUid === ownerUid);

      const unitPrice = rawComp
        ? getEffectiveP2PCompanyState(rawComp, now).sharePrice
        : Math.max(50, Math.round(holding.avgBuyPrice));

      const trade = calculateSellTrade(unitPrice, safeQty, seller.vipLevel);
      const costBasis = Math.round(holding.avgBuyPrice * safeQty);
      const profit = trade.netProceeds - costBasis;

      const nextP2PHoldings = { ...inv.p2pHoldings };
      if (holding.shares - safeQty <= 0) {
        delete nextP2PHoldings[ownerUid];
      } else {
        nextP2PHoldings[ownerUid] = {
          ...holding,
          shares: holding.shares - safeQty,
        };
      }

      const nextInvestments = {
        ...inv,
        p2pHoldings: nextP2PHoldings,
        realizedProfit: inv.realizedProfit + profit,
      };

      if (rawComp) {
        const nextAvailable = Math.min(
          P2P_MAX_PUBLIC_SHARES,
          rawComp.availableShares + safeQty
        );
        tx.set(
          compRef,
          sanitizeForFirestore({
            ...rawComp,
            availableShares: nextAvailable,
          })
        );
      }

      const updatedSeller = normalizeUserData({
        ...seller,
        gold: seller.gold + trade.netProceeds,
        investments: nextInvestments,
        updatedAt: now,
      });

      tx.set(sellerRef, sanitizeForFirestore(updatedSeller));

      return {
        businessName: rawComp?.businessName || holding.businessName,
        unitPrice,
        quantity: safeQty,
        feeAmount: trade.feeAmount,
        netProceeds: trade.netProceeds,
        profit,
      };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `p2p_companies/${ownerUid}`);
  }
}

/**
 * Nhận cổ tức kỳ hiện tại bằng Firestore runTransaction():
 * - Tính cổ tức cổ phiếu NPC (Vàng + Xu DOPI)
 * - Trích cổ tức thực từ dividendPool của từng doanh nghiệp P2P đang nắm giữ (không in thêm tiền)
 */
export async function txClaimDividends(
  uid: string,
  stockSnapshots: Record<StockCode, StockMarketSnapshot>
): Promise<{
  totalGold: number;
  totalCoins: number;
  p2pGold: number;
  npcGold: number;
}> {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', uid);

  try {
    return await runTransaction(firestore, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('Không tìm thấy tài khoản.');

      const user = normalizeUserData({
        ...(userSnap.data() as Partial<UserGameData>),
        uid,
        email:
          (userSnap.data() as Partial<UserGameData>).email || `${uid}@dopi.local`,
      });
      const inv = normalizeUserInvestments(user.investments);
      const now = Date.now();

      if (
        inv.lastDividendClaimAt > 0 &&
        inv.lastDividendClaimAt + DIVIDEND_CYCLE_MS > now
      ) {
        throw new Error('Chưa đến kỳ nhận cổ tức kế tiếp.');
      }

      const heldP2PUids = Object.keys(inv.p2pHoldings).filter(
        (k) => (inv.p2pHoldings[k]?.shares || 0) > 0
      );

      const compDocs: P2PCompanyDoc[] = [];
      for (const ownerUid of heldP2PUids) {
        const snap = await tx.get(doc(firestore, 'p2p_companies', ownerUid));
        if (snap.exists()) {
          compDocs.push(snap.data() as P2PCompanyDoc);
        }
      }

      const breakdown = calculateClaimableDividends(
        inv,
        stockSnapshots,
        compDocs,
        now
      );

      if (breakdown.totalGold <= 0 && breakdown.totalCoins <= 0) {
        throw new Error('Hiện chưa có cổ tức nào khả dụng để nhận.');
      }

      // Trừ đúng phần cổ tức đã trích khỏi dividendPool của từng doanh nghiệp P2P
      for (const comp of compDocs) {
        const holding = inv.p2pHoldings[comp.ownerUid];
        if (!holding) continue;
        const payout = calculateP2PShareholderDividend(comp, holding.shares);
        if (payout > 0 && comp.dividendPool >= payout) {
          tx.set(
            doc(firestore, 'p2p_companies', comp.ownerUid),
            sanitizeForFirestore({
              ...comp,
              dividendPool: Math.max(0, comp.dividendPool - payout),
            })
          );
        }
      }

      const updatedUser = normalizeUserData({
        ...user,
        gold: user.gold + breakdown.totalGold,
        dopiCoins: user.dopiCoins + breakdown.totalCoins,
        investments: {
          ...inv,
          lastDividendClaimAt: now,
        },
        updatedAt: now,
      });

      tx.set(userRef, sanitizeForFirestore(updatedUser));

      return {
        totalGold: breakdown.totalGold,
        totalCoins: breakdown.totalCoins,
        p2pGold: breakdown.p2pGoldDividend,
        npcGold: breakdown.npcGoldDividend,
      };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('permission')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}
