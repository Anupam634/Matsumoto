import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

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
 * all three languages, instead of drifting apart. Laid out like the site's
 * StaticPage (one glass panel of sections with accent headings) and its
 * FAQSection (glass accordions with an amber toggle).
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

const DOC_ICON: Record<Doc, keyof typeof Ionicons.glyphMap> = {
  faq: 'help-circle-outline',
  terms: 'document-text-outline',
  privacy: 'lock-closed-outline',
};

export default function LegalScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { doc } = useLocalSearchParams<{ doc: string }>();

  const key: Doc = (['faq', 'terms', 'privacy'] as const).includes(doc as Doc)
    ? (doc as Doc)
    : 'faq';

  // Terms and privacy are read top to bottom, so every section starts open;
  // the FAQ is scanned for one question, so it stays one-at-a-time.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(key === 'faq' ? [SECTIONS[key][0]] : SECTIONS[key]),
  );

  const toggle = (section: string) =>
    setOpen((prev) => {
      if (key === 'faq') return new Set(prev.has(section) ? [] : [section]);
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });

  return (
    <Screen>
      <NavBar title={t(`${key}.title`)} transparent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.sm,
        }}
      >
        {/* Page header — the site's StaticPage title block */}
        <Animated.View
          entering={FadeInDown.duration(260)}
          style={{ paddingHorizontal: spacing.xs, paddingBottom: spacing.sm, gap: 6 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: alpha(c.primary, 0.15),
                borderWidth: 1,
                borderColor: alpha(c.primary, 0.3),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={DOC_ICON[key]} size={18} color={c.primary} />
            </View>
            <Text variant="title2" style={{ flex: 1 }}>
              {t(`${key}.title`)}
            </Text>
          </View>
          <Text variant="body" tone="secondary">
            {t(`${key}.intro`)}
          </Text>
          {key !== 'faq' ? (
            <Text variant="caption" mono uppercase tone="gold" style={{ fontSize: 10, opacity: 0.85 }}>
              {t(`${key}.updated`)}
            </Text>
          ) : null}
        </Animated.View>

        {key === 'faq' ? (
          SECTIONS[key].map((section, i) => (
            <Animated.View key={section} entering={FadeInDown.delay(40 + i * 35).duration(260)}>
              <Accordion
                title={t(`${key}.q.${section}.q`)}
                body={t(`${key}.q.${section}.a`)}
                expanded={open.has(section)}
                onToggle={() => toggle(section)}
              />
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeInDown.delay(40).duration(260)}>
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {SECTIONS[key].map((section, i) => (
                <Section
                  key={section}
                  title={t(`${key}.q.${section}.q`)}
                  body={t(`${key}.q.${section}.a`)}
                  expanded={open.has(section)}
                  onToggle={() => toggle(section)}
                  first={i === 0}
                />
              ))}
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

/** Terms / privacy: one section of the site's StaticPage, accent heading. */
function Section({
  title,
  body,
  expanded,
  onToggle,
  first,
}: {
  title: string;
  body: string;
  expanded: boolean;
  onToggle: () => void;
  first?: boolean;
}) {
  const { c, spacing } = useTheme();
  const feedback = useFeedback();

  return (
    <View
      style={{
        paddingVertical: spacing.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: c.border,
      }}
    >
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
          minHeight: 32,
        }}
      >
        <Text variant="title3" tone="brand" style={{ flex: 1 }}>
          {title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={17}
          color={c.textTertiary}
        />
      </Pressable>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {/* Bodies carry blank-line paragraphs, exactly as the web app renders. */}
          {body.split('\n\n').map((paragraph, i) => (
            <Text key={i} variant="body" tone="secondary">
              {paragraph}
            </Text>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

/** FAQ: the site's FAQSection card with its round amber +/− toggle. */
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
  const { c, spacing, radius, alpha } = useTheme();
  const feedback = useFeedback();

  return (
    <Card padded={false} accent={expanded ? alpha(c.primary, 0.45) : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => {
          feedback.select();
          onToggle();
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.lg,
          minHeight: 56,
          backgroundColor: pressed ? alpha(c.primary, 0.05) : 'transparent',
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
        })}
      >
        <Text variant="headline" style={{ flex: 1 }}>
          {title}
        </Text>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.borderStrong,
            backgroundColor: c.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={expanded ? 'remove' : 'add'} size={16} color={c.gold} />
        </View>
      </Pressable>

      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: c.border,
            backgroundColor: c.dark ? alpha(c.bg, 0.5) : c.surfaceAlt,
            borderBottomLeftRadius: radius.xl - 1,
            borderBottomRightRadius: radius.xl - 1,
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
