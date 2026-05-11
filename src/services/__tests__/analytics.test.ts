import { track } from '../analytics';

describe('analytics shim', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('does not throw when called', () => {
    expect(() => track('test_event')).not.toThrow();
    expect(() => track('test_event', { foo: 'bar' })).not.toThrow();
  });

  it('logs event name + props to console.info in dev', () => {
    track('test_event', { foo: 'bar' });
    expect(consoleSpy).toHaveBeenCalledWith(
      'analytics.track',
      'test_event',
      { foo: 'bar' },
    );
  });

  it('logs with empty props when none passed', () => {
    track('bare_event');
    expect(consoleSpy).toHaveBeenCalledWith(
      'analytics.track',
      'bare_event',
      {},
    );
  });
});
