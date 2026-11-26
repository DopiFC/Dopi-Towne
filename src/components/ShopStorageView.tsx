import React, { useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Crown,
  Lock,
  PackagePlus,
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

  const usedStorage = getTotalInventoryCount(user.inventory);
  const storageUpgradeCost = calculateStorageUpgradeCost(user.storageCapacity);
  const surge = getHourlyMarketSurge(nowMs);
  const storageHasRoom = usedStorage + 1 <= user.storageCapacity;

  const inventoryEntries = Object.entries(user.inventory).filter(
    ([, qty]) => qty > 0
  );

  const boosterTiers = [
    { level: 1, title: 'Cơ Bản (Mở từ Lv.1)' },
    { level: 5, title: 'Trung Cấp (Mở từ Lv.5)' },
    { level: 10, title: 'Cao Cấp (Mở từ Lv.10)' },
    { level: 15, title: 'Siêu Phẩm (Mở từ Lv.15)' },
  ];

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

      {/* Right: Storage Inventory */}
      <section className="lg:col-span-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Kho Lưu Trữ ({usedStorage}/{user.storageCapacity})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kích hoạt vật phẩm đặc biệt, bán nhanh lấy Vàng hoặc rao lên Chợ P2P.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5">
          {inventoryEntries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Kho hiện đang trống. Hãy thu hoạch nông sản hoặc chế biến tại Nhà Máy.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inventoryEntries.map(([itemId, qty]) => {
                const item = ITEM_CATALOG[itemId];
                if (!item) return null;
                const isSurging = surge.itemId === itemId;
                const livePrice = getItemSellPriceWithSurge(itemId, surge);
                const isActivatableUtility =
                  itemId === 'auto_sprinkler_2h' ||
                  itemId === 'premium_storage_card';

                return (
                  <div
                    key={itemId}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3"
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
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
