import React, { useMemo, useState } from 'react';
import {
  Crown,
  Globe,
  Home,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react';
import { TREASURES, VEHICLES } from '../game/constants';
import { calculateWealthScore, formatNumber } from '../game/economy';
import type { PublicFarmData, UserGameData } from '../game/types';
import { VipAvatarFrame } from './BrandCrest';
import { FarmVisitModal } from './FarmVisitModal';

interface LeaderboardViewProps {
  user: UserGameData;
  nowMs: number;
  serverFarms: PublicFarmData[];
  friendsFarms: PublicFarmData[];
  loading: boolean;
  onRefreshServer: () => Promise<void>;
  onWaterFriendPlot: (
    friendUid: string,
    plotId: number
  ) => Promise<PublicFarmData | null>;
}

type BoardScope = 'server' | 'friends';
type RankCategory = 'wealth' | 'level' | 'vip';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  user,
  nowMs,
  serverFarms,
  friendsFarms,
  loading,
  onRefreshServer,
  onWaterFriendPlot,
}) => {
  const [scope, setScope] = useState<BoardScope>('server');
  const [category, setCategory] = useState<RankCategory>('wealth');
  const [visitingFarm, setVisitingFarm] = useState<PublicFarmData | null>(null);

  const myPublicCard: PublicFarmData = useMemo(
    () => ({
      uid: user.uid,
      isPublic: true,
      businessName: user.businessName,
      displayName: user.profile.displayName,
      avatarEmoji: user.profile.avatarEmoji,
      level: user.level,
      vipLevel: user.vipLevel,
      totalRechargedCoins: user.totalRechargedCoins,
      wealthScore: calculateWealthScore(user),
      vehicles: user.vehicles ?? [],
      treasures: user.treasures ?? [],
      farmPlots: user.farmPlots,
      updatedAt: user.updatedAt,
    }),
    [user]
  );

  const rankedList = useMemo(() => {
    const rawPool = scope === 'server' ? serverFarms : friendsFarms;
    const dedup = new Map<string, PublicFarmData>();
    for (const farm of rawPool) {
      dedup.set(farm.uid, farm);
    }
    // Luôn cập nhật bản mới nhất của chính người chơi trong danh sách
    dedup.set(myPublicCard.uid, myPublicCard);

    return Array.from(dedup.values()).sort((a, b) => {
      if (category === 'wealth') {
        return (b.wealthScore || 0) - (a.wealthScore || 0) || b.level - a.level;
      }
      if (category === 'level') {
        return b.level - a.level || (b.wealthScore || 0) - (a.wealthScore || 0);
      }
      return (
        b.vipLevel - a.vipLevel ||
        (b.totalRechargedCoins || 0) - (a.totalRechargedCoins || 0) ||
        (b.wealthScore || 0) - (a.wealthScore || 0)
      );
    });
  }, [scope, serverFarms, friendsFarms, myPublicCard, category]);

  const myRankIndex = rankedList.findIndex((f) => f.uid === user.uid);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : rankedList.length + 1;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Bảng Xếp Hạng DOPI TOWNE
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Vinh danh các điền chủ dẫn đầu Server & Bạn Bè — bấm Ghé thăm để xem Tủ Báu Vật & Đội Xe.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onRefreshServer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Cập nhật BXH
          </button>
        </div>

        {/* Scope & Metric Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setScope('server')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                scope === 'server'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Toàn Server
            </button>
            <button
              type="button"
              onClick={() => setScope('friends')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                scope === 'friends'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Bạn Bè ({friendsFarms.length + 1})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'wealth', label: 'Top Tài Phú' },
                { id: 'level', label: 'Top Cấp Độ' },
                { id: 'vip', label: 'Top VIP' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCategory(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  category === opt.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking Rows */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] divide-y divide-slate-100 overflow-hidden">
        {rankedList.map((farm, idx) => {
          const rank = idx + 1;
          const isMe = farm.uid === user.uid;
          const topVehicleEmojis = (farm.vehicles ?? [])
            .slice(-3)
            .map((id) => VEHICLES.find((v) => v.id === id)?.emoji)
            .filter(Boolean);
          const topTreasureEmojis = (farm.treasures ?? [])
            .slice(0, 4)
            .map((id) => TREASURES.find((t) => t.id === id)?.emoji)
            .filter(Boolean);

          return (
            <div
              key={farm.uid}
              className={`px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                isMe
                  ? 'bg-[#EFF9E8]'
                  : rank <= 3
                    ? 'bg-[#FFFDF5]'
                    : 'hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 text-center font-mono-num font-bold shrink-0 ${
                    rank <= 3 ? 'text-2xl' : 'text-sm text-slate-500'
                  }`}
                >
                  {getRankBadge(rank)}
                </div>

                <VipAvatarFrame
                  avatarEmoji={farm.avatarEmoji}
                  vipLevel={farm.vipLevel}
                  size="sm"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {farm.businessName}
                    </span>
                    {isMe && (
                      <span className="text-[11px] font-bold text-emerald-700">
                        (Bạn)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
                    <span className="font-mono-num">Lv.{farm.level}</span>
                    <span className="text-amber-700 font-semibold font-mono-num">
                      VIP {farm.vipLevel}
                    </span>
                    {(topVehicleEmojis.length > 0 || topTreasureEmojis.length > 0) && (
                      <span
                        className="tracking-wider"
                        title="Xe & Báu vật nổi bật"
                      >
                        {topVehicleEmojis.join('')} {topTreasureEmojis.join('')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <div className="text-right font-mono-num">
                  {category === 'wealth' && (
                    <>
                      <div className="text-sm font-bold text-amber-700">
                        {formatNumber(farm.wealthScore || 0)}
                      </div>
                      <div className="text-[11px] text-slate-500">Tài Phú</div>
                    </>
                  )}
                  {category === 'level' && (
                    <>
                      <div className="text-sm font-bold text-emerald-700">
                        Lv.{farm.level}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatNumber(farm.wealthScore || 0)} Tài Phú
                      </div>
                    </>
                  )}
                  {category === 'vip' && (
                    <>
                      <div className="text-sm font-bold text-violet-700 inline-flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        VIP {farm.vipLevel}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatNumber(farm.totalRechargedCoins || 0)} Xu tích lũy
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setVisitingFarm(farm)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Home className="w-3.5 h-3.5" />
                  Ghé thăm
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Footer Pinning Player's Own Rank */}
      <div className="fixed bottom-3 left-0 right-0 z-30 px-4 pointer-events-none">
        <div className="max-w-7xl mx-auto pointer-events-auto">
          <div className="rounded-2xl bg-emerald-950 text-white shadow-xl border border-emerald-800 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono-num text-sm font-bold text-amber-300 shrink-0">
                Hạng của bạn: {getRankBadge(myRank)}
              </span>
              <span className="text-xs sm:text-sm font-semibold truncate">
                {user.businessName}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono-num">
              <span>Lv.{user.level}</span>
              <span className="text-amber-300 font-bold">
                Tài Phú: {formatNumber(myPublicCard.wealthScore || 0)}
              </span>
              <span className="text-violet-300 font-bold">VIP {user.vipLevel}</span>
            </div>
          </div>
        </div>
      </div>

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
