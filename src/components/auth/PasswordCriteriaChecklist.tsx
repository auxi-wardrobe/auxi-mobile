/**
 * AU-242 Phase 04 Integration — Shared password criteria checklist.
 *
 * Used by:
 *   - `PasswordCreationScreen` (batch B / specs 04 + 05)
 *   - `ResetNewPasswordScreen` (batch D / spec 12)
 *
 * Visual: 3 rows, each row = 12px circle bullet + label text. Pending
 * state shows an outlined bullet + subtle text; satisfied flips the
 * bullet to a filled base-color disc and the label to base text color.
 * This unifies the two batches behind a single render — see comments
 * in `password-rules.ts` for the policy rationale.
 *
 * testID convention: each row gets `${testIDPrefix}-${ruleKey}` for the
 * label (e.g. `password-criteria-length`), and a `-bullet` suffix +
 * `-satisfied` modifier for the bullet so Maestro can assert on state.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme/theme';
import {
  buildCriteriaList,
  type PasswordRuleKey,
} from '../../utils/password-rules';

export interface PasswordCriteriaChecklistProps {
  /** Current password value — drives the satisfied/pending state per rule */
  password: string;
  /** Resolved i18n strings, one per rule */
  labels: Record<PasswordRuleKey, string>;
  /** testID prefix; rows get `${prefix}-${ruleKey}`, bullets get `-bullet`/`-bullet-satisfied` */
  testIDPrefix: string;
}

export const PasswordCriteriaChecklist: React.FC<
  PasswordCriteriaChecklistProps
> = ({ password, labels, testIDPrefix }) => {
  const rules = buildCriteriaList(password, labels);

  return (
    <View style={styles.list} testID={`${testIDPrefix}-list`}>
      {rules.map(rule => (
        <View key={rule.key} style={styles.row}>
          <View
            style={[
              styles.bullet,
              rule.satisfied ? styles.bulletSatisfied : styles.bulletPending,
            ]}
            testID={`${testIDPrefix}-${rule.key}-bullet${
              rule.satisfied ? '-satisfied' : ''
            }`}
          />
          <Text
            style={[
              styles.label,
              rule.satisfied ? styles.labelSatisfied : styles.labelPending,
            ]}
            testID={`${testIDPrefix}-${rule.key}${
              rule.satisfied ? '-passed' : ''
            }`}
          >
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.uacDimension8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bulletPending: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.uacTextSubtle200,
  },
  bulletSatisfied: {
    backgroundColor: theme.colors.uacTextBase,
  },
  label: {
    ...theme.typography.aliases.uacBodyXsRegular,
  },
  labelPending: {
    color: theme.colors.uacTextSubtle200,
  },
  labelSatisfied: {
    color: theme.colors.uacTextBase,
  },
});

export default PasswordCriteriaChecklist;
