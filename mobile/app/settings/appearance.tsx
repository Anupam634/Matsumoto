import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useSettings, type ThemeMode } from '../../src/store/settings';
import { darkPalette, lightPalette } from '../../src/theme/tokens';

/** Theme picker, with a live preview of what each option looks like. */
export default function AppearanceScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { settings, update } = useSettings();

  const options: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'system', label: t('settings.themeSystem'), icon: 'phone-portrait-outline' },
    { value: 'light', label: t('settings.themeLight'), icon: 'sunny-outline' },
    { value: 'dark', label: t('settings.themeDark'), icon: 'moon-outline' },
  ];

  return (
    <Screen sunken>
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
        {/* Swatches — the palette, not a description of it. */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Preview
            label={t('settings.themeLight')}
            palette={lightPalette}
            active={settings.themeMode === 'light'}
            onPress={() => update({ themeMode: 'light' })}
          />
          <Preview
            label={t('settings.themeDark')}
            palette={darkPalette}
            active={settings.themeMode === 'dark'}
            onPress={() => update({ themeMode: 'dark' })}
          />
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
          {t('settings.themeSystem')} — {t('app.enabled').toLowerCase()}:{' '}
          {t('settings.appearance').toLowerCase()}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Preview({
  label,
  palette,
  active,
  onPress,
}: {
  label: string;
  palette: typeof lightPalette;
  active: boolean;
  onPress: () => void;
}) {
  const { c, spacing, radius } = useTheme();

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={label}
      padded={false}
      style={{
        flex: 1,
        borderColor: active ? c.primary : c.border,
        borderWidth: active ? 2 : 1,
        overflow: 'hidden',
      }}
    >
      <View style={{ backgroundColor: palette.bgSunken, padding: spacing.md, gap: 8 }}>
        <View
          style={{
            height: 30,
            borderRadius: radius.sm,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
            justifyContent: 'center',
            paddingHorizontal: 8,
          }}
        >
          <View
            style={{
              width: '55%',
              height: 6,
              borderRadius: 3,
              backgroundColor: palette.textPrimary,
              opacity: 0.85,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View
            style={{
              flex: 1,
              height: 26,
              borderRadius: radius.sm,
              backgroundColor: palette.primary,
            }}
          />
          <View
            style={{
              width: 30,
              height: 26,
              borderRadius: radius.sm,
              backgroundColor: palette.gold,
            }}
          />
        </View>
        <View
          style={{
            height: 20,
            borderRadius: radius.sm,
            backgroundColor: palette.surfaceAlt,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.md,
        }}
      >
        <Text variant="footnote" weight="600">
          {label}
        </Text>
        {active ? (
          <Ionicons name="checkmark-circle" size={17} color={c.primary} />
        ) : null}
      </View>
    </Card>
  );
}
