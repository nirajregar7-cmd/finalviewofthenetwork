import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  FileCheck2,
  Loader2,
  Medal,
  MessageCircle,
  Play,
  Share2,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { api } from '../../api';
import type { ChatConversation, User } from '../types';

type Question = {
  id: string;
  prompt: string;
  options: string[];
  source: string;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  college?: string;
  score: number;
  maxMarks: number;
  percentage: number;
  durationSeconds: number;
  submittedAt: string;
};

type ExamSummary = {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  maxMarks: number;
  sourceNote: string;
  questionCount: number;
};

type Attempt = {
  attemptId: string;
  startedAt: string;
  expiresAt: string;
  answers: Record<string, number | null>;
  durationSeconds: number;
  maxMarks: number;
  questions: Question[];
};

type ExamResult = {
  score: number;
  maxMarks: number;
  correctCount: number;
  answeredCount: number;
  submittedAt: string;
  expired: boolean;
  leaderboard: LeaderboardEntry[];
  rank: number | null;
};

interface AptitudeExamPanelProps {
  currentUser: User;
  directConversations?: ChatConversation[];
  onSendMessage?: (conversationId: string, text: string) => Promise<void> | void;
  shareUrl?: string;
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, '0')}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

export const AptitudeExamPanel: React.FC<AptitudeExamPanelProps> = ({
  currentUser,
  directConversations = [],
  onSendMessage,
  shareUrl,
}) => {
  const [exam, setExam] = useState<ExamSummary | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bestAttempt, setBestAttempt] = useState<{ score: number; maxMarks: number; submittedAt?: string } | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [sendingShareTo, setSendingShareTo] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const answersRef = useRef<Record<string, number | null>>({});
  const autoSubmittedRef = useRef(false);

  const loadExam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.aptitude.getExam(currentUser.id);
      setExam(data.exam);
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setBestAttempt(data.bestAttempt || null);
      if (data.activeAttempt) {
        setAttempt(data.activeAttempt);
        const savedAnswers = data.activeAttempt.answers || {};
        setAnswers(savedAnswers);
        answersRef.current = savedAnswers;
        setRemainingSeconds(Math.max(0, Math.ceil((new Date(data.activeAttempt.expiresAt).getTime() - Date.now()) / 1000)));
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load the aptitude exam.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExam();
  }, [currentUser.id]);

  const submitAttempt = async (isAutomatic = false) => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await api.aptitude.submit(attempt.attemptId, currentUser.id, answersRef.current);
      setResult(data);
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setAttempt(null);
      setBestAttempt({
        score: data.score,
        maxMarks: data.maxMarks,
        submittedAt: data.submittedAt,
      });
      if (isAutomatic) setRemainingSeconds(0);
    } catch (err: any) {
      setError(err?.message || 'Could not submit this attempt.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!attempt) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void submitAttempt(true);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [attempt, submitting]);

  const startAttempt = async () => {
    setStarting(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.aptitude.start(currentUser.id);
      setAttempt(data);
      const savedAnswers = data.answers || {};
      setAnswers(savedAnswers);
      answersRef.current = savedAnswers;
      setQuestionIndex(0);
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
      autoSubmittedRef.current = false;
    } catch (err: any) {
      setError(err?.message || 'Could not start the exam.');
    } finally {
      setStarting(false);
    }
  };

  const chooseAnswer = (questionId: string, optionIndex: number) => {
    if (!attempt || submitting) return;
    const nextAnswers = { ...answersRef.current, [questionId]: optionIndex };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    api.aptitude.saveAnswers(attempt.attemptId, currentUser.id, nextAnswers).catch(() => {
      // The final submit still sends the complete local answer map.
    });
  };

  const questions = attempt?.questions || [];
  const currentQuestion = questions[questionIndex];
  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => value !== null && value !== undefined).length,
    [answers],
  );
  const resolvedShareUrl = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const personalConversations = directConversations.filter(
    (conversation) =>
      !conversation.id.startsWith('anonymous-') &&
      !conversation.participant?.id.startsWith('anonymous-'),
  );
  const defaultShareMessage = exam
    ? `Hey everyone! 👋\n\nThe Network's General Aptitude Test is live — a timed challenge conducted by The Network for classmates and batchmates:\n\n• ${exam.questionCount} questions in ${formatDuration(exam.durationSeconds)}\n• Practice speed, accuracy, and reasoning under time pressure\n• Compete with your classmates and batchmates on the leaderboard\n• Discuss the questions with other students in the Aptitude community\n\nTake the test here:\n${resolvedShareUrl}\n\nChallenge your friends, complete the test, and share your score with us!`
    : '';

  useEffect(() => {
    if (exam && !shareMessage) setShareMessage(defaultShareMessage);
  }, [defaultShareMessage, exam, shareMessage]);

  const copyShareMessage = async () => {
    const value = shareMessage.trim();
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement('textarea');
        input.value = value;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      setShareNotice('Message copied — paste it into your class or batch group.');
      window.setTimeout(() => setShareNotice(null), 2600);
    } catch {
      setShareNotice('Could not copy the message. Select it and copy manually.');
    }
  };

  const shareWithDevice = async () => {
    if (!navigator.share) {
      await copyShareMessage();
      return;
    }
    try {
      await navigator.share({
        title: exam?.title || 'Share aptitude exam',
        text: shareMessage,
        url: resolvedShareUrl,
      });
    } catch {
      // Dismissing the native share sheet is not an error.
    }
  };

  const sendShareToConversation = async (conversation: ChatConversation) => {
    if (!onSendMessage || sendingShareTo) return;
    setSendingShareTo(conversation.id);
    setShareNotice(null);
    try {
      await onSendMessage(conversation.id, shareMessage);
      setShareNotice(`Sent to ${conversation.title || conversation.participant?.name || 'your connection'}.`);
      window.setTimeout(() => setShareNotice(null), 2600);
    } catch (err: any) {
      setShareNotice(err?.message || 'Could not send this exam to the connection.');
    } finally {
      setSendingShareTo(null);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-white p-8 text-center shadow-xs">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
        <p className="mt-3 text-xs font-bold text-slate-500">Loading the official aptitude exam…</p>
      </section>
    );
  }

  if (!exam) {
    return <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error || 'The exam is unavailable right now.'}</section>;
  }

  if (attempt && currentQuestion) {
    return (
      <section className="space-y-4" aria-label="Aptitude exam">
        <div className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${remainingSeconds <= 60 ? 'border-rose-300 bg-rose-50' : 'border-indigo-200 bg-gradient-to-br from-[#202b66] via-[#35428b] to-[#5a4bb5] text-white'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${remainingSeconds <= 60 ? 'text-rose-600' : 'text-indigo-100'}`}>The Network · live attempt</p>
              <h2 className={`mt-1 text-lg font-black ${remainingSeconds <= 60 ? 'text-rose-950' : 'text-white'}`}>{exam.title}</h2>
              <p className={`mt-1 text-[11px] ${remainingSeconds <= 60 ? 'text-rose-700' : 'text-indigo-100'}`}>Question {questionIndex + 1} of {questions.length} · {answeredCount} answered</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black ${remainingSeconds <= 60 ? 'bg-rose-100 text-rose-700' : 'bg-white/15 text-white'}`} aria-live="polite">
              <Clock3 className="h-4 w-4" /> {formatClock(remainingSeconds)}
            </div>
          </div>
          <div className={`mt-4 h-1.5 overflow-hidden rounded-full ${remainingSeconds <= 60 ? 'bg-rose-200' : 'bg-white/15'}`}>
            <div className={`h-full rounded-full transition-all ${remainingSeconds <= 60 ? 'bg-rose-500' : 'bg-[#ffd5bd]'}`} style={{ width: `${Math.max(0, Math.min(100, (remainingSeconds / exam.durationSeconds) * 100))}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">1 mark</span>
            <span className="text-[10px] font-semibold text-slate-400">The Network General Aptitude Test</span>
          </div>
          <h3 className="mt-5 text-base font-black leading-7 text-slate-900 sm:text-lg">{currentQuestion.prompt}</h3>
          <div className="mt-5 space-y-2.5">
            {currentQuestion.options.map((option, optionIndex) => {
              const selected = answers[currentQuestion.id] === optionIndex;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseAnswer(currentQuestion.id, optionIndex)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-xs font-semibold transition-colors ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-300' : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${selected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="pt-1">{option}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[10px] leading-4 text-slate-400">{currentQuestion.source}. Select an answer to save it automatically.</p>
          {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700" role="alert">{error}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((value) => value - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {questionIndex < questions.length - 1 ? (
              <button type="button" onClick={() => setQuestionIndex((value) => value + 1)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-black text-white hover:bg-indigo-700">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="button" disabled={submitting} onClick={() => void submitAttempt()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5" />} Submit exam
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Question navigator">
          {questions.map((question, index) => (
            <button key={question.id} type="button" onClick={() => setQuestionIndex(index)} className={`h-7 w-7 rounded-lg text-[10px] font-black ${questionIndex === index ? 'bg-indigo-600 text-white' : answers[question.id] !== undefined ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{index + 1}</button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Official aptitude exam">
      <div className="relative overflow-hidden rounded-2xl border border-[#c9cdfc] bg-gradient-to-br from-[#202b66] via-[#35428b] to-[#5a4bb5] p-5 text-white shadow-[0_12px_30px_rgba(53,66,139,0.2)] sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -bottom-16 right-16 h-28 w-28 rounded-full border border-[#f5b99a]/20" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#ffd5bd]/40 bg-[#ffd5bd]/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#ffe2d3]">Official announcement</span>
            <span className="text-[10px] font-bold text-indigo-100">Conducted by The Network</span>
          </div>
          <h2 className="mt-3 max-w-xl text-xl font-black tracking-tight sm:text-2xl">{exam.title}</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-indigo-100">{exam.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-indigo-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5"><Clock3 className="h-3.5 w-3.5" /> 15 minutes</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5"><FileCheck2 className="h-3.5 w-3.5" /> 15 × 1 mark</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Server-timed</span>
          </div>
           <div className="mt-5 flex flex-wrap gap-2">
             <button type="button" onClick={() => void startAttempt()} disabled={starting} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[11px] font-black text-[#35428b] shadow-sm hover:bg-[#fff4ee] disabled:opacity-60">
               {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
               {bestAttempt ? 'Take the exam again' : 'Start aptitude exam'}
             </button>
             <button
               type="button"
               onClick={() => {
                 setShareMessage(defaultShareMessage);
                 setShareNotice(null);
                 setShareOpen(true);
               }}
               className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-[11px] font-black text-white transition-colors hover:bg-white/20"
             >
               <Share2 className="h-4 w-4" /> Share with batch
             </button>
           </div>
        </div>
      </div>

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Attempt saved</p>
              <h3 className="mt-1 text-lg font-black text-emerald-950">You scored {result.score}/{result.maxMarks}</h3>
              <p className="mt-1 text-xs text-emerald-800">{result.expired ? 'The timer ended, so this attempt was submitted automatically.' : `You answered ${result.answeredCount} of ${result.maxMarks} questions.`} {result.rank ? `Your current leaderboard rank is #${result.rank}.` : ''}</p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700" role="alert">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Award className="h-5 w-5" /></span>
            <div>
              <h3 className="text-sm font-black text-slate-900">A fair practice room</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Every authenticated Network student can participate at any time. Join the Aptitude community to discuss the questions, but membership is not required to take the exam.</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Question attribution</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-900">{exam.sourceNote}</p>
          </div>
          {bestAttempt && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
              <span className="text-[11px] font-bold text-slate-500">Your highest score</span>
              <span className="text-sm font-black text-indigo-700">{bestAttempt.score}/{bestAttempt.maxMarks}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /><h3 className="text-sm font-black text-slate-900">Highest scores</h3></div>
            <span className="text-[10px] font-semibold text-slate-400">Best attempt</span>
          </div>
          <div className="mt-4 space-y-2">
            {leaderboard.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-[11px] font-semibold text-slate-400">Be the first student on the board.</p>
            ) : leaderboard.slice(0, 10).map((entry) => (
              <div key={entry.userId} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${entry.userId === currentUser.id ? 'bg-indigo-50 ring-1 ring-indigo-100' : 'bg-slate-50/70'}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${entry.rank === 1 ? 'bg-amber-100 text-amber-700' : entry.rank === 2 ? 'bg-slate-200 text-slate-700' : entry.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                  {entry.rank <= 3 ? <Medal className="h-3.5 w-3.5" /> : entry.rank}
                </span>
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-slate-800">{entry.name}{entry.userId === currentUser.id ? ' · You' : ''}</p><p className="truncate text-[9px] text-slate-400">{entry.college || 'Network student'}</p></div>
                <span className="text-xs font-black text-indigo-700">{entry.score}/{entry.maxMarks}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {shareOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aptitude-share-title"
            className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Share2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Invite your classmates</p>
                <h2 id="aptitude-share-title" className="mt-1 text-lg font-black text-slate-900">Share this exam with your batch</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Send a ready message to your class group, batchmates, or a personal connection.</p>
              </div>
              <button
                type="button"
                aria-label="Close share dialog"
                onClick={() => setShareOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                [exam.durationSeconds >= 60 ? `${Math.floor(exam.durationSeconds / 60)} min` : `${exam.durationSeconds}s`, 'Build speed'],
                [`${exam.questionCount} Qs`, 'Track accuracy'],
                ['Peers', 'Discuss together'],
              ].map(([label, detail]) => (
                <div key={label} className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-2 py-2.5 text-center">
                  <p className="text-xs font-black text-indigo-800">{label}</p>
                  <p className="mt-0.5 text-[9px] font-semibold text-slate-500">{detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message preview</p>
                <button type="button" onClick={() => setShareMessage(defaultShareMessage)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
                  Reset message
                </button>
              </div>
              <textarea
                value={shareMessage}
                onChange={(event) => setShareMessage(event.target.value)}
                rows={10}
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                aria-label="Exam share message"
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-black text-white no-underline transition-colors hover:bg-[#20bc5a]"
              >
                <MessageCircle className="h-4 w-4" /> Share on WhatsApp
              </a>
              <button
                type="button"
                onClick={() => void copyShareMessage()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
              >
                {shareNotice?.startsWith('Message copied') ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-indigo-600" />}
                Copy message
              </button>
            </div>

            {onSendMessage && (
              <div className="mt-4 rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-[11px] font-black text-slate-900">Send to a personal connection</p>
                    <p className="text-[10px] text-slate-500">Share directly in an existing Network chat.</p>
                  </div>
                </div>
                {personalConversations.length > 0 ? (
                  <div className="mt-3 grid max-h-40 gap-1.5 overflow-y-auto">
                    {personalConversations.slice(0, 10).map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => void sendShareToConversation(conversation)}
                        disabled={Boolean(sendingShareTo)}
                        className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-60"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">
                          {(conversation.participant?.name || conversation.title || 'N').slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-bold text-slate-800">{conversation.participant?.name || conversation.title || 'Network connection'}</span>
                          <span className="block truncate text-[9px] text-slate-500">{conversation.participant?.college || conversation.subtitle || 'Personal chat'}</span>
                        </span>
                        <span className="text-[10px] font-black text-indigo-600">
                          {sendingShareTo === conversation.id ? 'Sending…' : 'Send'}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] leading-4 text-slate-500">
                    Start a chat with a connection first, then you can share the exam here in one tap.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => void shareWithDevice()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Share2 className="h-4 w-4 text-indigo-600" /> More sharing options
            </button>

            {shareNotice && <p className="mt-3 text-center text-[11px] font-bold text-emerald-600">{shareNotice}</p>}
            <p className="mt-4 text-center text-[10px] leading-4 text-slate-400">
              The link opens the Aptitude tab so your classmates can start the exam right away.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default AptitudeExamPanel;