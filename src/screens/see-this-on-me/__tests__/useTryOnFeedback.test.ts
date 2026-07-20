// useTryOnFeedback — See-on-me redesign (B3) thumbs up/down vote.
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useAiLimitGate.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { track } from '../../../services/analytics';
import { tryOnFeedbackService } from '../../../services/tryOnFeedbackService';
import { useTryOnFeedback, type UseTryOnFeedbackResult } from '../useTryOnFeedback';

jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/tryOnFeedbackService', () => ({
  tryOnFeedbackService: { submitVote: jest.fn().mockResolvedValue(true) },
}));

const mockedTrack = track as jest.Mock;
const mockedSubmitVote = tryOnFeedbackService.submitVote as jest.Mock;

const mountHook = (
  opts: Parameters<typeof useTryOnFeedback>[0],
) => {
  const ref: { current: UseTryOnFeedbackResult | null } = { current: null };
  const Harness = (): null => {
    ref.current = useTryOnFeedback(opts);
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness));
  });
  return {
    get: (): UseTryOnFeedbackResult => {
      if (!ref.current) throw new Error('hook did not render');
      return ref.current;
    },
    unmount: () => act(() => root.unmount()),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useTryOnFeedback', () => {
  it('starts with no vote', () => {
    const { get, unmount } = mountHook({
      jobId: 'job-1',
      resultUrl: 'https://cdn.example/r.jpg',
      outfitHash: 'hash-1',
    });
    expect(get().vote).toBeNull();
    unmount();
  });

  it('onLike sets the vote, tracks try_on_result_liked, and posts the vote', () => {
    const { get, unmount } = mountHook({
      jobId: 'job-1',
      resultUrl: 'https://cdn.example/r.jpg',
      outfitHash: 'hash-1',
    });
    act(() => get().onLike());
    expect(get().vote).toBe('up');
    expect(mockedTrack).toHaveBeenCalledWith('try_on_result_liked', {
      outfit_hash: 'hash-1',
    });
    expect(mockedSubmitVote).toHaveBeenCalledWith({
      job_id: 'job-1',
      result_url: 'https://cdn.example/r.jpg',
      vote: 'up',
    });
    unmount();
  });

  it('onDislike after onLike SWITCHES the vote (single-choice, changeable)', () => {
    const { get, unmount } = mountHook({
      jobId: 'job-1',
      resultUrl: 'https://cdn.example/r.jpg',
      outfitHash: 'hash-1',
    });
    act(() => get().onLike());
    act(() => get().onDislike());
    expect(get().vote).toBe('down');
    expect(mockedTrack).toHaveBeenCalledWith('try_on_result_disliked', {
      outfit_hash: 'hash-1',
    });
    unmount();
  });

  it('re-tapping the same thumb is a no-op (no duplicate track/post)', () => {
    const { get, unmount } = mountHook({
      jobId: 'job-1',
      resultUrl: 'https://cdn.example/r.jpg',
      outfitHash: 'hash-1',
    });
    act(() => get().onLike());
    act(() => get().onLike());
    expect(get().vote).toBe('up');
    expect(mockedTrack).toHaveBeenCalledTimes(1);
    expect(mockedSubmitVote).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('skips the network call (but still updates UI + analytics) with no jobId', () => {
    const { get, unmount } = mountHook({
      jobId: null,
      resultUrl: 'https://cdn.example/r.jpg',
      outfitHash: 'hash-1',
    });
    act(() => get().onLike());
    expect(get().vote).toBe('up');
    expect(mockedTrack).toHaveBeenCalledWith('try_on_result_liked', {
      outfit_hash: 'hash-1',
    });
    expect(mockedSubmitVote).not.toHaveBeenCalled();
    unmount();
  });
});
