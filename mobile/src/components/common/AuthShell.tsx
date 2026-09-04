import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

/**
 * Shared frame for every auth screen: brand mark, title block, and a
 * keyboard-aware body with the app's gutters.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  onBack,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: (() => void) | null;
}) {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feedback = useFeedback();

  const back = onBack === null ? null : (onBack ?? (() => router.back()));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 44,
          }}
        >
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              onPress={() => {
                feedback.select();
                back();
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Ionicons name="chevron-back" size={26} color={c.primary} />
            </Pressable>
          ) : (
            <View />
          )}
          <Image
            source={require('../../../assets/logo.png')}
            style={{ width: 32, height: 32, borderRadius: radius.sm }}
            contentFit="contain"
          />
        </View>

        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
          <Text variant="display">{title}</Text>
          {subtitle ? (
            <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.lg }}>{children}</View>

        {footer ? (
          <View style={{ marginTop: 'auto', paddingTop: spacing.xl }}>
            {footer}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
