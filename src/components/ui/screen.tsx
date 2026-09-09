import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { contentMaxWidth, palette, spacing } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

export function Screen({ children, style, edges = ['top', 'left', 'right'] }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

interface ScrollScreenProps extends ScreenProps {
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  keyboardAware?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
}

export function ScrollScreen({
  children,
  style,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
  keyboardAware = false,
  refreshControl,
}: ScrollScreenProps) {
  const scroll = (
    <ScrollView
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {scroll}
        </KeyboardAvoidingView>
      ) : (
        scroll
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: palette.canvas },
  content: { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.huge },
});
