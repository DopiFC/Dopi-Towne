import React from 'react';
import {
  Briefcase,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { EMPLOYEES, VEHICLES } from '../game/constants';
import {
  calculateEmployeeUpgradeCost,
  calculateWealthScore,
  formatNumber,
  getBusinessBonuses,
} from '../game/economy';
import type { EmployeeId, UserGameData } from '../game/types';

interface BusinessViewProps {
  user: UserGameData;
  onUpgradeEmployee: (employeeId: EmployeeId) => Promise<void>;
  onBuyVehicle: (vehicleId: string) => Promise<void>;
}

export const BusinessView: React.FC<BusinessViewProps> = ({
  user,
  onUpgradeEmployee,
  onBuyVehicle,
}) => {
  const bonuses = getBusinessBonuses(user);
  const wealthScore = calculateWealthScore(user);

  return (
    <div className="space-y-6">
      {/* Executive Overview Strip */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Doanh Nghiệp & Tài Sản DOPI
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tuyển nhân sự vận hành tự động & đầu tư đội xe vận tải để bứt phá BXH Tài Phú.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Điểm Tài Phú</div>
              <div className="text-xl font-mono-num font-bold text-amber-700">
                {formatNumber(wealthScore)}
              </div>
            </div>
            <div className="h-9 w-px bg-slate-200" aria-hidden="true" />
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Danh Vọng</div>
              <div className="text-xl font-mono-num font-bold text-emerald-700">
                {formatNumber(user.reputation || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Active Buff Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Thu hoạch tự động</div>
            <div className="font-bold text-slate-900 mt-0.5">
              {bonuses.autoHarvestEnabled ? 'Đang bật (Online)' : 'Chưa kích hoạt'}
            </div>
          </div>
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Tỉ lệ thu hoạch đôi</div>
            <div className="font-mono-num font-bold text-emerald-700 mt-0.5">
              +{bonuses.extraYieldChancePct}%
            </div>
          </div>
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Tốc độ nhà máy</div>
            <div className="font-mono-num font-bold text-sky-700 mt-0.5">
              -{bonuses.factorySpeedReductionPct}% thời gian
            </div>
          </div>
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Thưởng đơn hàng NPC</div>
            <div className="font-mono-num font-bold text-amber-700 mt-0.5">
              +{bonuses.orderRewardBonusPct}% Vàng
            </div>
          </div>
        </div>
      </div>

      {/* Employees Section */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Đội Ngũ Nhân Viên Chuyên Nghiệp
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Chi phí nâng cấp tăng 1.8× mỗi cấp · Từ Lv.4 kết hợp thêm Xu DOPI
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EMPLOYEES.map((emp) => {
            const currentLv = user.employees?.[emp.id] || 0;
            const isMax = currentLv >= emp.maxLevel;
            const cost = calculateEmployeeUpgradeCost(emp.id, currentLv);
            const canAfford =
              !isMax &&
              user.gold >= cost.gold &&
              user.dopiCoins >= cost.coins;

            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-[#DCE7D3] p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-[#F4FAF0] border border-[#DCE7D3] flex items-center justify-center text-2xl shrink-0">
                      {emp.emoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {emp.name}
                        </h3>
                        <span className="font-mono-num text-xs font-bold text-emerald-700">
                          Lv.{currentLv}/{emp.maxLevel}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-amber-700 mt-0.5">
                        {emp.role}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {emp.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 font-mono-num">
                    Tài Phú: +{formatNumber(emp.wealthPerLevel)}/cấp
                  </div>

                  {isMax ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Đạt cấp tối đa
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onUpgradeEmployee(emp.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap font-mono-num"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>
                        {currentLv === 0 ? 'Thuê' : `Nâng Lv.${currentLv + 1}`} ·{' '}
                        {formatNumber(cost.gold)}V
                        {cost.coins > 0 ? ` + ${formatNumber(cost.coins)} Xu` : ''}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Showroom Vehicles Section */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Showroom Xe Vận Tải & Siêu Xe DOPI ({user.vehicles?.length || 0}/
              {VEHICLES.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Mỗi xe cộng dồn Tài Phú · Xe mạnh nhất áp dụng ưu đãi đơn hàng NPC
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VEHICLES.map((v) => {
            const owned = (user.vehicles ?? []).includes(v.id);
            const locked = user.level < v.minLevel;
            const canAfford =
              !owned &&
              !locked &&
              user.gold >= v.priceGold &&
              user.dopiCoins >= v.priceCoins;
            const isBestOwned = bonuses.bestVehicleId === v.id;

            return (
              <div
                key={v.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${
                  owned
                    ? 'bg-[#F4FAF0] border-emerald-300'
                    : locked
                      ? 'bg-slate-50/80 border-slate-200 opacity-75'
                      : 'bg-white border-[#DCE7D3]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-4xl leading-none">{v.emoji}</span>
                    {owned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        {isBestOwned ? 'Đang vận hành chính' : 'Đã sở hữu'}
                      </span>
                    ) : locked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                        Yêu cầu Lv.{v.minLevel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-mono-num font-bold text-amber-700">
                        <Sparkles className="w-3.5 h-3.5" />+
                        {formatNumber(v.wealthBonus)} Tài Phú
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {v.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {v.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-num">
                    <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-emerald-700 font-semibold">
                      +{v.orderRewardBonusPct}% Thưởng đơn
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-sky-700 font-semibold">
                      -{v.orderRefreshReductionPct}% Thời gian làm mới
                    </div>
                  </div>
                </div>

                {owned ? (
                  <div className="text-xs font-mono-num text-emerald-800 font-semibold pt-2 border-t border-emerald-200/70">
                    Đóng góp +{formatNumber(v.wealthBonus)} điểm Tài Phú
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onBuyVehicle(v.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold font-mono-num transition-colors cursor-pointer ${
                      canAfford
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {locked
                      ? `Mở khóa ở Lv.${v.minLevel}`
                      : `Mua xe · ${formatNumber(v.priceGold)}V${
                          v.priceCoins > 0 ? ` + ${formatNumber(v.priceCoins)} Xu` : ''
                        }`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
