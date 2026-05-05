# Mobile MCP Trên MacBook Cho `auxi` iOS Simulator

Quickstart (thiết lập nhanh) này dành cho `Codex` chạy `auxi` trên MacBook với iOS Simulator. Mục tiêu là setup theo hướng deterministic (xác định rõ), ít magic (ẩn logic), và bám tài liệu chính thức của `mobile-mcp`.

Nguồn chính thức:
- `mobile-mcp` README: <https://github.com/mobile-next/mobile-mcp>
- iOS Simulator wiki: <https://github.com/mobile-next/mobile-mcp/wiki/Getting-Started-with-iOS-Simulators>

## 1. When to use this

Dùng guide này khi:

- Bạn chạy `auxi` trên macOS và muốn điều khiển iOS Simulator bằng `Codex` qua `mobile-mcp`.
- Bạn cần UI check (kiểm tra giao diện), smoke test (kiểm tra nhanh), hoặc đi lại flow onboarding / Wardrobe / Home mà không phải thao tác tay.

Guide này chỉ cover:

- MacBook + macOS
- `Codex`
- iOS Simulator
- app `auxi`

Guide này không cover:

- Android Emulator
- iPhone thật (physical device)
- Claude/Cursor setup

## 2. Prerequisites

Bạn cần đủ các phần sau trước khi kỳ vọng MCP điều khiển được app:

- macOS có Xcode cài sẵn.
- Xcode Command Line Tools:

```bash
xcode-select --install
```

- Node.js `22+`.
  Lý do: README chính thức của `mobile-mcp` khuyến nghị `v22+`, dù `package.json` của package hiện để `>=18`. Để setup ổn định hơn, cứ dùng Node `22`.
- Repo `auxi` đã cài dependency (phụ thuộc):

```bash
npm install
bundle install
cd ios
bundle exec pod install
cd ..
```

- App `auxi` có thể build vào iOS Simulator theo flow chuẩn của repo:

```bash
npm start
npm run ios
```

Lưu ý:

- `auxi` hiện yêu cầu local backend (backend cục bộ) trên cổng `5001` cho nhiều màn hình dữ liệu thực.
- Nếu bạn chỉ muốn kiểm tra launch (mở app), onboarding, hoặc login shell (khung đăng nhập), backend không nhất thiết phải sẵn ngay từ phút đầu.

## 3. Install MCP server

Với `Codex`, dùng đúng lệnh này:

```bash
codex mcp add mobile-mcp npx "@mobilenext/mobile-mcp@latest"
```

Không dùng nhầm lệnh của `Claude Code`:

```bash
claude mcp add mobile-mcp -- npx -y @mobilenext/mobile-mcp@latest
```

Sau khi add server:

- khởi động lại app `Codex` nếu MCP chưa hiện ngay
- kiểm tra cấu hình tại `~/.codex/config.toml` nếu cần

Mấu chốt: add MCP server chưa đủ để điều khiển iOS Simulator. Với iOS, bạn còn cần `WebDriverAgent` làm bridge (cầu nối).

## 4. Boot simulator + prepare bridge

Bước 1: liệt kê simulator:

```bash
xcrun simctl list
```

Bước 2: boot simulator bạn muốn dùng:

```bash
xcrun simctl boot "iPhone 16"
open -a Simulator
```

Bước 3: chạy `WebDriverAgentRunner` trên simulator đã boot.

Theo wiki chính thức của `mobile-mcp`, cần chạy `WebDriverAgent` như một XCUITest:

```bash
git clone --depth 1 https://github.com/appium/WebDriverAgent.git
cd WebDriverAgent
xcodebuild -project WebDriverAgent.xcodeproj -scheme WebDriverAgentRunner -destination 'platform=iOS Simulator,name=iPhone 16' test
```

Ghi chú quan trọng:

- Thay `iPhone 16` bằng đúng tên simulator bạn vừa boot.
- Nếu đã có `WebDriverAgent` chạy từ trước, đóng nó trước khi chạy lại.
- Theo wiki hiện tại, nếu MCP nhìn thấy nhiều simulator, nó chỉ dùng simulator đầu tiên trong danh sách.

## 5. Verify setup

Sau khi xong phần trên, xác nhận setup theo thứ tự này:

1. Simulator đang mở và đã boot.
2. `WebDriverAgentRunner` đang chạy, không bị fail trong `xcodebuild`.
3. `auxi` đã được cài vào simulator bằng `npm run ios`.
4. `Codex` đã có MCP server `mobile-mcp`.

Cách verify (xác nhận) nhanh:

- Trong `Codex`, prompt agent: `list simulators`
- Hoặc prompt rõ hơn: `List available mobile devices and tell me which iOS Simulator is active.`

Kết quả mong đợi:

- agent nhìn thấy ít nhất một iOS Simulator
- simulator đang active (đang hoạt động) đúng máy bạn vừa boot

Nếu `mobile-mcp` đã thấy simulator nhưng chưa thấy app:

- chạy lại `npm run ios`
- hoặc yêu cầu agent liệt kê app đã cài rồi launch app `auxi` theo bundle/app name mà nó tìm được

## 6. Useful prompts for `auxi`

Các prompt dưới đây bám flow thật của repo này, không phải ví dụ demo chung:

```text
On the active iOS simulator, list installed apps, launch auxi, and tell me whether I land on Login, Welcome, or Home.
```

```text
On the active iOS simulator, open auxi and verify the Welcome screen shows the text "Welcome to auxi" and a "Get started" button.
```

```text
In auxi on the active iOS simulator, go through onboarding until the location permission screen and confirm that both "Enable location" and "Not now" are visible.
```

```text
In auxi on the active iOS simulator, open the sidebar and verify that Wardrobe, My body, My account, and Log out are visible menu items.
```

```text
In auxi on the active iOS simulator, navigate to Wardrobe and tell me whether the filter tabs All, Tops, Bottoms, Shoes, One-piece, and AC are visible.
```

Mẹo viết prompt:

- nói rõ `active iOS simulator` để tránh agent chọn nhầm device
- yêu cầu `verify` trước khi `tap` nếu bạn muốn flow an toàn hơn
- với màn hình phụ thuộc backend, nên yêu cầu agent báo rõ `loading`, `error toast`, hoặc `empty state`

## Common failure modes

- Boot simulator xong nhưng chưa chạy `WebDriverAgent`.
  Đây là lỗi hay gặp nhất; iOS Simulator mở được không có nghĩa là MCP điều khiển được.
- Dùng nhầm lệnh CLI của `Claude` thay vì `Codex`.
  Với repo này, command đúng cho `Codex` là `codex mcp add mobile-mcp npx "@mobilenext/mobile-mcp@latest"`.
- Thiếu Xcode Command Line Tools.
  Dấu hiệu thường là `xcrun` hoặc `xcodebuild` lỗi ngay từ đầu.
- Lệch Node version.
  README chính thức của `mobile-mcp` khuyên Node `22+`, còn package metadata hiện cho `>=18`; nếu muốn setup ít rủi ro hơn thì cứ khóa ở Node `22`.
