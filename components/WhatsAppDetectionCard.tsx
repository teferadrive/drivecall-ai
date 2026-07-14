import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import {
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
} from '@/lib/notificationAccess';
import { tw } from '@/lib/rtl';

// כרטיס הגדרות להפעלת זיהוי אוטומטי של שיחות WhatsApp.
// מבוסס על הרשאת "גישה להתראות" של אנדרואיד.
export function WhatsAppDetectionCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  // בודקים מחדש בכל פעם שהמסך חוזר לפוקוס (למשל אחרי חזרה מההגדרות).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      isNotificationAccessEnabled().then((result) => {
        if (active) {
          setEnabled(result);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handleEnable = async () => {
    Alert.alert(
      'זיהוי שיחות WhatsApp',
      'כדי לזהות שיחות WhatsApp אוטומטית, צריך לאשר ל-DriveCall AI גישה להתראות.\n\nבמסך שייפתח: מצא את "DriveCall AI" והפעל את המתג.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'פתח הגדרות',
          onPress: () => {
            openNotificationAccessSettings();
          },
        },
      ]
    );
  };

  const isOn = enabled === true;

  return (
    <View className="mx-4 mb-4 rounded-2xl border border-[#c1c7d3] bg-white p-5">
      <View className={`${tw.flexRow} items-center gap-3`}>
        <Text className="text-3xl">💬</Text>
        <View className="flex-1">
          <Text className={`text-[#191c21] text-lg font-bold ${tw.textStart}`}>
            זיהוי שיחות WhatsApp
          </Text>
          <Text className={`mt-0.5 text-sm ${tw.textStart} text-[#727782]`}>
            {isOn
              ? 'פעיל - שיחות WhatsApp יזוהו אוטומטית'
              : 'כבוי - הפעל כדי לזהות שיחות WhatsApp'}
          </Text>
        </View>
        <View
          className={`rounded-full px-3 py-1 ${
            isOn ? 'bg-[#a0f399]' : 'bg-[#e7e8ef]'
          }`}
        >
          <Text
            className={`text-sm font-bold ${
              isOn ? 'text-[#002204]' : 'text-[#414751]'
            }`}
          >
            {isOn ? 'פעיל' : 'כבוי'}
          </Text>
        </View>
      </View>

      {!isOn && (
        <TouchableOpacity
          accessibilityLabel="הפעלת זיהוי שיחות WhatsApp"
          accessibilityRole="button"
          className={`${tw.flexRow} mt-4 min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#005da7] px-4`}
          onPress={handleEnable}
        >
          <Text className="text-base font-bold text-white">
            הפעל זיהוי WhatsApp
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
