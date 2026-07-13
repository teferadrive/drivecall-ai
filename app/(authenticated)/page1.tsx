import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import {
  Edit3,
  FileText,
  Map as MapIcon,
  MessageSquareText,
  Navigation,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRoundSearch,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type CallSource,
  defaultWhatsAppSenderNumber,
  customers as demoCustomers,
  type LeadStatus,
  leadStatuses,
} from '@/constants/callAssistantCrm';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { tw } from '@/lib/rtl';

type DisplayCustomer = {
  _id?: Id<'customers'>;
  id?: string;
  name: string;
  phone: string;
  address?: string;
  language: string;
  status: LeadStatus;
  notes?: string;
  createdAt?: number | string;
  updatedAt?: number;
  lastCallAt?: string;
  nextAction?: string;
  preferredCallSource: CallSource;
  balance?: number;
  lessons?: number;
  lessonsCount?: number;
  messages?: number;
  messagesCount?: number;
  documents?: number;
  documentsCount?: number;
};

export default function CrmScreen() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<
    LeadStatus | undefined
  >();
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const convexCustomers = useQuery(
    api.crm.listCustomers,
    isLoading || !isAuthenticated
      ? 'skip'
      : {
          search,
          status: selectedStatus,
        }
  );
  const createCustomer = useMutation(api.crm.createCustomer);
  const updateCustomerStatus = useMutation(api.crm.updateCustomerStatus);
  const removeCustomer = useMutation(api.crm.removeCustomer);
  const logCrmEvent = useMutation(api.crm.logCrmEvent);

  const displayCustomers = useMemo<DisplayCustomer[]>(() => {
    if (convexCustomers && convexCustomers.length > 0) {
      return convexCustomers;
    }

    if (convexCustomers === undefined) {
      return demoCustomers;
    }

    return [];
  }, [convexCustomers]);

  const handleCreateCustomer = useCallback(async () => {
    const trimmedName = newName.trim();
    const trimmedPhone = newPhone.trim();

    if (!trimmedName || !trimmedPhone) {
      Alert.alert(
        'חסר מידע',
        'צריך למלא שם וטלפון כדי ליצור ליד.'
      );
      return;
    }

    setIsCreating(true);

    try {
      await createCustomer({
        name: trimmedName,
        phone: trimmedPhone,
        language: 'עברית',
        status: 'חדש',
        preferredCallSource: 'המספר הנוסף',
        notes: 'נוצר דרך טופס ליד מהיר באפליקציה.',
      });
      setNewName('');
      setNewPhone('');
    } catch {
      Alert.alert(
        'שגיאה',
        'לא הצלחתי לשמור את הליד. נסה שוב.'
      );
    } finally {
      setIsCreating(false);
    }
  }, [createCustomer, newName, newPhone]);

  const handleMoveStatus = useCallback(
    async (customer: DisplayCustomer) => {
      if (!customer._id) {
        Alert.alert(
          'מצב דמו',
          'שמירה זמינה רק ללקוחות שנוצרו במסד הנתונים.'
        );
        return;
      }

      const currentIndex = leadStatuses.indexOf(customer.status);
      const nextStatus =
        leadStatuses[Math.min(currentIndex + 1, leadStatuses.length - 1)];

      try {
        await updateCustomerStatus({
          customerId: customer._id,
          status: nextStatus,
        });
      } catch {
        Alert.alert('שגיאה', 'לא הצלחתי לעדכן סטטוס.');
      }
    },
    [updateCustomerStatus]
  );

  const handleDeleteCustomer = useCallback(
    (customer: DisplayCustomer) => {
      if (!customer._id) {
        Alert.alert(
          'מצב דמו',
          'מחיקה זמינה רק ללקוחות שנוצרו במסד הנתונים.'
        );
        return;
      }

      const customerId = customer._id;

      Alert.alert('מחיקת ליד', `למחוק את ${customer.name}?`, [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחיקה',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCustomer({ customerId });
            } catch {
              Alert.alert('שגיאה', 'לא הצלחתי למחוק את הליד.');
            }
          },
        },
      ]);
    },
    [removeCustomer]
  );

  const handleOpenCustomer = useCallback(
    (customer: DisplayCustomer) => {
      if (!customer._id) {
        Alert.alert(
          'מצב דמו',
          'כרטיס מלא זמין רק ללקוחות שנוצרו במסד הנתונים.'
        );
        return;
      }

      router.push({
        pathname: '/(authenticated)/customer/[customerId]',
        params: { customerId: customer._id },
      });
    },
    [router]
  );

  const recordEvent = useCallback(
    async (
      customer: DisplayCustomer,
      type: 'call' | 'message' | 'document' | 'reminder',
      title: string,
      details?: string
    ) => {
      if (!customer._id) {
        return;
      }

      try {
        await logCrmEvent({
          customerId: customer._id,
          type,
          title,
          details,
        });
      } catch {
        // The external action is more important than blocking on event logging.
      }
    },
    [logCrmEvent]
  );

  const openUrl = useCallback(async (url: string, fallbackMessage: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        Alert.alert('לא ניתן לפתוח', fallbackMessage);
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert('שגיאה', fallbackMessage);
    }
  }, []);

  const openUrlWithFallback = useCallback(
    async (
      primaryUrl: string,
      fallbackUrl: string,
      fallbackMessage: string
    ) => {
      try {
        const canOpenPrimary = await Linking.canOpenURL(primaryUrl);

        if (canOpenPrimary) {
          await Linking.openURL(primaryUrl);
          return;
        }

        await openUrl(fallbackUrl, fallbackMessage);
      } catch {
        await openUrl(fallbackUrl, fallbackMessage);
      }
    },
    [openUrl]
  );

  const handleCall = useCallback(
    async (customer: DisplayCustomer) => {
      await recordEvent(customer, 'call', 'חיוג חוזר', customer.phone);
      await openUrl(
        `tel:${normalizePhone(customer.phone)}`,
        'לא ניתן לפתוח חיוג במכשיר הזה.'
      );
    },
    [openUrl, recordEvent]
  );

  const handleSms = useCallback(
    async (customer: DisplayCustomer) => {
      const message =
        'היי, שמחתי לדבר איתך. אפשר להמשיך מכאן לתיאום שיעור.';
      await recordEvent(customer, 'message', 'נשלח SMS', message);
      await openUrl(
        `sms:${normalizePhone(customer.phone)}?body=${encodeURIComponent(message)}`,
        'לא ניתן לפתוח SMS במכשיר הזה.'
      );
    },
    [openUrl, recordEvent]
  );

  const handleWhatsApp = useCallback(
    async (customer: DisplayCustomer) => {
      const message =
        'היי, שמחתי לדבר איתך. מצורף קישור הרשמה לשיעורי נהיגה.';
      const targetPhone = normalizePhoneForWhatsApp(customer.phone);
      const encodedMessage = encodeURIComponent(message);

      await recordEvent(
        customer,
        'message',
        `נפתחה הודעת WhatsApp ממספר העבודה ${defaultWhatsAppSenderNumber}`,
        message
      );
      await openUrlWithFallback(
        `whatsapp://send?phone=${targetPhone}&text=${encodedMessage}`,
        `https://wa.me/${targetPhone}?text=${encodedMessage}`,
        'לא ניתן לפתוח WhatsApp במכשיר הזה.'
      );
    },
    [openUrlWithFallback, recordEvent]
  );

  const handleMaps = useCallback(
    async (customer: DisplayCustomer) => {
      const query = encodeURIComponent(customer.address || customer.name);
      await recordEvent(
        customer,
        'reminder',
        'נפתח ניווט',
        customer.address
      );
      await openUrl(
        `https://www.google.com/maps/search/?api=1&query=${query}`,
        'לא ניתן לפתוח מפות במכשיר הזה.'
      );
    },
    [openUrl, recordEvent]
  );

  const handleWaze = useCallback(
    async (customer: DisplayCustomer) => {
      const query = encodeURIComponent(customer.address || customer.name);
      await recordEvent(
        customer,
        'reminder',
        'נפתח Waze',
        customer.address
      );
      await openUrl(
        `https://waze.com/ul?q=${query}&navigate=yes`,
        'לא ניתן לפתוח Waze במכשיר הזה.'
      );
    },
    [openUrl, recordEvent]
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-5xl mx-auto px-4 pb-28 pt-5">
          <Text className="text-right text-3xl font-bold text-[#191c21]">
            CRM תלמידים
          </Text>
          <Text className="mt-2 text-right text-sm leading-6 text-[#414751]">
            ניהול לידים, תלמידים פעילים, היסטוריית
            שיחות, הודעות, שיעורים, תשלומים ומסמכים.
          </Text>
          <View className="mt-4 rounded-xl border border-[#88d982] bg-[#a0f399] p-3">
            <Text className="text-right text-sm font-bold text-[#002204]">
              WhatsApp עבודה: {defaultWhatsAppSenderNumber}
            </Text>
            <Text className="mt-1 text-right text-xs leading-5 text-[#002204]/80">
              אם יש כמה אפליקציות WhatsApp במכשיר, Android
              יפתח את האפליקציה שמוגדרת כברירת מחדל
              לקישורי WhatsApp.
            </Text>
          </View>

          <View className="mt-5 rounded-xl border border-[#c1c7d3] bg-white p-4">
            <Text className="mb-3 text-right text-lg font-bold text-[#191c21]">
              ליד מהיר
            </Text>
            <View className="gap-3">
              <TextInput
                accessibilityLabel="שם ליד חדש"
                className="min-h-[48px] rounded-xl border border-[#c1c7d3] bg-[#f8f9ff] px-4 text-right text-base text-[#191c21]"
                onChangeText={setNewName}
                placeholder="שם מלא"
                placeholderTextColor="#71717a"
                value={newName}
              />
              <TextInput
                accessibilityLabel="טלפון ליד חדש"
                className="min-h-[48px] rounded-xl border border-[#c1c7d3] bg-[#f8f9ff] px-4 text-right text-base text-[#191c21]"
                keyboardType="phone-pad"
                onChangeText={setNewPhone}
                placeholder="טלפון"
                placeholderTextColor="#71717a"
                value={newPhone}
              />
              <TouchableOpacity
                accessibilityLabel="שמירת ליד חדש"
                accessibilityRole="button"
                accessible={true}
                className={`${tw.flexRow} min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#005da7] px-4`}
                disabled={isCreating}
                onPress={handleCreateCustomer}
              >
                {isCreating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Plus size={18} color="#ffffff" />
                )}
                <Text className="text-base font-bold text-white">
                  שמירת ליד
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            className={`${tw.flexRow} mt-5 items-center gap-3 rounded-xl border border-[#c1c7d3] bg-white px-4 py-3`}
          >
            <Search size={20} color="#71717a" />
            <TextInput
              accessibilityLabel="חיפוש לקוח"
              className="flex-1 text-right text-base text-[#191c21]"
              onChangeText={setSearch}
              placeholder="חיפוש לפי שם, טלפון, סטטוס או תאריך"
              placeholderTextColor="#71717a"
              value={search}
            />
          </View>

          <ScrollView
            className="mt-4"
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View className={`${tw.flexRow} gap-2`}>
              <TouchableOpacity
                accessibilityLabel="הצגת כל הסטטוסים"
                accessibilityRole="button"
                accessible={true}
                className={`rounded-full border px-4 py-2 ${
                  selectedStatus
                    ? 'border-[#c1c7d3] bg-white'
                    : 'border-[#005da7] bg-[#d3e3ff]'
                }`}
                onPress={() => setSelectedStatus(undefined)}
              >
                <Text className="text-sm font-medium text-[#191c21]">
                  הכל
                </Text>
              </TouchableOpacity>
              {leadStatuses.map((status) => (
                <TouchableOpacity
                  accessibilityLabel={`סינון לפי ${status}`}
                  accessibilityRole="button"
                  accessible={true}
                  className={`rounded-full border px-4 py-2 ${
                    selectedStatus === status
                      ? 'border-[#005da7] bg-[#d3e3ff]'
                      : 'border-[#c1c7d3] bg-white'
                  }`}
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text className="text-sm font-medium text-[#191c21]">
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {convexCustomers === undefined && (
            <Text className="mt-3 text-right text-xs text-[#727782]">
              טוען נתונים מ-Convex. בינתיים מוצגים נתוני
              דמו.
            </Text>
          )}

          <View className="mt-5 gap-4">
            {displayCustomers.map((customer) => (
              <View
                className="rounded-xl border border-[#c1c7d3] bg-white p-4"
                key={String(customer._id ?? customer.id ?? customer.phone)}
              >
                <View className={`${tw.flexRow} items-start gap-3`}>
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-[#d3e3ff]">
                    <Text className="text-xl font-bold text-[#00457f]">
                      {customer.name.slice(0, 1)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View
                      className={`${tw.flexRow} items-center justify-between gap-3`}
                    >
                      <Text className="rounded-full bg-[#d3e3ff] px-3 py-1 text-xs font-bold text-[#00457f]">
                        {customer.status}
                      </Text>
                      <Text className="text-right text-xl font-bold text-[#191c21]">
                        {customer.name}
                      </Text>
                    </View>
                    <Text className="mt-1 text-right text-sm text-[#414751]">
                      {customer.phone} · {customer.address ?? 'אין כתובת'}
                    </Text>
                    <Text className="mt-3 text-right text-sm leading-6 text-[#414751]">
                      {customer.notes ?? 'אין הערות עדיין.'}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 rounded-xl bg-[#f8f9ff] p-3">
                  <InfoRow label="שפה" value={customer.language} />
                  <InfoRow
                    label="ערוץ מועדף"
                    value={customer.preferredCallSource}
                  />
                  <InfoRow
                    label="תאריך יצירת קשר"
                    value={formatDate(customer.createdAt)}
                  />
                  <InfoRow
                    label="שיחה אחרונה"
                    value={customer.lastCallAt ?? 'טרם תועדה שיחה'}
                  />
                  <InfoRow
                    label="פעולה מומלצת"
                    value={
                      customer.nextAction ??
                      'לשלוח הודעת המשך ולקבוע תזכורת.'
                    }
                  />
                </View>

                <View className={`${tw.flexRow} mt-4 flex-wrap gap-2`}>
                  <MiniStat
                    label="שיעורים"
                    value={String(customer.lessonsCount ?? customer.lessons)}
                  />
                  <MiniStat
                    label="הודעות"
                    value={String(customer.messagesCount ?? customer.messages)}
                  />
                  <MiniStat
                    label="מסמכים"
                    value={String(
                      customer.documentsCount ?? customer.documents
                    )}
                  />
                  <MiniStat
                    label="יתרה"
                    value={`₪${customer.balance ?? 0}`}
                  />
                </View>

                <View className={`${tw.flexRow} mt-4 gap-2`}>
                  <ActionButton
                    icon={Phone}
                    label="חיוג"
                    onPress={() => handleCall(customer)}
                  />
                  <ActionButton
                    icon={MessageSquareText}
                    label="SMS"
                    onPress={() => handleSms(customer)}
                  />
                  <ActionButton
                    icon={MessageSquareText}
                    label="WhatsApp"
                    onPress={() => handleWhatsApp(customer)}
                  />
                  <TouchableOpacity
                    accessibilityLabel={`העברת ${customer.name} לסטטוס הבא`}
                    accessibilityRole="button"
                    accessible={true}
                    className={`${tw.flexRow} min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#e7e8ef] px-2`}
                    onPress={() => handleMoveStatus(customer)}
                  >
                    <Edit3 size={16} color="#005da7" />
                    <Text className="text-xs font-bold text-[#191c21]">
                      סטטוס
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className={`${tw.flexRow} mt-2 gap-2`}>
                  <ActionButton
                    icon={UserRoundSearch}
                    label="כרטיס"
                    onPress={() => handleOpenCustomer(customer)}
                  />
                  <ActionButton
                    icon={Navigation}
                    label="Waze"
                    onPress={() => handleWaze(customer)}
                  />
                  <ActionButton
                    icon={MapIcon}
                    label="Maps"
                    onPress={() => handleMaps(customer)}
                  />
                  <ActionButton
                    icon={FileText}
                    label="מסמכים"
                    onPress={() =>
                      recordEvent(
                        customer,
                        'document',
                        'נפתח אזור מסמכים',
                        'המשתמש פתח את פעולת המסמכים מכרטיס הלקוח.'
                      )
                    }
                  />
                  <TouchableOpacity
                    accessibilityLabel={`מחיקת ${customer.name}`}
                    accessibilityRole="button"
                    accessible={true}
                    className={`${tw.flexRow} min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#ffdad6] px-2`}
                    onPress={() => handleDeleteCustomer(customer)}
                  >
                    <Trash2 size={16} color="#93000a" />
                    <Text className="text-xs font-bold text-[#93000a]">
                      מחיקה
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {displayCustomers.length === 0 && (
              <View className="rounded-xl border border-[#c1c7d3] bg-white p-6">
                <Text className="text-center text-base font-bold text-[#191c21]">
                  אין לקוחות עדיין
                </Text>
                <Text className="mt-2 text-center text-sm leading-6 text-[#727782]">
                  הוסף ליד מהיר כדי להתחיל לעבוד עם
                  נתונים אמיתיים.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value: number | string | undefined) {
  if (!value) {
    return 'היום';
  }

  if (typeof value === 'string') {
    return value;
  }

  return new Intl.DateTimeFormat('he-IL').format(new Date(value));
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className={`${tw.flexRow} items-start justify-between gap-4 py-1`}>
      <Text className="max-w-[65%] text-right text-sm text-[#191c21]">
        {value}
      </Text>
      <Text className="text-right text-sm text-[#727782]">{label}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[72px] flex-1 rounded-xl border border-[#c1c7d3] bg-[#f8f9ff] p-3">
      <Text className="text-center text-lg font-bold text-[#191c21]">
        {value}
      </Text>
      <Text className="mt-1 text-center text-xs text-[#727782]">{label}</Text>
    </View>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      accessible={true}
      className={`${tw.flexRow} min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#e7e8ef] px-2`}
      onPress={onPress}
    >
      <Icon size={16} color="#005da7" />
      <Text className="text-xs font-bold text-[#191c21]">{label}</Text>
    </TouchableOpacity>
  );
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

function normalizePhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('0')) {
    return `972${digits.slice(1)}`;
  }

  return digits;
}
