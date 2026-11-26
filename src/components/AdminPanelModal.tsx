import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  CreditCard,
  Dices,
  Gift,
  Plus,
  Power,
  Shield,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { formatNumber, generateRandomRedeemCode } from '../game/economy';
import type { RedeemCodeDoc, TopupRequestDoc } from '../game/types';

interface AdminPanelModalProps {
  adminEmail: string;
  codes: RedeemCodeDoc[];
  topupRequests: TopupRequestDoc[];
  onClose: () => void;
  onCreateCode: (params: {
    code: string;
    amount: number;
    maxUses: number;
    expiresAt: number;
  }) => Promise<void>;
  onToggleActive: (code: string, nextActive: boolean) => Promise<void>;
  onDeleteCode: (code: string) => Promise<void>;
  onCopyCode: (code: string) => void;
  onApproveTopup: (reqId: string) => Promise<void>;
  onRejectTopup: (reqId: string, reason: string) => Promise<void>;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000, 10000];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  adminEmail,
  codes,
  topupRequests,
  onClose,
  onCreateCode,
  onToggleActive,
  onDeleteCode,
  onCopyCode,
  onApproveTopup,
  onRejectTopup,
}) => {
  const pendingCount = topupRequests.filter((r) => r.status === 'pending').length;
  const [adminTab, setAdminTab] = useState<'topups' | 'codes'>('topups');
  const [topupFilter, setTopupFilter] = useState<'pending' | 'all'>('pending');
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');

  // Existing Giftcode form state
  const [codeValue, setCodeValue] = useState(() => generateRandomRedeemCode());
  const [amount, setAmount] = useState<number>(500);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expireDays, setExpireDays] = useState<number>(30);
  const [creating, setCreating] = useState(false);

  const visibleTopups =
    topupFilter === 'pending'
      ? topupRequests.filter((r) => r.status === 'pending')
      : topupRequests;

  const handleCreateCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeValue.trim() || amount <= 0 || maxUses <= 0) return;
    setCreating(true);
    try {
      const expiresAt = Date.now() + Math.max(1, expireDays) * 86_400_000;
      await onCreateCode({
        code: codeValue.trim().toUpperCase(),
        amount,
        maxUses,
        expiresAt,
      });
      setCodeValue(generateRandomRedeemCode());
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-title"
    >
      <div className="max-w-4xl w-full max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-[#FFFDF7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="admin-panel-title"
                className="text-lg font-bold text-slate-900"
              >
                Admin Panel — Duyệt Nạp & Giftcode DOPI
              </h2>
              <p className="text-xs text-slate-500">
                Quyền chính chủ: {adminEmail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Admin Panel"
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Sub-tabs */}
        <div className="px-6 pt-4 bg-white border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdminTab('topups')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              adminTab === 'topups'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Duyệt Lệnh Nạp</span>
            {pendingCount > 0 && (
              <span className="font-mono-num text-xs font-bold px-1.5 py-0.5 rounded-md bg-rose-600 text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('codes')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              adminTab === 'codes'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Quản Lý Giftcode ({codes.length})</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {adminTab === 'topups' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Danh sách lệnh nạp Xu trực tiếp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nút Duyệt chạy Firestore Transaction tự động cộng Xu, nâng VIP, tích lũy tháng và mở Quà Nạp Đầu.
                  </p>
                </div>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTopupFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                      topupFilter === 'pending'
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Chờ duyệt ({pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopupFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                      topupFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Tất cả ({topupRequests.length})
                  </button>
                </div>
              </div>

              {visibleTopups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  {topupFilter === 'pending'
                    ? 'Không có lệnh nạp nào đang chờ duyệt.'
                    : 'Chưa có lịch sử lệnh nạp nào trên hệ thống.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleTopups.map((req) => {
                    const isBusy = processingReqId === req.id;
                    const isRejectOpen = rejectingId === req.id;

                    return (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-200 bg-[#FAFDF8] p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-num text-sm font-bold text-slate-900">
                                {req.transferCode}
                              </span>
                              <span className="font-mono-num text-sm font-bold text-violet-700">
                                +{formatNumber(req.amount)} Xu DOPI
                              </span>
                              {req.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                  <Clock className="w-3.5 h-3.5" />
                                  Chờ duyệt
                                </span>
                              )}
                              {req.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <Check className="w-3.5 h-3.5" />
                                  Đã duyệt
                                </span>
                              )}
                              {req.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Từ chối
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-700">
                              <strong>{req.businessName}</strong> ({req.email}) · UID:{' '}
                              <span className="font-mono-num text-slate-500">
                                {req.uid.slice(0, 14)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              Tạo lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}
                              {req.note ? ` · Ghi chú: "${req.note}"` : ''}
                            </div>
                            {req.status === 'rejected' && req.rejectReason && (
                              <div className="text-xs text-rose-600 font-medium">
                                Lý do từ chối: {req.rejectReason}
                              </div>
                            )}
                          </div>

                          {req.status === 'pending' && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={async () => {
                                  setProcessingReqId(req.id);
                                  try {
                                    await onApproveTopup(req.id);
                                  } finally {
                                    setProcessingReqId(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {isBusy ? 'Đang duyệt...' : 'Duyệt'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setRejectingId(isRejectOpen ? null : req.id);
                                  setRejectReasonInput('');
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Từ chối
                              </button>
                            </div>
                          )}
                        </div>

                        {isRejectOpen && req.status === 'pending' && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                            <input
                              type="text"
                              value={rejectReasonInput}
                              onChange={(e) => setRejectReasonInput(e.target.value)}
                              placeholder="Nhập lý do từ chối (vd: Chưa nhận được tiền)..."
                              className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-rose-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async () => {
                                setProcessingReqId(req.id);
                                try {
                                  await onRejectTopup(req.id, rejectReasonInput);
                                  setRejectingId(null);
                                  setRejectReasonInput('');
                                } finally {
                                  setProcessingReqId(null);
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer whitespace-nowrap"
                            >
                              Xác nhận từ chối
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Existing Giftcode Management Tab */
            <>
              <form
                onSubmit={handleCreateCodeSubmit}
                className="rounded-2xl border border-slate-200 bg-[#FAFDF8] p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Tạo Mã Nạp / Giftcode Mới
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCodeValue(generateRandomRedeemCode())}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                    Sinh mã ngẫu nhiên
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 space-y-1.5">
                    <label
                      htmlFor="admin-code-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Mã Code (DOPI-XXXX-XXXX hoặc tự nhập)
                    </label>
                    <input
                      id="admin-code-input"
                      type="text"
                      required
                      value={codeValue}
                      onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono-num text-sm uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label
                      htmlFor="admin-amount-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Mệnh giá (Xu DOPI)
                    </label>
                    <input
                      id="admin-amount-input"
                      type="number"
                      min={1}
                      max={1000000}
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono-num text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label
                      htmlFor="admin-maxuses-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Số lượt tối đa
                    </label>
                    <input
                      id="admin-maxuses-input"
                      type="number"
                      min={1}
                      max={500}
                      required
                      value={maxUses}
                      onChange={(e) => setMaxUses(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono-num text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label
                      htmlFor="admin-expire-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Hạn (ngày)
                    </label>
                    <input
                      id="admin-expire-input"
                      type="number"
                      min={1}
                      max={365}
                      required
                      value={expireDays}
                      onChange={(e) => setExpireDays(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono-num text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500 mr-1">
                      Mệnh giá nhanh:
                    </span>
                    {PRESET_AMOUNTS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold border transition-colors cursor-pointer ${
                          amount === val
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        {formatNumber(val)}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    {creating ? 'Đang tạo...' : 'Phát hành Code'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Danh sách mã đã phát hành ({codes.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Tất cả lượt nạp đều xử lý bằng Firestore Transaction
                  </span>
                </div>

                {codes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Chưa có mã nạp nào. Hãy tạo mã đầu tiên ở khung phía trên.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Mã Code</th>
                          <th className="py-3 px-4 font-semibold">Xu DOPI</th>
                          <th className="py-3 px-4 font-semibold">Lượt dùng</th>
                          <th className="py-3 px-4 font-semibold">Hết hạn</th>
                          <th className="py-3 px-4 font-semibold">Trạng thái</th>
                          <th className="py-3 px-4 font-semibold text-right">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {codes.map((item) => {
                          const expired = item.expiresAt <= Date.now();
                          const exhausted = item.usedCount >= item.maxUses;
                          const statusLabel = !item.isActive
                            ? 'Đã khóa'
                            : expired
                              ? 'Hết hạn'
                              : exhausted
                                ? 'Hết lượt'
                                : 'Đang mở';
                          const statusColor =
                            !item.isActive || expired || exhausted
                              ? 'text-slate-500'
                              : 'text-emerald-700 font-semibold';

                          return (
                            <tr key={item.code} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4">
                                <div className="font-mono-num font-bold text-slate-900">
                                  {item.code}
                                </div>
                                {item.usedBy.length > 0 && (
                                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                    Người nhập: {item.usedBy.join(', ')}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono-num font-bold text-violet-700">
                                +{formatNumber(item.amount)}
                              </td>
                              <td className="py-3 px-4 font-mono-num text-slate-700">
                                {item.usedCount}/{item.maxUses}
                              </td>
                              <td className="py-3 px-4 font-mono-num text-xs text-slate-600">
                                {new Date(item.expiresAt).toLocaleDateString(
                                  'vi-VN'
                                )}
                              </td>
                              <td className={`py-3 px-4 text-xs ${statusColor}`}>
                                {statusLabel}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onCopyCode(item.code)}
                                    aria-label={`Sao chép mã ${item.code}`}
                                    title="Sao chép mã"
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onToggleActive(item.code, !item.isActive)
                                    }
                                    aria-label={
                                      item.isActive
                                        ? `Vô hiệu hóa ${item.code}`
                                        : `Kích hoạt lại ${item.code}`
                                    }
                                    title={
                                      item.isActive
                                        ? 'Vô hiệu hóa'
                                        : 'Kích hoạt lại'
                                    }
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 cursor-pointer"
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteCode(item.code)}
                                    aria-label={`Xóa mã ${item.code}`}
                                    title="Xóa mã"
                                    className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
