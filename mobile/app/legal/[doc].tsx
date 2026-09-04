import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useFeedback } from '../../src/lib/feedback';

/**
 * FAQ, Terms and Privacy.
 *
 * All three are the web app's own copy, read straight out of the shared
 * message catalogue — so a wording change lands on both clients at once, in
 * all three languages, instead of drifting apart.
 */

type Doc = 'faq' | 'terms' | 'privacy';

const SECTIONS: Record<Doc, string[]> = {
  faq: [
    'mining',
    'cooldown',
    'conversion',
    'minWithdrawal',
    'withdrawTime',
    'kyc',
    'boosters',
    'boosterFailed',
    'referrals',
    'tasks',
  ],
  terms: [
    'service',
    'eligibility',
    'points',
    'payouts',
    'conduct',
    'liability',
    'changes',
  ],
  privacy: ['collect', 'kycData', 'use', 'share', 'retain', 'rights', 'contact'],
};

export default function LegalScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { doc } = useLocalSearchParams<{ doc: string }>();

  const key: Doc = (['faq', 'terms', 'privacy'] as const).includes(doc as Doc)
    ? (doc as Doc)
    : 'faq';

  const [open, setOpen] = useState<string | null>(SECTIONS[key][0]);

  return (
    <Screen sunken>
      <NavBar title={t(`${key}.title`)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.sm,
        }}
      >
        <Text variant="body" tone="secondary" style={{ marginBottom: spacing.sm }}>
          {t(`${key}.intro`)}
        </Text>

        {key !== 'faq' ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: c.warningMuted,
              marginBottom: spacing.sm,
            }}
          >
            <Ionicons name="information-circle" size={17} color={c.warning} />
            <Text variant="caption" style={{ color: c.warning, flex: 1 }}>
              {t(`${key}.updated`)}
            </Text>
          </View>
        ) : null}

        {SECTIONS[key].map((section) => (
          <Accordion
            key={section}
            title={t(`${key}.q.${section}.q`)}
            body={t(`${key}.q.${section}.a`)}
            expanded={open === section}
            onToggle={() => setOpen((prev) => (prev === section ? null : section))}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function Accordion({
  title,
  body,
  expanded,
  onToggle,
}: {
  title: string;
  body: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { c, spacing } = useTheme();
  const feedback = useFeedback();

  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => {
          feedback.select();
          onToggle();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.lg,
        }}
      >
        <Text variant="headline" style={{ flex: 1 }}>
          {title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={17}
          color={c.textTertiary}
        />
      </Pressable>

      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.lg,
            borderTopWidth: 1,
            borderTopColor: c.border,
            paddingTop: spacing.md,
            gap: spacing.sm,
          }}
        >
          {/* Bodies carry blank-line paragraphs, exactly as the web app renders. */}
          {body.split('\n\n').map((paragraph, i) => (
            <Text key={i} variant="body" tone="secondary">
              {paragraph}
            </Text>
          ))}
        </Animated.View>
      ) : null}
    </Card>
  );
}
