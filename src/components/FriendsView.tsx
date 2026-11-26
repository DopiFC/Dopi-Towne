import React, { useState } from 'react';
import {
  Check,
  Copy,
  Home,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import {
  FRIEND_HELP_REWARD_GOLD,
  MAX_FRIEND_HELPS_PER_DAY,
} from '../game/constants';
import type {
  FriendRequestDoc,
  PublicFarmData,
  UserGameData,
} from '../game/types';
import { VipAvatarFrame } from './BrandCrest';
import { FarmVisitModal } from './FarmVisitModal';

interface FriendsViewProps {
  user: UserGameData;
  nowMs: number;
  friendsFarms: PublicFarmData[];
  incomingRequests: FriendRequestDoc[];
  outgoingRequests: FriendRequestDoc[];
  onSearchPlayer: (query: string) => Promise<PublicFarmData | null>;
  onSendFriendRequest: (toUid: string) => Promise<void>;
  onRespondRequest: (req: FriendRequestDoc, accept: boolean) => Promise<void>;
  onWaterFriendPlot: (
    friendUid: string,
    plotId: number
  ) => Promise<PublicFarmData | null>;
  onCopyUid: (uid: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  user,
  nowMs,
  friendsFarms,
  incomingRequests,
  outgoingRequests,
  onSearchPlayer,
  onSendFriendRequest,
  onRespondRequest,
  onWaterFriendPlot,
  onCopyUid,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<PublicFarmData | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [visitingFarm, setVisitingFarm] = useState<PublicFarmData | null>(null);

  const pendingIncoming = incomingRequests.filter((r) => r.status === 'pending');
  const pendingOutgoingUids = new Set(
    outgoingRequests.filter((r) => r.status === 'pending').map((r) => r.toUid)
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearching(true);
    setSearchNotFound(false);
    try {
      const found = await onSearchPlayer(searchInput);
      setSearchResult(found);
      if (!found) setSearchNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Daily Watering Quota */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Bạn Bè & Ghé Thăm Nông Trại
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hỗ trợ tưới cây cho bạn bè để nhận +{FRIEND_HELP_REWARD_GOLD} Vàng/lần (tối đa {MAX_FRIEND_HELPS_PER_DAY} lần/ngày).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 font-semibold font-mono-num">
            Đã tưới hôm nay: {user.helpCountToday}/{MAX_FRIEND_HELPS_PER_DAY}
          </div>
          <button
            type="button"
            onClick={() => onCopyUid(user.uid)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="font-mono-num">UID: {user.uid.slice(0, 10)}...</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Search & Requests */}
        <section className="lg:col-span-5 space-y-5">
          {/* Find Friends */}
          <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Tìm Bạn Theo UID Hoặc Email
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Nhập Email hoặc UID bạn bè..."
                  aria-label="Tìm bạn theo UID hoặc Email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-[#FAFDF8] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {searching ? 'Đang tìm...' : 'Tìm'}
              </button>
            </form>

            {searchNotFound && (
              <p className="text-xs text-slate-500">
                Không tìm thấy nông trại nào khớp với UID hoặc Email vừa nhập.
              </p>
            )}

            {searchResult && (
              <div className="rounded-xl border border-emerald-200 bg-[#F4FAF0] p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <VipAvatarFrame
                    avatarEmoji={searchResult.avatarEmoji}
                    vipLevel={searchResult.vipLevel}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {searchResult.businessName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono-num">
                      Lv.{searchResult.level} · VIP {searchResult.vipLevel}
                    </div>
                  </div>
                </div>
                {searchResult.uid === user.uid ? (
                  <span className="text-xs text-slate-500">Chính là bạn</span>
                ) : user.friends.includes(searchResult.uid) ? (
                  <span className="text-xs font-semibold text-emerald-700">
                    Đã là bạn bè
                  </span>
                ) : pendingOutgoingUids.has(searchResult.uid) ? (
                  <span className="text-xs text-amber-700 font-medium">
                    Đã gửi lời mời
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSendFriendRequest(searchResult.uid)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Kết bạn
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Incoming Friend Requests */}
          <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Lời Mời Kết Bạn ({pendingIncoming.length})
            </h2>
            {pendingIncoming.length === 0 ? (
              <p className="text-xs text-slate-500">
                Hiện không có lời mời kết bạn nào đang chờ duyệt.
              </p>
            ) : (
              <div className="space-y-2.5">
                {pendingIncoming.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {req.fromName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {req.fromEmail}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRespondRequest(req, true)}
                        aria-label={`Chấp nhận lời mời của ${req.fromName}`}
                        className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondRequest(req, false)}
                        aria-label={`Từ chối lời mời của ${req.fromName}`}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: Friends List */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Danh Sách Bạn Bè ({friendsFarms.length})
          </h2>

          {friendsFarms.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Chưa có bạn bè nào. Hãy tìm kiếm bằng UID hoặc Email để kết bạn và cùng tưới cây nhận Vàng!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {friendsFarms.map((friend) => {
                const growingPlots = friend.farmPlots.filter(
                  (p) => p.cropId && p.readyAt && p.readyAt > nowMs
                ).length;

                return (
                  <div
                    key={friend.uid}
                    className="rounded-2xl border border-[#E2ECDA] bg-[#FAFDF8] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <VipAvatarFrame
                        avatarEmoji={friend.avatarEmoji}
                        vipLevel={friend.vipLevel}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {friend.businessName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {friend.displayName} · Lv.{friend.level}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          {growingPlots > 0
                            ? `${growingPlots} ô cây đang trồng có thể tưới`
                            : 'Hiện chưa có cây cần tưới'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setVisitingFarm(friend)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5" />
                      Ghé thăm nông trại
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Shared Farm Visit Modal (with Tủ Trưng Bày Báu Vật & Đội Xe) */}
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
