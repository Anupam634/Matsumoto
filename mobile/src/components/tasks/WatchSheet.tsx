import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ErrorNote } from '../ui/Chrome';
import { PulseDot } from '../ui/Pulse';
import { useTheme } from '../../theme/ThemeProvider';
import { useT } from '../../i18n';
import { useFeedback } from '../../lib/feedback';

/** Seconds of watching required before the reward unlocks. */
const REQUIRED_SECONDS = 45;

/**
 * Pull an 11-character video id out of whatever the admin configured — a
 * bare id, a youtu.be short link, or any of the youtube.com URL shapes.
 * Mirrors `extractYouTubeId` in the web app, minus its fallback video: a
 * task with no playable target should say so rather than reward a stand-in.
 */
export function extractYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const match =
    trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/\/v\/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * The watch-to-earn bounty.
 *
 * The video opens in the system browser (embedding YouTube inside the app
 * would breach its terms). The clock starts when the browser opens and keeps
 * running — wall-clock, from `startedAt` — until the requirement is met or the
 * sheet closes. Backgrounding the app while the video plays is the expected
 * path, so time spent there counts; on Android `openBrowserAsync` resolves
 * as soon as the tab is up, which is why the timer must not depend on it.
 */
export function WatchSheet({
  rewardPoints,
  videoUrl,
  onComplete,
  onClose,
}: {
  rewardPoints: number;
  videoUrl?: string | null;
  onComplete: () => Promise<void>;
  onClose: () => void;
}) {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  const videoId = useMemo(() => extractYouTubeId(videoUrl), [videoUrl]);

  const [watched, setWatched] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const celebrated = useRef(false);

  const done = watched >= REQUIRED_SECONDS;

  /* Tick once a second from the moment the video was opened until done. */
  useEffect(() => {
    if (startedAt === null || done) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setWatched(Math.min(REQUIRED_SECONDS, Math.max(0, elapsed)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, done]);

  useEffect(() => {
    if (done && !celebrated.current) {
      celebrated.current = true;
      feedback.success();
    }
  }, [done, feedback]);

  const open = async () => {
    setError(null);
    if (!videoId) {
      feedback.warn();
      setError(t('tasksScreen.watchInvalid'));
      return;
    }
    if (startedAt === null) setStartedAt(Date.now());
    try {
      await WebBrowser.openBrowserAsync(
        `https://www.youtube.com/watch?v=${videoId}`,
        { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN },
      );
    } catch {
      setError(t('app.unavailable'));
    }
  };

  const claim = async () => {
    setClaiming(true);
    setError(null);
    try {
      await onComplete();
      onClose();
    } catch (err) {
      feedback.error();
      setError(err instanceof Error ? err.message : t('app.offline'));
    } finally {
      setClaiming(false);
    }
  };

  const progress = watched / REQUIRED_SECONDS;
  const watching = startedAt !== null && !done;
  const accent = done ? c.success : c.danger;

  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('tasksScreen.watchTitle')}
      subtitle={t('tasksScreen.watchBody', { seconds: REQUIRED_SECONDS })}
    >
      {/* Reward line — "+N PTS" in cyan mono, as the site's header reads */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text variant="caption" tone="secondary">
          {t('tasksScreen.reward')}
        </Text>
        <Text variant="callout" tone="info" mono weight="800">
          +{rewardPoints}
        </Text>
        <Text variant="caption" tone="info" weight="700" uppercase>
          {t('dashboard.pointsShort')}
        </Text>
      </View>

      {/* Player stand-in: the black video frame with the red tile */}
      <View
        style={{
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.xl,
          borderRadius: radius.lg,
          backgroundColor: c.dark ? '#000000' : '#0F172A',
          borderWidth: 1,
          borderColor: c.dark ? 'rgba(255,255,255,0.1)' : c.border,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          key={done ? 'done' : 'video'}
          entering={done ? ZoomIn.duration(300) : FadeIn.duration(200)}
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.lg,
            backgroundColor: alpha(accent, 0.2),
            borderWidth: 1,
            borderColor: alpha(accent, 0.35),
            alignItems: 'center',
            justifyContent: 'center',
            ...glow(accent, 2),
          }}
        >
          <Ionicons
            name={done ? 'checkmark-circle' : 'logo-youtube'}
            size={32}
            color={accent}
          />
        </Animated.View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {watching ? <PulseDot color={c.danger} size={7} /> : null}
          <Text variant="headline" style={{ color: '#F8FAFC' }}>
            {done
              ? t('tasksScreen.watchDone')
              : t('tasksScreen.watchProgress', { seconds: watched })}
          </Text>
        </View>
      </View>

      {/* Progress — mono readout above a gradient bar */}
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {done ? (
            <Text variant="caption" tone="success" mono weight="900" uppercase>
              ✓ {t('tasksScreen.watchDone')}
            </Text>
          ) : (
            <Text variant="caption" tone="tertiary" mono weight="700">
              {watched}s / {REQUIRED_SECONDS}s
            </Text>
          )}
          <Text variant="caption" tone={done ? 'success' : 'info'} mono weight="700">
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View
          style={{
            height: 10,
            padding: 2,
            borderRadius: 5,
            backgroundColor: c.dark ? 'rgba(30,41,59,0.8)' : c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.dark ? 'rgba(255,255,255,0.05)' : c.border,
          }}
        >
          <LinearGradient
            colors={done ? [c.success, c.success] : [c.primary, c.info]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 4,
              width: `${Math.max(1, Math.min(100, progress * 100))}%`,
              borderRadius: 2,
            }}
          />
        </View>
      </View>

      {/* Status note */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: done
            ? alpha(c.success, c.dark ? 0.1 : 0.08)
            : c.dark
              ? 'rgba(15,23,42,0.5)'
              : c.surfaceAlt,
          borderWidth: 1,
          borderColor: done ? alpha(c.success, 0.3) : c.border,
        }}
      >
        <Ionicons
          name={done ? 'sparkles' : watching ? 'time-outline' : 'play-circle-outline'}
          size={15}
          color={done ? c.success : c.textTertiary}
        />
        <Text
          variant="caption"
          tone={done ? 'success' : 'tertiary'}
          weight={done ? '700' : '500'}
          style={{ flexShrink: 1 }}
        >
          {done
            ? t('tasksScreen.claimReward', { points: rewardPoints })
            : t('tasksScreen.watchBody', { seconds: REQUIRED_SECONDS })}
        </Text>
      </View>

      {error ? <ErrorNote message={error} /> : null}

      {done ? (
        <Button
          label={t('tasksScreen.claimReward', { points: rewardPoints })}
          icon="sparkles"
          onPress={() => void claim()}
          loading={claiming}
          fullWidth
          size="lg"
        />
      ) : (
        <Button
          label={t('tasksScreen.watchOpen')}
          icon="play-circle-outline"
          onPress={() => void open()}
          variant={watching ? 'secondary' : 'primary'}
          fullWidth
          size="lg"
        />
      )}
    </Sheet>
  );
}
