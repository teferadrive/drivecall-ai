import { useMutation } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/convex/_generated/api';
import { tw } from '@/lib/rtl';

export default function AfterCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phoneNumber?: string;
    contactName?: string;
    durationSeconds?: string;
    direction?: 'incoming' | 'outgoing';
    endedAt?: string;
    source?: 'regular' | 'external-number' | 'whatsapp';
  }>();
  const logCall = useMutation(api.crm.logCall);

  const phoneNumber = params.phoneNumber || 'לא זוהה מספר';
  const contactName = params.contactName || 'לקוח חדש';
  const durationSeconds = Number.parseInt(params.durationSeconds ?? '0', 10);
  const endedAt = Number.parseInt(params.endedAt ?? String(Date.now()), 10);
  const direction = params.direction === 'outgoing' ? 'יוצאת' : 'נכנסת';
  const source =
    params.source === 'external-number'
      ? 'המספר הנוסף'
      : params.source === 'whatsapp'
        ? 'WhatsApp'
        : 'שיחה רגילה';

  const handleSaveCall = async () => {
    try {
      await logCall({
        customerName: contactName,
        phone: phoneNumber,
        direction,
        source,
        durationSeconds,
        handled: false,
      });
      Alert.alert('נשמר', 'השיחה תועדה ב-CRM.');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחתי לתעד את השיחה.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]" edges={['top']}>
      <Stack.Screen options={{ title: 'אחרי שיחה' }} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-5xl mx-auto px-4 pb-28 pt-5">
          <TouchableOpacity
            accessibilityLabel="חזרה"
            accessibilityRole="button"
            accessible={true}
            className={`${tw.flexRow} mb-4 min-h-[44px] items-center gap-2 self-end rounded-xl bg-white px-4`}
            onPress={() => router.back()}
          >
            <ArrowRight size={18} color="#005da7" />
            <Text className="font-bold text-[#00457f]">חזרה</Text>
          </TouchableOpacity>

          <View className="rounded-xl border border-[#a3c9ff] bg-[#d3e3ff] p-5">
            <View className={`${tw.flexRow} items-start gap-4`}>
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#e7e8ef]">
                <Text className="text-4xl">👤</Text>
              </View>
              <View className="flex-1">
                <Text className="text-right text-sm text-[#00457f]">
                  מסך אחרי שיחה
                </Text>
                <Text className="mt-1 text-right text-3xl font-bold text-[#191c21]">
                  {contactName}
                </Text>
                <Text className="mt-1 text-right text-base text-[#414751]">
                  {phoneNumber}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <InfoRow label="מקור" value={source} />
            <InfoRow label="סוג שיחה" value={direction} />
            <InfoRow label="משך" value={formatDuration(durationSeconds)} />
            <InfoRow label="תאריך ושעה" value={formatDateTime(endedAt)} />
            <InfoRow label="לקוח" value="חדש או קיים לפי הטלפון" />
          </View>

          <View className="mt-5 rounded-xl border border-[#88d982] bg-[#a0f399] p-4">
            <View className={`${tw.flexRow} items-start gap-3`}>
              <Text className="text-2xl">🤖</Text>
              <Text className="flex-1 text-right text-base leading-6 text-[#002204]">
                מומלץ לתעד את השיחה, לשלוח הודעת המשך, ואם אין מענה לקבוע תזכורת
                חזרה.
              </Text>
            </View>
          </View>

          <View className={`${tw.flexRow} mt-5 flex-wrap gap-3`}>
            <QuickAction
              emoji="📞"
              label="תיעוד שיחה"
              onPress={handleSaveCall}
            />
            <QuickAction
              emoji="💬"
              label="שליחת הודעה"
              onPress={() => router.push('/(authenticated)/page1')}
            />
            <QuickAction
              emoji="📅"
              label="קביעת תזכורת"
              onPress={() => router.push('/(authenticated)/page2')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className={`${tw.flexRow} items-center justify-between py-2`}>
      <Text className="max-w-[65%] text-right text-sm font-medium text-[#191c21]">
        {value}
      </Text>
      <Text className="text-right text-sm text-[#727782]">{label}</Text>
    </View>
  );
}

function QuickAction({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      accessible={true}
      className={`${tw.flexRow} min-h-[52px] min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#005da7] px-4`}
      onPress={onPress}
    >
      <Text className="text-xl">{emoji}</Text>
      <Text className="text-base font-bold text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function formatDuration(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
