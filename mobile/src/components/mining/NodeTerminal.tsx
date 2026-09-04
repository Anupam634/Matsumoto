import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PulseDot } from '../ui/Pulse';
import { Coin3D } from './Coin3D';
import { Burst, FloatUp, MineButton, ProgressRing, Shockwave } from './Effects';
import {
  HashrateBadge,
  MiningRig,
  Pill,
  PointsAccumulator,
  TelemetryStrip,
  TerminalHeader,
} from './Telemetry';
import { useTheme } from '../../theme/ThemeProvider';
import { useT } from '../../i18n';
import { useFeedback } from '../../lib/feedback';
import { formatPoints } from '../../lib/format';
import type { MiningStatus } from '../../api/endpoints';

const RING = 158;
const BUTTON = 120;

/**
 * The node terminal — the site's Interactive Miner Visualizer fused with the
 * dashboard's HeroPanel.
 *
 * Terminal chrome up top, the rotating coin with its hashrate badge, the amber
 * accumulator, then the Mine control (progress ring around the gradient disc)
 * with its shockwave, burst and float-up, and the hardware telemetry strip.
 */
export function NodeTerminal({
  mining,
  pending,
  progress,
  ready,
  claiming,
  countdown,
  now,
  celebrate,
  locale,
  onMine,
}: {
  mining: MiningStatus;
  /** Live pending points. */
  pending: number;
  /** 0–1 share of the 24h window. */
  progress: number;
  ready: boolean;
  claiming: boolean;
  countdown: string | null;
  /** Clock tick (1 Hz) — drives the node-temperature readout. */
  now: number;
  /** Points just banked, while the celebration is live. */
  celebrate: number | null;
  locale: string;
  onMine: () => void;
}) {
  const { c, spacing } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  /** Bumped on every strike so the shockwave remounts and replays. */
  const [tapKey, setTapKey] = useState(0);
  /** Nudge on the countdown pills when the disc is tapped early. */
  const nudge = useSharedValue(0);
  const nudgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + nudge.value * 0.06 }],
  }));

  const temp = 50 + Math.floor(Math.sin(now / 2500) * 3);
  const accruing = !ready;

  const onEarlyPress = () => {
    feedback.warn();
    nudge.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.6, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
    );
  };

  const onPress = () => {
    setTapKey((k) => k + 1);
    onMine();
  };

  return (
    <Card glow>
      <TerminalHeader online={accruing} />

      {/* Hero copy + rig */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.md,
          marginTop: spacing.lg,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="title2">{t('dashboard.cloudMining')}</Text>
          <Text variant="footnote" tone="secondary" style={{ marginTop: 4 }}>
            {t('dashboard.heroBody')}
          </Text>
          <Badge
            label={t('dashboard.bnbRewards')}
            tone="gold"
            icon="link-outline"
            style={{ marginTop: spacing.sm }}
          />
        </View>
        <MiningRig active={accruing} />
      </View>

      {/* Coin + hashrate badge */}
      <View style={{ alignItems: 'center', marginTop: -spacing.sm }}>
        <Coin3D size={148} />
        <HashrateBadge
          ratePerHour={mining.ratePerHour}
          locale={locale}
          style={{ position: 'absolute', top: spacing.xl, right: 0 }}
        />
      </View>

      <PointsAccumulator points={pending} locale={locale} />

      {/* Status line */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: spacing.lg,
          minHeight: 24,
        }}
      >
        {ready ? (
          <Badge label={`✓ ${t('dashboard.ready')}`} tone="success" />
        ) : (
          <>
            <PulseDot color={c.success} size={7} />
            <Text variant="overline" tone="tertiary" uppercase>
              {t('dashboard.accruing')}
            </Text>
          </>
        )}
      </View>

      {/* Mine control */}
      <View style={{ alignItems: 'center', marginTop: spacing.md }}>
        <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
          <ProgressRing size={RING} progress={progress}>
            {tapKey > 0 ? <Shockwave key={tapKey} size={BUTTON} color={c.gold} /> : null}
            <MineButton
              size={BUTTON}
              ready={ready}
              claiming={claiming}
              label={t('dashboard.mineButton')}
              countdown={countdown}
              accessibilityLabel={`${t(ready ? 'mine.readyTitle' : 'mine.accruingTitle')}. ${formatPoints(pending, 4, locale)} ${t('mine.pendingLabel')}`}
              onPress={onPress}
              onEarlyPress={onEarlyPress}
            />
          </ProgressRing>
          {celebrate !== null ? <Burst /> : null}
          {celebrate !== null ? (
            <FloatUp label={`+${formatPoints(celebrate, 2, locale)} PTS`} />
          ) : null}
        </View>
      </View>

      {/* Rate + countdown pills */}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: spacing.sm,
            marginTop: spacing.lg,
          },
          nudgeStyle,
        ]}
      >
        <Pill icon="flash" tint={c.primary} label={`${formatPoints(mining.ratePerHour, 2, locale)} /h`} />
        {!ready && countdown ? <Pill icon="time-outline" label={countdown} mono /> : null}
      </Animated.View>

      <View style={{ marginTop: spacing.lg }}>
        <TelemetryStrip temp={temp} />
      </View>
      <Text variant="caption" mono tone="tertiary" center style={{ marginTop: spacing.md, fontSize: 10 }}>
        {t('mine.hashAlgorithm')}
      </Text>
    </Card>
  );
}
