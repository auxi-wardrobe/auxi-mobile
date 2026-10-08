import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton, MChip } from '../../../components/design-system/lib';
import { ContextualBottomSheet } from '../../../components/features/ContextualBottomSheet';
import { MacgieLoader } from '../../../components/macgie/MacgieLoader';
import { useDiscoveryTrendTags } from '../../../hooks/useDiscovery';
import { tagLabel } from '../../build-around/BuildAroundSheet';
import { buildAroundSheetStyles as styles } from '../../build-around/buildAroundSheetStyles';

type Props = {
  visible: boolean;
  /** The tag on the Home section (`null` = Surprise me) — the sheet opens on it. */
  selected: string | null;
  onDismiss: () => void;
  /** "Done" — the new choice (`null` = Surprise me). */
  onDone: (tag: string | null) => void;
};

/**
 * "+ add tags" on the Home "Build your look" section — the SAME choice the
 * ItemDetail method sheet offers under "What style do you prefer": "Surprise
 * me" or ONE Discovery trend tag, in the same 3-column chip grid. The only
 * difference is that every tag from `GET /discovery/trend-tags` is listed
 * instead of five random ones, so the search request (`trend_tag` or none)
 * is exactly ItemDetail's. The draft lands on Done; Cancel / scrim keep the
 * old choice.
 */
export const BuildYourLookTagSheet: React.FC<Props> = ({
  visible,
  selected,
  onDismiss,
  onDone,
}) => {
  const { t } = useTranslation();
  const { data: tags, isLoading, isError } = useDiscoveryTrendTags();
  const [draft, setDraft] = useState<string | null>(selected);

  // A fresh open always starts from what the section currently shows.
  useEffect(() => {
    if (visible) {
      setDraft(selected);
    }
  }, [visible, selected]);

  const body = () => {
    if (isLoading) {
      return (
        <View style={styles.stateBlock} testID="home-build-look-tags-loading">
          <MacgieLoader variant="inline" size={56} asLogo />
        </View>
      );
    }
    if (isError || !tags || tags.length === 0) {
      return (
        <Text style={styles.stateBody} testID="home-build-look-tags-empty">
          {t('homeLanding.build_look_tags_empty')}
        </Text>
      );
    }
    return (
      <View style={styles.chips} testID="home-build-look-tags-grid">
        <View style={styles.chipCell}>
          <MChip
            block
            selected={draft === null}
            onPress={() => setDraft(null)}
            testID={`home-build-look-tag-option-surprise-me${draft === null ? '-selected' : ''}`}
          >
            {t('buildAround.style_surprise_me')}
          </MChip>
        </View>
        {tags.map(tag => {
          const on = draft === tag;
          return (
            <View key={tag} style={styles.chipCell}>
              <MChip
                block
                selected={on}
                onPress={() => setDraft(tag)}
                testID={`home-build-look-tag-option-${tag}${on ? '-selected' : ''}`}
              >
                {tagLabel(tag)}
              </MChip>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="home-build-look-tags-sheet"
    >
      <Text style={styles.headerTitle} accessibilityRole="header">
        {t('buildAround.style_title')}
      </Text>
      <View style={styles.styleSection}>{body()}</View>
      <View style={styles.actions}>
        <View style={styles.grow}>
          <MButton variant="text" onPress={onDismiss} testID="home-build-look-tags-cancel">
            {t('buildAround.cancel')}
          </MButton>
        </View>
        <View style={styles.grow}>
          <MButton onPress={() => onDone(draft)} testID="home-build-look-tags-done">
            {t('homeLanding.build_look_tags_done')}
          </MButton>
        </View>
      </View>
    </ContextualBottomSheet>
  );
};
