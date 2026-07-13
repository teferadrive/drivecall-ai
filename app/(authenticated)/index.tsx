import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bot, UserRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  dashboardMetrics,
  externalNumberFlow,
  latestCall,
  latestExternalNumberCall,
  quickActions,
  readyMessages,
} from '@/constants/callAssistantCrm';
import { api } from '@/convex/_generated/api';
import { tw } from '@/lib/rtl';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const primaryActions = quickActions.slice(0, 8);
  const [activeCall, setActiveCall] = useState(latestCall);
  const logCall = useMutation(api.crm.logCall);
  const todayRange = useMemo(() => getTodayRange(), []);
  const dashboardStats = useQuery(
    api.crm.getDashboardStats,
    isLoading || !isAuthenticated ? 'skip' : todayRange
  );
  const liveDashboardMetrics = useMemo(() => {
    if (!dashboardStats) {
      return dashboardMetrics;
    }

    const [calls, leads, newStudents, activeStudents, reminders, tasks] =
      dashboardMetrics;

    return [
      {
        ...calls,
        value: String(dashboardStats.callsToday),
        trend: `${dashboardStats.unhandledCalls} שיחות שלא טופלו`,
      },
      {
        ...leads,
        value: String(dashboardStats.newLeads),
        trend: 'לידים בסטטוס חדש',
      },
      {
        ...newStudents,
        value: String(dashboardStats.newStudents),
        trend: 'לקוחות שהתקדמו לשיעור',
      },
      {
        ...activeStudents,
        value: String(dashboardStats.activeStudents),
        trend: `${dashboardStats.lessonsToday} שיעורים היום`,
      },
      {
        ...reminders,
        value: String(dashboardStats.remindersToday),
        trend: `${dashboardStats.openReminders} תזכורות פתוחות`,
      },
      {
        ...tasks,
        value: String(dashboardStats.tasksToday),
        trend: 'שיעורים ותזכורות להיום',
      },
    ];
  }, [dashboardStats]);

  const handleExternalNumberCall = async () => {
    setActiveCall(latestExternalNumberCall);

    try {
      await logCall({
        customerName: latestExternalNumberCall.name,
        phone: latestExternalNumberCall.phone,
        direction: latestExternalNumberCall.direction,
        source: latestExternalNumberCall.source,
        handled: false,
      });
    } catch {
      // The UI should still open even if Convex is offline or not deployed yet.
    }

    // פתיחת מסך "אחרי שיחה" לתיעוד ידני מהיר של השיחה במספר הנוסף.
    router.push({
      pathname: '/(authenticated)/after-call',
      params: {
        contactName: latestExternalNumberCall.name,
        direction: 'incoming',
        endedAt: String(Date.now()),
        source: 'external-number',
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-5xl mx-auto px-4 pb-28 pt-5">
          <LinearGradient
            colors={['#00457f', '#005da7', '#1b6d24']}
            className="mb-5 overflow-hidden rounded-xl border border-white/10 p-5"
          >
            <View className={`${tw.flexRow} items-start justify-between gap-4`}>
              <View className="h-14 w-14 items-center justify-center rounded-xl bg-white/10">
                <Bot size={30} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className={`text-right text-3xl font-bold text-white`}>
                  עוזר שיחות חכם
                </Text>
                <Text className="mt-2 text-right text-base leading-6 text-[#d3e3ff]">
                  CRM מהיר למורה נהיגה: שיחות, לידים,
                  תלמידים, שיעורים ותזכורות במקום אחד.
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View className={`${tw.flexRow} mb-5 flex-wrap gap-3`}>
            {liveDashboardMetrics.map((metric) => (
              <View
                className="min-w-[150px] flex-1 rounded-xl border border-[#c1c7d3] bg-white p-4"
                key={metric.label}
              >
                <View
                  className={`${tw.flexRow} mb-3 items-center justify-between`}
                >
                  <View className="rounded-md bg-[#d3e3ff] p-2">
                    <metric.icon size={18} color="#005da7" />
                  </View>
                  <Text className="text-right text-sm text-[#414751]">
                    {metric.label}
                  </Text>
                </View>
                <Text className="text-right text-3xl font-bold text-[#191c21]">
                  {metric.value}
                </Text>
                <Text className="mt-1 text-right text-xs text-[#727782]">
                  {metric.trend}
                </Text>
              </View>
            ))}
          </View>

          <View className="mb-5 rounded-xl border border-[#a3c9ff] bg-[#d3e3ff] p-4">
            <TouchableOpacity
              accessibilityHint="פותח את מסך אחרי שיחה עם נתוני בדיקה"
              accessibilityLabel="בדיקת מסך אחרי שיחה"
              accessibilityRole="button"
              accessible={true}
              className={`${tw.flexRow} mb-3 min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#e7e8ef] px-4 py-3`}
              onPress={() =>
                router.push({
                  pathname: '/(authenticated)/after-call',
                  params: {
                    phoneNumber: '0527441930',
                    contactName: 'לקוח בדיקה',
                    durationSeconds: '258',
                    direction: 'incoming',
                    endedAt: String(Date.now()),
                    source: 'regular',
                  },
                })
              }
            >
              <Text className="text-center text-base font-bold text-[#191c21]">
                בדיקת מסך אחרי שיחה
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityHint="מציג תיעוד מהיר לשיחה שבוצעה באפליקציית המספר הנוסף"
              accessibilityLabel="סיימתי שיחה במספר הנוסף"
              accessibilityRole="button"
              accessible={true}
              className={`${tw.flexRow} mb-4 min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#005da7] px-4 py-3`}
              onPress={handleExternalNumberCall}
            >
              <Text className="text-center text-base font-bold text-white">
                סיימתי שיחה במספר הנוסף
              </Text>
            </TouchableOpacity>

            <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#e7e8ef]">
                <UserRound size={26} color="#00457f" />
              </View>
              <View className="flex-1">
                <Text className="text-right text-xs text-[#00457f]">
                  מסך אחרי שיחה
                </Text>
                <Text className="text-right text-xl font-bold text-[#191c21]">
                  {activeCall.name}
                </Text>
              </View>
            </View>

            <View className="gap-2">
              <InfoRow label="טלפון" value={activeCall.phone} />
              <InfoRow label="משך שיחה" value={activeCall.duration} />
              <InfoRow label="תאריך ושעה" value={activeCall.dateTime} />
              <InfoRow label="סוג שיחה" value={activeCall.direction} />
              <InfoRow label="מקור" value={activeCall.source} />
              <InfoRow label="לקוח" value={activeCall.customerType} />
            </View>

            <View className="mt-4 rounded-xl border border-[#88d982] bg-[#a0f399] p-3">
              <View className={`${tw.flexRow} items-center gap-2`}>
                <Bot size={18} color="#1b6d24" />
                <Text className="flex-1 text-right text-sm leading-5 text-[#002204]">
                  {activeCall.aiRecommendation}
                </Text>
              </View>
            </View>
          </View>

          <SectionTitle
            subtitle="פתרון אמין לאפליקציות מספר וירטואלי בלי API רשמי"
            title="תמיכה במספר הנוסף"
          />
          <View className="mb-5 gap-3">
            {externalNumberFlow.map((step) => (
              <View
                className={`${tw.flexRow} items-start gap-3 rounded-xl border border-[#c1c7d3] bg-white p-4`}
                key={step.title}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#d3e3ff]">
                  <step.icon size={20} color="#005da7" />
                </View>
                <View className="flex-1">
                  <Text className="text-right text-base font-bold text-[#191c21]">
                    {step.title}
                  </Text>
                  <Text className="mt-1 text-right text-sm leading-5 text-[#414751]">
                    {step.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <SectionTitle
            subtitle="פעולות לאחר שיחה בלחיצה אחת"
            title="פעולות מהירות"
          />
          <View className={`${tw.flexRow} mb-5 flex-wrap gap-3`}>
            {primaryActions.map((action) => (
              <View
                className="min-h-[92px] min-w-[150px] flex-1 rounded-xl border border-[#c1c7d3] bg-white p-3"
                key={action.label}
              >
                <View className={`${tw.flexRow} items-start gap-3`}>
                  <View className={`rounded-md p-2 ${toneClass(action.tone)}`}>
                    <action.icon size={18} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-right text-sm font-bold text-[#191c21]">
                      {action.label}
                    </Text>
                    <Text className="mt-1 text-right text-xs leading-4 text-[#414751]">
                      {action.detail}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <SectionTitle
            subtitle="תבניות מוכנות ל-WhatsApp או SMS"
            title="הודעות מוכנות"
          />
          <View className="gap-3">
            {readyMessages.map((message, index) => (
              <View
                className="rounded-xl border border-[#c1c7d3] bg-white p-4"
                key={message}
              >
                <View className={`${tw.flexRow} items-start gap-3`}>
                  <View className="h-8 w-8 items-center justify-center rounded-md bg-[#d3e3ff]">
                    <Text className="font-bold text-[#00457f]">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-right text-sm leading-6 text-[#191c21]">
                    {message}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return {
    dayStart: start.getTime(),
    dayEnd: end.getTime(),
  };
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-3">
      <Text className="text-right text-2xl font-bold text-[#191c21]">
        {title}
      </Text>
      <Text className="mt-1 text-right text-sm text-[#727782]">{subtitle}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className={`${tw.flexRow} items-center justify-between`}>
      <Text className="text-sm font-medium text-[#191c21]">{value}</Text>
      <Text className="text-sm text-[#414751]">{label}</Text>
    </View>
  );
}

function toneClass(tone: 'primary' | 'neutral' | 'success' | 'danger') {
  if (tone === 'primary') {
    return 'bg-[#005da7]';
  }

  if (tone === 'success') {
    return 'bg-[#1b6d24]';
  }

  if (tone === 'danger') {
    return 'bg-red-600';
  }

  return 'bg-[#727782]';
}
