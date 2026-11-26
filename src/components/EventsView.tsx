import React from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Gift,
  RefreshCw,
  Sparkles,
  Ticket,
} from 'lucide-react';
import {
  CHECKIN_REWARDS,
  EVENT_SHOP_ITEMS,
  ITEM_CATALOG,
  MONTHLY_TOPUP_MILESTONES,
  VEHICLES,
} from '../game/constants';
import {
  formatNumber,
  formatTimeRemaining,
  getCurrentMonthKey,
  getTodayDateKey,
  getWeeklyEventInfo,
} from '../game/economy';
import type { UserGameData } from '../game/types';

interface EventsViewProps {
  user: UserGameData;
  nowMs: number;
  onClaimCheckIn: () => Promise<void>;
  onClaimFirstTopup: () => Promise<void>;
  onClaimMonthlyMilestone: (threshold: number) => Promise<void>;
  onRedeemEventShop: (shopItemId: string) => Promise<void>;
  onDeliverRushOrder: () => Promise<void>;
  onRefreshRushOrder: () => Promise<void>;
  onOpenTopupModal: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  user,
  nowMs,
  onClaimCheckIn,
  onClaimFirstTopup,
  onClaimMonthlyMilestone,
  onRedeemEventShop,
  onDeliverRushOrder,
  onRefreshRushOrder,
  onOpenTopupModal,
}) => {
  const todayKey = getTodayDateKey(nowMs);
  const checkedInToday = user.lastCheckInDate === todayKey;
  const nextCheckInDay = checkedInToday
    ? Math.max(1, user.checkInStreak)
    : (user.checkInStreak % 7) + 1;

  const weeklyEvent = getWeeklyEventInfo(nowMs);
  const monthKey = getCurrentMonthKey(nowMs);
  const currentMonthCoins =
    user.eventMonthKey === monthKey ? user.eventRechargedCoins || 0 : 0;
  const maxMilestone = MONTHLY_TOPUP_MILESTONES[MONTHLY_TOPUP_MILESTONES.length - 1].threshold;
  const monthlyProgressPct = Math.min(
    100,
    Math.round((currentMonthCoins / maxMilestone) * 100)
  );

  const rush = user.rushOrder;
  const rushRemaining = rush ? Math.max(0, rush.expiresAt - nowMs) : 0;
  const rushExpired = !rush || rushRemaining <= 0;
  const canDeliverRush =
    Boolean(rush) &&
    !rush!.completed &&
    !rushExpired &&
    Object.entries(rush!.items).every(
      ([itemId, qty]) => (user.inventory[itemId] || 0) >= qty
    );

  return (
    <div className="space-y-6">
      {/* Weekly Event Hero Strip */}
      <div className="bg-gradient-to-r from-[#FFFBEB] via-[#FEF9E7] to-[#F3FAF0] rounded-3xl border border-amber-200 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-3xl shrink-0">
            {weeklyEvent.emoji}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">
              Sự Kiện Tuần · {weeklyEvent.weekKey}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {weeklyEvent.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {weeklyEvent.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Vé Sự Kiện đang có</div>
            <div className="inline-flex items-center gap-1.5 text-xl font-mono-num font-bold text-amber-700">
              <Ticket className="w-5 h-5" />
              {formatNumber(user.eventTickets || 0)}
            </div>
          </div>
          <div className="h-9 w-px bg-amber-200" aria-hidden="true" />
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Điểm Danh Vọng</div>
            <div className="text-xl font-mono-num font-bold text-emerald-700">
              {formatNumber(user.reputation || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: 7-Day Check-In + First Top-Up Gift */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 7-Day Check-In */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarCheck className="w-5 h-5 text-emerald-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Điểm Danh 7 Ngày Liên Tiếp
                </h2>
                <p className="text-xs text-slate-500">
                  Thưởng tăng dần mỗi ngày · Chuỗi hiện tại:{' '}
                  <strong className="font-mono-num text-emerald-700">
                    {user.checkInStreak}/7 ngày
                  </strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={checkedInToday}
              onClick={onClaimCheckIn}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                checkedInToday
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {checkedInToday
                ? 'Đã điểm danh hôm nay'
                : `Điểm danh Ngày ${nextCheckInDay}`}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {CHECKIN_REWARDS.map((reward) => {
              const claimed = checkedInToday
                ? reward.day <= user.checkInStreak
                : reward.day <= (user.checkInStreak % 7);
              const isToday = !checkedInToday && reward.day === nextCheckInDay;
              const itemInfo = reward.itemId ? ITEM_CATALOG[reward.itemId] : null;

              return (
                <div
                  key={reward.day}
                  className={`rounded-2xl border p-3 text-center flex flex-col justify-between gap-1.5 transition-all ${
                    claimed
                      ? 'bg-[#F3FAF0] border-emerald-200 opacity-85'
                      : isToday
                        ? 'bg-[#FFFDF0] border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-700">
                    Ngày {reward.day}
                  </div>
                  <div className="text-xl leading-none">
                    {claimed ? '✅' : itemInfo ? itemInfo.emoji : '🎁'}
                  </div>
                  <div className="space-y-0.5 text-[11px] font-mono-num leading-tight">
                    <div className="font-bold text-amber-700">
                      +{formatNumber(reward.gold)}V
                    </div>
                    {reward.coins > 0 && (
                      <div className="font-bold text-violet-700">
                        +{reward.coins} Xu
                      </div>
                    )}
                    <div className="text-emerald-700">+{reward.tickets} Vé</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* First Top-Up Gift (One-time) */}
        <section className="lg:col-span-4 bg-gradient-to-b from-[#FAF5FF] to-white rounded-2xl border border-violet-200 p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quà Nạp Đầu (1 Lần)
              </h2>
              <p className="text-xs text-slate-500">
                Mở khóa ngay khi 1 lệnh nạp được Admin duyệt
              </p>
            </div>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700 bg-white rounded-xl border border-violet-100 p-3.5">
            <li className="flex justify-between">
              <span>💰 Quỹ khởi nghiệp</span>
              <strong className="font-mono-num text-amber-700">+15.000 Vàng</strong>
            </li>
            <li className="flex justify-between">
              <span>🎫 Vé Sự Kiện</span>
              <strong className="font-mono-num text-emerald-700">+30 Vé</strong>
            </li>
            <li className="flex justify-between">
              <span>⚡ Phân Bón Siêu Tốc</span>
              <strong className="font-mono-num text-slate-900">×5</strong>
            </li>
            <li className="flex justify-between">
              <span>🧬 Thuốc Đột Biến Vàng</span>
              <strong className="font-mono-num text-slate-900">×3</strong>
            </li>
            <li className="flex justify-between">
              <span>🚿 Bình Tưới Tự Động 2h</span>
              <strong className="font-mono-num text-slate-900">×1</strong>
            </li>
          </ul>

          {user.firstTopupClaimed ? (
            <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center inline-flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Đã nhận Quà Nạp Đầu
            </div>
          ) : user.hasFirstTopup ? (
            <button
              type="button"
              onClick={onClaimFirstTopup}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors cursor-pointer"
            >
              Nhận Quà Nạp Đầu Ngay
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenTopupModal}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors cursor-pointer"
            >
              Tạo Lệnh Nạp Mở Khóa
            </button>
          )}
        </section>
      </div>

      {/* Row 2: Monthly Cumulative Top-Up Event */}
      <section className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sự Kiện Tích Lũy Nạp Tháng ({monthKey})
              </h2>
              <p className="text-xs text-slate-500">
                Tổng Xu nạp được duyệt trong tháng:{' '}
                <strong className="font-mono-num text-violet-700">
                  {formatNumber(currentMonthCoins)} Xu DOPI
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenTopupModal}
            className="px-3.5 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 cursor-pointer whitespace-nowrap"
          >
            Nạp Xu tích lũy
          </button>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${monthlyProgressPct}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {MONTHLY_TOPUP_MILESTONES.map((ms) => {
            const reached = currentMonthCoins >= ms.threshold;
            const claimed = (user.monthlyTopupClaimed ?? []).includes(ms.threshold);
            const rewardVehicle = ms.rewardVehicleId
              ? VEHICLES.find((v) => v.id === ms.rewardVehicleId)
              : null;

            return (
              <div
                key={ms.threshold}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                  claimed
                    ? 'bg-slate-50 border-slate-200 opacity-75'
                    : reached
                      ? 'bg-[#FFFDF0] border-amber-300'
                      : 'bg-[#FAFDF8] border-[#E2ECDA]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num text-xs font-bold text-violet-700">
                      Mốc {formatNumber(ms.threshold)} Xu
                    </span>
                    {rewardVehicle && (
                      <span className="text-xl" title={rewardVehicle.name}>
                        {rewardVehicle.emoji}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {ms.title}
                  </div>
                  <p className="text-xs text-slate-600">{ms.description}</p>
                </div>

                <button
                  type="button"
                  disabled={!reached || claimed}
                  onClick={() => onClaimMonthlyMilestone(ms.threshold)}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    claimed
                      ? 'bg-emerald-50 text-emerald-700 cursor-default'
                      : reached
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {claimed
                    ? 'Đã nhận thưởng'
                    : reached
                      ? 'Nhận thưởng mốc'
                      : `Còn thiếu ${formatNumber(ms.threshold - currentMonthCoins)} Xu`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Row 3: Event Shop + Timed Rush Order Challenge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Weekly Event Shop */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Shop Đổi Quà Sự Kiện Tuần
                </h2>
                <p className="text-xs text-slate-500">
                  Dùng Vé Sự Kiện rơi từ thu hoạch & giao đơn hàng để đổi quà giới hạn.
                </p>
              </div>
            </div>
            <span className="font-mono-num text-sm font-bold text-amber-700 whitespace-nowrap">
              🎫 {formatNumber(user.eventTickets || 0)} Vé
            </span>
          </div>

          <div className="space-y-3">
            {EVENT_SHOP_ITEMS.map((item) => {
              const canAfford = (user.eventTickets || 0) >= item.ticketCost;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-[#FCFEFA] p-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shrink-0">
                      {item.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onRedeemEventShop(item.id)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap font-mono-num"
                  >
                    Đổi · {item.ticketCost} Vé
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Timed Rush Order Challenge */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-rose-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Thử Thách Đơn Hàng Khẩn Cấp
                </h2>
                <div className="text-xs font-mono-num text-rose-600 inline-flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  {rushExpired
                    ? 'Đã hết hạn'
                    : `Còn lại: ${formatTimeRemaining(rushRemaining)}`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefreshRushOrder}
              title="Nhận đơn khẩn cấp mới"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {rush && (
            <>
              <div className="text-xs font-semibold text-slate-700">
                {rush.title}
              </div>

              <div className="rounded-xl bg-[#FAFDF8] border border-slate-200 p-3.5 space-y-2">
                {Object.entries(rush.items).map(([itemId, qty]) => {
                  const info = ITEM_CATALOG[itemId];
                  const owned = user.inventory[itemId] || 0;
                  const enough = owned >= qty;
                  return (
                    <div
                      key={itemId}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-800">
                        {info?.emoji} {info?.name ?? itemId}
                      </span>
                      <span
                        className={`font-mono-num font-bold ${
                          enough ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {owned} / {qty}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono-num">
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900 font-bold">
                  +{formatNumber(rush.rewardGold)} Vàng
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-900 font-bold">
                  +{rush.rewardExp} EXP
                </div>
                <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-sky-900 font-bold">
                  +{rush.rewardReputation} Danh Vọng
                </div>
                <div className="rounded-xl bg-violet-50 border border-violet-200 px-3 py-2 text-violet-900 font-bold">
                  +{rush.rewardTickets} Vé Sự Kiện
                </div>
              </div>

              {rush.completed ? (
                <button
                  type="button"
                  onClick={onRefreshRushOrder}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                >
                  Đã hoàn thành! Nhận thử thách tiếp theo
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canDeliverRush}
                  onClick={onDeliverRushOrder}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    canDeliverRush
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {rushExpired
                    ? 'Đơn đã hết hạn — Bấm nút làm mới'
                    : canDeliverRush
                      ? 'Hoàn Thành Đơn Khẩn Cấp'
                      : 'Chưa đủ nông sản trong kho'}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
