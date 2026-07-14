import { useMutation, useQuery } from 'convex/react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { deleteAsync } from 'expo-file-system/legacy';
import { Mic, Pause, Play, Trash2 } from 'lucide-react-native';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { tw } from '@/lib/rtl';

// כרטיס הקלטות השיעור של תלמיד: רשימה + השמעה + מחיקה.
export function RecordingsCard({
  customerId,
}: {
  customerId: Id<'customers'>;
}) {
  const recordings = useQuery(api.crm.listCustomerRecordings, { customerId });
  const deleteRecording = useMutation(api.crm.deleteLessonRecording);

  const handleDelete = (
    recordingId: Id<'lessonRecordings'>,
    fileUri: string
  ) => {
    Alert.alert('מחיקת הקלטה', 'למחוק את ההקלטה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecording({ recordingId });
            // מחיקת הקובץ מהמכשיר (מתעלמים אם כבר לא קיים).
            await deleteAsync(fileUri, { idempotent: true }).catch(() => {
              // ignore
            });
          } catch {
            Alert.alert('שגיאה', 'לא הצלחתי למחוק את ההקלטה.');
          }
        },
      },
    ]);
  };

  return (
    <View className="rounded-2xl border border-[#c1c7d3] bg-white p-5">
      <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
        <View className="rounded-xl bg-[#d3e3ff] p-2.5">
          <Mic size={26} color="#005da7" />
        </View>
        <Text className="flex-1 text-right text-2xl font-bold text-[#191c21]">
          הקלטות שיעור
        </Text>
      </View>

      {recordings === undefined && (
        <Text className="text-right text-sm text-[#727782]">טוען...</Text>
      )}

      {recordings?.length === 0 && (
        <Text className="text-right text-sm text-[#727782]">
          עדיין אין הקלטות. הקלט שיעור ממסך היומן.
        </Text>
      )}

      <View className="gap-3">
        {recordings?.map((rec) => (
          <RecordingRow
            durationSeconds={rec.durationSeconds}
            fileUri={rec.fileUri}
            key={rec._id}
            onDelete={() => handleDelete(rec._id, rec.fileUri)}
            recordedAt={rec.recordedAt}
          />
        ))}
      </View>
    </View>
  );
}

function RecordingRow({
  fileUri,
  durationSeconds,
  recordedAt,
  onDelete,
}: {
  fileUri: string;
  durationSeconds: number;
  recordedAt: number;
  onDelete: () => void;
}) {
  const player = useAudioPlayer(fileUri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      // אם ההשמעה הסתיימה, מתחילים מחדש מההתחלה.
      if (status.didJustFinish || status.currentTime >= status.duration) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <View
      className={`${tw.flexRow} items-center justify-between rounded-xl border border-[#c1c7d3] bg-[#f8f9ff] px-4 py-3`}
    >
      <TouchableOpacity
        accessibilityLabel={status.playing ? 'השהה' : 'נגן'}
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-full bg-[#005da7]"
        onPress={toggle}
      >
        {status.playing ? (
          <Pause color="#ffffff" size={22} />
        ) : (
          <Play color="#ffffff" size={22} />
        )}
      </TouchableOpacity>

      <View className="flex-1 px-3">
        <Text className="text-right text-base font-bold text-[#191c21]">
          {formatDate(recordedAt)}
        </Text>
        <Text className="text-right text-sm text-[#727782]">
          משך: {formatDuration(durationSeconds)}
        </Text>
      </View>

      <TouchableOpacity
        accessibilityLabel="מחיקת הקלטה"
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-full bg-[#ffdad6]"
        onPress={onDelete}
      >
        <Trash2 color="#b71c1c" size={20} />
      </TouchableOpacity>
    </View>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
