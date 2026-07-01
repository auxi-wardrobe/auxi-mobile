import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BodyItem } from '../../services/bodyService';
import { theme } from '../../theme/theme';
import { BodyPhotoGrid } from './BodyPhotoGrid';

interface BodyManageViewProps {
  loading: boolean;
  items: BodyItem[];
  selectedBodyId: string | null;
  isTryOnMode: boolean;
  onSelectBody: (item: BodyItem) => void;
  onPreviewImage: (imageUri: string) => void;
  onDeleteItem: (id: string) => void;
}

// Manage ScrollView content: intro hero, body-photo grid, and the helper caption.
export const BodyManageView: React.FC<BodyManageViewProps> = ({
  loading,
  items,
  selectedBodyId,
  isTryOnMode,
  onSelectBody,
  onPreviewImage,
  onDeleteItem,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.manageHero}>
        <Text style={styles.manageHeroTitle}>{t('body.section_title')}</Text>
        <Text style={styles.manageHeroText}>{t('body.section_body')}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t('body.your_photos')}</Text>
      <BodyPhotoGrid
        loading={loading}
        items={items}
        selectedBodyId={selectedBodyId}
        isTryOnMode={isTryOnMode}
        onSelectBody={onSelectBody}
        onPreviewImage={onPreviewImage}
        onDeleteItem={onDeleteItem}
      />

      {items.length > 0 ? (
        <Text style={styles.helperText}>{t('body.helper_tap_default')}</Text>
      ) : (
        <Text style={styles.helperText}>{t('body.empty_photos')}</Text>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  manageHero: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    gap: 8,
  },
  manageHeroTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  manageHeroText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  sectionTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  helperText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
  },
});
