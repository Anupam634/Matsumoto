import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { SectionLabel } from '../../src/components/ui/Card';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { LOCALE_LABELS, LOCALES, systemLocale, useT } from '../../src/i18n';
import { useSettings, type LocalePref } from '../../src/store/settings';
import { useFeedback } from '../../src/lib/feedback';

/**
 * Language.
 *
 * The same three languages the web app ships — English, 简体中文, 한국어 — plus
 * "match system", which follows the phone and is the default.
 */
export default function LanguageScreen() {
  const { c, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { settings, update } = useSettings();
  const feedback = useFeedback();

  const choose = (locale: LocalePref) => {
    feedback.success();
    update({ locale });
  };

  const detected = systemLocale();

  return (
    <Screen sunken>
      <NavBar title={t('settings.language')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
      >
        <View>
          <SectionLabel>{t('settings.language')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="phone-portrait-outline"
              tone={settings.locale === 'system' ? 'brand' : 'default'}
              title={t('settings.languageSystem')}
              subtitle={LOCALE_LABELS[detected].label}
              onPress={() => choose('system')}
              chevron={false}
              trailing={
                settings.locale === 'system' ? (
                  <Ionicons name="checkmark-circle" size={21} color={c.primary} />
                ) : (
                  <Unchecked />
                )
              }
            />
            {LOCALES.map((code) => (
              <ListRow
                key={code}
                title={LOCALE_LABELS[code].label}
                subtitle={LOCALE_LABELS[code].english}
                onPress={() => choose(code)}
                chevron={false}
                trailing={
                  settings.locale === code ? (
                    <Ionicons name="checkmark-circle" size={21} color={c.primary} />
                  ) : (
                    <Unchecked />
                  )
                }
              />
            ))}
          </ListGroup>
        </View>

        <Text variant="caption" tone="tertiary">
          {t('app.tagline')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Unchecked() {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 21,
        height: 21,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: c.borderStrong,
      }}
    />
  );
}
