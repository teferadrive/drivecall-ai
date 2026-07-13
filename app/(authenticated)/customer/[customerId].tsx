import { useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  MessageSquareText,
  Phone,
  Save,
  UserRound,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type CallSource,
  callSources,
  type LeadStatus,
  leadStatuses,
} from '@/constants/callAssistantCrm';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { tw } from '@/lib/rtl';

const eventIconByType = {
  call: Phone,
  message: MessageSquareText,
  lesson: CalendarDays,
  payment: CreditCard,
  document: FileText,
  reminder: Bell,
  note: FileText,
};

export default function CustomerDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const customerId = params.customerId as Id<'customers'> | undefined;

  const customer = useQuery(
    api.crm.getCustomer,
    customerId ? { customerId } : 'skip'
  );
  const events = useQuery(
    api.crm.listCustomerEvents,
    customerId ? { customerId } : 'skip'
  );
  const updateCustomer = useMutation(api.crm.updateCustomer);
  const logCrmEvent = useMutation(api.crm.logCrmEvent);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [language, setLanguage] = useState('עברית');
  const [status, setStatus] = useState<LeadStatus>('חדש');
  const [preferredCallSource, setPreferredCallSource] =
    useState<CallSource>('שיחה רגילה');
  const [notes, setNotes] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (!customer) {
      return;
    }

    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address ?? '');
    setLanguage(customer.language);
    setStatus(customer.status);
    setPreferredCallSource(customer.preferredCallSource);
    setNotes(customer.notes ?? '');
  }, [customer]);

  const handleSaveCustomer = async () => {
    if (!(customerId && name.trim() && phone.trim())) {
      Alert.alert('חסר מידע', 'שם וטלפון הם שדות חובה.');
      return;
    }

    setIsSaving(true);

    try {
      await updateCustomer({
        customerId,
        name,
        phone,
        address,
        language,
        status,
        notes,
        preferredCallSource,
      });
      Alert.alert('נשמר', 'פרטי הלקוח עודכנו.');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחתי לשמור את פרטי הלקוח.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuickNote = async () => {
    const trimmedNote = quickNote.trim();

    if (!(customerId && trimmedNote)) {
      Alert.alert('חסר מידע', 'כתוב הערה קצרה לפני השמירה.');
      return;
    }

    setIsSavingNote(true);

    try {
      await logCrmEvent({
        customerId,
        type: 'note',
        title: 'הערה מהירה',
        details: trimmedNote,
      });
      setQuickNote('');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחתי לשמור את ההערה.');
    } finally {
      setIsSavingNote(false);
    }
  };

  if (!customerId || customer === null) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8f9ff]" edges={['top']}>
        <Stack.Screen options={{ title: 'לקוח' }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg font-bold text-[#191c21]">
            הלקוח לא נמצא
          </Text>
          <TouchableOpacity
            accessibilityLabel="חזרה לרשימת לקוחות"
            accessibilityRole="button"
            accessible={true}
            className="mt-4 min-h-[48px] justify-center rounded-xl bg-[#005da7] px-5"
            onPress={() => router.back()}
          >
            <Text className="font-bold text-white">חזרה</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (customer === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f8f9ff]">
        <Stack.Screen options={{ title: 'לקוח' }} />
        <ActivityIndicator color="#005da7" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]" edges={['top']}>
      <Stack.Screen options={{ title: customer.name }} />
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
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#d3e3ff]">
                <UserRound size={34} color="#00457f" />
              </View>
              <View className="flex-1">
                <Text className="text-right text-3xl font-bold text-[#191c21]">
                  {customer.name}
                </Text>
                <Text className="mt-1 text-right text-base text-[#00457f]">
                  {customer.phone}
                </Text>
                <Text className="mt-3 self-end rounded-full bg-[#d3e3ff] px-3 py-1 text-sm font-bold text-[#00457f]">
                  {customer.status}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <Text className="mb-3 text-right text-xl font-bold text-[#191c21]">
              עריכת לקוח
            </Text>
            <View className="gap-3">
              <FormField label="שם" onChangeText={setName} value={name} />
              <FormField
                keyboardType="phone-pad"
                label="טלפון"
                onChangeText={setPhone}
                value={phone}
              />
              <FormField
                label="כתובת"
                onChangeText={setAddress}
                value={address}
              />
              <FormField
                label="שפה"
                onChangeText={setLanguage}
                value={language}
              />
              <ChoiceGroup
                label="סטטוס"
                onSelect={(nextStatus) => setStatus(nextStatus)}
                options={leadStatuses}
                selected={status}
              />
              <ChoiceGroup
                label="ערוץ מועדף"
                onSelect={(nextSource) => setPreferredCallSource(nextSource)}
                options={callSources}
                selected={preferredCallSource}
              />
              <FormField
                label="הערות"
                multiline={true}
                onChangeText={setNotes}
                value={notes}
              />
              <TouchableOpacity
                accessibilityLabel="שמירת פרטי לקוח"
                accessibilityRole="button"
                accessible={true}
                className={`${tw.flexRow} min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#005da7] px-4`}
                disabled={isSaving}
                onPress={handleSaveCustomer}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Save size={18} color="#ffffff" />
                )}
                <Text className="text-base font-bold text-white">
                  שמירת שינויים
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <Text className="mb-3 text-right text-xl font-bold text-[#191c21]">
              הערה מהירה
            </Text>
            <TextInput
              accessibilityLabel="כתיבת הערה מהירה"
              className="min-h-[92px] rounded-xl border border-[#c1c7d3] bg-[#f8f9ff] px-4 py-3 text-right text-base leading-6 text-[#191c21]"
              multiline={true}
              onChangeText={setQuickNote}
              placeholder="לדוגמה: לא ענה, לחזור אליו בערב"
              placeholderTextColor="#71717a"
              textAlignVertical="top"
              value={quickNote}
            />
            <TouchableOpacity
              accessibilityLabel="שמירת הערה מהירה"
              accessibilityRole="button"
              accessible={true}
              className={`${tw.flexRow} mt-3 min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#1b6d24] px-4`}
              disabled={isSavingNote}
              onPress={handleSaveQuickNote}
            >
              {isSavingNote ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <FileText size={18} color="#ffffff" />
              )}
              <Text className="text-base font-bold text-white">שמירת הערה</Text>
            </TouchableOpacity>
          </View>

          <View className={`${tw.flexRow} mt-5 flex-wrap gap-3`}>
            <Stat label="שיעורים" value={customer.lessonsCount} />
            <Stat label="הודעות" value={customer.messagesCount} />
            <Stat label="מסמכים" value={customer.documentsCount} />
            <Stat label="יתרה" value={`₪${customer.balance}`} />
          </View>

          <View className="mt-5 rounded-xl border border-[#88d982] bg-[#a0f399] p-4">
            <Text className="text-right text-lg font-bold text-[#002204]">
              המלצת AI
            </Text>
            <Text className="mt-2 text-right text-sm leading-6 text-[#002204]">
              לפי הסטטוס והפעילות האחרונה, מומלץ לשלוח הודעת המשך ולקבוע תזכורת
              להמשך טיפול אם אין תגובה.
            </Text>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <Text className="mb-4 text-right text-xl font-bold text-[#191c21]">
              היסטוריית פעילות
            </Text>

            {events === undefined && <ActivityIndicator color="#005da7" />}

            {events?.length === 0 && (
              <Text className="text-center text-sm text-[#727782]">
                עדיין אין אירועים ללקוח הזה.
              </Text>
            )}

            <View className="gap-3">
              {events?.map((event) => {
                const Icon = eventIconByType[event.type];

                return (
                  <View
                    className={`${tw.flexRow} items-start gap-3 rounded-xl bg-[#f8f9ff] p-3`}
                    key={event._id}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#d3e3ff]">
                      <Icon size={18} color="#005da7" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-right text-base font-bold text-[#191c21]">
                        {event.title}
                      </Text>
                      {event.details && (
                        <Text className="mt-1 text-right text-sm leading-5 text-[#414751]">
                          {event.details}
                        </Text>
                      )}
                      <Text className="mt-2 text-right text-xs text-[#727782]">
                        {formatDateTime(event.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })}
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
  keyboardType?: 'default' | 'phone-pad';
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

function ChoiceGroup<TValue extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: TValue[];
  selected: TValue;
  onSelect: (value: TValue) => void;
}) {
  return (
    <View>
      <Text className="mb-2 text-right text-sm font-bold text-[#414751]">
        {label}
      </Text>
      <View className={`${tw.flexRow} flex-wrap gap-2`}>
        {options.map((option) => (
          <TouchableOpacity
            accessibilityLabel={`${label}: ${option}`}
            accessibilityRole="button"
            accessible={true}
            className={`min-h-[40px] justify-center rounded-full border px-4 ${
              selected === option
                ? 'border-[#005da7] bg-[#d3e3ff]'
                : 'border-[#c1c7d3] bg-[#f8f9ff]'
            }`}
            key={option}
            onPress={() => onSelect(option)}
          >
            <Text className="text-sm font-bold text-[#191c21]">{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="min-w-[140px] flex-1 rounded-xl border border-[#c1c7d3] bg-white p-4">
      <Text className="text-center text-2xl font-bold text-[#191c21]">
        {value}
      </Text>
      <Text className="mt-1 text-center text-sm text-[#727782]">{label}</Text>
    </View>
  );
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
