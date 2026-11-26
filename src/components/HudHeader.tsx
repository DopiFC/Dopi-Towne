import React, { useState } from 'react';
import {
  Award,
  Briefcase,
  CalendarHeart,
  Check,
  Coins,
  Factory,
  Gift,
  LogOut,
  Music,
  Package,
  Pencil,
  Shield,
  ShoppingBag,
  Sprout,
  Store,
  TrendingUp,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AVATAR_OPTIONS } from '../game/constants';
import {
  formatNumber,
  getExpRequiredForLevel,
  getTotalInventoryCount,
} from '../game/economy';
import type { GameTab, UserGameData } from '../game/types';
import { BrandCrest, VipAvatarFrame } from './BrandCrest';

interface HudHeaderProps {
  user: UserGameData;
  activeTab: GameTab;
  isAdmin: boolean;
  pendingFriendRequests: number;
  claimableQuestsCount: number;
  claimableEventsCount: number;
  pendingTopupCount: number;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
  onSelectTab: (tab: GameTab) => void;
  onOpenRedeemModal: () => void;
  onOpenAdminPanel: () => void;
  onUpdateProfile: (businessName: string, avatarEmoji: string) => Promise<void>;
  onSignOut: () => void;
}

const TABS: {
  id: GameTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'farm', label: 'Nông Trại', icon: Sprout },
  { id: 'factory', label: 'Nhà Máy & Đơn', icon: Factory },
  { id: 'shop', label: 'Cửa Hàng & Kho', icon: ShoppingBag },
  { id: 'market', label: 'Chợ P2P', icon: Store },
  { id: 'invest', label: 'Đầu Tư', icon: TrendingUp },
  { id: 'events', label: 'Sự Kiện', icon: CalendarHeart },
  { id: 'business', label: 'Doanh Nghiệp', icon: Briefcase },
  { id: 'leaderboard', label: 'Xếp Hạng', icon: Trophy },
  { id: 'friends', label: 'Bạn Bè', icon: Users },
  { id: 'quests', label: 'Nhiệm Vụ & VIP', icon: Award },
];

export const HudHeader: React.FC<HudHeaderProps> = ({
  user,
  activeTab,
  isAdmin,
  pendingFriendRequests,
  claimableQuestsCount,
  claimableEventsCount,
  pendingTopupCount,
  bgmEnabled,
  sfxEnabled,
  onToggleBgm,
  onToggleSfx,
  onSelectTab,
  onOpenRedeemModal,
  onOpenAdminPanel,
  onUpdateProfile,
  onSignOut,
}) => {
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(user.businessName);
  const [draftAvatar, setDraftAvatar] = useState(user.profile.avatarEmoji);
  const [savingProfile, setSavingProfile] = useState(false);

  const expNeeded = getExpRequiredForLevel(user.level);
  const expPct = Math.min(100, Math.round((user.exp / expNeeded) * 100));
  const usedStorage = getTotalInventoryCount(user.inventory);
  const storageFull = usedStorage >= user.storageCapacity;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim();
    if (cleaned.length < 2) return;
    setSavingProfile(true);
    try {
      await onUpdateProfile(cleaned.slice(0, 40), draftAvatar);
      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <header className="bg-white border-b border-[#DCE7D3] shadow-[0_1px_2px_rgba(20,50,20,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top HUD Strip */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand + Business Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <BrandCrest size={38} className="hidden sm:block shrink-0" />
            <VipAvatarFrame
              avatarEmoji={user.profile.avatarEmoji}
              vipLevel={user.vipLevel}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base sm:text-lg text-slate-900 truncate max-w-[165px] sm:max-w-[220px]">
                  {user.businessName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(user.businessName);
                    setDraftAvatar(user.profile.avatarEmoji);
                    setEditingProfile(true);
                  }}
                  aria-label="Đổi tên doanh nghiệp và ảnh đại diện"
                  className="p-1 text-slate-400 hover:text-emerald-700 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-emerald-700 font-mono-num">
                  Lv.{user.level}
                </span>
                <div
                  className="w-20 sm:w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden"
                  title={`EXP: ${user.exp} / ${expNeeded}`}
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${expPct}%` }}
                  />
                </div>
                <span className="hidden md:inline font-mono-num text-[11px]">
                  {user.exp}/{expNeeded} EXP
                </span>
              </div>
            </div>
          </div>

          {/* Center: Live Resource Readouts */}
          <div className="flex items-center gap-4 sm:gap-6 text-sm order-3 lg:order-2 w-full lg:w-auto justify-between lg:justify-center border-t lg:border-t-0 border-slate-100 pt-2.5 lg:pt-0">
            <div className="flex items-center gap-2" title="Vàng (Tiền tệ cơ bản)">
              <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Coins className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[11px] text-slate-500 leading-none">Vàng</div>
                <div className="font-mono-num font-bold text-slate-900 leading-tight">
                  {formatNumber(user.gold)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2" title="Xu DOPI (Tiền tệ cao cấp)">
              <span className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700 shrink-0 font-bold text-xs">
                💎
              </span>
              <div>
                <div className="text-[11px] text-slate-500 leading-none">Xu DOPI</div>
                <div className="font-mono-num font-bold text-violet-700 leading-tight">
                  {formatNumber(user.dopiCoins)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2" title="Sức chứa kho nông sản">
              <span
                className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                  storageFull
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                <Package className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[11px] text-slate-500 leading-none">Kho</div>
                <div
                  className={`font-mono-num font-bold leading-tight ${
                    storageFull ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {usedStorage}/{user.storageCapacity}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Audio Toggles & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 order-2 lg:order-3">
            <button
              type="button"
              onClick={onToggleBgm}
              aria-label={bgmEnabled ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
              title={bgmEnabled ? 'Nhạc nền: Đang bật' : 'Nhạc nền: Đang tắt'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                bgmEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
            >
              <Music className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleSfx}
              aria-label={sfxEnabled ? 'Tắt hiệu ứng âm thanh' : 'Bật hiệu ứng âm thanh'}
              title={sfxEnabled ? 'Âm thanh SFX: Đang bật' : 'Âm thanh SFX: Đang tắt'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                sfxEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {sfxEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenRedeemModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs sm:text-sm font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>Nạp Xu</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 text-white text-xs sm:text-sm font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
                {pendingTopupCount > 0 && (
                  <span className="font-mono-num text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-rose-600 text-white">
                    {pendingTopupCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onSignOut}
              aria-label="Đăng xuất tài khoản"
              title="Đăng xuất"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tab Bar (React State — Zero 404 on GitHub Pages) */}
        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-1 overflow-x-auto pb-2.5 pt-1 -mx-1 px-1"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const count =
              tab.id === 'friends'
                ? pendingFriendRequests
                : tab.id === 'quests'
                  ? claimableQuestsCount
                  : tab.id === 'events'
                    ? claimableEventsCount
                    : 0;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs xl:text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-[#EDF5E7] hover:text-emerald-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`font-mono-num text-xs font-bold px-1.5 py-0.2 rounded-md ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Inline Profile Edit Modal */}
      {editingProfile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
        >
          <form
            onSubmit={handleSaveProfile}
            className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 id="edit-profile-title" className="text-lg font-bold text-slate-900">
                Hồ sơ Doanh nghiệp
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                aria-label="Đóng"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="business-name-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Tên Nông Trại / Doanh Nghiệp (2–40 ký tự)
              </label>
              <input
                id="business-name-input"
                type="text"
                required
                minLength={2}
                maxLength={40}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#FAFDF8] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-700">
                Chọn ảnh đại diện
              </span>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setDraftAvatar(emoji)}
                    className={`h-12 rounded-xl text-2xl flex items-center justify-center border transition-all cursor-pointer ${
                      draftAvatar === emoji
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
