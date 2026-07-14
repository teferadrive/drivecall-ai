import { NativeModules, Platform } from 'react-native';

// גשר להרשאת "גישה להתראות" (Android) - דרושה לזיהוי שיחות WhatsApp.
type NotificationAccessModule = {
  isEnabled?: () => Promise<boolean>;
  openSettings?: () => Promise<boolean>;
};

const nativeModule = NativeModules.NotificationAccessModule as
  | NotificationAccessModule
  | undefined;

// בודק אם המשתמש אישר לאפליקציה גישה להתראות.
export async function isNotificationAccessEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule?.isEnabled) {
    return false;
  }
  try {
    return await nativeModule.isEnabled();
  } catch {
    return false;
  }
}

// פותח את מסך הגדרות "גישה להתראות" של המערכת לאישור המשתמש.
export async function openNotificationAccessSettings(): Promise<void> {
  if (Platform.OS !== 'android' || !nativeModule?.openSettings) {
    return;
  }
  try {
    await nativeModule.openSettings();
  } catch {
    // התעלמות שקטה
  }
}
