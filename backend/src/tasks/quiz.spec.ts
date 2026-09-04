import { BadRequestException } from '@nestjs/common';
import { gradeQuiz, stripAnswer, type QuizQuestionDto } from './tasks.service';

const questions: QuizQuestionDto[] = [
  {
    id: 1,
    question: 'Which chain?',
    options: ['BNB', 'ETH', 'SOL', 'BTC'],
    correctIndex: 0,
    explanation: 'BONDKOIN settles on BNB Smart Chain.',
  },
  {
    id: 2,
    question: 'Points per token?',
    options: ['1', '3', '10', '5'],
    correctIndex: 1,
    explanation: 'Three points convert to one token.',
  },
];

describe('stripAnswer', () => {
  it('withholds the answer and the explanation that names it', () => {
    const shown = stripAnswer(questions[0]);

    expect(shown).toEqual({
      id: 1,
      question: 'Which chain?',
      options: ['BNB', 'ETH', 'SOL', 'BTC'],
    });
    // Belt and braces: the explanation gives the answer away in prose, so it
    // must not ride along with the question either.
    expect(JSON.stringify(shown)).not.toContain('BNB Smart Chain');
    expect(shown).not.toHaveProperty('correctIndex');
  });
});

describe('gradeQuiz', () => {
  it('marks a perfect submission', () => {
    const result = gradeQuiz(questions, [0, 1]);

    expect(result.correctCount).toBe(2);
    expect(result.total).toBe(2);
    expect(result.results.every((r) => r.correct)).toBe(true);
  });

  it('marks a partial submission and returns what was missed', () => {
    const result = gradeQuiz(questions, [0, 3]);

    expect(result.correctCount).toBe(1);
    expect(result.results[1]).toEqual({
      id: 2,
      yourAnswer: 3,
      correctIndex: 1,
      correct: false,
      explanation: 'Three points convert to one token.',
    });
  });

  it('marks a submission that got nothing right', () => {
    expect(gradeQuiz(questions, [1, 0]).correctCount).toBe(0);
  });

  it('refuses a claim with no answers at all', () => {
    // Otherwise the reward is free, which is what it used to be.
    expect(() => gradeQuiz(questions, undefined)).toThrow(BadRequestException);
  });

  it('refuses a submission of the wrong length rather than scoring it', () => {
    // A short submission is a client bug; marking the missing answers wrong
    // would burn the miner's cooldown for someone else's mistake.
    expect(() => gradeQuiz(questions, [0])).toThrow(/2 questions; 1 answer/);
    expect(() => gradeQuiz(questions, [0, 1, 0])).toThrow(BadRequestException);
  });

  it('refuses an option index that does not exist', () => {
    expect(() => gradeQuiz(questions, [0, 4])).toThrow(/Answer 2/);
    expect(() => gradeQuiz(questions, [0, -1])).toThrow(/Answer 2/);
    expect(() => gradeQuiz(questions, [0, 1.5])).toThrow(/Answer 2/);
  });
});
