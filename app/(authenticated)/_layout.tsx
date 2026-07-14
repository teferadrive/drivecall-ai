import { useConvexAuth } from 'convex/react';
import { Redirect, Tabs, useRootNavigationState } from 'expo-router';
import { ActivityIndicator, I18nManager, Text, View } from 'react-native';
import { PAYMENT_SYSTEM_ENABLED } from '@/config/appConfig';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { IS_RTL } from '@/lib/rtl';

type AppTab = {
  name: string;
  title: string;
  emoji: string;
};

export default function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isPremium, isLoading: isRevenueCatLoading } = useRevenueCat();
  const navigationState = useRootNavigationState();

  if (!navigationState?.key) {
    return <LoadingScreen />;
  }

  if (isLoading || isRevenueCatLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (PAYMENT_SYSTEM_ENABLED && !isPremium) {
    return <Redirect href="/(auth)/paywall" />;
  }

  // הסדר הלוגי: דשבורד, לקוחות, יומן, הגדרות.
  const tabs: AppTab[] = [
    {
      name: 'index',
      title: 'דשבורד',
      emoji: '🏠',
    },
    {
      name: 'page1',
      title: 'לקוחות',
      emoji: '🧑‍🤝‍🧑',
    },
    {
      name: 'page2',
      title: 'יומן',
      emoji: '🗓️',
    },
    {
      name: 'settings',
      title: 'הגדרות',
      emoji: '⚙️',
    },
  ];

  // סידור טאבים עקבי: כשה-RTL הנייטיב פעיל הוא כבר מהפך את סדר הבר,
  // אז שולחים את הרשימה כרגיל. כשהוא לא פעיל (למשל Expo Go) אבל האפליקציה
  // ב-RTL, הופכים ידנית כדי שהדשבורד יופיע מימין. כך הסדר תמיד:
  // דשבורד (ימין) ← לקוחות ← יומן ← הגדרות (שמאל).
  const isNativeRTLEnabled = I18nManager.isRTL === true;
  const orderedTabs =
    !isNativeRTLEnabled && IS_RTL ? [...tabs].reverse() : tabs;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00457f',
        tabBarInactiveTintColor: '#727782',
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#c1c7d3',
          minHeight: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
      }}
    >
      {orderedTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }: { focused: boolean }) => (
              <Text style={{ fontSize: 26, opacity: focused ? 1 : 0.55 }}>
                {tab.emoji}
              </Text>
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="customer/[customerId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="after-call"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-[#f8f9ff]">
      <ActivityIndicator color="#005da7" size="large" />
    </View>
  );
}
