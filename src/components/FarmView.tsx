import React, { useCallback, useMemo, useState } from 'react';
import {
  Droplets,
  Lock,
  Plus,
  Sparkles,
  Sprout,
  Timer,
  Zap,
} from 'lucide-react';
import { BOOSTERS, CROPS, MAX_PLOTS } from '../game/constants';
import {
  calculateGrowthDurationMs,
  calculatePlotCost,
  formatNumber,
  formatTimeRemaining,
  getBusinessBonuses,
  getVipPerks,
} from '../game/economy';
import type { FarmPlot, UserGameData } from '../game/types';

interface FarmViewProps {
  user: UserGameData;
  nowMs: number;
  onPlantPlot: (plotId: number, cropId: string) => Promise<void>;
  onHarvestPlot: (plotId: number) => Promise<void>;
  onHarvestAll: () => Promise<void>;
  onUseBooster: (plotId: number, boosterId: string) => Promise<void>;
  onBuyPlot: () => Promise<void>;
}

interface FarmPlotCardProps {
  plot: FarmPlot;
  nowMs: number;
  isInspected: boolean;
  onSelect: (plot: FarmPlot) => void;
}

const FarmPlotCard = React.memo<FarmPlotCardProps>(
  ({ plot, nowMs, isInspected, onSelect }) => {
    const crop = plot.cropId
      ? CROPS.find((c) => c.id === plot.cropId) ?? null
      : null;
    const remainingMs =
      plot.readyAt !== null ? Math.max(0, plot.readyAt - nowMs) : 0;
    const totalMs =
      plot.plantedAt !== null && plot.readyAt !== null
        ? Math.max(1000, plot.readyAt - plot.plantedAt)
        : 1000;
    const progressPct =
      plot.cropId && plot.readyAt !== null
        ? Math.min(
            100,
            Math.max(0, Math.round(((totalMs - remainingMs) / totalMs) * 100))
          )
        : 0;
    const isReady = Boolean(crop && remainingMs === 0);

    const stageEmoji = !crop
      ? null
      : isReady
        ? crop.emoji
        : progressPct < 45
          ? '🌱'
          : '🌿';

    return (
      <button
        type="button"
        onClick={() => onSelect(plot)}
        aria-label={
          !crop
            ? `Ô đất ${plot.id + 1}: Trống, bấm để gieo hạt`
            : isReady
              ? `Ô đất ${plot.id + 1}: ${crop.name} đã chín, bấm để thu hoạch`
              : `Ô đất ${plot.id + 1}: ${crop.name} đang lớn, còn ${formatTimeRemaining(remainingMs)}`
        }
        className={`relative rounded-2xl p-3.5 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[142px] border-2 ${
          !crop
            ? 'bg-[#D6B48C] border-[#B99265] hover:bg-[#CFA87A] text-amber-950'
            : isReady
              ? 'bg-[#FFFDF0] border-emerald-500 shadow-sm hover:-translate-y-0.5'
              : isInspected
                ? 'bg-[#C49A6C] border-sky-500 ring-2 ring-sky-400/35 text-white'
                : 'bg-[#C49A6C] border-[#9B7248] hover:border-[#7E5A35] text-white'
        }`}
      >
        {/* Top row: Plot number + Buff indicators */}
        <div className="flex items-center justify-between gap-1 text-[11px] font-mono-num">
          <span
            className={
              !crop
                ? 'text-amber-900/70'
                : isReady
                  ? 'text-slate-500'
                  : 'text-amber-100/80'
            }
          >
            #{plot.id + 1}
          </span>
          <div className="flex items-center gap-1">
            {plot.yieldBoosted && (
              <span title="Nước tưới dinh dưỡng (+25% sản lượng)">💧</span>
            )}
            {plot.mutationBoosted && (
              <span title="Thuốc đột biến vàng (20% x3 Vàng)">🧬</span>
            )}
            {plot.wateredBy && !isReady && (
              <span
                className="inline-flex items-center text-sky-100"
                title="Bạn bè đã tưới nước"
              >
                <Droplets className="w-3.5 h-3.5 text-sky-200" />
              </span>
            )}
            {isReady && (
              <span className="font-sans font-bold text-emerald-700">
                Thu hoạch!
              </span>
            )}
          </div>
        </div>

        {/* Center Visual */}
        <div className="my-2 flex flex-col items-center justify-center">
          {!crop ? (
            <div className="flex flex-col items-center text-amber-950/70">
              <Sprout className="w-6 h-6 mb-1" />
              <span className="text-xs font-semibold">Bấm gieo hạt</span>
            </div>
          ) : (
            <>
              <span
                className={`text-4xl leading-none select-none ${
                  isReady ? 'animate-float-gentle' : ''
                }`}
                role="img"
                aria-hidden="true"
              >
                {stageEmoji}
              </span>
              <span
                className={`text-xs font-bold mt-1.5 truncate max-w-full ${
                  isReady ? 'text-slate-900' : 'text-amber-50'
                }`}
              >
                {crop.name}
              </span>
            </>
          )}
        </div>

        {/* Bottom Progress / Countdown */}
        {crop ? (
          <div className="space-y-1">
            <div className="w-full h-1.5 rounded-full bg-black/20 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isReady ? 'bg-emerald-500' : 'bg-amber-300'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div
              className={`flex items-center justify-between text-[11px] font-mono-num ${
                isReady ? 'text-emerald-700 font-semibold' : 'text-amber-50'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {formatTimeRemaining(remainingMs)}
              </span>
              <span>{progressPct}%</span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-center text-amber-950/60">
            Đất màu mỡ sẵn sàng
          </div>
        )}
      </button>
    );
  }
);
FarmPlotCard.displayName = 'FarmPlotCard';

export const FarmView: React.FC<FarmViewProps> = ({
  user,
  nowMs,
  onPlantPlot,
  onHarvestPlot,
  onHarvestAll,
  onUseBooster,
  onBuyPlot,
}) => {
  const [selectedCropId, setSelectedCropId] = useState<string>('wheat');
  const [inspectPlotId, setInspectPlotId] = useState<number | null>(null);
  const [busyPlotId, setBusyPlotId] = useState<number | null>(null);
  const [buyingPlot, setBuyingPlot] = useState(false);

  const vipPerks = getVipPerks(user.vipLevel);
  const bonuses = getBusinessBonuses(user);
  const autoSprinklerActive = (user.autoWaterUntil || 0) > nowMs;
  const nextPlotCost = calculatePlotCost(user.farmPlots.length);
  const canBuyMorePlots = user.farmPlots.length < MAX_PLOTS;

  const readyPlotsCount = user.farmPlots.filter(
    (p) => p.cropId && p.readyAt !== null && p.readyAt <= nowMs
  ).length;

  const inspectedPlot: FarmPlot | null =
    inspectPlotId !== null
      ? user.farmPlots.find((p) => p.id === inspectPlotId) ?? null
      : null;

  const plotBoosters = useMemo(
    () =>
      BOOSTERS.filter(
        (b) =>
          b.effectType === 'speed_plot' ||
          b.effectType === 'yield_boost' ||
          b.effectType === 'mutation_serum'
      ),
    []
  );

  const handlePlotClick = useCallback(
    async (plot: FarmPlot) => {
      if (busyPlotId === plot.id) return;
      if (!plot.cropId) {
        setBusyPlotId(plot.id);
        try {
          await onPlantPlot(plot.id, selectedCropId);
        } finally {
          setBusyPlotId(null);
        }
        return;
      }

      if (plot.readyAt !== null && plot.readyAt <= Date.now()) {
        setBusyPlotId(plot.id);
        try {
          await onHarvestPlot(plot.id);
          if (inspectPlotId === plot.id) setInspectPlotId(null);
        } finally {
          setBusyPlotId(null);
        }
        return;
      }

      setInspectPlotId((prev) => (prev === plot.id ? null : plot.id));
    },
    [busyPlotId, inspectPlotId, onHarvestPlot, onPlantPlot, selectedCropId]
  );

  return (
    <div className="space-y-6">
      {/* Farm Action Bar */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Cánh Đồng Nông Trại
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
            <span>
              Đất canh tác:{' '}
              <strong className="font-mono-num text-slate-800">
                {user.farmPlots.length}/{MAX_PLOTS}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              VIP {user.vipLevel}:{' '}
              <strong className="text-emerald-700">
                -{vipPerks.growthReductionPct}% thời gian chín
              </strong>
            </span>
            {autoSprinklerActive && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-sky-700 font-semibold font-mono-num">
                  🚿 Tưới tự động (-15%): {formatTimeRemaining(user.autoWaterUntil - nowMs)}
                </span>
              </>
            )}
            {bonuses.autoHarvestEnabled && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold">
                  🧑‍🌾 Tự thu hoạch: Bật
                </span>
              </>
            )}
            {bonuses.extraYieldChancePct > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-semibold font-mono-num">
                  👩‍🔬 +{bonuses.extraYieldChancePct}% thu đôi
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={!vipPerks.harvestAllUnlocked || readyPlotsCount === 0}
            onClick={onHarvestAll}
            title={
              vipPerks.harvestAllUnlocked
                ? 'Thu hoạch toàn bộ ô đất đã chín'
                : 'Mở khóa từ VIP 4 trở lên'
            }
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              vipPerks.harvestAllUnlocked && readyPlotsCount > 0
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {vipPerks.harvestAllUnlocked ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>
              Thu hoạch tất cả
              {vipPerks.harvestAllUnlocked
                ? readyPlotsCount > 0
                  ? ` (${readyPlotsCount})`
                  : ''
                : ' (VIP 4)'}
            </span>
          </button>

          {canBuyMorePlots && (
            <button
              type="button"
              disabled={buyingPlot || user.gold < nextPlotCost}
              onClick={async () => {
                setBuyingPlot(true);
                try {
                  await onBuyPlot();
                } finally {
                  setBuyingPlot(false);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                Mở ô đất #{user.farmPlots.length + 1} ·{' '}
                <span className="font-mono-num">{formatNumber(nextPlotCost)} V</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Seed Selector Tray (Lv 1 -> Lv 25+) */}
      <section aria-label="Chọn hạt giống để gieo" className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-600 px-1">
          <span className="font-semibold text-slate-800">
            1. Chọn hạt giống muốn gieo — sau đó bấm vào ô đất trống
          </span>
          <span className="text-slate-500">
            Giá hạt giống trừ trực tiếp bằng Vàng · Hạt quý mở khóa tới Lv.25
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {CROPS.map((crop) => {
            const locked = user.level < crop.unlockLevel;
            const selected = selectedCropId === crop.id;
            const effectiveMs = calculateGrowthDurationMs(
              crop.id,
              user.vipLevel,
              autoSprinklerActive
            );
            const profitPerMin = Math.round(
              (crop.baseSellPrice - crop.seedPrice) / (effectiveMs / 60_000)
            );

            return (
              <button
                key={crop.id}
                type="button"
                disabled={locked}
                onClick={() => setSelectedCropId(crop.id)}
                className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                  locked
                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    : selected
                      ? 'bg-[#EAF7E1] border-emerald-600 ring-2 ring-emerald-500/25 shadow-xs'
                      : 'bg-white border-[#DCE7D3] hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-2xl leading-none"
                    role="img"
                    aria-hidden="true"
                  >
                    {crop.emoji}
                  </span>
                  {locked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Lock className="w-3 h-3" />
                      Lv.{crop.unlockLevel}
                    </span>
                  ) : (
                    <span className="font-mono-num text-xs font-bold text-amber-700">
                      {formatNumber(crop.seedPrice)} V
                    </span>
                  )}
                </div>
                <div className="font-semibold text-sm text-slate-900 mt-2 truncate">
                  {crop.name}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono-num">
                  <span>{formatTimeRemaining(effectiveMs)}</span>
                  <span className="text-emerald-700">+{profitPerMin}V/p</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sunlit Meadow Plot Grid */}
      <div className="rounded-3xl bg-[#E3F2D6] border border-[#C8E2B4] p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {user.farmPlots.map((plot) => (
            <FarmPlotCard
              key={plot.id}
              plot={plot}
              nowMs={nowMs}
              isInspected={inspectPlotId === plot.id}
              onSelect={handlePlotClick}
            />
          ))}
        </div>

        {/* Inline Booster Action Drawer for Selected Growing Plot */}
        {inspectedPlot &&
          inspectedPlot.cropId &&
          inspectedPlot.readyAt &&
          inspectedPlot.readyAt > nowMs && (
            <div className="bg-white rounded-2xl border border-[#DCE7D3] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl">
                    {CROPS.find((c) => c.id === inspectedPlot.cropId)?.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Chăm sóc & Bón phân · Ô đất #{inspectedPlot.id + 1} (
                      {CROPS.find((c) => c.id === inspectedPlot.cropId)?.name})
                    </div>
                    <div className="text-xs text-slate-500 font-mono-num">
                      Còn lại: {formatTimeRemaining(inspectedPlot.readyAt - nowMs)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectPlotId(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {plotBoosters.map((booster) => {
                  const count = user.inventory[booster.id] || 0;
                  const alreadyApplied =
                    (booster.effectType === 'yield_boost' &&
                      inspectedPlot.yieldBoosted) ||
                    (booster.effectType === 'mutation_serum' &&
                      inspectedPlot.mutationBoosted);

                  return (
                    <button
                      key={booster.id}
                      type="button"
                      disabled={count <= 0 || Boolean(alreadyApplied)}
                      onClick={async () => {
                        await onUseBooster(inspectedPlot.id, booster.id);
                        if (booster.speedReductionPercent >= 100) {
                          setInspectPlotId(null);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        {booster.emoji} {booster.name} ({count})
                        {alreadyApplied ? ' · Đã dùng' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
