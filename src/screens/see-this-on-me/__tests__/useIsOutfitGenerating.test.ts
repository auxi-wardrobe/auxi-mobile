// useIsOutfitGenerating — loading "See on me" button when an outfit's AI photo
// is still generating in the background after the user left the loading screen.
//
// No testing-library in this repo — the hook reads the generation store via
// `useTryOnGeneration`, so we mock that module to feed controlled state and
// assert the predicate (same harness pattern as useTryOnFeedback.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { TryOnGenerationState } from '../try-on-generation-store';
import { useTryOnGeneration } from '../use-try-on-generation';
import { useIsOutfitGenerating } from '../use-outfit-generating';

jest.mock('../use-try-on-generation', () => ({
  useTryOnGeneration: jest.fn(),
}));

const mockedUse = useTryOnGeneration as jest.Mock;

const state = (patch: Partial<TryOnGenerationState>): TryOnGenerationState =>
  ({
    phase: null,
    status: 'idle',
    outfit: null,
    jobId: null,
    selfieId: null,
    fullBodyId: null,
    shapes: null,
    partial: false,
    bodyId: null,
    shape: null,
    resultUrl: null,
    errorCode: null,
    errorKind: null,
    backgrounded: false,
    ...patch,
  } as TryOnGenerationState);

const outfitCtx = (outfitHash: string) => ({
  outfitHash,
  itemIds: [],
  itemImageUrls: [],
  stylingNote: '',
});

const run = (hash: string | undefined): boolean => {
  const ref: { current: boolean | null } = { current: null };
  const Harness = (): null => {
    ref.current = useIsOutfitGenerating(hash);
    return null;
  };
  act(() => {
    TestRenderer.create(React.createElement(Harness));
  });
  if (ref.current === null) throw new Error('hook did not render');
  return ref.current;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useIsOutfitGenerating', () => {
  it('is true while THIS outfit is generating (render phase)', () => {
    mockedUse.mockReturnValue(
      state({ status: 'generating', phase: 'render', outfit: outfitCtx('abc') }),
    );
    expect(run('abc')).toBe(true);
  });

  it('is true during the shapes phase too (whole flow, not just render)', () => {
    mockedUse.mockReturnValue(
      state({ status: 'generating', phase: 'shapes', outfit: outfitCtx('abc') }),
    );
    expect(run('abc')).toBe(true);
  });

  it('is false for a DIFFERENT outfit than the one generating', () => {
    mockedUse.mockReturnValue(
      state({ status: 'generating', phase: 'render', outfit: outfitCtx('abc') }),
    );
    expect(run('xyz')).toBe(false);
  });

  it('is false once the job succeeds', () => {
    mockedUse.mockReturnValue(
      state({ status: 'success', phase: 'render', outfit: outfitCtx('abc') }),
    );
    expect(run('abc')).toBe(false);
  });

  it('is false on error', () => {
    mockedUse.mockReturnValue(
      state({ status: 'error', phase: 'render', outfit: outfitCtx('abc') }),
    );
    expect(run('abc')).toBe(false);
  });

  it('is false when idle', () => {
    mockedUse.mockReturnValue(state({}));
    expect(run('abc')).toBe(false);
  });

  it('is false when no outfit hash is supplied', () => {
    mockedUse.mockReturnValue(
      state({ status: 'generating', phase: 'render', outfit: outfitCtx('abc') }),
    );
    expect(run(undefined)).toBe(false);
  });
});
