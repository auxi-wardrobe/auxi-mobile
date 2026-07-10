/* eslint-env jest */
import React from 'react';
import { Text, View } from 'react-native';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { RootDrawer } from '../RootDrawer';

let mockSidebarOpen = false;
const mockClose = jest.fn(() => {
  mockSidebarOpen = false;
});

type MockGestureChain = {
  onUpdate: () => MockGestureChain;
  onEnd: () => MockGestureChain;
  runOnJS: () => MockGestureChain;
};

jest.mock('../../../context/SidebarContext', () => ({
  useSidebar: () => ({
    isOpen: mockSidebarOpen,
    close: mockClose,
  }),
}));

jest.mock('../SidebarMenu', () => {
  const MockReact = require('react');
  const { View: NativeView } = require('react-native');

  return {
    SIDEBAR_WIDTH: 300,
    SidebarMenu: () =>
      MockReact.createElement(NativeView, { testID: 'sidebar-menu' }),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const MockReact = require('react');
  const { View: NativeView } = require('react-native');
  const chain: MockGestureChain = {
    onUpdate: () => chain,
    onEnd: () => chain,
    runOnJS: () => chain,
  };

  return {
    Gesture: {
      Pan: () => chain,
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) =>
      MockReact.createElement(
        NativeView,
        { testID: 'drawer-pan-host' },
        children,
      ),
  };
});

const findByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance[] =>
  root.findAll(n => typeof n.type === 'string' && n.props?.testID === id);

const renderDrawer = (): TestRenderer.ReactTestRenderer => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <RootDrawer>
        <View testID="app-content">
          <Text>Home</Text>
        </View>
      </RootDrawer>,
    );
  });
  return renderer;
};

describe('RootDrawer gesture ownership', () => {
  beforeEach(() => {
    mockSidebarOpen = false;
    mockClose.mockClear();
  });

  it('does not mount the drawer pan host while closed', () => {
    const renderer = renderDrawer();

    expect(findByTestID(renderer.root, 'app-content')).toHaveLength(1);
    expect(findByTestID(renderer.root, 'drawer-pan-host')).toHaveLength(0);
  });

  it('mounts the drawer pan host while open', () => {
    mockSidebarOpen = true;

    const renderer = renderDrawer();

    expect(findByTestID(renderer.root, 'drawer-pan-host')).toHaveLength(1);
    expect(findByTestID(renderer.root, 'drawer-close-catcher')).toHaveLength(1);
  });
});
