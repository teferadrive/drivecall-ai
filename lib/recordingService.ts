import { NativeModules, Platform } from 'react-native';

// גשר לשירות ההקלטה הקדמי הנייטיב (Android בלבד).
// מחזיק את ההקלטה חיה כשהאפליקציה ברקע/ממוזערת.
type RecordingServiceModule = {
  start?: () => Promise<boolean>;
  stop?: () => Promise<boolean>;
};

const nativeModule = NativeModules.RecordingServiceModule as
  | RecordingServiceModule
  | undefined;

// מתחיל את השירות הקדמי (התראה קבועה) כדי שההקלטה תשרוד ברקע.
// לא זמין ב-Expo Go או ב-iOS - נכשל בשקט ומחזיר false.
export async function startRecordingService(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule?.start) {
    return false;
  }
  try {
    return await nativeModule.start();
  } catch {
    return false;
  }
}

// עוצר את השירות הקדמי ומסיר את ההתראה.
export async function stopRecordingService(): Promise<void> {
  if (Platform.OS !== 'android' || !nativeModule?.stop) {
    return;
  }
  try {
    await nativeModule.stop();
  } catch {
    // התעלמות שקטה
  }
}
