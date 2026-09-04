import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { SectionLabel } from '../../src/components/ui/Card';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useFeedback } from '../../src/lib/feedback';
import { useSettings, type ThemeMode } from '../../src/store/settings';
import { palettes, type Palette, type ThemeName } from '../../src/theme/tokens';

/**
 * Theme picker — the website's four looks, previewed as live swatches.
 * 🌙 Midnight Sapphire · ☀️ Executive Light · 🔵 Royal Blue · 🔴 Crimson
 */
export default function AppearanceScreen() {
  const { c, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { settings, update } = useSettings();

  const themes: { value: ThemeName; label: string; name: string; emoji: string }[] = [
    { value: 'dark', label: t('settings.themeDark'), name: t('settings.themeDarkName'), emoji: '🌙' },
    { value: 'light', label: t('settings.themeLight'), name: t('settings.themeLightName'), emoji: '☀️' },
    { value: 'cyber', label: t('settings.themeCyber'), name: t('settings.themeCyberName'), emoji: '🔵' },
    { value: 'red', label: t('settings.themeRed'), name: t('settings.themeRedName'), emoji: '🔴' },
  ];

  const options: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'system', label: t('settings.themeSystem'), icon: 'phone-portrait-outline' },
    ...themes.map((theme) => ({
      value: theme.value as ThemeMode,
      label: theme.name,
      icon: (theme.value === 'light' ? 'sunny-outline' : theme.value === 'dark' ? 'moon-outline' : 'color-palette-outline') as keyof typeof Ionicons.glyphMap,
    })),
  ];

  return (
    <Screen>
      <NavBar title={t('settings.theme')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {themes.map((theme) => (
            <Preview
              key={theme.value}
              label={theme.label}
              name={theme.name}
              emoji={theme.emoji}
              palette={palettes[theme.value]}
              active={settings.themeMode === theme.value}
              onPress={() => update({ themeMode: theme.value })}
            />
          ))}
        </View>

        <View>
          <SectionLabel>{t('settings.theme')}</SectionLabel>
          <ListGroup>
            {options.map((option) => (
              <ListRow
                key={option.value}
                icon={option.icon}
                tone={settings.themeMode === option.value ? 'brand' : 'default'}
                title={option.label}
                onPress={() => update({ themeMode: option.value })}
                chevron={false}
                trailing={
                  settings.themeMode === option.value ? (
                    <Ionicons name="checkmark-circle" size={21} color={c.primary} />
                  ) : (
                    <View
                      style={{
                        width: 21,
                        height: 21,
                        borderRadius: 11,
                        borderWidth: 1.5,
                        borderColor: c.borderStrong,
                      }}
                    />
                  )
                }
              />
            ))}
          </ListGroup>
        </View>

        <Text variant="caption" tone="tertiary">
          {t('settings.themeBody')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

/** A miniature of the theme: ground, glass panel, gradient button, amber numeral. */
function Preview({
  label,
  name,
  emoji,
  palette,
  active,
  onPress,
}: {
  label: string;
  name: string;
  emoji: string;
  palette: Palette;
  active: boolean;
  onPress: () => void;
}) {
  const { c, spacing, radius } = useTheme();
  const feedback = useFeedback();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} — ${name}`}
      onPress={() => {
        feedback.select();
        onPress();
      }}
      style={({ pressed }) => ({
        width: '47.5%',
        borderRadius: radius.xl,
        borderWidth: active ? 2 : 1,
        borderColor: active ? c.primary : c.border,
        overflow: 'hidden',
        backgroundColor: palette.bg,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Mini glass panel */}
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <View
          style={{
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: 'hidden',
            padding: spacing.sm,
            gap: 6,
          }}
        >
          <LinearGradient
            colors={[palette.surfaceGradient[0], palette.surfaceGradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ height: 6, width: '45%', borderRadius: 3, backgroundColor: palette.textTertiary }} />
          <Text variant="title3" mono style={{ color: palette.gold }}>
            21.60
          </Text>
          <LinearGradient
            colors={[...palette.primaryGradient] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 18, borderRadius: 6 }}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
        }}
      >
        <Text variant="caption">{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text variant="caption" weight="700" style={{ color: palette.textPrimary }} numberOfLines={1}>
            {label}
          </Text>
          <Text variant="caption" style={{ color: palette.textTertiary, fontSize: 10, lineHeight: 13 }} numberOfLines={1}>
            {name}
          </Text>
        </View>
        {active ? <Ionicons name="checkmark-circle" size={18} color={c.primary} /> : null}
      </View>
    </Pressable>
  );
}
