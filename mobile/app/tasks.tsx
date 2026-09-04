import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '../src/components/ui/Text';
import { Card, SectionLabel } from '../src/components/ui/Card';
import {
  EmptyState,
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../src/components/ui/Chrome';
import { SpinWheelSheet } from '../src/components/tasks/SpinWheelSheet';
import { QuizSheet } from '../src/components/tasks/QuizSheet';
import { WatchSheet } from '../src/components/tasks/WatchSheet';
import { useTheme } from '../src/theme/ThemeProvider';
import { useT } from '../src/i18n';
import { useSession } from '../src/store/session';
import { useToast } from '../src/components/ui/Toast';
import { useFeedback } from '../src/lib/feedback';
import { useAsyncData, useNow } from '../src/lib/hooks';
import { claimTask, getTasks, type TaskDto, type TaskType } from '../src/api/endpoints';
import { errorMessage } from '../src/api/client';
import { coarseCountdown } from '../src/lib/format';

/** i18n key per task type — these labels already exist under `tasks.*`. */
const LABEL_KEY: Record<TaskType, string> = {
  TWEET: 'tweet',
  FOLLOW: 'follow',
  REPOST: 'repost',
  YOUTUBE: 'youtube',
  QUIZ: 'quiz',
  SPIN_WHEEL: 'spin',
};

const ICON: Record<TaskType, keyof typeof Ionicons.glyphMap> = {
  TWEET: 'logo-twitter',
  FOLLOW: 'person-add',
  REPOST: 'repeat',
  YOUTUBE: 'logo-youtube',
  QUIZ: 'school',
  SPIN_WHEEL: 'disc',
};

/** How long the "+N PTS" pill floats above a card after a claim. */
const WON_MS = 2000;

/**
 * Bounties.
 *
 * Social tasks credit on the honour system (the server has no X/YouTube
 * integration), while the wheel and the quiz have their own flows. Available
 * tasks sort to the top; the rest show what they are waiting on.
 */
export default function TasksScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const feedback = useFeedback();
  const { refresh } = useSession();
  const now = useNow(30_000);

  const load = useCallback(() => getTasks(), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data: tasks, error, loading, refreshing, reload } = useAsyncData<TaskDto[]>(
    load,
    toMessage,
  );

  const [busyId, setBusyId] = useState<string | null>(null);
  const [wheelTask, setWheelTask] = useState<TaskDto | null>(null);
  /** Points the wheel paid out — toasted once the sheet is dismissed. */
  const [spinEarned, setSpinEarned] = useState<number | null>(null);
  const [quizTask, setQuizTask] = useState<TaskDto | null>(null);
  const [watchTask, setWatchTask] = useState<TaskDto | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  /** The site's float-up "+N PTS" pill, shown over the card that just paid. */
  const [won, setWon] = useState<{ id: string; points: number } | null>(null);
  const wonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showWon = useCallback((id: string, points: number) => {
    if (wonTimer.current) clearTimeout(wonTimer.current);
    setWon({ id, points });
    wonTimer.current = setTimeout(() => setWon(null), WON_MS);
  }, []);

  useEffect(
    () => () => {
      if (wonTimer.current) clearTimeout(wonTimer.current);
    },
    [],
  );

  const afterClaim = useCallback(async () => {
    await Promise.all([reload({ silent: true }), refresh()]);
  }, [reload, refresh]);

  async function claim(task: TaskDto) {
    if (task.type === 'SPIN_WHEEL' && task.wheelSegments) return setWheelTask(task);
    if (task.type === 'QUIZ') return setQuizTask(task);
    if (task.type === 'YOUTUBE') return setWatchTask(task);

    setBusyId(task.id);
    setClaimError(null);
    try {
      // Social tasks open the target and credit at once, as the web app does:
      // the server cannot verify the follow or repost, so waiting on the
      // browser would only delay the reward without making it any truer.
      if (task.actionUrl) {
        void WebBrowser.openBrowserAsync(task.actionUrl).catch(() => {});
      }
      const res = await claimTask(task.id);
      feedback.reward();
      showWon(task.id, res.earnedPoints);
      toast.success(t('tasksScreen.claimed', { points: res.earnedPoints }));
      await afterClaim();
    } catch (err) {
      feedback.error();
      setClaimError(errorMessage(err, t('app.offline')));
    } finally {
      setBusyId(null);
    }
  }

  const available = (tasks ?? []).filter((task) => task.canClaim);
  const cooling = (tasks ?? []).filter((task) => !task.canClaim);
  const count = tasks?.length ?? 0;

  return (
    <Screen sunken>
      <NavBar title={t('tasksScreen.title')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void reload()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        {/* Panel header — the dashboard section's title row */}
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card glow>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.lg,
                  backgroundColor: alpha(c.primary, 0.15),
                  borderWidth: 1,
                  borderColor: alpha(c.primary, 0.3),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="gift" size={22} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title3">{t('tasksScreen.title')}</Text>
                <Text variant="caption" tone="secondary">
                  {t('tasksScreen.subtitle')}
                </Text>
              </View>
              {loading ? (
                <Skeleton height={26} width={70} radius={radius.pill} />
              ) : (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    backgroundColor: alpha(c.primary, 0.1),
                    borderWidth: 1,
                    borderColor: alpha(c.primary, 0.25),
                  }}
                >
                  <Text variant="caption" tone="brand" mono weight="700">
                    {t('tasksScreen.count', { n: count })}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        </Animated.View>

        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}
        {claimError ? <ErrorNote message={claimError} /> : null}

        {loading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={130} radius={radius.xl} />
            ))}
          </View>
        ) : (tasks ?? []).length === 0 ? (
          <EmptyState icon="gift-outline" title={t('tasksScreen.empty')} />
        ) : (
          <>
            {available.length > 0 ? (
              <>
                <SectionLabel>{t('tasksScreen.available')}</SectionLabel>
                {available.map((task, i) => (
                  <Animated.View
                    key={task.id}
                    entering={FadeInDown.delay(60 + i * 50).duration(280)}
                  >
                    <TaskCard
                      task={task}
                      busy={busyId === task.id}
                      won={won?.id === task.id ? won.points : null}
                      onClaim={() => void claim(task)}
                    />
                  </Animated.View>
                ))}
              </>
            ) : null}

            {cooling.length > 0 ? (
              <>
                <SectionLabel>{t('tasksScreen.cooling')}</SectionLabel>
                {cooling.map((task, i) => (
                  <Animated.View
                    key={task.id}
                    entering={FadeInDown.delay(60 + (available.length + i) * 50).duration(280)}
                  >
                    <TaskCard
                      task={task}
                      busy={false}
                      now={now}
                      won={won?.id === task.id ? won.points : null}
                      onClaim={() => {}}
                    />
                  </Animated.View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {wheelTask?.wheelSegments ? (
        <SpinWheelSheet
          segments={wheelTask.wheelSegments}
          onSpin={async () => {
            const res = await claimTask(wheelTask.id);
            // Settle the balance behind the spinning wheel, so closing it
            // reveals an already-updated dashboard.
            void afterClaim();
            setSpinEarned(res.earnedPoints);
            return { index: res.spinIndex ?? 0, earned: res.earnedPoints };
          }}
          onClose={() => {
            if (spinEarned !== null) {
              showWon(wheelTask.id, spinEarned);
              toast.success(t('tasksScreen.claimed', { points: spinEarned }));
            }
            setSpinEarned(null);
            setWheelTask(null);
          }}
        />
      ) : null}

      {quizTask ? (
        <QuizSheet
          rewardPoints={quizTask.rewardPoints}
          questions={quizTask.quizQuestions}
          onComplete={async () => {
            const res = await claimTask(quizTask.id);
            showWon(quizTask.id, res.earnedPoints);
            toast.success(t('tasksScreen.claimed', { points: res.earnedPoints }));
            await afterClaim();
          }}
          onClose={() => setQuizTask(null)}
        />
      ) : null}

      {watchTask ? (
        <WatchSheet
          rewardPoints={watchTask.rewardPoints}
          videoUrl={watchTask.actionUrl}
          onComplete={async () => {
            const res = await claimTask(watchTask.id);
            showWon(watchTask.id, res.earnedPoints);
            toast.success(t('tasksScreen.claimed', { points: res.earnedPoints }));
            await afterClaim();
          }}
          onClose={() => setWatchTask(null)}
        />
      ) : null}
    </Screen>
  );
}

/* ───────────────────────────── Task card ───────────────────────────── */

/**
 * One bounty — the dashboard's task tile: blue icon tile, black-weight title,
 * cyan mono reward, then a hairline and a full-width pill that is a glowing
 * gradient when claimable and a dim outline with the countdown when not.
 */
function TaskCard({
  task,
  busy,
  now,
  won,
  onClaim,
}: {
  task: TaskDto;
  busy: boolean;
  now?: number;
  won: number | null;
  onClaim: () => void;
}) {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const t = useT();
  const scale = useSharedValue(1);

  const reward = task.wheelSegments
    ? `${Math.min(...task.wheelSegments)}–${Math.max(...task.wheelSegments)}`
    : `+${task.rewardPoints}`;

  const cooldown = coarseCountdown(task.nextAvailableAt, now ?? Date.now());

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`tasks.${LABEL_KEY[task.type]}`)}
        accessibilityState={{ disabled: !task.canClaim || busy }}
        disabled={!task.canClaim || busy}
        onPressIn={() => {
          scale.value = withSpring(0.985, { damping: 20, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={onClaim}
      >
        <Card style={{ opacity: task.canClaim ? 1 : 0.78 }}>
          {won !== null ? (
            <Animated.View
              pointerEvents="none"
              entering={FadeInUp.duration(260)}
              exiting={FadeOutUp.duration(380)}
              style={{
                position: 'absolute',
                top: 10,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 2,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  borderRadius: radius.pill,
                  backgroundColor: alpha(c.success, 0.25),
                  borderWidth: 1,
                  borderColor: alpha(c.success, 0.5),
                  ...glow(c.success, c.dark ? 2 : 1),
                }}
              >
                <Text variant="callout" tone="success" weight="900" mono>
                  +{won.toFixed(2)} {t('dashboard.pointsShort').toUpperCase()}
                </Text>
              </View>
            </Animated.View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            {task.type === 'SPIN_WHEEL' ? (
              <MiniWheel />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.lg,
                  backgroundColor: alpha(c.primary, 0.15),
                  borderWidth: 1,
                  borderColor: alpha(c.primary, 0.3),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={ICON[task.type]}
                  size={21}
                  color={task.type === 'YOUTUBE' ? c.danger : c.primary}
                />
              </View>
            )}

            <View style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
              <Text variant="headline" weight="900" numberOfLines={2}>
                {t(`tasks.${LABEL_KEY[task.type]}`)}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 5,
                  marginTop: 3,
                }}
              >
                <Text variant="callout" tone="info" mono weight="800">
                  {reward}
                </Text>
                <Text variant="caption" tone="tertiary" weight="700" uppercase>
                  {t('dashboard.pointsShort')}
                </Text>
                {task.cooldownHours ? (
                  <Text variant="caption" tone="tertiary" mono>
                    · {task.cooldownHours}h
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: c.border,
            }}
          >
            {task.canClaim ? (
              <View
                style={{
                  borderRadius: radius.pill,
                  ...(busy ? null : glow(c.primaryGlow, c.dark ? 2 : 1)),
                }}
              >
                <View
                  style={{
                    height: 44,
                    borderRadius: radius.pill,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: alpha(c.primary, 0.4),
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={[...c.primaryGradient] as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  {busy ? (
                    <>
                      <ActivityIndicator color={c.onPrimary} size="small" />
                      <Text
                        variant="caption"
                        weight="900"
                        uppercase
                        style={{ color: c.onPrimary, letterSpacing: 1.2 }}
                      >
                        {t('dashboard.working')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={15} color={c.onPrimary} />
                      <Text
                        variant="caption"
                        weight="900"
                        uppercase
                        style={{ color: c.onPrimary, letterSpacing: 1.2 }}
                      >
                        {t('dashboard.claim')}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <View
                style={{
                  height: 44,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: c.dark ? 'rgba(255,255,255,0.1)' : c.border,
                  backgroundColor: c.dark ? 'rgba(2,6,23,0.7)' : c.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Ionicons name="time-outline" size={14} color={c.textTertiary} />
                <Text variant="caption" tone="secondary" mono weight="700">
                  {cooldown
                    ? `${t('dashboard.cooldownShort')} ${cooldown}`
                    : t('dashboard.cooldownShort')}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

/** The dashboard's conic-gradient wheel tile, drawn as six SVG slices. */
function MiniWheel() {
  const { c, radius, alpha } = useTheme();
  const S = 44;
  const cx = S / 2;
  const r = S / 2;
  const colours = ['#3B82F6', '#818CF8', '#7C3AED', '#6366F1', '#2563EB', '#60A5FA'];
  const rad = (deg: number) => (deg * Math.PI) / 180;

  return (
    <View
      style={{
        width: S,
        height: S,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: alpha('#6366F1', 0.35),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: 'absolute' }}>
        {colours.map((fill, i) => {
          const start = i * 60 - 90;
          const end = start + 60;
          const x1 = cx + r * 1.5 * Math.cos(rad(start));
          const y1 = cx + r * 1.5 * Math.sin(rad(start));
          const x2 = cx + r * 1.5 * Math.cos(rad(end));
          const y2 = cx + r * 1.5 * Math.sin(rad(end));
          return (
            <Path
              key={fill}
              d={`M${cx} ${cx} L${x1} ${y1} A${r * 1.5} ${r * 1.5} 0 0 1 ${x2} ${y2} Z`}
              fill={fill}
            />
          );
        })}
        <Circle cx={cx} cy={cx} r={11} fill={c.dark ? '#020617' : c.surface} />
      </Svg>
      <Ionicons name="disc" size={13} color={c.textPrimary} />
    </View>
  );
}
