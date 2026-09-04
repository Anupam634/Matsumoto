import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettings } from '../store/settings';

/**
 * Haptics and sound effects, in one place and behind the user's preferences.
 *
 * The web app synthesises these with the Web Audio API; there is no equivalent
 * on native, so the same four cues ship as small generated WAVs in
 * `assets/sounds`. Both channels are opt-out from Settings, and a failure to
 * play is always swallowed — feedback is a garnish, never a blocker.
 */

type Cue = 'mine' | 'claim' | 'tick' | 'win';

const SOURCES: Record<Cue, number> = {
  mine: require('../../assets/sounds/mine.wav'),
  claim: require('../../assets/sounds/claim.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  win: require('../../assets/sounds/win.wav'),
};

export interface Feedback {
  /** Light tap — selection changes, toggles, tab switches. */
  select: () => void;
  /** Medium tap — a button that commits something. */
  press: () => void;
  /** The mining strike: heavy tap + strike sound. */
  strike: () => void;
  /** Reward banked: success notification + cascade. */
  reward: () => void;
  /** A wheel segment passing the pointer. */
  tick: () => void;
  /** Prize won. */
  win: () => void;
  /** Something went wrong. */
  error: () => void;
  /** Something succeeded but is not a reward (form saved, copied). */
  success: () => void;
  /** A warning that stops short of an error. */
  warn: () => void;
}

const FeedbackContext = createContext<Feedback | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const players = useRef<Partial<Record<Cue, AudioPlayer>>>({});
  const audioReady = useRef(false);

  const haptic = useCallback(
    (run: () => Promise<void>) => {
      if (!settings.haptics) return;
      // Haptics are unavailable on some Android builds and in simulators.
      void run().catch(() => {});
    },
    [settings.haptics],
  );

  const play = useCallback(
    (cue: Cue) => {
      if (!settings.sounds) return;
      try {
        if (!audioReady.current) {
          audioReady.current = true;
          // Play through the media channel, and never interrupt music the
          // user is already listening to.
          void setAudioModeAsync({
            playsInSilentMode: false,
            shouldPlayInBackground: false,
            interruptionMode: 'mixWithOthers',
            interruptionModeAndroid: 'duckOthers',
          }).catch(() => {});
        }
        let player = players.current[cue];
        if (!player) {
          player = createAudioPlayer(SOURCES[cue]);
          players.current[cue] = player;
        }
        void player.seekTo(0);
        player.play();
      } catch {
        /* audio focus denied, or the file failed to decode — ignore */
      }
    },
    [settings.sounds],
  );

  // Four short clips is a trivial amount of memory, but a player left behind
  // holds an audio session open — release them when the provider goes away.
  useEffect(() => {
    const held = players.current;
    return () => {
      Object.values(held).forEach((player) => {
        try {
          player?.remove();
        } catch {
          /* already released */
        }
      });
    };
  }, []);

  const value = useMemo<Feedback>(
    () => ({
      select: () => haptic(() => Haptics.selectionAsync()),
      press: () =>
        haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      strike: () => {
        haptic(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          // A second, softer beat a moment later reads as an impact rather
          // than a single buzz.
          if (Platform.OS === 'ios') {
            setTimeout(() => {
              void Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Medium,
              ).catch(() => {});
            }, 90);
          }
        });
        play('mine');
      },
      reward: () => {
        haptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        );
        play('claim');
      },
      tick: () => {
        haptic(() =>
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
        );
        play('tick');
      },
      win: () => {
        haptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        );
        play('win');
      },
      error: () =>
        haptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
        ),
      success: () =>
        haptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        ),
      warn: () =>
        haptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
        ),
    }),
    [haptic, play],
  );

  return (
    <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>
  );
}

export function useFeedback(): Feedback {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}
