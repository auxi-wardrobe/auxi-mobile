import {
  requestCanvasExit,
  setCanvasExitGuard,
} from '../canvasExitGuard';

describe('canvasExitGuard', () => {
  // Module singleton — clear the slot between tests so state never leaks.
  afterEach(() => setCanvasExitGuard(null));

  it('proceeds immediately when no guard is registered', () => {
    const proceed = jest.fn();
    requestCanvasExit(proceed);
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('routes the proceed thunk through a registered guard (does not run it directly)', () => {
    const proceed = jest.fn();
    const guard = jest.fn();
    setCanvasExitGuard(guard);

    requestCanvasExit(proceed);

    expect(guard).toHaveBeenCalledTimes(1);
    expect(guard).toHaveBeenCalledWith(proceed);
    expect(proceed).not.toHaveBeenCalled(); // guard owns when/if to proceed

    // The guard can later replay the thunk (e.g. after the discard sheet).
    guard.mock.calls[0][0]();
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('is last-writer-wins — a second guard replaces the first', () => {
    const first = jest.fn();
    const second = jest.fn();
    setCanvasExitGuard(first);
    setCanvasExitGuard(second);

    requestCanvasExit(jest.fn());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clearing with null restores immediate-proceed behaviour', () => {
    const guard = jest.fn();
    setCanvasExitGuard(guard);
    setCanvasExitGuard(null);

    const proceed = jest.fn();
    requestCanvasExit(proceed);

    expect(guard).not.toHaveBeenCalled();
    expect(proceed).toHaveBeenCalledTimes(1);
  });
});
