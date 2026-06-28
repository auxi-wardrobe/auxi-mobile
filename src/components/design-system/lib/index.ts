/**
 * Auxi Design System — primitive library barrel.
 *
 * THE CONTRACT: import a primitive, render it, nothing else.
 *
 *   import { MButton, MSwitch, MChip } from '../components/design-system/lib';
 *   <MButton variant="primary" onPress={save}>Save</MButton>
 *
 * Each primitive is fully self-contained — it pulls m-tokens, MMotion helpers,
 * states, and a11y INTERNALLY. Consumers never import tokens, motion, or styles.
 * Every interactive primitive takes pass-through `testID` + `accessibilityLabel`.
 *
 * Internal-only modules (NOT re-exported): m-tokens, MMotion, useSlidingIndicator,
 * useOverlayProgress — these are lib implementation details.
 */

// Actions
export {
  MButton,
  MIconButton,
  type MButtonProps,
  type MButtonVariant,
  type MButtonSize,
  type MIconButtonProps,
} from './MButton';

// Selection
export { MSwitch, type MSwitchProps } from './MSwitch';
export {
  MCheckbox,
  MRadio,
  type MCheckboxProps,
  type MRadioProps,
} from './MCheckbox';
export {
  MCheckMenu,
  MRadioMenu,
  type MMenuOption,
  type MCheckMenuProps,
  type MRadioMenuProps,
} from './MMenu';

// Inputs
export { MInput, type MInputProps } from './MInput';

// Tagging
export {
  MChip,
  MBadge,
  MTag,
  MStatus,
  type MChipProps,
  type MBadgeProps,
  type MBadgeTone,
  type MTagProps,
  type MStatusProps,
  type MStatusTone,
} from './MChip';

// Structure
export { MDivider, type MDividerProps } from './MDivider';
export { MListRow, type MListRowProps } from './MListRow';
export {
  MSegmented,
  MTabs,
  type MSegmentedProps,
  type MTabsProps,
} from './MSegmented';
export { MAvatar, type MAvatarProps } from './MAvatar';
export { MCard, MTile, type MCardProps } from './MCard';

// Overlays (controlled `visible` + callbacks)
export { MDialog, type MDialogProps } from './MDialog';
export {
  MBottomSheet,
  MSheetOption,
  MActionSheet,
  type MBottomSheetProps,
  type MSheetOptionProps,
  type MActionSheetProps,
  type MActionSheetAction,
} from './MBottomSheet';
export {
  MSnackbar,
  MToast,
  type MSnackbarProps,
  type MToastProps,
} from './MSnackbar';

// Imperative toast (drop-in for react-native-toast-message): fire from anywhere
// via `toast.*`, render once via `<MToastHost />`.
export { MToastHost } from './MToastHost';
export {
  toast,
  type ToastOptions,
  type ToastTone,
} from './m-toast-service';

// Navigation
export { MTopAppBar, type MTopAppBarProps } from './MTopAppBar';
export { MTabBar, type MTabBarItem, type MTabBarProps } from './MTabBar';
export { MFloatingPill, type MFloatingPillProps } from './MFloatingPill';

// Pickers
export {
  MCalendar,
  MTimePicker,
  type MCalendarProps,
  type MTimePickerProps,
} from './MCalendar';
