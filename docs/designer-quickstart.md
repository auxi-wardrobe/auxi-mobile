# Web Preview cho Designer 🎨

> TL;DR: app Auxi giờ chạy thẳng trên trình duyệt. Bạn nói muốn sửa gì → Claude
> sửa → bấm "deploy đi" → 1–2 phút sau có 1 cái link, mở ra là thấy app y như
> thật (data thật luôn). Không cài Xcode, không simulator, không token. Khỏe.

---

## Web preview là gì? 💡

Hiểu nôm na: **Auxi giờ mở được ngay trong tab trình duyệt**, không cần điện
thoại hay máy dev gì hết.

Trước đây muốn xem một thay đổi UI là cả một cực hình — cài Xcode, simulator,
Node, đợi build... nửa buổi chưa xong. Giờ thì:

> bạn mô tả thay đổi → Claude sửa code → bấm **"deploy đi"** → nhận một **link** → mở link là thấy.

Vài điểm xịn:

- 🔗 **Ra link, gửi ai cũng xem được** — không cần họ cài gì.
- 🧪 **Data thật** — outfit, thời tiết, ảnh đều là dữ liệu thật từ backend (auto
  login sẵn, bạn khỏi đăng nhập).
- 📱 **Đúng khung điện thoại** — hiện trong khung iPhone, chọn được đời máy (12 →
  18), không bị giãn méo theo cửa sổ.
- ♻️ **Mỗi lần deploy = 1 link riêng** — mở nhiều link cạnh nhau để so version.
- 🛟 **An toàn tuyệt đối** — đây chỉ là bản xem thử, *không* đụng tới app thật /
  store / người dùng.

---

## Dùng sao? (3 bước, thề là dễ) 🚀

### Bước 0 — Vào đúng "phòng": branch `web-preview`

Mọi thứ web nằm ở branch **`web-preview`**. Mở phiên Claude Code, có chỗ chọn
branch thì chọn `web-preview`. Không thấy thì gõ luôn câu đầu tiên:

```
Chuyển sang branch web-preview giúp tôi
```

> Lỡ deploy mà báo lỗi `no vite.config.ts` = bạn đứng nhầm phòng. Quay lại bước này.

### Bước 1 — Nói bạn muốn sửa gì

Cứ chat tự nhiên, càng rõ càng chuẩn:

```
Sửa Home: card outfit to hơn, bo góc nhiều hơn,
tên outfit in đậm, các card thưa ra xíu
```

Web với mobile xài **chung một bộ code**, nên sửa ở đây = sửa cho cả app luôn. 1 công đôi việc.

### Bước 2 — Bảo deploy

Ưng rồi thì gõ:

```
deploy đi
```

(hay "preview", "xem trên web", "cho xem thử cái" — Claude hiểu hết)

Đợi **~1–2 phút** cho Cloudflare build. Đi pha ly cà phê là vừa ☕.

### Bước 3 — Bấm link, xong

Claude trả về:

```
🔗 https://preview-<tên>-<giờ>.auxi-web-review.pages.dev
```

Mở link → **hard-refresh `Cmd + Shift + R`** cho chắc ăn thấy bản mới. Hết.

---

## Gặp trục trặc? Chill, fix nhanh 🔧

| Hiện tượng | Làm gì |
|---|---|
| Deploy báo `no vite.config.ts` | Sai branch → làm lại **Bước 0** (`web-preview`). |
| Mở link vẫn thấy bản cũ | Hard-refresh `Cmd + Shift + R`, hoặc đợi thêm 1 phút (đang build). |
| Link "Not Found" ngay sau deploy | Build chưa xong, đợi ~1–2 phút rồi refresh. |
| Layout nhìn kỳ kỳ / vỡ | Nhắn luôn ("chỗ X bị vỡ"), Claude sửa rồi deploy lại. |

---

## Muốn đưa lên app thật thì sao? 🚢

Preview chỉ là **bản nháp để xem**. Branch `preview/*` **không tự chui vào
`main`**. Khi nào thấy ngon và muốn ship thật → **báo team dev**, sẽ có bước
review (PR) đàng hoàng rồi mới lên app.

---

## Nhớ 3 dòng này là đủ 📌

1. Vào branch **`web-preview`**
2. *"sửa giúp tôi …"*
3. *"deploy đi"* → bấm 🔗
