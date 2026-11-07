import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Award, CheckCircle2, CircleHelp, Loader2, RotateCw, Trophy } from 'lucide-react';
import { api } from '../../api';

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

type QuizLeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  score: number;
  maxScore: number;
  submittedAt: string;
};

type QuizAttempt = {
  score: number;
  maxScore: number;
  submittedAt: string;
  rank: number | null;
  review: Array<{
    id: string;
    selectedIndex: number | null;
    correctIndex: number;
    explanation: string;
  }>;
};

type DailyQuiz = {
  id: string;
  date: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
};

type QuizResponse = {
  quiz: DailyQuiz | null;
  myAttempt: QuizAttempt | null;
  leaderboard: QuizLeaderboardEntry[];
};

interface DailyCommunityQuizPanelProps {
  communityId: string;
  currentUserId: string;
}

export function DailyCommunityQuizPanel({ communityId, currentUserId }: DailyCommunityQuizPanelProps) {
  const [data, setData] = useState<QuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.communityQuizzes.getToday(communityId) as QuizResponse;
      setData(response);
      setAnswers({});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load today’s quiz.');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    setData(null);
    setAnswers({});
    void loadQuiz();
  }, [communityId, loadQuiz]);

  const submitQuiz = async () => {
    if (!data?.quiz || !data.quiz.questions.every((question) => answers[question.id] !== undefined)) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.communityQuizzes.submit(communityId, data.quiz.id, answers) as {
        attempt: QuizAttempt;
        leaderboard: QuizLeaderboardEntry[];
      };
      setData((previous) => previous ? {
        ...previous,
        myAttempt: result.attempt,
        leaderboard: result.leaderboard,
      } : previous);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit your quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs" aria-label="Daily quiz">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
        <p className="mt-3 text-xs font-bold text-slate-500">Loading today’s community quiz…</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs" aria-label="Daily quiz">
        <div className="flex items-start gap-2 text-sm font-bold text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button type="button" onClick={() => void loadQuiz()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </button>
      </section>
    );
  }

  if (!data?.quiz) {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70 p-8 text-center shadow-xs" aria-label="Daily quiz">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <CircleHelp className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-black text-slate-900">Today’s quiz is being prepared</h2>
        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
          A fresh five-question quiz is scheduled for 6:00 AM IST every day. Check back soon.
        </p>
        {error && <p className="mt-3 text-xs font-semibold text-rose-600" role="alert">{error}</p>}
        <button type="button" onClick={() => void loadQuiz()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
          <RotateCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </section>
    );
  }

  const attempt = data.myAttempt;
  const reviewByQuestion = new Map((attempt?.review || []).map((item) => [item.id, item]));
  const allAnswered = data.quiz.questions.every((question) => answers[question.id] !== undefined);

  return (
    <section className="space-y-4" aria-label="Daily community quiz">
      <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-[#202b66] via-[#35428b] to-[#5a4bb5] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-100">
            <Award className="h-3.5 w-3.5" /> Daily quiz · {data.quiz.date}
          </div>
          <span className="text-[10px] font-bold text-indigo-100">5 questions · 1 point each</span>
        </div>
        <h2 className="mt-3 text-xl font-black tracking-tight">{data.quiz.title}</h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-indigo-100">{data.quiz.description}</p>
        <p className="mt-3 text-[10px] font-semibold text-indigo-200">One submission per member. Results appear on the community leaderboard.</p>
      </div>

      {attempt ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-black text-emerald-950">Quiz submitted</h3>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-sm font-black text-emerald-800 shadow-xs">
              {attempt.score} / {attempt.maxScore}
              {attempt.rank && <span className="ml-2 text-xs font-bold text-emerald-600">Rank #{attempt.rank}</span>}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data.quiz.questions.map((question, index) => {
              const review = reviewByQuestion.get(question.id);
              if (!review) return null;
              return (
                <div key={question.id} className="rounded-xl border border-emerald-100 bg-white p-3">
                  <p className="text-xs font-bold text-slate-800">{index + 1}. {question.prompt}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${review.selectedIndex === review.correctIndex ? 'text-emerald-700' : 'text-rose-600'}`}>
                    Your answer: {review.selectedIndex === null ? 'No answer' : question.options[review.selectedIndex]}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">Correct answer: {question.options[review.correctIndex]}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{review.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.quiz.questions.map((question, index) => (
            <fieldset key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <legend className="sr-only">Question {index + 1}</legend>
              <h3 className="text-sm font-black leading-6 text-slate-900">
                <span className="mr-2 text-indigo-600">{index + 1}.</span>{question.prompt}
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[question.id] === optionIndex;
                  return (
                    <button
                      key={`${question.id}-${optionIndex}`}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAnswers((previous) => ({ ...previous, [question.id]: optionIndex }))}
                      className={`flex items-start gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition-colors ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      {selected
                        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                        : <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                      <span><span className="mr-1 text-slate-400">{String.fromCharCode(65 + optionIndex)}.</span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={() => void submitQuiz()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Submit daily quiz
          </button>
          {!allAnswered && <p className="text-[11px] text-slate-500">Choose one answer for all five questions to submit.</p>}
        </div>
      )}

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-black text-slate-900">Community leaderboard</h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">{data.leaderboard.length} submitted</span>
        </div>
        {data.leaderboard.length ? (
          <ol className="divide-y divide-slate-100">
            {data.leaderboard.map((entry) => (
              <li key={entry.userId} className={`flex items-center gap-3 px-4 py-3 ${entry.userId === currentUserId ? 'bg-indigo-50' : ''}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                  entry.rank === 1 ? 'bg-amber-100 text-amber-700' : entry.rank === 2 ? 'bg-slate-100 text-slate-700' : entry.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-600'
                }`}>{entry.rank}</span>
                {entry.avatar ? (
                  <img src={entry.avatar} alt="" className="h-8 w-8 rounded-full bg-slate-100 object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">{entry.name.slice(0, 1).toUpperCase()}</span>
                )}
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{entry.name}</span>
                <span className="text-xs font-black text-slate-700">{entry.score}/{entry.maxScore}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-4 py-6 text-center text-xs text-slate-500">No one has submitted today’s quiz yet. Be the first!</p>
        )}
      </div>
    </section>
  );
}
