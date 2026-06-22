# Sandbox — xem UI Auxi trên web 🎨

> TL;DR: **Sandbox** = app Auxi chạy thẳng trên trình duyệt. Bạn nói muốn sửa gì
> → Claude sửa → bấm **"sandbox đi"** → 1–2 phút sau có 1 cái link, mở ra là thấy
> app y như thật (data thật luôn). Không cài Xcode, không simulator, không token,
> **không cần biết branch gì cả**. Khỏe.

---

## Sandbox là gì? 💡

Hiểu nôm na: **Auxi giờ mở được ngay trong tab trình duyệt**, không cần điện
thoại hay máy dev gì hết. Bọn mình gọi cái này là **Sandbox** — cứ nói
"sandbox" / "sandbox đi" / "deploy đi" là Claude hiểu ngay.

Trước đây muốn xem một thay đổi UI là cả một cực hình — cài Xcode, simulator,
Node, đợi build... nửa buổi chưa xong. Giờ thì:

> bạn mô tả thay đổi → Claude sửa code → bấm **"sandbox đi"** → nhận một **link** → mở link là thấy.

Vài điểm xịn:

- 🔗 **Ra link, gửi ai cũng xem được** — không cần họ cài gì.
- 🧪 **Data thật** — outfit, thời tiết, ảnh đều là dữ liệu thật từ backend (auto
  login sẵn, bạn khỏi đăng nhập).
- 📱 **Đúng khung điện thoại** — hiện trong khung iPhone, chọn được đời máy (12 →
  18), không bị giãn méo theo cửa sổ.
- ♻️ **Mỗi lần deploy = 1 link riêng** — mở nhiều link cạnh nhau để so version.
- 👥 **Nhiều người làm cùng lúc thoải mái** — mỗi lần deploy là một sandbox riêng,
  không ai đụng ai.
- 🛟 **An toàn tuyệt đối** — đây chỉ là bản xem thử, *không* đụng tới app thật /
  store / người dùng.

---

## Dùng sao? (2 bước, thề là dễ) 🚀

### Bước 1 — Nói bạn muốn sửa gì

Mở Claude Code (web), cứ chat tự nhiên, càng rõ càng chuẩn:

```
Sửa Home: card outfit to hơn, bo góc nhiều hơn,
tên outfit in đậm, các card thưa ra xíu
```

Web với mobile xài **chung một bộ code**, nên sửa ở đây = sửa cho cả app luôn. 1
công đôi việc. (Bạn không cần chọn branch hay setup gì — Claude lo hết.)

### Bước 2 — Bảo deploy sandbox

Ưng rồi thì gõ:

```
sandbox đi
```

(hay "deploy đi", "preview", "xem trên web", "cho xem thử cái" — Claude hiểu hết)

Đợi **~1–2 phút** cho Cloudflare build, Claude sẽ trả về:

```
🔗 https://web-preview-<giờ>-<tên>.auxi-web-review.pages.dev
```

Mở link → **hard-refresh `Cmd + Shift + R`** cho chắc ăn thấy bản mới. Hết.

---

## Gặp trục trặc? Chill, fix nhanh 🔧

| Hiện tượng | Làm gì |
|---|---|
| Mở link vẫn thấy bản cũ | Hard-refresh `Cmd + Shift + R`, hoặc đợi thêm 1 phút (đang build). |
| Link "Not Found" ngay sau deploy | Build chưa xong, đợi ~1–2 phút rồi refresh. |
| Layout nhìn kỳ kỳ / vỡ | Nhắn luôn ("chỗ X bị vỡ"), Claude sửa rồi deploy lại. |

---

## Muốn đưa lên app thật thì sao? 🚢

Sandbox chỉ là **bản nháp để xem**. Nó **không tự chui vào `main`**. Khi nào thấy
ngon và muốn ship thật → **báo team dev**, sẽ có bước review (PR) đàng hoàng rồi
mới lên app.

---

## Nhớ 2 dòng này là đủ 📌

1. *"sửa giúp tôi …"*
2. *"sandbox đi"* → bấm 🔗
