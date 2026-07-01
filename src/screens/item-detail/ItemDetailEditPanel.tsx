import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  DividerRow,
  PillButton,
} from '../../components/primitives/FigmaPrimitives';
import { WardrobeItem } from '../../services/wardrobeService';
import {
  EditableField,
  normalizeColorHex,
} from '../../utils/wardrobeItemMappers';
import { ItemDetailRow } from './ItemDetailRow';
import { itemDetailStyles as styles } from './itemDetailStyles';

interface ItemDetailEditPanelProps {
  item: WardrobeItem;
  draftCategory: string;
  draftStyle: string;
  draftColor: string;
  draftFit: string;
  /** `isEditing && !isCatalogItem` — rows are tappable only when true. */
  canEditRows: boolean;
  saving: boolean;
  onPickField: (field: EditableField) => void;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * EDIT MODE (Figma 3508:8356): editable attribute list + bottom [Cancel]
 * [Save]. Name stays read-only (free-text edit needs a text-input picker; the
 * option picker only supports enumerations — tracked in extraction note §New
 * backend fields). Extracted verbatim from ItemDetailScreen (GH-364 de-bloat).
 */
export const ItemDetailEditPanel: React.FC<ItemDetailEditPanelProps> = ({
  item,
  draftCategory,
  draftStyle,
  draftColor,
  draftFit,
  canEditRows,
  saving,
  onPickField,
  onCancel,
  onSave,
}) => {
  const { t } = useTranslation();
  const colorHex = normalizeColorHex(item, draftColor);

  return (
    <>
      <View style={styles.details}>
        {item.name ? (
          <DividerRow
            label={t('wardrobe.itemDetail.row_name')}
            value={item.name}
            labelStyle={styles.rowLabel}
            valueStyle={styles.rowValue}
          />
        ) : null}
        <ItemDetailRow
          label={t('wardrobe.itemDetail.row_type')}
          value={draftCategory}
          field="category"
          canEdit={canEditRows}
          onPress={onPickField}
        />
        <ItemDetailRow
          label={t('wardrobe.itemDetail.row_style')}
          value={draftStyle}
          field="style"
          canEdit={canEditRows}
          onPress={onPickField}
        />
        <ItemDetailRow
          label={t('wardrobe.itemDetail.row_color')}
          value={draftColor}
          field="color"
          canEdit={canEditRows}
          colorHex={colorHex}
          onPress={onPickField}
        />
        <ItemDetailRow
          label={t('wardrobe.itemDetail.row_fit')}
          value={draftFit}
          field="fit"
          canEdit={canEditRows}
          hideDivider
          onPress={onPickField}
        />
      </View>

      <View style={styles.actionBlock}>
        <View style={styles.editActionRow}>
          <PillButton
            testID="item-detail-cancel-btn"
            variant="text"
            title={t('wardrobe.itemDetail.cancel')}
            onPress={onCancel}
            disabled={saving}
            style={styles.editCancelButton}
          />
          <PillButton
            testID="item-detail-save-btn"
            variant="filled"
            title={t('wardrobe.itemDetail.save')}
            onPress={onSave}
            loading={saving}
            disabled={saving}
            style={styles.editSaveButton}
          />
        </View>
      </View>
    </>
  );
};
