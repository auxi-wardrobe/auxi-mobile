// Home "Build your look": up to three chosen items + an Add card while there
// is room, one tag chip with × and a "+ add tags" chip, and a "Find the best
// match" action that is disabled until at least one item is chosen.

import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { BuildYourLookSection } from '../components/BuildYourLookSection';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const item = (id: string) => ({ id, name: `Item ${id}`, image_url: `https://x/${id}.png` });

// Composite + host nodes both carry the testID; count only the host ones so a
// Pressable (composite + its native View) counts once.
const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id && typeof n.type === 'string');
const press = (root: ReactTestInstance, id: string) =>
  act(() => root.findAll(n => n.props?.testID === id)[0].props.onPress());

const render = (overrides: Partial<React.ComponentProps<typeof BuildYourLookSection>> = {}) => {
  const props = {
    items: [],
    tag: null,
    onAddItem: jest.fn(),
    onRemoveItem: jest.fn(),
    onAddTags: jest.fn(),
    onRemoveTag: jest.fn(),
    onFind: jest.fn(),
    ...overrides,
  };
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<BuildYourLookSection {...props} />);
  });
  return { r, props };
};

describe('BuildYourLookSection', () => {
  it('starts with only the Add card and a disabled Find action', () => {
    const { r, props } = render();
    expect(byTestID(r.root, 'home-build-look-add-item')).toHaveLength(1);
    expect(byTestID(r.root, 'home-build-look-item-0')).toHaveLength(0);
    expect(byTestID(r.root, 'home-build-look-find-disabled')).toHaveLength(1);
    expect(byTestID(r.root, 'home-build-look-find')).toHaveLength(0);
    press(r.root, 'home-build-look-add-item');
    expect(props.onAddItem).toHaveBeenCalled();
  });

  it('renders the chosen items with a remove control each, and enables Find', () => {
    const { r, props } = render({ items: [item('a'), item('b')] as never });
    expect(byTestID(r.root, 'home-build-look-item-0')).toHaveLength(1);
    expect(byTestID(r.root, 'home-build-look-item-1')).toHaveLength(1);
    expect(byTestID(r.root, 'home-build-look-add-item')).toHaveLength(1);
    press(r.root, 'home-build-look-remove-1');
    expect(props.onRemoveItem).toHaveBeenCalledWith('b');
    press(r.root, 'home-build-look-find');
    expect(props.onFind).toHaveBeenCalled();
    expect(byTestID(r.root, 'home-build-look-find-disabled')).toHaveLength(0);
  });

  it('hides the Add card once three items are chosen', () => {
    const { r } = render({ items: [item('a'), item('b'), item('c')] as never });
    expect(byTestID(r.root, 'home-build-look-add-item')).toHaveLength(0);
    expect(byTestID(r.root, 'home-build-look-item-2')).toHaveLength(1);
  });

  it('shows the chosen tag as a removable chip next to the add-tags chip', () => {
    const { r, props } = render({ tag: 'minimal' });
    expect(byTestID(r.root, 'home-build-look-tag-minimal')).toHaveLength(1);
    press(r.root, 'home-build-look-tag-minimal');
    expect(props.onRemoveTag).toHaveBeenCalled();
    press(r.root, 'home-build-look-add-tags');
    expect(props.onAddTags).toHaveBeenCalled();
  });
});
