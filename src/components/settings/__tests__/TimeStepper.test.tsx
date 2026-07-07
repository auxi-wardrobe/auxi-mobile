/**
 * Unit tests for the TimeStepper — the editable hour:minute spinner used by
 * the Settings change-time dialog. Verifies the wrap-around arithmetic on a
 * 12-hour clock and that every step emits a zero-padded "HH:MM" string.
 *
 * No @testing-library/react-native in this repo — drive the tree with
 * react-test-renderer directly and query by testID (see SettingsScreen.test).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { TimeStepper } from '../TimeStepper';

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance => {
  const matches = root.findAll(n => n.props?.testID === id);
  if (matches.length === 0) throw new Error(`no node with testID="${id}"`);
  return matches[0];
};

const press = (node: ReactTestInstance) =>
  act(() => {
    node.props.onPress();
  });

const renderStepper = (value: string, onChange: jest.Mock) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <TimeStepper
        value={value}
        onChange={onChange}
        testIDPrefix="settings-time"
        hourUpA11yLabel="hour up"
        hourDownA11yLabel="hour down"
        minuteUpA11yLabel="minute up"
        minuteDownA11yLabel="minute down"
      />,
    );
  });
  return renderer;
};

describe('TimeStepper', () => {
  it('renders the parsed hour and minute zero-padded', () => {
    const r = renderStepper('06:05', jest.fn());
    expect(byTestID(r.root, 'settings-time-hour-value').props.children).toBe(
      '06',
    );
    expect(byTestID(r.root, 'settings-time-minute-value').props.children).toBe(
      '05',
    );
  });

  it('stepping the hour up emits the next hour, minute unchanged', () => {
    const onChange = jest.fn();
    const r = renderStepper('06:15', onChange);
    press(byTestID(r.root, 'settings-time-hour-up'));
    expect(onChange).toHaveBeenCalledWith('07:15');
  });

  it('hour wraps 12 → 1 going up and 1 → 12 going down (12-hour clock)', () => {
    const up = jest.fn();
    press(byTestID(renderStepper('12:00', up).root, 'settings-time-hour-up'));
    expect(up).toHaveBeenCalledWith('01:00');

    const down = jest.fn();
    press(
      byTestID(renderStepper('01:00', down).root, 'settings-time-hour-down'),
    );
    expect(down).toHaveBeenCalledWith('12:00');
  });

  it('minute wraps 59 → 00 going up and 00 → 59 going down', () => {
    const up = jest.fn();
    press(byTestID(renderStepper('06:59', up).root, 'settings-time-minute-up'));
    expect(up).toHaveBeenCalledWith('06:00');

    const down = jest.fn();
    press(
      byTestID(renderStepper('06:00', down).root, 'settings-time-minute-down'),
    );
    expect(down).toHaveBeenCalledWith('06:59');
  });

  it('falls back to 12:00 for a malformed value', () => {
    const r = renderStepper('not-a-time', jest.fn());
    expect(byTestID(r.root, 'settings-time-hour-value').props.children).toBe(
      '12',
    );
    expect(byTestID(r.root, 'settings-time-minute-value').props.children).toBe(
      '00',
    );
  });
});
