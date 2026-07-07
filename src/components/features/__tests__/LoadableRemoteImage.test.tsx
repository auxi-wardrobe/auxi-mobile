import React from 'react';
import { Image } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { LoadableRemoteImage } from '../LoadableRemoteImage';

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

test('keeps skeleton until the remote image errors or loads', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <LoadableRemoteImage
        uri="https://cdn.example/item.jpg"
        skeletonTestID="image-loading"
      />,
    );
  });

  expect(
    r.root.findAll(n => n.props?.testID === 'image-loading').length,
  ).toBeGreaterThan(0);

  act(() => {
    r.root.findByType(Image).props.onError();
  });

  expect(r.root.findAll(n => n.props?.testID === 'image-loading')).toHaveLength(
    0,
  );
});

test('shows the skeleton immediately when the remote image uri changes', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <LoadableRemoteImage
        uri="https://cdn.example/first.jpg"
        skeletonTestID="image-loading"
      />,
    );
  });

  act(() => {
    r.root.findByType(Image).props.onLoadEnd();
  });
  expect(r.root.findAll(n => n.props?.testID === 'image-loading')).toHaveLength(
    0,
  );

  act(() => {
    r.update(
      <LoadableRemoteImage
        uri="https://cdn.example/second.jpg"
        skeletonTestID="image-loading"
      />,
    );
  });

  expect(
    r.root.findAll(n => n.props?.testID === 'image-loading').length,
  ).toBeGreaterThan(0);
});
