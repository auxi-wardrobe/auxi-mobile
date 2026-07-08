import React from 'react';
import { MRadio, MRadioMenu } from '../design-system/lib';

export type RadioOption<K extends string> = {
  key: K;
  label: string;
  description?: string;
};

type RadioOptionListProps<K extends string> = {
  options: Array<RadioOption<K>>;
  selected: K;
  onSelect: (key: K) => void;
  testIDPrefix: string;
};

export const Radio = ({ selected }: { selected: boolean }) => (
  <MRadio selected={selected} />
);

// Repeated option-row list shared by the style-direction dialog and the
// change-time frequency picker. Renders copy (title + optional description),
// the green radio, and a hairline divider between rows.
export function RadioOptionList<K extends string>({
  options,
  selected,
  onSelect,
  testIDPrefix,
}: RadioOptionListProps<K>) {
  return (
    <MRadioMenu
      options={options.map(option => ({
        value: option.key,
        label: option.label,
        description: option.description,
        testID: `${testIDPrefix}-${option.key}`,
      }))}
      value={selected}
      onChange={value => onSelect(value as K)}
      testID={testIDPrefix}
    />
  );
}
