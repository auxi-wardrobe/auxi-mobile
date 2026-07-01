import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import {
  EditableField,
  FIELD_CONFIG,
  findColorHex,
  getOptionDisplayLabel,
} from '../../utils/wardrobeItemMappers';

interface OptionPickerSheetProps {
  /** Active editable field — the sheet is visible while this is non-null. */
  field: EditableField | null;
  /** Current draft value for the active field (drives the selected check). */
  selectedValue: string;
  onSelect: (option: string) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet option picker for the Item Detail edit flow. Extracted verbatim
 * from ItemDetailScreen (raw `<Modal>` + styles unchanged) as part of the
 * GH-364 de-bloat — a DS-primitive migration (→ MBottomSheet/MSheetOption) is
 * flagged separately and intentionally NOT done here to avoid visual drift.
 */
export const OptionPickerSheet: React.FC<OptionPickerSheetProps> = ({
  field,
  selectedValue,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const options = field ? FIELD_CONFIG[field].options : [];

  return (
    <Modal
      visible={!!field}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('wardrobe.itemDetail.picker_title', {
                field: field ? t(FIELD_CONFIG[field].labelKey) : '',
              })}
            </Text>
            <TouchableOpacity
              testID="item-detail-picker-close-btn"
              onPress={onClose}
            >
              <Text style={styles.modalClose}>
                {t('wardrobe.itemDetail.picker_close')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {options.map(option => {
              const isSelected = selectedValue === option;

              return (
                <TouchableOpacity
                  key={option}
                  testID={`item-detail-option-${option}`}
                  style={styles.optionItem}
                  onPress={() => onSelect(option)}
                >
                  <View style={styles.optionLeft}>
                    {field === 'color' ? (
                      <View
                        style={[
                          styles.optionColorDot,
                          { backgroundColor: findColorHex(option) },
                        ]}
                      />
                    ) : null}
                    <Text style={styles.optionText}>
                      {field ? getOptionDisplayLabel(t, field, option) : option}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Icons.ChevronRight
                      width={18}
                      height={18}
                      color={theme.colors.figmaAction}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaItemDetailModalDivider,
  },
  modalTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaItemDetailRowText,
  },
  modalClose: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.figmaItemDetailModalClose,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaItemDetailOptionDivider,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionColorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: theme.colors.figmaItemDetailOptionDotBorder,
  },
  optionText: {
    ...theme.typography.aliases.interBodyMd,
    color: theme.colors.figmaItemDetailRowText,
  },
});
