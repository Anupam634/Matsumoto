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
import type { ClaimTaskResult, QuizQuestion } from '../../api/endpoints';

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
  },
  {
    id: 3,
    question: 'What is the base mining rate on a free account?',
    options: ['0.25 /h', '0.50 /h', '0.90 /h', '1.50 /h'],
  },
  {
    id: 4,
    question: 'How often must you tap Mine to keep accruing?',
    options: ['Every hour', 'Every 6 hours', 'Every 12 hours', 'Every 24 hours'],
  },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * The knowledge-check bounty.
 *
 * The server marks the submission and scales the reward by the score, so the
 * answers never reach this client until they have been sent. Answering is one
 * pass with no per-question feedback; the explanations — which are the actual
 * point, since they teach the rules the platform runs on — come back with the
 * marking.
 */
export function QuizSheet({
  rewardPoints,
  questions,
  onSubmit,
  onClose,
}: {
  rewardPoints: number;
  questions?: QuizQuestion[] | null;
  /** Sends the answers to be marked and returns what the server awarded. */
  onSubmit: (answers: number[]) => Promise<ClaimTaskResult>;
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
  const [answers, setAnswers] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<ClaimTaskResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = deck[Math.min(index, deck.length - 1)];
  const selected = answers[index] ?? null;
  const answered = selected !== null;
  const answeredCount = answers.filter((a) => a !== undefined).length;
  const progress = answeredCount / deck.length;
  const isLast = index + 1 === deck.length;
  const quiz = outcome?.quiz ?? null;

  // Recording a choice, not marking it — so it can still be changed while the
  // miner is on the question.
  const choose = (choice: number) => {
    feedback.select();
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = choice;
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit(answers);
      setOutcome(result);
      if (result.quiz && result.quiz.correctCount === result.quiz.total) {
        feedback.win();
      } else {
        feedback.success();
      }
    } catch (err) {
      // Stay on the last question so the answers survive a blip.
      feedback.error();
      setError(err instanceof Error ? err.message : t('app.offline'));
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    void submit();
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('tasksScreen.quizTitle')}
      subtitle={
        quiz
          ? t('tasksScreen.quizDoneTitle')
          : t('tasksScreen.quizProgress', { n: index + 1, total: deck.length })
      }
    >
      {quiz ? (
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
              <Ionicons
                name={quiz.correctCount === quiz.total ? 'trophy' : 'book'}
                size={32}
                color={c.onGold}
              />
            </LinearGradient>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text variant="title2" center>
              {t('tasksScreen.quizDoneTitle')}
            </Text>
            <Text variant="footnote" tone="secondary" center>
              {t('tasksScreen.quizDoneBody', {
                score: quiz.correctCount,
                total: quiz.total,
              })}
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
                +{outcome?.earnedPoints ?? 0}
              </Text>
              <Text variant="callout" tone="info" weight="800" uppercase>
                {t('dashboard.pointsShort')}
              </Text>
            </View>
            {quiz.correctCount < quiz.total ? (
              <Text variant="caption" tone="gold" center>
                {quiz.correctCount}/{quiz.total} of {rewardPoints}
              </Text>
            ) : null}
          </View>

          {/* Per-question review, straight from the server's marking. */}
          <View style={{ width: '100%', gap: spacing.sm }}>
            {quiz.results.map((r, i) => (
              <View
                key={r.id}
                style={{
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: alpha(r.correct ? c.success : c.danger, 0.1),
                  borderWidth: 1,
                  borderColor: alpha(r.correct ? c.success : c.danger, 0.4),
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Ionicons
                    name={r.correct ? 'checkmark-circle' : 'close-circle'}
                    size={17}
                    color={r.correct ? c.success : c.danger}
                  />
                  <Text variant="caption" weight="800" style={{ flex: 1 }}>
                    {deck[i]?.question}
                  </Text>
                </View>
                {!r.correct ? (
                  <Text variant="caption" tone="success">
                    {deck[i]?.options[r.correctIndex]}
                  </Text>
                ) : null}
                <Text variant="caption" tone="tertiary">
                  {r.explanation}
                </Text>
              </View>
            ))}
          </View>

          <Button
            label={t('app.close')}
            onPress={onClose}
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
              {t('tasksScreen.quizScore', {
                score: answeredCount,
                total: deck.length,
              })}
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
                  disabled={submitting}
                  isSelected={selected === i}
                  onPress={() => choose(i)}
                />
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeIn.duration(200)} style={{ gap: spacing.md }}>
            {index > 0 && !submitting ? (
              <Button
                label={t('app.back')}
                variant="ghost"
                onPress={() => setIndex((i) => i - 1)}
                fullWidth
              />
            ) : null}

            {error ? <ErrorNote message={error} /> : null}

            <Button
              label={
                isLast ? t('tasksScreen.quizFinish') : t('tasksScreen.quizNext')
              }
              onPress={next}
              disabled={!answered}
              loading={submitting}
              iconRight="arrow-forward"
              fullWidth
            />
          </Animated.View>
        </>
      )}
    </Sheet>
  );
}

/** One answer row: neutral glass, tinted cyan while it is the chosen one. */
function Option({
  letter,
  label,
  disabled,
  isSelected,
  onPress,
}: {
  letter: string;
  label: string;
  disabled: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Selection only. Emerald and red belong on the review screen now — this
  // client has nothing to mark against until the server has seen the answers.
  const tint = isSelected ? c.info : null;
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
        accessibilityState={{ selected: isSelected, disabled }}
        disabled={disabled}
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
          opacity: disabled ? 0.6 : 1,
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
        {isSelected ? (
          <Ionicons name="radio-button-on" size={20} color={c.info} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
