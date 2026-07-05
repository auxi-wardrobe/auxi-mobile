import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { M_PILL_ICON_MD_HEIGHT } from '../design-system/lib';
import { FeedbackSheet } from './FeedbackSheet';
import IconFeedback from '../../assets/images/feedback.svg';
import { theme } from '../../theme/theme';

// Floating feedback affordance shared by Home and Wardrobe so the bottom bar
// reads identically on both sides of the footer nav toggle — the screens swap
// with `animation: 'none'` (see AppNavigator), so any per-screen difference in
// this cluster would visibly pop during the switch.
//
// 44px button pinned bottom-left, vertically centred against the footer nav
// pill: the pill sits `paddingBottom: spacing.l` inside the reserved footer
// bar (see HomeWardrobeNavFooter), so the FAB centre lands at spacing.l +
// pill/2. Owns its FeedbackSheet, so hosts only place the button.

const FAB_SIZE = 44;
// Home's SHEET_PADDING and Wardrobe's grid HORIZONTAL_PADDING are both 12 —
// a single inset keeps the FAB in the same spot on both screens.
const LEFT_INSET = 12;

type Props = {
  /** Per-host selector, e.g. `home-feedback-fab` / `wardrobe-feedback-fab`. */
  testID: string;
};

export const FeedbackFab: React.FC<Props> = ({ testID }) => {
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={t('feedback.title')}
        activeOpacity={0.85}
        onPress={() => setSheetVisible(true)}
        style={styles.fab}
      >
        <IconFeedback width={24} height={24} color={theme.colors.uacTextBase} />
      </TouchableOpacity>
      <FeedbackSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: LEFT_INSET,
    bottom: theme.spacing.l + (M_PILL_ICON_MD_HEIGHT - FAB_SIZE) / 2,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: theme.borderRadius.l,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaSurface,
    zIndex: theme.zIndex.sticky,
    ...theme.ds.shadow.floatingButton,
  },
});
