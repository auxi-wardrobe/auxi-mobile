import React from 'react';
import { Image, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Item } from '../../../types/item';
import { resolveItemImage } from '../../../utils/url';
import { styles } from '../styles';

export const GarmentPreview = ({ item }: { item: Item }) => {
  const { t } = useTranslation();
  const imageUrl = resolveItemImage(item);

  return (
    <>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.cardFallback} />
      )}
      <View style={styles.cardTag} pointerEvents="none">
        <View style={styles.cardTagPill}>
          <Text style={styles.cardTagText}>{t('common.badge_common')}</Text>
        </View>
      </View>
    </>
  );
};
