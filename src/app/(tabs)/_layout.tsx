import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { palette, shadow, typography } from '@/constants/theme';
import { useApp } from '@/state/app-context';

const tabIcon = (name: AppIconName) =>
  function Icon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <AppIcon name={name} size={focused ? 25 : 23} color={color} />;
  };

export default function TabsLayout() {
  const { state } = useApp();
  if (!state.hydrated) return null;
  if (!state.session) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primaryDark,
        tabBarInactiveTintColor: palette.inkMuted,
        tabBarLabelStyle: { ...typography.micro, fontSize: 10 },
        tabBarStyle: {
          height: 70,
          paddingTop: 8,
          paddingBottom: 9,
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          ...shadow.floating,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Plans', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: tabIcon('people') }} />
      <Tabs.Screen name="invitations" options={{ title: 'Invites', tabBarIcon: tabIcon('mail') }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
