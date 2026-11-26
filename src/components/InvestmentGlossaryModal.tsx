import React from 'react';
import { BookOpen, Clock, Percent, ShieldCheck, TrendingUp, X } from 'lucide-react';

interface InvestmentGlossaryModalProps {
  onClose: () => void;
}

const GLOSSARY_ITEMS = [
  {
    icon: TrendingUp,
    title: 'Chỉ số P/E (Giá trên Lợi nhuận)',
    detail:
      'Cho biết nhà đầu tư đang trả bao nhiêu lần lợi nhuận cho 1 cổ phiếu. P/E thấp (10–15) thường là mã phòng thủ ổn định như DAGR, WARE; P/E cao (>25) thuộc nhóm tăng trưởng mạnh và biến động lớn như BIOF, LUXD.',
  },
  {
    icon: BookOpen,
    title: 'Cổ tức (Dividend) — Thu nhập thụ động',
    detail:
      'Cổ phiếu thị trường DOPI trả cổ tức mỗi chu kỳ 4 giờ theo tỷ suất %/ngày. Cổ phần doanh nghiệp P2P chia cổ tức thực từ Quỹ cổ tức (trích 5%–10% doanh thu đơn hàng NPC của chủ nông trại), đảm bảo cân bằng kinh tế không lạm phát.',
  },
  {
    icon: ShieldCheck,
    title: 'Xếp hạng Tín nhiệm P2P (AAA → C)',
    detail:
      'Hệ thống tự động định giá cổ phần và chấm điểm tín nhiệm dựa trên Điểm Tài Phú, Cấp độ, Quy mô nông trại và Đơn hàng hoàn thành. Chủ doanh nghiệp không thể tự chỉnh giá; nếu vắng mặt quá 7 ngày sẽ tự động giảm định giá và hạ bậc tín nhiệm.',
  },
  {
    icon: Percent,
    title: 'Phí giao dịch sàn (4% → 1.5% theo VIP)',
    detail:
      'Mỗi lệnh Mua hoặc Bán chịu phí sàn mặc định 4% ở VIP 0, giảm đều 0.25% mỗi cấp VIP và chỉ còn 1.5% ở VIP 10. Hãy cân nhắc mức phí này trước khi lướt sóng ngắn hạn.',
  },
  {
    icon: Clock,
    title: 'Khóa lệnh T+30 phút (Lock-up)',
    detail:
      'Sau khi khớp lệnh Mua cổ phiếu NPC hoặc cổ phần P2P, lượng cổ phiếu đó sẽ được khóa giao dịch trong 30 phút để chống spam và giữ thị trường ổn định. Hết thời gian khóa bạn có thể bán chốt lời bất kỳ lúc nào.',
  },
];

export const InvestmentGlossaryModal: React.FC<InvestmentGlossaryModalProps> = ({
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-modal-title"
    >
      <div className="max-w-2xl w-full max-h-[88vh] bg-white rounded-3xl border border-[#DCE7D3] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-[#F4FAF0] border-b border-[#DCE7D3] flex items-center justify-between gap-3">
          <div>
            <h3
              id="glossary-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              Hướng dẫn & Giải thích chỉ số Đầu Tư
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Cẩm nang đọc báo cáo nhanh cho nhà đầu tư DOPI Towne
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hướng dẫn chỉ số"
            className="p-2 rounded-xl text-slate-500 hover:bg-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {GLOSSARY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3.5 pb-4 border-b border-slate-100 last:border-b-0 last:pb-0"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3.5 bg-[#FAFDF8] border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
