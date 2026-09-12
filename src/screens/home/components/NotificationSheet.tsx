import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ContextualBottomSheet } from '../../../components/features/ContextualBottomSheet';
import type { HomeNotification } from '../notifications/notification-feed';
import { styles } from '../styles';

type Props = {
  visible: boolean;
  notifications: HomeNotification[];
  onDismiss: () => void;
  onSelect: (notification: HomeNotification) => void;
};

/**
 * What the Home bell opens: the results the user kicked off and walked away
 * from — a finished "See this on me" render, or an Enhance-image studio shot
 * waiting to be accepted. Tapping a row opens that result.
 *
 * Built on `ContextualBottomSheet` (the shared shell), so it is edge-to-edge
 * with top-corner radius, scrim, swipe-to-dismiss and safe-area handled — no
 * width or horizontal margin of its own (see docs/bottom-sheets.md).
 */
export const NotificationSheet: React.FC<Props> = ({
  visible,
  notifications,
  onDismiss,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="home-landing-notification-sheet"
    >
      <View style={styles.sheetBody}>
        <Text style={styles.sheetTitle}>
          {t('homeLanding.notifications_title')}
        </Text>

        {notifications.length === 0 ? (
          <Text style={styles.sheetEmpty} testID="home-landing-notifications-empty">
            {t('homeLanding.notifications_empty')}
          </Text>
        ) : (
          <ScrollView
            style={styles.sheetList}
            testID="home-landing-notification-list"
            showsVerticalScrollIndicator={false}
          >
            {notifications.map((notification, index) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationRow,
                  index > 0 && styles.notificationDivider,
                ]}
                activeOpacity={0.82}
                testID={`home-landing-notification-${notification.kind}-${index}${
                  notification.seen ? '' : '-unread'
                }`}
                accessibilityRole="button"
                accessibilityLabel={t(
                  notification.kind === 'tryon'
                    ? 'homeLanding.notification_tryon_title'
                    : 'homeLanding.notification_beautify_title',
                )}
                onPress={() => onSelect(notification)}
              >
                <View style={styles.notificationThumb}>
                  {notification.imageUrl ? (
                    <Image
                      source={{ uri: notification.imageUrl }}
                      style={styles.notificationThumbImage}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>

                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>
                    {t(
                      notification.kind === 'tryon'
                        ? 'homeLanding.notification_tryon_title'
                        : 'homeLanding.notification_beautify_title',
                    )}
                  </Text>
                  <Text style={styles.notificationBody} numberOfLines={1}>
                    {notification.kind === 'tryon'
                      ? t('homeLanding.notification_tryon_body')
                      : t('homeLanding.notification_beautify_body', {
                          name:
                            notification.itemName ??
                            t('homeLanding.notification_item_fallback'),
                        })}
                  </Text>
                </View>

                {notification.seen ? null : (
                  <View style={styles.notificationUnreadDot} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </ContextualBottomSheet>
  );
};
