import { LinearGradient } from 'expo-linear-gradient';
import { Check, Mic, Pause, Phone, Play, Square } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { tw } from '@/lib/rtl';
import { useLessonRecorder } from '@/lib/useLessonRecorder';

// כרטיס הקלטת שיעור: מתחיל/משהה/עוצר, ומשהה אוטומטית בזמן שיחה.
// כרגע שומר את האודיו במכשיר; תמלול וסיכום יתווספו בשלב הבא.
export function LessonRecorderCard({
  onFinished,
}: {
  onFinished?: (uri: string) => void;
}) {
  const recorder = useLessonRecorder();
  const [consent, setConsent] = useState(false);

  const isActive = recorder.status !== 'idle';

  const handleStart = async () => {
    if (!consent) {
      Alert.alert(
        'הסכמת התלמיד',
        'יש לאשר שהתלמיד יודע שהשיעור מוקלט לפני תחילת ההקלטה.'
      );
      return;
    }

    const ok = await recorder.start();
    if (!ok) {
      Alert.alert(
        'אין הרשאה',
        'כדי להקליט שיעור צריך לאשר גישה למיקרופון בהגדרות.'
      );
    }
  };

  const handleStop = async () => {
    const uri = await recorder.stop();
    if (uri) {
      onFinished?.(uri);
      Alert.alert('ההקלטה הסתיימה', 'השיעור נשמר. סיכום אוטומטי יתווסף בקרוב.');
    }
  };

  return (
    <View className="rounded-2xl border border-[#c1c7d3] bg-white p-5">
      <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
        <View className="rounded-xl bg-[#d3e3ff] p-2.5">
          <Mic size={26} color="#005da7" />
        </View>
        <Text className="flex-1 text-right text-2xl font-bold text-[#191c21]">
          הקלטת שיעור
        </Text>
      </View>

      {/* טיימר + סטטוס */}
      <View className="mb-5 items-center rounded-2xl bg-[#f8f9ff] py-6">
        <Text className="text-5xl font-bold text-[#191c21]">
          {formatDuration(recorder.durationSeconds)}
        </Text>
        <StatusPill status={recorder.status} />
      </View>

      {/* אינדיקטור השהיה אוטומטית בשיחה */}
      {recorder.isPausedForCall && (
        <View
          className={`${tw.flexRow} mb-4 items-center justify-center gap-2 rounded-xl bg-[#ffdbc8] py-3`}
        >
          <Phone size={20} color="#954501" />
          <Text className="text-base font-bold text-[#954501]">
            מושהה אוטומטית - שיחה פעילה
          </Text>
        </View>
      )}

      {/* הסכמת התלמיד (לפני התחלה) */}
      {!isActive && (
        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          className={`${tw.flexRow} mb-4 items-center gap-3`}
          onPress={() => setConsent(!consent)}
        >
          <View
            className={`h-7 w-7 items-center justify-center rounded-md border-2 ${
              consent
                ? 'border-[#005da7] bg-[#005da7]'
                : 'border-[#c1c7d3] bg-transparent'
            }`}
          >
            {consent && <Check color="#ffffff" size={18} />}
          </View>
          <Text className="flex-1 text-right text-base text-[#414751]">
            התלמיד יודע ומסכים שהשיעור מוקלט
          </Text>
        </TouchableOpacity>
      )}

      {/* כפתורי שליטה */}
      {isActive ? (
        <View className={`${tw.flexRow} gap-3`}>
          {recorder.status === 'recording' ? (
            <ControlButton
              icon={Pause}
              label="השהה"
              onPress={recorder.pause}
              tone="neutral"
            />
          ) : (
            <ControlButton
              disabled={recorder.status === 'paused-call'}
              icon={Play}
              label="המשך"
              onPress={recorder.resume}
              tone="neutral"
            />
          )}
          <ControlButton
            icon={Square}
            label="סיים שיעור"
            onPress={handleStop}
            tone="danger"
          />
        </View>
      ) : (
        <TouchableOpacity
          accessibilityLabel="התחל הקלטת שיעור"
          accessibilityRole="button"
          activeOpacity={0.85}
          className="overflow-hidden rounded-2xl"
          onPress={handleStart}
        >
          <LinearGradient
            className={`${tw.flexRow} items-center justify-center gap-2 py-5`}
            colors={['#00457f', '#005da7', '#1b6d24']}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
          >
            <Mic size={26} color="#ffffff" />
            <Text className="text-xl font-bold text-white">
              התחל הקלטת שיעור
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    idle: { label: 'מוכן להקלטה', bg: 'bg-[#e7e8ef]', text: 'text-[#414751]' },
    recording: { label: '● מקליט', bg: 'bg-[#ffdad6]', text: 'text-[#b71c1c]' },
    'paused-manual': {
      label: 'מושהה',
      bg: 'bg-[#e7e8ef]',
      text: 'text-[#414751]',
    },
    'paused-call': {
      label: 'מושהה - שיחה',
      bg: 'bg-[#ffdbc8]',
      text: 'text-[#954501]',
    },
  };
  const s = map[status] ?? map.idle;

  return (
    <View className={`mt-3 rounded-full px-4 py-1.5 ${s.bg}`}>
      <Text className={`text-base font-bold ${s.text}`}>{s.label}</Text>
    </View>
  );
}

function ControlButton({
  icon: Icon,
  label,
  onPress,
  tone,
  disabled = false,
}: {
  icon: typeof Mic;
  label: string;
  onPress: () => void;
  tone: 'neutral' | 'danger';
  disabled?: boolean;
}) {
  const bg = tone === 'danger' ? 'bg-[#b71c1c]' : 'bg-[#005da7]';

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.85}
      className={`${tw.flexRow} min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 ${bg} ${
        disabled ? 'opacity-50' : ''
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      <Icon size={22} color="#ffffff" />
      <Text className="text-lg font-bold text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
