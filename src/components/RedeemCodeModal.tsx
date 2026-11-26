import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Dices,
  Gift,
  X,
  XCircle,
} from 'lucide-react';
import {
  formatNumber,
  generateTransferCode,
  getNextVipTier,
  getVipPerks,
} from '../game/economy';
import type { TopupRequestDoc, UserGameData } from '../game/types';

interface RedeemCodeModalProps {
  user: UserGameData;
  myTopupRequests: TopupRequestDoc[];
  onClose: () => void;
  onRedeem: (code: string) => Promise<void>;
  onCreateTopupRequest: (params: {
    amount: number;
    transferCode: string;
    note: string;
  }) => Promise<void>;
  onCopyText: (text: string, label: string) => void;
}

const TOPUP_PACKAGES = [100, 500, 1000, 5000, 20000];

export const RedeemCodeModal: React.FC<RedeemCodeModalProps> = ({
  user,
  myTopupRequests,
  onClose,
  onRedeem,
  onCreateTopupRequest,
  onCopyText,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'giftcode'>('direct');

  // Direct Top-Up form state
  const [amount, setAmount] = useState<number>(500);
  const [transferCode, setTransferCode] = useState<string>(() =>
    generateTransferCode()
  );
  const [note, setNote] = useState<string>('');
  const [creatingTopup, setCreatingTopup] = useState(false);

  // Giftcode form state (preserved from v1)
  const [codeInput, setCodeInput] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);

  const currentVip = getVipPerks(user.vipLevel);
  const nextVip = getNextVipTier(user.vipLevel);
  const progressPct = nextVip
    ? Math.min(
        100,
        Math.round((user.totalRechargedCoins / nextVip.requiredCoins) * 100)
      )
    : 100;

  const handleSubmitDirectTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 10 || amount > 1_000_000) return;
    setCreatingTopup(true);
    try {
      await onCreateTopupRequest({
        amount: Math.floor(amount),
        transferCode,
        note,
      });
      setNote('');
      setTransferCode(generateTransferCode());
    } finally {
      setCreatingTopup(false);
    }
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = codeInput.trim().toUpperCase();
    if (!cleaned) return;
    setSubmittingCode(true);
    try {
      await onRedeem(cleaned);
      setCodeInput('');
    } finally {
      setSubmittingCode(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="redeem-modal-title"
    >
      <div className="max-w-2xl w-full max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-[#FAF8FF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="redeem-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                Nạp Xu DOPI & Giftcode
              </h2>
              <p className="text-xs text-slate-500">
                Nhận Xu DOPI, mở khóa Quà Nạp Đầu và tự động thăng hạng VIP 1–10.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ nạp Xu"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* VIP Progress */}
          <div className="rounded-2xl bg-[#FAF8FF] border border-violet-100 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-violet-900 inline-flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" />
                VIP {user.vipLevel} · {currentVip.frameTitle}
              </span>
              <span className="font-mono-num text-violet-700 font-semibold">
                {nextVip
                  ? `${formatNumber(user.totalRechargedCoins)} / ${formatNumber(nextVip.requiredCoins)} Xu`
                  : 'Đã đạt VIP tối đa'}
              </span>
            </div>
            <div className="w-full h-2 bg-violet-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {nextVip && (
              <p className="text-xs text-slate-600">
                Cần thêm{' '}
                <strong className="font-mono-num text-slate-900">
                  {formatNumber(
                    Math.max(0, nextVip.requiredCoins - user.totalRechargedCoins)
                  )}{' '}
                  Xu DOPI
                </strong>{' '}
                để lên VIP {nextVip.level} (Giảm {nextVip.growthReductionPct}% thời gian trồng · Thuế chợ {nextVip.marketTaxPct}%).
              </p>
            )}
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('direct')}
              className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'direct'
                  ? 'bg-white text-violet-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Nạp Xu Trực Tiếp
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('giftcode')}
              className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'giftcode'
                  ? 'bg-white text-violet-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gift className="w-4 h-4" />
              Nhập Giftcode
            </button>
          </div>

          {activeTab === 'direct' ? (
            <div className="space-y-5">
              <form onSubmit={handleSubmitDirectTopup} className="space-y-4">
                {/* Package Selector */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-700">
                    1. Chọn gói Xu DOPI (hoặc nhập số Xu tùy chọn)
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {TOPUP_PACKAGES.map((pkg) => (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => setAmount(pkg)}
                        className={`py-2 px-2 rounded-xl border text-xs font-mono-num font-bold transition-colors cursor-pointer ${
                          amount === pkg
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-violet-50'
                        }`}
                      >
                        {formatNumber(pkg)} Xu
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <label
                      htmlFor="custom-topup-amount"
                      className="text-xs text-slate-500 whitespace-nowrap"
                    >
                      Số Xu muốn nạp:
                    </label>
                    <input
                      id="custom-topup-amount"
                      type="number"
                      min={10}
                      max={1000000}
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-36 px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 font-mono-num text-sm font-bold text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                  </div>
                </div>

                {/* Transfer Instructions & Auto Code */}
                <div className="rounded-2xl bg-[#FFFDF5] border border-amber-200 p-4 space-y-2.5 text-xs">
                  <div className="font-bold text-amber-900">
                    2. Thông tin chuyển khoản & Nội dung giao dịch
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <div>
                      Ngân hàng / Ví: <strong>MB Bank / Vietcombank · DOPI TOWNE</strong>
                    </div>
                    <div>
                      Chủ tài khoản: <strong>DOPI TOWNE OFFICIAL</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-amber-200 px-3 py-2">
                    <div>
                      <span className="text-slate-500 mr-1.5">Nội dung CK bắt buộc:</span>
                      <strong className="font-mono-num text-sm text-violet-800">
                        {transferCode}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onCopyText(transferCode, 'Mã giao dịch')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 font-semibold hover:bg-violet-100 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Sao chép
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferCode(generateTransferCode())}
                        title="Đổi mã giao dịch khác"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Dices className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="topup-note-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    3. Ghi chú xác minh (tuỳ chọn)
                  </label>
                  <input
                    id="topup-note-input"
                    type="text"
                    maxLength={200}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Đã chuyển khoản lúc 10:30 từ tài khoản..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingTopup || amount < 10}
                  className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {creatingTopup
                    ? 'Đang gửi lệnh nạp...'
                    : `Tạo Lệnh Nạp +${formatNumber(amount || 0)} Xu DOPI`}
                </button>
              </form>

              {/* Real-Time Top-Up Request History */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Lịch sử lệnh nạp của bạn ({myTopupRequests.length})
                </h3>
                {myTopupRequests.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Bạn chưa tạo lệnh nạp Xu nào. Sau khi tạo, trạng thái duyệt từ Admin sẽ cập nhật trực tiếp tại đây.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {myTopupRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-xl border border-slate-200 bg-[#FAFDF8] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-num font-bold text-slate-900">
                              {req.transferCode}
                            </span>
                            <span className="font-mono-num font-bold text-violet-700">
                              +{formatNumber(req.amount)} Xu
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(req.createdAt).toLocaleString('vi-VN')}
                            {req.note ? ` · ${req.note}` : ''}
                          </div>
                          {req.status === 'rejected' && req.rejectReason && (
                            <div className="text-[11px] text-rose-600 font-medium">
                              Lý do: {req.rejectReason}
                            </div>
                          )}
                        </div>

                        <div>
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                              <Clock className="w-3.5 h-3.5" />
                              Chờ Admin duyệt
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đã cộng Xu
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                              <XCircle className="w-3.5 h-3.5" />
                              Từ chối
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Existing Giftcode Tab */
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="redeem-code-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nhập mã nạp / Giftcode
                </label>
                <input
                  id="redeem-code-input"
                  type="text"
                  required
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: DOPI-ABCD-1234"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 font-mono-num text-base tracking-wider uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingCode || !codeInput.trim()}
                className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submittingCode ? 'Đang xác thực giao dịch...' : 'Xác nhận nạp Code'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
