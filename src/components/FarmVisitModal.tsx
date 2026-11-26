import React, { useState } from 'react';
import { Crown, Droplets, Sparkles, Truck, X } from 'lucide-react';
import {
  CROPS,
  FRIEND_HELP_REWARD_GOLD,
  MAX_FRIEND_HELPS_PER_DAY,
  TREASURES,
  VEHICLES,
} from '../game/constants';
import { formatNumber, formatTimeRemaining } from '../game/economy';
import type { PublicFarmData, UserGameData } from '../game/types';
import { VipAvatarFrame } from './BrandCrest';

interface FarmVisitModalProps {
  farm: PublicFarmData;
  currentUser: UserGameData;
  nowMs: number;
  onClose: () => void;
  onWaterPlot: (friendUid: string, plotId: number) => Promise<PublicFarmData | null>;
  onFarmUpdated?: (updated: PublicFarmData) => void;
}

export const FarmVisitModal: React.FC<FarmVisitModalProps> = ({
  farm,
  currentUser,
  nowMs,
  onClose,
  onWaterPlot,
  onFarmUpdated,
}) => {
  const [wateringPlotId, setWateringPlotId] = useState<number | null>(null);
  const isSelf = farm.uid === currentUser.uid;

  const ownedTreasures = (farm.treasures ?? [])
    .map((id) => TREASURES.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const ownedVehicles = (farm.vehicles ?? [])
    .map((id) => VEHICLES.find((v) => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-farm-title"
    >
      <div className="max-w-4xl w-full max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-[#F4FAF0]">
          <div className="flex items-center gap-3 min-w-0">
            <VipAvatarFrame
              avatarEmoji={farm.avatarEmoji}
              vipLevel={farm.vipLevel}
              size="md"
            />
            <div className="min-w-0">
              <h3
                id="visit-farm-title"
                className="text-base sm:text-lg font-bold text-slate-900 truncate"
              >
                {isSelf ? 'Nông trại của bạn: ' : 'Đang ghé thăm: '}
                {farm.businessName}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 font-mono-num">
                <span>Lv.{farm.level}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-semibold">
                  VIP {farm.vipLevel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold">
                  Tài Phú: {formatNumber(farm.wealthScore || 0)}
                </span>
                {!isSelf && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Tưới hôm nay: {currentUser.helpCountToday}/
                      {MAX_FRIEND_HELPS_PER_DAY} (+{FRIEND_HELP_REWARD_GOLD}V)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ ghé thăm nông trại"
            className="p-2 rounded-xl text-slate-500 hover:bg-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-[#FAFDF8]">
          {/* Tủ Trưng Bày Báu Vật & Bộ Sưu Tập Xe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#FFFDF4] border border-amber-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
                  <Crown className="w-4 h-4 text-amber-600" />
                  Tủ Trưng Bày Báu Vật ({ownedTreasures.length}/{TREASURES.length})
                </span>
              </div>
              {ownedTreasures.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Chủ trang trại chưa sở hữu báu vật quý hiếm nào.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ownedTreasures.map((t) => (
                    <div
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-semibold text-amber-950"
                      title={t.description}
                    >
                      <span className="text-base">{t.emoji}</span>
                      <span>{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#F4F9FF] border border-sky-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 uppercase tracking-wide">
                  <Truck className="w-4 h-4 text-sky-600" />
                  Đội Xe Doanh Nghiệp ({ownedVehicles.length}/{VEHICLES.length})
                </span>
              </div>
              {ownedVehicles.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Chủ trang trại chưa mua xe vận tải trong Showroom.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ownedVehicles.map((v) => (
                    <div
                      key={v.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-sky-200 text-xs font-semibold text-sky-950"
                      title={v.description}
                    >
                      <span className="text-base">{v.emoji}</span>
                      <span>{v.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Farm Plots */}
          <div className="rounded-2xl bg-[#E8F4DE] border border-[#CDE2BE] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-950 inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                Cánh Đồng Nông Trại ({farm.farmPlots.length} ô đất)
              </span>
              {!isSelf && (
                <span className="text-emerald-800">
                  Bấm Tưới giúp bạn bè giảm 15% thời gian chín
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {farm.farmPlots.map((plot) => {
                const crop = plot.cropId
                  ? CROPS.find((c) => c.id === plot.cropId)
                  : null;
                const remaining =
                  plot.readyAt !== null ? Math.max(0, plot.readyAt - nowMs) : 0;
                const canWater =
                  !isSelf &&
                  Boolean(crop) &&
                  remaining > 0 &&
                  plot.wateredBy !== currentUser.uid &&
                  currentUser.helpCountToday < MAX_FRIEND_HELPS_PER_DAY;

                return (
                  <div
                    key={plot.id}
                    className="rounded-2xl bg-white border border-[#CDE2BE] p-3.5 flex flex-col justify-between gap-2 text-center"
                  >
                    <div className="text-[11px] font-mono-num text-slate-400 text-left">
                      Ô #{plot.id + 1}
                    </div>
                    <div className="text-3xl">{crop ? crop.emoji : '🟫'}</div>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {crop ? crop.name : 'Đất trống'}
                    </div>
                    {crop && (
                      <div className="text-[11px] font-mono-num text-slate-500">
                        {remaining > 0 ? formatTimeRemaining(remaining) : 'Đã chín'}
                      </div>
                    )}
                    {!isSelf && crop && remaining > 0 && (
                      <button
                        type="button"
                        disabled={!canWater || wateringPlotId === plot.id}
                        onClick={async () => {
                          setWateringPlotId(plot.id);
                          try {
                            const updated = await onWaterPlot(farm.uid, plot.id);
                            if (updated && onFarmUpdated) {
                              onFarmUpdated(updated);
                            }
                          } finally {
                            setWateringPlotId(null);
                          }
                        }}
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Droplets className="w-3.5 h-3.5" />
                        {plot.wateredBy === currentUser.uid
                          ? 'Đã tưới'
                          : 'Tưới (+20V)'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
