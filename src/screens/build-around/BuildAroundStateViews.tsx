import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie/MacgieLoader';
import type { MakeItYoursErrorCode } from '../make-it-yours/useMakeItYoursRun';
import { buildAroundSheetStyles as styles } from './buildAroundSheetStyles';

// The in-place loading / empty / error bodies of a "Find the best match from
// Discovery" search. Shared by the ItemDetail method sheet (BuildAroundSheet)
// and the Home "Build your look" status sheet, so both entry points show the
// identical three loading steps, copy and button layout. Content only — the
// caller supplies the ContextualBottomSheet and the actions' handlers.

const LOADING_STEPS = ['loading_step_1', 'loading_step_2', 'loading_step_3'] as const;

export const BUILD_AROUND_ERROR_BODY: Record<MakeItYoursErrorCode, string> = {
  network_error: 'buildAround.error_body',
  timeout: 'buildAround.error_body',
  server_error: 'buildAround.error_server_body',
  not_found: 'buildAround.error_not_found_body',
  rate_limited: 'buildAround.error_rate_limited_body',
};

const MASCOT_SIZE = 56;

export type BuildAroundStateAction = {
  label: string;
  onPress: () => void;
  testID: string;
};

type LoadingProps = {
  onCancel: () => void;
  /** Label of the disabled, spinning primary button ("Build" / "Find…"). */
  busyLabel: string;
  testIDPrefix?: string;
};

export const BuildAroundLoadingView: React.FC<LoadingProps> = ({
  onCancel,
  busyLabel,
  testIDPrefix = 'build-around',
}) => {
  const { t } = useTranslation();
  return (
    <View
      testID={`${testIDPrefix}-loading`}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('buildAround.a11y_loading')}
      accessibilityState={{ busy: true }}
    >
      <View style={styles.stateBlock}>
        <MacgieLoader variant="inline" size={MASCOT_SIZE} asLogo />
        <Text style={styles.stateTitle}>{t('buildAround.loading_title')}</Text>
        <View>
          {LOADING_STEPS.map(key => (
            <Text key={key} style={styles.step}>
              {`•  ${t(`buildAround.${key}`)}`}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.grow}>
          <MButton loading disabled testID={`${testIDPrefix}-build-loading`}>
            {busyLabel}
          </MButton>
        </View>
        <View style={styles.grow}>
          <MButton
            variant="secondary"
            onPress={onCancel}
            testID={`${testIDPrefix}-loading-cancel`}
          >
            {t('buildAround.cancel')}
          </MButton>
        </View>
      </View>
    </View>
  );
};

type MessageProps = {
  title: string;
  body: string;
  /** Left, `secondary` button. */
  secondary?: BuildAroundStateAction;
  /** Right, `primary` button. Omit to show the secondary one alone. */
  primary?: BuildAroundStateAction;
  testID: string;
};

/** Empty ("no look fits") and error bodies share one title + body + actions shape. */
export const BuildAroundMessageView: React.FC<MessageProps> = ({
  title,
  body,
  secondary,
  primary,
  testID,
}) => (
  <View testID={testID}>
    <View style={styles.stateBlock}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
    <View style={styles.actions}>
      {secondary ? (
        <View style={styles.grow}>
          <MButton variant="secondary" onPress={secondary.onPress} testID={secondary.testID}>
            {secondary.label}
          </MButton>
        </View>
      ) : null}
      {primary ? (
        <View style={styles.grow}>
          <MButton onPress={primary.onPress} testID={primary.testID}>
            {primary.label}
          </MButton>
        </View>
      ) : null}
    </View>
  </View>
);
