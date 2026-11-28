import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  Crown,
  Filter,
  Lock,
  PackagePlus,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  BOOSTERS,
  CROPS,
  ITEM_CATALOG,
  STORAGE_UPGRADE_STEP,
  TREASURES,
} from '../game/constants';
import {
  calculateStorageUpgradeCost,
  formatNumber,
  getHourlyMarketSurge,
  getItemSellPriceWithSurge,
  getTotalInventoryCount,
} from '../game/economy';
import type { BoosterDef, TreasureDef, UserGameData } from '../game/types';

interface ShopStorageViewProps {
  user: UserGameData;
  nowMs: number;
  onBuyBooster: (boosterId: string) => Promise<void>;
  onBuyTreasure: (treasureId: string) => Promise<void>;
  onActivateUtilityItem: (itemId: string) => Promise<void>;
  onExpandStorage: () => Promise<void>;
  onSellToNpc: (itemId: string, quantity: number) => Promise<void>;
  onGoToMarketWithItem: (itemId: string) => void;
}

type StorageGroupId =
  | 'all'
  | 'fruits'
  | 'grains'
  | 'herbs'
  | 'products'
  | 'boosters';

interface StorageCategoryGroup {
  id: Exclude<StorageGroupId, 'all'>;
  label: string;
  emoji: string;
  description: string;
  childItemIds: string[];
}

const STORAGE_CATEGORY_GROUPS: StorageCategoryGroup[] = [
  {
    id: 'fruits',
    label: 'Trái cây & Quả ngọt',
    emoji: '🍎',
    description: 'Các loại trái cây tươi thu hoạch từ nông trại',
    childItemIds: ['tomato', 'strawberry', 'dopi_durian', 'purple_grape'],
  },
  {
    id: 'grains',
    label: 'Lương thực & Hạt',
    emoji: '🌾',
    description: 'Ngũ cốc và hạt nguyên liệu cho nhà máy chế biến',
    childItemIds: ['wheat', 'corn', 'coffee', 'cacao'],
  },
  {
    id: 'herbs',
    label: 'Dược liệu & Gỗ quý',
    emoji: '🫚',
    description: 'Nông sản quý hiếm giá trị kinh tế cao',
    childItemIds: ['ginseng', 'dopi_agarwood'],
  },
  {
    id: 'products',
    label: 'Bánh & Đồ uống',
    emoji: '🥐',
    description: 'Thành phẩm chế biến từ Lò Bánh, Xưởng Cà Phê và Nhà Máy Sữa',
    childItemIds: [
      'butter_bread',
      'strawberry_tart',
      'phin_coffee',
      'durian_latte',
      'fresh_milk',
      'dopi_icecream',
    ],
  },
  {
    id: 'boosters',
    label: 'Vật phẩm hỗ trợ',
    emoji: '🧪',
    description: 'Phân bón tăng tốc, thuốc đột biến, dầu xưởng và thẻ tiện ích',
    childItemIds: BOOSTERS.map((b) => b.id),
  },
];

function getGroupForItemId(itemId: string): StorageCategoryGroup {
  for (const grp of STORAGE_CATEGORY_GROUPS) {
    if (grp.childItemIds.includes(itemId)) {
      return grp;
    }
  }
  const cat = ITEM_CATALOG[itemId]?.category;
  if (cat === 'product') return STORAGE_CATEGORY_GROUPS[3];
  if (cat === 'booster') return STORAGE_CATEGORY_GROUPS[4];
  return STORAGE_CATEGORY_GROUPS[0];
}

const BoosterShopRow = React.memo<{
  booster: BoosterDef;
  owned: number;
  playerLevel: number;
  gold: number;
  dopiCoins: number;
  storageHasRoom: boolean;
  onBuy: (id: string) => void;
}>(({ booster, owned, playerLevel, gold, dopiCoins, storageHasRoom, onBuy }) => {
  const locked = playerLevel < booster.minLevel;
  const canAfford =
    booster.currency === 'gold' ? gold >= booster.price : dopiCoins >= booster.price;

  return (
    <div
      className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 ${
        locked
          ? 'bg-slate-50 border-slate-200 opacity-65'
          : 'bg-[#FCFEFA] border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-2xl shrink-0">{booster.emoji}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">{booster.name}</span>
            <span className="text-[11px] font-mono-num text-slate-500">
              (Có: {owned})
            </span>
            {locked && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-600">
                <Lock className="w-3 h-3" />
                Yêu cầu Lv.{booster.minLevel}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{booster.description}</div>
        </div>
      </div>

      <button
        type="button"
        disabled={locked || !canAfford || !storageHasRoom}
        onClick={() => onBuy(booster.id)}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
          booster.currency === 'coins'
            ? 'bg-violet-600 text-white hover:bg-violet-700'
            : 'bg-amber-500 text-white hover:bg-amber-600'
        }`}
      >
        {locked ? (
          <>
            <Lock className="w-3.5 h-3.5" />
            <span>Lv.{booster.minLevel}</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="font-mono-num">
              {formatNumber(booster.price)}{' '}
              {booster.currency === 'coins' ? 'Xu' : 'Vàng'}
            </span>
          </>
        )}
      </button>
    </div>
  );
});
BoosterShopRow.displayName = 'BoosterShopRow';

const TreasureShopCard = React.memo<{
  treasure: TreasureDef;
  owned: boolean;
  playerLevel: number;
  gold: number;
  dopiCoins: number;
  onBuy: (id: string) => void;
}>(({ treasure, owned, playerLevel, gold, dopiCoins, onBuy }) => {
  const locked = playerLevel < treasure.minLevel;
  const canAfford =
    !owned &&
    !locked &&
    gold >= treasure.priceGold &&
    dopiCoins >= (treasure.priceCoins || 0);

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
        owned
          ? 'bg-[#FFFDF4] border-amber-300'
          : locked
            ? 'bg-slate-50 border-slate-200 opacity-70'
            : 'bg-white border-amber-200'
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-3xl leading-none">{treasure.emoji}</span>
          {owned ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Đã trưng bày
            </span>
          ) : locked ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
              <Lock className="w-3.5 h-3.5" />
              Yêu cầu Lv.{treasure.minLevel}
            </span>
          ) : (
            <span className="text-xs font-mono-num font-bold text-amber-700">
              +{formatNumber(treasure.wealthBonus)} Tài Phú
            </span>
          )}
        </div>
        <div className="text-sm font-bold text-slate-900">{treasure.name}</div>
        <p className="text-xs text-slate-500">{treasure.description}</p>
      </div>

      {owned ? (
        <div className="text-xs font-mono-num font-semibold text-amber-800 pt-2 border-t border-amber-200/70">
          +{formatNumber(treasure.wealthBonus)} điểm Tài Phú (Hiển thị trong Tủ Trưng Bày)
        </div>
      ) : (
        <button
          type="button"
          disabled={!canAfford}
          onClick={() => onBuy(treasure.id)}
          className={`w-full py-2 rounded-xl text-xs font-semibold font-mono-num transition-colors cursor-pointer ${
            canAfford
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          {locked
            ? `Mở khóa Lv.${treasure.minLevel}`
            : `Sở hữu · ${formatNumber(treasure.priceGold)}V${
                treasure.priceCoins
                  ? ` + ${formatNumber(treasure.priceCoins)} Xu`
                  : ''
              }`}
        </button>
      )}
    </div>
  );
});
TreasureShopCard.displayName = 'TreasureShopCard';

export const ShopStorageView: React.FC<ShopStorageViewProps> = ({
  user,
  nowMs,
  onBuyBooster,
  onBuyTreasure,
  onActivateUtilityItem,
  onExpandStorage,
  onSellToNpc,
  onGoToMarketWithItem,
}) => {
  const [expanding, setExpanding] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StorageGroupId>('all');
  const [selectedChildItem, setSelectedChildItem] = useState<string>('ALL');
  const [storageSearch, setStorageSearch] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const usedStorage = getTotalInventoryCount(user.inventory);
  const storageUpgradeCost = calculateStorageUpgradeCost(user.storageCapacity);
  const surge = getHourlyMarketSurge(nowMs);
  const storageHasRoom = usedStorage + 1 <= user.storageCapacity;

  const inventoryEntries = useMemo(
    () =>
      Object.entries(user.inventory).filter(
        ([itemId, qty]) => qty > 0 && Boolean(ITEM_CATALOG[itemId])
      ),
    [user.inventory]
  );

  // Total count per parent category group
  const groupUnitCounts = useMemo(() => {
    const counts: Record<string, number> = { all: usedStorage };
    for (const grp of STORAGE_CATEGORY_GROUPS) {
      counts[grp.id] = 0;
    }
    for (const [itemId, qty] of inventoryEntries) {
      const grp = getGroupForItemId(itemId);
      counts[grp.id] = (counts[grp.id] || 0) + qty;
    }
    return counts;
  }, [inventoryEntries, usedStorage]);

  const activeCategoryDef = useMemo(
    () =>
      selectedGroup === 'all'
        ? null
        : STORAGE_CATEGORY_GROUPS.find((g) => g.id === selectedGroup) ?? null,
    [selectedGroup]
  );

  // Filtered entries by Parent Group -> Child Item -> Search query
  const filteredEntries = useMemo(() => {
    const q = storageSearch.trim().toLowerCase();
    return inventoryEntries.filter(([itemId]) => {
      const item = ITEM_CATALOG[itemId];
      if (!item) return false;
      const grp = getGroupForItemId(itemId);
      if (selectedGroup !== 'all' && grp.id !== selectedGroup) {
        return false;
      }
      if (selectedChildItem !== 'ALL' && itemId !== selectedChildItem) {
        return false;
      }
      if (q && !item.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [inventoryEntries, selectedGroup, selectedChildItem, storageSearch]);

  // Grouped entries for structured accordion display
  const groupedFilteredSections = useMemo(() => {
    return STORAGE_CATEGORY_GROUPS.map((grp) => {
      const items = filteredEntries.filter(
        ([itemId]) => getGroupForItemId(itemId).id === grp.id
      );
      const totalQty = items.reduce((sum, [, qty]) => sum + qty, 0);
      return {
        group: grp,
        items,
        totalQty,
      };
    }).filter((section) => section.items.length > 0);
  }, [filteredEntries]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const boosterTiers = [
    { level: 1, title: 'Cơ Bản (Mở từ Lv.1)' },
    { level: 5, title: 'Trung Cấp (Mở từ Lv.5)' },
    { level: 10, title: 'Cao Cấp (Mở từ Lv.10)' },
    { level: 15, title: 'Siêu Phẩm (Mở từ Lv.15)' },
  ];

  const renderInventoryRow = (itemId: string, qty: number) => {
    const item = ITEM_CATALOG[itemId];
    if (!item) return null;
    const isSurging = surge.itemId === itemId;
    const livePrice = getItemSellPriceWithSurge(itemId, surge);
    const isActivatableUtility =
      itemId === 'auto_sprinkler_2h' || itemId === 'premium_storage_card';

    return (
      <div
        key={itemId}
        className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-[#F5F9F0] border border-[#DCE7D3] flex items-center justify-center text-xl shrink-0">
            {item.emoji}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 truncate">
                {item.name}
              </span>
              <span className="font-mono-num text-xs font-bold text-emerald-700">
                ×{qty}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono-num">
              <span>Giá thu mua: {formatNumber(livePrice)} V</span>
              {isSurging && (
                <span className="inline-flex items-center gap-0.5 text-amber-700 font-sans font-semibold">
                  <TrendingUp className="w-3 h-3" />+{surge.bonusPercent}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {isActivatableUtility && (
            <button
              type="button"
              onClick={() => onActivateUtilityItem(itemId)}
              className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 cursor-pointer whitespace-nowrap"
            >
              Dùng ngay
            </button>
          )}
          <button
            type="button"
            onClick={() => onSellToNpc(itemId, 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100 cursor-pointer whitespace-nowrap"
          >
            <Coins className="w-3.5 h-3.5" />
            Bán 1
          </button>
          {qty > 1 && (
            <button
              type="button"
              onClick={() => onSellToNpc(itemId, qty)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              Bán hết
            </button>
          )}
          <button
            type="button"
            onClick={() => onGoToMarketWithItem(itemId)}
            title="Treo bán trên Chợ P2P"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
          >
            Chợ P2P
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Level-Gated Shop */}
      <section className="lg:col-span-7 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Cửa Hàng Phân Cấp & Báu Vật Quý
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tăng cấp để mở khóa hạt giống giá trị cao, thuốc đột biến và báu vật trưng bày nông trại.
          </p>
        </div>

        {/* Storage Upgrade Card */}
        <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <PackagePlus className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Mở Rộng Kho (+{STORAGE_UPGRADE_STEP} ô)
                </h2>
                <p className="text-xs text-slate-500">
                  Sức chứa hiện tại:{' '}
                  <strong className="font-mono-num text-slate-800">
                    {usedStorage} / {user.storageCapacity}
                  </strong>{' '}
                  (Tăng theo cấp số nhân 1.45×)
                </p>
              </div>
            </div>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usedStorage >= user.storageCapacity
                  ? 'bg-rose-500'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(100, Math.round((usedStorage / user.storageCapacity) * 100))}%`,
              }}
            />
          </div>

          <button
            type="button"
            disabled={expanding || user.gold < storageUpgradeCost}
            onClick={async () => {
              setExpanding(true);
              try {
                await onExpandStorage();
              } finally {
                setExpanding(false);
              }
            }}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {expanding
              ? 'Đang mở rộng kho...'
              : `Nâng cấp lên ${user.storageCapacity + STORAGE_UPGRADE_STEP} sức chứa · ${formatNumber(storageUpgradeCost)} Vàng`}
          </button>
        </div>

        {/* Level-Gated Boosters */}
        <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Vật Phẩm Hỗ Trợ Trồng Trọt & Xưởng (Phân Cấp Lv.1 – Lv.15)
            </h2>
          </div>

          <div className="space-y-4">
            {boosterTiers.map((tier) => {
              const items = BOOSTERS.filter((b) => b.minLevel === tier.level);
              if (items.length === 0) return null;
              return (
                <div key={tier.level} className="space-y-2">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {tier.title}
                  </div>
                  <div className="space-y-2">
                    {items.map((b) => (
                      <BoosterShopRow
                        key={b.id}
                        booster={b}
                        owned={user.inventory[b.id] || 0}
                        playerLevel={user.level}
                        gold={user.gold}
                        dopiCoins={user.dopiCoins}
                        storageHasRoom={storageHasRoom}
                        onBuy={onBuyBooster}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ultra-Rare Treasures (Lv 15 -> Lv 40) */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Vật Phẩm Quý & Báu Vật Trưng Bày ({user.treasures?.length || 0}/
                  {TREASURES.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Mục tiêu cày dài hạn — hiển thị nổi bật trong Tủ Trưng Bày khi bạn bè ghé thăm.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {TREASURES.map((t) => (
              <TreasureShopCard
                key={t.id}
                treasure={t}
                owned={(user.treasures ?? []).includes(t.id)}
                playerLevel={user.level}
                gold={user.gold}
                dopiCoins={user.dopiCoins}
                onBuy={onBuyTreasure}
              />
            ))}
          </div>
        </div>

        {/* Seed Catalog Economics Table (Lv 1 -> Lv 25+) */}
        <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            Danh Mục Hạt Giống Phân Cấp (Lv.1 – Lv.25+)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2 pr-2 font-semibold">Giống cây</th>
                  <th className="py-2 px-2 font-semibold">Cấp mở</th>
                  <th className="py-2 px-2 font-semibold">Giá hạt</th>
                  <th className="py-2 pl-2 font-semibold text-right">
                    Giá bán gốc
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CROPS.map((c) => {
                  const locked = user.level < c.unlockLevel;
                  return (
                    <tr key={c.id} className={locked ? 'opacity-60' : ''}>
                      <td className="py-2.5 pr-2 font-semibold text-slate-800">
                        {c.emoji} {c.name}
                      </td>
                      <td className="py-2.5 px-2 font-mono-num">
                        {locked ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold">
                            <Lock className="w-3 h-3" />
                            Lv.{c.unlockLevel}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">
                            Lv.{c.unlockLevel}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono-num text-amber-700 font-semibold">
                        {formatNumber(c.seedPrice)} V
                      </td>
                      <td className="py-2.5 pl-2 font-mono-num text-emerald-700 font-semibold text-right">
                        {formatNumber(c.baseSellPrice)} V
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Right: Storage Inventory with 2-Tier Category -> Child Product Filter */}
      <section className="lg:col-span-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Kho Lưu Trữ ({usedStorage}/{user.storageCapacity})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn danh mục lớn (ví dụ: Trái cây, Lương thực, Bánh & Đồ uống) để lọc nhanh các sản phẩm con bên trong.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
          {/* Quick Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={storageSearch}
              onChange={(e) => setStorageSearch(e.target.value)}
              placeholder="Tìm nhanh vật phẩm trong kho..."
              aria-label="Tìm nhanh vật phẩm trong kho"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-[#FAFDF8] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          {/* Tier 1: Parent Category Group Filter */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>Bộ lọc nhóm danh mục</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedGroup('all');
                  setSelectedChildItem('ALL');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedGroup === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-[#FAFDF8] text-slate-700 border-slate-200 hover:bg-emerald-50'
                }`}
              >
                <span>📦 Tất cả</span>
                <span className="font-mono-num text-[11px] opacity-85">
                  ({usedStorage})
                </span>
              </button>

              {STORAGE_CATEGORY_GROUPS.map((grp) => {
                const active = selectedGroup === grp.id;
                const count = groupUnitCounts[grp.id] || 0;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => {
                      setSelectedGroup(grp.id);
                      setSelectedChildItem('ALL');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-[#FAFDF8] text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <span>
                      {grp.emoji} {grp.label}
                    </span>
                    <span className="font-mono-num text-[11px] opacity-85">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier 2: Child Product Sub-Filter inside the Selected Category */}
          {activeCategoryDef && (
            <div className="rounded-xl bg-[#F4FAF0] border border-[#DCE7D3] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-950">
                  {activeCategoryDef.emoji} Sản phẩm con trong nhóm {activeCategoryDef.label}:
                </span>
                {selectedChildItem !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedChildItem('ALL')}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Xem tất cả nhóm
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedChildItem('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    selectedChildItem === 'ALL'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  Tất cả ({groupUnitCounts[activeCategoryDef.id] || 0})
                </button>
                {activeCategoryDef.childItemIds.map((childId) => {
                  const childDef = ITEM_CATALOG[childId];
                  if (!childDef) return null;
                  const ownedQty = user.inventory[childId] || 0;
                  const isSelected = selectedChildItem === childId;
                  return (
                    <button
                      key={childId}
                      type="button"
                      onClick={() => setSelectedChildItem(childId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : ownedQty > 0
                            ? 'bg-white text-slate-800 border-emerald-200 hover:bg-emerald-50'
                            : 'bg-white/60 text-slate-400 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{childDef.emoji}</span>
                      <span>{childDef.name}</span>
                      <span className="font-mono-num text-[11px]">
                        ({ownedQty})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inventory List Grouped by Category */}
          {inventoryEntries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Kho hiện đang trống. Hãy thu hoạch nông sản hoặc chế biến tại Nhà Máy.
            </div>
          ) : groupedFilteredSections.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-slate-500 space-y-2">
              <p>
                Hiện chưa có sản phẩm nào trong kho thuộc bộ lọc đang chọn.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedGroup('all');
                  setSelectedChildItem('ALL');
                  setStorageSearch('');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
              >
                Hiển thị lại toàn bộ kho
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedFilteredSections.map(({ group, items, totalQty }) => {
                const isCollapsed =
                  selectedGroup === 'all' && Boolean(collapsedGroups[group.id]);
                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-[#E2ECDA] bg-[#FCFEFA] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.id)}
                      className="w-full px-3.5 py-2.5 bg-[#F4FAF0] border-b border-[#E2ECDA] flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-[#EAF5E4] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{group.emoji}</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {group.label}
                        </span>
                        <span className="text-[11px] font-mono-num text-emerald-700 font-semibold">
                          ({items.length} loại · {totalQty} món)
                        </span>
                      </div>
                      {selectedGroup === 'all' && (
                        <span className="text-slate-500 shrink-0">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      )}
                    </button>

                    {!isCollapsed && (
                      <div className="p-3.5 divide-y divide-slate-100">
                        {items.map(([itemId, qty]) =>
                          renderInventoryRow(itemId, qty)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
