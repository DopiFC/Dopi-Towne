import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Droplet,
  Lock,
  PackageCheck,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { FACTORIES, ITEM_CATALOG, RECIPES } from '../game/constants';
import {
  formatNumber,
  formatTimeRemaining,
  getBusinessBonuses,
  getHourlyMarketSurge,
  getVipPerks,
} from '../game/economy';
import type { FactoryId, NpcOrder, UserGameData } from '../game/types';

interface FactoryOrdersViewProps {
  user: UserGameData;
  nowMs: number;
  onUnlockFactory: (factoryId: FactoryId) => Promise<void>;
  onStartRecipe: (factoryId: FactoryId, recipeId: string) => Promise<void>;
  onCollectFactoryItem: (factoryId: FactoryId, queueItemId: string) => Promise<void>;
  onUseFactoryOil: (factoryId: FactoryId) => Promise<void>;
  onDeliverNpcOrder: (order: NpcOrder) => Promise<void>;
  onRefreshNpcOrders: () => Promise<void>;
}

export const FactoryOrdersView: React.FC<FactoryOrdersViewProps> = ({
  user,
  nowMs,
  onUnlockFactory,
  onStartRecipe,
  onCollectFactoryItem,
  onUseFactoryOil,
  onDeliverNpcOrder,
  onRefreshNpcOrders,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const surge = getHourlyMarketSurge(nowMs);
  const surgeItem = ITEM_CATALOG[surge.itemId];
  const vipPerks = getVipPerks(user.vipLevel);
  const bonuses = getBusinessBonuses(user);
  const factoryOilCount = user.inventory.factory_oil || 0;

  return (
    <div className="space-y-6">
      {/* Hourly Market Surge Banner */}
      {surgeItem && (
        <div className="bg-[#FFFBEB] rounded-2xl border border-amber-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-2xl shrink-0">
              {surgeItem.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <TrendingUp className="w-4 h-4" />
                <span>Biến động thị trường theo giờ</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">
                  Đổi sau {formatTimeRemaining(surge.endsAt - nowMs)}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {surgeItem.name} đang sốt giá{' '}
                <span className="text-amber-700 font-mono-num">
                  +{surge.bonusPercent}%
                </span>
              </h2>
              <p className="text-xs text-slate-600">
                Bán trực tiếp trong Kho hoặc giao đơn hàng NPC chứa {surgeItem.name} đều được cộng giá sốt!
              </p>
            </div>
          </div>
          <div className="text-right font-mono-num">
            <div className="text-xs text-slate-500">Giá thị trường hiện tại</div>
            <div className="text-lg font-bold text-amber-700">
              {formatNumber(
                Math.round(surgeItem.baseSellPrice * (1 + surge.bonusPercent / 100))
              )}{' '}
              Vàng
            </div>
          </div>
        </div>
      )}

      {/* Main Split: Factories (left 7 cols) + NPC Order Board (right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Factories Column */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Nhà Máy Chế Biến
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Hàng đợi:{' '}
                <strong className="font-mono-num text-slate-800">
                  {vipPerks.factoryQueueSlots} ô/xưởng
                </strong>
                {bonuses.factorySpeedReductionPct > 0 && (
                  <>
                    {' · '}
                    <strong className="text-sky-700 font-mono-num">
                      Quản lý xưởng -{bonuses.factorySpeedReductionPct}% thời gian
                    </strong>
                  </>
                )}
              </p>
            </div>
            <div className="text-xs text-slate-600 font-mono-num">
              🛢️ Dầu bôi trơn: <strong>{factoryOilCount}</strong>
            </div>
          </div>

          <div className="space-y-4">
            {FACTORIES.map((factoryDef) => {
              const state = user.factories.find((f) => f.id === factoryDef.id) ?? {
                id: factoryDef.id,
                unlocked: false,
                queue: [],
              };
              const recipes = RECIPES.filter((r) => r.factoryId === factoryDef.id);
              const hasActiveQueue = state.queue.some((q) => q.readyAt > nowMs);

              return (
                <div
                  key={factoryDef.id}
                  className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-2xl bg-[#F4F9EE] border border-[#DCE7D3] flex items-center justify-center text-2xl">
                        {factoryDef.emoji}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {factoryDef.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {factoryDef.description}
                        </p>
                      </div>
                    </div>

                    {!state.unlocked ? (
                      <button
                        type="button"
                        disabled={
                          busyId === factoryDef.id ||
                          user.level < factoryDef.unlockLevel ||
                          user.gold < factoryDef.unlockCostGold
                        }
                        onClick={async () => {
                          setBusyId(factoryDef.id);
                          try {
                            await onUnlockFactory(factoryDef.id);
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>
                          Mở khóa · Lv.{factoryDef.unlockLevel} ·{' '}
                          <span className="font-mono-num">
                            {formatNumber(factoryDef.unlockCostGold)} V
                          </span>
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {hasActiveQueue && (
                          <button
                            type="button"
                            disabled={factoryOilCount <= 0}
                            onClick={() => onUseFactoryOil(factoryDef.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold hover:bg-sky-100 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                          >
                            <Droplet className="w-3.5 h-3.5" />
                            Bôi trơn -25% ({factoryOilCount})
                          </button>
                        )}
                        <span className="text-xs font-mono-num text-slate-500">
                          Hàng đợi: {state.queue.length}/{vipPerks.factoryQueueSlots}
                        </span>
                      </div>
                    )}
                  </div>

                  {state.unlocked && (
                    <>
                      {/* Active Production Queue */}
                      {state.queue.length > 0 && (
                        <div className="rounded-xl bg-[#F7FAF3] border border-[#E3EEDB] p-3 space-y-2">
                          <div className="text-xs font-semibold text-slate-700">
                            Đang chế biến
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {state.queue.map((qItem) => {
                              const recipe = RECIPES.find(
                                (r) => r.id === qItem.recipeId
                              );
                              if (!recipe) return null;
                              const remain = Math.max(0, qItem.readyAt - nowMs);
                              const ready = remain === 0;
                              return (
                                <div
                                  key={qItem.id}
                                  className="flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xl">{recipe.emoji}</span>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-slate-900 truncate">
                                        {recipe.name}
                                      </div>
                                      <div className="text-[11px] font-mono-num text-slate-500">
                                        {ready
                                          ? 'Hoàn thành!'
                                          : formatTimeRemaining(remain)}
                                      </div>
                                    </div>
                                  </div>
                                  {ready ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onCollectFactoryItem(
                                          factoryDef.id,
                                          qItem.id
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
                                    >
                                      Thu nhận
                                    </button>
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recipes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {recipes.map((recipe) => {
                          const locked = user.level < recipe.unlockLevel;
                          const queueFull =
                            state.queue.length >= vipPerks.factoryQueueSlots;
                          const hasIngredients = Object.entries(
                            recipe.ingredients
                          ).every(
                            ([itemId, need]) =>
                              (user.inventory[itemId] || 0) >= need
                          );
                          const effectiveMs = Math.max(
                            5_000,
                            Math.round(
                              recipe.productionSeconds *
                                1000 *
                                (1 - bonuses.factorySpeedReductionPct / 100)
                            )
                          );

                          return (
                            <div
                              key={recipe.id}
                              className="rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between gap-3 bg-[#FCFEFA]"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">{recipe.emoji}</span>
                                    <div>
                                      <div className="text-sm font-bold text-slate-900">
                                        {recipe.name}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-mono-num">
                                        {formatTimeRemaining(effectiveMs)} · Giá{' '}
                                        {formatNumber(recipe.baseSellPrice)} V
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  {Object.entries(recipe.ingredients).map(
                                    ([itemId, need]) => {
                                      const info = ITEM_CATALOG[itemId];
                                      const owned = user.inventory[itemId] || 0;
                                      const enough = owned >= need;
                                      return (
                                        <span
                                          key={itemId}
                                          className={`font-mono-num ${
                                            enough
                                              ? 'text-slate-700'
                                              : 'text-rose-600 font-semibold'
                                          }`}
                                        >
                                          {info?.emoji} {owned}/{need}
                                        </span>
                                      );
                                    }
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={locked || queueFull || !hasIngredients}
                                onClick={() =>
                                  onStartRecipe(factoryDef.id, recipe.id)
                                }
                                className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {locked
                                  ? `Mở ở Lv.${recipe.unlockLevel}`
                                  : queueFull
                                    ? 'Hàng đợi đã đầy'
                                    : !hasIngredients
                                      ? 'Thiếu nguyên liệu'
                                      : 'Sản xuất ngay'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* NPC Orders Board Column */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Bảng Đơn Hàng NPC
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Giao đơn nhận Vàng + EXP + 2 Vé Sự Kiện
                {bonuses.orderRewardBonusPct > 0 && (
                  <>
                    {' · '}
                    <strong className="text-amber-700 font-mono-num">
                      +{bonuses.orderRewardBonusPct}% thưởng doanh nghiệp
                    </strong>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshNpcOrders}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Đổi đơn mới
            </button>
          </div>

          <div className="space-y-3">
            {user.npcOrders.map((order) => {
              const canDeliver = Object.entries(order.items).every(
                ([itemId, qty]) => (user.inventory[itemId] || 0) >= qty
              );
              const remaining = Math.max(0, order.expiresAt - nowMs);
              const boostedGold = Math.round(
                order.rewardGold * (1 + bonuses.orderRewardBonusPct / 100)
              );

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#DCE7D3] p-4 space-y-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl">
                        {order.customerEmoji}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] font-mono-num text-slate-500">
                          Làm mới sau: {formatTimeRemaining(remaining)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono-num">
                      <div className="text-sm font-bold text-amber-700">
                        +{formatNumber(boostedGold)} V
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700">
                        +{order.rewardExp} EXP · +2 Vé
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#FAFDF8] border border-slate-100 p-3 space-y-1.5">
                    {Object.entries(order.items).map(([itemId, qty]) => {
                      const info = ITEM_CATALOG[itemId];
                      const owned = user.inventory[itemId] || 0;
                      const ok = owned >= qty;
                      return (
                        <div
                          key={itemId}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-700 font-medium">
                            {info?.emoji} {info?.name ?? itemId}
                          </span>
                          <span
                            className={`font-mono-num font-bold ${
                              ok ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {owned} / {qty}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={!canDeliver}
                    onClick={() => onDeliverNpcOrder(order)}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      canDeliver
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {canDeliver ? (
                      <PackageCheck className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {canDeliver
                        ? 'Giao đơn hàng ngay'
                        : 'Chưa đủ nông sản trong kho'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
