import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { FavouriteActionBar } from '../FavouriteActionBar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const findByTestID = (r: TestRenderer.ReactTestRenderer, id: string) =>
  r.root.find(n => n.props?.testID === id);

const renderBar = (
  overrides: Partial<{
    onRemove: () => void;
    onSelfVisualization: () => void;
    hasTryOnResult: boolean;
  }> = {},
) => {
  let r!: TestRenderer.ReactTestRenderer;
  const onRemove = overrides.onRemove ?? jest.fn();
  const onSelfVisualization = overrides.onSelfVisualization ?? jest.fn();
  act(() => {
    r = TestRenderer.create(
      <FavouriteActionBar
        testID="favourite-action-bar"
        onRemove={onRemove}
        onSelfVisualization={onSelfVisualization}
        hasTryOnResult={overrides.hasTryOnResult}
      />,
    );
  });
  return { r, onRemove, onSelfVisualization };
};

test('renders the bar with both actions', () => {
  const { r } = renderBar();
  expect(findByTestID(r, 'favourite-action-bar')).toBeTruthy();
  expect(findByTestID(r, 'favourite-remove-active')).toBeTruthy();
  expect(findByTestID(r, 'favourite-self-visualization-active')).toBeTruthy();
});

test('remove control invokes onRemove', () => {
  const onRemove = jest.fn();
  const { r } = renderBar({ onRemove });
  act(() => {
    findByTestID(r, 'favourite-remove-active').props.onPress();
  });
  expect(onRemove).toHaveBeenCalledTimes(1);
});

test('self-visualization control invokes onSelfVisualization', () => {
  const onSelfVisualization = jest.fn();
  const { r } = renderBar({ onSelfVisualization });
  act(() => {
    findByTestID(r, 'favourite-self-visualization-active').props.onPress();
  });
  expect(onSelfVisualization).toHaveBeenCalledTimes(1);
});

// New Favourite layout (CEO 2026-08-27): an outfit whose AI photo is already on
// the card offers "Retake", not "See on me". Same action, flipped label — and a
// flipped testID suffix (never an undefined testID) so Maestro can select
// either state.
test('an outfit with a saved try-on photo offers Retake instead of See on me', () => {
  const { r } = renderBar({ hasTryOnResult: true });
  const button = findByTestID(r, 'favourite-self-visualization-active-retake');
  expect(button.props.accessibilityLabel).toBe('favourite.retake');
  expect(
    r.root.findAll(
      n => n.props?.testID === 'favourite-self-visualization-active',
    ),
  ).toHaveLength(0);
});

test('Retake invokes the same self-visualization handler', () => {
  const onSelfVisualization = jest.fn();
  const { r } = renderBar({ hasTryOnResult: true, onSelfVisualization });
  act(() => {
    findByTestID(r, 'favourite-self-visualization-active-retake').props.onPress();
  });
  expect(onSelfVisualization).toHaveBeenCalledTimes(1);
});
