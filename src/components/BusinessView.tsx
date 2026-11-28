import React, { memo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  HeartHandshake,
  Landmark,
  Layers,
  Lock,
  Megaphone,
  PackageCheck,
  Receipt,
  Search,
  Sparkles,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  EMPLOYEES,
  ENTERPRISE_CAMPAIGNS,
  ENTERPRISE_SPECIALISTS,
  HEADHUNT_COST_GOLD,
  ITEM_CATALOG,
  VEHICLES,
  WHOLESALE_CONTRACTS,
} from '../game/constants';
import {
  calculateDepartmentUpgradeCost,
  calculateEmployeeUpgradeCost,
  calculateInventoryValuation,
  calculateMonthlyPayroll,
  calculateSpecialistHireOrUpgradeCost,
  calculateWealthScore,
  createInitialEnterpriseState,
  formatNumber,
  getBusinessBonuses,
} from '../game/economy';
import type {
  EmployeeId,
  EnterpriseSpecialistId,
  UserGameData,
} from '../game/types';

function formatRemainingDuration(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}g ${m}p`;
  if (m > 0) return `${m}p ${s}s`;
  return `${s}s`;
}

interface BusinessViewProps {
  user: UserGameData;
  nowMs: number;
  onUpgradeEmployee: (employeeId: EmployeeId) => Promise<void>;
  onBuyVehicle: (vehicleId: string) => Promise<void>;
  onDepositFund: (amountGold: number) => Promise<void>;
  onWithdrawFund: (amountGold: number) => Promise<void>;
  onUpgradeDepartment: (dept: 'rd' | 'marketing' | 'operations') => Promise<void>;
  onHireOrUpgradeSpecialist: (specialistId: EnterpriseSpecialistId) => Promise<void>;
  onHeadhuntSpecialist: () => Promise<void>;
  onLaunchCampaign: (campaignId: string) => Promise<void>;
  onFulfillWholesaleContract: (contractId: string) => Promise<void>;
  onPayMonthlySalary: () => Promise<void>;
  onBonusEmployeeMorale: () => Promise<void>;
  onToggleAutoPaySalary: () => Promise<void>;
}

type EnterpriseTab =
  | 'treasury'
  | 'recruitment'
  | 'goods'
  | 'operations'
  | 'payroll';

export const BusinessView: React.FC<BusinessViewProps> = memo(({
  user,
  nowMs,
  onUpgradeEmployee,
  onBuyVehicle,
  onDepositFund,
  onWithdrawFund,
  onUpgradeDepartment,
  onHireOrUpgradeSpecialist,
  onHeadhuntSpecialist,
  onLaunchCampaign,
  onFulfillWholesaleContract,
  onPayMonthlySalary,
  onBonusEmployeeMorale,
  onToggleAutoPaySalary,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<EnterpriseTab>('recruitment');
  const [customFundInput, setCustomFundInput] = useState<string>('5000');

  const ent = user.enterprise ?? createInitialEnterpriseState(nowMs);
  const bonuses = getBusinessBonuses(user, nowMs);
  const wealthScore = calculateWealthScore(user);
  const payrollInfo = calculateMonthlyPayroll(
    user.employees,
    ent.operationsLevel,
    ent.specialists
  );
  const stockValuation = calculateInventoryValuation(user.inventory, nowMs);
  const totalStockUnits =
    stockValuation.cropUnits +
    stockValuation.productUnits +
    stockValuation.boosterUnits;

  const currentPeriodKey = new Date(nowMs).toISOString().slice(0, 7);
  const isCurrentMonthPaid = ent.lastPayrollMonth === currentPeriodKey;
  const activeCampaignDef =
    ent.activeCampaignId && ent.activeCampaignUntil > nowMs
      ? ENTERPRISE_CAMPAIGNS.find((c) => c.id === ent.activeCampaignId) || null
      : null;

  const parsedCustomAmount = Math.max(
    0,
    Math.floor(Number(customFundInput.replace(/[^0-9]/g, '')) || 0)
  );

  // Stock item list for the goods table
  const inventoryItems = Object.entries(user.inventory || {})
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const meta = ITEM_CATALOG[itemId];
      const unitValue = meta?.baseSellPrice ?? 0;
      return {
        itemId,
        qty,
        name: meta?.name || itemId,
        emoji: meta?.emoji || '📦',
        category: meta?.category || 'crop',
        unitValue,
        totalValue: qty * unitValue,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  const departments: Array<{
    key: 'rd' | 'marketing' | 'operations';
    name: string;
    emoji: string;
    level: number;
    perkText: string;
    description: string;
  }> = [
    {
      key: 'rd',
      name: 'Phòng R&D Nông Nghiệp',
      emoji: '🧬',
      level: ent.rdLevel,
      perkText: `+${(ent.rdLevel - 1) * 3}% tỉ lệ thu hoạch đôi & -${Math.floor(((ent.rdLevel - 1) * 3) / 2)}% TG chế biến`,
      description:
        'Nghiên cứu giống cây năng suất cao và tối ưu dây chuyền nhà máy chế biến.',
    },
    {
      key: 'marketing',
      name: 'Phòng Marketing & Thương Hiệu',
      emoji: '📣',
      level: ent.marketingLevel,
      perkText: `+${(ent.marketingLevel - 1) * 4}% doanh thu Đơn NPC & Hợp đồng B2B`,
      description:
        'Quảng bá thương hiệu nông sản sạch DOPI giúp đàm phán giá bán cao hơn.',
    },
    {
      key: 'operations',
      name: 'Phòng Vận Hành & Nhân Sự (HR)',
      emoji: '🏢',
      level: ent.operationsLevel,
      perkText: `-${(ent.operationsLevel - 1) * 3}% quỹ lương hàng tháng`,
      description:
        'Chuẩn hóa quy trình ERP giúp tiết kiệm chi phí vận hành và tối ưu quỹ lương nhân sự.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Enterprise ERP Banner */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Quản Trị Doanh Nghiệp ERP — {user.businessName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  Mô phỏng Doanh Nghiệp Thật
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý Quỹ công ty, Định giá Tồn kho & Hợp đồng Sỉ B2B, Chiến dịch Kinh doanh và Bảng lương Nhân sự hàng tháng.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Quỹ Doanh Nghiệp</div>
              <div className="text-lg sm:text-xl font-mono-num font-bold text-emerald-700">
                {formatNumber(ent.corporateFund)} V
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Giá Trị Hàng Hóa Kho</div>
              <div className="text-lg sm:text-xl font-mono-num font-bold text-sky-700">
                {formatNumber(stockValuation.totalMarketValue)} V
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Điểm Tài Phú</div>
              <div className="text-lg sm:text-xl font-mono-num font-bold text-amber-700">
                {formatNumber(wealthScore)}
              </div>
            </div>
          </div>
        </div>

        {/* Live KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Chuyên gia đặc biệt</div>
            <div className="font-mono-num font-bold text-emerald-700 mt-0.5">
              {bonuses.specialistsCount}/6 ({bonuses.totalSpecialistLevels} cấp)
            </div>
          </div>
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Tốc độ nhà máy</div>
            <div className="font-mono-num font-bold text-sky-700 mt-0.5">
              -{bonuses.factorySpeedReductionPct}% thời gian
            </div>
          </div>
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Giảm chi phí vận hành</div>
            <div className="font-mono-num font-bold text-emerald-700 mt-0.5">
              -{bonuses.operatingCostReductionPct}% chi phí
            </div>
          </div>
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Tỉ lệ thu hoạch đôi</div>
            <div className="font-mono-num font-bold text-emerald-700 mt-0.5">
              +{bonuses.extraYieldChancePct}%
            </div>
          </div>
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Thưởng doanh thu</div>
            <div className="font-mono-num font-bold text-amber-700 mt-0.5">
              +{bonuses.orderRewardBonusPct}% Vàng
            </div>
          </div>
          <div className="rounded-xl bg-[#F7FAF3] border border-[#E2ECDA] p-3">
            <div className="text-slate-500">Tinh thần nhân sự</div>
            <div className="font-mono-num font-bold text-rose-700 mt-0.5">
              {ent.morale}% ({bonuses.moraleEfficiencyPct}% hiệu suất)
            </div>
          </div>
        </div>

        {/* 5-Module Enterprise Sub-Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('recruitment')}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeSubTab === 'recruitment'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAFDF8] text-slate-700 border-[#DCE7D3] hover:bg-emerald-50/70'
            }`}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">1. Tuyển Dụng Chuyên Gia</div>
              <div
                className={`text-[10px] font-mono-num truncate ${
                  activeSubTab === 'recruitment' ? 'text-emerald-100' : 'text-emerald-700 font-semibold'
                }`}
              >
                Kỹ năng đặc biệt · {bonuses.specialistsCount}/6
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('treasury')}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeSubTab === 'treasury'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAFDF8] text-slate-700 border-[#DCE7D3] hover:bg-emerald-50/70'
            }`}
          >
            <Landmark className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">2. Quản Lý Quỹ & Phòng Ban</div>
              <div
                className={`text-[10px] font-mono-num truncate ${
                  activeSubTab === 'treasury' ? 'text-emerald-100' : 'text-slate-500'
                }`}
              >
                Quỹ: {formatNumber(ent.corporateFund)}V
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('goods')}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeSubTab === 'goods'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAFDF8] text-slate-700 border-[#DCE7D3] hover:bg-emerald-50/70'
            }`}
          >
            <PackageCheck className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">3. Quản Lý Hàng Hóa & B2B</div>
              <div
                className={`text-[10px] font-mono-num truncate ${
                  activeSubTab === 'goods' ? 'text-emerald-100' : 'text-slate-500'
                }`}
              >
                Đã giao: {ent.totalContractsDone} lô sỉ
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('operations')}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeSubTab === 'operations'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAFDF8] text-slate-700 border-[#DCE7D3] hover:bg-emerald-50/70'
            }`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">4. Hoạt Động KD & Đội Xe</div>
              <div
                className={`text-[10px] truncate ${
                  activeSubTab === 'operations' ? 'text-emerald-100' : 'text-slate-500'
                }`}
              >
                {activeCampaignDef ? `Đang chạy: ${activeCampaignDef.name}` : 'Sẵn sàng mở chiến dịch'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('payroll')}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              activeSubTab === 'payroll'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-[#FAFDF8] text-slate-700 border-[#DCE7D3] hover:bg-emerald-50/70'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">5. Tiền Lương Hàng Tháng</div>
              <div
                className={`text-[10px] font-mono-num truncate ${
                  activeSubTab === 'payroll' ? 'text-emerald-100' : 'text-slate-500'
                }`}
              >
                {formatNumber(payrollInfo.netSalary)}V/tháng ·{' '}
                {isCurrentMonthPaid ? 'Đã trả' : 'Chờ chi lương'}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: TUYỂN DỤNG NHÂN SỰ CHUYÊN GIA (KỸ NĂNG ĐẶC BIỆT - TRÍCH QUỸ DN)
      ===================================================================== */}
      {activeSubTab === 'recruitment' && (
        <div className="space-y-6">
          {/* Recruitment Center Header & Headhunting Action */}
          <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold">
                    <Award className="w-3.5 h-3.5" />
                    Trung Tâm Tuyển Dụng Nhân Sự Cấp Cao
                  </span>
                  <span className="text-xs font-mono-num text-slate-500">
                    Sử dụng 100% <strong>Quỹ Doanh Nghiệp ({formatNumber(ent.corporateFund)} V)</strong>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Tuyển Dụng & Đào Tạo Chuyên Gia Kỹ Năng Đặc Biệt
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Chiêu mộ các Chuyên gia đầu ngành bằng <strong>Quỹ Doanh Nghiệp</strong> để mở khóa các kỹ năng đặc biệt: <strong>Tăng tốc dây chuyền sản xuất</strong>, <strong>Giảm chi phí vận hành & quỹ lương</strong>, <strong>Rút ngắn thời gian cây chín & giảm vốn hạt giống</strong>, và <strong>Tăng doanh thu hợp đồng B2B</strong>.
                </p>
              </div>

              {/* Headhunting Button & Discount Status */}
              <div className="rounded-2xl bg-[#F4FAF0] border border-emerald-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 shrink-0">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Săn Đầu Người (Headhunt Ứng Viên)</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {ent.headhuntDiscountPct > 0 ? (
                      <span className="text-emerald-800 font-bold">
                        🎯 Đang có ưu đãi giảm -{ent.headhuntDiscountPct}% phí Quỹ cho lượt Tuyển/Đào tạo kế tiếp!
                      </span>
                    ) : (
                      <span>
                        Tìm ứng viên xuất sắc để nhận ưu đãi <strong>-12% đến -30%</strong> phí tuyển dụng & +4% Tinh thần
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={ent.corporateFund < HEADHUNT_COST_GOLD || ent.headhuntDiscountPct >= 28}
                  onClick={onHeadhuntSpecialist}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold font-mono-num hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer whitespace-nowrap"
                >
                  🔍 Săn Ứng Viên · Trích Quỹ {formatNumber(HEADHUNT_COST_GOLD)}V
                </button>
              </div>
            </div>

            {/* Active Special Skills Summary Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-2.5">
                <div className="text-[11px] text-slate-500">⚙️ Tăng Tốc Sản Xuất</div>
                <div className="font-mono-num font-bold text-sky-700 mt-0.5">
                  -{(ent.specialists?.lean_engineer || 0) * 5}% TG xưởng / +{(ent.specialists?.lean_engineer || 0) * 3}% Sản lượng
                </div>
              </div>
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-2.5">
                <div className="text-[11px] text-slate-500">📉 Giảm Chi Phí Vận Hành</div>
                <div className="font-mono-num font-bold text-emerald-700 mt-0.5">
                  -{(ent.specialists?.cost_auditor || 0) * 5}% Lương & Chiến dịch
                </div>
              </div>
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-2.5">
                <div className="text-[11px] text-slate-500">🧬 Gen Cây & Vốn Giống</div>
                <div className="font-mono-num font-bold text-emerald-700 mt-0.5">
                  -{bonuses.cropSpeedReductionPct}% TG chín / -{bonuses.seedDiscountPct}% Giá giống
                </div>
              </div>
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-2.5">
                <div className="text-[11px] text-slate-500">🤝 Đàm Phán B2B</div>
                <div className="font-mono-num font-bold text-amber-700 mt-0.5">
                  +{(ent.specialists?.b2b_director || 0) * 6}% Đơn & Lô sỉ
                </div>
              </div>
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-2.5">
                <div className="text-[11px] text-slate-500">📦 Chuỗi Kho Thông Minh</div>
                <div className="font-mono-num font-bold text-amber-700 mt-0.5">
                  +{bonuses.quickSellBonusPct}% Giá bán kho
                </div>
              </div>
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-2.5">
                <div className="text-[11px] text-slate-500">🏛️ Quản Trị Vốn CFO</div>
                <div className="font-mono-num font-bold text-purple-700 mt-0.5">
                  -{bonuses.deptUpgradeDiscountPct}% Phí nâng phòng ban
                </div>
              </div>
            </div>
          </div>

          {/* 6 Specialist Recruitment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENTERPRISE_SPECIALISTS.map((spec) => {
              const currentLv = Math.max(0, Math.floor(ent.specialists?.[spec.id] || 0));
              const isMax = currentLv >= spec.maxLevel;
              const costInfo = calculateSpecialistHireOrUpgradeCost(
                spec.id,
                currentLv,
                ent.headhuntDiscountPct
              );
              const canAfford = !isMax && ent.corporateFund >= costInfo.finalCost;

              return (
                <div
                  key={spec.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${
                    currentLv > 0
                      ? 'bg-[#F4FAF0] border-emerald-300'
                      : 'bg-white border-[#DCE7D3]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-white border border-[#DCE7D3] flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                          {spec.emoji}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {spec.name}
                            </h3>
                          </div>
                          <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                            {spec.role}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-bold shrink-0 ${
                          currentLv > 0
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {currentLv > 0 ? `Lv.${currentLv}/${spec.maxLevel}` : 'Chưa tuyển'}
                      </span>
                    </div>

                    {/* Special Skill Badge */}
                    <div className="rounded-xl bg-white border border-emerald-200 px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          Kỹ năng: {spec.skillName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                          {spec.skillBadge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {spec.description}
                      </p>
                    </div>

                    {/* Active & Next Level Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-num">
                      <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-emerald-800 font-semibold">
                        Hiệu lực: {currentLv > 0 ? `${currentLv * spec.effectPerLevelPct}% (Cấp ${currentLv})` : '0% (Chưa kích hoạt)'}
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-slate-600 font-semibold">
                        Lương: {formatNumber(spec.monthlySalaryGold)}V/cấp
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-emerald-200/60">
                    <div className="flex items-center justify-between text-xs font-mono-num">
                      <span className="text-slate-500">
                        Tài Phú: <strong className="text-amber-700">+{formatNumber(spec.wealthPerLevel)}/cấp</strong>
                      </span>
                      {!isMax && costInfo.discountSaved > 0 && (
                        <span className="text-emerald-700 font-bold">
                          Tiết kiệm -{formatNumber(costInfo.discountSaved)}V
                        </span>
                      )}
                    </div>

                    {isMax ? (
                      <div className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Đã Đào Tạo Chuyên Gia Cấp Tối Đa (Lv.5)
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onHireOrUpgradeSpecialist(spec.id)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold font-mono-num hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>
                          {currentLv === 0
                            ? 'Tuyển Dụng Chuyên Gia'
                            : `Đào Tạo Kỹ Năng Lv.${currentLv + 1}`}{' '}
                          · Trích Quỹ {formatNumber(costInfo.finalCost)}V
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 1: QUẢN LÝ QUỸ & PHÒNG BAN (CORPORATE TREASURY & DEPARTMENTS)
      ===================================================================== */}
      {activeSubTab === 'treasury' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Corporate Fund Deposit / Withdraw */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Quỹ Vốn Lưu Động Doanh Nghiệp (Corporate Treasury)
                  </h2>
                </div>
                <span className="text-xs font-mono-num text-slate-500">
                  Vàng cá nhân hiện có: <strong className="text-amber-700">{formatNumber(user.gold)} V</strong>
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Quỹ Doanh Nghiệp dùng để chi trả <strong>Tiền lương hàng tháng</strong>, nâng cấp <strong>3 Phòng Ban Chuyên Môn</strong> và kích hoạt <strong>Chiến dịch Kinh doanh</strong>. Ngoài ra 10% giá trị Quỹ được cộng trực tiếp vào Điểm Tài Phú của bạn.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3.5">
                  <div className="text-[11px] text-emerald-800 font-medium">Số dư Quỹ hiện tại</div>
                  <div className="text-xl font-mono-num font-bold text-emerald-800 mt-1">
                    {formatNumber(ent.corporateFund)} V
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3.5">
                  <div className="text-[11px] text-amber-800 font-medium">Tổng Doanh Thu B2B & Quỹ</div>
                  <div className="text-xl font-mono-num font-bold text-amber-800 mt-1">
                    {formatNumber(ent.totalRevenueGold)} V
                  </div>
                </div>
                <div className="rounded-xl bg-sky-50/80 border border-sky-200 p-3.5">
                  <div className="text-[11px] text-sky-800 font-medium">Tổng Quỹ Lương Đã Chi</div>
                  <div className="text-xl font-mono-num font-bold text-sky-800 mt-1">
                    {formatNumber(ent.totalPayrollPaidGold)} V
                  </div>
                </div>
              </div>

              {/* Quick Deposit / Withdraw Controls */}
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Nạp / Rút Vốn Nhanh Hoặc Nhập Số Tiền Tùy Chọn
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[2000, 10000, 50000].map((amt) => (
                    <button
                      key={`dep-${amt}`}
                      type="button"
                      disabled={user.gold < amt}
                      onClick={() => onDepositFund(amt)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold font-mono-num hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      Nạp +{formatNumber(amt)}V
                    </button>
                  ))}
                  {[2000, 10000].map((amt) => (
                    <button
                      key={`wit-${amt}`}
                      type="button"
                      disabled={ent.corporateFund < amt}
                      onClick={() => onWithdrawFund(amt)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold font-mono-num hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Rút -{formatNumber(amt)}V
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70">
                  <input
                    type="number"
                    min={100}
                    step={500}
                    value={customFundInput}
                    onChange={(e) => setCustomFundInput(e.target.value)}
                    aria-label="Số Vàng muốn nạp hoặc rút quỹ doanh nghiệp"
                    className="w-40 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono-num font-bold text-slate-800"
                    placeholder="Nhập số Vàng..."
                  />
                  <button
                    type="button"
                    disabled={parsedCustomAmount <= 0 || user.gold < parsedCustomAmount}
                    onClick={() => onDepositFund(parsedCustomAmount)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-40 cursor-pointer"
                  >
                    Nạp vào Quỹ ({formatNumber(parsedCustomAmount)}V)
                  </button>
                  <button
                    type="button"
                    disabled={parsedCustomAmount <= 0 || ent.corporateFund < parsedCustomAmount}
                    onClick={() => onWithdrawFund(parsedCustomAmount)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Rút về Ví cá nhân
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Corporate Cashflow Ledger */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#DCE7D3] p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-sky-700" />
                  <h2 className="text-base font-bold text-slate-900">
                    Sổ Cái Thu Chi Doanh Nghiệp
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-mono-num">
                  {ent.ledger.length} bút toán gần nhất
                </span>
              </div>

              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {ent.ledger.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    Chưa có giao dịch quỹ nào được ghi nhận.
                  </p>
                ) : (
                  ent.ledger.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-slate-100 bg-[#FAFDF8] px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {entry.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-num">
                          {new Date(entry.createdAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                      </div>
                      <span
                        className={`font-mono-num font-bold shrink-0 ${
                          entry.isPositive ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {entry.isPositive ? '+' : '-'}
                        {formatNumber(entry.amountGold)}V
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 3 Enterprise Departments */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">
                  Khối Phòng Ban Chuyên Môn (Nâng Cấp Bằng Quỹ Doanh Nghiệp)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Mỗi cấp phòng ban cộng +2.200 Điểm Tài Phú và cường hóa toàn bộ hoạt động kinh doanh
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {departments.map((dept) => {
                const isMax = dept.level >= 10;
                const upgradeCost = calculateDepartmentUpgradeCost(
                  dept.level,
                  bonuses.deptUpgradeDiscountPct
                );
                const canAfford = !isMax && ent.corporateFund >= upgradeCost;

                return (
                  <div
                    key={dept.key}
                    className="bg-white rounded-2xl border border-[#DCE7D3] p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">{dept.emoji}</span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono-num font-bold">
                          Lv.{dept.level}/10
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
                      <p className="text-xs text-slate-500">{dept.description}</p>
                      <div className="rounded-xl bg-[#F4FAF0] border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">
                        Hiệu lực hiện tại: {dept.perkText}
                      </div>
                    </div>

                    {isMax ? (
                      <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        <CheckCircle2 className="w-4 h-4" />
                        Phòng ban đã đạt cấp tối đa (Lv.10)
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onUpgradeDepartment(dept.key)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold font-mono-num hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
                      >
                        Nâng lên Lv.{dept.level + 1} · Trích Quỹ {formatNumber(upgradeCost)}V
                        {bonuses.deptUpgradeDiscountPct > 0
                          ? ` (-${bonuses.deptUpgradeDiscountPct}% CFO)`
                          : ''}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 2: QUẢN LÝ HÀNG HÓA & CHUỖI CUNG ỨNG B2B (GOODS & SUPPLY CHAIN)
      ===================================================================== */}
      {activeSubTab === 'goods' && (
        <div className="space-y-6">
          {/* Warehouse Asset Valuation Cards */}
          <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">
                  Báo Cáo Kiểm Kê & Định Giá Tài Sản Hàng Hóa Tồn Kho
                </h2>
              </div>
              <span className="text-xs font-mono-num text-slate-500">
                Tổng sản lượng: <strong>{formatNumber(totalStockUnits)} đơn vị</strong> / Sức chứa {formatNumber(user.storageCapacity)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
                <div className="text-xs text-emerald-800 font-medium">Tổng Giá Trị Tồn Kho</div>
                <div className="text-xl font-mono-num font-bold text-emerald-900 mt-1">
                  {formatNumber(stockValuation.totalMarketValue)} V
                </div>
              </div>
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-3.5">
                <div className="text-xs text-slate-500">Nông Sản Thô (Raw Crops)</div>
                <div className="text-lg font-mono-num font-bold text-slate-800 mt-1">
                  {formatNumber(stockValuation.cropValue)} V
                </div>
              </div>
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-3.5">
                <div className="text-xs text-slate-500">Thành Phẩm Chế Biến</div>
                <div className="text-lg font-mono-num font-bold text-amber-800 mt-1">
                  {formatNumber(stockValuation.productValue)} V
                </div>
              </div>
              <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-3.5">
                <div className="text-xs text-slate-500">Vật Tư Nông Nghiệp</div>
                <div className="text-lg font-mono-num font-bold text-sky-800 mt-1">
                  {formatNumber(stockValuation.boosterValue)} V
                </div>
              </div>
            </div>

            {/* Detailed SKU Valuation Table */}
            {inventoryItems.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F4FAF0] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3 font-bold">Mặt Hàng (SKU)</th>
                      <th className="py-2.5 px-3 font-bold">Phân Loại</th>
                      <th className="py-2.5 px-3 font-bold text-right">Tồn Kho</th>
                      <th className="py-2.5 px-3 font-bold text-right">Đơn Giá Chuẩn</th>
                      <th className="py-2.5 px-3 font-bold text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryItems.map((row) => (
                      <tr key={row.itemId} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {row.emoji} {row.name}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {row.category === 'crop'
                            ? 'Nông sản thô'
                            : row.category === 'product'
                              ? 'Thành phẩm nhà máy'
                              : 'Vật tư hỗ trợ'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-num font-bold text-slate-800">
                          {formatNumber(row.qty)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-num text-slate-600">
                          {formatNumber(row.unitValue)} V
                        </td>
                        <td className="py-2 px-3 text-right font-mono-num font-bold text-emerald-700">
                          {formatNumber(row.totalValue)} V
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* B2B Wholesale Supply Contracts */}
          <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Hợp Đồng Cung Ứng Sỉ B2B (Xuất Khẩu & Chuỗi Siêu Thị)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xuất kho lô hàng lớn cho đối tác B2B để nhận doanh thu Vàng cao, cộng thẳng Quỹ Doanh Nghiệp và lượng lớn EXP tăng Level.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono-num font-bold text-amber-800">
                Thưởng doanh thu hiện tại: +{bonuses.wholesaleBonusPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WHOLESALE_CONTRACTS.map((contract) => {
                const locked = user.level < contract.minLevel;
                const reqEntries = Object.entries(contract.items);
                const canFulfill =
                  !locked &&
                  reqEntries.every(
                    ([itemId, needed]) => (user.inventory[itemId] || 0) >= needed
                  );
                const boostedGold = Math.round(
                  contract.rewardGold * (1 + bonuses.wholesaleBonusPct / 100)
                );

                return (
                  <div
                    key={contract.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                      canFulfill
                        ? 'bg-[#F4FAF0] border-emerald-300'
                        : 'bg-[#FAFDF8] border-[#DCE7D3]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-3xl">{contract.emoji}</span>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                              {contract.title}
                            </h3>
                            <div className="text-xs text-slate-500">
                              Đối tác: <strong>{contract.partnerName}</strong> · Yêu cầu Lv.{contract.minLevel}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Required Cargo */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {reqEntries.map(([itemId, needed]) => {
                          const meta = ITEM_CATALOG[itemId];
                          const have = user.inventory[itemId] || 0;
                          const enough = have >= needed;
                          return (
                            <span
                              key={itemId}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono-num font-semibold ${
                                enough
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <span>{meta?.emoji || '📦'}</span>
                              <span>{meta?.name || itemId}:</span>
                              <strong>
                                {have}/{needed}
                              </strong>
                            </span>
                          );
                        })}
                      </div>

                      {/* Payout preview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono-num">
                        <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 font-bold text-amber-700">
                          +{formatNumber(boostedGold)} Vàng
                        </div>
                        <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 font-bold text-emerald-700">
                          +{formatNumber(contract.corporateFundBonus)}V vào Quỹ
                        </div>
                        <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 font-bold text-sky-700">
                          +{formatNumber(contract.rewardExp)} EXP
                        </div>
                        <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 font-bold text-purple-700">
                          +{contract.rewardReputation} Danh vọng
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canFulfill}
                      onClick={() => onFulfillWholesaleContract(contract.id)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
                    >
                      {locked
                        ? `Yêu cầu đạt Lv.${contract.minLevel}`
                        : canFulfill
                          ? 'Ký & Xuất Kho Giao Hàng B2B Ngay'
                          : 'Chưa đủ số lượng hàng hóa trong kho'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: HOẠT ĐỘNG KINH DOANH, CHIẾN DỊCH, NHÂN SỰ & ĐỘI XE
      ===================================================================== */}
      {activeSubTab === 'operations' && (
        <div className="space-y-6">
          {/* Corporate Business Campaigns */}
          <section className="bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Chiến Dịch Xúc Tiến Kinh Doanh (Trích Quỹ Doanh Nghiệp)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Kích hoạt chiến dịch để bứt phá doanh thu Đơn hàng NPC, Hợp đồng B2B và khích lệ tinh thần nhân viên.
                  </p>
                </div>
              </div>

              {activeCampaignDef && (
                <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-900">
                  Đang chạy: <strong>{activeCampaignDef.name}</strong> · Còn lại:{' '}
                  <span className="font-mono-num font-bold">
                    {formatRemainingDuration(ent.activeCampaignUntil - nowMs)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ENTERPRISE_CAMPAIGNS.map((camp) => {
                const isRunningThis = activeCampaignDef?.id === camp.id;
                const effectiveCost = Math.max(
                  500,
                  Math.round(camp.costGold * (1 - bonuses.campaignCostReductionPct / 100))
                );
                const canAfford = ent.corporateFund >= effectiveCost;

                return (
                  <div
                    key={camp.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                      isRunningThis
                        ? 'bg-[#F4FAF0] border-emerald-400'
                        : 'bg-[#FAFDF8] border-[#DCE7D3]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">{camp.emoji}</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono-num font-bold">
                          +{camp.orderBonusPct}% Đơn / +{camp.wholesaleBonusPct}% B2B
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{camp.name}</h3>
                      <p className="text-xs text-slate-500">{camp.description}</p>
                      <div className="text-[11px] font-mono-num text-emerald-700 font-semibold">
                        Hiệu lực: {camp.durationHours} giờ · +{camp.moraleBoost}% Tinh thần nhân sự
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isRunningThis || !canAfford}
                      onClick={() => onLaunchCampaign(camp.id)}
                      className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold font-mono-num hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
                    >
                      {isRunningThis
                        ? 'Đang triển khai chiến dịch này'
                        : `Kích hoạt · Trích Quỹ ${formatNumber(effectiveCost)}V${
                            bonuses.campaignCostReductionPct > 0
                              ? ` (-${bonuses.campaignCostReductionPct}%)`
                              : ''
                          }`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

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
      )}

      {/* =====================================================================
          TAB 4: TIỀN LƯƠNG HÀNG THÁNG & QUẢN TRỊ NHÂN SỰ (MONTHLY PAYROLL)
      ===================================================================== */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Payroll Breakdown Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-700" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Bảng Kê Tiền Lương Hàng Tháng (Kỳ {currentPeriodKey})
                  </h2>
                </div>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    isCurrentMonthPaid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isCurrentMonthPaid
                    ? `Đã quyết toán kỳ ${currentPeriodKey}`
                    : `Chờ thanh toán kỳ ${currentPeriodKey}`}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F4FAF0] text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3 font-bold">Nhân Sự</th>
                      <th className="py-2.5 px-3 font-bold">Chức Vụ</th>
                      <th className="py-2.5 px-3 font-bold text-center">Cấp Bậc</th>
                      <th className="py-2.5 px-3 font-bold text-right">Lương Tháng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollInfo.breakdown.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.emoji} {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{item.role}</td>
                        <td className="py-2.5 px-3 text-center font-mono-num font-bold text-emerald-700">
                          {item.level > 0 ? `Lv.${item.level}` : 'Chưa thuê'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-num font-bold text-slate-800">
                          {formatNumber(item.monthlySalary)} V
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FAFDF8] border-t border-slate-200 font-mono-num text-xs">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-slate-500">
                        Tổng quỹ lương gốc ({payrollInfo.headcount} nhân sự):
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-700">
                        {formatNumber(payrollInfo.grossSalary)} V
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-emerald-700">
                        Giảm trừ Chi phí Vận hành & Kiểm toán ERP (-{payrollInfo.discountPct}%):
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                        -{formatNumber(payrollInfo.grossSalary - payrollInfo.netSalary)} V
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200 text-sm">
                      <td colSpan={3} className="py-2.5 px-3 font-bold text-slate-900">
                        Thực Chi Lương Hàng Tháng:
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                        {formatNumber(payrollInfo.netSalary)} V
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Right: Payroll Actions & Employee Morale Management */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-rose-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Chỉ Số Tinh Thần & Phúc Lợi Nhân Sự
                  </h2>
                </div>

                <div className="rounded-xl bg-[#FAFDF8] border border-[#DCE7D3] p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Tinh thần đội ngũ (Employee Morale)
                    </span>
                    <span className="font-mono-num font-bold text-emerald-700">
                      {ent.morale}% / 100%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        ent.morale >= 90
                          ? 'bg-emerald-500'
                          : ent.morale >= 60
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, ent.morale))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {ent.morale >= 90
                      ? '🔥 Tinh thần Rất Cao (>=90%): Toàn bộ chỉ số nhân viên được cộng thêm +15% hiệu suất!'
                      : '💡 Khi tinh thần đạt từ 90% trở lên, toàn bộ nhân viên được kích hoạt +15% hiệu suất làm việc.'}
                  </p>
                </div>

                {/* Auto-pay toggle */}
                <div className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Tự động trích Quỹ Doanh Nghiệp trả lương
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Ưu tiên trừ từ Quỹ Doanh Nghiệp ({formatNumber(ent.corporateFund)}V) khi đến kỳ lương
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAutoPaySalary}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      ent.autoPaySalary
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {ent.autoPaySalary ? 'Đang BẬT' : 'Đang TẮT'}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={
                    payrollInfo.netSalary <= 0 ||
                    (ent.corporateFund < payrollInfo.netSalary &&
                      user.gold < payrollInfo.netSalary)
                  }
                  onClick={onPayMonthlySalary}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold font-mono-num hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    {isCurrentMonthPaid
                      ? `Chi Trả Trước Kỳ Lương Kế Tiếp (${formatNumber(payrollInfo.netSalary)}V · +8% Tinh thần)`
                      : `Thanh Toán Lương Kỳ ${currentPeriodKey} (${formatNumber(payrollInfo.netSalary)}V · +10% Tinh thần)`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={
                    ent.morale >= 100 ||
                    (ent.corporateFund < 1500 && user.gold < 1500)
                  }
                  onClick={onBonusEmployeeMorale}
                  className="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold font-mono-num hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
                >
                  🎁 Thưởng Nóng Nhân Sự 1.500V (+12% Tinh thần & +60 EXP)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
BusinessView.displayName = 'BusinessView';

