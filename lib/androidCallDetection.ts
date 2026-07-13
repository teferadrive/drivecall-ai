import { router } from 'expo-router';
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

type NativeCallEndedPayload = {
  phoneNumber?: string;
  contactName?: string;
  durationSeconds?: number;
  direction?: 'incoming' | 'outgoing';
  endedAt?: number;
};

type AndroidCallStateModule = {
  startListening?: () => Promise<boolean>;
  stopListening?: () => Promise<void>;
};

const nativeModule = NativeModules.AndroidCallStateModule as
  | AndroidCallStateModule
  | undefined;

let subscription: { remove: () => void } | undefined;
let startSubscription: { remove: () => void } | undefined;
let didInitialize = false;

// מנויים חיצוניים לאירועי תחילת/סיום שיחה (למשל מקליט השיעור).
// מאפשר לרכיבים אחרים להגיב לשיחות בלי לגעת בלוגיקת הניווט.
type CallListener = () => void;
const callStartedListeners = new Set<CallListener>();
const callEndedListeners = new Set<CallListener>();

export function addCallStartedListener(listener: CallListener) {
  callStartedListeners.add(listener);
  return () => callStartedListeners.delete(listener);
}

export function addCallEndedListener(listener: CallListener) {
  callEndedListeners.add(listener);
  return () => callEndedListeners.delete(listener);
}

export async function initializeAndroidCallDetection() {
  if (Platform.OS !== 'android') {
    return {
      available: false,
      reason: 'android-only',
    };
  }

  if (!nativeModule?.startListening) {
    return {
      available: false,
      reason: 'native-module-missing',
    };
  }

  if (didInitialize) {
    return {
      available: true,
      reason: 'already-initialized',
    };
  }

  const hasPermissions = await requestCallPermissions();

  if (!hasPermissions) {
    return {
      available: false,
      reason: 'permissions-denied',
    };
  }

  const eventEmitter = new NativeEventEmitter(
    NativeModules.AndroidCallStateModule
  );

  startSubscription = eventEmitter.addListener('onCallStarted', () => {
    for (const listener of callStartedListeners) {
      listener();
    }
  });

  subscription = eventEmitter.addListener(
    'onCallEnded',
    (payload: NativeCallEndedPayload) => {
      for (const listener of callEndedListeners) {
        listener();
      }

      router.push({
        pathname: '/(authenticated)/after-call',
        params: {
          phoneNumber: payload.phoneNumber ?? '',
          contactName: payload.contactName ?? '',
          durationSeconds: String(payload.durationSeconds ?? 0),
          direction: payload.direction ?? 'incoming',
          endedAt: String(payload.endedAt ?? Date.now()),
          source: 'regular',
        },
      });
    }
  );

  await nativeModule.startListening();
  didInitialize = true;

  return {
    available: true,
    reason: 'initialized',
  };
}

export async function stopAndroidCallDetection() {
  subscription?.remove();
  subscription = undefined;
  startSubscription?.remove();
  startSubscription = undefined;

  if (Platform.OS === 'android' && nativeModule?.stopListening) {
    await nativeModule.stopListening();
  }

  didInitialize = false;
}

async function requestCallPermissions() {
  if (Platform.OS !== 'android') {
    return false;
  }

  const permissions = [
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  ];

  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);

  return permissions.every(
    (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED
  );
}
