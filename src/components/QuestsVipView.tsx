import React, { useState } from 'react';
import { Award, CheckCircle2, Crown, Gift, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, VIP_TIERS } from '../game/constants';
import { formatNumber, getNextVipTier, getVipPerks } from '../game/economy';
import type { UserGameData } from '../game/types';

interface QuestsVipViewProps {
  user: UserGameData;
  onClaimDailyQuest: (questId: string) => Promise<void>;
  onClaimAchievement: (achId: string) => Promise<void>;
  onOpenRedeemModal: () => void;
}

export const QuestsVipView: React.FC<QuestsVipViewProps> = ({
  user,
  onClaimDailyQuest,
  onClaimAchievement,
  onOpenRedeemModal,
}) => {
  const [subTab, setSubTab] = useState<'daily' | 'achievements' | 'vip'>('daily');

  const currentVip = getVipPerks(user.vipLevel);
  const nextVip = getNextVipTier(user.vipLevel);
  const vipPct = nextVip
    ? Math.min(
        100,
        Math.round((user.totalRechargedCoins / nextVip.requiredCoins) * 100)
      )
    : 100;

  return (
    <div className="space-y-6">
      {/* Sub-navigation Header */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Nhiệm Vụ, Thành Tựu & Đặc Quyền VIP
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nhiệm vụ ngày tự động làm mới vào 00:00 mỗi ngày · Nhận tối đa 10 Xu DOPI miễn phí/ngày.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F2F7ED] rounded-xl border border-[#DCE7D3]">
          <button
            type="button"
            onClick={() => setSubTab('daily')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'daily'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Nhiệm vụ ngày
          </button>
          <button
            type="button"
            onClick={() => setSubTab('achievements')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'achievements'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Thành tựu
          </button>
          <button
            type="button"
            onClick={() => setSubTab('vip')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'vip'
                ? 'bg-white text-violet-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Bảng VIP 1–10
          </button>
        </div>
      </div>

      {/* Daily Quests Tab */}
      {subTab === 'daily' && (
        <div className="space-y-3">
          {user.dailyQuests.map((quest) => {
            const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
            const ready = quest.progress >= quest.target && !quest.claimed;
            return (
              <div
                key={quest.id}
                className="bg-white rounded-2xl border border-[#DCE7D3] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-[220px] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {quest.title}
                    </span>
                    <span className="font-mono-num text-xs font-semibold text-slate-600">
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono-num text-slate-600">
                    <span className="text-amber-700 font-semibold">
                      +{formatNumber(quest.rewardGold)} Vàng
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-violet-700 font-semibold">
                      +{quest.rewardCoins} Xu DOPI
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => onClaimDailyQuest(quest.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    quest.claimed
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : ready
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {quest.claimed
                      ? 'Đã nhận'
                      : ready
                        ? 'Nhận thưởng'
                        : 'Đang thực hiện'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Achievements Tab */}
      {subTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACHIEVEMENTS.map((ach) => {
            const currentVal = user.stats?.[ach.statKey] || 0;
            const claimed = Boolean(user.achievements?.[ach.id]?.claimed);
            const pct = Math.min(100, Math.round((currentVal / ach.target) * 100));
            const ready = currentVal >= ach.target && !claimed;

            return (
              <div
                key={ach.id}
                className="bg-white rounded-2xl border border-[#DCE7D3] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-2xl bg-[#F4F9EE] border border-[#DCE7D3] flex items-center justify-center text-2xl">
                        {ach.emoji}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">
                          {ach.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-slate-700">
                      {Math.min(currentVal, ach.target)}/{ach.target}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs font-mono-num">
                    <span className="text-amber-700 font-semibold">
                      +{formatNumber(ach.rewardGold)} V
                    </span>{' '}
                    ·{' '}
                    <span className="text-violet-700 font-semibold">
                      +{ach.rewardCoins} Xu
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!ready}
                    onClick={() => onClaimAchievement(ach.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      claimed
                        ? 'bg-slate-100 text-slate-500 cursor-default'
                        : ready
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {claimed ? 'Đã nhận' : ready ? 'Nhận thưởng' : 'Chưa đạt'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIP 1-10 Roadmap Tab */}
      {subTab === 'vip' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-violet-200 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-[260px]">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  Cấp hiện tại: VIP {user.vipLevel} — {currentVip.frameTitle}
                </h2>
              </div>
              <div className="w-full max-w-xl h-2.5 bg-violet-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all"
                  style={{ width: `${vipPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 font-mono-num">
                Tổng Xu DOPI đã nạp:{' '}
                <strong className="text-violet-800">
                  {formatNumber(user.totalRechargedCoins)} Xu
                </strong>{' '}
                {nextVip
                  ? `· Cần thêm ${formatNumber(Math.max(0, nextVip.requiredCoins - user.totalRechargedCoins))} Xu để lên VIP ${nextVip.level}`
                  : '· Bạn đã chạm đỉnh VIP 10!'}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenRedeemModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer whitespace-nowrap"
            >
              <Gift className="w-4 h-4" />
              Nạp Code nâng cấp VIP
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#DCE7D3] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F6FAF2] text-xs text-slate-600 border-b border-[#DCE7D3]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Hạng VIP</th>
                    <th className="py-3 px-4 font-semibold">Mốc Xu DOPI nạp</th>
                    <th className="py-3 px-4 font-semibold">Giảm thời gian trồng</th>
                    <th className="py-3 px-4 font-semibold">Thuế Chợ P2P</th>
                    <th className="py-3 px-4 font-semibold">Ô hàng đợi xưởng</th>
                    <th className="py-3 px-4 font-semibold">Thu hoạch tất cả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {VIP_TIERS.slice(1).map((tier) => {
                    const reached = user.vipLevel >= tier.level;
                    const isCurrent = user.vipLevel === tier.level;
                    return (
                      <tr
                        key={tier.level}
                        className={
                          isCurrent
                            ? 'bg-violet-50/70 font-semibold'
                            : reached
                              ? 'bg-emerald-50/30'
                              : ''
                        }
                      >
                        <td className="py-3 px-4">
                          <span className={`font-bold ${tier.badgeColorClass}`}>
                            VIP {tier.level}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            {tier.frameTitle}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono-num text-slate-800">
                          {formatNumber(tier.requiredCoins)} Xu
                        </td>
                        <td className="py-3 px-4 font-mono-num text-emerald-700">
                          -{tier.growthReductionPct}%
                        </td>
                        <td className="py-3 px-4 font-mono-num text-amber-700">
                          {tier.marketTaxPct}%
                        </td>
                        <td className="py-3 px-4 font-mono-num text-slate-800">
                          {tier.factoryQueueSlots} ô
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {tier.harvestAllUnlocked ? (
                            <span className="text-emerald-700 font-semibold">
                              Đã mở khóa
                            </span>
                          ) : (
                            <span className="text-slate-400">Chưa mở</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
