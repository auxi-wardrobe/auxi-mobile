# Figma Screen Map (Master Page Remap)

Last updated: 2026-03-01
File key: `0nXXMAR4Arf1ZfjtQvtBh0`
Source page: [`470:1121`](https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=470-1121)

This map is remade from the new master design page. The file now contains multiple new variants and onboarding states, so this document no longer forces a single locked node for every existing route when the design is ambiguous.

## Root Structure

| Layer              | Node ID     | Exact Node URL                                                             | Notes                                                               |
| ------------------ | ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Master design page | `470:1121`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=470-1121  | Canvas page only. Use child frames for implementation.              |
| Onboarding section | `470:1122`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=470-1122  | Contains the new onboarding flow and selection variants.            |
| Home section       | `909:7328`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7328  | Contains Home states, item detail, and new modal states.            |
| Setting section    | `1032:1208` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=1032-1208 | Contains a new settings flow, dialogs, and body-photo detail state. |

## Route Screen Baselines

These are the safest current mappings for the app routes. Where the new page does not expose a clear replacement, the previous node remains as a fallback until a new exact frame is confirmed.

| App Route           | Mapping Status           | Baseline Node ID | Exact Node URL                                                             | Baseline Screenshot               | Target File                                | Notes                                                                                                                                                  |
| ------------------- | ------------------------ | ---------------- | -------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Welcome             | `Locked (new page)`      | `909:7122`       | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7122  | Captured via Figma MCP screenshot | `src/screens/WelcomeScreen.tsx`            | Primary onboarding entry with “Welcome to auxi”.                                                                                                       |
| Location Permission | `Legacy fallback`        | `392:2139`       | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=392-2139  | Captured via Figma MCP screenshot | `src/screens/LocationPermissionScreen.tsx` | No direct replacement found under the new `470:1121` page sections reviewed so far.                                                                    |
| Gender Preference   | `Unresolved in new page` | `392:1959`       | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=392-1959  | Captured via Figma MCP screenshot | `src/screens/GenderPreferenceScreen.tsx`   | The new onboarding page introduces fit/style selection states, but no explicit gender screen copy was found. Keep legacy node until flow is confirmed. |
| Style Preference    | `Needs flow decision`    | `909:7154`       | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7154  | Captured via Figma MCP screenshot | `src/screens/StylePreferenceScreen.tsx`    | Best current starting node for the new selection flow: “Start with what you usually wear”. Follow-up variants are listed below.                        |
| Home                | `Locked (new page)`      | `909:10867`      | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-10867 | Captured via Figma MCP screenshot | `src/screens/HomeScreen.tsx`               | Current implemented Home baseline: “Welcome Home - more options”.                                                                                      |
| Wardrobe            | `Legacy fallback`        | `909:6725`       | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-6725  | Captured via Figma MCP screenshot | `src/screens/WardrobeScreen.tsx`           | No replacement frame found in the new `470:1121` page sections reviewed so far.                                                                        |
| Body                | `Legacy fallback`        | `392:2370`       | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=392-2370  | Captured via Figma MCP screenshot | `src/screens/BodyScreen.tsx`               | No direct replacement frame found in the new master page sections reviewed so far.                                                                     |
| Item Detail         | `Locked (new page)`      | `909:13724`      | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-13724 | Captured via Figma MCP screenshot | `src/screens/ItemDetailScreen.tsx`         | New detail item frame inside the Home section.                                                                                                         |

## New Onboarding Frames

These frames are present in the new onboarding section and should drive the next onboarding cleanup. Some map directly to current routes; others are new states that may require route or state consolidation.

| Design State           | Node ID    | Exact Node URL                                                            | Suggested Target                        | Notes                                                                                      |
| ---------------------- | ---------- | ------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Welcome intro          | `909:7122` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7122 | `src/screens/WelcomeScreen.tsx`         | “Welcome to auxi” + single CTA.                                                            |
| Outfit approval        | `909:7130` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7130 | New onboarding state                    | “Does this work for you?” outfit confirmation screen. Not mapped to a dedicated route yet. |
| Preference seed        | `909:7154` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7154 | `src/screens/StylePreferenceScreen.tsx` | “Start with what you usually wear”. Best base node for the new preference picker.          |
| Fit selection (men)    | `909:7193` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7193 | `src/screens/StylePreferenceScreen.tsx` | Menswear variant: “Which fit feels right?”.                                                |
| Fit selection (women)  | `909:7210` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7210 | `src/screens/StylePreferenceScreen.tsx` | Womenswear variant.                                                                        |
| Fit selection (unisex) | `909:7227` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7227 | `src/screens/StylePreferenceScreen.tsx` | Unisex variant.                                                                            |
| Confirmation state     | `909:7244` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7244 | New onboarding state                    | “Got it.” confirmation screen after preference selection.                                  |

## Home Section Variants

These are additional Home states now present in the file. They should be treated as variants of the same route unless the product flow is explicitly split.

| Home Variant            | Node ID     | Exact Node URL                                                             | Suggested Target                   | Notes                                                    |
| ----------------------- | ----------- | -------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Base Home               | `909:9811`  | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-9811  | `src/screens/HomeScreen.tsx`       | Standard Home layout with bottom button group.           |
| Loved item state        | `909:10788` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-10788 | `src/screens/HomeScreen.tsx`       | Home variant with love state and snackbar.               |
| More options            | `909:10867` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-10867 | `src/screens/HomeScreen.tsx`       | Current route baseline; stacked option sheets.           |
| Menu open               | `909:11161` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-11161 | `src/screens/HomeScreen.tsx`       | Sidebar/menu-open state.                                 |
| Chip + input + keyboard | `909:13315` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-13315 | `src/screens/HomeScreen.tsx`       | Expanded Home state with chip tray, input, and keyboard. |
| Detail item             | `909:13724` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-13724 | `src/screens/ItemDetailScreen.tsx` | Detail screen that now lives under the Home section.     |

## New Modal / Component States

These nodes are not standalone app routes, but they are part of the current design surface and should be reused when implementing overlays or interaction states.

| State                     | Node ID    | Exact Node URL                                                            | Suggested Target          | Notes                                                               |
| ------------------------- | ---------- | ------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------- |
| Chip-enabled action strip | `909:7589` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=909-7589 | Home shared component     | Component-level state for enabled chips and CTA, not a full screen. |
| Select photo modal        | `1032:909` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=1032-909 | Home or Body flow overlay | Home-state variant with modal dialog for photo selection.           |

## Setting Section

The new `1032:1208` section is a real product area, but the app currently has no dedicated `SettingsScreen` route in `src/screens`. It should be treated as a new route cluster to add later, not mapped onto an unrelated existing screen.

| Design State                   | Node ID     | Exact Node URL                                                             | Suggested Target                   | Notes                                                                                         |
| ------------------------------ | ----------- | -------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Settings base                  | `1032:1531` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=1032-1531 | New `SettingsScreen` route         | Main settings page with reminder toggle/time, direction, body photo, and delete entry points. |
| Change direction dialog state  | `1039:1578` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=1039-1578 | `SettingsScreen` modal state       | Settings page with an open selection dialog for direction/style mode.                         |
| Change direction + time picker | `1064:3206` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=1064-3206 | `SettingsScreen` modal state       | Variant showing a time picker-style dialog and option list.                                   |
| Delete data confirmation       | `1039:1736` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=1039-1736 | `SettingsScreen` destructive state | Settings page with delete-data confirmation dialog.                                           |
| Body photo detail              | `1039:1890` | https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=1039-1890 | Body/Settings shared detail        | Detail-style screen for stored body photo with privacy copy and remove/change actions.        |

## Deterministic Mapping Rules

1. Match by exact screen copy and layout role first.
2. If the new page contains multiple variants of the same route, keep one baseline node and list the others as route variants instead of forcing a new route.
3. If the new master page does not expose a direct replacement, keep the previous node as a legacy fallback and mark it explicitly.
4. If two new nodes could both replace the same app route, do not lock the route until the product flow is confirmed.
5. Use child frames, not page-level nodes like `470:1121`, for implementation work.
6. If a new section represents a valid product area with no existing route, list it as a new route cluster instead of forcing it into an existing screen map.
