import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DividerRow } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { EditableField, getOptionDisplayLabel } from '../../utils/wardrobeItemMappers';
import { itemDetailStyles as styles } from './itemDetailStyles';

interface ItemDetailRowProps {
  label: string;
  /** Canonical draft value — drives logic/persistence; localized for display. */
  value: string;
  field: EditableField;
  canEdit: boolean;
  /** Swatch hex for the color row (null for every other field). */
  colorHex?: string | null;
  hideDivider?: boolean;
  onPress: (field: EditableField) => void;
}

/**
 * Editable attribute row (label + value + optional color swatch + edit glyph).
 * Extracted verbatim from ItemDetailScreen's `renderDetailRow` — same
 * TouchableOpacity + DividerRow primitives and styles (GH-364 de-bloat).
 */
export const ItemDetailRow: React.FC<ItemDetailRowProps> = ({
  label,
  value,
  field,
  canEdit,
  colorHex = null,
  hideDivider,
  onPress,
}) => {
  const { t } = useTranslation();
  const showColor = field === 'color';
  // Display-only: `value` stays the canonical draft for logic/persistence.
  const displayValue = getOptionDisplayLabel(t, field, value);

  return (
    <TouchableOpacity
      testID={`item-detail-row-${field}`}
      activeOpacity={0.85}
      disabled={!canEdit}
      onPress={() => onPress(field)}
    >
      <DividerRow
        label={label}
        hideDivider={hideDivider}
        labelStyle={styles.rowLabel}
        rightNode={
          <View style={styles.rowRight}>
            {showColor && colorHex ? (
              <View style={[styles.colorDot, { backgroundColor: colorHex }]} />
            ) : null}
            <Text style={styles.rowValue}>{displayValue}</Text>
            {canEdit ? (
              <Icons.Edit
                width={18}
                height={18}
                color={theme.colors.figmaTextDark}
              />
            ) : null}
          </View>
        }
      />
    </TouchableOpacity>
  );
};
