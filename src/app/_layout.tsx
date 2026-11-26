import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import '../utils/webAlert';
import { AuthProvider } from '../hooks/useAuth';
import { FilesProvider } from '../hooks/useFiles';
import { LmsProvider } from '../hooks/useLms';
import { UnreadProvider } from '../hooks/useUnread';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UnreadProvider>
        <FilesProvider>
          <LmsProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.primary,
                headerTitleStyle: { color: colors.text },
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="file-details/[id]" options={{ title: 'File details' }} />
              <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
              <Stack.Screen name="course-form" options={{ title: 'Course' }} />
              <Stack.Screen name="quiz-form" options={{ title: 'Quiz builder' }} />
              <Stack.Screen name="quiz/[id]" options={{ title: 'Quiz' }} />
              <Stack.Screen name="auth" options={{ title: 'Account' }} />
              <Stack.Screen name="class-form" options={{ title: 'New class' }} />
              <Stack.Screen name="class/[id]" options={{ title: 'Class' }} />
              <Stack.Screen name="admin" options={{ title: 'Administration' }} />
              <Stack.Screen name="class-quiz-form" options={{ title: 'New class quiz' }} />
              <Stack.Screen name="class-quiz/[id]" options={{ title: 'Quiz' }} />
            </Stack>
          </LmsProvider>
        </FilesProvider>
        </UnreadProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
