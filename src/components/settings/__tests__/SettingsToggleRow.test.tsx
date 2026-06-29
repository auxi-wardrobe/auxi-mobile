import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SettingsToggleRow } from '../SettingsToggleRow';

it('renders label and forwards toggle changes', () => {
  const onValueChange = jest.fn();
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <SettingsToggleRow
        label="Enable Daily Reminder"
        value={true}
        onValueChange={onValueChange}
        testID="row-reminder"
        accessibilityLabel="Toggle reminder"
      />,
    );
  });
  const sw = r.root.findAll(n => n.props?.testID === 'row-reminder')[0];
  expect(sw.props.value).toBe(true);
  act(() => sw.props.onValueChange(false));
  expect(onValueChange).toHaveBeenCalledWith(false);
});
