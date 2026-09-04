import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../src/components/ui/Text';
import { Card, SectionLabel } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
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
import { useI18n, useT } from '../src/i18n';
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
  TWEET: 'chatbox-ellipses',
  FOLLOW: 'person-add',
  REPOST: 'repeat',
  YOUTUBE: 'logo-youtube',
  QUIZ: 'school',
  SPIN_WHEEL: 'disc',
};

const TINT: Record<TaskType, 'brand' | 'gold' | 'success' | 'danger' | 'info'> = {
  TWEET: 'brand',
  FOLLOW: 'brand',
  REPOST: 'info',
  YOUTUBE: 'danger',
  QUIZ: 'info',
  SPIN_WHEEL: 'gold',
};

/**
 * Bounties.
 *
 * Social tasks credit on the honour system (the server has no X/YouTube
 * integration), while the wheel and the quiz have their own flows. Available
 * tasks sort to the top; the rest show what they are waiting on.
 */
export default function TasksScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
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
  const [quizTask, setQuizTask] = useState<TaskDto | null>(null);
  const [watchTask, setWatchTask] = useState<TaskDto | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

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
      // Social tasks open the target first: the reward is for doing the thing,
      // and the app cannot verify it, so it at least takes you there.
      if (task.actionUrl) {
        await WebBrowser.openBrowserAsync(task.actionUrl).catch(() => {});
      }
      const res = await claimTask(task.id);
      feedback.reward();
      toast.success(t('tasksScreen.claimReward', { points: res.earnedPoints }));
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

  return (
    <Screen sunken>
      <NavBar title={t('tasksScreen.title')} subtitle={t('tasksScreen.subtitle')} />

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
        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}
        {claimError ? <ErrorNote message={claimError} /> : null}

        {loading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={84} radius={radius.xl} />
            ))}
          </View>
        ) : (tasks ?? []).length === 0 ? (
          <EmptyState icon="gift-outline" title={t('tasksScreen.empty')} />
        ) : (
          <>
            {available.length > 0 ? (
              <>
                <SectionLabel>{t('tasksScreen.available')}</SectionLabel>
                {available.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    busy={busyId === task.id}
                    onClaim={() => void claim(task)}
                  />
                ))}
              </>
            ) : null}

            {cooling.length > 0 ? (
              <>
                <SectionLabel>{t('tasksScreen.cooling')}</SectionLabel>
                {cooling.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    busy={false}
                    now={now}
                    onClaim={() => {}}
                  />
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
            return { index: res.spinIndex ?? 0, earned: res.earnedPoints };
          }}
          onClose={() => setWheelTask(null)}
        />
      ) : null}

      {quizTask ? (
        <QuizSheet
          rewardPoints={quizTask.rewardPoints}
          questions={quizTask.quizQuestions}
          onComplete={async () => {
            const res = await claimTask(quizTask.id);
            toast.success(t('tasksScreen.claimReward', { points: res.earnedPoints }));
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
            toast.success(t('tasksScreen.claimReward', { points: res.earnedPoints }));
            await afterClaim();
          }}
          onClose={() => setWatchTask(null)}
        />
      ) : null}
    </Screen>
  );
}

function TaskCard({
  task,
  busy,
  now,
  onClaim,
}: {
  task: TaskDto;
  busy: boolean;
  now?: number;
  onClaim: () => void;
}) {
  const { c, spacing, radius } = useTheme();
  const t = useT();

  const tintName = TINT[task.type];
  const tint = {
    brand: c.primary,
    gold: c.gold,
    success: c.success,
    danger: c.danger,
    info: c.info,
  }[tintName];

  const reward = task.wheelSegments
    ? `${Math.min(...task.wheelSegments)}–${Math.max(...task.wheelSegments)}`
    : `+${task.rewardPoints}`;

  const cooldown = coarseCountdown(task.nextAvailableAt, now ?? Date.now());

  return (
    <Card style={{ opacity: task.canClaim ? 1 : 0.72 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: `${tint}1F`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={ICON[task.type]} size={21} color={tint} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="headline" numberOfLines={2}>
            {t(`tasks.${LABEL_KEY[task.type]}`)}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 3,
            }}
          >
            <Badge label={`${reward} pts`} tone={tintName} />
            {task.cooldownHours ? (
              <Text variant="caption" tone="tertiary">
                {task.cooldownHours}h
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {task.canClaim ? (
        <Button
          label={t('dashboard.claim')}
          icon="sparkles"
          onPress={onClaim}
          loading={busy}
          variant={tintName === 'gold' ? 'gold' : 'primary'}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: spacing.md,
            paddingVertical: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: c.surfaceAlt,
          }}
        >
          <Ionicons name="time-outline" size={15} color={c.textTertiary} />
          <Text variant="footnote" tone="tertiary" mono>
            {cooldown ?? t('dashboard.cooldownShort')}
          </Text>
        </View>
      )}
    </Card>
  );
}
