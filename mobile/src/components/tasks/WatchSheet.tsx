import React, { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ErrorNote } from '../ui/Chrome';
import { useTheme } from '../../theme/ThemeProvider';
import { useT } from '../../i18n';
import { useFeedback } from '../../lib/feedback';

/** Seconds of watching required before the reward unlocks. */
const REQUIRED_SECONDS = 45;
const FALLBACK_VIDEO = 'https://www.youtube.com/watch?v=kJQP7kiw5Fk';

/**
 * The watch-to-earn bounty.
 *
 * The video opens in the system browser (embedding YouTube inside the app
 * would breach its terms), and the timer runs only while the browser is in
 * front — so the countdown measures actual watching, not a backgrounded tab.
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
  const { c, spacing, radius } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  const [watched, setWatched] = useState(0);
  const [watching, setWatching] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);

  const done = watched >= REQUIRED_SECONDS;

  /* Count only while the app is in the background — i.e. the browser is up. */
  useEffect(() => {
    if (!watching) return;
    const id = setInterval(() => {
      if (AppState.currentState !== 'active') {
        setWatched((s) => Math.min(REQUIRED_SECONDS, s + 1));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [watching]);

  useEffect(() => {
    if (done && watching) {
      setWatching(false);
      feedback.success();
    }
  }, [done, watching, feedback]);

  const open = async () => {
    setError(null);
    setWatching(true);
    startedAt.current = Date.now();
    try {
      await WebBrowser.openBrowserAsync(videoUrl || FALLBACK_VIDEO, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch {
      setError(t('app.unavailable'));
    } finally {
      // Returning from the browser stops the clock; whatever accrued stands.
      setWatching(false);
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

  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('tasksScreen.watchTitle')}
      subtitle={t('tasksScreen.watchBody', { seconds: REQUIRED_SECONDS })}
    >
      <View
        style={{
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: c.surfaceAlt,
        }}
      >
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: radius.lg,
            backgroundColor: done ? c.successMuted : c.dangerMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={done ? 'checkmark-circle' : 'logo-youtube'}
            size={30}
            color={done ? c.success : c.danger}
          />
        </View>

        <Text variant="headline">
          {done
            ? t('tasksScreen.watchDone')
            : t('tasksScreen.watchProgress', { seconds: watched })}
        </Text>

        <View
          style={{
            height: 6,
            width: '70%',
            borderRadius: 3,
            backgroundColor: c.border,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 6,
              width: `${Math.min(100, progress * 100)}%`,
              borderRadius: 3,
              backgroundColor: done ? c.success : c.primary,
            }}
          />
        </View>
      </View>

      {error ? <ErrorNote message={error} /> : null}

      {done ? (
        <Button
          label={t('tasksScreen.claimReward', { points: rewardPoints })}
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
          fullWidth
          size="lg"
        />
      )}
    </Sheet>
  );
}
