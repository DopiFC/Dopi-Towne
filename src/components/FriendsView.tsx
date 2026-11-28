import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Home,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import {
  FRIEND_HELP_REWARD_GOLD,
  MAX_FRIEND_HELPS_PER_DAY,
} from '../game/constants';
import type {
  FriendChatMessage,
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
  suggestedFarms?: PublicFarmData[];
  incomingRequests: FriendRequestDoc[];
  outgoingRequests: FriendRequestDoc[];
  chatMessages: FriendChatMessage[];
  activeChatFriendUid: string | null;
  onSelectChatFriend: (friendUid: string | null) => void;
  onSendChatMessage: (recipientUid: string, text: string) => Promise<void>;
  onSearchPlayer: (query: string) => Promise<PublicFarmData | null>;
  onSendFriendRequest: (toUid: string) => Promise<void>;
  onRespondRequest: (req: FriendRequestDoc, accept: boolean) => Promise<void>;
  onWaterFriendPlot: (
    friendUid: string,
    plotId: number
  ) => Promise<PublicFarmData | null>;
  onCopyUid: (uid: string) => void;
}

const QUICK_CHAT_PRESETS = [
  '👋 Chào bạn! Chúc một ngày bội thu nhé!',
  '💧 Mình vừa ghé tưới cây giúp nông trại bạn đó!',
  '🤝 Giao lưu nông sản trên Chợ P2P không bạn ơi?',
  '📈 Hôm nay trên Sàn Đầu Tư có mã nào ngon không?',
];

interface FriendChatPanelProps {
  myUid: string;
  friendsFarms: PublicFarmData[];
  activeChatFriendUid: string | null;
  chatMessages: FriendChatMessage[];
  onSelectChatFriend: (friendUid: string | null) => void;
  onSendChatMessage: (recipientUid: string, text: string) => Promise<void>;
}

/**
 * Memoized Chat Panel isolated from the 1-second `nowMs` game timer to guarantee
 * zero input lag and smooth 60fps scrolling when chatting with friends.
 */
const FriendChatPanel: React.FC<FriendChatPanelProps> = React.memo(
  ({
    myUid,
    friendsFarms,
    activeChatFriendUid,
    chatMessages,
    onSelectChatFriend,
    onSendChatMessage,
  }) => {
    const [draftText, setDraftText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const activeFriend =
      friendsFarms.find((f) => f.uid === activeChatFriendUid) ||
      friendsFarms[0] ||
      null;

    useEffect(() => {
      if (!activeChatFriendUid && friendsFarms.length > 0) {
        onSelectChatFriend(friendsFarms[0].uid);
      }
    }, [activeChatFriendUid, friendsFarms, onSelectChatFriend]);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [chatMessages.length, activeFriend?.uid]);

    const handleSend = async (textToSend: string) => {
      const cleaned = textToSend.trim();
      if (!cleaned || !activeFriend || sending) return;
      setSending(true);
      setDraftText('');
      try {
        await onSendChatMessage(activeFriend.uid, cleaned);
      } finally {
        setSending(false);
      }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await handleSend(draftText);
    };

    return (
      <section
        id="friend-chat-panel"
        className="bg-white rounded-2xl border border-[#DCE7D3] overflow-hidden shadow-xs"
      >
        <div className="px-5 py-4 bg-gradient-to-r from-[#F4FAF0] to-[#ECF6E5] border-b border-[#DCE7D3] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Trò Chuyện Bạn Bè Trực Tuyến (Zero-Lag Realtime)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Mượt 60FPS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Trao đổi mua bán P2P, nhờ tưới cây hoặc bàn chiến thuật đầu tư cổ phiếu ngay trong game.
              </p>
            </div>
          </div>
        </div>

        {friendsFarms.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Hãy kết bạn với ít nhất 1 nông trại để bắt đầu trò chuyện trực tuyến!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left Sidebar: Friend Conversation Switcher */}
            <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#E2ECDA] bg-[#FAFDF8] p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Chọn Bạn Bè ({friendsFarms.length})
              </div>
              {friendsFarms.map((friend) => {
                const isSelected = activeFriend?.uid === friend.uid;
                return (
                  <button
                    key={friend.uid}
                    type="button"
                    onClick={() => onSelectChatFriend(friend.uid)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'hover:bg-emerald-50/80 text-slate-800'
                    }`}
                  >
                    <VipAvatarFrame
                      avatarEmoji={friend.avatarEmoji || '🧑‍🌾'}
                      vipLevel={friend.vipLevel || 0}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {friend.businessName || 'Nông Trại DOPI'}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        Lv.{friend.level || 1} · VIP {friend.vipLevel || 0}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Area: Active Conversation Messages & Composer */}
            <div className="md:col-span-8 flex flex-col h-[420px]">
              {/* Active Friend Header */}
              {activeFriend && (
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-white">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <VipAvatarFrame
                      avatarEmoji={activeFriend.avatarEmoji || '🧑‍🌾'}
                      vipLevel={activeFriend.vipLevel || 0}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {activeFriend.businessName}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        Đang kết nối kênh chat riêng · Lv.{activeFriend.level}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FCFDFB]">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4 text-xs text-slate-400 space-y-1">
                    <MessageCircle className="w-7 h-7 text-slate-300 mb-1" />
                    <p className="font-semibold text-slate-600">
                      Chưa có tin nhắn nào với {activeFriend?.businessName}.
                    </p>
                    <p>Chọn câu chào nhanh bên dưới hoặc nhập tin nhắn để bắt đầu!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMine = msg.senderUid === myUid;
                    const timeStr = new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          {!isMine && (
                            <span className="text-[11px] font-bold text-slate-700">
                              {msg.senderAvatar || '🧑‍🌾'} {msg.senderName}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono-num">
                            {timeStr}
                          </span>
                        </div>
                        <div
                          className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
                            isMine
                              ? 'bg-emerald-600 text-white rounded-br-xs'
                              : 'bg-white border border-[#DCE7D3] text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Chat Presets */}
              <div className="px-3 py-1.5 bg-[#F7FAF3] border-t border-[#E2ECDA] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {QUICK_CHAT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={!activeFriend || sending}
                    onClick={() => handleSend(preset)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#DCE7D3] hover:border-emerald-400 hover:bg-emerald-50 text-[11px] font-medium text-slate-700 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Message Input Form */}
              <form
                onSubmit={handleFormSubmit}
                className="p-3 bg-white border-t border-[#DCE7D3] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  maxLength={280}
                  placeholder={
                    activeFriend
                      ? `Nhắn tin cho ${activeFriend.businessName}...`
                      : 'Chọn một người bạn để nhắn tin...'
                  }
                  disabled={!activeFriend}
                  aria-label="Nhập nội dung tin nhắn chat bạn bè"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-[#FAFDF8] text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <button
                  type="submit"
                  disabled={!activeFriend || !draftText.trim() || sending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    );
  }
);

export const FriendsView: React.FC<FriendsViewProps> = ({
  user,
  nowMs,
  friendsFarms,
  suggestedFarms = [],
  incomingRequests,
  outgoingRequests,
  chatMessages,
  activeChatFriendUid,
  onSelectChatFriend,
  onSendChatMessage,
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
  const [localSentUids, setLocalSentUids] = useState<string[]>([]);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [sendingToUid, setSendingToUid] = useState<string | null>(null);

  const pendingIncoming = incomingRequests.filter((r) => r.status === 'pending');
  const pendingOutgoingUids = new Set([
    ...outgoingRequests.filter((r) => r.status === 'pending').map((r) => r.toUid),
    ...localSentUids,
  ]);
  const friendUidSet = new Set([
    ...(user.friends ?? []),
    ...friendsFarms.map((f) => f.uid),
  ]);

  const discoverableFarms = suggestedFarms
    .filter((f) => f.uid !== user.uid && !friendUidSet.has(f.uid))
    .slice(0, 6);

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

  const handleSendInvite = async (toUid: string) => {
    if (sendingToUid) return;
    setSendingToUid(toUid);
    try {
      await onSendFriendRequest(toUid);
      setLocalSentUids((prev) => (prev.includes(toUid) ? prev : [...prev, toUid]));
    } finally {
      setSendingToUid(null);
    }
  };

  const handleRespond = async (req: FriendRequestDoc, accept: boolean) => {
    if (processingReqId) return;
    setProcessingReqId(req.id);
    try {
      await onRespondRequest(req, accept);
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleOpenChatWithFriend = (friendUid: string) => {
    onSelectChatFriend(friendUid);
    const el = document.getElementById('friend-chat-panel');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="space-y-6">
      {/* Header & Daily Watering Quota */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Bạn Bè, Chat Trực Tuyến & Ghé Thăm Nông Trại
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hỗ trợ tưới cây cho bạn bè để nhận +{FRIEND_HELP_REWARD_GOLD} Vàng/lần (tối đa {MAX_FRIEND_HELPS_PER_DAY} lần/ngày) và trò chuyện thời gian thực không giật lag.
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

      {/* Zero-Lag Memoized Friend Chat Panel */}
      <FriendChatPanel
        myUid={user.uid}
        friendsFarms={friendsFarms}
        activeChatFriendUid={activeChatFriendUid}
        chatMessages={chatMessages}
        onSelectChatFriend={onSelectChatFriend}
        onSendChatMessage={onSendChatMessage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Search, Incoming Requests & Quick Suggestions */}
        <section className="lg:col-span-5 space-y-5">
          {/* Find Friends */}
          <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tìm Bạn Theo Tên Nông Trại, UID Hoặc Email
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập tên doanh nghiệp, tên hiển thị, Email hoặc mã UID để kết bạn.
              </p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Nhập Tên nông trại, Email hoặc UID..."
                  aria-label="Tìm bạn theo Tên nông trại, UID hoặc Email"
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
                Không tìm thấy nông trại nào khớp với từ khóa vừa nhập.
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
                ) : friendUidSet.has(searchResult.uid) ? (
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
                    disabled={sendingToUid === searchResult.uid}
                    onClick={() => handleSendInvite(searchResult.uid)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
                {pendingIncoming.map((req) => {
                  const isBusy = processingReqId === req.id;
                  return (
                    <div
                      key={req.id}
                      className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {req.fromName || 'Nông Trại DOPI'}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {req.fromEmail || req.fromUid}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRespond(req, true)}
                          aria-label={`Chấp nhận lời mời của ${req.fromName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Chấp nhận</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRespond(req, false)}
                          aria-label={`Từ chối lời mời của ${req.fromName}`}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Suggested Active Farms */}
          {discoverableFarms.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Gợi Ý Kết Bạn Trên Máy Chủ
                </h2>
              </div>
              <div className="space-y-2.5">
                {discoverableFarms.map((cand) => {
                  const alreadySent = pendingOutgoingUids.has(cand.uid);
                  return (
                    <div
                      key={cand.uid}
                      className="rounded-xl border border-slate-200/80 bg-[#FAFDF8] p-3 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <VipAvatarFrame
                          avatarEmoji={cand.avatarEmoji}
                          vipLevel={cand.vipLevel}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {cand.businessName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono-num">
                            Lv.{cand.level} · VIP {cand.vipLevel}
                          </div>
                        </div>
                      </div>
                      {alreadySent ? (
                        <span className="text-xs font-semibold text-amber-700 shrink-0">
                          Đã gửi lời mời
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={sendingToUid === cand.uid}
                          onClick={() => handleSendInvite(cand.uid)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Kết bạn</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right: Friends List */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Danh Sách Bạn Bè ({friendsFarms.length})
          </h2>

          {friendsFarms.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Chưa có bạn bè nào. Hãy tìm kiếm bằng Tên nông trại, UID, Email hoặc chọn trong mục Gợi Ý Kết Bạn bên trái!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {friendsFarms.map((friend) => {
                const plots = Array.isArray(friend.farmPlots) ? friend.farmPlots : [];
                const growingPlots = plots.filter(
                  (p) => p && p.cropId && p.readyAt && p.readyAt > nowMs
                ).length;

                return (
                  <div
                    key={friend.uid}
                    className="rounded-2xl border border-[#E2ECDA] bg-[#FAFDF8] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <VipAvatarFrame
                        avatarEmoji={friend.avatarEmoji || '🧑‍🌾'}
                        vipLevel={friend.vipLevel || 0}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {friend.businessName || 'Nông Trại DOPI'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {friend.displayName || 'Nông Dân'} · Lv.{friend.level || 1}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          {growingPlots > 0
                            ? `${growingPlots} ô cây đang trồng có thể tưới`
                            : 'Hiện chưa có cây cần tưới'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenChatWithFriend(friend.uid)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-emerald-300 bg-white text-emerald-800 text-xs font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Nhắn tin
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisitingFarm(friend)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        <Home className="w-3.5 h-3.5" />
                        Ghé thăm
                      </button>
                    </div>
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
