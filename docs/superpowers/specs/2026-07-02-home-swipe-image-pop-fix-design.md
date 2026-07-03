# Home swipe deck — diệt cú "nhảy" ảnh sau khi vuốt

- **Ngày:** 2026-07-02
- **Screen:** Home (Tinder-style outfit swipe deck)
- **Loại:** UX / motion fix (bugfix, không thêm feature)
- **File trung tâm:** `src/components/features/OutfitSwipeDeck.tsx`

## 1. Vấn đề

Ở Home, sau khi người dùng vuốt xong một card (fling đi), ảnh outfit của card
tiếp theo bị **một "bước nhảy" cập nhật**: nội dung hiện ra rồi fade/slide lại
một lần nữa, gây cảm giác giật, thiếu mượt.

Phỏng đoán ban đầu ("app chỉ update image URL sau khi vuốt xong nên ảnh load
trễ") **không đúng**: ảnh của card kế tiếp đã có sẵn trong state và đã được mount
sẵn phía sau card đang active. Đây không phải vấn đề tải/decode ảnh.

## 2. Nguyên nhân gốc

Trong `OutfitSwipeDeck.tsx`, deck mount stack tối đa 3 card (`prevPeek`,
`active`, `nextPeek`) — tất cả absolutely-positioned trong cùng một ô. Card peek
đã render sẵn (được fade-in bằng interpolation theo `pan.x` khi kéo).

Cú "nhảy" đến từ **cách đặt `key`**: mỗi card được key theo **vai trò**
(`active-<id>`, `next-<id>`, `prev-<id>`). Khi `activeIndex` tăng (sau khi
`Animated.timing` fling kết thúc ~250ms và callback gọi `setActiveIndex(next)`):

- Card đang là `nextPeek` (key `next-<id>`) trở thành `active` (key
  `active-<id>`). Vì key đổi, React coi là **card khác** ⇒ **unmount card cũ +
  mount card mới**.
- Card mới mount lại chạy lại `useEffect` reveal trong `OptionSheet`: `revealAnim`
  khởi tạo lại về 0 (do `reveal='light'`) rồi fade/translate vào lại từ đầu —
  dù nội dung y hệt vừa hiển thị đầy đủ ở vai trò peek (`reveal='none'`,
  `revealAnim=1`) một khoảnh khắc trước.

Chính **remount + re-run reveal** này là "1 bước nhảy" người dùng thấy. Việc
`setActiveIndex` bị chốt vào callback hoàn tất animation làm lộ rõ bước nhảy đó.

Tham chiếu code (tại thời điểm viết spec):

- Stack 3 card + interpolation opacity peek: `OutfitSwipeDeck.tsx` (~L61-65,
  L175-184, L201-260).
- Commit fling + advance trong `.start()` callback: `OutfitSwipeDeck.tsx`
  (~L85-110).
- Advance index: `HomeScreen/index.tsx` `advanceDeck` (~L1177-1194).
- Reveal animation: `HomeScreen/components/OptionSheet.tsx` (~L54-80), prop
  `reveal` truyền vào từ `HomeScreen/index.tsx` (~L1369-1375).

## 3. Mục tiêu & không-mục-tiêu

**Mục tiêu:**
- Vuốt xong không còn cú nhảy/fade lại của ảnh. Card peek "thăng chức" thành
  active **tại chỗ**, liền mạch.

**Không làm (giữ nguyên chủ đích — bản "diệt gọn cú pop", rủi ro thấp):**
- Không thêm chuyển động "card sau scale/trôi vào giữa liên tục theo ngón tay"
  kiểu Tinder cao cấp (đó là phương án lớn hơn, đã cân nhắc và bỏ).
- Không đổi cơ chế fetch/buffer `valenGetRecommendation`, không đổi mảng
  `listOutfits`.
- Không đổi ngưỡng commit (30% width / velocity 0.4) hay thời lượng fling 250ms.
- Không đổi entrance 700ms của card đầu tiên (`reveal='full'` khi index 0).

## 4. Thiết kế fix

**Cốt lõi: key card theo *danh tính item*, không theo vai trò — để React giữ
nguyên instance khi card đổi vai trò ⇒ không remount ⇒ không re-run reveal.**

1. Trong `OutfitSwipeDeck.tsx`, thay 3 block card key theo vai trò bằng **một
   `.map`** trên cửa sổ hiển thị (prev/active/next), `key={keyOf(item)}` (theo
   danh tính item, ổn định qua các lần index đổi).
2. Style animated tính theo **vai trò bên trong map**:
   - `active`: `transform: [{ translateX: pan.x }]` + gắn `panHandlers`.
   - `peek` (prev/next): opacity/scale interpolation theo `pan.x` như hiện tại.
3. Nhờ key ổn định: khi `activeIndex` tăng, instance của card peek được **giữ
   nguyên** → `revealAnim` vẫn ở giá trị 1 (đã hiển thị đủ) → `useEffect` reveal
   `'light'` chạy `Animated.timing` 1→1 = **no-op** → hết cú fade lại.
4. Card mới trôi vào cửa sổ (nextPeek mới) vẫn mount mới với `reveal='none'`
   (hiện tức thì, opacity 0 khi ở đáy chồng) — hành vi như cũ, không pop.

Giữ nguyên `pan.setValue({ x: 0 })` trước khi advance (đã có, để card thăng chức
nằm ở giữa chứ không ở vị trí đã fling).

## 5. Files chạm

- **`src/components/features/OutfitSwipeDeck.tsx`** — đổi render 3 block →
  `.map` keyed theo item; style theo vai trò trong map. (Thay đổi chính.)
- **`src/screens/HomeScreen/components/OptionSheet.tsx`** — *chỉ kiểm tra*: đảm
  bảo reveal `useEffect` không tự reset khi prop `reveal` đổi peek→active trên
  cùng instance (kỳ vọng đã no-op; nếu không, guard để không animate lại khi
  `revealAnim` đã ở 1).
- **`src/screens/HomeScreen/index.tsx`** — *có thể không cần đổi*; chỉ đụng nếu
  logic `reveal` prop (~L1369-1375) cần điều chỉnh để tránh pop.

## 6. Edge cases cần kiểm khi implement

- **peek ↔ active render khác nhau?** Nếu `OptionSheet` ẩn/hiện nút hành động
  theo vai trò, đảm bảo nút đi theo `reveal`/opacity để không tạo pop mới khi
  thăng chức.
- **Swipe-back (prev → active):** cơ chế đối xứng, phải cũng mượt (index giảm).
- **Đầu deck / cuối deck:** `prevPeek` không tồn tại khi `activeIndex===0`;
  `nextPeek` không tồn tại ở cuối trước khi buffer nạp thêm — map phải bỏ qua
  item `undefined` an toàn.
- **Reconcile theo key:** xác nhận 3 phần tử nằm trong cùng một parent list để
  React match theo key đúng khi đổi thứ tự vai trò.

## 7. Verify / Definition of done

- `npx tsc --noEmit` sạch (lỗi legacy `_HomeScreen.tsx` được bỏ qua theo
  CLAUDE.md).
- `yarn lint` không thêm lỗi/warning mới so với baseline.
- Verify trực quan (sim qua mobile-mcp/qa, hoặc web sandbox): vuốt liên tục 5–6
  card, tới/lui, xác nhận **không còn nhảy/fade lại**; entrance card đầu vẫn OK.
- Vì là thay đổi motion trên screen → qua **designer design-review (step 6.5)**
  trước khi mở PR (`.claude/rules/design-review-required.md`).

**Không thuộc phạm vi analytics:** đây là refactor motion giữ nguyên hành vi
tương tác (không thêm handler onPress/onSwipe mới) → không phát sinh event
Mixpanel mới (`.claude/rules/analytics-tracking-required.md` không áp dụng).

## 8. Rủi ro

- **Thấp–trung bình.** Điểm rủi ro chính là reconcile-theo-key khi 3 card đổi
  vai trò trong cùng render. Giảm thiểu: chuyển hẳn sang `.map` một mảng cửa sổ
  có thứ tự ổn định (thay vì 3 block rời), test kỹ tới/lui và biên deck.
