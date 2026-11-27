export type DailyCommunityQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  vocabularyWord?: string;
};

export type DailyCommunityVocabularyWord = {
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
};

export type DailyCommunityQuizContent = {
  title: string;
  description: string;
  questions: DailyCommunityQuizQuestion[];
  vocabulary: DailyCommunityVocabularyWord[];
};

export function validateDailyCommunityQuizContent(
  value: unknown,
  {
    questionCount = 10,
    vocabularyCount = 0,
  }: { questionCount?: number; vocabularyCount?: number } = {},
): DailyCommunityQuizContent {
  if (!value || typeof value !== 'object') throw new Error('Gemini returned an invalid quiz object.');
  const quiz = value as Record<string, unknown>;
  if (typeof quiz.title !== 'string' || !quiz.title.trim() || quiz.title.length > 120) {
    throw new Error('Gemini returned an invalid quiz title.');
  }
  if (typeof quiz.description !== 'string' || !quiz.description.trim() || quiz.description.length > 300) {
    throw new Error('Gemini returned an invalid quiz description.');
  }
  if (!Array.isArray(quiz.questions) || quiz.questions.length !== questionCount) {
    throw new Error(`Gemini must return exactly ${questionCount} quiz questions.`);
  }

  const vocabulary = vocabularyCount === 0 ? [] : validateVocabulary(quiz.vocabulary, vocabularyCount);
  const vocabularyByWord = new Set(vocabulary.map(({ word }) => word.toLocaleLowerCase()));
  const questions = quiz.questions.map((item, index): DailyCommunityQuizQuestion => {
    if (!item || typeof item !== 'object') throw new Error(`Gemini returned an invalid question at position ${index + 1}.`);
    const question = item as Record<string, unknown>;
    if (typeof question.prompt !== 'string' || !question.prompt.trim() || question.prompt.length > 500) {
      throw new Error(`Gemini returned an invalid question prompt at position ${index + 1}.`);
    }
    if (!Array.isArray(question.options) || question.options.length !== 4 ||
      question.options.some((option) => typeof option !== 'string' || !option.trim() || option.length > 240) ||
      new Set(question.options.map((option) => (option as string).trim().toLowerCase())).size !== 4) {
      throw new Error(`Gemini returned invalid answer options at position ${index + 1}.`);
    }
    if (!Number.isInteger(question.answerIndex) || Number(question.answerIndex) < 0 || Number(question.answerIndex) > 3) {
      throw new Error(`Gemini returned an invalid correct answer at position ${index + 1}.`);
    }
    if (typeof question.explanation !== 'string' || !question.explanation.trim() || question.explanation.length > 700) {
      throw new Error(`Gemini returned an invalid explanation at position ${index + 1}.`);
    }

    let vocabularyWord: string | undefined;
    if (vocabularyCount > 0) {
      if (typeof question.vocabularyWord !== 'string' || !vocabularyByWord.has(question.vocabularyWord.trim().toLocaleLowerCase())) {
        throw new Error(`Gemini returned a question that does not use a word from today's vocabulary at position ${index + 1}.`);
      }
      vocabularyWord = question.vocabularyWord.trim();
    }

    return {
      id: `q${index + 1}`,
      prompt: question.prompt.trim(),
      options: question.options.map((option) => (option as string).trim()),
      answerIndex: Number(question.answerIndex),
      explanation: question.explanation.trim(),
      ...(vocabularyWord ? { vocabularyWord } : {}),
    };
  });
  if (new Set(questions.map((question) => question.prompt.trim().toLowerCase())).size !== questionCount) {
    throw new Error('Gemini returned duplicate quiz questions.');
  }
  if (vocabularyCount > 0 &&
    new Set(questions.map((question) => question.vocabularyWord?.toLocaleLowerCase())).size !== questionCount) {
    throw new Error('Gemini must quiz a different vocabulary word in every question.');
  }

  return { title: quiz.title.trim(), description: quiz.description.trim(), questions, vocabulary };
}

function validateVocabulary(value: unknown, vocabularyCount: number): DailyCommunityVocabularyWord[] {
  if (!Array.isArray(value) || value.length !== vocabularyCount) {
    throw new Error(`Gemini must return exactly ${vocabularyCount} vocabulary words.`);
  }

  const vocabulary = value.map((item, index): DailyCommunityVocabularyWord => {
    if (!item || typeof item !== 'object') throw new Error(`Gemini returned an invalid vocabulary entry at position ${index + 1}.`);
    const entry = item as Record<string, unknown>;
    if (typeof entry.word !== 'string' || !/^[a-z][a-z'-]{1,39}$/i.test(entry.word.trim())) {
      throw new Error(`Gemini returned an invalid vocabulary word at position ${index + 1}.`);
    }
    if (typeof entry.partOfSpeech !== 'string' || !entry.partOfSpeech.trim() || entry.partOfSpeech.length > 40) {
      throw new Error(`Gemini returned an invalid part of speech at position ${index + 1}.`);
    }
    if (typeof entry.definition !== 'string' || !entry.definition.trim() || entry.definition.length > 240) {
      throw new Error(`Gemini returned an invalid definition at position ${index + 1}.`);
    }
    if (typeof entry.example !== 'string' || !entry.example.trim() || entry.example.length > 300) {
      throw new Error(`Gemini returned an invalid example at position ${index + 1}.`);
    }
    return {
      word: entry.word.trim(),
      partOfSpeech: entry.partOfSpeech.trim(),
      definition: entry.definition.trim(),
      example: entry.example.trim(),
    };
  });
  if (new Set(vocabulary.map(({ word }) => word.toLocaleLowerCase())).size !== vocabularyCount) {
    throw new Error('Gemini returned duplicate vocabulary words.');
  }
  return vocabulary;
}
