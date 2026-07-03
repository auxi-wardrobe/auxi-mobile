# Home Swipe Image-Pop Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vuốt xong card ở Home không còn cú "nhảy" ảnh — card peek phía sau thăng chức thành active tại chỗ, không remount, không replay reveal.

**Architecture:** `OutfitSwipeDeck` hiện render 3 card thành 3 block key theo *vai trò* (`active-`/`next-`/`prev-`); khi `activeIndex` đổi, card peek đổi key ⇒ React unmount+mount lại ⇒ `OptionSheet` chạy lại animation reveal (cú pop). Fix: render cửa sổ card bằng một `.map` keyed theo *danh tính item* (`keyOf`), style tính theo vai trò trong map ⇒ React giữ nguyên instance khi card đổi vai trò ⇒ reveal thành no-op.

**Tech Stack:** React Native 0.83, React 19.2, TypeScript 5.8, `Animated` + `PanResponder` (RN core, không thêm dep), jest + `react-test-renderer`.

**Spec:** `docs/superpowers/specs/2026-07-02-home-swipe-image-pop-fix-design.md`

## Global Constraints

- Không thêm dependency mới — chỉ `Animated` + `PanResponder` sẵn có (không reanimated/gesture-handler cho deck).
- Không đổi cơ chế fetch/buffer `valenGetRecommendation`, mảng `listOutfits`, ngưỡng commit (30% width / vx 0.4), thời lượng fling 250ms.
- Không sửa `OptionSheet.tsx` / `HomeScreen/index.tsx` trừ khi verify cho thấy cần (kỳ vọng: không cần).
- `npx tsc --noEmit` sạch (lỗi legacy `_HomeScreen.tsx` được bỏ qua theo `auxi/CLAUDE.md`).
- `yarn lint` không thêm lỗi/warning mới so với baseline (4 errors + 3 warnings, đều ở `_HomeScreen.tsx`).
- Không phát sinh event Mixpanel mới (refactor motion, không thêm handler tương tác) — `analytics-tracking-required` không áp dụng.
- Commit theo conventional commits, KHÔNG kèm AI references (theo `development-rules.md`).
- Mọi phần tử tương tác giữ `testID` như cũ (`home-swipe-deck`).

---

### Task 1: Ổn định instance card khi advance (regression test + refactor)

**Files:**
- Create: `src/components/features/__tests__/OutfitSwipeDeck.reconcile.test.tsx`
- Modify: `src/components/features/OutfitSwipeDeck.tsx:197-262` (thay khối `return (...)`)

**Interfaces:**
- Consumes: props hiện có của `OutfitSwipeDeck<T>` — `items: T[]`, `activeIndex: number`, `swipeEnabled: boolean`, `keyOf: (item: T) => string`, `renderCard: (item: T, role: 'active' | 'peek') => React.ReactNode`, `onSwipeNext/onSwipeBack: (item: T) => void`, `renderCue?`, `testID?`.
- Produces: KHÔNG đổi API/props. Chỉ đổi cách render bên trong (key theo item thay vì theo vai trò). Consumer (`HomeScreen/index.tsx`) không phải sửa gì.

- [ ] **Step 1: Viết test thất bại** — chứng minh card bị remount khi advance (bug hiện tại).

Tạo file `src/components/features/__tests__/OutfitSwipeDeck.reconcile.test.tsx`:

```tsx
/**
 * Regression: advancing the deck must NOT remount the card that transitions
 * from peek → active. A remount replays the OptionSheet reveal animation —
 * that replay is the "image pop / jump" the user sees after each swipe.
 * See docs/superpowers/specs/2026-07-02-home-swipe-image-pop-fix-design.md.
 *
 * Isolated render (no HomeScreen/providers): a probe renderCard counts mounts
 * per item id via a mount-only effect. If a card is remounted on advance, its
 * id's count rises above 1.
 */
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { OutfitSwipeDeck } from '../OutfitSwipeDeck';

type Card = { id: string };

describe('OutfitSwipeDeck reconciliation', () => {
  it('does not remount a card promoted from peek to active', () => {
    const mountCounts: Record<string, number> = {};

    const Probe = ({ id }: { id: string; role: 'active' | 'peek' }) => {
      useEffect(() => {
        mountCounts[id] = (mountCounts[id] ?? 0) + 1;
      }, [id]);
      return <Text>{id}</Text>;
    };

    const items: Card[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const props = {
      items,
      swipeEnabled: true,
      keyOf: (c: Card) => c.id,
      renderCard: (c: Card, role: 'active' | 'peek') => (
        <Probe id={c.id} role={role} />
      ),
      onSwipeNext: jest.fn(),
      onSwipeBack: jest.fn(),
    };

    let renderer!: ReturnType<typeof TestRenderer.create>;
    act(() => {
      renderer = TestRenderer.create(
        <OutfitSwipeDeck {...props} activeIndex={0} />,
      );
    });

    // Cold start: 'b' mounted once as the next-peek behind active 'a'.
    expect(mountCounts.b).toBe(1);

    // Advance one card: 'b' becomes active. Must be the SAME instance.
    act(() => {
      renderer.update(<OutfitSwipeDeck {...props} activeIndex={1} />);
    });

    expect(mountCounts.b).toBe(1); // preserved — no remount, no reveal replay
    expect(mountCounts.a).toBe(1); // former active, now prev-peek — preserved
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `yarn jest src/components/features/__tests__/OutfitSwipeDeck.reconcile.test.tsx`
Expected: FAIL — `expect(mountCounts.b).toBe(1)` nhận `2` sau `update` (card `b` đổi key `next-b`→`active-b` nên bị remount; `a` cũng remount `active-a`→`prev-a`).

- [ ] **Step 3: Refactor `OutfitSwipeDeck.tsx` — key theo item**

Trong `src/components/features/OutfitSwipeDeck.tsx`, giữ nguyên toàn bộ phần trên (imports, state, `commit`, `cancel`, `responder`, các interpolation `backOpacity`/`nextOpacity`/`peekScale`/`prevPeekOpacity`/`nextPeekOpacity`, `cardStyle`, `a11yActions`, và `if (!active) return null;` ở dòng 197-199).

Thay khối `return (...)` (dòng 201-260) bằng:

```tsx
  // Windowed cards, painted back-to-front: peek(s) first, active last (on top).
  // Keyed by ITEM IDENTITY (keyOf), NEVER by role — so a card promoted from
  // peek → active is the SAME React instance. No remount means the OptionSheet
  // reveal animation never replays; that replay was the visible "jump" after a
  // swipe. See docs/superpowers/specs/2026-07-02-home-swipe-image-pop-fix-design.md.
  const windowCards: { item: T; role: Role; peek?: 'prev' | 'next' }[] = [];
  if (prevPeek) {
    windowCards.push({ item: prevPeek, role: 'peek', peek: 'prev' });
  }
  if (nextPeek) {
    windowCards.push({ item: nextPeek, role: 'peek', peek: 'next' });
  }
  windowCards.push({ item: active, role: 'active' });

  return (
    <View testID={testID} style={styles.stack}>
      {windowCards.map(({ item, role, peek }) => {
        const isActive = role === 'active';
        const peekOpacity = peek === 'prev' ? prevPeekOpacity : nextPeekOpacity;
        return (
          <Animated.View
            key={keyOf(item)}
            accessibilityActions={isActive ? a11yActions : undefined}
            onAccessibilityAction={
              isActive
                ? e => {
                    if (e.nativeEvent.actionName === 'next') {
                      onSwipeNext(active);
                    }
                    if (
                      e.nativeEvent.actionName === 'back' &&
                      activeIndex > 0
                    ) {
                      onSwipeBack(active);
                    }
                  }
                : undefined
            }
            style={[
              styles.cardBase,
              cardStyle,
              isActive
                ? [styles.activeCard, { transform: [{ translateX: pan.x }] }]
                : { opacity: peekOpacity, transform: [{ scale: peekScale }] },
            ]}
            pointerEvents={isActive ? 'auto' : 'none'}
            // Peek cards are decorative until promoted: keep their subtree out
            // of the accessibility / test tree so VoiceOver doesn't announce the
            // hidden card and duplicate testIDs (e.g. home-remix) don't clash.
            accessibilityElementsHidden={!isActive}
            importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
            {...(isActive ? responder.panHandlers : {})}
          >
            {/* Cue slot rendered in BOTH roles (null when peek) so the card
                content stays at a stable child index across promotion — the
                OptionSheet child is never remounted. */}
            {isActive && renderCue ? renderCue(backOpacity, nextOpacity) : null}
            {renderCard(item, role)}
          </Animated.View>
        );
      })}
    </View>
  );
```

Ghi chú kỹ thuật:
- Thứ tự `windowCards` (peek trước, active cuối) giữ đúng z-order cũ (active vẽ trên cùng).
- Style active flatten thành `cardBase, cardStyle, activeCard, translateX` — thứ tự khác bản cũ (`cardBase, activeCard, cardStyle, translateX`) nhưng không có key style trùng nên vô hại.
- `{...(isActive ? responder.panHandlers : {})}` — chỉ card active nhận gesture (như cũ).
- Cue slot (child index 0) luôn tồn tại (null khi peek) để `renderCard(item, role)` luôn ở child index 1 → không remount con khi promote.

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `yarn jest src/components/features/__tests__/OutfitSwipeDeck.reconcile.test.tsx`
Expected: PASS — `mountCounts.b === 1` và `mountCounts.a === 1` sau `update` (instance giữ nguyên nhờ key theo item).

- [ ] **Step 5: Chạy các suite liên quan, xác nhận không regress**

Run: `yarn jest OutfitSwipeDeck HomeScreen motion`
Expected: PASS toàn bộ (`HomeScreen.test.tsx` render deck; `motion.test.ts`; các test HomeScreen khác). Không có snapshot/testID vỡ.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: sạch, ngoài các lỗi legacy đã biết ở `src/screens/_HomeScreen.tsx` (bỏ qua theo CLAUDE.md). Không lỗi mới trong `OutfitSwipeDeck.tsx` hay file test.

- [ ] **Step 7: Lint**

Run: `yarn lint`
Expected: không thêm lỗi/warning mới so với baseline (4 errors + 3 warnings ở `_HomeScreen.tsx`). Nếu `react-hooks/exhaustive-deps` cảnh báo ở file test cho `mountCounts`, giữ dep `[id]` (mountCounts là const bao ngoài, ổn định) — không thêm disable trừ khi lint thực sự báo lỗi mới.

- [ ] **Step 8: Commit**

```bash
git add src/components/features/OutfitSwipeDeck.tsx \
        src/components/features/__tests__/OutfitSwipeDeck.reconcile.test.tsx
git commit -m "fix(home): keep swipe deck card instances stable across advance"
```

---

### Task 2: Verify trực quan + designer gate (không code)

**Files:** none (verification + handoff).

**Interfaces:**
- Consumes: bản build từ Task 1 (deck đã key theo item).
- Produces: bằng chứng vuốt mượt (screenshot/recording) + trạng thái designer review để mở PR.

- [ ] **Step 1: Verify trực quan trên web sandbox (nhanh nhất, không cần sim)**

Deploy web preview theo skill `deploy-auxi-web` (xem `auxi/docs/designer-quickstart.md`), mở URL, vào Home. Vuốt LEFT liên tục 5–6 card, rồi vuốt RIGHT (back) vài card.
Expected: ảnh card kế **không còn nhảy/fade lại** sau khi vuốt xong; entrance card đầu tiên (700ms) vẫn chạy khi mới vào Home; back-swipe ở card đầu vẫn rubber-band (không commit).

- [ ] **Step 2: (tùy chọn) Verify trên iOS sim** nếu cần cảm giác native thật

Chạy theo `.claude/rules/ios-build-workflow-required.md` — code JS nên chỉ cần Fast Refresh, KHÔNG tự ý rebuild/kill Metro (nhiều session dùng chung). Quan sát như Step 1.
**Điểm quan sát bổ sung:** nếu thấy 1-frame lóe ảnh card cũ "nhảy về giữa" ngay trước khi card mới lên (do `pan.setValue({x:0})` chạy trước khi state advance), ghi lại — đây là vấn đề khác, tách follow-up; KHÔNG kỳ vọng xuất hiện và KHÔNG nằm trong phạm vi fix này (đúng phàn nàn gốc là cú fade reveal đã được xử lý ở Task 1).

- [ ] **Step 3: Designer design-review (HARD GATE, step 6.5)**

Vì đây là thay đổi motion trên screen, định tuyến qua `designer` agent (skill `auxi-design-review`) trước khi mở PR, theo `.claude/rules/design-review-required.md`. Lưu kết quả PASS vào `auxi/docs/design-reviews/2026-07-02-home-swipe-deck.md`.
Expected: PASS (hoặc xử lý finding rồi re-run). Sau PASS mới mở PR.

## Self-Review

- **Spec coverage:** §2 nguyên nhân (remount+re-reveal) ↔ Task 1 (key theo item). §4 thiết kế (`.map` keyed theo item, style theo vai trò, cue slot ổn định) ↔ Task 1 Step 3. §6 edge cases (peek↔active, swipe-back, biên deck `prevPeek` undefined/`nextPeek` undefined, reconcile theo key) ↔ code refactor + test. §7 verify (tsc/lint/visual/designer gate) ↔ Task 1 Step 6-7 + Task 2. §3 non-goals (không đụng OptionSheet/HomeScreen/fetch) ↔ Global Constraints. Không có mục spec nào thiếu task.
- **Placeholder scan:** không có TBD/TODO; mọi step code có code đầy đủ, mọi lệnh có expected output.
- **Type consistency:** `renderCard(item, role)` với `role: 'active' | 'peek'` khớp `Role` trong `OutfitSwipeDeck.tsx`; `keyOf`/`onSwipeNext`/`onSwipeBack` khớp props hiện có; test dùng đúng chữ ký props (`swipeEnabled`, `keyOf`, `renderCard`, `onSwipeNext`, `onSwipeBack`, `activeIndex`).
