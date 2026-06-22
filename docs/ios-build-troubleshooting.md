# iOS Simulator Build — Troubleshooting & Standard Procedure

> Vì sao auxi hay lỗi build trên simulator, và quy trình chuẩn để nó hết "ngẫu nhiên".
> Stack: **RN 0.83.1 · React 19.2 · Xcode 26.5 · Node 20** (pinned qua `.nvmrc`).
> Chẩn đoán môi trường: 2026-06-22.

## TL;DR — leo thang khi "đổi code mà simulator không cập nhật"

Đi từ rẻ → đắt, dừng ở bước nào thấy được là xong:

1. **Reload JS** — trong terminal Metro bấm `r`; hoặc trong sim `Cmd+R` / shake (`Cmd+Ctrl+Z`) → **Reload**.
2. **Reset bundle cache** — `yarn start:reset` (= `react-native start --reset-cache`) rồi reload lại.
3. **Clean rebuild (chuẩn)** — `yarn ios:clean` → chạy `scripts/ios-clean-rebuild.sh`: pin Node, kill Metro thừa, reset watchman/cache, `pod install`, build + launch.
4. **Soi môi trường** — `yarn ios:doctor` (read-only) khi nghi ngờ Node/Xcode/watchman/pods.

90% lỗi "feature mới không hiện" là **bundle cũ** → bước 1–2 xử lý xong, **không cần rebuild native**.

## 5 nguyên nhân gốc (đã chẩn đoán)

| # | Nguyên nhân | Triệu chứng | Khắc phục |
|---|---|---|---|
| 1 | **Node thả nổi** — không `.nvmrc`, nvm default trôi (16 → 23) | yarn lỗi lạ, Metro/codegen chập chờn, "máy này chạy máy kia không" | `.nvmrc=20` đã ghim; mọi shell `nvm use`. RN 0.83 cần Node ≥20 LTS (18/20/22), **tránh non-LTS như 23** |
| 2 | **watchman chưa cài** | Fast Refresh trượt, sim giữ **bundle cũ** dù đã sửa code | `brew install watchman` (1 lần). Script tự `watchman watch-del-all` |
| 3 | **Nhiều dev server song song** — Metro + nhiều vite | "đang nhìn bundle nào?", nhìn nhầm tab web `:4173` tưởng là app | Giữ **1 Metro** (port 8081); build & run **cùng một worktree**. Script kill Metro thừa |
| 4 | **Pods drift** — đổi branch thêm native dep mà không `pod install` | link error / module not found khi build native | `yarn pods` sau mỗi lần switch branch có đụng native |
| 5 | **Toolchain bleeding-edge** — Xcode 26.5 + RN 0.83.1 | (lịch sử) redbox `AsyncStorage null`, pod static libs không link | **Hiện đã ổn**: `ios/Podfile` có patch fmt consteval cho Xcode 26 → static build launch được. Nếu redbox quay lại: thử `USE_FRAMEWORKS=dynamic pod install`, hoặc pin Xcode 16.x → escalate **tech-lead/devops** |

## One-time setup (làm 1 lần / máy mới)

```bash
brew install watchman          # bắt buộc — hết stale bundle
nvm install 20 && nvm use      # đọc .nvmrc của auxi
cd auxi && yarn install
yarn pods                      # cd ios && pod install
```

## Scripts đã chuẩn hoá (package.json)

| Lệnh | Việc |
|---|---|
| `yarn start:reset` | Metro với `--reset-cache` (xoá bundle cache) |
| `yarn pods` | `cd ios && pod install` (sau khi đổi branch / thêm native dep) |
| `yarn ios:doctor` | Preflight read-only: Node / Xcode / pods / watchman / Metro |
| `yarn ios:clean` | Clean rebuild deterministic + launch sim |
| `yarn ios:sim` | Build + mở simulator (đường nhanh khi môi trường đã sạch) |

## Chạy NHIỀU Claude Code session cùng lúc (qa-ui / đổi code / build)

Metro `:8081`, Simulator, và watchman là **singleton toàn máy** — KHÔNG phải mỗi session một bản. Nên một thao tác GLOBAL ở session này phá ngang **mọi** session khác:

| Tầng | Việc | Ảnh hưởng |
|---|---|---|
| ✅ An toàn | Sửa JS/TS → **Fast Refresh** tự áp vào app đang chạy; `yarn ios:doctor`; reload sim | Chỉ bạn — không đụng ai |
| 🟡 Dùng dè | `yarn start:reset` | Reset Metro chung → ảnh hưởng JS mọi session |
| 🔴 Destructive | `yarn ios:clean`, kill Metro, watchman reset, `pod install`, native rebuild | **Gián đoạn TẤT CẢ session** (qa-ui đang chụp, app đang chạy) |

**Quy tắc:** đổi code thì để **hot-reload**, đừng rebuild. `ios-clean-rebuild.sh` đã có **concurrency guard** — từ chối chạy non-interactive (agent ở session khác) trừ khi có `--yes`, và hỏi y/N khi chạy tay. Chỉ chạy tầng 🔴 khi chắc chắn không có session nào đang qa/chạy.

## Quy tắc vàng

- **Đừng tìm version mới nhất** — ghim đúng version RN 0.83 hỗ trợ. Bleeding-edge (Xcode 26 + Node 23) **không pin** = lỗi đến ngẫu nhiên.
- **Một Metro, một worktree** cho mỗi phiên build.
- Web preview (`:4173`, vite) **≠** iOS app — đừng lẫn.
- Đổi branch có native dep → `yarn pods` trước khi build.
