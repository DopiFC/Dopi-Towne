# DOPI TOWNE — Web Game Mô Phỏng Nông Trại & Kinh Doanh

**DOPI TOWNE** là game mô phỏng nông trại kết hợp kinh doanh xây dựng bằng React, TypeScript, Tailwind CSS, Lucide Icons và Firebase v10 (Authentication & Cloud Firestore), cấu hình sẵn để deploy tĩnh trên **GitHub Pages (`main` → `/docs`)**.

---

## 1. Cấu hình Firebase & Quyền Admin

1. Mở tệp `src/firebaseConfig.ts`:
   - Kiểm tra object `firebaseConfig` (đã khai báo trực tiếp, không phụ thuộc `.env` khi build tĩnh). Bạn có thể thay bằng cấu hình dự án Firebase riêng của mình.
   - Đổi hằng số `ADMIN_EMAIL` sang địa chỉ Gmail chính chủ để hiển thị nút **Admin Panel** (phát hành & quản lý mã nạp Xu DOPI).
2. Trong **Firebase Console → Authentication → Sign-in method**:
   - Đảm bảo **Google** đã được bật.
   - Nếu muốn cho phép đăng ký/đăng nhập bằng **Email/Password**, hãy bật thêm provider **Email/Password** trong Firebase Console.
3. Trong **Firebase Console → Firestore Database → Rules**:
   - Triển khai nội dung file `firestore.rules` (nhớ cập nhật email trong hàm `isAdminEmail()` khớp với `ADMIN_EMAIL` của bạn).

---

## 2. Build & Deploy lên GitHub Pages (`main` → `/docs`)

Dự án đã cấu hình sẵn `base: './'`, `build.outDir: 'docs'` và `public/.nojekyll` (không dùng `BrowserRouter` nên nhấn F5 không bao giờ lỗi 404).

### Các lệnh build và đẩy lên nhánh `main`:

```bash
npm install
npm run build
git add .
git commit -m "Build DOPI TOWNE production to /docs"
git push origin main
```

### Bật GitHub Pages & Cấp quyền Domain cho Firebase Auth:

1. Trên GitHub Repository → **Settings → Pages**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` · **Folder**: `/docs` → bấm **Save**.
2. **BẮT BUỘC cho đăng nhập Google/Email hoạt động trên GitHub Pages:**
   - Mở **Firebase Console → Authentication → Settings → Authorized domains**.
   - Bấm **Add domain** và thêm tên miền GitHub Pages của bạn: `<username>.github.io`.

---

## 3. Tính năng chính
- **Nông Trại thời gian thực**: Gieo hạt, tính thời gian chín theo timestamp `Date.now()`, bón phân tăng tốc, mở thêm ô đất (chi phí tăng cấp số nhân `1.45^cấp`), mở khóa "Thu hoạch tất cả" từ VIP 4.
- **Nhà Máy & Đơn Hàng NPC**: Lò Bánh Mì, Xưởng Cà Phê, Nhà Máy Sữa có hàng đợi theo cấp VIP + Bảng đơn hàng NPC + Sự kiện biến động thị trường tăng giá theo giờ.
- **Chợ P2P & Nạp Code an toàn**: Mọi giao dịch Nạp Code, Mua/Bán P2P, Mở đất, Mở kho, Tưới cây đều sử dụng `runTransaction()` của Firestore để chống cộng đúp tiền.
- **Hệ thống VIP 1–10 & Admin Panel**: Tự động cộng dồn `totalRechargedCoins` khi nạp code để thăng hạng VIP, giảm thời gian trồng và giảm thuế sàn Chợ P2P từ 8% xuống 3%.
