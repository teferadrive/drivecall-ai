import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  copyAsync,
  documentDirectory,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addCallEndedListener,
  addCallStartedListener,
} from '@/lib/androidCallDetection';
import {
  startRecordingService,
  stopRecordingService,
} from '@/lib/recordingService';

// מצב מקליט השיעור:
// - idle: לא מקליט
// - recording: מקליט פעיל
// - paused-manual: המורה השהה ידנית
// - paused-call: הושהה אוטומטית בגלל שיחה נכנסת/יוצאת
export type RecorderStatus =
  | 'idle'
  | 'recording'
  | 'paused-manual'
  | 'paused-call';

export type LessonRecorder = {
  status: RecorderStatus;
  /** משך ההקלטה המצטבר בשניות (לא כולל זמן שהייה). */
  durationSeconds: number;
  /** נתיב קובץ ההקלטה לאחר סיום. */
  recordingUri: string | null;
  isPausedForCall: boolean;
  start: () => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<string | null>;
};

/**
 * מנהל הקלטת שיעור עם השהיה אוטומטית בזמן שיחה.
 *
 * כשמגיעה שיחה (זוהתה על ידי המודול הנייטיב), ההקלטה מושהית אוטומטית
 * ומתחדשת בסיום השיחה - אלא אם המורה השהה ידנית בינתיים.
 * ההקלטה נמשכת עד שהמורה עוצר אותה במפורש.
 */
export function useLessonRecorder(): LessonRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  // צבירת משך: expo-audio מאפס את המונה בכל pause/resume, לכן צוברים ידנית.
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const segmentBaseRef = useRef(0);

  // ref לסטטוס כדי שמאזיני השיחה יראו תמיד את הערך העדכני.
  const statusRef = useRef<RecorderStatus>('idle');
  statusRef.current = status;

  const applyPause = useCallback(() => {
    recorder.pause();
    // שמירת המשך שנצבר עד לרגע ההשהיה.
    setAccumulatedSeconds((prev) => prev + recorderState.durationMillis / 1000);
  }, [recorder, recorderState.durationMillis]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused-manual') {
      return;
    }
    recorder.record();
    setStatus('recording');
  }, [recorder]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'recording') {
      return;
    }
    applyPause();
    setStatus('paused-manual');
  }, [applyPause]);

  // האזנה לשיחות: השהיה בתחילת שיחה, חידוש בסיומה.
  useEffect(() => {
    const removeStart = addCallStartedListener(() => {
      if (statusRef.current === 'recording') {
        applyPause();
        setStatus('paused-call');
      }
    });

    const removeEnd = addCallEndedListener(() => {
      // חידוש רק אם ההשהיה נבעה מהשיחה (לא אם המורה השהה ידנית).
      if (statusRef.current === 'paused-call') {
        recorder.record();
        setStatus('recording');
      }
    });

    return () => {
      removeStart();
      removeEnd();
    };
  }, [applyPause, recorder]);

  const start = useCallback(async (): Promise<boolean> => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      return false;
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });

    setAccumulatedSeconds(0);
    segmentBaseRef.current = 0;
    setRecordingUri(null);

    // הפעלת השירות הקדמי כדי שההקלטה תשרוד כשהאפליקציה ברקע.
    await startRecordingService();

    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus('recording');
    return true;
  }, [recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    if (statusRef.current === 'idle') {
      return null;
    }
    await recorder.stop();
    await stopRecordingService();

    // העברת הקובץ מה-cache הזמני לאחסון קבוע כדי שלא יימחק.
    const tempUri = recorder.uri ?? null;
    const uri = tempUri ? await persistRecording(tempUri) : null;

    setRecordingUri(uri);
    setStatus('idle');
    return uri;
  }, [recorder]);

  // משך כולל = צבירה + הקטע הנוכחי (אם מקליטים כרגע).
  const currentSegment =
    status === 'recording' ? recorderState.durationMillis / 1000 : 0;
  const durationSeconds = Math.floor(accumulatedSeconds + currentSegment);

  return {
    status,
    durationSeconds,
    recordingUri,
    isPausedForCall: status === 'paused-call',
    start,
    pause,
    resume,
    stop,
  };
}

// מעביר קובץ הקלטה מה-cache הזמני לתיקיית recordings קבועה.
// מחזיר את הנתיב הקבוע, או את הנתיב הזמני אם ההעברה נכשלה.
async function persistRecording(tempUri: string): Promise<string> {
  if (!documentDirectory) {
    return tempUri;
  }

  try {
    const dir = `${documentDirectory}recordings/`;
    await makeDirectoryAsync(dir, { intermediates: true });

    const extension = tempUri.split('.').pop() || 'm4a';
    const dest = `${dir}lesson-${Date.now()}.${extension}`;
    await copyAsync({ from: tempUri, to: dest });
    return dest;
  } catch {
    // אם ההעברה נכשלה, לפחות נחזיר את הנתיב הזמני.
    return tempUri;
  }
}
