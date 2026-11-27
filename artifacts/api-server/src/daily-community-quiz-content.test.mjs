import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDailyCommunityQuizContent } from './daily-community-quiz-content.ts';

function makeEnglishPack() {
  const vocabulary = Array.from({ length: 100 }, (_, index) => {
    let value = index + 1;
    let suffix = '';
    while (value > 0) {
      value -= 1;
      suffix = String.fromCharCode(97 + (value % 26)) + suffix;
      value = Math.floor(value / 26);
    }
    const word = `word${suffix}`;
    return {
      word,
      partOfSpeech: 'noun',
      definition: `A clear meaning for ${word}.`,
      example: `I learned the word ${word} today.`,
    };
  });
  const questions = vocabulary.slice(0, 25).map(({ word }, index) => ({
    vocabularyWord: word,
    prompt: `What does ${word} mean?`,
    options: ['First choice', 'Second choice', 'Third choice', 'Fourth choice'],
    answerIndex: index % 4,
    explanation: `The correct meaning belongs to ${word}.`,
  }));
  return { title: 'Daily English Words', description: 'Learn and practice English words.', vocabulary, questions };
}

test('validates exactly 100 vocabulary entries and 25 questions linked to distinct words', () => {
  const result = validateDailyCommunityQuizContent(makeEnglishPack(), { questionCount: 25, vocabularyCount: 100 });
  assert.equal(result.vocabulary.length, 100);
  assert.equal(result.questions.length, 25);
  assert.equal(result.questions[0].id, 'q1');
});

test('rejects incomplete daily vocabulary packs', () => {
  const pack = makeEnglishPack();
  pack.vocabulary.pop();
  assert.throws(
    () => validateDailyCommunityQuizContent(pack, { questionCount: 25, vocabularyCount: 100 }),
    /exactly 100 vocabulary words/,
  );
});

test('rejects questions that do not test a daily vocabulary word', () => {
  const pack = makeEnglishPack();
  pack.questions[0].vocabularyWord = 'not-in-the-list';
  assert.throws(
    () => validateDailyCommunityQuizContent(pack, { questionCount: 25, vocabularyCount: 100 }),
    /does not use a word from today's vocabulary/,
  );
});

test('preserves the standard ten-question quiz contract for other communities', () => {
  const questions = Array.from({ length: 10 }, (_, index) => ({
    prompt: `Question ${index + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    answerIndex: 0,
    explanation: 'A short explanation.',
  }));
  const result = validateDailyCommunityQuizContent({
    title: 'Daily quiz',
    description: 'Practice a topic.',
    questions,
  });
  assert.equal(result.questions.length, 10);
  assert.deepEqual(result.vocabulary, []);
});
