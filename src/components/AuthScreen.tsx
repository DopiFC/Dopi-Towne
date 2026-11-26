import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Store,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { auth, googleProvider } from '../firebaseConfig';
import { BrandCrest } from './BrandCrest';

interface AuthScreenProps {
  unverifiedUser: User | null;
  onRefreshVerification: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

function translateAuthError(codeOrMessage: string): string {
  if (codeOrMessage.includes('auth/invalid-credential') || codeOrMessage.includes('auth/wrong-password')) {
    return 'Email hoặc mật khẩu chưa chính xác.';
  }
  if (codeOrMessage.includes('auth/user-not-found')) {
    return 'Không tìm thấy tài khoản với email này.';
  }
  if (codeOrMessage.includes('auth/email-already-in-use')) {
    return 'Email này đã được đăng ký tài khoản DOPI TOWNE.';
  }
  if (codeOrMessage.includes('auth/weak-password')) {
    return 'Mật khẩu cần tối thiểu 6 ký tự.';
  }
  if (codeOrMessage.includes('auth/popup-closed-by-user')) {
    return 'Bạn đã đóng cửa sổ đăng nhập Google.';
  }
  if (codeOrMessage.includes('auth/operation-not-allowed')) {
    return 'Phương thức đăng nhập Email/Mật khẩu chưa được bật trong Firebase Console. Hãy đăng nhập bằng Google hoặc bật Email/Password trong Firebase Authentication.';
  }
  if (codeOrMessage.includes('auth/unauthorized-domain')) {
    return 'Tên miền hiện tại chưa được thêm vào Authorized Domains trong Firebase Authentication.';
  }
  return 'Không thể đăng nhập lúc này. Vui lòng kiểm tra thông tin và thử lại.';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  unverifiedUser,
  onRefreshVerification,
  onToast,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onToast('success', 'Đăng nhập Google thành công! Chào mừng trở lại DOPI TOWNE.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onToast('error', translateAuthError(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      onToast('warning', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      onToast('warning', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const safeName = displayName.trim() || trimmedEmail.split('@')[0];
        await updateProfile(cred.user, { displayName: safeName });
        await sendEmailVerification(cred.user);
        onToast(
          'info',
          'Đăng ký thành công! Vui lòng mở hộp thư để xác minh email trước khi vào nông trại.'
        );
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        onToast('success', 'Đăng nhập thành công!');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onToast('error', translateAuthError(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(unverifiedUser);
      onToast('success', 'Đã gửi lại liên kết xác minh tới hộp thư của bạn.');
    } catch {
      onToast('error', 'Vui lòng đợi một lát trước khi gửi lại email xác minh.');
    } finally {
      setLoading(false);
    }
  };

  if (unverifiedUser) {
    return (
      <div className="min-h-screen bg-[#F6F9F2] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#DCE8D4] shadow-sm p-8 space-y-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Xác minh Email để bắt đầu
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Chúng tôi đã gửi liên kết xác nhận đến{' '}
            <strong className="text-slate-900">{unverifiedUser.email}</strong>.
            Xác minh email giúp bảo vệ tài sản Vàng & Xu DOPI của bạn an toàn tuyệt đối.
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                await onRefreshVerification();
                setLoading(false);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Tôi đã xác minh — Vào game ngay
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleResendVerification}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Gửi lại email xác minh
            </button>
            <button
              type="button"
              onClick={() => auth && signOut(auth)}
              className="text-xs text-slate-500 hover:text-slate-800 pt-1 cursor-pointer"
            >
              Đăng xuất và dùng tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9F2] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border border-[#DCE8D4] shadow-sm overflow-hidden">
        {/* Left Scenic Cozy Farm Hero */}
        <div className="lg:col-span-7 bg-[#EBF5E3] p-8 sm:p-10 flex flex-col justify-between gap-8 relative">
          <div className="space-y-5">
            <div className="flex items-center gap-3.5">
              <BrandCrest size={54} />
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-emerald-950 tracking-tight leading-none">
                  DOPI TOWNE
                </h1>
                <p className="text-sm text-emerald-800/80 font-medium mt-1">
                  Nông Trại Chế Biến & Kinh Doanh Thị Trấn
                </p>
              </div>
            </div>

            <p className="text-base text-slate-700 leading-relaxed max-w-lg text-balance">
              Gieo trồng nông sản theo thời gian thực, vận hành lò bánh & xưởng cà phê, chốt đơn khách thị trấn và giao thương tự do trên Chợ P2P cùng bạn bè.
            </p>
          </div>

          {/* Custom Inline SVG Sunlit Farm Landscape */}
          <div className="rounded-2xl bg-white/75 border border-[#D4E6C8] p-4">
            <svg
              viewBox="0 0 560 190"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto rounded-xl"
              aria-hidden="true"
            >
              <rect width="560" height="190" rx="12" fill="#E0F2FE" />
              <circle cx="485" cy="42" r="24" fill="#FDE047" />
              {/* Soft clouds */}
              <ellipse cx="110" cy="42" rx="34" ry="12" fill="#FFFFFF" opacity="0.9" />
              <ellipse cx="132" cy="37" rx="22" ry="10" fill="#FFFFFF" opacity="0.95" />
              <ellipse cx="320" cy="34" rx="28" ry="10" fill="#FFFFFF" opacity="0.85" />
              {/* Distant rolling hills */}
              <path d="M0 135C110 92 220 98 340 128C430 148 495 112 560 120V190H0V135Z" fill="#86EFAC" />
              <path d="M0 150C140 120 300 128 560 144V190H0V150Z" fill="#4ADE80" />
              {/* Cozy farmhouse & silo */}
              <rect x="74" y="88" width="66" height="48" rx="3" fill="#EA580C" stroke="#7C2D12" strokeWidth="2.5" />
              <path d="M64 92L107 60L150 92" stroke="#9A3412" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="96" y="106" width="22" height="30" rx="2" fill="#FEF3C7" stroke="#7C2D12" strokeWidth="2" />
              <path d="M96 106L118 136M118 106L96 136" stroke="#9A3412" strokeWidth="1.5" />
              <rect x="148" y="76" width="26" height="60" rx="12" fill="#FDE68A" stroke="#B45309" strokeWidth="2" />
              {/* Tilled crop plots */}
              <rect x="220" y="138" width="74" height="32" rx="8" fill="#B48358" stroke="#78502D" strokeWidth="2" />
              <rect x="308" y="138" width="74" height="32" rx="8" fill="#B48358" stroke="#78502D" strokeWidth="2" />
              <rect x="396" y="138" width="74" height="32" rx="8" fill="#B48358" stroke="#78502D" strokeWidth="2" />
              {/* Crops sprouting */}
              <circle cx="242" cy="146" r="8" fill="#FACC15" />
              <circle cx="262" cy="148" r="8" fill="#FACC15" />
              <circle cx="278" cy="145" r="7" fill="#FACC15" />
              <circle cx="330" cy="148" r="7" fill="#EF4444" />
              <circle cx="352" cy="146" r="7" fill="#EF4444" />
              <circle cx="422" cy="148" r="7" fill="#16A34A" />
              <circle cx="445" cy="146" r="8" fill="#15803D" />
            </svg>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <Sprout className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-900">Nông trại thời gian thực</div>
                <div className="text-slate-600 mt-0.5">Tính chín chuẩn timestamp ngay cả khi thoát trang.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Store className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-900">Chợ P2P & VIP 1–10</div>
                <div className="text-slate-600 mt-0.5">Giao dịch an toàn bằng Firestore Transaction.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Users className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-900">Kết bạn & Tưới cây</div>
                <div className="text-slate-600 mt-0.5">Ghé thăm nông trại bạn bè, nhận thưởng mỗi ngày.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Panel */}
        <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Đăng nhập nông trại' : 'Tạo tài khoản mới'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Dữ liệu tài sản & tiến độ được đồng bộ trực tiếp trên Cloud Firestore.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm font-semibold hover:bg-slate-50 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer shadow-xs"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            Tiếp tục bằng Google
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>hoặc dùng Email & Mật khẩu</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-display-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Tên chủ trang trại
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-display-name"
                    type="text"
                    maxLength={32}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ví dụ: Minh Khang"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#FAFDF8] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-slate-700"
              >
                Email tài khoản
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tenban@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#FAFDF8] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#FAFDF8] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              {mode === 'login' ? 'Vào DOPI TOWNE' : 'Đăng ký & Nhận nông trại'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span>
              {mode === 'login' ? 'Chưa có trang trại?' : 'Đã có tài khoản?'}
            </span>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              {mode === 'login' ? 'Đăng ký tài khoản' : 'Chuyển sang đăng nhập'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Yêu cầu đăng nhập để bảo vệ dữ liệu. Không hỗ trợ chơi ẩn danh.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
