import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton, MChip, toast } from '../../../components/design-system/lib';
import { ContextualBottomSheet } from '../../../components/features/ContextualBottomSheet';
import { MacgieLoader } from '../../../components/macgie/MacgieLoader';
import { useDiscoveryTrendTags } from '../../../hooks/useDiscovery';
import { BUILD_LOOK_MAX_TAGS } from '../../../services/buildAroundMatchService';
import { tagLabel } from '../../build-around/BuildAroundSheet';
import { buildAroundSheetStyles as styles } from '../../build-around/buildAroundSheetStyles';

type Props = {
  visible: boolean;
  /** Tags already on the Home section — the sheet opens with them selected. */
  selected: string[];
  onDismiss: () => void;
  /** "Done" — the new full selection (may be empty = Surprise me). */
  onDone: (tags: string[]) => void;
};

/**
 * "+ add tags" on the Home "Build your look" section: every Discovery trend
 * tag (`GET /discovery/trend-tags`) as a 3-column chip grid, multi-select up
 * to `BUILD_LOOK_MAX_TAGS`. Same chip grid and copy as the ItemDetail method
 * sheet's style row, so a tag reads the same wherever it is picked. The
 * draft lives here and only lands on Done; Cancel / scrim keep the old set.
 */
export const BuildYourLookTagSheet: React.FC<Props> = ({
  visible,
  selected,
  onDismiss,
  onDone,
}) => {
  const { t } = useTranslation();
  const { data: tags, isLoading, isError } = useDiscoveryTrendTags();
  const [draft, setDraft] = useState<string[]>(selected);

  // A fresh open always starts from what the section currently shows.
  useEffect(() => {
    if (visible) {
      setDraft(selected);
    }
  }, [visible, selected]);

  const toggle = (tag: string) => {
    setDraft(prev => {
      if (prev.includes(tag)) {
        return prev.filter(other => other !== tag);
      }
      if (prev.length >= BUILD_LOOK_MAX_TAGS) {
        toast.show({
          type: 'info',
          text1: t('homeLanding.build_look_tags_limit', { count: BUILD_LOOK_MAX_TAGS }),
          position: 'bottom',
        });
        return prev;
      }
      return [...prev, tag];
    });
  };

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
        {tags.map(tag => {
          const on = draft.includes(tag);
          return (
            <View key={tag} style={styles.chipCell}>
              <MChip
                block
                selected={on}
                onPress={() => toggle(tag)}
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
        {t('homeLanding.build_look_tags_title')}
      </Text>
      <Text style={styles.intro}>
        {t('homeLanding.build_look_tags_hint', { count: BUILD_LOOK_MAX_TAGS })}
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
