import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ErrorNote } from '../ui/Chrome';
import { useTheme } from '../../theme/ThemeProvider';
import { useT } from '../../i18n';
import { useFeedback } from '../../lib/feedback';
import type { QuizQuestion } from '../../api/endpoints';

/** Fallback deck, used when the admin has not configured questions. */
const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Which blockchain settles $BONDKOIN withdrawals?',
    options: [
      'BNB Smart Chain (BEP-20)',
      'Ethereum Mainnet (ERC-20)',
      'Solana (SPL)',
      'Bitcoin Lightning',
    ],
    correctIndex: 0,
    explanation:
      'Payouts settle on BNB Smart Chain as BEP-20 transfers — low fees, fast finality.',
  },
  {
    id: 2,
    question: 'What is the point-to-token conversion rate?',
    options: [
      '1 point = 1 $BONDKOIN',
      '3 points = 1 $BONDKOIN',
      '10 points = 1 $BONDKOIN',
      '5 points = 1 $BONDKOIN',
    ],
    correctIndex: 1,
    explanation: 'Three points convert to one $BONDKOIN, fixed at withdrawal time.',
  },
  {
    id: 3,
    question: 'What is the base mining rate on a free account?',
    options: ['0.25 /h', '0.50 /h', '0.90 /h', '1.50 /h'],
    correctIndex: 2,
    explanation: 'Every account accrues 0.90 points an hour before boosters.',
  },
  {
    id: 4,
    question: 'How often must you tap Mine to keep accruing?',
    options: ['Every hour', 'Every 6 hours', 'Every 12 hours', 'Every 24 hours'],
    correctIndex: 3,
    explanation:
      'Accrual is capped at 24 hours worth — tapping Mine banks it and restarts the window.',
  },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * The knowledge-check bounty.
 *
 * Answering is a formality the server does not grade: the reward is fixed and
 * claimed on completion. The explanations are the actual point — they teach
 * the rules the platform runs on.
 */
export function QuizSheet({
  rewardPoints,
  questions,
  onComplete,
  onClose,
}: {
  rewardPoints: number;
  questions?: QuizQuestion[] | null;
  onComplete: () => Promise<void>;
  onClose: () => void;
}) {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  const deck = useMemo(
    () => (questions && questions.length > 0 ? questions : DEFAULT_QUESTIONS),
    [questions],
  );

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = deck[Math.min(index, deck.length - 1)];
  const answered = selected !== null;
  const progress = (index + (answered ? 1 : 0)) / deck.length;

  const choose = (choice: number) => {
    if (answered) return;
    setSelected(choice);
    if (choice === question.correctIndex) {
      setScore((s) => s + 1);
      feedback.success();
    } else {
      feedback.warn();
    }
  };

  const next = () => {
    if (index + 1 < deck.length) {
      setIndex((i) => i + 1);
      setSelected(null);
      return;
    }
    setFinished(true);
    feedback.win();
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

  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('tasksScreen.quizTitle')}
      subtitle={
        finished
          ? t('tasksScreen.quizDoneTitle')
          : t('tasksScreen.quizProgress', { n: index + 1, total: deck.length })
      }
    >
      {finished ? (
        <Animated.View
          entering={ZoomIn.duration(300)}
          style={{ gap: spacing.lg, alignItems: 'center' }}
        >
          {/* Trophy on the amber → yellow gradient tile */}
          <View style={{ borderRadius: radius.xl, ...glow(c.gold, c.dark ? 2 : 1) }}>
            <LinearGradient
              colors={[...c.goldGradient] as [string, string, ...string[]]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.xl,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="trophy" size={32} color={c.onGold} />
            </LinearGradient>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text variant="title2" center>
              {t('tasksScreen.quizDoneTitle')}
            </Text>
            <Text variant="footnote" tone="secondary" center>
              {t('tasksScreen.quizDoneBody', { score, total: deck.length })}
            </Text>
          </View>

          {/* Reward panel — amber ring, cyan mono figure */}
          <View
            style={{
              width: '100%',
              alignItems: 'center',
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: alpha(c.gold, c.dark ? 0.15 : 0.08),
              borderWidth: 1,
              borderColor: alpha(c.gold, 0.4),
              overflow: 'hidden',
            }}
          >
            <Text variant="overline" tone="gold" uppercase>
              {t('tasksScreen.reward')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text variant="display" mono tone="info">
                +{rewardPoints}
              </Text>
              <Text variant="callout" tone="info" weight="800" uppercase>
                {t('dashboard.pointsShort')}
              </Text>
            </View>
          </View>

          {error ? <ErrorNote message={error} /> : null}

          <Button
            label={t('tasksScreen.claimReward', { points: rewardPoints })}
            icon="sparkles"
            onPress={() => void claim()}
            loading={claiming}
            fullWidth
            size="lg"
          />
        </Animated.View>
      ) : (
        <>
          {/* Progress — "Q 2/4" left, "SCORE: 1/4" in cyan right */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="caption" tone="tertiary" mono weight="700">
              Q {index + 1}/{deck.length}
            </Text>
            <Text variant="caption" tone="info" mono weight="700" uppercase>
              {t('tasksScreen.quizScore', { score, total: deck.length })}
            </Text>
          </View>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: c.dark ? 'rgba(30,41,59,0.8)' : c.surfaceAlt,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={[c.info, c.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 6,
                width: `${Math.max(2, progress * 100)}%`,
                borderRadius: 3,
              }}
            />
          </View>

          {/* Question card */}
          <Animated.View
            key={`q-${question.id}`}
            entering={FadeInDown.duration(240)}
            style={{
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: c.dark ? 'rgba(15,23,42,0.5)' : c.surfaceAlt,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Text variant="headline" weight="800">
              {question.question}
            </Text>
          </Animated.View>

          <View style={{ gap: spacing.sm }}>
            {question.options.map((option, i) => (
              <Animated.View
                key={`${question.id}-${i}`}
                entering={FadeInDown.delay(40 + i * 40).duration(240)}
              >
                <Option
                  letter={LETTERS[i] ?? String(i + 1)}
                  label={option}
                  answered={answered}
                  isCorrect={i === question.correctIndex}
                  isSelected={selected === i}
                  onPress={() => choose(i)}
                />
              </Animated.View>
            ))}
          </View>

          {answered ? (
            <Animated.View entering={FadeIn.duration(200)} style={{ gap: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: alpha(c.info, 0.1),
                  borderWidth: 1,
                  borderColor: alpha(c.info, 0.3),
                }}
              >
                <Ionicons name="bulb-outline" size={17} color={c.info} />
                <Text variant="caption" tone="info" style={{ flex: 1 }}>
                  {question.explanation}
                </Text>
              </View>
              <Button
                label={
                  index + 1 === deck.length
                    ? t('tasksScreen.quizFinish')
                    : t('tasksScreen.quizNext')
                }
                onPress={next}
                iconRight="arrow-forward"
                fullWidth
              />
            </Animated.View>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

/** One answer row: neutral glass until answered, then emerald / red / dimmed. */
function Option({
  letter,
  label,
  answered,
  isCorrect,
  isSelected,
  onPress,
}: {
  letter: string;
  label: string;
  answered: boolean;
  isCorrect: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const tint = !answered ? null : isCorrect ? c.success : isSelected ? c.danger : null;
  const bg = tint
    ? alpha(tint, c.dark ? 0.15 : 0.1)
    : c.dark
      ? 'rgba(15,23,42,0.6)'
      : c.surfaceAlt;
  const border = tint ? alpha(tint, 0.6) : c.border;

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled: answered }}
        disabled={answered}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 20, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: 52,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          opacity: answered && !isCorrect && !isSelected ? 0.45 : 1,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.sm,
            backgroundColor: tint ? alpha(tint, 0.2) : alpha(c.primary, 0.15),
            borderWidth: 1,
            borderColor: tint ? alpha(tint, 0.5) : alpha(c.primary, 0.3),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            variant="caption"
            mono
            weight="800"
            style={{ color: tint ?? c.primary }}
          >
            {letter}
          </Text>
        </View>
        <Text variant="callout" weight="600" style={{ flex: 1 }}>
          {label}
        </Text>
        {answered && isCorrect ? (
          <Ionicons name="checkmark-circle" size={20} color={c.success} />
        ) : answered && isSelected ? (
          <Ionicons name="close-circle" size={20} color={c.danger} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
