import React from 'react';
import {
  ArrowLeft,
  Clock,
  Coffee,
  Gift,
  Heart,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { GameTab } from '../game/types';

interface DonateViewProps {
  onNavigateTab: (tab: GameTab) => void;
  onOpenTopupModal: () => void;
}

export const DonateView: React.FC<DonateViewProps> = ({
  onNavigateTab,
  onOpenTopupModal,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Coming Soon / Updating Card */}
      <section className="bg-white rounded-3xl border border-[#DCE7D3] p-6 sm:p-10 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
          <Clock className="w-3.5 h-3.5" />
          <span>Trạng thái: Đang Cập Nhật</span>
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Ủng Hộ Đội Ngũ Phát Triển (Donate)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Cổng <strong>Donate / Ủng Hộ Cộng Đồng DOPI TOWNE</strong> hiện đang được đội ngũ phát triển hoàn thiện và sẽ sớm ra mắt trong bản cập nhật tới. Cảm ơn tình cảm và sự đồng hành của bạn cùng thị trấn nông trại!
          </p>
        </div>

        {/* Upcoming Donate Perks Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-left">
          <div className="rounded-2xl bg-[#FAFDF8] border border-[#E2ECDA] p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs sm:text-sm">
              <Coffee className="w-4 h-4 shrink-0" />
              <span>Quỹ Duy Trì Máy Chủ</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mọi khoản đóng góp tự nguyện sẽ dùng để nâng cấp hạ tầng dữ liệu real-time và phát triển mùa lễ hội mới.
            </p>
          </div>

          <div className="rounded-2xl bg-[#FAFDF8] border border-[#E2ECDA] p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Danh Hiệu Nhà Bảo Trợ</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ghi danh trên Bảng Tri Ân Cộng Đồng kèm huy hiệu kỷ niệm đặc biệt trong hồ sơ nông trại.
            </p>
          </div>

          <div className="rounded-2xl bg-[#FAFDF8] border border-[#E2ECDA] p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sky-700 font-bold text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Minh Bạch & Cân Bằng</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Đang tích hợp cổng QR tự động và bảng sao kê cộng đồng trực tiếp ngay trong giao diện này.
            </p>
          </div>
        </div>

        {/* Notice box */}
        <div className="rounded-2xl bg-[#F4FAF0] border border-[#DCE7D3] p-4 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" />
            </span>
            <div className="text-xs text-slate-700">
              <div className="font-bold text-slate-900">
                Bạn đang muốn nhận Xu DOPI hoặc nhập Giftcode?
              </div>
              <div>
                Tính năng Nạp Xu Trực Tiếp & Nhập Giftcode vẫn hoạt động bình thường trên thanh công cụ.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenTopupModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Mở Nạp Xu & Giftcode</span>
          </button>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('farm')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Nông Trại</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('guide')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Xem Hướng Dẫn Chơi
          </button>
        </div>
      </section>
    </div>
  );
};
