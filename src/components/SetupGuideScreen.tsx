import React from 'react';
import { Wrench, ExternalLink } from 'lucide-react';
import { BrandCrest } from './BrandCrest';

export const SetupGuideScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F6F9F2] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-[#DDE7D5] shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-4">
          <BrandCrest size={52} />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              DOPI TOWNE — Cấu hình Firebase
            </h1>
            <p className="text-sm text-slate-500">
              Hoàn tất cấu hình Firebase v10 để đồng bộ dữ liệu nông trại thời gian thực.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#F8FBF4] border border-[#E2ECDA] p-5 space-y-3 text-sm text-slate-700 leading-relaxed">
          <div className="flex items-center gap-2 font-semibold text-emerald-800">
            <Wrench className="w-4 h-4" />
            <span>Các bước kích hoạt nhanh cho bản deploy tĩnh GitHub Pages</span>
          </div>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Mở tệp <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs">src/firebaseConfig.ts</code> và điền đầy đủ thông tin từ Firebase Console (Web App Config).
            </li>
            <li>
              Bật <strong>Google</strong> và <strong>Email/Password</strong> trong mục <em>Firebase Authentication → Sign-in method</em>.
            </li>
            <li>
              Thêm tên miền GitHub Pages của bạn (dạng <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs">&lt;username&gt;.github.io</code>) vào mục <em>Authorized domains</em>.
            </li>
            <li>
              Cập nhật hằng số <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs">ADMIN_EMAIL</code> bằng Gmail chính chủ để mở khóa Admin Panel.
            </li>
            <li>
              Chạy <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs">npm run build</code> để xuất bản build vào thư mục <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs">/docs</code> và đẩy lên nhánh <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-xs">main</code>.
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-500">
            Không sử dụng biến môi trường .env · An toàn 100% với GitHub Pages tĩnh
          </span>
          <a
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            Mở Firebase Console
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
