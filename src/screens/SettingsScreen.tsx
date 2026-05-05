import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { BottomSheetSurface, TopIconButton } from '../components/primitives/FigmaPrimitives';
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
type ActiveModal = 'none' | 'direction' | 'deleteConfirm';

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

const directionLabelMap: Record<UserStyleDirection, string> = {
  stay_balanced: 'Stay Balanced',
  more_relaxed: 'More Relaxed',
  more_polished: 'More Polished',
};

const frequencyLabelMap: Record<DailyNotificationFrequency, string> = {
  weekdays: 'Weekdays',
  everydays: 'Every day',
};

const badgeForLabel = (label: string) => {
  const words = label.split(' ').filter(Boolean);
  if (words[0] === 'More' && words[1]) return words[1][0];
  return words[0]?.[0] || 'A';
};

const resolveSettings = (metadata?: UserMetadata | null): ResolvedSettingsState => ({
  dailyNotification: {
    enabled: metadata?.daily_notification?.enabled ?? DEFAULT_SETTINGS.dailyNotification.enabled,
    time: metadata?.daily_notification?.time ?? DEFAULT_SETTINGS.dailyNotification.time,
    period: metadata?.daily_notification?.period ?? DEFAULT_SETTINGS.dailyNotification.period,
    frequency: metadata?.daily_notification?.frequency ?? DEFAULT_SETTINGS.dailyNotification.frequency,
  },
  styleDirection: metadata?.style_direction ?? DEFAULT_SETTINGS.styleDirection,
});

const getErrorStatus = (error: unknown) =>
  (error as { response?: { status?: number } } | undefined)?.response?.status;

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseData = (error as {
    response?: {
      data?: {
        detail?: Array<{ msg?: string }>;
        message?: string;
      };
    };
  } | undefined)?.response?.data;

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
  const { checkAuth, refreshUser, resetUserPreferences, updateCurrentUser, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<ResolvedSettingsState>(DEFAULT_SETTINGS);
  const [pendingDisplayDirection, setPendingDisplayDirection] =
    useState<UserStyleDirection>(DEFAULT_SETTINGS.styleDirection);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [isResettingPreferences, setIsResettingPreferences] = useState(false);
  const reminderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncFromUser = useCallback((nextUser: User | null) => {
    const nextSettings = resolveSettings(nextUser?.user_metadata);
    setSettings(nextSettings);
    setPendingDisplayDirection(nextSettings.styleDirection);
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

  const closeDeleteModal = () => {
    if (isResettingPreferences) return;
    setActiveModal('none');
  };

  const handleReminderToggle = (enabled: boolean) => {
    const previousValue = settings.dailyNotification.enabled;

    setSettings((current) => ({
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
        setSettings((current) => ({
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
        <View style={styles.header}>
          <TopIconButton icon={<Icons.Menu width={24} height={24} />} onPress={() => setIsSidebarOpen(true)} />
          <View pointerEvents="none" style={styles.titleWrap}>
            <Text style={styles.title}>Setting</Text>
          </View>
          <View style={styles.feedbackWrap}>
            <Icons.Feedback width={24} height={24} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.group}>
            <View style={styles.rowHeader}>
              <Text style={styles.mutedText}>Daily Time</Text>
              <Switch
                value={settings.dailyNotification.enabled}
                onValueChange={handleReminderToggle}
                trackColor={{ false: '#D6D8DE', true: '#3AA0D8' }}
                thumbColor={theme.colors.white}
                ios_backgroundColor="#D6D8DE"
              />
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.timeValue}>
                <Text style={styles.timeValueMain}>{settings.dailyNotification.time}</Text>
                <Text style={styles.timeValueSuffix}>{` ${settings.dailyNotification.period}`}</Text>
              </Text>
              <Text style={styles.rowValue}>{currentFrequencyLabel}</Text>
            </View>
          </View>

          <Divider />

          <TouchableOpacity activeOpacity={0.82} style={styles.singleRow} onPress={openDirectionModal}>
            <Text style={styles.rowLabel}>Style Direction</Text>
            <Text style={styles.rowValue}>{currentDirectionLabel}</Text>
          </TouchableOpacity>

          <Divider />

          <View style={styles.sectionLabelWrap}>
            <Text style={styles.sectionLabel}>Privacy control</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={() => navigation.navigate('Body')}
          >
            <Text style={styles.rowLabel}>Manage body photo</Text>
            <Icons.ChevronRight width={20} height={20} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.singleRow}
            onPress={() => setActiveModal('deleteConfirm')}
          >
            <Text style={styles.deleteLabel}>Delete data</Text>
            <DeleteGlyph />
          </TouchableOpacity>

          <Divider />

          <View style={styles.versionRow}>
            <Text style={styles.versionText}>Version {APP_VERSION}</Text>
          </View>

          <Divider />
        </View>
      </BottomSheetSurface>

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
                <Text style={styles.modalBody}>This shifts your upcoming suggestions.</Text>

                <View style={styles.optionList}>
                  {DIRECTION_OPTIONS.map((option, index) => (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.82}
                      style={styles.optionRow}
                      onPress={() => setPendingDisplayDirection(option.key)}
                    >
                      <View style={styles.optionBadge}>
                        <Text style={styles.optionBadgeText}>{badgeForLabel(option.label)}</Text>
                      </View>

                      <View style={styles.optionCopy}>
                        <Text style={styles.optionTitle}>{option.label}</Text>
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      </View>

                      <View
                        style={[
                          styles.radioOuter,
                          pendingDisplayDirection === option.key && styles.radioOuterActive,
                        ]}
                      >
                        {pendingDisplayDirection === option.key ? <View style={styles.radioInner} /> : null}
                      </View>

                      {index < DIRECTION_OPTIONS.length - 1 ? <View style={styles.optionDivider} /> : null}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
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
                    activeOpacity={0.82}
                    disabled={isSavingDirection}
                    style={[
                      styles.modalAction,
                      styles.modalPrimaryAction,
                      isSavingDirection && styles.disabledAction,
                    ]}
                    onPress={applyDirection}
                  >
                    <Text style={styles.modalPrimaryActionLabel}>Update Focus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
                <Text style={styles.modalTitle}>Delete Data</Text>
                <Text style={styles.modalBody}>
                  Auxi will revert to day one. This cannot be undone.
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
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
                    activeOpacity={0.82}
                    disabled={isResettingPreferences}
                    style={[
                      styles.modalAction,
                      styles.modalDangerAction,
                      isResettingPreferences && styles.disabledAction,
                    ]}
                    onPress={handleResetPreferences}
                  >
                    <Text style={styles.modalPrimaryActionLabel}>Reset preferences</Text>
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

const DeleteGlyph = () => (
  <View style={styles.deleteGlyph}>
    <View style={styles.deleteLid} />
    <View style={styles.deleteBody}>
      <View style={styles.deleteColumn} />
      <View style={styles.deleteColumn} />
      <View style={styles.deleteColumn} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191B22',
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
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaText,
  },
  feedbackWrap: {
    width: 47,
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  mutedText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextSecondary,
  },
  timeRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  timeValue: {
    color: '#333333',
  },
  timeValueMain: {
    fontFamily: 'ArchivoNarrow-Regular',
    fontSize: 44,
    lineHeight: 44,
    color: '#333333',
  },
  timeValueSuffix: {
    fontFamily: 'ArchivoNarrow-Regular',
    fontSize: 20,
    lineHeight: 24,
    color: '#333333',
  },
  singleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  rowValue: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.figmaDivider,
  },
  sectionLabelWrap: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  sectionLabel: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextSecondary,
  },
  deleteLabel: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaRed,
  },
  deleteGlyph: {
    width: 18,
    height: 18,
    alignItems: 'center',
  },
  deleteLid: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.figmaRed,
    marginBottom: 2,
  },
  deleteBody: {
    width: 12,
    height: 12,
    borderWidth: 1.6,
    borderColor: theme.colors.figmaRed,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 1,
  },
  deleteColumn: {
    width: 1,
    height: 6,
    backgroundColor: theme.colors.figmaRed,
  },
  versionRow: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  versionText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 27, 34, 0.3)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  deleteModalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    marginTop: 118,
  },
  modalTitle: {
    fontFamily: 'ArchivoNarrow-Regular',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.15,
    color: theme.colors.figmaText,
  },
  modalBody: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
    marginTop: 16,
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
  optionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EADDFE',
    marginRight: 16,
  },
  optionBadgeText: {
    ...theme.typography.aliases.archivoButton,
    color: '#4F378A',
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  optionDescription: {
    fontFamily: 'ArchivoNarrow-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.figmaTextMuted,
  },
  optionDivider: {
    position: 'absolute',
    left: 56,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: theme.colors.figmaDivider,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.figmaTextMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  radioOuterActive: {
    borderColor: '#3AA0D8',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3AA0D8',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  modalAction: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextAction: {
    borderRadius: 100,
  },
  modalPrimaryAction: {
    borderRadius: 16,
    backgroundColor: theme.colors.figmaAction,
  },
  modalDangerAction: {
    borderRadius: 16,
    backgroundColor: '#D34F3E',
  },
  modalTextActionLabel: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  modalPrimaryActionLabel: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.white,
  },
  disabledAction: {
    opacity: 0.55,
  },
});
