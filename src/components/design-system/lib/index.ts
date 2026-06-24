/**
 * Auxi Design System — primitive library barrel.
 *
 * THE CONTRACT: import a primitive, render it, nothing else.
 *
 *   import { DsButton, DsSwitch, DsChip } from '../components/design-system/lib';
 *   <DsButton variant="primary" onPress={save}>Save</DsButton>
 *
 * Each primitive is fully self-contained — it pulls ds-tokens, DsMotion helpers,
 * states, and a11y INTERNALLY. Consumers never import tokens, motion, or styles.
 * Every interactive primitive takes pass-through `testID` + `accessibilityLabel`.
 *
 * Internal-only modules (NOT re-exported): ds-tokens, DsMotion, useSlidingIndicator,
 * useOverlayProgress — these are lib implementation details.
 */

// Actions
export {
  DsButton,
  DsIconButton,
  type DsButtonProps,
  type DsButtonVariant,
  type DsButtonSize,
  type DsIconButtonProps,
} from './DsButton';

// Selection
export { DsSwitch, type DsSwitchProps } from './DsSwitch';
export {
  DsCheckbox,
  DsRadio,
  type DsCheckboxProps,
  type DsRadioProps,
} from './DsCheckbox';
export {
  DsCheckMenu,
  DsRadioMenu,
  type DsMenuOption,
  type DsCheckMenuProps,
  type DsRadioMenuProps,
} from './DsMenu';

// Inputs
export { DsInput, type DsInputProps } from './DsInput';

// Tagging
export {
  DsChip,
  DsBadge,
  DsTag,
  DsStatus,
  type DsChipProps,
  type DsBadgeProps,
  type DsBadgeTone,
  type DsTagProps,
  type DsStatusProps,
  type DsStatusTone,
} from './DsChip';

// Structure
export { DsDivider, type DsDividerProps } from './DsDivider';
export { DsListRow, type DsListRowProps } from './DsListRow';
export {
  DsSegmented,
  DsTabs,
  type DsSegmentedProps,
  type DsTabsProps,
} from './DsSegmented';
export { DsAvatar, type DsAvatarProps } from './DsAvatar';
export { DsCard, DsTile, type DsCardProps } from './DsCard';

// Overlays (controlled `visible` + callbacks)
export { DsDialog, type DsDialogProps } from './DsDialog';
export {
  DsBottomSheet,
  DsSheetOption,
  DsActionSheet,
  type DsBottomSheetProps,
  type DsSheetOptionProps,
  type DsActionSheetProps,
  type DsActionSheetAction,
} from './DsBottomSheet';
export {
  DsSnackbar,
  DsToast,
  type DsSnackbarProps,
  type DsToastProps,
} from './DsSnackbar';

// Navigation
export { DsTopAppBar, type DsTopAppBarProps } from './DsTopAppBar';
export { DsTabBar, type DsTabBarItem, type DsTabBarProps } from './DsTabBar';
export { DsFloatingPill, type DsFloatingPillProps } from './DsFloatingPill';

// Pickers
export {
  DsCalendar,
  DsTimePicker,
  type DsCalendarProps,
  type DsTimePickerProps,
} from './DsCalendar';
