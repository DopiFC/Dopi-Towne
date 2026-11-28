import React from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Coins,
  Factory,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { GameTab } from '../game/types';

interface GuideViewProps {
  onNavigateTab: (tab: GameTab) => void;
}

interface GuideStepCard {
  step: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  targetTab: GameTab;
  actionLabel: string;
  bullets: string[];
}

const GUIDE_STEPS: GuideStepCard[] = [
  {
    step: 'Bước 01',
    title: 'Trồng Trọt, Bón Phân & Đột Biến Nông Sản',
    subtitle: 'Nền tảng tạo nguồn nông sản và điểm kinh nghiệm (EXP)',
    icon: Sprout,
    accentClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    targetTab: 'farm',
    actionLabel: 'Đến Nông Trại',
    bullets: [
      'Bấm vào ô đất trống để chọn hạt giống phù hợp với cấp độ hiện tại (Lúa Mì, Cà Chua mở ngay từ Lv.1).',
      'Khi cây đang lớn, bạn có thể bấm vào ô đất để bón Phân Bón Tăng Tốc, Dinh Dưỡng (+25% tỉ lệ thu đôi) hoặc Thuốc Đột Biến Vàng (20% cơ hội nổ thưởng ×3 Vàng).',
      'Tích lũy Vàng để mở rộng tối đa 30 ô đất canh tác cùng lúc.',
    ],
  },
  {
    step: 'Bước 02',
    title: 'Chế Biến Nhà Máy & Giao Đơn Hàng NPC',
    subtitle: 'Gia tăng giá trị nông sản gấp 2–4 lần so với bán thô',
    icon: Factory,
    accentClass: 'bg-amber-50 text-amber-700 border-amber-200',
    targetTab: 'factory',
    actionLabel: 'Đến Nhà Máy & Đơn',
    bullets: [
      'Đưa nông sản thô vào Lò Bánh Mì, Xưởng Cà Phê hoặc Nhà Máy Sữa để sản xuất thành phẩm giá trị cao.',
      'Ưu tiên hoàn thành các Đơn Hàng NPC và Đơn Khẩn Cấp (trong mục Sự Kiện) để nhận nhiều Vàng, EXP lên cấp và Vé Sự Kiện.',
      'Theo dõi thông báo "Giờ Vàng Tăng Giá" mỗi giờ để bán mặt hàng đang sốt giá với lợi nhuận +35% đến +60%.',
    ],
  },
  {
    step: 'Bước 03',
    title: 'Kho Lưu Trữ Thông Minh & Cửa Hàng Phân Cấp',
    subtitle: 'Quản lý sản phẩm theo danh mục cha – con gọn gàng',
    icon: ShoppingBag,
    accentClass: 'bg-sky-50 text-sky-700 border-sky-200',
    targetTab: 'shop',
    actionLabel: 'Mở Cửa Hàng & Kho',
    bullets: [
      'Trong Kho Lưu Trữ, hãy bấm chọn Nhóm danh mục (ví dụ: Trái cây & Quả ngọt, Lương thực & Hạt, Bánh & Đồ uống) để lọc nhanh các sản phẩm con bên trong.',
      'Nâng cấp sức chứa kho bằng Vàng hoặc kích hoạt Thẻ Kho Cao Cấp để không bị đầy kho khi thu hoạch.',
      'Sưu tầm Báu Vật Quý Hiếm từ Lv.15+ để trưng bày trong hồ sơ và tăng mạnh điểm Tài Phú.',
    ],
  },
  {
    step: 'Bước 04',
    title: 'Giao Dịch Tự Do Trên Chợ P2P',
    subtitle: 'Mua bán nông sản & vật phẩm trực tiếp với người chơi khác',
    icon: Store,
    accentClass: 'bg-violet-50 text-violet-700 border-violet-200',
    targetTab: 'market',
    actionLabel: 'Vào Chợ P2P',
    bullets: [
      'Bạn có thể treo bán bất kỳ nông sản, bánh kẹo hoặc vật phẩm hỗ trợ nào trong kho theo giá Vàng hoặc Xu DOPI.',
      'Thuế giao dịch trên Chợ P2P mặc định là 8% (VIP 0) và giảm dần xuống chỉ còn 3% ở cấp VIP 10.',
      'Săn các lô hàng giá hời từ người chơi khác để gom đủ nguyên liệu giao đơn NPC nhanh chóng.',
    ],
  },
  {
    step: 'Bước 05',
    title: 'Sàn Đầu Tư Chứng Khoán & Gọi Vốn IPO',
    subtitle: 'Sinh lời thụ động từ cổ phiếu ngành và cổ tức doanh nghiệp',
    icon: TrendingUp,
    accentClass: 'bg-teal-50 text-teal-700 border-teal-200',
    targetTab: 'invest',
    actionLabel: 'Mở Sàn Đầu Tư',
    bullets: [
      'Sàn Chứng Khoán DOPI gồm 6 mã cổ phiếu biến động đồng bộ mỗi 15 phút kèm biểu đồ 24 phiên và bản tin kinh tế ngành.',
      'Bạn có thể mua/bán cổ phiếu ngay lập tức (T+0) để hưởng chênh lệch giá hoặc nắm giữ nhận cổ tức định kỳ mỗi 4 giờ.',
      'Khi đạt Level 10, bạn có thể Niêm Yết IPO doanh nghiệp của mình lên sàn P2P để huy động vốn Vàng từ các nhà đầu tư khác.',
    ],
  },
  {
    step: 'Bước 06',
    title: 'Nhân Sự Tự Động, Đội Xe & Kết Bạn Tưới Cây',
    subtitle: 'Xây dựng tập đoàn nông nghiệp tự vận hành',
    icon: Users,
    accentClass: 'bg-rose-50 text-rose-700 border-rose-200',
    targetTab: 'friends',
    actionLabel: 'Kết Bạn & Tưới Cây',
    bullets: [
      'Tại mục Doanh Nghiệp, hãy thuê "Nông Dân Cần Cù" để tự động thu hoạch cây chín ngay cả khi bạn đang bận.',
      'Tại mục Bạn Bè, tìm bạn theo Tên nông trại, Email, UID hoặc chọn từ danh sách Gợi Ý Kết Bạn trên máy chủ.',
      'Ghé thăm nông trại bạn bè và tưới cây giúp họ giảm 15% thời gian chín, đồng thời bạn nhận ngay +20 Vàng/lần (tối đa 5 lần/ngày).',
    ],
  },
];

export const GuideView: React.FC<GuideViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="bg-white rounded-3xl border border-[#DCE7D3] p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <BookOpen className="w-4 h-4" />
            <span>Cẩm Nang Tân Thủ & Kinh Tế Học DOPI TOWNE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Hướng Dẫn Chơi Game Cơ Bản
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Chào mừng bạn đến với thị trấn nông nghiệp & thương mại <strong>DOPI TOWNE</strong>. Chỉ cần nắm vững 6 bước cốt lõi dưới đây, bạn sẽ nhanh chóng phát triển từ một nông trại nhỏ thành tập đoàn niêm yết hàng đầu bảng xếp hạng!
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto shrink-0">
          <div className="rounded-2xl bg-[#F4FAF0] border border-[#DCE7D3] px-3.5 py-3 text-center">
            <Coins className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <div className="text-[11px] text-slate-500">Tiền tệ chính</div>
            <div className="text-xs font-bold text-slate-900">Vàng & Xu DOPI</div>
          </div>
          <div className="rounded-2xl bg-[#F4FAF0] border border-[#DCE7D3] px-3.5 py-3 text-center">
            <Briefcase className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
            <div className="text-[11px] text-slate-500">Mở khóa IPO</div>
            <div className="text-xs font-bold text-slate-900">Từ Level 10</div>
          </div>
          <div className="rounded-2xl bg-[#F4FAF0] border border-[#DCE7D3] px-3.5 py-3 text-center">
            <Award className="w-5 h-5 text-violet-700 mx-auto mb-1" />
            <div className="text-[11px] text-slate-500">Đặc quyền VIP</div>
            <div className="text-xs font-bold text-slate-900">VIP 1 – VIP 10</div>
          </div>
        </div>
      </section>

      {/* 6 Step Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {GUIDE_STEPS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.step}
              className="bg-white rounded-2xl border border-[#DCE7D3] p-5 sm:p-6 flex flex-col justify-between gap-4 hover:border-emerald-300 transition-colors"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${card.accentClass}`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="text-[11px] font-mono-num font-bold uppercase tracking-wider text-emerald-700">
                        {card.step}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {card.title}
                      </h2>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-500">
                  {card.subtitle}
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                  {card.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onNavigateTab(card.targetTab)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <span>{card.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Pro Tips Footer */}
      <section className="bg-[#FFFDF4] rounded-2xl border border-amber-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </span>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-amber-950">
              Mẹo Tăng Tốc Cho Người Mới
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              Đừng quên ghé mục <strong>Sự Kiện</strong> mỗi ngày để Điểm Danh 7 Ngày nhận Xu DOPI miễn phí, và hoàn thành đủ 5 <strong>Nhiệm Vụ Hàng Ngày</strong> để tích lũy thêm +10 Xu DOPI mỗi ngày!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('events')}
          className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
        >
          Điểm danh nhận quà ngay
        </button>
      </section>
    </div>
  );
};
