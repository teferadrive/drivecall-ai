import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_CHANNEL_ID = 'crm-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleReminderNotification({
  title,
  body,
  triggerAt,
}: {
  title: string;
  body: string;
  triggerAt: number;
}) {
  const hasPermission = await ensureNotificationPermissions();

  if (!hasPermission) {
    return false;
  }

  const safeTriggerAt =
    triggerAt > Date.now() ? triggerAt : Date.now() + 5 * 1000;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: safeTriggerAt,
      channelId: REMINDER_CHANNEL_ID,
    },
  });

  return true;
}

async function ensureNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'תזכורות CRM',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();

  return requested.granted;
}
