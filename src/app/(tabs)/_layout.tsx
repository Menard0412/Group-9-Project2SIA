import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { colors, shadows } from '../../constants/colors';
import { useUnread } from '../../hooks/useUnread';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return function TabIcon({ focused, size }: { focused: boolean; size: number }) {
    return <Ionicons name={name} size={size} color={focused ? colors.primary : colors.textMuted} />;
  };
}

const HomeIcon = tabIcon('home');
const CoursesIcon = tabIcon('school');
const ClassesIcon = tabIcon('people');
const PresentationsIcon = tabIcon('easel');
const ExercisesIcon = tabIcon('clipboard');
const SettingsIcon = tabIcon('settings');

export default function TabsLayout() {
  const { total } = useUnread();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          paddingTop: 6,
          ...shadows.tabBar,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.white, fontSize: 10, fontWeight: '800' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: CoursesIcon }} />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ClassesIcon,
          tabBarBadge: total > 0 ? (total > 99 ? '99+' : total) : undefined,
        }}
      />
      <Tabs.Screen name="presentations" options={{ title: 'Slides', tabBarIcon: PresentationsIcon }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises', tabBarIcon: ExercisesIcon }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: SettingsIcon }} />
    </Tabs>
  );
}
