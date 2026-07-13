# Android Call Detection

This project includes an initial Android native module for regular call-end
detection in a Dev Build.

## Current App Layer

- Android permissions are declared in `app.json`.
- `lib/androidCallDetection.ts` initializes the native module named
  `AndroidCallStateModule`.
- Native Android files live under
  `android/app/src/main/java/com/drivinginstructor/callassistant/`.
- The expected native event is `onCallEnded`.
- The event opens `/(authenticated)/after-call`.
- Expo Go remains safe: if the native module is missing, detection is skipped.

## Expected Native Event Payload

```ts
type NativeCallEndedPayload = {
  phoneNumber?: string;
  contactName?: string;
  durationSeconds?: number;
  direction?: 'incoming' | 'outgoing';
  endedAt?: number;
};
```

## Native Module Contract

The Android native module exposes:

```ts
startListening(): Promise<boolean>
stopListening(): Promise<void>
```

And emit:

```ts
onCallEnded(payload: NativeCallEndedPayload)
```

## Android Notes

- This requires an Android Development Build or production build.
- Expo Go cannot load custom call-state native code.
- Prefer showing the in-app After Call screen or a notification.
- Avoid unsupported overlay behavior on modern Android.
- WhatsApp and virtual-number apps should continue using the manual fallback.
- Incoming phone numbers may be unavailable on newer Android versions depending
  on permission grants, carrier behavior, default dialer status, and OS policy.
- The current module listens while the app process is alive. Background-perfect
  behavior may require a foreground service or a notification-first flow.
