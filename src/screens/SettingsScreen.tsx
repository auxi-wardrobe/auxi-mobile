import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/layout/Sidebar';
import {
  BottomSheetSurface,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { Icons } from '../assets/icons';
import {
  DailyNotificationFrequency,
  DailyNotificationPeriod,
  User,
  UserMetadata,
  UserStyleDirection,
} from '../types/auth';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Settings'>;
type ActiveModal = 'none' | 'direction' | 'changeTime' | 'deleteConfirm';

type ResolvedSettingsState = {
  dailyNotification: {
    enabled: boolean;
    time: string;
    period: DailyNotificationPeriod;
    frequency: DailyNotificationFrequency;
  };
  styleDirection: UserStyleDirection;
};

const APP_VERSION = '0.0.1';
const DEFAULT_SETTINGS: ResolvedSettingsState = {
  dailyNotification: {
    enabled: true,
    time: '06:15',
    period: 'AM',
    frequency: 'weekdays',
  },
  styleDirection: 'stay_balanced',
};

const DIRECTION_OPTIONS: Array<{
  key: UserStyleDirection;
  label: string;
  description: string;
}> = [
  {
    key: 'stay_balanced',
    label: 'Stay Balanced',
    description: 'Keep learning from my daily choices. No specific bias.',
  },
  {
    key: 'more_relaxed',
    label: 'More Relaxed',
    description: 'Softer looks and easier layers.',
  },
  {
    key: 'more_polished',
    label: 'More Polished',
    description: 'Sharper lines and structured pieces.',
  },
];

const FREQUENCY_OPTIONS: Array<{
  key: DailyNotificationFrequency;
  label: string;
  description?: string;
}> = [
  {
    key: 'weekdays',
    label: 'Weekdays',
    description: 'Mon, Tue, Wed, Thus, Fri',
  },
  {
    key: 'everydays',
    label: 'Everydays',
  },
];

const directionLabelMap: Record<UserStyleDirection, string> = {
  stay_balanced: 'Stay Balanced',
  more_relaxed: 'More Relaxed',
  more_polished: 'More Polished',
};

const frequencyLabelMap: Record<DailyNotificationFrequency, string> = {
  weekdays: 'Weekdays',
  everydays: 'Everydays',
};

const resolveSettings = (
  metadata?: UserMetadata | null,
): ResolvedSettingsState => ({
  dailyNotification: {
    enabled:
      metadata?.daily_notification?.enabled ??
      DEFAULT_SETTINGS.dailyNotification.enabled,
    time:
      metadata?.daily_notification?.time ??
      DEFAULT_SETTINGS.dailyNotification.time,
    period:
      metadata?.daily_notification?.period ??
      DEFAULT_SETTINGS.dailyNotification.period,
    frequency:
      metadata?.daily_notification?.frequency ??
      DEFAULT_SETTINGS.dailyNotification.frequency,
  },
  styleDirection: metadata?.style_direction ?? DEFAULT_SETTINGS.styleDirection,
});

const getErrorStatus = (error: unknown) =>
  (error as { response?: { status?: number } } | undefined)?.response?.status;

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseData = (
    error as
      | {
          response?: {
            data?: {
              detail?: Array<{ msg?: string }>;
              message?: string;
            };
          };
        }
      | undefined
  )?.response?.data;

  return responseData?.detail?.[0]?.msg || responseData?.message || fallback;
};

const showSettingsError = (title: string, message: string) => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: 4000,
  });
};

export const SettingsScreen = () => {
  const navigation = useNavigation<Navigation>();
  const {
    checkAuth,
    refreshUser,
    resetUserPreferences,
    updateCurrentUser,
    user,
  } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] =
    useState<ResolvedSettingsState>(DEFAULT_SETTINGS);
  const [pendingDisplayDirection, setPendingDisplayDirection] =
    useState<UserStyleDirection>(DEFAULT_SETTINGS.styleDirection);
  const [pendingPeriod, setPendingPeriod] = useState<DailyNotificationPeriod>(
    DEFAULT_SETTINGS.dailyNotification.period,
  );
  const [pendingFrequency, setPendingFrequency] =
    useState<DailyNotificationFrequency>(
      DEFAULT_SETTINGS.dailyNotification.frequency,
    );
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [isResettingPreferences, setIsResettingPreferences] = useState(false);
  // Dark Mode: VISUAL-ONLY local stub — no theming infra wired.
  // TODO(settings): dark theme not implemented.
  const [darkModeStub, setDarkModeStub] = useState(false);
  const reminderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const syncFromUser = useCallback((nextUser: User | null) => {
    const nextSettings = resolveSettings(nextUser?.user_metadata);
    setSettings(nextSettings);
    setPendingDisplayDirection(nextSettings.styleDirection);
    setPendingPeriod(nextSettings.dailyNotification.period);
    setPendingFrequency(nextSettings.dailyNotification.frequency);
  }, []);

  useEffect(() => {
    syncFromUser(user);
  }, [syncFromUser, user]);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const refreshedUser = await refreshUser();
        if (isMounted) {
          syncFromUser(refreshedUser);
        }
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to load settings');
        showSettingsError('Settings', message);
        if (getErrorStatus(error) === 401) {
          await checkAuth();
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
      if (reminderSaveTimeoutRef.current) {
        clearTimeout(reminderSaveTimeoutRef.current);
      }
    };
  }, [checkAuth, refreshUser, syncFromUser]);

  const persistUserMetadata = useCallback(
    async (patch: UserMetadata, fallbackMessage: string) => {
      try {
        const updatedUser = await updateCurrentUser({ user_metadata: patch });
        syncFromUser(updatedUser);
        return updatedUser;
      } catch (error) {
        const message = getErrorMessage(error, fallbackMessage);
        showSettingsError('Settings', message);
        if (getErrorStatus(error) === 401) {
          await checkAuth();
        }
        throw error;
      }
    },
    [checkAuth, syncFromUser, updateCurrentUser],
  );

  const currentDirectionLabel = useMemo(
    () => directionLabelMap[settings.styleDirection],
    [settings.styleDirection],
  );

  const currentFrequencyLabel = useMemo(
    () => frequencyLabelMap[settings.dailyNotification.frequency],
    [settings.dailyNotification.frequency],
  );

  const openDirectionModal = () => {
    setPendingDisplayDirection(settings.styleDirection);
    setActiveModal('direction');
  };

  const closeDirectionModal = () => {
    if (isSavingDirection) return;
    setPendingDisplayDirection(settings.styleDirection);
    setActiveModal('none');
  };

  const openChangeTimeModal = () => {
    setPendingPeriod(settings.dailyNotification.period);
    setPendingFrequency(settings.dailyNotification.frequency);
    setActiveModal('changeTime');
  };

  const closeChangeTimeModal = () => {
    if (isSavingTime) return;
    setPendingPeriod(settings.dailyNotification.period);
    setPendingFrequency(settings.dailyNotification.frequency);
    setActiveModal('none');
  };

  const closeDeleteModal = () => {
    if (isResettingPreferences) return;
    setActiveModal('none');
  };

  const handleReminderToggle = (enabled: boolean) => {
    const previousValue = settings.dailyNotification.enabled;

    setSettings(current => ({
      ...current,
      dailyNotification: {
        ...current.dailyNotification,
        enabled,
      },
    }));

    if (reminderSaveTimeoutRef.current) {
      clearTimeout(reminderSaveTimeoutRef.current);
    }

    reminderSaveTimeoutRef.current = setTimeout(() => {
      persistUserMetadata(
        {
          daily_notification: {
            enabled,
          },
        },
        'Failed to update daily time',
      ).catch(() => {
        setSettings(current => ({
          ...current,
          dailyNotification: {
            ...current.dailyNotification,
            enabled: previousValue,
          },
        }));
      });
    }, 500);
  };

  const applyDirection = async () => {
    if (isSavingDirection) return;

    setIsSavingDirection(true);
    try {
      await persistUserMetadata(
        {
          style_direction: pendingDisplayDirection,
        },
        'Failed to update style direction',
      );
      setActiveModal('none');
    } finally {
      setIsSavingDirection(false);
    }
  };

  // Change-time dialog (Frame 3). Per CEO (Q12): the "07:30" time value is
  // READ-ONLY display; only AM/PM (period) + Weekdays/Everydays (frequency)
  // are interactive and persisted — mirrors the enabled-toggle persist path.
  const applyChangeTime = async () => {
    if (isSavingTime) return;

    setIsSavingTime(true);
    try {
      await persistUserMetadata(
        {
          daily_notification: {
            period: pendingPeriod,
            frequency: pendingFrequency,
          },
        },
        'Failed to update daily time',
      );
      setActiveModal('none');
    } finally {
      setIsSavingTime(false);
    }
  };

  const handleResetPreferences = async () => {
    if (isResettingPreferences) return;

    setIsResettingPreferences(true);
    try {
      const updatedUser = await resetUserPreferences();
      if (!updatedUser.is_first_login) {
        syncFromUser(updatedUser);
        setActiveModal('none');
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to reset preferences');
      showSettingsError('Settings', message);
      if (getErrorStatus(error) === 401) {
        await checkAuth();
      }
    } finally {
      setIsResettingPreferences(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <BottomSheetSurface style={styles.sheet}>
        {/* Header — hamburger-left + centered title only (no right icon, qa-ui C1). */}
        <View style={styles.header}>
          <TopIconButton
            testID="settings-menu-button"
            icon={<Icons.Menu width={24} height={24} />}
            onPress={() => setIsSidebarOpen(true)}
          />
          <View pointerEvents="none" style={styles.titleWrap}>
            <Text style={styles.title}>Settings</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Daily Time block */}
          <View style={styles.group}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowLabel}>Daily Time</Text>
              <Switch
                testID="settings-daily-toggle"
                accessibilityLabel="Toggle daily reminder"
                value={settings.dailyNotification.enabled}
                onValueChange={handleReminderToggle}
                trackColor={{
                  false: theme.colors.figmaToggleOffTrack,
                  true: theme.colors.figmaToggleOn,
                }}
                thumbColor={theme.colors.white}
                ios_backgroundColor={theme.colors.figmaToggleOffTrack}
              />
            </View>

            <TouchableOpacity
              testID="settings-time-row"
              accessibilityLabel="Change daily time"
              activeOpacity={0.82}
              style={styles.timeRow}
              onPress={openChangeTimeModal}
            >
              <View style={styles.timeValueWrap}>
                <Text style={styles.timeValueMain} allowFontScaling={false}>
                  {settings.dailyNotification.time}
                </Text>
                <Text style={styles.timeValuePeriod} allowFontScaling={false}>
                  {settings.dailyNotification.period}
                </Text>
              </View>
              <Text style={styles.rowValue}>{currentFrequencyLabel}</Text>
            </TouchableOpacity>
          </View>

          <Divider />

          {/* Style Direction row */}
          <TouchableOpacity
            testID="settings-style-direction-row"
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={openDirectionModal}
          >
            <Text style={styles.rowLabel}>Style Direction</Text>
            <Text style={styles.rowValue}>{currentDirectionLabel}</Text>
          </TouchableOpacity>

          <Divider />

          {/* Privacy control group */}
          <View style={styles.sectionLabelWrap}>
            <Text style={styles.rowLabel}>Privacy control</Text>
          </View>

          <Divider />

          <TouchableOpacity
            testID="settings-your-information-row"
            activeOpacity={0.82}
            style={styles.singleRow}
            // TODO(settings): no route yet — NO-OP per CEO decision.
            onPress={() => {}}
          >
            <Text style={styles.rowLabel}>Your information</Text>
            <Icons.ArrowRight
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            testID="settings-manage-body-row"
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={() => navigation.navigate('Body', { mode: 'photoDetail' })}
          >
            <Text style={styles.rowLabel}>Manage body photo</Text>
            <Icons.ArrowRight
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            testID="settings-delete-data-row"
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={() => setActiveModal('deleteConfirm')}
          >
            {/* Main-list "Delete data" row is NEUTRAL (qa-ui C2) — not red. */}
            <Text style={styles.rowLabel}>Delete data</Text>
            <Icons.Delete
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          </TouchableOpacity>

          <Divider />

          {/* Version row */}
          <View style={styles.versionRow}>
            <Text style={styles.rowLabel}>Version {APP_VERSION}</Text>
          </View>

          <Divider />

          {/* Dark Mode — visual-only toggle stub */}
          <View style={styles.rowHeader}>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch
              testID="settings-dark-mode-toggle"
              accessibilityLabel="Toggle dark mode"
              value={darkModeStub}
              onValueChange={setDarkModeStub}
              trackColor={{
                false: theme.colors.figmaToggleOffTrack,
                true: theme.colors.figmaToggleOn,
              }}
              thumbColor={theme.colors.white}
              ios_backgroundColor={theme.colors.figmaToggleOffTrack}
            />
          </View>

          <Divider />
        </View>
      </BottomSheetSurface>

      {/* Style-direction dialog (Frame 2) */}
      <Modal
        transparent
        animationType="fade"
        visible={activeModal === 'direction'}
        onRequestClose={closeDirectionModal}
      >
        <TouchableWithoutFeedback onPress={closeDirectionModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Adjust your direction</Text>
                <Text style={styles.modalBody}>
                  This shifts your upcoming suggestions.
                </Text>

                <View style={styles.optionList}>
                  {DIRECTION_OPTIONS.map((option, index) => (
                    <TouchableOpacity
                      key={option.key}
                      testID={`settings-direction-option-${option.key}`}
                      activeOpacity={0.82}
                      style={styles.optionRow}
                      onPress={() => setPendingDisplayDirection(option.key)}
                    >
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionTitle}>{option.label}</Text>
                        <Text style={styles.optionDescription}>
                          {option.description}
                        </Text>
                      </View>

                      <Radio
                        selected={pendingDisplayDirection === option.key}
                      />

                      {index < DIRECTION_OPTIONS.length - 1 ? (
                        <View style={styles.optionDivider} />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    testID="settings-direction-cancel"
                    activeOpacity={0.82}
                    disabled={isSavingDirection}
                    style={[
                      styles.modalAction,
                      styles.modalTextAction,
                      isSavingDirection && styles.disabledAction,
                    ]}
                    onPress={closeDirectionModal}
                  >
                    <Text style={styles.modalTextActionLabel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="settings-direction-update"
                    activeOpacity={0.82}
                    disabled={isSavingDirection}
                    style={[
                      styles.modalAction,
                      styles.modalPrimaryAction,
                      isSavingDirection && styles.disabledAction,
                    ]}
                    onPress={applyDirection}
                  >
                    <Text style={styles.modalPrimaryActionLabel}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Change-time dialog (Frame 3) — NEW */}
      <Modal
        transparent
        animationType="fade"
        visible={activeModal === 'changeTime'}
        onRequestClose={closeChangeTimeModal}
      >
        <TouchableWithoutFeedback onPress={closeChangeTimeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Daily Time</Text>

                <View style={styles.timeDialogRow}>
                  {/* Time value is READ-ONLY display (CEO Q12) — no editor. */}
                  <Text style={styles.timeDialogValue} allowFontScaling={false}>
                    {settings.dailyNotification.time.replace(':', ' : ')}
                  </Text>

                  <View style={styles.periodStack}>
                    {(['AM', 'PM'] as DailyNotificationPeriod[]).map(period => (
                      <TouchableOpacity
                        key={period}
                        testID={`settings-time-period-${period.toLowerCase()}`}
                        activeOpacity={0.82}
                        style={styles.periodRow}
                        onPress={() => setPendingPeriod(period)}
                      >
                        <Text style={styles.optionTitle}>{period}</Text>
                        <Radio selected={pendingPeriod === period} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.optionList}>
                  {FREQUENCY_OPTIONS.map((option, index) => (
                    <TouchableOpacity
                      key={option.key}
                      testID={`settings-time-freq-${option.key}`}
                      activeOpacity={0.82}
                      style={styles.optionRow}
                      onPress={() => setPendingFrequency(option.key)}
                    >
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionTitle}>{option.label}</Text>
                        {option.description ? (
                          <Text style={styles.optionDescription}>
                            {option.description}
                          </Text>
                        ) : null}
                      </View>

                      <Radio selected={pendingFrequency === option.key} />

                      {index < FREQUENCY_OPTIONS.length - 1 ? (
                        <View style={styles.optionDivider} />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    testID="settings-time-cancel"
                    activeOpacity={0.82}
                    disabled={isSavingTime}
                    style={[
                      styles.modalAction,
                      styles.modalTextAction,
                      isSavingTime && styles.disabledAction,
                    ]}
                    onPress={closeChangeTimeModal}
                  >
                    <Text style={styles.modalTextActionLabel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="settings-time-update"
                    activeOpacity={0.82}
                    disabled={isSavingTime}
                    style={[
                      styles.modalAction,
                      styles.modalPrimaryAction,
                      isSavingTime && styles.disabledAction,
                    ]}
                    onPress={applyChangeTime}
                  >
                    <Text style={styles.modalPrimaryActionLabel}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete-data dialog (Frame 4) */}
      <Modal
        transparent
        animationType="fade"
        visible={activeModal === 'deleteConfirm'}
        onRequestClose={closeDeleteModal}
      >
        <TouchableWithoutFeedback onPress={closeDeleteModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.deleteModalCard}>
                <Text style={styles.deleteModalTitle}>Delete Data</Text>
                <Text style={styles.modalBody}>
                  Auxi will revert to day one. This cannot be undone.
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    testID="settings-delete-cancel"
                    activeOpacity={0.82}
                    disabled={isResettingPreferences}
                    style={[
                      styles.modalAction,
                      styles.modalTextAction,
                      isResettingPreferences && styles.disabledAction,
                    ]}
                    onPress={closeDeleteModal}
                  >
                    <Text style={styles.modalTextActionLabel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="settings-delete-confirm"
                    activeOpacity={0.82}
                    disabled={isResettingPreferences}
                    style={[
                      styles.modalAction,
                      styles.modalDangerAction,
                      isResettingPreferences && styles.disabledAction,
                    ]}
                    onPress={handleResetPreferences}
                  >
                    <Text style={styles.modalPrimaryActionLabel}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const Divider = () => <View style={styles.divider} />;

// Green M3-style radio (View-based, no SVG). Selected = green ring + green dot.
const Radio = ({ selected }: { selected: boolean }) => (
  <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
    {selected ? <View style={styles.radioInner} /> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaSurface,
  },
  sheet: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 45,
    paddingHorizontal: 22,
  },
  titleWrap: {
    position: 'absolute',
    left: 84,
    right: 84,
    top: 45,
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
  headerSpacer: {
    width: 45,
    height: 45,
  },
  content: {
    flex: 1,
    paddingTop: 112,
    paddingHorizontal: 27,
    paddingBottom: 24,
  },
  group: {
    paddingTop: 8,
  },
  rowHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 12,
  },
  timeValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeValueMain: {
    ...theme.typography.aliases.poppinsTimeLg,
    color: theme.colors.figmaTextDark,
  },
  timeValuePeriod: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextBase,
    marginLeft: 8,
  },
  singleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  rowValue: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.figmaListDivider,
  },
  sectionLabelWrap: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  versionRow: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 27, 34, 0.3)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.uacPanel,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  deleteModalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.uacPanel,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  // Delete-data dialog title is 16/20 (line-height 20), not 24 (artifact §5).
  deleteModalTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.uacTextBase,
  },
  modalBody: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
    marginTop: 16,
  },
  timeDialogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  timeDialogValue: {
    ...theme.typography.aliases.uacH1Bold,
    color: theme.colors.uacTextBase,
  },
  periodStack: {
    gap: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minWidth: 80,
  },
  optionList: {
    marginTop: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    position: 'relative',
    paddingVertical: 8,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  optionDescription: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  optionDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: theme.colors.figmaListDivider,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.uacTextBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  radioOuterActive: {
    borderColor: theme.colors.figmaToggleOn,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.figmaToggleOn,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  modalAction: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextAction: {
    borderRadius: theme.borderRadius.uacRadioPill,
  },
  modalPrimaryAction: {
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.figmaButtonDark,
  },
  modalDangerAction: {
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.figmaDestructive,
  },
  modalTextActionLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
  },
  modalPrimaryActionLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.white,
  },
  disabledAction: {
    opacity: 0.55,
  },
});
