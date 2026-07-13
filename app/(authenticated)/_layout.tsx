import { useConvexAuth } from 'convex/react';
import { Redirect, Tabs, useRootNavigationState } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  BarChart3,
  Home,
  Settings,
  UserRoundSearch,
} from 'lucide-react-native';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import { PAYMENT_SYSTEM_ENABLED } from '@/config/appConfig';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { IS_RTL } from '@/lib/rtl';

type AppTab = {
  name: string;
  title: string;
  icon: LucideIcon;
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

  const tabs: AppTab[] = [
    {
      name: 'index',
      title: 'דשבורד',
      icon: Home,
    },
    {
      name: 'page1',
      title: 'לקוחות',
      icon: UserRoundSearch,
    },
    {
      name: 'page2',
      title: 'יומן',
      icon: BarChart3,
    },
    {
      name: 'settings',
      title: 'הגדרות',
      icon: Settings,
    },
  ];

  const isNativeRTLEnabled = I18nManager.isRTL === true;
  const orderedTabs = isNativeRTLEnabled
    ? tabs
    : IS_RTL
      ? [...tabs].reverse()
      : tabs;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00457f',
        tabBarInactiveTintColor: '#727782',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#c1c7d3',
          minHeight: 64,
          paddingBottom: 8,
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
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <tab.icon color={color} size={size} />
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
