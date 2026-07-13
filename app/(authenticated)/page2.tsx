import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import {
  BellRing,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Plus,
  TrendingUp,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reports } from '@/constants/callAssistantCrm';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { scheduleReminderNotification } from '@/lib/notifications';
import { tw } from '@/lib/rtl';

type CustomerOption = {
  _id: Id<'customers'>;
  name: string;
  phone: string;
  address?: string;
};

const smartAlerts = [
  {
    title: 'לידים שלא קיבלו קישור הרשמה',
    meta: 'בדוק לידים בסטטוס חדש',
    kind: 'lead' as const,
    icon: BellRing,
  },
  {
    title: 'תלמידים שצריכים שיעור נוסף',
    meta: 'מומלץ לשמור על רצף שבועי',
    kind: 'lesson' as const,
    icon: CalendarDays,
  },
  {
    title: 'תשלומים פתוחים',
    meta: 'בדוק יתרות בכרטיסי הלקוח',
    kind: 'payment' as const,
    icon: CreditCard,
  },
];

const alertIcons = {
  lead: BellRing,
  lesson: CalendarDays,
  payment: CreditCard,
  reminder: BellRing,
};

export default function OperationsScreen() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<Id<'customers'>>();
  const [lessonDate, setLessonDate] = useState(getDateInputValue(new Date()));
  const [lessonTime, setLessonTime] = useState('09:00');
  // מצב הבורר הנייטיב: 'date' / 'time' כשפתוח, null כשסגור.
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('40');
  const [lessonNotes, setLessonNotes] = useState('');
  const [reminderTitle, setReminderTitle] = useState('לחזור אליו');
  const [reminderDays, setReminderDays] = useState(1);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);

  const todayRange = useMemo(() => getTodayRange(), []);
  const shouldSkipCrmQueries = isLoading || !isAuthenticated;
  const customers = useQuery(
    api.crm.listCustomers,
    shouldSkipCrmQueries ? 'skip' : {}
  );
  const lessons = useQuery(
    api.crm.listTodayLessons,
    shouldSkipCrmQueries ? 'skip' : todayRange
  );
  const reminders = useQuery(
    api.crm.listOpenReminders,
    shouldSkipCrmQueries ? 'skip' : {}
  );
  const smartAlertsFromServer = useQuery(
    api.crm.getSmartAlerts,
    shouldSkipCrmQueries ? 'skip' : {}
  );
  const reportStats = useQuery(
    api.crm.getReportStats,
    shouldSkipCrmQueries ? 'skip' : {}
  );
  const createLesson = useMutation(api.crm.createLesson);
  const createReminder = useMutation(api.crm.createReminder);
  const completeReminder = useMutation(api.crm.completeReminder);

  const customerOptions = useMemo<CustomerOption[]>(() => {
    if (!customers) {
      return [];
    }

    return customers.map((customer) => ({
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    }));
  }, [customers]);

  const activeCustomerId = selectedCustomerId ?? customerOptions[0]?._id;
  const activeCustomer = customerOptions.find(
    (customer) => customer._id === activeCustomerId
  );
  const visibleSmartAlerts =
    smartAlertsFromServer && smartAlertsFromServer.length > 0
      ? smartAlertsFromServer
      : smartAlerts;
  const visibleReports = reportStats
    ? [
        {
          label: 'המרת לידים לתלמידים',
          value: `${reportStats.leadConversionRate}%`,
          widthClass: percentToWidthClass(reportStats.leadConversionRate),
        },
        {
          label: 'עברו טסט',
          value: `${reportStats.testPassRate}%`,
          widthClass: percentToWidthClass(reportStats.testPassRate),
        },
        {
          label: 'שיחות שטופלו',
          value: `${reportStats.callHandlingRate}%`,
          widthClass: percentToWidthClass(reportStats.callHandlingRate),
        },
      ]
    : reports;

  // ה-Date הנוכחי המורכב מ-state (משמש לאתחול הבורר הנייטיב).
  const lessonDateTime =
    parseLocalDateTime(lessonDate, lessonTime) ?? Date.now();

  // עדכון ה-state בעקבות בחירה בבורר הנייטיב.
  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    // באנדרואיד הבורר נסגר אוטומטית; סוגרים גם בביטול.
    if (Platform.OS === 'android') {
      setPickerMode(null);
    }

    if (event.type === 'dismissed' || !selected) {
      return;
    }

    if (pickerMode === 'date') {
      setLessonDate(getDateInputValue(selected));
    } else if (pickerMode === 'time') {
      setLessonTime(getTimeInputValue(selected));
    }
  };

  const handleCreateLesson = async () => {
    if (!activeCustomerId) {
      Alert.alert('אין לקוח', 'צריך לבחור לקוח לפני קביעת שיעור.');
      return;
    }

    const startsAt = parseLocalDateTime(lessonDate, lessonTime);
    const parsedDuration = Number.parseInt(durationMinutes, 10);

    if (!startsAt || Number.isNaN(parsedDuration) || parsedDuration < 15) {
      Alert.alert('פרטי שיעור לא תקינים', 'בדוק תאריך, שעה ומשך שיעור.');
      return;
    }

    setIsCreatingLesson(true);

    try {
      await createLesson({
        customerId: activeCustomerId,
        startsAt,
        durationMinutes: parsedDuration,
        pickupAddress: activeCustomer?.address,
        notes: lessonNotes,
      });
      setLessonNotes('');
      Alert.alert('נקבע שיעור', 'השיעור נשמר ביומן.', [
        { text: 'סגור', style: 'cancel' },
        {
          text: 'Google Calendar',
          onPress: () => {
            const calendarUrl = buildGoogleCalendarUrl({
              title: `שיעור נהיגה עם ${activeCustomer?.name ?? 'תלמיד'}`,
              startsAt,
              durationMinutes: parsedDuration,
              details: lessonNotes,
              location: activeCustomer?.address,
            });

            Linking.openURL(calendarUrl).catch(() => {
              Alert.alert('שגיאה', 'לא ניתן לפתוח Google Calendar.');
            });
          },
        },
      ]);
    } catch {
      Alert.alert('שגיאה', 'לא הצלחתי לקבוע שיעור.');
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!activeCustomerId) {
      Alert.alert('אין לקוח', 'צריך לבחור לקוח לפני יצירת תזכורת.');
      return;
    }

    if (!reminderTitle.trim()) {
      Alert.alert('חסר טקסט', 'כתוב כותרת לתזכורת.');
      return;
    }

    setIsCreatingReminder(true);

    try {
      const dueAt = addDays(new Date(), reminderDays).getTime();

      await createReminder({
        customerId: activeCustomerId,
        title: reminderTitle,
        dueAt,
      });
      await scheduleReminderNotification({
        title: 'תזכורת CRM',
        body: `${activeCustomer?.name ?? 'לקוח'}: ${reminderTitle}`,
        triggerAt: dueAt,
      });
      Alert.alert('נוצרה תזכורת', 'התזכורת נשמרה.');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחתי ליצור תזכורת.');
    } finally {
      setIsCreatingReminder(false);
    }
  };

  const handleCompleteReminder = async (reminderId: Id<'reminders'>) => {
    try {
      await completeReminder({ reminderId });
    } catch {
      Alert.alert('שגיאה', 'לא הצלחתי לסמן תזכורת כבוצעה.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-5xl mx-auto px-4 pb-28 pt-5">
          <Text className="text-right text-3xl font-bold text-[#191c21]">
            יומן ודוחות
          </Text>
          <Text className="mt-2 text-right text-sm leading-6 text-[#414751]">
            קביעת שיעורים, תזכורות, מעקב יומי וסטטיסטיקות עבודה.
          </Text>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <Text className="mb-3 text-right text-xl font-bold text-[#191c21]">
              בחירת לקוח
            </Text>
            {customers === undefined && <ActivityIndicator color="#005da7" />}
            {customerOptions.length === 0 && customers !== undefined && (
              <Text className="text-right text-sm text-[#727782]">
                אין לקוחות עדיין. צור ליד במסך הלקוחות כדי לקבוע שיעור.
              </Text>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className={`${tw.flexRow} gap-2`}>
                {customerOptions.map((customer) => (
                  <TouchableOpacity
                    accessibilityLabel={`בחירת ${customer.name}`}
                    accessibilityRole="button"
                    accessible={true}
                    className={`min-h-[44px] justify-center rounded-full border px-4 ${
                      activeCustomerId === customer._id
                        ? 'border-[#005da7] bg-[#d3e3ff]'
                        : 'border-[#c1c7d3] bg-[#f8f9ff]'
                    }`}
                    key={customer._id}
                    onPress={() => setSelectedCustomerId(customer._id)}
                  >
                    <Text className="text-sm font-bold text-[#191c21]">
                      {customer.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
              <CalendarDays size={24} color="#005da7" />
              <Text className="flex-1 text-right text-xl font-bold text-[#191c21]">
                קביעת שיעור
              </Text>
            </View>
            <View className="gap-3">
              <View className={`${tw.flexRow} gap-3`}>
                <PickerButton
                  icon={CalendarDays}
                  label="תאריך"
                  onPress={() => setPickerMode('date')}
                  value={formatDateLabel(lessonDate)}
                />
                <PickerButton
                  icon={Clock3}
                  label="שעה"
                  onPress={() => setPickerMode('time')}
                  value={lessonTime}
                />
              </View>
              {pickerMode !== null && (
                <DateTimePicker
                  display="default"
                  mode={pickerMode}
                  onChange={handlePickerChange}
                  value={new Date(lessonDateTime)}
                />
              )}
              <FormField
                keyboardType="number-pad"
                label="משך בדקות"
                onChangeText={setDurationMinutes}
                value={durationMinutes}
              />
              <FormField
                label="הערות לשיעור"
                multiline={true}
                onChangeText={setLessonNotes}
                value={lessonNotes}
              />
              <TouchableOpacity
                accessibilityLabel="קביעת שיעור"
                accessibilityRole="button"
                accessible={true}
                className={`${tw.flexRow} min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#005da7] px-4`}
                disabled={isCreatingLesson}
                onPress={handleCreateLesson}
              >
                {isCreatingLesson ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Plus size={18} color="#ffffff" />
                )}
                <Text className="text-base font-bold text-white">
                  שמירת שיעור
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
              <BellRing size={24} color="#954501" />
              <Text className="flex-1 text-right text-xl font-bold text-[#191c21]">
                תזכורת מהירה
              </Text>
            </View>
            <View className="gap-3">
              <FormField
                label="כותרת תזכורת"
                onChangeText={setReminderTitle}
                value={reminderTitle}
              />
              <View className={`${tw.flexRow} gap-2`}>
                {[0, 1, 3].map((days) => (
                  <TouchableOpacity
                    accessibilityLabel={`תזכורת בעוד ${days} ימים`}
                    accessibilityRole="button"
                    accessible={true}
                    className={`min-h-[44px] flex-1 justify-center rounded-xl border px-3 ${
                      reminderDays === days
                        ? 'border-[#954501] bg-[#ffdbc8]'
                        : 'border-[#c1c7d3] bg-[#f8f9ff]'
                    }`}
                    key={days}
                    onPress={() => setReminderDays(days)}
                  >
                    <Text className="text-center text-sm font-bold text-[#191c21]">
                      {days === 0 ? 'היום' : days === 1 ? 'מחר' : 'עוד 3 ימים'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                accessibilityLabel="שמירת תזכורת"
                accessibilityRole="button"
                accessible={true}
                className={`${tw.flexRow} min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#954501] px-4`}
                disabled={isCreatingReminder}
                onPress={handleCreateReminder}
              >
                {isCreatingReminder ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Plus size={18} color="#ffffff" />
                )}
                <Text className="text-base font-bold text-white">
                  שמירת תזכורת
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
              <CalendarDays size={24} color="#005da7" />
              <View className="flex-1">
                <Text className="text-right text-xl font-bold text-[#191c21]">
                  היום ביומן
                </Text>
                <Text className="text-right text-sm text-[#727782]">
                  שיעורים שנשמרו ב-Convex
                </Text>
              </View>
            </View>

            {lessons === undefined && <ActivityIndicator color="#005da7" />}
            {lessons?.length === 0 && (
              <Text className="text-center text-sm text-[#727782]">
                אין שיעורים להיום.
              </Text>
            )}

            <View className="gap-3">
              {lessons?.map((lesson) => (
                <View
                  className={`${tw.flexRow} items-start gap-3 rounded-xl bg-[#f8f9ff] p-3`}
                  key={lesson._id}
                >
                  <View className="items-center">
                    <Clock3 size={18} color="#00457f" />
                    <Text className="mt-1 text-xs font-bold text-[#00457f]">
                      {formatTime(lesson.startsAt)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-right text-base font-bold text-[#191c21]">
                      שיעור עם {lesson.customerName}
                    </Text>
                    <Text className="mt-1 text-right text-sm text-[#727782]">
                      {lesson.durationMinutes} דקות
                      {lesson.pickupAddress ? ` · ${lesson.pickupAddress}` : ''}
                    </Text>
                    {lesson.notes && (
                      <Text className="mt-1 text-right text-sm text-[#414751]">
                        {lesson.notes}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#ffb68b] bg-[#ffdbc8] p-4">
            <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
              <BellRing size={24} color="#954501" />
              <Text className="flex-1 text-right text-xl font-bold text-[#191c21]">
                תזכורות פתוחות
              </Text>
            </View>

            {reminders === undefined && <ActivityIndicator color="#954501" />}
            {reminders?.length === 0 && (
              <Text className="text-center text-sm text-[#753400]">
                אין תזכורות פתוחות.
              </Text>
            )}

            <View className="gap-3">
              {reminders?.map((reminder) => (
                <View
                  className={`${tw.flexRow} items-center gap-3 rounded-xl bg-[#f8f9ff] p-3`}
                  key={reminder._id}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#ffdbc8]">
                    <BellRing size={18} color="#954501" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-right text-sm font-bold text-[#191c21]">
                      {reminder.title}
                    </Text>
                    <Text className="mt-1 text-right text-xs text-[#753400]">
                      {reminder.customerName} · {formatDateTime(reminder.dueAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityLabel="סימון תזכורת כבוצעה"
                    accessibilityRole="button"
                    accessible={true}
                    className="min-h-[40px] justify-center rounded-xl bg-[#1b6d24] px-3"
                    onPress={() => handleCompleteReminder(reminder._id)}
                  >
                    <Text className="text-xs font-bold text-white">בוצע</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#ffb68b] bg-[#ffdbc8] p-4">
            <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
              <BellRing size={24} color="#954501" />
              <Text className="flex-1 text-right text-xl font-bold text-[#191c21]">
                התראות חכמות
              </Text>
            </View>

            <View className="gap-3">
              {visibleSmartAlerts.map((alert) => {
                const AlertIcon = alertIcons[alert.kind];

                return (
                  <View
                    className={`${tw.flexRow} items-center gap-3`}
                    key={alert.title}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#f8f9ff]">
                      <AlertIcon size={18} color="#954501" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-right text-sm font-bold text-[#191c21]">
                        {alert.title}
                      </Text>
                      <Text className="mt-1 text-right text-xs text-[#753400]">
                        {alert.meta}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <View className={`${tw.flexRow} mb-4 items-center gap-3`}>
              <TrendingUp size={24} color="#1b6d24" />
              <Text className="flex-1 text-right text-xl font-bold text-[#191c21]">
                דוחות וסטטיסטיקות
              </Text>
            </View>

            <View className="gap-4">
              {visibleReports.map((report) => (
                <View key={report.label}>
                  <View
                    className={`${tw.flexRow} mb-2 items-center justify-between`}
                  >
                    <Text className="font-bold text-[#1b6d24]">
                      {report.value}
                    </Text>
                    <Text className="text-right text-sm text-[#414751]">
                      {report.label}
                    </Text>
                  </View>
                  <View className="h-3 overflow-hidden rounded-full bg-[#e7e8ef]">
                    <View
                      className={`h-full rounded-full bg-emerald-400 ${report.widthClass}`}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <View className={`${tw.flexRow} items-start gap-3`}>
              <CheckCircle2 size={24} color="#005da7" />
              <Text className="flex-1 text-right text-sm leading-6 text-[#414751]">
                סנכרון Google Calendar הוא השלב הבא: כרגע השיעורים נשמרים ביומן
                הפנימי, ובהמשך אפשר להוסיף חיבור לחשבון Google.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View>
      <Text className="mb-2 text-right text-sm font-bold text-[#414751]">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        className={`rounded-xl border border-[#c1c7d3] bg-[#f8f9ff] px-4 py-3 text-right text-base text-[#191c21] ${
          multiline ? 'min-h-[92px] leading-6' : 'min-h-[48px]'
        }`}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#71717a"
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

// כפתור שפותח את בורר התאריך/שעה הנייטיב ומציג את הערך הנבחר.
function PickerButton({
  label,
  value,
  icon: Icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
  onPress: () => void;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-right text-sm font-bold text-[#414751]">
        {label}
      </Text>
      <TouchableOpacity
        accessibilityHint={`בחירת ${label}`}
        accessibilityLabel={`${label}: ${value}`}
        accessibilityRole="button"
        accessible={true}
        className={`${tw.flexRow} min-h-[48px] items-center gap-2 rounded-xl border border-[#c1c7d3] bg-[#f8f9ff] px-4 py-3`}
        onPress={onPress}
      >
        <Icon size={18} color="#005da7" />
        <Text className="flex-1 text-right text-base font-bold text-[#191c21]">
          {value}
        </Text>
      </TouchableOpacity>
    </View>
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

function getDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getTimeInputValue(value: Date) {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

// תצוגת תאריך קריאה למשתמש (dd.mm.yyyy) מתוך מחרוזת YYYY-MM-DD.
function formatDateLabel(dateValue: string) {
  const [year, month, day] = dateValue.split('-');
  if (!(year && month && day)) {
    return dateValue;
  }
  return `${day}.${month}.${year}`;
}

function parseLocalDateTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);

  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);

  return next;
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function buildGoogleCalendarUrl({
  title,
  startsAt,
  durationMinutes,
  details,
  location,
}: {
  title: string;
  startsAt: number;
  durationMinutes: number;
  details?: string;
  location?: string;
}) {
  const startDate = new Date(startsAt);
  const endDate = new Date(startsAt + durationMinutes * 60 * 1000);
  const dates = `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details: details ?? '',
    location: location ?? '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatGoogleCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function percentToWidthClass(value: number) {
  if (value >= 90) {
    return 'w-[90%]';
  }

  if (value >= 80) {
    return 'w-[80%]';
  }

  if (value >= 70) {
    return 'w-[70%]';
  }

  if (value >= 60) {
    return 'w-[60%]';
  }

  if (value >= 50) {
    return 'w-[50%]';
  }

  if (value >= 40) {
    return 'w-[40%]';
  }

  if (value >= 30) {
    return 'w-[30%]';
  }

  if (value >= 20) {
    return 'w-[20%]';
  }

  if (value >= 10) {
    return 'w-[10%]';
  }

  return 'w-[4%]';
}
