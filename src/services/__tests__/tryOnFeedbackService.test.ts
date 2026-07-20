/* eslint-env jest */
/**
 * See-on-me redesign (B3) — tryOnFeedbackService contract tests.
 *
 * `submitVote` posts to `/tryon/feedback` and NEVER rejects — even on a
 * network failure or a 404 (the backend endpoint may not be live yet) it
 * resolves `false` so the caller's optimistic UI is never disturbed.
 */
import { tryOnFeedbackService } from '../tryOnFeedbackService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedPost = apiClient.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

test('posts the job id, result url, and vote to /tryon/feedback', async () => {
  mockedPost.mockResolvedValue({ data: { ok: true } });
  const ok = await tryOnFeedbackService.submitVote({
    job_id: 'job-1',
    result_url: 'https://cdn.example/result.jpg',
    vote: 'up',
  });
  expect(ok).toBe(true);
  expect(mockedPost).toHaveBeenCalledWith('/tryon/feedback', {
    job_id: 'job-1',
    result_url: 'https://cdn.example/result.jpg',
    vote: 'up',
  });
});

test('resolves false (never rejects) on a network/5xx failure', async () => {
  mockedPost.mockRejectedValue(new Error('network down'));
  await expect(
    tryOnFeedbackService.submitVote({
      job_id: 'job-1',
      result_url: 'https://cdn.example/result.jpg',
      vote: 'down',
    }),
  ).resolves.toBe(false);
});

test('resolves false (never rejects) on a 404 — endpoint not yet built', async () => {
  mockedPost.mockRejectedValue({ response: { status: 404 } });
  await expect(
    tryOnFeedbackService.submitVote({
      job_id: 'job-1',
      result_url: 'https://cdn.example/result.jpg',
      vote: 'up',
    }),
  ).resolves.toBe(false);
});
