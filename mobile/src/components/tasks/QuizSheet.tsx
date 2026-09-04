import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

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
  const { c, spacing, radius } = useTheme();
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
        <View style={{ gap: spacing.lg, alignItems: 'center' }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.xl,
              backgroundColor: c.goldMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trophy" size={32} color={c.gold} />
          </View>
          <Text variant="title3" center>
            {t('tasksScreen.quizDoneTitle')}
          </Text>
          <Text variant="footnote" tone="secondary" center>
            {t('tasksScreen.quizDoneBody', { score, total: deck.length })}
          </Text>

          <View
            style={{
              width: '100%',
              alignItems: 'center',
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: c.successMuted,
            }}
          >
            <Text variant="display" mono tone="success">
              +{rewardPoints}
            </Text>
            <Text variant="caption" tone="success" uppercase>
              {t('dashboard.pointsShort')}
            </Text>
          </View>

          {error ? <ErrorNote message={error} /> : null}

          <Button
            label={t('tasksScreen.claimReward', { points: rewardPoints })}
            onPress={() => void claim()}
            loading={claiming}
            fullWidth
            size="lg"
          />
        </View>
      ) : (
        <>
          {/* Progress */}
          <View
            style={{
              height: 5,
              borderRadius: 3,
              backgroundColor: c.surfaceAlt,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 5,
                width: `${progress * 100}%`,
                borderRadius: 3,
                backgroundColor: c.primary,
              }}
            />
          </View>
          <Text variant="caption" tone="tertiary">
            {t('tasksScreen.quizScore', { score, total: deck.length })}
          </Text>

          <Text variant="title3">{question.question}</Text>

          <View style={{ gap: spacing.sm }}>
            {question.options.map((option, i) => {
              const isCorrect = i === question.correctIndex;
              const isSelected = selected === i;

              const bg = !answered
                ? c.surfaceAlt
                : isCorrect
                  ? c.successMuted
                  : isSelected
                    ? c.dangerMuted
                    : c.surfaceAlt;
              const border = !answered
                ? c.border
                : isCorrect
                  ? c.success
                  : isSelected
                    ? c.danger
                    : c.border;

              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: answered }}
                  disabled={answered}
                  onPress={() => choose(i)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: bg,
                    borderWidth: 1.5,
                    borderColor: border,
                    opacity: answered && !isCorrect && !isSelected ? 0.5 : 1,
                  }}
                >
                  <Text variant="callout" weight="500" style={{ flex: 1 }}>
                    {option}
                  </Text>
                  {answered && isCorrect ? (
                    <Ionicons name="checkmark-circle" size={19} color={c.success} />
                  ) : answered && isSelected ? (
                    <Ionicons name="close-circle" size={19} color={c.danger} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {answered ? (
            <Animated.View entering={FadeIn.duration(200)} style={{ gap: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: c.infoMuted,
                }}
              >
                <Ionicons name="bulb-outline" size={17} color={c.info} />
                <Text variant="caption" style={{ color: c.info, flex: 1 }}>
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
