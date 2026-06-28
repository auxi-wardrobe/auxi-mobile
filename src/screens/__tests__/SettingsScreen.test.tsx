/**
 * Unit tests for SettingsScreen logic paths flagged in PR #37 review.
 *
 * Coverage:
 *  1. resolveSettings (pure)         — metadata → resolved settings fallbacks
 *  2. applyChangeTime rollback       — success closes dialog / failure keeps it
 *                                       open + error toast + no unhandled reject
 *  3. handleReminderToggle           — optimistic flip, debounced persist,
 *                                       rollback on reject, unmount cleanup
 *  4. handleResetPreferences         — is_first_login branch + reject re-enable
 *
 * No @testing-library/react-native in this repo — we drive the tree with
 * react-test-renderer directly: query by testID via root.findAll, invoke the
 * onPress / onValueChange props inside act(). useAuth, Toast, navigation and
 * SVGs are mocked (see jest.setup.js + jest.config moduleNameMapper).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { toast } from '../../components/design-system/lib';
import { resolveSettings, SettingsScreen } from '../SettingsScreen';
import { useAuth } from '../../context/AuthContext';
import { User, UserMetadata } from '../../types/auth';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedToastShow = (toast as unknown as { show: jest.Mock }).show;

// Typed handle to the Node process emitter without pulling @types/node into
// the app tsconfig (it isn't in `types`). Used to assert the rejection from a
// failed updateCurrentUser is swallowed by the handler's `.catch`.
type RejectionEmitter = {
  on(event: 'unhandledRejection', listener: (...args: unknown[]) => void): void;
  off(
    event: 'unhandledRejection',
    listener: (...args: unknown[]) => void,
  ): void;
};
const proc = (globalThis as unknown as { process: RejectionEmitter }).process;

// ---- fixtures ---------------------------------------------------------------

const DEFAULT_SETTINGS = {
  dailyNotification: {
    enabled: true,
    time: '06:15',
    period: 'AM' as const,
    frequency: 'weekdays' as const,
  },
  styleDirection: 'stay_balanced' as const,
};

const makeUser = (metadata?: UserMetadata | null): User => ({
  id: 1,
  email: 'qa-test@auxi.app',
  created_at: '2026-01-01T00:00:00Z',
  is_active: true,
  is_first_login: false,
  user_metadata: metadata,
});

type AuthOverrides = {
  user?: User | null;
  updateCurrentUser?: jest.Mock;
  refreshUser?: jest.Mock;
  resetUserPreferences?: jest.Mock;
  checkAuth?: jest.Mock;
};

const buildAuth = (o: AuthOverrides = {}) => ({
  user: o.user ?? makeUser(null),
  // refreshUser is awaited in the mount effect — default resolves to the user.
  refreshUser:
    o.refreshUser ?? jest.fn().mockResolvedValue(o.user ?? makeUser(null)),
  updateCurrentUser: o.updateCurrentUser ?? jest.fn(),
  resetUserPreferences: o.resetUserPreferences ?? jest.fn(),
  checkAuth: o.checkAuth ?? jest.fn().mockResolvedValue(undefined),
});

// ---- test-renderer helpers --------------------------------------------------

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(n => n.props?.testID === id);

const oneByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance => {
  const matches = byTestID(root, id);
  if (matches.length === 0) throw new Error(`no node with testID="${id}"`);
  return matches[0];
};

// The dialogs render their children inside an RN Modal whose `visible` prop
// gates display. react-test-renderer keeps Modal children in the tree
// regardless of visibility, so "dialog open" == the Modal wrapping the
// primary button has visible===true.
const isDialogOpen = (
  root: ReactTestInstance,
  primaryTestID: string,
): boolean => {
  const modals = root.findAll(
    n =>
      typeof n.type !== 'string' &&
      // RN Modal element — has a `visible` prop and (when open) contains the button.
      n.props?.visible !== undefined &&
      n.findAll(c => c.props?.testID === primaryTestID).length > 0,
  );
  return modals.some(m => m.props.visible === true);
};

const press = (node: ReactTestInstance) => {
  act(() => {
    node.props.onPress();
  });
};

// flush a resolved/rejected microtask chain inside act
const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// Track live renderers so every render-based test is torn down — orphan
// trees left mounted re-run their effects and contaminate later tests.
const liveRenderers: TestRenderer.ReactTestRenderer[] = [];

const renderScreen = async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<SettingsScreen />);
  });
  liveRenderers.push(renderer);
  // let the mount effect (refreshUser) settle
  await flushPromises();
  return renderer;
};

beforeEach(() => {
  jest.clearAllMocks();
  // Defensive: ensure no fake-timer / pending-timer leakage from a prior
  // test (timed-out tests can leave timers installed) bleeds across cases.
  jest.useRealTimers();
});

afterEach(() => {
  // Unmount any screens created via renderScreen() before flipping timers.
  liveRenderers.splice(0).forEach(r => {
    try {
      act(() => r.unmount());
    } catch {
      // already unmounted by the test
    }
  });
  jest.useRealTimers();
});

// =============================================================================
// 1. resolveSettings (pure)
// =============================================================================
describe('resolveSettings', () => {
  it('null metadata → DEFAULT_SETTINGS', () => {
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(resolveSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('partial daily_notification (only enabled) → other fields fall back', () => {
    const result = resolveSettings({ daily_notification: { enabled: false } });
    expect(result.dailyNotification).toEqual({
      enabled: false,
      time: DEFAULT_SETTINGS.dailyNotification.time,
      period: DEFAULT_SETTINGS.dailyNotification.period,
      frequency: DEFAULT_SETTINGS.dailyNotification.frequency,
    });
    expect(result.styleDirection).toBe(DEFAULT_SETTINGS.styleDirection);
  });

  it('missing style_direction → default; provided overrides win', () => {
    expect(
      resolveSettings({ daily_notification: { period: 'PM' } }).styleDirection,
    ).toBe('stay_balanced');
    const full = resolveSettings({
      daily_notification: {
        enabled: false,
        time: '21:00',
        period: 'PM',
        frequency: 'everydays',
      },
      style_direction: 'more_polished',
    });
    expect(full).toEqual({
      dailyNotification: {
        enabled: false,
        time: '21:00',
        period: 'PM',
        frequency: 'everydays',
      },
      styleDirection: 'more_polished',
    });
  });
});

// =============================================================================
// 2. applyChangeTime rollback
// =============================================================================
describe('applyChangeTime', () => {
  it('success: server values sync + dialog closes', async () => {
    const updateCurrentUser = jest.fn().mockResolvedValue(
      makeUser({
        daily_notification: {
          enabled: true,
          time: '06:15',
          period: 'PM',
          frequency: 'everydays',
        },
      }),
    );
    mockedUseAuth.mockReturnValue(buildAuth({ updateCurrentUser }));

    const r = await renderScreen();
    const root = r.root;

    // open change-time dialog
    press(oneByTestID(root, 'settings-time-row'));
    expect(isDialogOpen(root, 'settings-time-update')).toBe(true);

    // choose PM + everydays then update
    press(oneByTestID(root, 'settings-time-period-pm'));
    press(oneByTestID(root, 'settings-time-freq-everydays'));
    press(oneByTestID(root, 'settings-time-update'));
    await flushPromises();

    expect(updateCurrentUser).toHaveBeenCalledWith({
      user_metadata: {
        daily_notification: { period: 'PM', frequency: 'everydays' },
      },
    });
    // synced from server response + dialog closed
    expect(isDialogOpen(root, 'settings-time-update')).toBe(false);
    expect(mockedToastShow).not.toHaveBeenCalled();
  });

  it('failure: committed settings unchanged, dialog stays open, error toast, no unhandled rejection', async () => {
    const unhandled = jest.fn();
    proc.on('unhandledRejection', unhandled);

    const updateCurrentUser = jest.fn().mockRejectedValue(new Error('boom'));
    mockedUseAuth.mockReturnValue(buildAuth({ updateCurrentUser }));

    const r = await renderScreen();
    const root = r.root;

    press(oneByTestID(root, 'settings-time-row'));
    press(oneByTestID(root, 'settings-time-period-pm'));
    press(oneByTestID(root, 'settings-time-update'));
    await flushPromises();

    expect(updateCurrentUser).toHaveBeenCalledTimes(1);
    // dialog still open for retry
    expect(isDialogOpen(root, 'settings-time-update')).toBe(true);
    // committed display value unchanged — still default AM
    const period = oneByTestID(root, 'settings-time-row').findAll(
      n => typeof n.type === 'string' && n.children?.[0] === 'AM',
    );
    expect(period.length).toBeGreaterThan(0);
    // error toast surfaced. SettingsScreen is i18n-wired; without an i18next
    // instance in tests, t(key) returns the bare key, so assert on the key.
    expect(mockedToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'settings.toast_title' }),
    );

    await flushPromises();
    proc.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 3. handleReminderToggle — debounce + rollback + unmount cleanup
// =============================================================================
describe('handleReminderToggle', () => {
  it('optimistic flip is visible before the debounce timer fires', async () => {
    jest.useFakeTimers();
    const updateCurrentUser = jest.fn().mockResolvedValue(makeUser(null));
    mockedUseAuth.mockReturnValue(buildAuth({ updateCurrentUser }));

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });
    liveRenderers.push(renderer);
    // settle the mount effect (refreshUser → syncFromUser) inside act
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const root = renderer.root;

    const toggle = oneByTestID(root, 'settings-daily-toggle');
    expect(toggle.props.value).toBe(true); // default enabled

    act(() => {
      toggle.props.onValueChange(false);
    });
    // optimistic: flipped immediately, persist NOT yet called (timer pending)
    expect(oneByTestID(root, 'settings-daily-toggle').props.value).toBe(false);
    expect(updateCurrentUser).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('rejecting persist after 500ms rolls enabled back to previous', async () => {
    jest.useFakeTimers();
    const updateCurrentUser = jest.fn().mockRejectedValue(new Error('nope'));
    mockedUseAuth.mockReturnValue(buildAuth({ updateCurrentUser }));

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });
    liveRenderers.push(renderer);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const root = renderer.root;

    act(() => {
      oneByTestID(root, 'settings-daily-toggle').props.onValueChange(false);
    });
    expect(oneByTestID(root, 'settings-daily-toggle').props.value).toBe(false);

    // advance debounce → persist fires + rejects → rollback
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateCurrentUser).toHaveBeenCalledTimes(1);
    expect(oneByTestID(root, 'settings-daily-toggle').props.value).toBe(true); // rolled back
    expect(mockedToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );

    jest.useRealTimers();
  });

  it('unmount before debounce fires → persist NOT called + no post-unmount state update', async () => {
    jest.useFakeTimers();
    const updateCurrentUser = jest.fn().mockResolvedValue(makeUser(null));
    mockedUseAuth.mockReturnValue(buildAuth({ updateCurrentUser }));

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });
    // settle the mount effect BEFORE installing the warning spy so only
    // post-unmount updates (the thing under test) can trip it.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const root = renderer.root;

    act(() => {
      oneByTestID(root, 'settings-daily-toggle').props.onValueChange(false);
    });

    // unmount before the 500ms debounce — cleanup must clearTimeout
    act(() => {
      renderer.unmount();
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(updateCurrentUser).not.toHaveBeenCalled();
    // no "state update on unmounted component" warning
    const warned = errorSpy.mock.calls.some(c =>
      String(c[0]).includes('unmounted'),
    );
    expect(warned).toBe(false);

    errorSpy.mockRestore();
    jest.useRealTimers();
  });
});

// =============================================================================
// 3b. handleResetNotifications (AU-316 RST-1) — reset + undo + rollback
// =============================================================================
describe('handleResetNotifications', () => {
  // Start from non-default notification settings so reset (→ defaults) and undo
  // (→ these prior values) produce distinct, assertable patches.
  const priorMetadata: UserMetadata = {
    daily_notification: {
      enabled: false,
      time: '21:00',
      period: 'PM',
      frequency: 'everydays',
    },
  };

  const resetMetadata: UserMetadata = {
    daily_notification: {
      enabled: true,
      time: '06:15',
      period: 'AM',
      frequency: 'weekdays',
    },
  };
  const resetPatch = { user_metadata: resetMetadata };

  const undoMetadata: UserMetadata = {
    daily_notification: {
      enabled: false,
      time: '21:00',
      period: 'PM',
      frequency: 'everydays',
    },
  };
  const undoPatch = { user_metadata: undoMetadata };

  it('reset: persists DEFAULT_SETTINGS notification block + shows undo toast', async () => {
    const user = makeUser(priorMetadata);
    // Echo the patch back so syncFromUser keeps the optimistic value.
    const updateCurrentUser = jest
      .fn()
      .mockResolvedValue(makeUser(resetPatch.user_metadata));
    mockedUseAuth.mockReturnValue(
      buildAuth({
        user,
        updateCurrentUser,
        refreshUser: jest.fn().mockResolvedValue(user),
      }),
    );

    const r = await renderScreen();
    const root = r.root;

    press(oneByTestID(root, 'settings-notification-reset'));
    await flushPromises();

    expect(updateCurrentUser).toHaveBeenCalledWith(resetPatch);
    // toggle reflects the reset default (enabled = true)
    expect(oneByTestID(root, 'settings-daily-toggle').props.value).toBe(true);
    // undo affordance surfaced (info toast, not an error)
    expect(mockedToastShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        text1: 'settings.notification_reset_toast_title',
        onPress: expect.any(Function),
      }),
    );
  });

  it('undo: restores prior values + persists the prior patch', async () => {
    const user = makeUser(priorMetadata);
    const updateCurrentUser = jest
      .fn()
      // reset call echoes defaults; undo call echoes prior values
      .mockResolvedValueOnce(makeUser(resetPatch.user_metadata))
      .mockResolvedValueOnce(makeUser(undoPatch.user_metadata));
    mockedUseAuth.mockReturnValue(
      buildAuth({
        user,
        updateCurrentUser,
        refreshUser: jest.fn().mockResolvedValue(user),
      }),
    );

    const r = await renderScreen();
    const root = r.root;

    press(oneByTestID(root, 'settings-notification-reset'));
    await flushPromises();

    // grab the onPress handed to the undo toast and invoke it
    const undoCall = mockedToastShow.mock.calls.find(
      c => c[0]?.text1 === 'settings.notification_reset_toast_title',
    );
    expect(undoCall).toBeDefined();
    act(() => {
      undoCall![0].onPress();
    });
    await flushPromises();

    expect(updateCurrentUser).toHaveBeenNthCalledWith(2, undoPatch);
    // toggle restored to the prior value (enabled = false)
    expect(oneByTestID(root, 'settings-daily-toggle').props.value).toBe(false);
  });

  it('reject: rolls notification settings back to prior + error toast', async () => {
    const unhandled = jest.fn();
    proc.on('unhandledRejection', unhandled);

    const user = makeUser(priorMetadata);
    const updateCurrentUser = jest.fn().mockRejectedValue(new Error('boom'));
    mockedUseAuth.mockReturnValue(
      buildAuth({
        user,
        updateCurrentUser,
        refreshUser: jest.fn().mockResolvedValue(user),
      }),
    );

    const r = await renderScreen();
    const root = r.root;

    // prior value: enabled = false
    expect(oneByTestID(root, 'settings-daily-toggle').props.value).toBe(false);

    press(oneByTestID(root, 'settings-notification-reset'));
    await flushPromises();

    expect(updateCurrentUser).toHaveBeenCalledTimes(1);
    // rolled back to prior (enabled = false), NOT the optimistic default (true)
    expect(oneByTestID(root, 'settings-daily-toggle').props.value).toBe(false);
    expect(mockedToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'settings.toast_title' }),
    );

    await flushPromises();
    proc.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 4. handleResetPreferences branch
// =============================================================================
describe('handleResetPreferences', () => {
  it('is_first_login=false → modal closes + settings synced', async () => {
    const resetUserPreferences = jest.fn().mockResolvedValue(
      makeUser({ style_direction: 'more_relaxed' }), // is_first_login false (makeUser default)
    );
    mockedUseAuth.mockReturnValue(buildAuth({ resetUserPreferences }));

    const r = await renderScreen();
    const root = r.root;

    press(oneByTestID(root, 'settings-delete-data-row'));
    expect(isDialogOpen(root, 'settings-delete-confirm')).toBe(true);

    press(oneByTestID(root, 'settings-delete-confirm'));
    await flushPromises();

    expect(resetUserPreferences).toHaveBeenCalledTimes(1);
    expect(isDialogOpen(root, 'settings-delete-confirm')).toBe(false); // modal closed
    // synced: style direction row now reflects reset value. i18n-wired —
    // t(key) returns the bare key in tests, so the rendered value is the
    // direction label key, not the English string.
    const directionRow = oneByTestID(root, 'settings-style-direction-row');
    const hasRelaxed = directionRow.findAll(
      n =>
        typeof n.type === 'string' &&
        n.children?.[0] === 'settings.direction_relaxed_label',
    );
    expect(hasRelaxed.length).toBeGreaterThan(0);
  });

  it('is_first_login=true → modal stays open, settings NOT synced', async () => {
    const firstLoginUser: User = {
      ...makeUser({ style_direction: 'more_polished' }),
      is_first_login: true,
    };
    const resetUserPreferences = jest.fn().mockResolvedValue(firstLoginUser);
    mockedUseAuth.mockReturnValue(buildAuth({ resetUserPreferences }));

    const r = await renderScreen();
    const root = r.root;

    press(oneByTestID(root, 'settings-delete-data-row'));
    press(oneByTestID(root, 'settings-delete-confirm'));
    await flushPromises();

    expect(resetUserPreferences).toHaveBeenCalledTimes(1);
    expect(isDialogOpen(root, 'settings-delete-confirm')).toBe(true); // stays open
    // NOT synced — direction row still shows default "Stay Balanced"
    const directionRow = oneByTestID(root, 'settings-style-direction-row');
    const polished = directionRow.findAll(
      n => typeof n.type === 'string' && n.children?.[0] === 'More Polished',
    );
    expect(polished.length).toBe(0);
  });

  it('reject → error toast + isResettingPreferences resets (confirm button re-enabled)', async () => {
    const resetUserPreferences = jest
      .fn()
      .mockRejectedValue(new Error('reset failed'));
    mockedUseAuth.mockReturnValue(buildAuth({ resetUserPreferences }));

    const r = await renderScreen();
    const root = r.root;

    press(oneByTestID(root, 'settings-delete-data-row'));
    press(oneByTestID(root, 'settings-delete-confirm'));
    await flushPromises();

    // i18n-wired: t(key) returns the bare key in tests (no i18next instance).
    expect(mockedToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'settings.toast_title' }),
    );
    // button re-enabled (isResettingPreferences back to false)
    expect(oneByTestID(root, 'settings-delete-confirm').props.disabled).toBe(
      false,
    );
  });
});
