import express from 'express';
import type { Response } from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import compression from 'compression';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { db, pool } from './db.js';
import {
  users, posts, comments, connections, userBlocks, messages, communities, stories, reports, pushSubscriptions,
  notifications, projects, events, workshopRegistrations, hostedWorkshops, groupChats, groupMessages, collegeAnnouncements, attendanceSubjects, savedItems,
  collegeSettings, referrals, findPeopleRequests, findPeopleApplications, customColleges,
  networkCompetitions, networkCompetitionTeams, networkCompetitionSubmissions, networkCompetitionVotes,
  aptitudeExams, aptitudeAttempts
} from '@workspace/db/schema';
import {
  extractMentionedUserIds,
  getCommentNotificationRecipients,
  hasBroadcastMention,
} from './mentions.js';
import { eq, or, and, desc, gte, lte, lt, inArray, sql } from 'drizzle-orm';
import {
  buildHomeFeedScope,
  normalizeHomeFeedRequest,
  sanitizeHomeFeedAuthorId,
} from './home-feed.js';
import {
  createEmailDelivery,
  EmailDeliveryError,
} from './email-delivery.js';
import {
  consumeOtpChallenge,
  deleteOtpChallenge,
  generateOtpCode,
  normalizeOtpEmail,
  storeOtpChallenge,
  type OtpConsumeStatus,
} from './otp-challenges.js';
import {
  getInboxThread,
  listInboxThreads,
  replyToInboxThread,
} from './gmail-mailbox.js';
import { deriveVapidPublicKey, normalizeVapidKey, vapidKeysMatch } from './vapid.js';
import { getPublicAppBaseUrl } from './runtime-config.js';
import {
  buildPostEngagementById,
  type PostInteractionRow,
  type SharedPostEngagement,
} from './post-engagement.js';
import {
  attachChatRealtime,
  emitDirectEvent,
  emitDirectMessage,
  emitEntityMessage,
  emitGroupMessage,
} from './chat-realtime.js';

const CANONICAL_NIT_TRICHY = 'NIT Tiruchirappalli';
const NIT_TRICHY_ALIASES = new Set([
  'nit trichy',
  'nit tiruchirappalli',
  'nit tiruchirapalli',
  'national institute of technology tiruchirappalli',
  'national institute of technology tiruchirapalli',
]);
const CANONICAL_KRCE_TRICHY = 'KRCE Trichy';
const KRCE_TRICHY_ALIASES = new Set([
  'krce trichy',
  'k ramakrishnan college of engineering',
  'k ramakrishnan college of engineering trichy',
]);

const MAX_POST_WORDS = 5000;
const IS_SERVERLESS_RUNTIME = Boolean(
  process.env.VERCEL || process.env.FIREBASE_CONFIG || process.env.FUNCTION_TARGET,
);
const IS_VERCEL_RUNTIME = Boolean(process.env.VERCEL);
const PUBLIC_APP_BASE_URL = getPublicAppBaseUrl();

const APTITUDE_COMMUNITY_ID = 'official-aptitude';
const APTITUDE_EXAM_ID = 'gate-general-aptitude-15';
const GATE_GENERAL_APTITUDE_SOURCE = 'GATE General Aptitude previous-year questions, adapted for practice. Verify the original wording and marking scheme in the linked official GATE paper archive.';
const GATE_GENERAL_APTITUDE_QUESTIONS = [
  {
    id: 'ga-01',
    prompt: 'If x + y = 10 and xy = 21, what is x² + y²?',
    options: ['42', '58', '79', '100'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2022',
  },
  {
    id: 'ga-02',
    prompt: 'A train travels 60 km at 30 km/h and the next 60 km at 60 km/h. What is its average speed?',
    options: ['36 km/h', '40 km/h', '45 km/h', '50 km/h'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2022',
  },
  {
    id: 'ga-03',
    prompt: 'The statement “All engineers are curious. Some students are engineers.” logically implies that:',
    options: ['All students are curious', 'Some students are curious', 'No student is curious', 'Some curious people are not students'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2023',
  },
  {
    id: 'ga-04',
    prompt: 'A box contains 3 red and 2 blue balls. Two balls are drawn without replacement. What is the probability that both are red?',
    options: ['1/5', '1/4', '3/10', '1/2'],
    answerIndex: 2,
    source: 'Adapted from GATE General Aptitude 2023',
  },
  {
    id: 'ga-05',
    prompt: 'Choose the word that is closest in meaning to “mitigate”.',
    options: ['Intensify', 'Reduce', 'Predict', 'Separate'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2021',
  },
  {
    id: 'ga-06',
    prompt: 'A number is increased by 20% and then decreased by 20%. The net change is:',
    options: ['No change', '4% increase', '4% decrease', '8% decrease'],
    answerIndex: 2,
    source: 'Adapted from GATE General Aptitude 2021',
  },
  {
    id: 'ga-07',
    prompt: 'If 2, 6, 12, 20, 30, ... is the sequence, what is the next term?',
    options: ['36', '40', '42', '44'],
    answerIndex: 2,
    source: 'Adapted from GATE General Aptitude 2020',
  },
  {
    id: 'ga-08',
    prompt: 'A clock shows 3:00. What is the smaller angle between its hour and minute hands at 3:30?',
    options: ['75°', '90°', '105°', '120°'],
    answerIndex: 0,
    source: 'Adapted from GATE General Aptitude 2020',
  },
  {
    id: 'ga-09',
    prompt: 'In a class, 60% of the students study mathematics, 40% study physics, and 20% study both. What percentage study neither?',
    options: ['10%', '20%', '30%', '40%'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2019',
  },
  {
    id: 'ga-10',
    prompt: 'The median of 3, 7, 8, 12 and 15 is:',
    options: ['7', '8', '9', '12'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2019',
  },
  {
    id: 'ga-11',
    prompt: 'A person walks 5 km north, then 3 km east, and then 5 km south. How far is the person from the starting point?',
    options: ['2 km', '3 km', '5 km', '13 km'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2018',
  },
  {
    id: 'ga-12',
    prompt: 'If the first two statements are true, which conclusion follows? Some books are old. All old things are valuable.',
    options: ['All books are valuable', 'Some books are valuable', 'No books are valuable', 'Some valuable things are not old'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2018',
  },
  {
    id: 'ga-13',
    prompt: 'A work can be completed by 6 people in 12 days. At the same rate, how many days will 8 people take?',
    options: ['8 days', '9 days', '10 days', '16 days'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2017',
  },
  {
    id: 'ga-14',
    prompt: 'Which one of the following is a necessary condition for a number to be divisible by 6?',
    options: ['It is divisible by 2 and 3', 'It is divisible by 2 and 5', 'It is odd and divisible by 3', 'Its last digit is 6'],
    answerIndex: 0,
    source: 'Adapted from GATE General Aptitude 2017',
  },
  {
    id: 'ga-15',
    prompt: 'A fair coin is tossed three times. What is the probability of getting exactly two heads?',
    options: ['1/8', '3/8', '1/2', '5/8'],
    answerIndex: 1,
    source: 'Adapted from GATE General Aptitude 2016',
  },
];

function publicAptitudeQuestions(questions: any[]) {
  return questions.map(({ answerIndex: _answerIndex, ...question }) => question);
}

async function ensureAptitudeCommunity() {
  const existing = await db.select().from(communities).where(eq(communities.id, APTITUDE_COMMUNITY_ID));
  if (existing.length > 0) return existing[0];
  const inserted = await db.insert(communities).values({
    id: APTITUDE_COMMUNITY_ID,
    name: 'Aptitude',
    description: 'Official aptitude practice by The Network, with timed GATE General Aptitude question sets and peer discussion.',
    icon: 'Brain',
    memberIds: [],
    tags: ['official', 'aptitude', 'gate', 'general aptitude', 'exam'],
    category: 'Interest',
    threads: [],
    resources: [],
    polls: [],
    creatorId: 'system',
    adminIds: [],
    blockedMemberIds: [],
  }).returning();
  return inserted[0];
}

async function ensureAptitudeExam() {
  const existing = await db.select().from(aptitudeExams).where(eq(aptitudeExams.id, APTITUDE_EXAM_ID));
  if (existing.length > 0) return existing[0];
  const inserted = await db.insert(aptitudeExams).values({
    id: APTITUDE_EXAM_ID,
    slug: 'gate-general-aptitude-15',
    title: 'GATE General Aptitude Sprint',
    description: '15 one-mark questions in 15 minutes. Test your speed, accuracy, and reasoning.',
    durationSeconds: 15 * 60,
    maxMarks: 15,
    questions: GATE_GENERAL_APTITUDE_QUESTIONS,
    sourceNote: GATE_GENERAL_APTITUDE_SOURCE,
  }).returning();
  return inserted[0];
}

type DevpostHackathon = {
  id: number;
  title: string;
  displayed_location?: { location?: string };
  open_state?: string;
  url?: string;
  time_left_to_submission?: string;
  submission_period_dates?: string;
  themes?: Array<{ name?: string }>;
  prize_amount?: string;
  registrations_count?: number;
  organization_name?: string;
  featured?: boolean;
  invite_only?: boolean;
  eligibility_requirement_invite_only_description?: string | null;
};

function officialHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

let devpostCompetitionsCache: {
  expiresAt: number;
  data: unknown[];
} | null = null;

function stripHtml(value: string | undefined): string {
  return (value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function competitionCategory(themes: string[]): 'Hackathon' | 'Case Study' | 'Design' | 'Coding' | 'Quiz' {
  const normalized = themes.join(' ').toLowerCase();
  if (normalized.includes('design')) return 'Design';
  if (normalized.includes('coding') || normalized.includes('programming') || normalized.includes('algorithm')) return 'Coding';
  if (normalized.includes('quiz')) return 'Quiz';
  if (normalized.includes('business') || normalized.includes('entrepreneur')) return 'Case Study';
  return 'Hackathon';
}

function competitionAccent(index: number): string {
  return [
    'from-[#27346f] via-[#39468c] to-[#f06b4f]',
    'from-[#173c53] to-[#227b78]',
    'from-[#713c5f] to-[#d46c5c]',
    'from-[#344b32] to-[#c99a44]',
    'from-[#344274] to-[#59a4b4]',
  ][index % 5];
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function connectPreferenceForPurpose(purpose: string): string {
  switch (purpose) {
    case 'Study Partner':
    case 'Coding Partner':
      return 'DSA Partner';
    case 'Project Partner':
      return 'Project Teammate';
    case 'Hackathon Teammates':
      return 'Hackathon Team';
    case 'Senior Guidance':
      return 'Mentor';
    case 'Internship Partner':
      return 'Internship Guidance';
    default:
      return purpose;
  }
}

function canonicalizeCollegeName(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined) return value;
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  if (KRCE_TRICHY_ALIASES.has(normalized)) return CANONICAL_KRCE_TRICHY;
  return NIT_TRICHY_ALIASES.has(normalized) ? CANONICAL_NIT_TRICHY : trimmed;
}

// ── Email delivery ─────────────────────────────────────────────────────────────
// Authentication/security and activity mail use Brevo when configured, with
// the generic SMTP transport retained as a fallback for existing deployments.
// Credentials stay server-only and are never returned to clients.
const PRIMARY_ADMIN_EMAIL = (process.env.PRIMARY_ADMIN_EMAIL || 'admin@thenetwork.app').trim().toLowerCase();
const EMAIL_FROM_ADDRESS = (process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@thenetwork.app').trim();
const BREVO_EMAIL_FROM_ADDRESS = (process.env.BREVO_EMAIL_FROM || EMAIL_FROM_ADDRESS).trim();
const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = (process.env.SMTP_USER || EMAIL_FROM_ADDRESS).trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_CONNECTION_TIMEOUT = IS_VERCEL_RUNTIME ? 3_000 : 15_000;
const SMTP_GREETING_TIMEOUT = IS_VERCEL_RUNTIME ? 3_000 : 15_000;
const SMTP_SOCKET_TIMEOUT = IS_VERCEL_RUNTIME ? 5_000 : 15_000;
const BREVO_SMTP_HOST = (process.env.BREVO_SMTP_HOST || '').trim();
const BREVO_SMTP_PORT = Number.parseInt(process.env.BREVO_SMTP_PORT || '587', 10);
const BREVO_SMTP_USER = (process.env.BREVO_SMTP_USER || '').trim();
const BREVO_SMTP_PASS = (process.env.BREVO_SMTP_PASS || '').replace(/\s+/g, '');
const BREVO_SMTP_SECURE = process.env.BREVO_SMTP_SECURE === 'true' || BREVO_SMTP_PORT === 465;
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').trim();
const smtpTransporter = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: SMTP_CONNECTION_TIMEOUT,
      greetingTimeout: SMTP_GREETING_TIMEOUT,
      socketTimeout: SMTP_SOCKET_TIMEOUT,
    })
  : null;
const brevoSmtpTransporter = !IS_VERCEL_RUNTIME && BREVO_SMTP_HOST && BREVO_SMTP_USER && BREVO_SMTP_PASS
  ? nodemailer.createTransport({
      host: BREVO_SMTP_HOST,
      port: BREVO_SMTP_PORT,
      secure: BREVO_SMTP_SECURE,
      auth: { user: BREVO_SMTP_USER, pass: BREVO_SMTP_PASS },
      connectionTimeout: SMTP_CONNECTION_TIMEOUT,
      greetingTimeout: SMTP_GREETING_TIMEOUT,
      socketTimeout: SMTP_SOCKET_TIMEOUT,
    })
  : null;
const { sendBrevoEmail, sendSmtpEmail, sendSmtpBulkEmail, sendBrevoBulkEmail } = createEmailDelivery({
  brevoApiKey: BREVO_API_KEY,
  emailFromAddress: EMAIL_FROM_ADDRESS,
  brevoEmailFromAddress: BREVO_EMAIL_FROM_ADDRESS,
  brevoSmtpTransporter,
  smtpTransporter,
  preferBrevoApi: IS_VERCEL_RUNTIME || Boolean(BREVO_API_KEY),
  apiTimeoutMs: IS_VERCEL_RUNTIME ? 4_000 : 8_000,
});
const hasBrevoDelivery = Boolean(BREVO_API_KEY || brevoSmtpTransporter);
if (BREVO_API_KEY) {
  console.info('[email] Brevo API preferred for transactional mail');
}

if (brevoSmtpTransporter) {
  console.log(`[email] Brevo SMTP configured for transactional mail host=${BREVO_SMTP_HOST} port=${BREVO_SMTP_PORT} secure=${BREVO_SMTP_SECURE}`);
} else if (BREVO_API_KEY) {
  console.log('[email] Brevo API configured for transactional mail');
} else {
  console.warn('[email] Brevo SMTP/API is not configured; authentication/security mail uses generic SMTP if available');
}
if (smtpTransporter) {
  console.log(`[email] SMTP fallback configured host=${SMTP_HOST} port=${SMTP_PORT} secure=${SMTP_SECURE}`);
}
if (!hasBrevoDelivery && !smtpTransporter) {
  console.warn('[email] No Brevo or SMTP sender is configured; activity/admin mail is disabled');
}

function logEmailFailure(context: string, error: unknown) {
  if (error instanceof EmailDeliveryError) {
    const status = error.providerStatus ? ` status=${error.providerStatus}` : '';
    console.error(`[email] ${context} failed code=${error.code}${status}`);
    return;
  }
  console.error(`[email] ${context} failed code=unexpected`);
}

function respondToEmailFailure(res: Response, context: string, error: unknown) {
  logEmailFailure(context, error);
  return res.status(503).json({
    error: 'Email verification is temporarily unavailable. Please try again shortly.',
  });
}

async function isAdminUser(userId: unknown): Promise<boolean> {
  if (typeof userId !== 'string' || !userId.trim()) return false;
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId.trim()))
    .limit(1);
  return user?.role === 'admin';
}

async function sendImmediateSecurityEmail({
  recipient,
  subject,
  title,
  body,
  context,
}: {
  recipient: { email?: string | null };
  subject: string;
  title: string;
  body: string;
  context: string;
}) {
  const email = recipient.email?.trim();
  if (!email) return;
  try {
    await sendBrevoEmail({
      to: email,
      subject,
      html: notificationEmailHtml({
        title,
        body,
        ctaLabel: 'Open The Network',
        ctaUrl: notificationEmailUrl('login'),
      }),
    });
  } catch (error) {
    // The account action has already succeeded. Log a safe provider status
    // without turning a successful password change/signup into a 500.
    logEmailFailure(context, error);
  }
}

const SUSPENSION_NOTICE =
  'Your account is suspended because activity on it violated our community guidelines. You cannot use The Network while this suspension is active. If you think this is a mistake, please contact support.';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function notificationEmailUrl(view: string, params: Record<string, string | undefined> = {}) {
  const url = new URL(PUBLIC_APP_BASE_URL);
  url.searchParams.set('view', view);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function notificationEmailHtml({
  title,
  body,
  ctaLabel,
  ctaUrl,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px 24px;border-radius:16px 16px 0 0">
        <div style="font-size:18px;font-weight:800;letter-spacing:.04em;color:#fff">The Network</div>
        <div style="margin-top:4px;font-size:12px;color:rgba(255,255,255,.76)">One Network. Every Campus.</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px;padding:26px 24px">
        <h1 style="margin:0;color:#0f172a;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>
        <p style="margin:14px 0 0;color:#475569;font-size:14px;line-height:1.65;white-space:pre-line">${escapeHtml(body)}</p>
        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:22px;padding:11px 18px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:700">${escapeHtml(ctaLabel)}</a>
        <p style="margin:22px 0 0;color:#94a3b8;font-size:11px;line-height:1.5">You received this because of activity on your The Network account. You can open the app to see the full conversation or community post.</p>
      </div>
    </div>
  `;
}

async function sendActivityEmail({
  recipient,
  subject,
  title,
  body,
  view,
  params,
  context,
}: {
  recipient: { email?: string | null };
  subject: string;
  title: string;
  body: string;
  view: string;
  params?: Record<string, string | undefined>;
  context: string;
}) {
  const email = recipient.email?.trim();
  if (!email) return;
  const html = notificationEmailHtml({
    title,
    body,
    ctaLabel: view === 'messages' ? 'Open messages' : 'Open The Network',
    ctaUrl: notificationEmailUrl(view, params),
  });
  try {
    if (hasBrevoDelivery) {
      await sendBrevoEmail({ to: email, subject, html });
      console.log(`[email] ${context} delivered provider=brevo`);
    } else {
      await sendSmtpEmail({ to: email, subject, html });
      console.log(`[email] ${context} delivered provider=smtp`);
    }
  } catch (error) {
    // Delivery failure must not prevent the in-app notification or saved message.
    logEmailFailure(`${context} ${hasBrevoDelivery ? 'brevo' : 'smtp'}`, error);
  }
}

async function sendSuspensionEmail(recipient: { fullName?: string | null; email?: string | null }): Promise<boolean> {
  const email = recipient.email?.trim();
  if (!email) return false;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fafc">
      <div style="padding:20px 22px;border-radius:14px 14px 0 0;background:linear-gradient(135deg,#4f46e5,#9333ea);color:#fff">
        <h1 style="margin:0;font-size:20px">The Network</h1>
        <p style="margin:5px 0 0;font-size:12px;opacity:.85">Account notice</p>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;background:#fff;color:#334155;font-size:14px;line-height:1.65">
        <h2 style="margin:0 0 14px;color:#0f172a;font-size:18px">Your account has been suspended</h2>
        <p>Hello ${escapeHtml(recipient.fullName?.trim() || 'there')},</p>
        <p>${escapeHtml(SUSPENSION_NOTICE)}</p>
        <p>You can reply to this email if you need help reviewing this decision.</p>
        <a href="${escapeHtml(notificationEmailUrl('login'))}" style="display:inline-block;margin-top:10px;padding:11px 18px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700">Open sign in</a>
      </div>
    </div>`;

  try {
    await sendSmtpEmail({
      to: email,
      subject: 'The Network account suspension notice',
      html,
    });
    return true;
  } catch (error) {
    logEmailFailure('account suspension notice smtp', error);
    return false;
  }
}

async function sendImmediateActivityEmail({
  recipient,
  subject,
  title,
  body,
  view,
  params,
}: {
  recipient: { email?: string | null };
  subject: string;
  title: string;
  body: string;
  view: string;
  params?: Record<string, string | undefined>;
}) {
  await sendActivityEmail({ recipient, subject, title, body, view, params, context: 'activity email' });
}

async function sendDirectMessageEmail({
  recipient,
  subject,
  title,
  body,
  params,
}: {
  recipient: { email?: string | null };
  subject: string;
  title: string;
  body: string;
  params?: Record<string, string | undefined>;
}) {
  if (!recipient.email?.trim()) {
    console.warn('[email] direct message skipped code=recipient_missing_email');
    return;
  }
  await sendActivityEmail({
    recipient,
    subject,
    title,
    body,
    view: 'messages',
    params,
    context: 'direct message email',
  });
}

async function sendCommunityPostActivityEmail({
  recipientEmails,
  subject,
  title,
  body,
  view,
  params,
  ctaLabel = 'Open community post',
  context,
}: {
  recipientEmails: string[];
  subject: string;
  title: string;
  body: string;
  view: string;
  params?: Record<string, string | undefined>;
  ctaLabel?: string;
  context: string;
}) {
  const uniqueEmails = [...new Set(
    recipientEmails
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
      .filter((email) => email !== EMAIL_FROM_ADDRESS.toLowerCase()),
  )];
  if (!uniqueEmails.length) return;

  // Keep batches below common SMTP recipient limits while using BCC so
  // community members never see one another's email addresses.
  const batchSize = 25;
  const html = notificationEmailHtml({
    title,
    body,
    ctaLabel,
    ctaUrl: notificationEmailUrl(view, params),
  });
  const totalBatches = Math.ceil(uniqueEmails.length / batchSize);
  console.log(`[email] ${context} queued recipients=${uniqueEmails.length} batches=${totalBatches}`);
  const batches = Array.from(
    { length: totalBatches },
    (_, index) => uniqueEmails.slice(index * batchSize, (index + 1) * batchSize),
  );
  const sendBatch = async (bcc: string[], batchNumber: number) => {
    const batchLabel = `${context} batch ${batchNumber}`;
    try {
      if (hasBrevoDelivery) {
        await sendBrevoBulkEmail({
          to: EMAIL_FROM_ADDRESS,
          bcc,
          subject,
          html,
        });
        console.log(`[email] ${batchLabel} delivered provider=brevo count=${bcc.length}`);
      } else {
        await sendSmtpBulkEmail({
          to: EMAIL_FROM_ADDRESS,
          bcc,
          subject,
          html,
        });
        console.log(`[email] ${batchLabel} delivered provider=smtp count=${bcc.length}`);
      }
    } catch (error) {
      const provider = hasBrevoDelivery ? 'brevo' : 'smtp';
      logEmailFailure(`${batchLabel} ${provider}`, error);
      console.error(`[email] ${batchLabel} ${provider} delivery incomplete failed=${bcc.length}`);
    }
  };

  if (IS_VERCEL_RUNTIME) {
    // Keep serverless runtime bounded for large communities without sending a
    // burst large enough to trip provider rate limits.
    const concurrency = 10;
    for (let offset = 0; offset < batches.length; offset += concurrency) {
      await Promise.all(
        batches.slice(offset, offset + concurrency)
          .map((bcc, index) => sendBatch(bcc, offset + index + 1)),
      );
    }
  } else {
    for (let index = 0; index < batches.length; index += 1) {
      await sendBatch(batches[index], index + 1);
    }
  }
}

// ── VAPID setup ───────────────────────────────────────────────────────────────
const VAPID_PRIVATE = normalizeVapidKey(process.env.VAPID_PRIVATE_KEY || '');
const configuredVapidPublic = normalizeVapidKey(process.env.VAPID_PUBLIC_KEY || '');
let VAPID_PUBLIC = configuredVapidPublic;
const VAPID_EMAIL   = process.env.VAPID_EMAIL       || 'mailto:admin@thenetwork.app';
let vapidEnabled = false;
if (VAPID_PRIVATE && !VAPID_PUBLIC) {
  try {
    VAPID_PUBLIC = deriveVapidPublicKey(VAPID_PRIVATE);
  } catch (error: any) {
    console.warn(`[push] VAPID configuration disabled: ${error?.message || 'invalid private key'}`);
  }
}
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    if (configuredVapidPublic && !vapidKeysMatch(configuredVapidPublic, VAPID_PRIVATE)) {
      throw new Error('configured public/private keys do not match');
    }
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidEnabled = true;
  } catch (error: any) {
    console.warn(`[push] VAPID configuration disabled: ${error?.message || 'invalid keys'}`);
  }
}

// ── Firebase Admin SDK (for FCM) ─────────────────────────────────────────────
let fcmApp: admin.app.App | null = null;
try {
  const rawCreds = (
    process.env.FCM_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_CREDENTIALS_JSON ||
    ''
  ).trim();
  if (!rawCreds) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON is not configured');
  }
  // Secret may be stored without opening brace
  const credStr = rawCreds.startsWith('{') ? rawCreds : '{' + rawCreds;
  const serviceAccount = JSON.parse(credStr) as admin.ServiceAccount;
  const projectId = (serviceAccount as admin.ServiceAccount & { project_id?: string }).project_id
    || serviceAccount.projectId;
  const expectedProjectId = 'the-netwowrk';
  if (projectId !== expectedProjectId) {
    throw new Error('Firebase service account belongs to a different project');
  }
  fcmApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('[FCM] Firebase Admin initialized ✓');
} catch (err: any) {
  console.warn('[FCM] Firebase Admin init failed:', err.message);
}

// Send via Firebase Cloud Messaging — works even when phone screen is off
async function sendFCMMessage(fcmToken: string, payload: Record<string, any>): Promise<void> {
  if (!fcmApp) throw new Error('FCM is not configured for this Firebase project');
  try {
    // FCM data payload values must all be strings
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v === null || v === undefined || k === 'senderAvatar') continue;
      // FCM data values must be strings, and notification targets are often
      // supplied inside the app-level data object. Flatten them so the
      // Firebase service worker can route taps to the right chat.
      if (k === 'data' && v && typeof v === 'object') {
        for (const [nestedKey, nestedValue] of Object.entries(v as Record<string, unknown>)) {
          if (nestedValue !== null && nestedValue !== undefined) {
            data[nestedKey] = typeof nestedValue === 'object'
              ? JSON.stringify(nestedValue)
              : String(nestedValue);
          }
        }
      } else {
        data[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }
    const view = String(payload.view || 'notifications');
    // FCM web clicks must return to the Firebase-hosted client, not the API
    // origin. Include the destination identifiers so a tap opens the exact
    // direct chat, group, or community that produced the notification.
    const linkParams = new URLSearchParams({ view });
    const nestedData = payload.data && typeof payload.data === 'object'
      ? payload.data as Record<string, unknown>
      : {};
    const routingData = { ...payload, ...nestedData };
    for (const key of ['userId', 'groupId', 'communityId', 'projectId', 'postId', 'anonymousPostId', 'connectionId']) {
      const value = routingData[key];
      if (value !== null && value !== undefined && String(value)) {
        linkParams.set(key, String(value));
      }
    }
    const appUrl = new URL(PUBLIC_APP_BASE_URL);
    appUrl.search = linkParams.toString();

    // Use the sender avatar only when it is an absolute URL. User avatars are
    // often stored as relative `/api/...` paths or data URLs; passing either
    // form to FCM as imageUrl can make Firebase reject the entire notification
    // instead of delivering the message with the app icon.
    const avatarImg = typeof payload.senderAvatar === 'string' &&
      /^https?:\/\//i.test(payload.senderAvatar) &&
      payload.senderAvatar.length < 500
        ? payload.senderAvatar : undefined;

    // Send a data-only web message. Firebase automatically displays messages
    // containing a notification payload, while firebase-messaging-sw.js also
    // displays its onBackgroundMessage payload. Using both creates duplicates.
    await fcmApp.messaging().send({
      token: fcmToken,
      data,
      android: {
        priority: 'high',
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default', badge: 1 } },
      },
      webpush: {
        // High urgency improves delivery while the app is backgrounded.
        // Deliberately omit Topic/collapse settings: every message is
        // independent and must remain visible as its own notification.
        headers: { Urgency: 'high', TTL: '86400' },
        fcmOptions: { link: appUrl.toString() },
      },
    });
    console.log('[FCM] sent to', fcmToken.slice(0, 20) + '…');
  } catch (err: any) {
    console.error('[FCM] send failed:', err.code, err.message);
    // Clean up invalid/expired tokens
    if (['messaging/registration-token-not-registered',
         'messaging/invalid-registration-token',
         'messaging/invalid-argument'].includes(err.code)) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, fcmToken)).catch(() => {});
    }
    throw err;
  }
}

// Validate that a base64url-encoded p256dh key decodes to exactly 65 bytes
// 'fcm' is a special marker used for FCM token subscriptions (no p256dh needed)
function isValidP256dh(p256dh: string): boolean {
  if (p256dh === 'fcm') return true;
  try {
    const padding = '='.repeat((4 - (p256dh.length % 4)) % 4);
    const b64 = (p256dh + padding).replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(b64, 'base64').length === 65;
  } catch { return false; }
}

async function sendPushToUser(userId: string, payload: object) {
  try {
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    if (!subs.length) {
      console.warn(`[push] no registered device for user=${userId}`);
      return;
    }

    const safe: Record<string, any> = { ...(payload as any) };
    if (safe.senderAvatar && (safe.senderAvatar.startsWith('data:') || safe.senderAvatar.length > 300)) {
      delete safe.senderAvatar;
    }
    if (typeof safe.body === 'string' && safe.body.length > 200) {
      safe.body = safe.body.substring(0, 197) + '…';
    }

    const results = await Promise.allSettled(
      subs.map(async s => {
        // ── FCM token (p256dh marker = 'fcm') ─────────────────────────────
        if (s.p256dh === 'fcm') {
          return withTimeout(sendFCMMessage(s.endpoint, safe), 4000);
        }

        // ── VAPID Web Push ─────────────────────────────────────────────────
        if (!isValidP256dh(s.p256dh)) {
          console.warn('[push] deleting corrupted subscription for user', userId);
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
          return;
        }
        const msg = JSON.stringify(safe);
        const finalMsg = Buffer.byteLength(msg, 'utf8') > 3800
          ? JSON.stringify({ title: safe.title, body: safe.body, icon: safe.icon, badge: safe.badge, tag: safe.tag, view: safe.view, type: safe.type })
          : msg;
        return withTimeout(webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          finalMsg
        ), 4000).catch(async (err: any) => {
          const errMsg = (err.body || err.message || '').toString();
          if ([400, 401, 403, 404, 410].includes(err.statusCode) ||
              errMsg.includes('p256dh') || errMsg.includes('auth') || errMsg.includes('subscription')) {
            console.warn('[push] deleting invalid VAPID sub for user', userId, '—', errMsg);
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
          } else {
            console.error('[push] VAPID delivery failed for user', userId, '— status:', err.statusCode, errMsg);
          }
        });
      })
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[push] device delivery rejected:', result.reason?.message || result.reason);
      }
    }
  } catch (err: any) {
    console.error('[push] sendPushToUser error:', err.message);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`push provider timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function dispatchPush(userId: string, payload: object) {
  try {
    await sendPushToUser(userId, payload);
  } catch (error: any) {
    console.error('[push] background delivery failed:', error?.message || error);
  }
}

// Purpose emoji map (matches FindPeopleSection purposes)
const FIND_PEOPLE_EMOJI: Record<string, string> = {
  'Coffee Chat':         '☕',
  'Study Partner':       '📚',
  'Hackathon Teammates': '🚀',
  'Project Collab':      '💡',
  'Mentor/Mentee':       '🎓',
  'Placement Prep':      '📝',
  'Research Partner':    '🔬',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = new Set([
      'https://the-network.web.app',
      'https://the-netwowrk.web.app',
      'https://the-network-72bba.web.app',
      'https://the-network-72bba.firebaseapp.com',
      'https://the-network-d1d4c.web.app',
      'https://the-network-d1d4c.firebaseapp.com',
      'https://the-network-44912.web.app',
      'https://the-network-44912.firebaseapp.com',
      'https://the-network.co.in',
      'https://www.the-network.co.in',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://the-network-1vw.pages.dev',
      'https://www.the-network-1vw.pages.dev',
    ]);
    let allowedDevelopmentOrigin = false;
    if (origin) {
      try {
        const hostname = new URL(origin).hostname;
        allowedDevelopmentOrigin = hostname === 'localhost'
          || hostname === '127.0.0.1'
          || hostname.endsWith('.replit.dev')
          || hostname.endsWith('.replit.app')
          || hostname.endsWith('.the-network-1vw.pages.dev');
      } catch {
        allowedDevelopmentOrigin = false;
      }
    }
    callback(null, !origin || allowedOrigins.has(origin) || allowedDevelopmentOrigin);
  },
  credentials: false,
}));
// Never compress SSE responses. Compression buffers small chunks, which makes
// a healthy chat stream look disconnected until enough data accumulates.
app.use(compression({
  filter: (req, res) => {
    if (req.path.endsWith('/stream') || res.getHeader('Content-Type') === 'text/event-stream') {
      return false;
    }
    return compression.filter(req, res);
  },
}));
// Allow the encoded payload for an 8 MB image while keeping uploads bounded.
app.use(express.json({ limit: '90mb' }));
// Vercel and other edge proxies must never serve a stale notification or
// message response. SSE is only a fast path; the database-backed GET routes
// below are the reliable recovery path across serverless instances.
app.use('/api', (_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  next();
});
const publicApiRoutes = new Set([
  'GET /api/healthz',
  'GET /api/public/stats',
  'GET /api/seo/colleges',
  'GET /api/seo/communities',
  'GET /api/seo/events',
  'GET /api/seo/students',
  'POST /api/auth/login',
  'POST /api/auth/register',
  'POST /api/auth/send-otp',
  'POST /api/auth/verify-otp',
  'POST /api/auth/reset-password',
]);
const safeApiResponse = (value: any, userId: string | null, isAdmin: boolean, exposeOwnEmail: boolean): any => {
  if (value instanceof Date || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => safeApiResponse(item, userId, isAdmin, exposeOwnEmail));
  const recordId = typeof value.id === 'string' ? value.id : null;
  const safe: Record<string, any> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === 'passwordhash' ||
      normalizedKey === 'password_hash' ||
      normalizedKey === 'tokenhash' ||
      normalizedKey === 'token_hash' ||
      normalizedKey === 'otphash' ||
      normalizedKey === 'otp_hash'
    ) continue;
    if (
      normalizedKey === 'email' &&
      !isAdmin &&
      !exposeOwnEmail &&
      (!userId || recordId !== userId)
    ) continue;
    safe[key] = safeApiResponse(item, userId, isAdmin, exposeOwnEmail);
  }
  return safe;
};
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();

  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  });

  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    if (res.statusCode >= 500) {
      return originalJson({ error: 'Internal server error' });
    }

    const auth = (req as any).authUser as { id: string; role: string } | undefined;
    const isAdmin = auth?.role === 'admin';
    const exposeOwnEmail = [
      '/api/auth/login',
      '/api/auth/verify-otp',
      '/api/auth/me',
    ].includes(req.path);
    return originalJson(safeApiResponse(body, auth?.id ?? null, isAdmin, exposeOwnEmail));
  };

  const path = req.path;
  const isPublic = publicApiRoutes.has(`${req.method} ${path}`) ||
    (req.method === 'GET' && /^\/api\/seo\/(?:college|community)\/[^/]+$/.test(path)) ||
    (req.method === 'GET' && /^\/api\/users\/[^/]+\/avatar$/.test(path));
  if (isPublic) return next();

  const authorization = req.get('authorization') || '';
  const bearerMatch = authorization.match(/^Bearer ([A-Za-z0-9_-]{32,})$/);
  if (!bearerMatch) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }

  const tokenHash = crypto.createHash('sha256').update(bearerMatch[1]).digest('hex');
  pool.query<{
    user_id: string;
    role: string;
    is_suspended: boolean;
    revoked_at: Date | null;
  }>(
    `SELECT s.user_id, s.revoked_at, u.role, u.is_suspended
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  ).then(({ rows }) => {
    const session = rows[0];
    if (!session) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    if (session.is_suspended) {
      return res.status(403).json({ error: SUSPENSION_NOTICE, code: 'ACCOUNT_SUSPENDED' });
    }
    if (session.revoked_at) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const isAdmin = session.role === 'admin';
    (req as any).authUser = { id: session.user_id, role: session.role };
    (req as any).authSessionTokenHash = tokenHash;

    if ((path === '/api/admin' || path.startsWith('/api/admin/')) && !isAdmin) {
      return res.status(403).json({ error: 'Administrator access is required.' });
    }
    if (
      req.method !== 'GET' &&
      /^\/api\/users\/[^/]+\/(reset-password|suspend)$/.test(path) &&
      !isAdmin
    ) {
      return res.status(403).json({ error: 'Administrator access is required.' });
    }
    if (
      !isAdmin &&
      req.method !== 'GET' &&
      /^\/api\/users\/[^/]+$/.test(path) &&
      path.split('/')[3] !== session.user_id
    ) {
      return res.status(403).json({ error: 'You can only update your own profile.' });
    }
    if (!isAdmin) {
      const notificationTarget = path.match(/^\/api\/notifications\/([^/]+)(?:\/stream)?$/);
      const markAllTarget = path.match(/^\/api\/notifications\/user\/([^/]+)\/read-all$/);
      if (
        (notificationTarget && notificationTarget[1] !== session.user_id) ||
        (markAllTarget && markAllTarget[1] !== session.user_id)
      ) {
        return res.status(403).json({ error: 'You can only access your own notifications.' });
      }
      if (req.method === 'PUT' && /^\/api\/reports\/[^/]+$/.test(path)) {
        return res.status(403).json({ error: 'Administrator access is required.' });
      }
    }

    if (!isAdmin) {
      const actorFields = ['userId', 'viewerId', 'senderId', 'authorId', 'actorId', 'ownerId', 'hostId', 'creatorId', 'organizerId', 'reporterId'];
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      for (const field of actorFields) {
        if (typeof body[field] === 'string' && body[field] !== session.user_id) {
          return res.status(403).json({ error: 'The requested account does not match your signed-in account.' });
        }
        const queryValue = req.query[field.toLowerCase()] ?? req.query[field];
        if (typeof queryValue === 'string' && queryValue !== session.user_id) {
          return res.status(403).json({ error: 'The requested account does not match your signed-in account.' });
        }
      }
    }

    return next();
  }).catch(() => {
    return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
  });
});
app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── In-memory cache (short TTL so data stays fresh) ─────────────────────────
interface CacheEntry { data: any; expires: number; }
const _cache = new Map<string, CacheEntry>();
function getCache(key: string): any | null {
  const e = _cache.get(key);
  if (!e || Date.now() > e.expires) { _cache.delete(key); return null; }
  return e.data;
}
function setCache(key: string, data: any, ttlMs: number) {
  _cache.set(key, { data, expires: Date.now() + ttlMs });
}
function bust(...keys: string[]) {
  keys.forEach(key => {
    _cache.delete(key);
    if (key === 'bootstrap') {
      for (const cachedKey of _cache.keys()) {
        if (cachedKey.startsWith('bootstrap:')) _cache.delete(cachedKey);
      }
    }
  });
}

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().split('-')[0]}`;
}

function communityAdminIds(community: any): string[] {
  return [...new Set([
    community?.creatorId,
    ...(Array.isArray(community?.adminIds) ? community.adminIds : []),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

function communityBlockedIds(community: any): string[] {
  return Array.isArray(community?.blockedMemberIds)
    ? community.blockedMemberIds.filter((id: unknown): id is string => typeof id === 'string')
    : [];
}

function isCommunityAdmin(community: any, userId: unknown): boolean {
  return typeof userId === 'string' && communityAdminIds(community).includes(userId);
}

async function isPlatformAdmin(userId: unknown): Promise<boolean> {
  if (typeof userId !== 'string' || !userId) return false;
  const actor = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return actor[0]?.role === 'admin';
}

type CommunityMergeDbClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
};

function mergeJsonRecords(destination: unknown, source: unknown): any[] {
  const destinationRecords = Array.isArray(destination) ? destination : [];
  const sourceRecords = Array.isArray(source) ? source : [];
  const seen = new Set<string>();
  return [...destinationRecords, ...sourceRecords].filter((record: any) => {
    const key = typeof record?.id === 'string' ? record.id : JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getCommunityMergeCounts(client: CommunityMergeDbClient, communityId: string) {
  const result = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM posts WHERE community_id = $1) AS "posts",
      (SELECT COUNT(*)::int
         FROM comments c
         INNER JOIN posts p ON p.id = c.post_id
        WHERE p.community_id = $1) AS "comments",
      (SELECT COUNT(*)::int FROM group_messages WHERE group_id = 'community:' || $1) AS "chatMessages",
      (SELECT COUNT(*)::int FROM saved_items WHERE item_type = 'community' AND item_id = $1) AS "savedCommunityLinks",
      (SELECT COUNT(*)::int FROM notifications WHERE body LIKE '%' || $2 || '%') AS "routingNotifications"
  `, [communityId, `[[community:${communityId}]]`]);
  return result.rows[0] || {
    posts: 0,
    comments: 0,
    chatMessages: 0,
    savedCommunityLinks: 0,
    routingNotifications: 0,
  };
}

function communityMergeOwner(row: any) {
  return row?.creator_id
    ? { id: row.creator_id, name: row.creator_name || 'Unknown owner' }
    : null;
}

function communityHeadId(community: any): string | null {
  const creatorId = typeof community?.creatorId === 'string' ? community.creatorId : '';
  if (creatorId && creatorId !== 'system') return creatorId;
  const memberIds = Array.isArray(community?.memberIds) ? community.memberIds : [];
  return memberIds.find((id: unknown): id is string => typeof id === 'string' && id.length > 0) || null;
}

async function ensureCommunityHeadAdmin(community: any): Promise<any> {
  const headId = communityHeadId(community);
  if (!headId) return community;

  const currentAdminIds = Array.isArray(community?.adminIds) ? community.adminIds : [];
  const adminIds = [...new Set([
    headId,
    ...currentAdminIds.filter((id: unknown): id is string => typeof id === 'string' && id !== 'system'),
  ])];
  const unchanged = community.creatorId === headId
    && Array.isArray(community.adminIds)
    && community.adminIds.length === adminIds.length
    && community.adminIds.every((id: string, index: number) => id === adminIds[index]);
  if (unchanged) return community;

  const updated = await db.update(communities)
    .set({ creatorId: headId, adminIds })
    .where(eq(communities.id, community.id))
    .returning();
  return updated[0] || { ...community, creatorId: headId, adminIds };
}

type EntityChatMessage = {
  id: string;
  groupId?: string;
  senderId: string;
  content: string;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachmentMimeType?: string | null;
  replyToId?: string | null;
  reactions?: unknown;
  sharedPost?: EntitySharedPostPreview | null;
  seenBy?: Array<{ id: string; name: string }>;
  createdAt: string;
};

type EntitySharedPostPreview = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatar: string | null;
  communitySlug: string | null;
  communityName: string | null;
  imageUrl: string | null;
};

function toSharedPostCommunitySlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function extractSharedPostId(content: string): string | null {
  return content.match(/\[\[shared-post:([^\]]{1,160})\]\]/)?.[1] || null;
}

async function loadSharedPostPreviews(postIds: string[]): Promise<Map<string, EntitySharedPostPreview>> {
  const uniqueIds = [...new Set(postIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const result = await pool.query<{
    id: string;
    isAnonymous: boolean;
    content: string;
    projectTitle: string | null;
    academicTag: string | null;
    authorName: string | null;
    authorAvatar: string | null;
    communityName: string | null;
    hasImage: boolean;
  }>(
    `SELECT
       p.id,
       p.is_anonymous AS "isAnonymous",
       p.content,
       p.project_title AS "projectTitle",
       p.academic_tag AS "academicTag",
       u.full_name AS "authorName",
       u.avatar AS "authorAvatar",
       c.name AS "communityName",
       (p.post_image IS NOT NULL AND p.post_image <> '') AS "hasImage"
     FROM posts p
     LEFT JOIN users u ON u.id = p.author_id
     LEFT JOIN communities c ON c.id = p.community_id
     WHERE p.id = ANY($1::text[])`,
    [uniqueIds],
  );

  const entries = result.rows.map((row): [string, EntitySharedPostPreview] => {
    const post: EntitySharedPostPreview = {
      id: row.id,
      title: row.projectTitle?.trim() || row.academicTag?.trim() || 'Discussion',
      content: String(row.content || '').slice(0, 800),
      authorName: row.isAnonymous ? 'Anonymous member' : row.authorName || 'Community member',
      authorAvatar: row.isAnonymous || !row.authorAvatar || row.authorAvatar.length > 2048
        ? null
        : row.authorAvatar,
      communitySlug: row.communityName ? toSharedPostCommunitySlug(row.communityName) : null,
      communityName: row.communityName || null,
      imageUrl: row.hasImage ? `/api/posts/${encodeURIComponent(row.id)}/image?index=0` : null,
    };
    return [row.id, post];
  });
  return new Map(entries);
}

async function hydrateEntityChatMessages(
  messages: Array<Record<string, any>>,
): Promise<EntityChatMessage[]> {
  const sharedPostIds = messages
    .map((message) => extractSharedPostId(String(message.content || '')))
    .filter((id): id is string => Boolean(id));
  const sharedPosts = await loadSharedPostPreviews(sharedPostIds);

  return messages.map((message): EntityChatMessage => {
    const sharedPostId = extractSharedPostId(String(message.content || ''));
    const contentWithoutMarker = String(message.content || '')
      .replace(/\s*\[\[shared-post:[^\]]{1,160}\]\]\s*/g, '\n')
      .trim();
    const sharedPost = sharedPostId
      ? sharedPosts.get(sharedPostId) || {
          id: sharedPostId,
          title: 'This post is no longer available',
          content: 'The original post may have been removed.',
          authorName: 'The Network',
          authorAvatar: null,
          communitySlug: null,
          communityName: null,
          imageUrl: null,
        }
      : null;

    return {
      ...message,
      id: String(message.id),
      groupId: message.groupId,
      senderId: String(message.senderId),
      content: contentWithoutMarker || (sharedPost ? 'Shared a post' : ''),
      attachmentName: message.attachmentName ?? null,
      attachmentData: message.attachmentData ?? null,
      attachmentMimeType: message.attachmentMimeType ?? null,
      replyToId: message.replyToId ?? null,
      reactions: message.reactions,
      sharedPost,
      createdAt: message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : String(message.createdAt || ''),
    };
  });
}

type LiveChatMessage = EntityChatMessage & {
  groupId?: string;
  receiverId?: string;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachmentMimeType?: string | null;
  pollOptions?: unknown;
  pollVotes?: unknown;
};

type DirectChatStreamEvent = LiveChatMessage | {
  type: 'read_receipt';
  readerId: string;
  messageIds: string[];
};

function isChatReaction(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emoji = value.trim();
  // Reactions are stored as JSON keys. Allow emoji sequences (skin tones,
  // flags, ZWJ families, etc.) instead of rejecting everything outside a
  // six-item hard-coded list, while keeping the value bounded and text-safe.
  return emoji.length > 0 && emoji.length <= 32 && !/[\u0000-\u001f<>]/.test(emoji);
}

// Entity chats use SSE so every open community tab receives a persisted
// message immediately. The database remains the source of truth, while this
// in-process registry provides low-latency fan-out for the active server.
const entityChatStreams = new Map<string, Set<Response>>();
const directMessageStreams = new Map<string, Set<Response>>();
const groupMessageStreams = new Map<string, Set<Response>>();
const notificationStreams = new Map<string, Set<Response>>();

function broadcastEntityMessage(
  groupId: string,
  message: EntityChatMessage,
  memberIds?: string[],
  isNewMessage = false,
) {
  emitEntityMessage(groupId, message, memberIds, isNewMessage);
  const streams = entityChatStreams.get(groupId);
  if (!streams?.size) return;
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  for (const stream of streams) {
    try {
      stream.write(payload);
      (stream as Response & { flush?: () => void }).flush?.();
    } catch {
      streams.delete(stream);
    }
  }
  if (!streams.size) entityChatStreams.delete(groupId);
}

function broadcastToStreams(registry: Map<string, Set<Response>>, keys: string[], message: DirectChatStreamEvent) {
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  for (const key of [...new Set(keys)]) {
    const streams = registry.get(key);
    if (!streams?.size) continue;
    for (const stream of streams) {
      try {
        stream.write(payload);
        (stream as Response & { flush?: () => void }).flush?.();
      } catch {
        streams.delete(stream);
      }
    }
    if (!streams.size) registry.delete(key);
  }
}

function broadcastDirectMessage(message: LiveChatMessage) {
  emitDirectMessage(message);
  broadcastToStreams(directMessageStreams, [message.senderId, message.receiverId || ''], message);
}

function broadcastDirectEvent(userId: string, event: DirectChatStreamEvent) {
  emitDirectEvent(userId, event);
  broadcastToStreams(directMessageStreams, [userId], event);
}

function broadcastGroupMessage(
  groupId: string,
  message: LiveChatMessage,
  memberIds?: string[],
  isNewMessage = false,
) {
  emitGroupMessage(groupId, message, memberIds, isNewMessage);
  broadcastToStreams(groupMessageStreams, [groupId], message);
}

function broadcastNotification(userId: string, notification: any) {
  const streams = notificationStreams.get(userId);
  if (!streams?.size) return;
  const payload = JSON.stringify({
    ...notification,
    createdAt: notification.createdAt instanceof Date
      ? notification.createdAt.toISOString()
      : notification.createdAt,
  });
  for (const stream of streams) {
    try {
      stream.write(`data: ${payload}\n\n`);
    } catch {
      streams.delete(stream);
    }
  }
  if (!streams.size) notificationStreams.delete(userId);
}

function anonymousAlias(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  const code = (hash % 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `Anonymous student #${code}`;
}

function scryptKey(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, length, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scryptKey(password, salt, 64);
  return `scrypt-v1$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (storedHash.startsWith('scrypt-v1$')) {
    const [, encodedSalt, encodedKey] = storedHash.split('$');
    if (!encodedSalt || !encodedKey) return { valid: false, needsUpgrade: false };
    try {
      const salt = Buffer.from(encodedSalt, 'base64url');
      const expected = Buffer.from(encodedKey, 'base64url');
      if (salt.length !== 16 || expected.length !== 64) return { valid: false, needsUpgrade: false };
      const actual = await scryptKey(password, salt, expected.length);
      return { valid: crypto.timingSafeEqual(actual, expected), needsUpgrade: false };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  // Gradually upgrade existing SHA-256 accounts only after a successful login.
  const legacy = crypto.createHash('sha256').update(password + 'network_salt_2026').digest();
  if (!/^[a-f0-9]{64}$/i.test(storedHash)) return { valid: false, needsUpgrade: false };
  const stored = Buffer.from(storedHash, 'hex');
  return {
    valid: stored.length === legacy.length && crypto.timingSafeEqual(stored, legacy),
    needsUpgrade: true,
  };
}

async function createAuthSession(userId: string): Promise<{ token: string; expiresAt: string }> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.query(
    `INSERT INTO auth_sessions (id, token_hash, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [crypto.randomUUID(), tokenHash, userId, expiresAt],
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

function userAvatarReference(userId: string, avatar: string | null | undefined) {
  if (!avatar) return avatar;
  // Large/data-url avatars are served on demand so user and analytics lists
  // never carry megabytes of image data in every response.
  if (
    avatar.startsWith('data:') ||
    (!/^https?:\/\//i.test(avatar) && avatar.length > 200_000)
  ) {
    return `/api/users/${encodeURIComponent(userId)}/avatar`;
  }
  return avatar;
}

const userProfileSelection = {
  id: users.id,
  fullName: users.fullName,
  college: users.college,
  schoolName: users.schoolName,
  coachingName: users.coachingName,
  location: users.location,
  branch: users.branch,
  degree: users.degree,
  academicStream: users.academicStream,
  programGroup: users.programGroup,
  fields: users.fields,
  year: users.year,
  email: users.email,
  avatar: sql<string>`CASE
    WHEN ${users.avatar} LIKE 'data:%'
      OR (${users.avatar} NOT LIKE 'http%' AND length(${users.avatar}) > 200000)
    THEN '/api/users/' || ${users.id} || '/avatar'
    ELSE ${users.avatar}
  END`,
  coverImage: users.coverImage,
  aboutMe: users.aboutMe,
  interests: users.interests,
  skills: users.skills,
  lookingFor: users.lookingFor,
  connectPreference: users.connectPreference,
  isVerified: users.isVerified,
  isSuspended: users.isSuspended,
  role: users.role,
  collegeAdminOf: users.collegeAdminOf,
  privacySettings: users.privacySettings,
  createdAt: users.createdAt,
};

function toUserProfile(u: any) {
  const { passwordHash: _, ...rest } = u;
  return {
    ...rest,
    avatar: userAvatarReference(rest.id, rest.avatar),
    collegeAdminOf: rest.collegeAdminOf ?? null,
    createdAt: rest.createdAt.toISOString(),
  };
}

async function applyActiveConnectPreferences<T extends { id: string }>(profiles: T[]): Promise<T[]> {
  if (!profiles.length) return profiles;
  const activeRequests = await db.select({
    hostId: findPeopleRequests.hostId,
    purpose: findPeopleRequests.purpose,
  })
    .from(findPeopleRequests)
    .where(eq(findPeopleRequests.status, 'active'))
    .orderBy(desc(findPeopleRequests.createdAt));
  const latestPurposeByHost = new Map<string, string>();
  for (const request of activeRequests) {
    if (!latestPurposeByHost.has(request.hostId)) {
      latestPurposeByHost.set(request.hostId, request.purpose);
    }
  }
  return profiles.map(profile => ({
    ...profile,
    connectPreference: latestPurposeByHost.has(profile.id)
      ? connectPreferenceForPurpose(latestPurposeByHost.get(profile.id)!)
      : null,
  }));
}

function storedPostImages(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((image): image is string => typeof image === 'string' && image.length > 0).slice(0, 10);
    }
  } catch {
    // Older posts store one data URL or external URL directly.
  }
  return [raw];
}

function toPost(p: typeof posts.$inferSelect, postComments: any[]) {
  const storedImages = storedPostImages(p.postImage);
  const imageCount = Number((p as any).imageCount) || storedImages.length;
  const imageUrls = storedImages.length === 1 && storedImages[0] === 'has_image'
    ? Array.from({ length: Math.max(1, imageCount) }, (_, index) => `/api/posts/${p.id}/image?index=${index}`)
    : storedImages.map((image, index) =>
        image.startsWith('/') ? image : `/api/posts/${p.id}/image?index=${index}`,
      );
  return {
    ...p,
    // Replace base64 blob with a URL so the posts list stays small
    postImage: imageUrls[0] || null,
    postImages: imageUrls,
    attachment: p.attachmentName
      ? {
          name: p.attachmentName,
          mimeType: p.attachmentMimeType ?? null,
          url: `/api/posts/${p.id}/attachment`,
        }
      : null,
    // Never expose the attachment blob in feed responses.
    attachmentData: undefined,
    createdAt: p.createdAt.toISOString(),
    comments: postComments.map(c => ({
      ...c,
      ...(c.isAnonymous ? { authorId: `anonymous:${c.id}` } : {}),
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

async function resolveOriginalPost(post: typeof posts.$inferSelect) {
  let current = post;
  const visited = new Set([post.id]);

  while (current.resharedFromId && visited.size < 32) {
    if (visited.has(current.resharedFromId)) break;
    visited.add(current.resharedFromId);
    const [parent] = await db.select().from(posts).where(eq(posts.id, current.resharedFromId));
    if (!parent) break;
    current = parent;
  }

  return current;
}

async function loadPostEngagement(postIds: string[]): Promise<Map<string, SharedPostEngagement>> {
  const roots = [...new Set(postIds.filter(Boolean))];
  if (!roots.length) return new Map<string, SharedPostEngagement>();

  const interactionRows = await pool.query<PostInteractionRow>(
    `WITH RECURSIVE post_group AS (
       SELECT
         p.id,
         p.reshared_from_id,
         p.likes,
         p.votes,
         p.poll_votes,
         p.created_at,
         p.id AS root_id,
         ARRAY[p.id]::text[] AS path
       FROM posts p
       WHERE p.id = ANY($1::text[])
       UNION ALL
       SELECT
         child.id,
         child.reshared_from_id,
         child.likes,
         child.votes,
         child.poll_votes,
         child.created_at,
         post_group.root_id,
         post_group.path || child.id
       FROM posts child
       JOIN post_group ON child.reshared_from_id = post_group.id
       WHERE NOT child.id = ANY(post_group.path)
         AND cardinality(post_group.path) < 32
     )
     SELECT
       id,
       reshared_from_id AS "resharedFromId",
       likes,
       votes,
       poll_votes AS "pollVotes",
       created_at AS "createdAt"
     FROM post_group`,
    [roots],
  );
  const relatedPostIds = [...new Set(interactionRows.rows.map((row) => row.id))];
  if (!relatedPostIds.length) return new Map<string, SharedPostEngagement>();

  const commentRows = await pool.query(
    `SELECT
       id,
       post_id AS "postId",
       author_id AS "authorId",
       is_anonymous AS "isAnonymous",
       reply_to_id AS "replyToId",
       content,
       created_at AS "createdAt"
     FROM comments
     WHERE post_id = ANY($1::text[])
     ORDER BY created_at ASC`,
    [relatedPostIds],
  );

  return buildPostEngagementById(interactionRows.rows, commentRows.rows);
}

function isUnsafePreviewHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function readMetaTag(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const keyMatch = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i);
    if (keyMatch?.[1].toLowerCase() !== key.toLowerCase()) continue;
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([\s\S]*?)["']/i);
    if (contentMatch?.[1]) return decodeHtml(contentMatch[1]);
  }
  return undefined;
}

// Fetch lightweight Open Graph metadata for links shared in posts. The
// browser cannot reliably read arbitrary sites because of cross-origin rules.
app.get('/api/link-preview', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    const target = new URL(rawUrl);
    if (!['http:', 'https:'].includes(target.protocol) || isUnsafePreviewHost(target.hostname)) {
      return res.status(400).json({ error: 'Only public http(s) links can be previewed' });
    }

    const response = await fetch(target, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'TheNetworkLinkPreview/1.0',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const finalUrl = new URL(response.url || target.toString());
    if (isUnsafePreviewHost(finalUrl.hostname)) {
      return res.status(400).json({ error: 'Link preview destination is not public' });
    }
    if (!response.ok) return res.status(502).json({ error: 'Website could not be fetched' });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return res.json({
        url: finalUrl.toString(),
        title: finalUrl.hostname.replace(/^www\./, ''),
        siteName: finalUrl.hostname.replace(/^www\./, ''),
      });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 1_500_000) return res.status(413).json({ error: 'Website metadata is too large' });
    const html = await response.text();
    const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const title = readMetaTag(html, 'og:title') || (titleMatch?.[1] ? decodeHtml(titleMatch[1]) : undefined);
    const description =
      readMetaTag(html, 'og:description') ||
      readMetaTag(html, 'description');
    const image = readMetaTag(html, 'og:image') || readMetaTag(html, 'twitter:image');
    const canonicalMatch = html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/i);
    const canonicalHref = canonicalMatch?.[0]?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    const absoluteImage = image ? new URL(image, finalUrl).toString() : undefined;

    return res.json({
      url: canonicalHref ? new URL(canonicalHref, finalUrl).toString() : finalUrl.toString(),
      title: title || finalUrl.hostname.replace(/^www\./, ''),
      description,
      image: absoluteImage,
      siteName: finalUrl.hostname.replace(/^www\./, ''),
    });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Invalid link' });
  }
});

// ─── NOTIFICATION HELPER ─────────────────────────────────────────────────────

async function createNotification(
  userId: string,
  actorId: string,
  type: string,
  title: string,
  body: string,
  allowSelf = false,
) {
  if (userId === actorId && !allowSelf) return null; // Don't notify yourself
  try {
    const created = await db.insert(notifications).values({
      id: generateId('notif'),
      userId, actorId, type, title, body,
      isRead: false,
    }).returning();
    if (created[0]) broadcastNotification(userId, created[0]);
    return created[0] || null;
  } catch (error: any) {
    console.error('[notification] persist failed:', error?.message || error);
    return null;
  }
}

async function sendPasswordSecurityNotice(user: { id: string; email?: string | null; fullName: string }) {
  const title = '🔐 Password updated';
  const body = 'Your The Network password was changed successfully. If you did not make this change, sign in and secure your account immediately.';
  const notification = await createNotification(user.id, user.id, 'security', title, body, true);
  await Promise.all([
    dispatchPush(user.id, {
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `security-password-${user.id}`,
      view: 'login',
      type: 'security',
      data: { security: 'password-changed' },
    }),
    sendImmediateSecurityEmail({
      recipient: user,
      subject: 'Your The Network password was changed',
      title: 'Password changed successfully',
      body,
      context: 'password change security email',
    }),
  ]);
  return notification;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

// GET /api/public/stats — safe aggregate data for the logged-out landing page
app.get('/api/public/stats', async (_req, res) => {
  try {
    const [studentsResult, collegesResult, collegeDirectoryResult, schoolDirectoryResult] = await Promise.all([
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM users
         WHERE is_suspended = false`
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT LOWER(TRIM(college)))::text AS count
         FROM users
         WHERE is_suspended = false
           AND NULLIF(TRIM(college), '') IS NOT NULL
           AND LENGTH(TRIM(college)) > 1
           AND TRIM(college) <> '.'`
      ),
      pool.query<{ name: string; students: string }>(
        `SELECT MIN(TRIM(college)) AS name, COUNT(*)::text AS students
         FROM users
         WHERE is_suspended = false
           AND NULLIF(TRIM(college), '') IS NOT NULL
           AND LENGTH(TRIM(college)) > 1
           AND TRIM(college) <> '.'
         GROUP BY LOWER(TRIM(college))
         ORDER BY COUNT(*) DESC, MIN(TRIM(college)) ASC
         LIMIT 24`
      ),
      pool.query<{ name: string; students: string }>(
        `SELECT MIN(TRIM(school_name)) AS name, COUNT(*)::text AS students
         FROM users
         WHERE is_suspended = false
           AND NULLIF(TRIM(school_name), '') IS NOT NULL
           AND LENGTH(TRIM(school_name)) > 1
           AND TRIM(school_name) <> '.'
         GROUP BY LOWER(TRIM(school_name))
         ORDER BY COUNT(*) DESC, MIN(TRIM(school_name)) ASC
         LIMIT 24`
      ),
    ]);

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({
      students: Number(studentsResult.rows[0]?.count ?? 0),
      colleges: Number(collegesResult.rows[0]?.count ?? 0),
      collegeDirectory: collegeDirectoryResult.rows.map((college) => ({
        name: college.name,
        students: Number(college.students),
      })),
      schoolDirectory: schoolDirectoryResult.rows.map((school) => ({
        name: school.name,
        students: Number(school.students),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  return res.status(410).json({ error: 'Please use the email verification flow to create an account.' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const found = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    if (found.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    const user = found[0];
    const passwordCheck = await verifyPassword(password, user.passwordHash);
    if (!passwordCheck.valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: SUSPENSION_NOTICE, code: 'ACCOUNT_SUSPENDED' });
    }
    let authenticatedUser = user;
    if (user.isVerified && user.email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL && user.role !== 'admin') {
      const [promotedUser] = await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, user.id))
        .returning();
      if (!promotedUser) throw new Error('Unable to grant the primary administrator role');
      authenticatedUser = promotedUser;
    }
    if (passwordCheck.needsUpgrade) {
      await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
    }
    const session = await createAuthSession(user.id);
    // A successful password login does not prove institutional identity.
    // Keep the stored verification state unchanged; it is set only by the
    // account verification flow or an explicit administrative action.
    return res.json({ ...session, user: toUserProfile(authenticatedUser) });
  } catch (err: any) {
    console.error('login error');
    return res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const userId = (req as any).authUser.id as string;
    const found = await db.select(userProfileSelection).from(users).where(eq(users.id, userId)).limit(1);
    if (!found.length) return res.status(401).json({ error: 'Your session is no longer valid.' });
    const [user] = await applyActiveConnectPreferences(found);
    return res.json({ user: toUserProfile(user) });
  } catch {
    return res.status(500).json({ error: 'Unable to restore your session right now.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const tokenHash = (req as any).authSessionTokenHash as string;
    await pool.query(
      `UPDATE auth_sessions SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Unable to end your session right now.' });
  }
});

// ─── USERS ───────────────────────────────────────────────────────────────────

// POST /api/users/:id/view — record a profile view, notify the owner
app.post('/api/users/:id/view', async (req, res) => {
  try {
    const profileId = req.params.id;
    const { viewerId } = req.body;
    if (!viewerId || viewerId === profileId) return res.json({ ok: true }); // don't notify self-views
    // Throttle: only notify once per viewer per hour (check last notification)
    const recent = await db.select().from(notifications)
      .where(eq(notifications.userId, profileId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const alreadyNotified = recent.some(n =>
      n.actorId === viewerId && n.type === 'profile_view' &&
      new Date(n.createdAt).getTime() > oneHourAgo
    );
    if (!alreadyNotified) {
      const viewer = await db.select().from(users).where(eq(users.id, viewerId));
      if (viewer.length) {
        await createNotification(
          profileId, viewerId, 'profile_view',
          '👀 Profile View',
          `${viewer[0].fullName} viewed your profile`
        );
         await dispatchPush(profileId, {
          title: '👀 Profile View',
          body: `${viewer[0].fullName} viewed your profile`,
          icon: '/icons/icon-192x192.png',
          tag: `profile-view-${viewerId}`,
          view: 'notifications',
        });
      }
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── BOOTSTRAP — single endpoint, all data in parallel ───────────────────────
app.get('/api/bootstrap', async (req, res) => {
  const viewerId = (req as any).authUser.id as string;
  const cacheKey = `bootstrap:${viewerId}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);
  try {
    const [
      usersData,
      postsResult,
      allComments,
      connectionsData,
      storiesResult,
       communitiesData,
    ] = await Promise.all([
      db.select(userProfileSelection).from(users),
      pool.query<{
        id: string; author_id: string; is_anonymous: boolean; content: string; likes: unknown; votes: unknown;
        community_id: string | null; academic_tag: string | null;
        project_title: string | null; feeling: string | null;
        website_url: string | null; tags: unknown;
        attachment_name: string | null; attachment_mime_type: string | null;
        poll_options: unknown; poll_votes: unknown; created_at: Date;
        reshared_from_id: string | null;
        has_image: boolean; has_attachment: boolean;
      }>(
        `SELECT id, author_id, is_anonymous, content, likes, votes, community_id, academic_tag,
                project_title, feeling, website_url, tags,
                attachment_name, attachment_mime_type,
                poll_options, poll_votes, reshared_from_id, created_at,
                (post_image IS NOT NULL AND post_image <> '') AS has_image,
                (attachment_data IS NOT NULL AND attachment_data <> '') AS has_attachment
         FROM posts ORDER BY created_at DESC`
      ),
      db.select().from(comments).orderBy(comments.createdAt),
      db.select().from(connections)
        .where(or(eq(connections.senderId, viewerId), eq(connections.receiverId, viewerId)))
        .orderBy(desc(connections.createdAt)),
      pool.query<{
        id: string; author_id: string; content: string;
        viewed_by: unknown; reactions: unknown; likes: unknown; created_at: Date; has_image: boolean;
      }>(
        `SELECT id, author_id, content, viewed_by, reactions, likes, created_at,
                (image IS NOT NULL AND image <> '') AS has_image
         FROM stories ORDER BY created_at DESC`
      ),
      db.select().from(communities).orderBy(communities.createdAt),
    ]);

    const normalizedPosts = postsResult.rows.map(p => ({
          id: p.id, authorId: p.author_id, isAnonymous: p.is_anonymous, content: p.content, likes: p.likes, votes: p.votes,
        communityId: p.community_id, academicTag: p.academic_tag,
        projectTitle: p.project_title, feeling: p.feeling,
        websiteUrl: p.website_url, tags: p.tags,
        attachmentName: p.has_attachment ? p.attachment_name : null,
        attachmentMimeType: p.attachment_mime_type,
        pollOptions: p.poll_options, pollVotes: p.poll_votes,
        resharedFromId: p.reshared_from_id,
        createdAt: p.created_at,
        postImage: p.has_image ? 'has_image' : null,
      }));
    const sharedEngagementByPostId = buildPostEngagementById(normalizedPosts, allComments);
    const postsData = normalizedPosts.map((post) => {
      const engagement = sharedEngagementByPostId.get(post.id);
      return toPost(
        {
          ...post,
          ...(engagement ? {
            likes: engagement.likes,
            votes: engagement.votes,
            pollVotes: engagement.pollVotes,
          } : {}),
        } as any,
        engagement?.comments || allComments.filter((comment) => comment.postId === post.id),
      );
    });

    const isAdmin = (req as any).authUser.role === 'admin';
    const visibleUsers = usersData.filter((user: any) =>
      isAdmin ||
      user.id === viewerId ||
      (user.isSuspended !== true && user.privacySettings?.hideProfileFromSearch !== true)
    );
    const effectiveUsers = await applyActiveConnectPreferences(visibleUsers);
    const normalizedCommunities = await Promise.all(communitiesData.map(ensureCommunityHeadAdmin));
    const result = {
      users: effectiveUsers.map(toUserProfile),
      posts: postsData,
      connections: connectionsData.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
      stories: storiesResult.rows.map(s => ({
        id: s.id, authorId: s.author_id, content: s.content,
        viewedBy: s.viewed_by, reactions: s.reactions,
        likes: Array.isArray(s.likes) ? s.likes : [],
        createdAt: s.created_at.toISOString(),
        image: s.has_image ? `/api/stories/${s.id}/image` : null,
      })),
      communities: normalizedCommunities.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
    };
    setCache(cacheKey, result, 120_000); // account-scoped cache; busted on any write
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const viewerId = (req as any).authUser.id as string;
    const isAdmin = (req as any).authUser.role === 'admin';
    const all = await db.select(userProfileSelection).from(users);
    const visibleUsers = all.filter((user: any) =>
      isAdmin ||
      user.id === viewerId ||
      (user.isSuspended !== true && user.privacySettings?.hideProfileFromSearch !== true)
    );
    const effectiveUsers = await applyActiveConnectPreferences(visibleUsers);
    return res.json(effectiveUsers.map(toUserProfile));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const found = await db.select(userProfileSelection).from(users).where(eq(users.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'User not found' });
    const viewerId = (req as any).authUser.id as string;
    if (
      req.params.id !== viewerId &&
      (found[0] as any).privacySettings?.hideProfileFromSearch === true
    ) return res.status(404).json({ error: 'User not found' });
    const [effectiveUser] = await applyActiveConnectPreferences(found);
    return res.json(toUserProfile(effectiveUser));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Serve large stored avatars separately so list endpoints remain lightweight.
app.get('/api/users/:id/avatar', async (req, res) => {
  try {
    const found = await db.select({ avatar: users.avatar }).from(users).where(eq(users.id, req.params.id));
    const raw = found[0]?.avatar;
    if (!raw) return res.status(404).send('Not found');
    const avatarEndpoint = `/api/users/${encodeURIComponent(req.params.id)}/avatar`;
    let avatarPath: string | null = null;
    try {
      avatarPath = new URL(raw, 'https://avatar.invalid').pathname;
    } catch {
      // Invalid legacy URLs are handled by the normal unsupported-avatar path.
    }
    if (avatarPath === avatarEndpoint) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).send('Avatar not available');
    }

    // Avatars have existed in a few formats over the lifetime of the app:
    // standard data URLs, URL-encoded SVG/data URLs, and a legacy value with
    // an accidental URL prefix before the data URL. Find the data URL
    // anywhere in the stored value and decode it according to its metadata.
    const dataStart = raw.toLowerCase().indexOf('data:');
    const dataUrl = dataStart >= 0 ? raw.slice(dataStart).trim() : '';
    const dataMatch = dataUrl.match(/^data:([^,]+),([\s\S]*)$/i);
    if (dataMatch) {
      const metadata = dataMatch[1];
      const mimeType = metadata.split(';', 1)[0] || 'application/octet-stream';
      const payload = dataMatch[2];
      const isBase64 = /(?:^|;)base64(?:;|$)/i.test(metadata);
      let imageBuffer: Buffer;
      if (isBase64) {
        imageBuffer = Buffer.from(payload.replace(/\s/g, ''), 'base64');
      } else {
        try {
          imageBuffer = Buffer.from(decodeURIComponent(payload), 'utf8');
        } catch {
          imageBuffer = Buffer.from(payload, 'utf8');
        }
      }
      if (!imageBuffer.length) return res.status(404).send('Avatar not available');
      res.setHeader('Content-Type', mimeType);
      // Avatar URLs are stable across profile-photo updates, so they must be
      // revalidated instead of being cached as immutable under the same URL.
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.send(imageBuffer);
    }
    if (/^https?:\/\//i.test(raw)) return res.redirect(302, raw);

    // Some early imports stored only the base64 payload. Infer the image type
    // from its magic bytes so those avatars remain viewable without a data URL.
    const compactBase64 = raw.trim().replace(/\s/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(compactBase64) && compactBase64.length > 100) {
      const imageBuffer = Buffer.from(compactBase64, 'base64');
      let mimeType: string | null = null;
      if (imageBuffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        mimeType = 'image/png';
      } else if (imageBuffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
        mimeType = 'image/jpeg';
      } else if (imageBuffer.subarray(0, 4).toString('ascii') === 'GIF8') {
        mimeType = 'image/gif';
      } else if (
        imageBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        imageBuffer.subarray(8, 12).toString('ascii') === 'WEBP'
      ) {
        mimeType = 'image/webp';
      } else if (imageBuffer.subarray(0, 200).toString('utf8').trimStart().startsWith('<svg')) {
        mimeType = 'image/svg+xml';
      }
      if (mimeType) {
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        return res.send(imageBuffer);
      }
    }
    return res.status(404).send('Avatar not available');
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { fullName, college, schoolName, coachingName, location, branch, degree, academicStream, programGroup, fields, year, aboutMe, interests, skills, lookingFor, connectPreference, privacySettings, avatar, coverImage } = req.body;
    const canonicalCollege = canonicalizeCollegeName(college) || '';
    const updated = await db.update(users).set({
      fullName, college: canonicalCollege, schoolName: schoolName ?? '', coachingName: coachingName ?? '', location: location ?? '', branch, degree: degree ?? '', academicStream: academicStream ?? '', programGroup: programGroup ?? '', fields: fields ?? [], year, aboutMe, interests, skills, lookingFor, connectPreference: connectPreference || null, privacySettings, avatar, coverImage
    }).where(eq(users.id, req.params.id)).returning();
    if (!updated.length) return res.status(404).json({ error: 'User not found' });
    await syncOfficialCollegeMembership(req.params.id, canonicalCollege);
    await syncJeeAspirantsMembership();
    bust('bootstrap');
    return res.json(toUserProfile(updated[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const updated = await db.update(users)
      .set({ passwordHash: await hashPassword(newPassword) })
      .where(eq(users.id, req.params.id))
      .returning();
    if (!updated.length) return res.status(404).json({ error: 'User not found' });
    await pool.query(
      `UPDATE auth_sessions SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.params.id],
    );
    await sendPasswordSecurityNotice(updated[0]);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/suspend', async (req, res) => {
  try {
    const found = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'User not found' });
    const newState = !found[0].isSuspended;
    const updated = await db.update(users).set({ isSuspended: newState }).where(eq(users.id, req.params.id)).returning();
    if (!updated.length) return res.status(404).json({ error: 'User not found' });
    const suspensionEmailSent = newState ? await sendSuspensionEmail(updated[0]) : undefined;
    bust('bootstrap');
    return res.json({
      ...toUserProfile(updated[0]),
      ...(typeof suspensionEmailSent === 'boolean' ? { suspensionEmailSent } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POSTS ───────────────────────────────────────────────────────────────────

app.get('/api/posts', async (req, res) => {
  try {
    const communityId = typeof req.query.communityId === 'string'
      ? req.query.communityId.trim()
      : '';
    // Exclude postImage blob from list — served on-demand via /api/posts/:id/image
    const postSelection = {
      id: posts.id,
      authorId: posts.authorId,
      isAnonymous: posts.isAnonymous,
      content: posts.content,
      likes: posts.likes,
      votes: posts.votes,
      communityId: posts.communityId,
      academicTag: posts.academicTag,
      projectTitle: posts.projectTitle,
      feeling: posts.feeling,
      websiteUrl: posts.websiteUrl,
      tags: posts.tags,
      attachmentName: posts.attachmentName,
      attachmentMimeType: posts.attachmentMimeType,
      pollOptions: posts.pollOptions,
      pollVotes: posts.pollVotes,
       resharedFromId: posts.resharedFromId,
      createdAt: posts.createdAt,
    };
    const allPosts = await (communityId
      ? db.select(postSelection).from(posts).where(eq(posts.communityId, communityId)).orderBy(desc(posts.createdAt))
      : db.select(postSelection).from(posts).orderBy(desc(posts.createdAt)));

    // Determine which posts have images without loading the blobs
    const imgFlagRows = await pool.query<{
      id: string;
      has_image: boolean;
      image_count: number;
      has_attachment: boolean;
      attachment_name: string | null;
      attachment_mime_type: string | null;
    }>(
      `SELECT id,
              (post_image IS NOT NULL AND post_image <> '') AS has_image,
              CASE
                WHEN post_image IS NULL OR post_image = '' THEN 0
                WHEN left(post_image, 1) = '[' THEN jsonb_array_length(post_image::jsonb)
                ELSE 1
              END AS image_count,
              (attachment_data IS NOT NULL AND attachment_data <> '') AS has_attachment,
              attachment_name, attachment_mime_type
       FROM posts`
    );
    const postAssetMap = new Map(imgFlagRows.rows.map(r => [r.id, r]));

    const allComments = await db.select().from(comments).orderBy(comments.createdAt);
    const sharedEngagementByPostId = buildPostEngagementById(allPosts, allComments);
    const result = allPosts.map((p) => {
      const engagement = sharedEngagementByPostId.get(p.id);
      return toPost({
        ...p,
        postImage: postAssetMap.get(p.id)?.has_image ? 'has_image' : null,
        imageCount: postAssetMap.get(p.id)?.image_count ?? 0,
        attachmentName: postAssetMap.get(p.id)?.has_attachment
          ? postAssetMap.get(p.id)?.attachment_name
          : null,
        attachmentMimeType: postAssetMap.get(p.id)?.attachment_mime_type ?? null,
        ...(engagement ? {
          likes: engagement.likes,
          votes: engagement.votes,
          pollVotes: engagement.pollVotes,
        } : {}),
      } as any, engagement?.comments || allComments.filter((comment) => comment.postId === p.id));
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bounded, viewer-aware Home feed. The legacy /api/posts endpoint remains
// available for admin/community views, while Home never needs to download the
// entire post table.
app.get('/api/feed', async (req, res) => {
  try {
    const viewerId = String(req.query.viewerId || '').trim();
    const { filter, limit, offset } = normalizeHomeFeedRequest(
      req.query.filter,
      req.query.limit,
      req.query.offset,
    );
    let viewerCollege: string | null | undefined;

    if (filter === 'college' || filter === 'beyond-campus') {
      if (!viewerId) return res.json({ items: [], hasMore: false, nextOffset: null });
      const viewerResult = await pool.query<{ college: string | null }>(
        'SELECT college FROM users WHERE id = $1 LIMIT 1',
        [viewerId],
      );
      viewerCollege = viewerResult.rows[0]?.college;
    }

    const scope = buildHomeFeedScope(filter, viewerId, viewerCollege);
    if (!scope) return res.json({ items: [], hasMore: false, nextOffset: null });
    const { where, params } = scope;

    params.push(limit + 1);
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;
    const engagementOrder = `(
          (ln(1 + COALESCE(jsonb_array_length(p.likes), 0)) * 1.4)
          + (ln(1 + COALESCE(cs.comment_count, 0)) * 2.8)
        ) / power(
          greatest(extract(epoch from (now() - p.created_at)) / 3600, 0) + 2,
          0.65
         ) DESC, p.created_at DESC`;
    const orderBy = filter === 'beyond-campus'
      ? engagementOrder
      : filter === 'looking-for'
        ? 'p.created_at DESC'
        : filter === 'learn'
          ? `(
              (ln(1 + COALESCE(jsonb_array_length(p.likes), 0)) * 1.2)
              + (ln(1 + COALESCE(cs.comment_count, 0)) * 2.4)
            ) DESC, p.created_at DESC`
          : 'p.created_at DESC';

    const postRows = await pool.query<any>(
      `SELECT
         p.id,
         p.author_id AS "authorId",
         p.is_anonymous AS "isAnonymous",
         p.content,
          p.likes,
          p.votes AS "votes",
         p.community_id AS "communityId",
         p.academic_tag AS "academicTag",
         p.project_title AS "projectTitle",
         p.feeling,
         p.website_url AS "websiteUrl",
         p.tags,
         p.attachment_name AS "attachmentName",
         p.attachment_mime_type AS "attachmentMimeType",
         p.poll_options AS "pollOptions",
         p.poll_votes AS "pollVotes",
          p.reshared_from_id AS "resharedFromId",
         p.created_at AS "createdAt",
         (p.post_image IS NOT NULL AND p.post_image <> '') AS "hasImage",
         CASE
           WHEN p.post_image IS NULL OR p.post_image = '' THEN 0
           WHEN left(p.post_image, 1) = '[' THEN jsonb_array_length(p.post_image::jsonb)
           ELSE 1
         END AS "imageCount",
         (p.attachment_data IS NOT NULL AND p.attachment_data <> '') AS "hasAttachment",
         COALESCE(cs.comment_count, 0)::int AS "commentsCount"
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN communities c ON c.id = p.community_id
       LEFT JOIN (
          SELECT
            COALESCE(owner.reshared_from_id, owner.id) AS root_post_id,
            count(comment.id)::int AS comment_count
          FROM posts owner
          LEFT JOIN comments comment ON comment.post_id = owner.id
          GROUP BY COALESCE(owner.reshared_from_id, owner.id)
        ) cs ON cs.root_post_id = COALESCE(p.reshared_from_id, p.id)
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params,
    );

    const hasMore = postRows.rows.length > limit;
    const pageRows = hasMore ? postRows.rows.slice(0, limit) : postRows.rows;
    const engagementRootIds = [...new Set(pageRows.map((row) => row.resharedFromId || row.id))];
    const sharedEngagementByPostId = await loadPostEngagement(engagementRootIds);

    const result = pageRows.map((row) => {
      // Keep the real author available only to server-side ownership and
      // moderation code. An anonymous feed item gets a stable synthetic ID,
      // so the client cannot use its user directory to reverse the choice.
      const safeRow = { ...row, authorId: sanitizeHomeFeedAuthorId(row) };
      const engagement = sharedEngagementByPostId.get(row.id);
      const sharedComments = (engagement?.comments || []).map((comment) => comment.isAnonymous
        ? { ...comment, authorId: `anonymous:${comment.id}` }
        : comment);
      return toPost({
        ...safeRow,
        ...(engagement ? {
          likes: engagement.likes,
          votes: engagement.votes,
          pollVotes: engagement.pollVotes,
          commentsCount: sharedComments.length,
        } : {}),
        postImage: row.hasImage ? 'has_image' : null,
        imageCount: Number(row.imageCount || 0),
        attachmentName: row.hasAttachment ? row.attachmentName : null,
        createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      } as any, sharedComments);
    });

    return res.json({
      items: result,
      hasMore,
      nextOffset: hasMore ? offset + pageRows.length : null,
    });
  } catch (err: any) {
    console.error('Home feed error:', err);
    return res.status(500).json({ error: 'Could not load the Home feed.' });
  }
});

// Serve individual post image (binary) — browser caches independently
app.get('/api/posts/:id/image', async (req, res) => {
  try {
    const found = await db.select({ postImage: posts.postImage }).from(posts).where(eq(posts.id, req.params.id));
    if (!found.length || !found[0].postImage) return res.status(404).send('Not found');
    const requestedIndex = Number.parseInt(String(req.query.index ?? '0'), 10);
    const imageIndex = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < 10
      ? requestedIndex
      : 0;
    const raw = storedPostImages(found[0].postImage)[imageIndex];
    if (!raw || raw.length < 5) return res.status(404).send('Not found');
    // Case 1: Standard data URL
    const dataMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataMatch) {
      res.setHeader('Content-Type', dataMatch[1]);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(dataMatch[2], 'base64'));
    }
    // Case 2: Embedded data URL (malformed prefix before base64)
    const embeddedMatch = raw.match(/data:([^;]+);base64,(.+)$/s);
    if (embeddedMatch) {
      res.setHeader('Content-Type', embeddedMatch[1]);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(embeddedMatch[2], 'base64'));
    }
    // Case 3: Plain external URL
    if (/^https?:\/\//.test(raw)) {
      return res.redirect(302, raw);
    }
    return res.status(404).send('Image not available');
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/:id/attachment', async (req, res) => {
  try {
    const found = await db
      .select({
        attachmentData: posts.attachmentData,
        attachmentName: posts.attachmentName,
        attachmentMimeType: posts.attachmentMimeType,
      })
      .from(posts)
      .where(eq(posts.id, req.params.id));
    const attachment = found[0];
    if (!attachment?.attachmentData) return res.status(404).send('Not found');

    const dataMatch = attachment.attachmentData.match(/^data:([^;]+);base64,(.+)$/s);
    if (!dataMatch) return res.status(404).send('Attachment not available');
    const safeName = (attachment.attachmentName || 'attachment').replace(/["\r\n]/g, '');
    res.setHeader('Content-Type', attachment.attachmentMimeType || dataMatch[1]);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(dataMatch[2], 'base64'));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const {
      authorId,
      content,
      academicTag,
      communityId,
      projectTitle,
      postImage,
      postImages,
      feeling,
      websiteUrl,
      tags,
      attachmentName,
      attachmentData,
      attachmentMimeType,
      pollOptions,
      isAnonymous,
    } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Post text is required.' });
    }
    if (countWords(content) > MAX_POST_WORDS) {
      return res.status(400).json({ error: `Post text cannot exceed ${MAX_POST_WORDS.toLocaleString()} words.` });
    }
    if (typeof attachmentData === 'string' && attachmentData.length > 14_000_000) {
      return res.status(413).json({ error: 'Attachments must be 10 MB or smaller.' });
    }
    if (Array.isArray(postImages) && postImages.length > 10) {
      return res.status(400).json({ error: 'Posts can contain up to 10 images.' });
    }
    const normalizedImages = (Array.isArray(postImages)
      ? postImages
      : typeof postImage === 'string' && postImage
        ? [postImage]
        : [])
      .filter((image: unknown): image is string => typeof image === 'string' && image.trim().length > 0)
      .map((image: string) => image.trim());
    if (normalizedImages.some((image) => image.startsWith('data:image/') && image.length > 12_000_000)) {
      return res.status(413).json({ error: 'Each image must be 8 MB or smaller.' });
    }
    const normalizedTags = Array.isArray(tags)
      ? tags.map((tag: unknown) => String(tag).trim()).filter(Boolean).slice(0, 12)
      : [];
    const normalizedPollOptions = Array.isArray(pollOptions)
      ? [...new Set(
          pollOptions
            .map((option: unknown) => String(option).trim())
            .filter(Boolean),
        )].slice(0, 6)
      : [];
    if (pollOptions !== undefined && normalizedPollOptions.length < 2) {
      return res.status(400).json({ error: 'Polls need at least two options.' });
    }
    const normalizedTag = typeof academicTag === 'string' ? academicTag.trim() : '';
    const anonymousRequest = normalizedTag.toLowerCase().startsWith('looking for:');
    const anonymousTopic = normalizedTag.toLowerCase().startsWith('anonymous topic:');
    const requestType = anonymousRequest
      ? normalizedTag.slice('looking for:'.length).trim().toLowerCase()
      : anonymousTopic
        ? normalizedTag.slice('anonymous topic:'.length).trim().toLowerCase()
        : '';
    const canPostAnonymously = (anonymousRequest || anonymousTopic) && [
      'study partner',
      'dsa practice partner',
      'library partner',
      'college life',
      'student life',
      'campus life',
      'finding people',
      'friendship',
      'social life',
      'college advice',
    ].includes(requestType);
    if (isAnonymous && !canPostAnonymously) {
      return res.status(400).json({ error: 'Anonymous posting is only available for study, DSA practice, or library partner requests.' });
    }
    const newPost = await db.insert(posts).values({
      id: generateId('post'),
      authorId,
      isAnonymous: Boolean(isAnonymous && canPostAnonymously),
      content,
      likes: [],
      academicTag: academicTag || null,
      communityId: communityId || null,
      projectTitle: projectTitle || null,
       postImage: normalizedImages.length > 1
         ? JSON.stringify(normalizedImages)
         : normalizedImages[0] || null,
      feeling: feeling || null,
      websiteUrl: typeof websiteUrl === 'string' ? websiteUrl.trim() || null : null,
      tags: normalizedTags,
      attachmentName: typeof attachmentName === 'string' ? attachmentName.trim() || null : null,
      attachmentData: typeof attachmentData === 'string' ? attachmentData : null,
      attachmentMimeType: typeof attachmentMimeType === 'string' ? attachmentMimeType : null,
      pollOptions: normalizedPollOptions.length >= 2 ? normalizedPollOptions : null,
      pollVotes: normalizedPollOptions.length >= 2 ? {} : null,
    }).returning();

    // Push notification to all accepted connections of the author
    const author = await db.select().from(users).where(eq(users.id, authorId));
    if (author.length) {
       const authorName = author[0].fullName;
       const notificationAuthorName = newPost[0].isAnonymous
         ? anonymousAlias(authorId)
         : authorName;
       const isPoll = normalizedPollOptions.length >= 2;
       const bodyPreview = isPoll
         ? `Poll: ${projectTitle || content}`.substring(0, 120)
         : content.length > 80 ? content.substring(0, 80) + '…' : content;
      const community = communityId
        ? (await db.select().from(communities).where(eq(communities.id, communityId)))[0]
        : undefined;
      const communityMemberIds = Array.isArray(community?.memberIds)
        ? [...new Set((community.memberIds as string[]).filter(id => id !== authorId))]
        : [];
      const authorConns = await db.select().from(connections).where(
        and(
          or(eq(connections.senderId, authorId), eq(connections.receiverId, authorId)),
          eq(connections.status, 'accepted')
        )
      );
      for (const conn of authorConns) {
        const recipientId = conn.senderId === authorId ? conn.receiverId : conn.senderId;
        if (communityMemberIds.includes(recipientId)) continue;
         if (isPoll) {
           await createNotification(
             recipientId,
             authorId,
             'poll',
             `📊 ${notificationAuthorName} posted a poll`,
             `${bodyPreview} [[post:${newPost[0].id}]]`,
           );
         }
         await dispatchPush(recipientId, {
            title: isPoll
              ? `📊 ${notificationAuthorName} posted a poll`
              : newPost[0].isAnonymous
             ? `📢 ${notificationAuthorName} posted anonymously`
             : `📢 ${notificationAuthorName} posted`,
          body: bodyPreview,
          icon: '/icons/icon-192x192.png',
          tag: `post-${newPost[0].id}`,
          view: 'feed',
           data: { postId: newPost[0].id, userId: authorId },
        });
      }

      // Notify members of the community as well as the author's connections.
      // Community posts should reach members even when they are outside the app.
      if (community) {
          const communityEmailCandidates = await db.select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
          }).from(users).where(
            and(
              inArray(users.id, communityMemberIds),
              eq(users.isSuspended, false),
            ),
          );
           const broadcastMention = hasBroadcastMention(content);
          const mentionedMemberIds = new Set(
             broadcastMention
               ? communityMemberIds
               : extractMentionedUserIds(content, communityEmailCandidates)
                 .filter(userId => communityMemberIds.includes(userId)),
          );
           const isCommunityAdminPost = isCommunityAdmin(community, authorId)
             || await isPlatformAdmin(authorId);
           const communityPostSubject = broadcastMention
             ? `${notificationAuthorName} mentioned everyone in ${community.name}`
             : isCommunityAdminPost
               ? `Community admin posted in ${community.name}`
               : `${notificationAuthorName} posted in ${community.name}`;
           const communityPostTitle = broadcastMention
             ? `${notificationAuthorName} mentioned everyone`
             : isCommunityAdminPost
               ? `New admin post in ${community.name}`
               : `New post in ${community.name}`;
           const communityPostBody = broadcastMention
             ? `${notificationAuthorName} mentioned everyone in ${community.name}:\n\n${bodyPreview}`
             : isCommunityAdminPost
               ? `Community admin ${notificationAuthorName} shared a new post:\n\n${bodyPreview}`
               : `${notificationAuthorName} shared a new post:\n\n${bodyPreview}`;

          // Send email before the push fan-out. A large community can have
          // many bounded push-provider calls, and Vercel may end the request
          // before code placed after that fan-out gets a chance to run.
           if (broadcastMention) {
             await sendCommunityPostActivityEmail({
               recipientEmails: communityEmailCandidates.map((member) => member.email),
               subject: communityPostSubject,
               title: communityPostTitle,
               body: communityPostBody,
               view: 'communities',
               params: { communityId, postId: newPost[0].id },
               context: 'community-wide mention email',
             });
           } else {
             const generalPostEmails = communityEmailCandidates
               .filter((member) => !mentionedMemberIds.has(member.id))
               .map((member) => member.email)
               .filter((email): email is string => Boolean(email));
             await sendCommunityPostActivityEmail({
               recipientEmails: generalPostEmails,
               subject: communityPostSubject,
               title: communityPostTitle,
               body: communityPostBody,
               view: 'communities',
               params: { communityId, postId: newPost[0].id },
               context: isCommunityAdminPost
                 ? 'community admin post activity email'
                 : 'community post activity email',
             });

             // A direct @mention gets its own immediate email rather than the
             // generic community-post email, matching the in-app and push channels.
             await Promise.all([...mentionedMemberIds].map(async userId => {
               const mentionedUser = communityEmailCandidates.find(candidate => candidate.id === userId);
               await sendImmediateActivityEmail({
                 recipient: mentionedUser || {},
                 subject: `${notificationAuthorName} mentioned you in ${community.name}`,
                 title: `${notificationAuthorName} mentioned you`,
                 body: `${notificationAuthorName} mentioned you in ${community.name}:\n\n${bodyPreview}`,
                 view: 'communities',
                 params: { communityId, postId: newPost[0].id },
               });
             }));
           }

        await Promise.all(communityMemberIds.map(async recipientId => {
            const isMentioned = mentionedMemberIds.has(recipientId);
             const notificationType = isMentioned ? 'mention' : isPoll ? 'poll' : 'community_post';
             const notificationTitle = broadcastMention
               ? `🔔 ${notificationAuthorName} mentioned everyone`
               : isMentioned
              ? `🔔 ${notificationAuthorName} mentioned you`
               : isPoll
                 ? `📊 ${community.name} poll`
              : `📢 ${community.name}`;
            const notificationBody = isMentioned
               ? `${notificationAuthorName} ${broadcastMention ? 'mentioned everyone' : 'mentioned you'} in ${community.name}: ${bodyPreview} [[community:${communityId}]] [[post:${newPost[0].id}]]`
               : isPoll
                 ? `${notificationAuthorName} posted a poll: ${bodyPreview} [[community:${communityId}]] [[post:${newPost[0].id}]]`
               : newPost[0].isAnonymous
                ? `${notificationAuthorName} posted anonymously: ${bodyPreview} [[community:${communityId}]] [[post:${newPost[0].id}]]`
                : `${notificationAuthorName}: ${bodyPreview} [[community:${communityId}]] [[post:${newPost[0].id}]]`;
          const notification = await createNotification(
            recipientId,
            authorId,
              notificationType,
              notificationTitle,
              notificationBody,
          );
            await dispatchPush(recipientId, {
               title: isMentioned ? notificationTitle : isPoll ? notificationTitle : `📢 ${community.name}`,
              body: isMentioned
                 ? `${notificationAuthorName} ${broadcastMention ? 'mentioned everyone' : 'mentioned you'} in ${community.name}: ${bodyPreview}`
                 : isPoll
                   ? `${notificationAuthorName} posted a poll: ${bodyPreview}`
                : newPost[0].isAnonymous
                  ? `${notificationAuthorName} posted anonymously: ${bodyPreview}`
                  : `${notificationAuthorName}: ${bodyPreview}`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
              tag: `${notificationType}-${newPost[0].id}-${recipientId}`,
            view: 'communities',
              type: notificationType,
            senderAvatar: author[0].avatar || null,
            data: { communityId, postId: newPost[0].id, userId: authorId },
          });
          }));

      }
    }

    bust('bootstrap');
    return res.json(toPost(newPost[0], []));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    const actorId = typeof req.body?.actorId === 'string' ? req.body.actorId.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const projectTitle = typeof req.body?.projectTitle === 'string'
      ? req.body.projectTitle.trim()
      : undefined;
    if (!actorId) return res.status(400).json({ error: 'actorId is required' });
    if (!content) return res.status(400).json({ error: 'Post text is required.' });
    if (countWords(content) > MAX_POST_WORDS) {
      return res.status(400).json({ error: `Post text cannot exceed ${MAX_POST_WORDS.toLocaleString()} words.` });
    }

    const found = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Post not found' });
    const existing = found[0];
    const actor = (await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, actorId)))[0];
    const community = existing.communityId
      ? (await db.select().from(communities).where(eq(communities.id, existing.communityId)))[0]
      : undefined;
    const canEdit = Boolean(
      actor && (
        actor.id === existing.authorId ||
        actor.role === 'admin' ||
        (community && isCommunityAdmin(community, actor.id))
      ),
    );
    if (!canEdit) return res.status(403).json({ error: 'Only the post owner or a community admin can edit this post.' });

    const updated = await db.update(posts)
      .set({
        content,
        ...(projectTitle !== undefined ? { projectTitle: projectTitle || null } : {}),
      })
      .where(eq(posts.id, req.params.id))
      .returning();
    bust('bootstrap');
    return res.json(toPost(updated[0], []));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/reshare', async (req, res) => {
  try {
    const authorId = typeof req.body?.authorId === 'string' ? req.body.authorId.trim() : '';
    if (!authorId) return res.status(400).json({ error: 'authorId is required' });

    const sourceRows = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!sourceRows.length) return res.status(404).json({ error: 'Post not found' });
    const sourcePost = sourceRows[0];
    if (sourcePost.isAnonymous) {
      return res.status(403).json({ error: 'Anonymous posts cannot be reshared.' });
    }
    const author = (await db.select({ id: users.id }).from(users).where(eq(users.id, authorId)))[0];
    if (!author) return res.status(403).json({ error: 'Student account not found.' });

    // Keep a reshare tied to the original post rather than creating nested
    // chains when someone reshares an already reshared item.
    const original = await resolveOriginalPost(sourcePost);
    const sourceEngagement = (await loadPostEngagement([original.id])).get(original.id);
    const reshared = await db.insert(posts).values({
      id: generateId('post'),
      authorId,
      isAnonymous: false,
      content: original.content,
      likes: sourceEngagement?.likes || (Array.isArray(original.likes) ? original.likes : []),
      votes: sourceEngagement?.votes || original.votes || {},
      communityId: original.communityId || null,
      academicTag: original.academicTag || null,
      projectTitle: original.projectTitle || null,
      postImage: original.postImage || null,
      feeling: original.feeling || null,
      websiteUrl: original.websiteUrl || null,
      tags: Array.isArray(original.tags) ? original.tags : [],
      attachmentName: original.attachmentName || null,
      attachmentData: original.attachmentData || null,
      attachmentMimeType: original.attachmentMimeType || null,
      pollOptions: original.pollOptions || null,
      pollVotes: original.pollOptions
        ? sourceEngagement?.pollVotes || original.pollVotes || {}
        : null,
      resharedFromId: original.id,
    }).returning();

    bust('bootstrap');
    const engagement = (await loadPostEngagement([original.id])).get(reshared[0].id);
    return res.json(toPost({
      ...reshared[0],
      ...(engagement ? {
        likes: engagement.likes,
        votes: engagement.votes,
        pollVotes: engagement.pollVotes,
      } : {}),
    }, engagement?.comments || []));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const actorId = typeof req.query.actorId === 'string' ? req.query.actorId : '';
    const found = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Post not found' });
    const post = found[0];
    const actor = actorId
      ? (await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, actorId)))[0]
      : undefined;
    const community = post.communityId
      ? (await db.select().from(communities).where(eq(communities.id, post.communityId)))[0]
      : undefined;
    const canDelete = Boolean(
      actor && (
        actor.id === post.authorId ||
        actor.role === 'admin' ||
        (community && isCommunityAdmin(community, actor.id))
      ),
    );
    if (!canDelete) return res.status(403).json({ error: 'You are not allowed to delete this post.' });
    await db.delete(posts).where(eq(posts.id, req.params.id));
    bust('bootstrap');
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/saved', async (req, res) => {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const rows = await db.select({
      itemType: savedItems.itemType,
      itemId: savedItems.itemId,
    }).from(savedItems).where(eq(savedItems.userId, userId));
    return res.json({
      postIds: rows.filter(row => row.itemType === 'post').map(row => row.itemId),
      communityIds: rows.filter(row => row.itemType === 'community').map(row => row.itemId),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/saved/toggle', async (req, res) => {
  try {
    const { userId, itemType, itemId } = req.body as { userId?: string; itemType?: string; itemId?: string };
    if (!userId || !itemId || !['post', 'community'].includes(itemType || '')) {
      return res.status(400).json({ error: 'userId, itemType, and itemId are required' });
    }
    const existing = await db.select({ id: savedItems.id })
      .from(savedItems)
      .where(and(
        eq(savedItems.userId, userId),
        eq(savedItems.itemType, itemType!),
        eq(savedItems.itemId, itemId),
      ));
    if (existing.length) {
      await db.delete(savedItems).where(eq(savedItems.id, existing[0].id));
      return res.json({ saved: false, itemType, itemId });
    }
    if (itemType === 'post') {
      const post = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, itemId));
      if (!post.length) return res.status(404).json({ error: 'Post not found' });
    } else {
      const community = await db.select({ id: communities.id }).from(communities).where(eq(communities.id, itemId));
      if (!community.length) return res.status(404).json({ error: 'Community not found' });
    }
    await db.insert(savedItems).values({
      id: generateId('saved'),
      userId,
      itemType: itemType!,
      itemId,
    }).onConflictDoNothing();
    return res.json({ saved: true, itemType, itemId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/comments/:id', async (req, res) => {
  try {
    await db.delete(comments).where(eq(comments.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stories/:id', async (req, res) => {
  try {
    await db.delete(stories).where(eq(stories.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/poll-vote', async (req, res) => {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    const optionIndex = Number(req.body?.optionIndex);
    if (!userId || !Number.isInteger(optionIndex)) {
      return res.status(400).json({ error: 'userId and a valid poll option are required' });
    }
    const found = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Not found' });
    const existingPost = found[0];
    const originalPost = await resolveOriginalPost(existingPost);
    const options = Array.isArray(originalPost.pollOptions) ? originalPost.pollOptions : [];
    if (options.length < 2 || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ error: 'This post does not have that poll option.' });
    }
    const currentEngagement = (await loadPostEngagement([originalPost.id])).get(originalPost.id);
    const currentVotes = (currentEngagement?.pollVotes || originalPost.pollVotes || {}) as Record<string, number>;
    const previousOption = currentVotes[userId];
    const updated = await db.update(posts)
      .set({ pollVotes: { ...currentVotes, [userId]: optionIndex } })
      .where(eq(posts.id, originalPost.id))
      .returning();
    if (previousOption !== optionIndex && originalPost.authorId !== userId) {
      const voter = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, userId));
      const voterName = voter[0]?.fullName || 'A student';
      const pollTitle = originalPost.projectTitle || originalPost.content.slice(0, 80);
      const community = originalPost.communityId
        ? (await db.select({ name: communities.name }).from(communities).where(eq(communities.id, originalPost.communityId)))[0]
        : undefined;
      const communityMarker = originalPost.communityId ? ` [[community:${originalPost.communityId}]]` : '';
      const notificationBody = `${voterName} voted in your poll "${pollTitle}"${communityMarker} [[post:${originalPost.id}]]`;
      await createNotification(
        originalPost.authorId,
        userId,
        'poll',
        '📊 New poll vote',
        notificationBody,
      );
      await dispatchPush(originalPost.authorId, {
        title: '📊 New poll vote',
        body: community ? `${voterName} voted in your poll in ${community.name}.` : `${voterName} voted in your poll.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `poll-vote-${originalPost.id}-${userId}`,
        view: community ? 'communities' : 'feed',
        type: 'poll',
        data: {
          postId: originalPost.id,
          communityId: originalPost.communityId || '',
          userId,
        },
      });
    }
    bust('bootstrap');
    return res.json(toPost({
      ...existingPost,
      likes: currentEngagement?.likes || originalPost.likes || [],
      votes: currentEngagement?.votes || originalPost.votes || {},
      pollVotes: updated[0].pollVotes,
    }, currentEngagement?.comments || []));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const found = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Post not found' });
    const displayPost = found[0];
    const post = await resolveOriginalPost(displayPost);
    const currentEngagement = (await loadPostEngagement([post.id])).get(post.id);
    const likesArr = currentEngagement?.likes
      || (Array.isArray(post.likes) ? post.likes as string[] : []);
    const isLiking = !likesArr.includes(userId);
    const newLikes = isLiking ? [...likesArr, userId] : likesArr.filter(id => id !== userId);
    await db.update(posts).set({ likes: newLikes }).where(eq(posts.id, post.id));
    // Push notification + in-app notification to post author
    if (isLiking && post.authorId !== userId) {
      const liker = await db.select().from(users).where(eq(users.id, userId));
      if (liker.length) {
        const postTarget = ` [[post:${post.id}]]`;
        const communityTarget = post.communityId ? ` [[community:${post.communityId}]]` : '';
        const notificationBody = `${liker[0].fullName} liked your post${postTarget}${communityTarget}`;
         await dispatchPush(post.authorId, {
          title: '❤️ New Like',
          body: `${liker[0].fullName} liked your post`,
          icon: '/icons/icon-192x192.png',
          tag: `like-${req.params.id}`,
          view: post.communityId ? 'communities' : 'feed',
          data: post.communityId ? { communityId: post.communityId, postId: post.id } : undefined,
        });
        await createNotification(post.authorId, userId, 'like', '❤️ New Like', notificationBody);
      }
    }
    return res.json(toPost({
      ...displayPost,
      likes: newLikes,
      votes: currentEngagement?.votes || post.votes || {},
      pollVotes: currentEngagement?.pollVotes || post.pollVotes || {},
    }, currentEngagement?.comments || []));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/vote', async (req, res) => {
  try {
    const { userId, value } = req.body as { userId?: string; value?: number };
    const voteValue = value === 1 || value === -1 ? value : null;
    if (!userId || !voteValue) {
      return res.status(400).json({ error: 'userId and a vote value of 1 or -1 are required' });
    }
    const found = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Post not found' });
    const displayPost = found[0];
    const post = await resolveOriginalPost(displayPost);
    const currentEngagement = (await loadPostEngagement([post.id])).get(post.id);
    const storedVotes = currentEngagement?.votes && typeof currentEngagement.votes === 'object'
      ? currentEngagement.votes as Record<string, number>
      : post.votes && typeof post.votes === 'object'
        ? post.votes as Record<string, number>
      : {};
    const currentVote = storedVotes[userId] === 1 || storedVotes[userId] === -1
      ? storedVotes[userId]
      : 0;
    const nextVotes = { ...storedVotes };
    if (currentVote === voteValue) {
      delete nextVotes[userId];
    } else {
      nextVotes[userId] = voteValue;
    }
    const updated = await db.update(posts)
      .set({ votes: nextVotes })
      .where(eq(posts.id, post.id))
      .returning();

    if (nextVotes[userId] === 1 && post.authorId !== userId) {
      const voter = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
      if (voter.length) {
        const postTarget = ` [[post:${post.id}]]`;
        const communityTarget = post.communityId ? ` [[community:${post.communityId}]]` : '';
        const notificationBody = `${voter[0].fullName} upvoted your post${postTarget}${communityTarget}`;
        await createNotification(post.authorId, userId, 'upvote', '⬆️ New Upvote', notificationBody);
        await dispatchPush(post.authorId, {
          title: '⬆️ New Upvote',
          body: `${voter[0].fullName} upvoted your post`,
          icon: '/icons/icon-192x192.png',
          tag: `upvote-${post.id}`,
          view: post.communityId ? 'communities' : 'feed',
          data: post.communityId
            ? { communityId: post.communityId, postId: post.id }
            : { postId: post.id },
        });
      }
    }
    return res.json(toPost({
      ...displayPost,
      likes: currentEngagement?.likes || post.likes || [],
      votes: updated[0].votes,
      pollVotes: currentEngagement?.pollVotes || post.pollVotes || {},
    }, currentEngagement?.comments || []));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { authorId, content, isAnonymous, replyToId } = req.body;
    const normalizedContent = String(content || '').trim();
    if (!authorId || !normalizedContent) {
      return res.status(400).json({ error: 'authorId and content are required' });
    }
    const anonymous = isAnonymous === true || isAnonymous === 'true';
    const [displayPost] = await db.select().from(posts).where(eq(posts.id, req.params.id));
    if (!displayPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const targetPost = await resolveOriginalPost(displayPost);
    const currentEngagement = (await loadPostEngagement([targetPost.id])).get(targetPost.id);
    let parentComment: typeof comments.$inferSelect | undefined;
    if (replyToId) {
      const replyId = String(replyToId);
      if (!currentEngagement?.comments.some((comment) => comment.id === replyId)) {
        return res.status(400).json({ error: 'Reply target not found on this post' });
      }
      const [parent] = await db.select().from(comments).where(eq(comments.id, replyId));
      if (!parent) {
        return res.status(400).json({ error: 'Reply target not found on this post' });
      }
      parentComment = parent;
    }
    const newComment = await db.insert(comments).values({
      id: generateId('comment'),
      postId: targetPost.id,
      authorId,
      isAnonymous: anonymous,
      replyToId: parentComment?.id ?? null,
      content: normalizedContent,
    }).returning();
    bust('bootstrap');
    // Notify post author + all previous commenters on this post
    const [commenter, mentionCandidates] = await Promise.all([
      db.select().from(users).where(eq(users.id, authorId)),
       db.select({
         id: users.id,
         fullName: users.fullName,
         email: users.email,
         isSuspended: users.isSuspended,
       }).from(users),
    ]);
    const post = [targetPost];
    const existingComments = (
      (await loadPostEngagement([targetPost.id])).get(targetPost.id)?.comments || []
    ) as typeof comments.$inferSelect[];
    if (commenter.length) {
      const commenterName = anonymous ? anonymousAlias(authorId) : commenter[0].fullName;
       const community = post[0].communityId
         ? (await db.select().from(communities).where(eq(communities.id, post[0].communityId)))[0]
         : undefined;
       const communityMemberIds = community && Array.isArray(community.memberIds)
         ? [...new Set((community.memberIds as string[]).filter(id => id !== authorId))]
         : [];
       const broadcastMention = Boolean(
         community && !anonymous && hasBroadcastMention(normalizedContent),
       );
      const mentionedUserIds = new Set(
         broadcastMention
           ? communityMemberIds
           : anonymous ? [] : extractMentionedUserIds(normalizedContent, mentionCandidates),
      );

      const replyTargetId = parentComment?.authorId;
      if (
        replyTargetId &&
        replyTargetId !== authorId &&
        !mentionedUserIds.has(replyTargetId)
      ) {
        const body = `${commenterName} replied to your comment [[post:${post[0].id}]]${post[0].communityId ? ` [[community:${post[0].communityId}]]` : ''}`;
        const notification = await createNotification(replyTargetId, authorId, 'reply', '💬 Reply to your comment', body);
        await dispatchPush(replyTargetId, {
          title: '💬 Reply to your comment',
          body: `${commenterName} replied to your comment`,
          icon: '/icons/icon-192x192.png',
          tag: `reply-${req.params.id}-${parentComment?.id ?? 'comment'}`,
          view: post[0].communityId ? 'communities' : 'feed',
          data: post[0].communityId
            ? { communityId: post[0].communityId, postId: post[0].id }
            : { postId: post[0].id },
        });
        const replyRecipient = mentionCandidates.find(candidate => candidate.id === replyTargetId);
        await sendImmediateActivityEmail({
          recipient: replyRecipient || {},
          subject: `${commenterName} replied to your comment`,
          title: `${commenterName} replied to your comment`,
          body: `${commenterName} replied to your comment:\n\n${normalizedContent}`,
          view: post[0].communityId ? 'communities' : 'feed',
          params: post[0].communityId
            ? { communityId: post[0].communityId, postId: post[0].id, focus: 'comment' }
            : { postId: post[0].id, focus: 'comment' },
        });
      }

       if (broadcastMention && community) {
         await sendCommunityPostActivityEmail({
           recipientEmails: mentionCandidates
             .filter(candidate => communityMemberIds.includes(candidate.id) && !candidate.isSuspended)
             .map(candidate => candidate.email),
           subject: `${commenterName} mentioned everyone in ${community.name}`,
           title: `${commenterName} mentioned everyone`,
           body: `${commenterName} mentioned everyone in ${community.name}:\n\n${normalizedContent}`,
           view: 'communities',
           params: { communityId: community.id, postId: post[0].id, focus: 'comment' },
           context: 'community-wide comment mention email',
         });
       }

       // A direct @mention takes priority over the generic comment notification.
      for (const userId of mentionedUserIds) {
        if (userId === authorId) continue;
         const mentionTitle = broadcastMention
           ? `🔔 ${commenterName} mentioned everyone`
           : '🔔 You were mentioned';
         const body = `${commenterName} ${broadcastMention ? 'mentioned everyone' : 'mentioned you'} in a reply [[post:${post[0].id}]]${post[0].communityId ? ` [[community:${post[0].communityId}]]` : ''}`;
         const notification = await createNotification(userId, authorId, 'mention', mentionTitle, body);
        await dispatchPush(userId, {
           title: mentionTitle,
           body: `${commenterName} ${broadcastMention ? 'mentioned everyone' : 'mentioned you'} in a reply`,
          icon: '/icons/icon-192x192.png',
          tag: `mention-${req.params.id}-${userId}`,
          view: post[0].communityId ? 'communities' : 'feed',
          data: post[0].communityId
            ? { communityId: post[0].communityId, postId: post[0].id }
            : { postId: post[0].id },
        });
         if (!broadcastMention) {
           const mentionedUser = mentionCandidates.find(candidate => candidate.id === userId);
           await sendImmediateActivityEmail({
             recipient: mentionedUser || {},
             subject: `${commenterName} mentioned you`,
             title: `${commenterName} mentioned you`,
             body: `${commenterName} mentioned you in a post:\n\n${normalizedContent}`,
             view: post[0].communityId ? 'communities' : 'feed',
             params: post[0].communityId
               ? { communityId: post[0].communityId, postId: post[0].id, focus: 'comment' }
               : { postId: post[0].id, focus: 'comment' },
           });
         }
      }

      // Collect unique people to notify: post author + prior commenters, excluding the commenter themselves
      const toNotify = getCommentNotificationRecipients(
        post[0].authorId,
        authorId,
        existingComments.map(comment => comment.authorId),
        mentionedUserIds,
      );
      for (const userId of toNotify) {
        const isAuthor = userId === post[0].authorId;
        const title = '💬 New Comment';
        const message = isAuthor
          ? `${commenterName} commented on your post`
          : `${commenterName} also commented on a post you're in`;
        const body = `${message} [[post:${post[0].id}]]${post[0].communityId ? ` [[community:${post[0].communityId}]]` : ''}`;
        const notification = await createNotification(userId, authorId, 'comment', title, body);
         await dispatchPush(userId, {
          title,
          body: message,
          icon: '/icons/icon-192x192.png',
          tag: `comment-${req.params.id}`,
          view: post[0].communityId ? 'communities' : 'feed',
          data: post[0].communityId
            ? { communityId: post[0].communityId, postId: post[0].id }
            : { userId: authorId },
        });
        const commentRecipient = mentionCandidates.find(candidate => candidate.id === userId);
        await sendImmediateActivityEmail({
          recipient: commentRecipient || {},
          subject: `${commenterName} commented on a post`,
          title: message,
          body: `${message}:\n\n${normalizedContent}`,
          view: post[0].communityId ? 'communities' : 'feed',
          params: post[0].communityId
            ? { communityId: post[0].communityId, postId: post[0].id, focus: 'comment' }
            : { postId: post[0].id, focus: 'comment' },
        });
      }
    }
    return res.json({ ...newComment[0], createdAt: newComment[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── CONNECTIONS ─────────────────────────────────────────────────────────────

app.get('/api/connections', async (req, res) => {
  try {
    const viewerId = (req as any).authUser.id as string;
    const all = await db.select().from(connections)
      .where(or(eq(connections.senderId, viewerId), eq(connections.receiverId, viewerId)))
      .orderBy(desc(connections.createdAt));
    return res.json(all.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/connections', async (req, res) => {
  try {
    const { senderId, receiverId, type, message } = req.body;
    const authenticatedUserId = (req as any).authUser.id as string;
    if (senderId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Connection requests can only be sent from your signed-in account.' });
    }
    if (typeof receiverId !== 'string' || !receiverId || receiverId === senderId) {
      return res.status(400).json({ error: 'Choose another account to connect with.' });
    }
    if (await hasBlockBetween(senderId, receiverId)) {
      return res.status(403).json({ error: 'This account is unavailable.' });
    }
    const existing = await db.select().from(connections).where(and(
      eq(connections.senderId, senderId),
      eq(connections.receiverId, receiverId),
      or(eq(connections.status, 'pending'), eq(connections.status, 'accepted')),
    ));
    if (existing.length > 0) {
      return res.json({ ...existing[0], createdAt: existing[0].createdAt.toISOString() });
    }
    const newConn = await db.insert(connections).values({
      id: generateId('conn'),
      senderId, receiverId, type, message: message || '',
      status: 'pending',
    }).returning();
    bust('bootstrap');
    const sender = await db.select().from(users).where(eq(users.id, senderId));
    if (sender.length) {
       await dispatchPush(receiverId, {
        title: '🤝 Connection Request',
        body: `${sender[0].fullName} wants to connect with you`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `conn-${senderId}`,
        view: 'dashboard',
        type: 'connection_request',
        senderAvatar: sender[0].avatar || null,
        data: { connectionId: newConn[0].id, userId: senderId },
      });
      await createNotification(receiverId, senderId, 'connection_request', '🤝 Connection Request', `${sender[0].fullName} wants to connect with you`);
    }
    return res.json({ ...newConn[0], createdAt: newConn[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/connections/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const authenticatedUserId = (req as any).authUser.id as string;
    const found = await db.select().from(connections).where(eq(connections.id, req.params.id));
    if (!found.length || found[0].receiverId !== authenticatedUserId) {
      return res.status(404).json({ error: 'Connection request not found.' });
    }
    if (await hasBlockBetween(found[0].senderId, found[0].receiverId)) {
      return res.status(403).json({ error: 'This account is unavailable.' });
    }
    if (status !== 'accepted' && status !== 'rejected') {
      return res.status(400).json({ error: 'Choose a valid connection status.' });
    }
    const updated = await db.update(connections).set({ status }).where(eq(connections.id, req.params.id)).returning();
    bust('bootstrap');
    // Notify sender when accepted
    if (status === 'accepted' && found.length) {
      const receiver = await db.select().from(users).where(eq(users.id, found[0].receiverId));
      if (receiver.length) {
        await createNotification(found[0].senderId, found[0].receiverId, 'connection_accepted', '✅ Connection Accepted', `${receiver[0].fullName} accepted your connection request`);
         await dispatchPush(found[0].senderId, {
          title: '✅ Connection Accepted',
          body: `${receiver[0].fullName} accepted your connection request`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `conn-accepted-${found[0].receiverId}`,
          view: 'explore',
          type: 'connection_accepted',
          senderAvatar: receiver[0].avatar || null,
          data: { userId: found[0].receiverId },
        });
      }
    }
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── MESSAGES ────────────────────────────────────────────────────────────────

const CHAT_HISTORY_PAGE_SIZE = 50;
const MAX_CHAT_CONTENT_LENGTH = 5_000;

function chatPageLimit(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed)
    ? Math.max(1, Math.min(100, parsed))
    : CHAT_HISTORY_PAGE_SIZE;
}

function authenticatedChatUserId(req: express.Request): string | null {
  const userId = (req as any).authUser?.id;
  return typeof userId === 'string' && userId ? userId : null;
}

type DirectMessagePermission = 'everyone' | 'connections' | 'nobody';

function isDirectMessagePermission(value: unknown): value is DirectMessagePermission {
  return value === 'everyone' || value === 'connections' || value === 'nobody';
}

async function hasBlockBetween(firstUserId: string, secondUserId: string): Promise<boolean> {
  const [block] = await db.select({ blockerId: userBlocks.blockerId })
    .from(userBlocks)
    .where(or(
      and(eq(userBlocks.blockerId, firstUserId), eq(userBlocks.blockedUserId, secondUserId)),
      and(eq(userBlocks.blockerId, secondUserId), eq(userBlocks.blockedUserId, firstUserId)),
    ))
    .limit(1);
  return Boolean(block);
}

async function directMessageDenial(receiverId: string, senderId: string): Promise<string | null> {
  if (await hasBlockBetween(senderId, receiverId)) {
    return 'This conversation is unavailable.';
  }
  const [receiver] = await db.select({ privacySettings: users.privacySettings })
    .from(users)
    .where(eq(users.id, receiverId))
    .limit(1);
  const settings = receiver?.privacySettings;
  const preference = settings && typeof settings === 'object'
    ? (settings as Record<string, unknown>).directMessages
    : undefined;
  const permission: DirectMessagePermission = isDirectMessagePermission(preference)
    ? preference
    : 'connections';
  if (permission === 'nobody') return 'This user is not accepting direct messages.';
  if (permission === 'connections') {
    const [connection] = await db.select({ id: connections.id })
      .from(connections)
      .where(and(
        eq(connections.status, 'accepted'),
        or(
          and(eq(connections.senderId, senderId), eq(connections.receiverId, receiverId)),
          and(eq(connections.senderId, receiverId), eq(connections.receiverId, senderId)),
        ),
      ))
      .limit(1);
    if (!connection) return 'Connect with this user before sending a direct message.';
  }
  return null;
}

app.get('/api/safety/settings', async (req, res) => {
  try {
    const userId = (req as any).authUser.id as string;
    const [user] = await db.select({ privacySettings: users.privacySettings })
      .from(users).where(eq(users.id, userId)).limit(1);
    const raw = user?.privacySettings;
    const settings = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const directMessages = isDirectMessagePermission(settings.directMessages)
      ? settings.directMessages
      : 'connections';
    return res.json({ directMessages });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/safety/settings', async (req, res) => {
  try {
    const userId = (req as any).authUser.id as string;
    const { directMessages } = req.body;
    if (!isDirectMessagePermission(directMessages)) {
      return res.status(400).json({ error: 'Choose a valid direct message permission.' });
    }
    const { rows } = await pool.query(
      `UPDATE users
       SET privacy_settings = COALESCE(privacy_settings, '{}'::jsonb) || jsonb_build_object('directMessages', $1::text)
       WHERE id = $2
       RETURNING privacy_settings`,
      [directMessages, userId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Account not found.' });
    bust('bootstrap');
    return res.json({ directMessages });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/safety/blocks', async (req, res) => {
  try {
    const userId = (req as any).authUser.id as string;
    const blockedUsers = await db.select({
      id: users.id,
      name: users.fullName,
      avatar: users.avatar,
      college: users.college,
    })
      .from(userBlocks)
      .innerJoin(users, eq(users.id, userBlocks.blockedUserId))
      .where(eq(userBlocks.blockerId, userId))
      .orderBy(desc(userBlocks.createdAt));
    return res.json(blockedUsers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/safety/blocks', async (req, res) => {
  try {
    const userId = (req as any).authUser.id as string;
    const blockedUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    if (!blockedUserId || blockedUserId === userId) {
      return res.status(400).json({ error: 'Choose another account to block.' });
    }
    const [target] = await db.select({ id: users.id }).from(users)
      .where(eq(users.id, blockedUserId)).limit(1);
    if (!target) return res.status(404).json({ error: 'Account not found.' });
    await db.insert(userBlocks).values({ blockerId: userId, blockedUserId })
      .onConflictDoNothing();
    await db.delete(connections).where(or(
      and(eq(connections.senderId, userId), eq(connections.receiverId, blockedUserId)),
      and(eq(connections.senderId, blockedUserId), eq(connections.receiverId, userId)),
    ));
    bust('bootstrap');
    return res.json({ blockedUserId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/safety/blocks/:userId', async (req, res) => {
  try {
    const userId = (req as any).authUser.id as string;
    const blockedUserId = typeof req.params.userId === 'string' ? req.params.userId : '';
    const removed = await db.delete(userBlocks).where(and(
      eq(userBlocks.blockerId, userId),
      eq(userBlocks.blockedUserId, blockedUserId),
    )).returning({ blockedUserId: userBlocks.blockedUserId });
    if (!removed.length) return res.status(404).json({ error: 'Blocked account not found.' });
    bust('bootstrap');
    return res.json({ blockedUserId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function idempotentChatMessageId(prefix: string, conversationId: string, senderId: string, clientMessageId: string): string {
  const digest = crypto.createHash('sha256')
    .update(`${conversationId}\u0000${senderId}\u0000${clientMessageId}`)
    .digest('hex');
  return `${prefix}-${digest}`;
}

app.get('/api/messages', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to view messages.' });
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: 'You can only view your own messages.' });
    }
    const peerId = typeof req.query.peerId === 'string' ? req.query.peerId : '';
    const beforeId = typeof req.query.beforeId === 'string' ? req.query.beforeId : '';
    const limit = chatPageLimit(req.query.limit);
    const afterValue = typeof req.query.after === 'string' ? req.query.after : '';
    const afterDate = afterValue ? new Date(afterValue) : null;
    if (afterValue && (!afterDate || Number.isNaN(afterDate.getTime()))) {
      return res.status(400).json({ error: 'Invalid message history cursor.' });
    }

    if (peerId) {
      if (peerId === authenticatedUserId) return res.status(400).json({ error: 'A conversation needs another participant.' });
      if (await hasBlockBetween(authenticatedUserId, peerId)) {
        return res.status(403).json({ error: 'This conversation is unavailable.' });
      }
      const threadFilter = or(
        and(eq(messages.senderId, authenticatedUserId), eq(messages.receiverId, peerId)),
        and(eq(messages.senderId, peerId), eq(messages.receiverId, authenticatedUserId)),
      );
      let cursorFilter: ReturnType<typeof and> | undefined;
      if (beforeId) {
        const [cursor] = await db.select({
          id: messages.id,
          createdAt: messages.createdAt,
        }).from(messages).where(and(eq(messages.id, beforeId), threadFilter)).limit(1);
        if (!cursor) return res.status(400).json({ error: 'Invalid message history cursor.' });
        cursorFilter = or(
          lt(messages.createdAt, cursor.createdAt),
          and(eq(messages.createdAt, cursor.createdAt), lt(messages.id, cursor.id)),
        );
      }
      const where = cursorFilter ? and(threadFilter, cursorFilter) : threadFilter;
      const page = await db.select().from(messages)
        .where(where)
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(limit);
      return res.json(page.reverse().map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
    }

    if (afterDate) {
      const page = await db.select().from(messages).where(and(
        or(eq(messages.senderId, authenticatedUserId), eq(messages.receiverId, authenticatedUserId)),
        gte(messages.createdAt, afterDate),
        sql`NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE (b.blocker_id = ${authenticatedUserId} AND b.blocked_user_id =
            CASE WHEN ${messages.senderId} = ${authenticatedUserId} THEN ${messages.receiverId} ELSE ${messages.senderId} END)
             OR (b.blocked_user_id = ${authenticatedUserId} AND b.blocker_id =
            CASE WHEN ${messages.senderId} = ${authenticatedUserId} THEN ${messages.receiverId} ELSE ${messages.senderId} END)
        )`,
      )).orderBy(messages.createdAt, messages.id);
      return res.json(page.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
    }

    // Keep every conversation discoverable while loading only its recent page.
    // Older pages are fetched on demand when the user scrolls to the top.
    const { rows } = await pool.query(
      `WITH ranked_messages AS (
         SELECT m.*,
           count(*) FILTER (
             WHERE m.receiver_id = $1 AND m.is_read = false
           ) OVER (
             PARTITION BY CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
           ) AS unread_count,
           row_number() OVER (
             PARTITION BY CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
             ORDER BY m.created_at DESC, m.id DESC
           ) AS conversation_rank
         FROM messages m
         WHERE (m.sender_id = $1 OR m.receiver_id = $1)
           AND NOT EXISTS (
             SELECT 1 FROM user_blocks b
             WHERE (b.blocker_id = $1 AND b.blocked_user_id =
               CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
                OR (b.blocked_user_id = $1 AND b.blocker_id =
               CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
           )
       )
       SELECT id, sender_id, receiver_id, content, attachment_name, attachment_data,
              attachment_mime_type, poll_options, poll_votes, reply_to_id, reactions,
              is_read, is_anonymous, anonymous_post_id, client_message_id, created_at,
              unread_count
       FROM ranked_messages
       WHERE conversation_rank <= $2
       ORDER BY created_at ASC, id ASC`,
      [authenticatedUserId, limit],
    );
    return res.json(rows.map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      attachmentName: row.attachment_name,
      attachmentData: row.attachment_data,
      attachmentMimeType: row.attachment_mime_type,
      pollOptions: row.poll_options,
      pollVotes: row.poll_votes,
      replyToId: row.reply_to_id,
      reactions: row.reactions,
      isRead: row.is_read,
      isAnonymous: row.is_anonymous,
      anonymousPostId: row.anonymous_post_id,
      clientMessageId: row.client_message_id,
      createdAt: new Date(row.created_at).toISOString(),
      unreadCount: Number(row.unread_count) || 0,
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/stream', async (req, res) => {
  const userId = (req as any).authUser.id as string;
  const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
  if (requestedUserId && requestedUserId !== userId) {
    return res.status(403).json({ error: 'You can only open your own message stream.' });
  }

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`event: ready\ndata: ${JSON.stringify({ userId })}\n\n`);
  (res as Response & { flush?: () => void }).flush?.();
  (res as Response & { flush?: () => void }).flush?.();

  const streams = directMessageStreams.get(userId) || new Set<Response>();
  streams.add(res);
  directMessageStreams.set(userId, streams);
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
      (res as Response & { flush?: () => void }).flush?.();
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);
  const cleanup = () => {
    clearInterval(heartbeat);
    streams.delete(res);
    if (!streams.size) directMessageStreams.delete(userId);
  };
  req.on('close', cleanup);
});

app.post('/api/messages', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to send messages.' });
    const {
      senderId,
      receiverId,
      content,
      attachmentName,
      attachmentData,
      attachmentMimeType,
      pollOptions,
      clientMessageId,
      replyToId,
    } = req.body;
    const normalizedContent = typeof content === 'string' ? content.trim() : '';
    if (senderId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Messages can only be sent from your signed-in account.' });
    }
    if (normalizedContent.length > MAX_CHAT_CONTENT_LENGTH) {
      return res.status(413).json({ error: `Messages must be ${MAX_CHAT_CONTENT_LENGTH} characters or fewer.` });
    }
    const normalizedPollOptions = Array.isArray(pollOptions)
      ? pollOptions.map((option: unknown) => String(option).trim()).filter(Boolean).slice(0, 6)
      : [];
    if (
      !senderId ||
      typeof receiverId !== 'string' ||
      !receiverId ||
      receiverId === senderId ||
      (!normalizedContent && !attachmentData && normalizedPollOptions.length < 2)
    ) {
      return res.status(400).json({ error: 'A message, attachment, poll, and another recipient are required.' });
    }
    const denial = await directMessageDenial(receiverId, senderId);
    if (denial) return res.status(403).json({ error: denial });
    if (typeof attachmentData === 'string' && attachmentData.length > 14_000_000) {
      return res.status(413).json({ error: 'Attachments must be 10 MB or smaller.' });
    }
    const normalizedReplyToId = typeof replyToId === 'string' ? replyToId.trim().slice(0, 160) : '';
    if (normalizedReplyToId) {
      const [replyTarget] = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
      }).from(messages).where(eq(messages.id, normalizedReplyToId));
      if (!replyTarget || !(
        (replyTarget.senderId === senderId && replyTarget.receiverId === receiverId)
        || (replyTarget.senderId === receiverId && replyTarget.receiverId === senderId)
      )) {
        return res.status(400).json({ error: 'The message you are replying to is not in this conversation.' });
      }
    }
    const normalizedClientMessageId = typeof clientMessageId === 'string'
      ? clientMessageId.trim().slice(0, 120)
      : '';
    if (normalizedClientMessageId) {
      const existing = await db.select().from(messages)
        .where(and(
          eq(messages.senderId, senderId),
          eq(messages.clientMessageId, normalizedClientMessageId),
        ))
        .limit(1);
      if (existing.length) {
        return res.json({ ...existing[0], createdAt: existing[0].createdAt.toISOString() });
      }
    }
    // Use the client id as part of the persisted primary key when supplied.
    // This closes the race where two identical requests arrive before either
    // one can observe the other's clientMessageId in the database.
    const persistedMessageId = normalizedClientMessageId
      ? `msg-${normalizedClientMessageId}`
      : generateId('msg');
    const newMsg = await db.insert(messages).values({
      id: persistedMessageId,
      senderId,
      receiverId,
      content: normalizedContent,
      attachmentName: typeof attachmentName === 'string' ? attachmentName.trim() || null : null,
      attachmentData: typeof attachmentData === 'string' ? attachmentData : null,
      attachmentMimeType: typeof attachmentMimeType === 'string' ? attachmentMimeType : null,
      pollOptions: normalizedPollOptions.length >= 2 ? normalizedPollOptions : null,
      pollVotes: normalizedPollOptions.length >= 2 ? {} : null,
      replyToId: normalizedReplyToId || null,
      isRead: false,
      clientMessageId: normalizedClientMessageId || null,
    }).onConflictDoNothing().returning();
    if (!newMsg.length && normalizedClientMessageId) {
      const existing = await db.select().from(messages)
        .where(and(
          eq(messages.senderId, senderId),
          eq(messages.clientMessageId, normalizedClientMessageId),
        ))
        .limit(1);
      if (existing.length) {
        return res.json({ ...existing[0], createdAt: existing[0].createdAt.toISOString() });
      }
    }
    if (!newMsg.length) return res.status(409).json({ error: 'Message could not be created.' });
    const savedMessage = { ...newMsg[0], createdAt: newMsg[0].createdAt.toISOString() };
    broadcastDirectMessage(savedMessage);
    // Keep notification delivery inside the request lifecycle. A fire-and-
    // forget task can be paused or dropped when a scaled backend finishes the
    // response and goes idle, which makes notifications arrive several minutes
    // late even though the message itself was already saved.
    try {
      const [sender, receiver] = await Promise.all([
        db.select().from(users).where(eq(users.id, senderId)),
        db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, receiverId)),
      ]);
      if (sender.length) {
        const notificationContent = normalizedContent || (
          normalizedPollOptions.length >= 2 ? `Poll: ${normalizedPollOptions[0]}` : `Shared ${attachmentName || 'a file'}`
        );
        const preview = notificationContent.length > 80 ? notificationContent.substring(0, 80) + '…' : notificationContent;
        try {
          await createNotification(receiverId, senderId, 'message', `💬 ${sender[0].fullName}`, preview);
        } catch {
          (req as any).log?.warn({ messageId: savedMessage.id }, 'Direct message notification could not be saved');
        }
        await dispatchPush(receiverId, {
          title: sender[0].fullName,
          body: preview,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `msg-${savedMessage.id}`,
          view: 'messages',
          type: 'message',
          senderAvatar: sender[0].avatar || null,
          data: { userId: senderId, senderId, receiverId, messageId: savedMessage.id },
        }).catch(() => {
          (req as any).log?.warn({ messageId: savedMessage.id }, 'Direct message push could not be delivered');
        });
        const directMessageEmail = sendDirectMessageEmail({
          recipient: receiver[0] || {},
          subject: `${sender[0].fullName} sent you a message`,
          title: `New message from ${sender[0].fullName}`,
          body: preview,
          params: { userId: senderId },
        }).catch((error) => logEmailFailure('direct message email background task', error));
        if (IS_VERCEL_RUNTIME) await directMessageEmail;
      }
    } catch {
      // The message is already durable. Notification-provider errors must not
      // make the sender retry it as a second message.
      (req as any).log?.warn({ messageId: savedMessage.id }, 'Direct message saved, but notification setup failed');
    }
    return res.json(savedMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/:id/poll-vote', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to vote.' });
    const { optionIndex } = req.body;
    const found = await db.select().from(messages).where(eq(messages.id, req.params.id));
    const message = found[0];
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (authenticatedUserId !== message.senderId && authenticatedUserId !== message.receiverId) {
      return res.status(403).json({ error: 'You are not part of this conversation.' });
    }
    if (await hasBlockBetween(message.senderId, message.receiverId)) {
      return res.status(403).json({ error: 'This conversation is unavailable.' });
    }
    const options = Array.isArray(message.pollOptions) ? message.pollOptions : [];
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ error: 'Invalid poll option.' });
    }
    const updated = await db.update(messages)
      .set({ pollVotes: { ...((message.pollVotes as Record<string, number>) || {}), [authenticatedUserId]: optionIndex } })
      .where(eq(messages.id, req.params.id))
      .returning();
    const savedMessage = { ...updated[0], createdAt: updated[0].createdAt.toISOString() };
    broadcastDirectMessage(savedMessage);
    return res.json(savedMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/:id/reaction', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to react.' });
    const { emoji } = req.body as { emoji?: string };
    if (!isChatReaction(emoji)) {
      return res.status(400).json({ error: 'Choose a supported reaction.' });
    }
    const [message] = await db.select().from(messages).where(eq(messages.id, req.params.id));
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (authenticatedUserId !== message.senderId && authenticatedUserId !== message.receiverId) {
      return res.status(403).json({ error: 'You are not part of this conversation.' });
    }
    if (await hasBlockBetween(message.senderId, message.receiverId)) {
      return res.status(403).json({ error: 'This conversation is unavailable.' });
    }
    const reactions = (message.reactions && typeof message.reactions === 'object'
      ? message.reactions
      : {}) as Record<string, unknown>;
    const users = Array.isArray(reactions[emoji])
      ? (reactions[emoji] as unknown[]).map(String)
      : [];
    const nextUsers = users.includes(authenticatedUserId)
      ? users.filter(id => id !== authenticatedUserId)
      : [...new Set([...users, authenticatedUserId])];
    const nextReactions = { ...reactions };
    if (nextUsers.length) nextReactions[emoji] = nextUsers;
    else delete nextReactions[emoji];
    const [updated] = await db.update(messages)
      .set({ reactions: nextReactions })
      .where(eq(messages.id, req.params.id))
      .returning();
    const savedMessage = { ...updated, createdAt: updated.createdAt.toISOString() };
    broadcastDirectMessage(savedMessage);
    return res.json(savedMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/anonymous', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to send messages.' });
    const { postId, senderId, content, attachmentName, attachmentData, attachmentMimeType, clientMessageId } = req.body;
    const normalizedContent = typeof content === 'string' ? content.trim() : '';
    if (senderId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Messages can only be sent from your signed-in account.' });
    }
    if (normalizedContent.length > MAX_CHAT_CONTENT_LENGTH) {
      return res.status(413).json({ error: `Messages must be ${MAX_CHAT_CONTENT_LENGTH} characters or fewer.` });
    }
    if (!postId || !senderId || (!normalizedContent && !attachmentData)) {
      return res.status(400).json({ error: 'A message or attachment is required.' });
    }
    if (typeof attachmentData === 'string' && attachmentData.length > 14_000_000) {
      return res.status(413).json({ error: 'Attachments must be 10 MB or smaller.' });
    }
    const foundPosts = await db.select().from(posts).where(eq(posts.id, postId));
    const targetPost = foundPosts[0];
    if (!targetPost || !targetPost.isAnonymous) {
      return res.status(400).json({ error: 'This post does not accept anonymous chats.' });
    }
    if (targetPost.authorId === senderId) {
      return res.status(400).json({ error: 'You cannot start an anonymous chat with yourself.' });
    }
    const denial = await directMessageDenial(targetPost.authorId, senderId);
    if (denial) return res.status(403).json({ error: denial });
    const normalizedClientMessageId = typeof clientMessageId === 'string'
      ? clientMessageId.trim().slice(0, 120)
      : '';
    if (normalizedClientMessageId) {
      const [existing] = await db.select().from(messages).where(and(
        eq(messages.senderId, senderId),
        eq(messages.clientMessageId, normalizedClientMessageId),
        eq(messages.anonymousPostId, postId),
      )).limit(1);
      if (existing) return res.json({ ...existing, createdAt: existing.createdAt.toISOString() });
    }
    const newMsg = await db.insert(messages).values({
      id: normalizedClientMessageId ? `anon-${normalizedClientMessageId}` : generateId('msg'),
      senderId,
      receiverId: targetPost.authorId,
      content: normalizedContent,
      attachmentName: typeof attachmentName === 'string' ? attachmentName.trim() || null : null,
      attachmentData: typeof attachmentData === 'string' ? attachmentData : null,
      attachmentMimeType: typeof attachmentMimeType === 'string' ? attachmentMimeType : null,
      isRead: false,
      isAnonymous: true,
      anonymousPostId: postId,
      clientMessageId: normalizedClientMessageId || null,
    }).onConflictDoNothing().returning();
    if (!newMsg.length && normalizedClientMessageId) {
      const [existing] = await db.select().from(messages).where(and(
        eq(messages.senderId, senderId),
        eq(messages.clientMessageId, normalizedClientMessageId),
        eq(messages.anonymousPostId, postId),
      )).limit(1);
      if (existing) return res.json({ ...existing, createdAt: existing.createdAt.toISOString() });
    }
    if (!newMsg.length) return res.status(409).json({ error: 'Message could not be created.' });
    const savedMessage = { ...newMsg[0], createdAt: newMsg[0].createdAt.toISOString() };
    broadcastDirectMessage(savedMessage);
    const preview = normalizedContent.length > 80 ? normalizedContent.substring(0, 80) + '…' : normalizedContent;
    const [receiver] = await db.select({ id: users.id, email: users.email })
      .from(users).where(eq(users.id, targetPost.authorId)).catch(() => []);
    const deliveryResults = await Promise.allSettled([
      createNotification(targetPost.authorId, senderId, 'message', '💬 Anonymous person', preview),
      dispatchPush(targetPost.authorId, {
        title: 'Anonymous person',
        body: preview,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `anonymous-msg-${newMsg[0].id}`,
        view: 'messages',
        type: 'message',
        data: { anonymousPostId: postId, receiverId: targetPost.authorId, messageId: savedMessage.id },
      }),
      sendActivityEmail({
        recipient: receiver || {},
        subject: 'Someone sent you an anonymous message',
        title: 'New anonymous message',
        body: preview,
        view: 'messages',
        params: { anonymousPostId: postId },
        context: 'anonymous message email',
      }),
    ]);
    if (deliveryResults.some(result => result.status === 'rejected')) {
      (req as any).log?.warn({ messageId: savedMessage.id }, 'Anonymous message saved, but some notifications could not be delivered');
    }
    return res.json(savedMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/messages/read', async (req, res) => {
  try {
    const receiverId = authenticatedChatUserId(req);
    if (!receiverId) return res.status(401).json({ error: 'Sign in to update read state.' });
    const senderId = typeof req.body.otherUserId === 'string' ? req.body.otherUserId : '';
    if (!senderId || senderId === receiverId) {
      return res.status(400).json({ error: 'A conversation participant is required.' });
    }
    if (await hasBlockBetween(receiverId, senderId)) {
      return res.status(403).json({ error: 'This conversation is unavailable.' });
    }
    const updated = await db.update(messages).set({ isRead: true })
      .where(and(
        eq(messages.receiverId, receiverId),
        eq(messages.senderId, senderId),
        eq(messages.isRead, false),
      ))
      .returning({ id: messages.id });
    if (updated.length) {
      const messageIds = updated.map(message => message.id);
      broadcastDirectEvent(senderId, {
        type: 'read_receipt',
        readerId: receiverId,
        messageIds,
      });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── COMMUNITIES ─────────────────────────────────────────────────────────────

async function syncOfficialCollegeMembership(userId: string, college: string | null | undefined) {
  const canonicalCollege = canonicalizeCollegeName(college);
  if (!canonicalCollege) return;
  const official = await db.select().from(communities).where(eq(communities.college, canonicalCollege));
  for (const community of official) {
    const memberIds = Array.isArray(community.memberIds) ? community.memberIds as string[] : [];
    if (!memberIds.includes(userId)) {
      await db.update(communities)
        .set({ memberIds: [...memberIds, userId] })
        .where(eq(communities.id, community.id));
    }
  }
}

async function syncAllOfficialCollegeMembership() {
  const [officialCommunities, allUsers] = await Promise.all([
    db.select().from(communities).where(eq(communities.category, 'College Community')),
    db.select({ id: users.id, college: users.college }).from(users),
  ]);

  for (const community of officialCommunities) {
    if (!community.college) continue;
    const canonicalCollege = canonicalizeCollegeName(community.college);
    const collegeMemberIds = allUsers
      .filter(user => canonicalizeCollegeName(user.college) === canonicalCollege)
      .map(user => user.id);
    const existingIds = Array.isArray(community.memberIds) ? community.memberIds as string[] : [];
    const memberIds = [...new Set([...existingIds, ...collegeMemberIds])];
    if (memberIds.length !== existingIds.length || memberIds.some((id, index) => id !== existingIds[index])) {
      await db.update(communities)
        .set({ memberIds })
        .where(eq(communities.id, community.id));
    }
  }
}

const JEE_COMMUNITY_ID = 'domain-jee-prep';

function isJeeAspirantProfile(user: {
  college?: string | null;
  branch?: string | null;
  aboutMe?: string | null;
  interests?: unknown;
  lookingFor?: unknown;
  isSuspended?: boolean | null;
}) {
  if (user.isSuspended) return false;

  const college = String(user.college || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const isJeeCoachingStudent = new Set([
    'vedantu',
    'pw',
    'physics wallah',
    'physics wallah (pw)',
  ]).has(college);

  const preparationText = [
    user.branch,
    user.aboutMe,
    ...(Array.isArray(user.interests) ? user.interests : []),
    ...(Array.isArray(user.lookingFor) ? user.lookingFor : []),
  ].filter(Boolean).join(' ');
  const explicitlyPreparingForJee = /\bjee\b|\bjoint entrance\b|engineering entrance/i.test(preparationText);

  return isJeeCoachingStudent || explicitlyPreparingForJee;
}

async function syncJeeAspirantsMembership() {
  const [communityRows, profileRows] = await Promise.all([
    db.select().from(communities).where(eq(communities.id, JEE_COMMUNITY_ID)),
    db.select({
      id: users.id,
      college: users.college,
      branch: users.branch,
      aboutMe: users.aboutMe,
      interests: users.interests,
      lookingFor: users.lookingFor,
      isSuspended: users.isSuspended,
    }).from(users),
  ]);

  const community = communityRows[0];
  if (!community) return;

  const matchingIds = profileRows
    .filter(isJeeAspirantProfile)
    .map(user => user.id);
  const existingIds = Array.isArray(community.memberIds) ? community.memberIds as string[] : [];
  const memberIds = [...new Set([...existingIds, ...matchingIds])];

  if (memberIds.length !== existingIds.length || memberIds.some((id, index) => id !== existingIds[index])) {
    await db.update(communities)
      .set({ memberIds })
      .where(eq(communities.id, JEE_COMMUNITY_ID));
    console.log(`[Community] JEE Aspirants membership synced: ${memberIds.length} members`);
  }
}

type AptitudeQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  source: string;
};

async function getAptitudeLeaderboard(examId: string) {
  const result = await pool.query<{
    user_id: string;
    full_name: string;
    avatar: string;
    college: string;
    score: number;
    max_marks: number;
    submitted_at: string;
    duration_seconds: number;
  }>(`
    SELECT DISTINCT ON (a.user_id)
      a.user_id,
      u.full_name,
      u.avatar,
      u.college,
      a.score,
      a.max_marks,
      a.submitted_at,
      GREATEST(0, EXTRACT(EPOCH FROM (a.submitted_at - a.started_at)))::integer AS duration_seconds
    FROM aptitude_attempts a
    INNER JOIN users u ON u.id = a.user_id
    WHERE a.exam_id = $1 AND a.status IN ('submitted', 'expired')
    ORDER BY a.user_id, a.score DESC, a.submitted_at ASC
  `, [examId]);

  return result.rows
    .sort((a, b) =>
      b.score - a.score ||
      a.duration_seconds - b.duration_seconds ||
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
    )
    .slice(0, 50)
    .map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      name: row.full_name,
      avatar: row.avatar,
      college: row.college,
      score: Number(row.score),
      maxMarks: Number(row.max_marks),
      percentage: Math.round((Number(row.score) / Math.max(1, Number(row.max_marks))) * 100),
      durationSeconds: Number(row.duration_seconds || 0),
      submittedAt: row.submitted_at,
    }));
}

function serializeAptitudeAttempt(attempt: any, exam: any) {
  return {
    attemptId: attempt.id,
    examId: exam.id,
    startedAt: new Date(attempt.startedAt).toISOString(),
    expiresAt: new Date(attempt.expiresAt).toISOString(),
    answers: attempt.answers && typeof attempt.answers === 'object' ? attempt.answers : {},
    durationSeconds: exam.durationSeconds,
    maxMarks: exam.maxMarks,
    questions: publicAptitudeQuestions((exam.questions || []) as AptitudeQuestion[]),
  };
}

app.get('/api/aptitude/exam', async (req, res) => {
  try {
    const exam = await ensureAptitudeExam();
    const leaderboard = await getAptitudeLeaderboard(exam.id);
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
    let activeAttempt = null;
    let bestAttempt = null;
    if (userId) {
      const activeRows = await db.select().from(aptitudeAttempts)
        .where(and(eq(aptitudeAttempts.examId, exam.id), eq(aptitudeAttempts.userId, userId), eq(aptitudeAttempts.status, 'in_progress')))
        .orderBy(desc(aptitudeAttempts.startedAt))
        .limit(1);
      activeAttempt = activeRows[0] ? serializeAptitudeAttempt(activeRows[0], exam) : null;
      const bestRows = await db.select().from(aptitudeAttempts)
        .where(and(eq(aptitudeAttempts.examId, exam.id), eq(aptitudeAttempts.userId, userId), or(eq(aptitudeAttempts.status, 'submitted'), eq(aptitudeAttempts.status, 'expired'))))
        .orderBy(desc(aptitudeAttempts.score), desc(aptitudeAttempts.submittedAt))
        .limit(1);
      bestAttempt = bestRows[0]
        ? {
            score: bestRows[0].score,
            maxMarks: bestRows[0].maxMarks,
            submittedAt: bestRows[0].submittedAt?.toISOString(),
            status: bestRows[0].status,
          }
        : null;
    }
    return res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationSeconds: exam.durationSeconds,
        maxMarks: exam.maxMarks,
        sourceNote: exam.sourceNote,
        questionCount: Array.isArray(exam.questions) ? exam.questions.length : 0,
      },
      activeAttempt,
      bestAttempt,
      leaderboard,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/aptitude/exam/start', async (req, res) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'Student not found' });
    const exam = await ensureAptitudeExam();
    const existing = await db.select().from(aptitudeAttempts)
      .where(and(eq(aptitudeAttempts.examId, exam.id), eq(aptitudeAttempts.userId, userId), eq(aptitudeAttempts.status, 'in_progress')))
      .orderBy(desc(aptitudeAttempts.startedAt))
      .limit(1);
    if (existing[0]) return res.json(serializeAptitudeAttempt(existing[0], exam));

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + exam.durationSeconds * 1000);
    const inserted = await db.insert(aptitudeAttempts).values({
      id: generateId('aptitude-attempt'),
      examId: exam.id,
      userId,
      startedAt,
      expiresAt,
      answers: {},
      score: 0,
      maxMarks: exam.maxMarks,
      status: 'in_progress',
    }).returning();
    return res.json(serializeAptitudeAttempt(inserted[0], exam));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/aptitude/exam/:attemptId/answers', async (req, res) => {
  try {
    const { userId, answers } = req.body as { userId?: string; answers?: Record<string, unknown> };
    if (!userId || !answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'userId and answers are required' });
    }
    const found = await db.select().from(aptitudeAttempts).where(eq(aptitudeAttempts.id, req.params.attemptId)).limit(1);
    const attempt = found[0];
    if (!attempt || attempt.userId !== userId) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'This attempt is already submitted.' });
    if (Date.now() >= new Date(attempt.expiresAt).getTime()) {
      return res.status(409).json({ error: 'Time is up. Submit the attempt to see your score.' });
    }
    const exam = await db.select().from(aptitudeExams).where(eq(aptitudeExams.id, attempt.examId)).limit(1);
    const allowedIds = new Set(((exam[0]?.questions || []) as AptitudeQuestion[]).map(question => question.id));
    const safeAnswers = Object.fromEntries(Object.entries(answers).filter(([id, value]) =>
      allowedIds.has(id) && (value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 3)),
    ));
    await db.update(aptitudeAttempts).set({ answers: safeAnswers }).where(eq(aptitudeAttempts.id, attempt.id));
    return res.json({ ok: true, answers: safeAnswers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/aptitude/exam/submit', async (req, res) => {
  try {
    const { attemptId, userId, answers } = req.body as { attemptId?: string; userId?: string; answers?: Record<string, unknown> };
    if (!attemptId || !userId || !answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'attemptId, userId and answers are required' });
    }
    const found = await db.select().from(aptitudeAttempts).where(eq(aptitudeAttempts.id, attemptId)).limit(1);
    const attempt = found[0];
    if (!attempt || attempt.userId !== userId) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'This attempt has already been submitted.' });
    const examRows = await db.select().from(aptitudeExams).where(eq(aptitudeExams.id, attempt.examId)).limit(1);
    const exam = examRows[0];
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const questions = (exam.questions || []) as AptitudeQuestion[];
    const safeAnswers = Object.fromEntries(Object.entries(answers).filter(([id, value]) =>
      questions.some(question => question.id === id) &&
      (value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 3)),
    ));
    const score = questions.reduce((total, question) =>
      total + (safeAnswers[question.id] === question.answerIndex ? 1 : 0), 0);
    const submittedAt = new Date();
    const expired = submittedAt.getTime() >= new Date(attempt.expiresAt).getTime();
    const updated = await db.update(aptitudeAttempts).set({
      answers: safeAnswers,
      score,
      submittedAt,
      status: expired ? 'expired' : 'submitted',
    }).where(eq(aptitudeAttempts.id, attempt.id)).returning();
    const leaderboard = await getAptitudeLeaderboard(exam.id);
    const result = leaderboard.find(entry => entry.userId === userId);
    return res.json({
      score,
      maxMarks: exam.maxMarks,
      correctCount: score,
      answeredCount: Object.values(safeAnswers).filter(value => value !== null).length,
      submittedAt: submittedAt.toISOString(),
      expired,
      leaderboard,
      rank: result?.rank ?? null,
      attemptId: updated[0]?.id || attempt.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/communities', async (_req, res) => {
  try {
    await Promise.all([
      ensureAptitudeCommunity(),
      syncAllOfficialCollegeMembership(),
      syncJeeAspirantsMembership(),
    ]);
    const all = await db.select().from(communities).orderBy(communities.createdAt);
    const normalized = await Promise.all(all.map(ensureCommunityHeadAdmin));
    return res.json(normalized.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Platform-admin-only duplicate community cleanup. Preview is deliberately
// read-only; the merge endpoint repeats all checks inside a transaction.
app.get('/api/admin/communities/merge-preview', async (req, res) => {
  const actorId = typeof req.query.actorId === 'string' ? req.query.actorId.trim() : '';
  const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId.trim() : '';
  const destinationId = typeof req.query.destinationId === 'string' ? req.query.destinationId.trim() : '';
  if (!(await isPlatformAdmin(actorId))) {
    return res.status(403).json({ error: 'Only platform admins can merge communities.' });
  }
  if (!sourceId || !destinationId || sourceId === destinationId) {
    return res.status(400).json({ error: 'Choose two different communities.' });
  }

  try {
    const [sourceResult, destinationResult] = await Promise.all([
      pool.query(`
        SELECT c.*, u.full_name AS creator_name
        FROM communities c LEFT JOIN users u ON u.id = c.creator_id
        WHERE c.id = $1
      `, [sourceId]),
      pool.query(`
        SELECT c.*, u.full_name AS creator_name
        FROM communities c LEFT JOIN users u ON u.id = c.creator_id
        WHERE c.id = $1
      `, [destinationId]),
    ]);
    const source = sourceResult.rows[0];
    const destination = destinationResult.rows[0];
    if (!source || !destination) return res.status(404).json({ error: 'Both communities must exist.' });

    const [sourceCounts, destinationCounts] = await Promise.all([
      getCommunityMergeCounts(pool, sourceId),
      getCommunityMergeCounts(pool, destinationId),
    ]);
    return res.json({
      source: {
        id: source.id,
        name: source.name,
        owner: communityMergeOwner(source),
        category: source.category,
        memberCount: Array.isArray(source.member_ids) ? source.member_ids.length : 0,
        adminCount: communityAdminIds({ creatorId: source.creator_id, adminIds: source.admin_ids }).length,
        blockedMemberCount: Array.isArray(source.blocked_member_ids) ? source.blocked_member_ids.length : 0,
        threadCount: Array.isArray(source.threads) ? source.threads.length : 0,
        resourceCount: Array.isArray(source.resources) ? source.resources.length : 0,
        pollCount: Array.isArray(source.polls) ? source.polls.length : 0,
        counts: sourceCounts,
      },
      destination: {
        id: destination.id,
        name: destination.name,
        owner: communityMergeOwner(destination),
        category: destination.category,
        memberCount: Array.isArray(destination.member_ids) ? destination.member_ids.length : 0,
        adminCount: communityAdminIds({ creatorId: destination.creator_id, adminIds: destination.admin_ids }).length,
        blockedMemberCount: Array.isArray(destination.blocked_member_ids) ? destination.blocked_member_ids.length : 0,
        threadCount: Array.isArray(destination.threads) ? destination.threads.length : 0,
        resourceCount: Array.isArray(destination.resources) ? destination.resources.length : 0,
        pollCount: Array.isArray(destination.polls) ? destination.polls.length : 0,
        counts: destinationCounts,
      },
      auditPlan: {
        actorId,
        sourceId,
        destinationId,
        message: 'A permanent audit record will be written in the same transaction as the merge.',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/community-merge-audits', async (req, res) => {
  const actorId = typeof req.query.actorId === 'string' ? req.query.actorId.trim() : '';
  if (!(await isPlatformAdmin(actorId))) {
    return res.status(403).json({ error: 'Only platform admins can view merge audits.' });
  }
  try {
    const result = await pool.query(`
      SELECT id, actor_id AS "actorId", source_id AS "sourceId", source_name AS "sourceName",
             destination_id AS "destinationId", destination_name AS "destinationName",
             summary, created_at AS "createdAt"
      FROM community_merge_audits
      ORDER BY created_at DESC
      LIMIT 20
    `);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/communities/merge', async (req, res) => {
  const { actorId, sourceId, destinationId, sourceName, destinationName, confirmText } = req.body || {};
  if (!(await isPlatformAdmin(actorId))) {
    return res.status(403).json({ error: 'Only platform admins can merge communities.' });
  }
  if (!sourceId || !destinationId || sourceId === destinationId) {
    return res.status(400).json({ error: 'Choose two different communities.' });
  }
  if (typeof confirmText !== 'string' || confirmText.trim() !== String(destinationName || '').trim()) {
    return res.status(400).json({ error: 'Type the destination community name exactly to confirm this merge.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(`
      SELECT c.*,
             (SELECT u.full_name FROM users u WHERE u.id = c.creator_id) AS creator_name
      FROM communities c
      WHERE c.id = ANY($1::text[])
      ORDER BY CASE WHEN c.id = $2 THEN 0 ELSE 1 END
      FOR UPDATE
    `, [[sourceId, destinationId], destinationId]);
    const source = locked.rows.find((row: any) => row.id === sourceId);
    const destination = locked.rows.find((row: any) => row.id === destinationId);
    if (!source || !destination) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Both communities must exist.' });
    }
    if (String(sourceName || '').trim() !== source.name || String(destinationName || '').trim() !== destination.name) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Community details changed. Refresh the preview before merging.' });
    }

    const sourceMembers = Array.isArray(source.member_ids) ? source.member_ids : [];
    const destinationMembers = Array.isArray(destination.member_ids) ? destination.member_ids : [];
    const blockedMemberIds = [...new Set([
      ...(Array.isArray(destination.blocked_member_ids) ? destination.blocked_member_ids : []),
      ...(Array.isArray(source.blocked_member_ids) ? source.blocked_member_ids : []),
    ])].filter((id): id is string => typeof id === 'string');
    const memberIds = [...new Set([...destinationMembers, ...sourceMembers])]
      .filter((id): id is string => typeof id === 'string' && !blockedMemberIds.includes(id));
    const adminIds = [...new Set([
      destination.creator_id,
      ...(Array.isArray(destination.admin_ids) ? destination.admin_ids : []),
      source.creator_id,
      ...(Array.isArray(source.admin_ids) ? source.admin_ids : []),
    ])].filter((id): id is string => typeof id === 'string' && id !== 'system');
    const sourceCounts = await getCommunityMergeCounts(client, sourceId);
    const destinationCounts = await getCommunityMergeCounts(client, destinationId);
    const mergedThreads = mergeJsonRecords(destination.threads, source.threads);
    const mergedResources = mergeJsonRecords(destination.resources, source.resources);
    const mergedPolls = mergeJsonRecords(destination.polls, source.polls);

    await client.query(`
      UPDATE communities
      SET member_ids = $1::jsonb,
          admin_ids = $2::jsonb,
          blocked_member_ids = $3::jsonb,
          threads = $4::jsonb,
          resources = $5::jsonb,
          polls = $6::jsonb
      WHERE id = $7
    `, [
      JSON.stringify(memberIds),
      JSON.stringify(adminIds),
      JSON.stringify(blockedMemberIds),
      JSON.stringify(mergedThreads),
      JSON.stringify(mergedResources),
      JSON.stringify(mergedPolls),
      destinationId,
    ]);

    await client.query('UPDATE posts SET community_id = $1 WHERE community_id = $2', [destinationId, sourceId]);
    await client.query(`
      DELETE FROM saved_items source_saved
      USING saved_items destination_saved
      WHERE source_saved.item_type = 'community'
        AND source_saved.item_id = $1
        AND destination_saved.item_type = 'community'
        AND destination_saved.item_id = $2
        AND source_saved.user_id = destination_saved.user_id
    `, [sourceId, destinationId]);
    await client.query(`
      UPDATE saved_items
      SET item_id = $1
      WHERE item_type = 'community' AND item_id = $2
    `, [destinationId, sourceId]);
    await client.query(`
      UPDATE group_messages
      SET group_id = $1
      WHERE group_id = $2
    `, [`community:${destinationId}`, `community:${sourceId}`]);
    await client.query(`
      UPDATE notifications
      SET body = REPLACE(body, $1, $2)
      WHERE body LIKE '%' || $1 || '%'
    `, [`[[community:${sourceId}]]`, `[[community:${destinationId}]]`]);

    const auditId = generateId('community-merge');
    const summary = {
      source: {
        id: sourceId,
        name: source.name,
        owner: communityMergeOwner(source),
        members: sourceMembers.length,
        admins: communityAdminIds({ creatorId: source.creator_id, adminIds: source.admin_ids }).length,
        blockedMembers: Array.isArray(source.blocked_member_ids) ? source.blocked_member_ids.length : 0,
        posts: Number(sourceCounts.posts || 0),
        comments: Number(sourceCounts.comments || 0),
        chatMessages: Number(sourceCounts.chatMessages || 0),
        savedCommunityLinks: Number(sourceCounts.savedCommunityLinks || 0),
        routingNotifications: Number(sourceCounts.routingNotifications || 0),
      },
      destination: {
        id: destinationId,
        name: destination.name,
        owner: communityMergeOwner(destination),
        membersBefore: destinationMembers.length,
        postsBefore: Number(destinationCounts.posts || 0),
        commentsBefore: Number(destinationCounts.comments || 0),
        chatMessagesBefore: Number(destinationCounts.chatMessages || 0),
      },
      result: {
        members: memberIds.length,
        admins: adminIds.length,
        blockedMembers: blockedMemberIds.length,
        threads: mergedThreads.length,
        resources: mergedResources.length,
        polls: mergedPolls.length,
        sourceRemoved: true,
      },
    };
    const auditResult = await client.query(`
      INSERT INTO community_merge_audits
        (id, actor_id, source_id, source_name, destination_id, destination_name, summary)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING id, actor_id AS "actorId", source_id AS "sourceId", source_name AS "sourceName",
                destination_id AS "destinationId", destination_name AS "destinationName",
                summary, created_at AS "createdAt"
    `, [auditId, actorId, sourceId, source.name, destinationId, destination.name, JSON.stringify(summary)]);

    await client.query('DELETE FROM communities WHERE id = $1', [sourceId]);
    await client.query('COMMIT');
    bust('bootstrap');
    return res.json({ ok: true, audit: auditResult.rows[0], destinationId });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/communities', async (req, res) => {
  try {
    const { name, description, icon, tags, category, creatorId, college } = req.body;
    const canonicalCollege = canonicalizeCollegeName(college);
    const normalizedCategory = category || 'General';
    if (normalizedCategory === 'College Community' && canonicalCollege) {
      const existingOfficial = await db.select().from(communities)
        .where(eq(communities.college, canonicalCollege));
      if (existingOfficial.length > 0) {
        await syncAllOfficialCollegeMembership();
        const refreshed = await db.select().from(communities)
          .where(eq(communities.id, existingOfficial[0].id));
        return res.json({ ...refreshed[0], createdAt: refreshed[0].createdAt.toISOString() });
      }
    }
    const newComm = await db.insert(communities).values({
      id: generateId('comm'),
      name, description,
      icon: icon || 'Users',
      memberIds: creatorId ? [creatorId] : [],
      tags: tags || [],
      category: normalizedCategory,
      threads: [],
      resources: [],
      college: canonicalCollege || null,
      creatorId: creatorId || null,
      adminIds: creatorId ? [creatorId] : [],
      blockedMemberIds: [],
    }).returning();
    return res.json({ ...newComm[0], createdAt: newComm[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/communities/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });
    const blockedIds = communityBlockedIds(found[0]);
    if (blockedIds.includes(userId)) {
      return res.status(403).json({ error: 'You are blocked from this community.' });
    }

    const member = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (!member.length) return res.status(404).json({ error: 'User not found' });

    const existingMemberIds = Array.isArray(found[0].memberIds) ? found[0].memberIds as string[] : [];
    const wasAlreadyMember = existingMemberIds.includes(userId);
    const memberIds = existingMemberIds.includes(userId)
      ? existingMemberIds
      : [...existingMemberIds, userId];
    const headId = communityHeadId(found[0]) || userId;
    const adminIds = [...new Set([
      headId,
      ...communityAdminIds(found[0]).filter((id) => id !== 'system'),
    ])];

    const updated = await db.update(communities)
      .set({ memberIds, creatorId: headId, adminIds })
      .where(eq(communities.id, req.params.id))
      .returning();

    if (!wasAlreadyMember) {
      const joinedUser = await db.select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, userId));
      const recipientIds = [...new Set(existingMemberIds)]
        .filter((memberId) => memberId && memberId !== userId && memberId !== 'system');

      if (joinedUser[0]) {
        const announcement = await db.insert(groupMessages).values({
          id: generateId('emsg'),
          groupId: `community:${found[0].id}`,
          senderId: userId,
          content: `👋 ${joinedUser[0].fullName} joined "${found[0].name}".`,
        }).returning();
        if (announcement[0]) {
          broadcastEntityMessage(`community:${found[0].id}`, {
            ...announcement[0],
            createdAt: announcement[0].createdAt.toISOString(),
          }, memberIds, true);
        }

        if (recipientIds.length > 0) {
          const title = '👋 New Community Member';
          const body = `${joinedUser[0].fullName} joined "${found[0].name}" [[community:${found[0].id}]]`;
          await Promise.all(recipientIds.map(async (recipientId) => {
            await createNotification(recipientId, userId, 'community_member_joined', title, body);
            await dispatchPush(recipientId, {
              title,
              body: `${joinedUser[0].fullName} joined "${found[0].name}"`,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              tag: `community-member-joined-${found[0].id}-${userId}`,
              view: 'communities',
              type: 'community_member_joined',
              data: { communityId: found[0].id, userId },
            });
          }));
        }
      }
    }

    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/communities/:id/invite', async (req, res) => {
  try {
    const { actorId, inviteUserIds } = req.body as { actorId?: string; inviteUserIds?: string[] };
    if (!actorId || !Array.isArray(inviteUserIds) || inviteUserIds.length === 0) {
      return res.status(400).json({ error: 'actorId and inviteUserIds are required' });
    }

    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });
    const community = found[0];
    const actor = await db.select({ id: users.id, fullName: users.fullName })
      .from(users).where(eq(users.id, actorId));
    if (!actor.length) return res.status(404).json({ error: 'Inviter not found' });

    const memberIds = Array.isArray(community.memberIds) ? community.memberIds as string[] : [];
    if (!memberIds.includes(actorId)) {
      return res.status(403).json({ error: 'Only community members can invite people' });
    }

    const uniqueInvitees = [...new Set(inviteUserIds)]
      .filter(id => id !== actorId && !memberIds.includes(id) && !communityBlockedIds(community).includes(id));
    if (uniqueInvitees.length === 0) return res.json({ invitedIds: [] });

    const validUsers = await db.select({ id: users.id })
      .from(users)
      .where(or(...uniqueInvitees.map(id => eq(users.id, id))));
    const validIds = validUsers.map(user => user.id);
    const body = `${actor[0].fullName} invited you to join "${community.name}" [[community:${community.id}]]`;

    await Promise.all(validIds.map(async userId => {
      await createNotification(userId, actorId, 'community_invite', '🤝 Community Invite', body);
       await dispatchPush(userId, {
        title: '🤝 Community Invite',
        body: `${actor[0].fullName} invited you to join "${community.name}"`,
        type: 'community_invite',
        view: 'communities',
        communityId: community.id,
        tag: `community-invite-${community.id}`,
      });
    }));

    return res.json({ invitedIds: validIds });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/communities/:id', async (req, res) => {
  try {
    const { actorId, memberIds, threads, resources, polls, name, description, tags, category } = req.body;
    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });
    const hasManagementChanges = [name, description, tags, category].some(value => value !== undefined);
    if (hasManagementChanges && !isCommunityAdmin(found[0], actorId) && !(await isPlatformAdmin(actorId))) {
      return res.status(403).json({ error: 'Only community admins can change community details.' });
    }
    const updated = await db.update(communities).set({
      memberIds: memberIds ?? found[0].memberIds,
      threads: threads ?? found[0].threads,
      resources: resources ?? found[0].resources,
      polls: polls ?? (found[0] as any).polls ?? [],
      name: name ?? found[0].name,
      description: description ?? found[0].description,
      tags: tags ?? found[0].tags,
      category: category ?? found[0].category,
    }).where(eq(communities.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/communities/:id/admins', async (req, res) => {
  try {
    const { actorId, userId } = req.body as { actorId?: string; userId?: string };
    if (!actorId || !userId) return res.status(400).json({ error: 'actorId and userId are required' });
    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });
    const community = found[0];
    if (!isCommunityAdmin(community, actorId) && !(await isPlatformAdmin(actorId))) {
      return res.status(403).json({ error: 'Only community admins can appoint admins.' });
    }
    const memberIds = Array.isArray(community.memberIds) ? community.memberIds as string[] : [];
    if (!memberIds.includes(userId)) return res.status(400).json({ error: 'Only community members can be appointed admins.' });
    if (communityBlockedIds(community).includes(userId)) return res.status(400).json({ error: 'Blocked members cannot be appointed admins.' });
    const adminIds = [...new Set([...communityAdminIds(community), userId])];
    const updated = await db.update(communities).set({ adminIds }).where(eq(communities.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/communities/:id/admins/:userId', async (req, res) => {
  try {
    const { actorId } = req.query as { actorId?: string };
    const userId = req.params.userId;
    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });
    const community = found[0];
    if (!isCommunityAdmin(community, actorId) && !(await isPlatformAdmin(actorId))) {
      return res.status(403).json({ error: 'Only community admins can remove admins.' });
    }
    if (community.creatorId === userId) return res.status(400).json({ error: 'The community creator must remain an admin.' });
    const adminIds = (Array.isArray(community.adminIds) ? community.adminIds as string[] : []).filter(id => id !== userId);
    const updated = await db.update(communities).set({ adminIds }).where(eq(communities.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/communities/:id/blocked-members', async (req, res) => {
  try {
    const { actorId, userId } = req.body as { actorId?: string; userId?: string };
    if (!actorId || !userId) return res.status(400).json({ error: 'actorId and userId are required' });
    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });
    const community = found[0];
    if (!isCommunityAdmin(community, actorId) && !(await isPlatformAdmin(actorId))) {
      return res.status(403).json({ error: 'Only community admins can block members.' });
    }
    if (userId === actorId || userId === community.creatorId) return res.status(400).json({ error: 'This member cannot be blocked.' });
    const blockedMemberIds = [...new Set([...communityBlockedIds(community), userId])];
    const memberIds = (Array.isArray(community.memberIds) ? community.memberIds as string[] : []).filter(id => id !== userId);
    const updated = await db.update(communities)
      .set({ blockedMemberIds, memberIds })
      .where(eq(communities.id, req.params.id))
      .returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/communities/:id/blocked-members/:userId', async (req, res) => {
  try {
    const { actorId } = req.query as { actorId?: string };
    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });
    const community = found[0];
    if (!isCommunityAdmin(community, actorId) && !(await isPlatformAdmin(actorId))) {
      return res.status(403).json({ error: 'Only community admins can unblock members.' });
    }
    const blockedMemberIds = communityBlockedIds(community).filter(id => id !== req.params.userId);
    const updated = await db.update(communities)
      .set({ blockedMemberIds })
      .where(eq(communities.id, req.params.id))
      .returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Poll vote — atomic update with server-side validation
app.post('/api/communities/:id/polls/:pollId/vote', async (req, res) => {
  try {
    const { userId, optionIndex } = req.body;
    if (!userId || optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({ error: 'userId and optionIndex are required' });
    }
    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });

    const comm = found[0];
    // Require voter to be a community member
    const memberIds: string[] = (comm.memberIds as string[]) ?? [];
    if (!memberIds.includes(userId)) {
      return res.status(403).json({ error: 'Must be a community member to vote' });
    }

    const currentPolls: any[] = (comm as any).polls ?? [];
    const poll = currentPolls.find((p: any) => p.id === req.params.pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // Validate option index is within bounds
    const idx = Number(optionIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }

    const updatedPolls = currentPolls.map((p: any) => {
      if (p.id !== req.params.pollId) return p;
      const votes = { ...(p.votes || {}) };
      votes[userId] = idx; // one vote per user; re-vote replaces previous choice
      return { ...p, votes };
    });
    const updated = await db.update(communities)
      .set({ polls: updatedPolls } as any)
      .where(eq(communities.id, req.params.id))
      .returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/communities/:id', async (req, res) => {
  try {
    const actorId = typeof req.query.actorId === 'string' ? req.query.actorId : '';
    const found = await db.select().from(communities).where(eq(communities.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Community not found' });
    const actor = actorId
      ? (await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, actorId)))[0]
      : undefined;
    if (!actor || (actor.role !== 'admin' && !isCommunityAdmin(found[0], actor.id))) {
      return res.status(403).json({ error: 'Only community admins can delete this community.' });
    }
    await db.delete(communities).where(eq(communities.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── CUSTOM COLLEGES (user-submitted institution names) ──────────────────────

app.get('/api/colleges/custom', async (_req, res) => {
  try {
    const rows = await db.select().from(customColleges).orderBy(desc(customColleges.createdAt));
    return res.json(rows.map(r => r.name));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PLATFORM COLLEGE DIRECTORY (used by signup/onboarding search) ───────────
// Include institutions already represented on the platform so users do not
// have to submit an existing college as a new custom entry.
app.get('/api/colleges/directory', async (_req, res) => {
  try {
    const raw = await db.execute(sql`
      SELECT name
      FROM (
        SELECT college AS name
        FROM users
        WHERE college IS NOT NULL AND BTRIM(college) <> '' AND is_suspended = false
        UNION
        SELECT college AS name
        FROM communities
        WHERE college IS NOT NULL AND BTRIM(college) <> ''
        UNION
        SELECT name
        FROM custom_colleges
        WHERE name IS NOT NULL AND BTRIM(name) <> ''
      ) AS platform_colleges
      ORDER BY LOWER(name)
    `);
    const rows: Array<{ name: string }> =
      Array.isArray(raw) ? raw : (raw as any).rows ?? [];
    return res.json(rows.map(row => row.name).filter(Boolean));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/colleges/custom', async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name too short' });
    const trimmed = canonicalizeCollegeName(name.trim()) || name.trim();
    // Upsert — ignore if already exists
    const existing = await db.select().from(customColleges).where(eq(customColleges.name, trimmed));
    if (existing.length > 0) return res.json({ name: existing[0].name, existing: true });
    const row = await db.insert(customColleges).values({
      id: `cc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
    }).returning();
    return res.json({ name: row[0].name, existing: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── COLLEGE COMMUNITIES (auto-seeded, one per registered college) ────────────

app.get('/api/college-communities', async (_req, res) => {
  try {
    // Distinct colleges + real student counts
    const allCollegeUsers = await db.select({ id: users.id, college: users.college }).from(users);
    const groupedColleges = new Map<string, { college: string; member_count: number }>();
    for (const user of allCollegeUsers) {
      const collegeName = canonicalizeCollegeName(user.college);
      if (!collegeName) continue;
      const current = groupedColleges.get(collegeName);
      if (current) current.member_count += 1;
      else groupedColleges.set(collegeName, { college: collegeName, member_count: 1 });
    }
    const colleges = [...groupedColleges.values()]
      .sort((a, b) => b.member_count - a.member_count || a.college.localeCompare(b.college));

    const result: any[] = [];
    for (const row of colleges) {
      const collegeName = row.college as string;
      const memberCount = Number(row.member_count);
      // Deterministic ID derived from college name
      const commId = `college-${collegeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

      let found = await db.select().from(communities).where(eq(communities.id, commId));

      if (found.length === 0) {
        const created = await db.insert(communities).values({
          id: commId,
          name: collegeName,
          description: `Official campus community for students of ${collegeName}. Connect with batchmates, share notes, find study partners, collaborate on projects, and stay updated on campus happenings.`,
          icon: 'GraduationCap',
          memberIds: [] as string[],
          tags: ['official', 'campus', 'college'] as string[],
          category: 'College Community',
          threads: [] as any[],
          resources: [] as any[],
          polls: [] as any[],
          college: collegeName,
          creatorId: 'system',
        }).returning();
        found = created;
      }

      const matchingUsers = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.college, collegeName));
      const memberIds = [...new Set([
        ...(Array.isArray(found[0].memberIds) ? found[0].memberIds as string[] : []),
        ...matchingUsers.map(user => user.id),
      ])];
      if (memberIds.length !== (Array.isArray(found[0].memberIds) ? found[0].memberIds.length : 0)) {
        const updated = await db.update(communities)
          .set({ memberIds })
          .where(eq(communities.id, commId))
          .returning();
        found = updated;
      }

      result.push({
        ...found[0],
        memberIds,
        createdAt: found[0].createdAt.toISOString(),
        realMemberCount: memberCount,
      });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── OFFICIAL COMPETITIONS (DEVPOST) ─────────────────────────────────────────
// Devpost publishes a structured public listing endpoint. Keep this server-side
// so the client does not depend on Devpost CORS behavior or scrape HTML pages.
app.get('/api/competitions', async (_req, res) => {
  try {
    const now = Date.now();
    if (devpostCompetitionsCache && devpostCompetitionsCache.expiresAt > now) {
      return res.json(devpostCompetitionsCache.data);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: globalThis.Response;
    try {
      response = await fetch('https://devpost.com/api/hackathons', {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'TheNetwork/1.0' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      throw new Error(`Devpost returned HTTP ${response.status}`);
    }

    const payload = await response.json() as { hackathons?: DevpostHackathon[] };
    if (!Array.isArray(payload.hackathons)) {
      throw new Error('Devpost returned an invalid hackathon feed');
    }

    const competitions = (payload.hackathons || [])
      .filter((item) => item.open_state === 'open' && officialHttpUrl(item.url))
      .map((item, index) => {
        const themes = (item.themes || [])
          .map((theme) => theme.name?.trim())
          .filter((theme): theme is string => Boolean(theme));
        const tags = [...new Set(['Hackathon', ...themes])];
        const inviteOnly = Boolean(item.invite_only);

        return {
          id: `devpost-${item.id}`,
          source: 'Devpost',
          title: item.title,
          organizer: item.organization_name || 'Devpost organizer',
          category: competitionCategory(themes),
          state: 'live',
          startsIn: 'Open for submissions',
          endsIn: item.time_left_to_submission || 'See official listing',
          dateLabel: item.submission_period_dates || 'See official listing',
          location: item.displayed_location?.location || 'See official listing',
          eligibility: inviteOnly
            ? item.eligibility_requirement_invite_only_description || 'Invite only'
            : 'See official listing',
          participationType: 'Teams',
          prize: stripHtml(item.prize_amount) || 'See official listing',
          participants: Number.isFinite(item.registrations_count) ? item.registrations_count : 0,
          teamSize: 'See official rules',
          description: 'Verified Devpost listing. Open the organiser page for the complete brief, rules, eligibility, and submission requirements.',
          tags,
          skills: themes,
          registrationLink: officialHttpUrl(item.url) as string,
          featured: Boolean(item.featured),
          accent: competitionAccent(index),
        };
      })
      .slice(0, 48);

    devpostCompetitionsCache = {
      expiresAt: now + 5 * 60 * 1000,
      data: competitions,
    };
    res.set('X-Competition-Source', 'Devpost');
    res.set('X-Competition-Fetched-At', new Date().toISOString());
    return res.json(competitions);
  } catch (err: any) {
    console.error('[Competitions] Devpost fetch failed:', err?.message || err);
    return res.status(502).json({
      error: 'Official competition listings are temporarily unavailable.',
      source: 'Devpost',
    });
  }
});

// ─── EVENTS ──────────────────────────────────────────────────────────────────

app.get('/api/workshops', async (req, res) => {
  const authUser = (req as any).authUser as { id: string } | undefined;
  if (!authUser?.id) return res.status(401).json({ error: 'Sign in with your Network account to view workshops.' });

  try {
    const result = await pool.query<{
      id: string;
      title: string;
      description: string;
      scheduled_date: string;
      venue: string;
      is_online: boolean;
      host_user_id: string;
      host_name: string;
      participant_count: number;
      registered: boolean;
      created_at: Date;
    }>(
      `SELECT w.id, w.title, w.description, w.scheduled_date, w.venue, w.is_online,
              w.host_user_id, u.full_name AS host_name,
              COUNT(r.id)::int AS participant_count,
              COALESCE(BOOL_OR(r.user_id = $1), FALSE) AS registered,
              w.created_at
       FROM hosted_workshops w
       INNER JOIN users u ON u.id = w.host_user_id
       LEFT JOIN workshop_registrations r ON r.workshop_id = w.id
       GROUP BY w.id, u.full_name
       ORDER BY w.created_at DESC`,
      [authUser.id],
    );
    return res.json({
      workshops: result.rows.map((workshop) => ({
        id: workshop.id,
        title: workshop.title,
        description: workshop.description,
        scheduledDate: workshop.scheduled_date,
        venue: workshop.venue,
        isOnline: workshop.is_online,
        isHost: workshop.host_user_id === authUser.id,
        hostName: workshop.host_name,
        participantCount: workshop.participant_count,
        registered: workshop.registered,
        createdAt: workshop.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Unable to load hosted workshops', error);
    return res.status(500).json({ error: 'Unable to load hosted workshops right now.' });
  }
});

app.post('/api/workshops', async (req, res) => {
  const authUser = (req as any).authUser as { id: string } | undefined;
  if (!authUser?.id) return res.status(401).json({ error: 'Sign in with your Network account to host a workshop.' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const scheduledDate = typeof req.body?.scheduledDate === 'string' ? req.body.scheduledDate.trim() : '';
  const venue = typeof req.body?.venue === 'string' ? req.body.venue.trim() : '';
  const isOnline = typeof req.body?.isOnline === 'boolean' ? req.body.isOnline : false;
  const parsedDate = scheduledDate
    ? new Date(`${scheduledDate}T00:00:00.000Z`)
    : null;
  const validDate = !scheduledDate || (
    /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) &&
    parsedDate !== null &&
    Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === scheduledDate
  );
  if (
    !title ||
    title.length > 120 ||
    !description ||
    description.length > 3000 ||
    venue.length > 160 ||
    !validDate ||
    (req.body?.isOnline !== undefined && typeof req.body.isOnline !== 'boolean')
  ) {
    return res.status(400).json({ error: 'Add a title (up to 120 characters) and description (up to 3,000 characters); use a valid date, and keep the location under 160 characters.' });
  }

  try {
    const host = await db.select({ name: users.fullName }).from(users).where(eq(users.id, authUser.id)).limit(1);
    if (!host.length) return res.status(401).json({ error: 'Your Network account could not be verified.' });
    const [created] = await db.insert(hostedWorkshops).values({
      id: generateId('wrk'),
      hostUserId: authUser.id,
      title,
      description,
      scheduledDate,
      venue,
      isOnline,
    }).returning();
    return res.status(201).json({
      id: created.id,
      title: created.title,
      description: created.description,
      scheduledDate: created.scheduledDate,
      venue: created.venue,
      isOnline: created.isOnline,
      isHost: true,
      hostName: host[0].name,
      participantCount: 0,
      registered: false,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Unable to create hosted workshop', error);
    return res.status(500).json({ error: 'Unable to create this workshop right now.' });
  }
});

async function findHostedWorkshop(id: string) {
  const hosted = await db.select({
    id: hostedWorkshops.id,
    hostUserId: hostedWorkshops.hostUserId,
  }).from(hostedWorkshops).where(eq(hostedWorkshops.id, id)).limit(1);
  return hosted[0];
}

app.get('/api/workshops/:id/registration', async (req, res) => {
  const authUser = (req as any).authUser as { id: string } | undefined;
  if (!authUser?.id) return res.status(401).json({ error: 'Sign in with your Network account to view registration.' });

  try {
    if (!(await findHostedWorkshop(req.params.id))) {
      return res.status(404).json({ error: 'Workshop not found.' });
    }
    const result = await pool.query<{ participant_count: number; registered: boolean | null }>(
      `SELECT COUNT(*)::int AS participant_count,
              BOOL_OR(user_id = $2) AS registered
       FROM workshop_registrations
       WHERE workshop_id = $1`,
      [req.params.id, authUser.id],
    );
    return res.json({
      registered: Boolean(result.rows[0]?.registered),
      participantCount: result.rows[0]?.participant_count ?? 0,
    });
  } catch (error) {
    console.error('Unable to load workshop registration status', error);
    return res.status(500).json({ error: 'Unable to load workshop registration right now.' });
  }
});

app.post('/api/workshops/:id/register', async (req, res) => {
  const authUser = (req as any).authUser as { id: string } | undefined;
  if (!authUser?.id) return res.status(401).json({ error: 'Sign in with your Network account to join this workshop.' });

  try {
    if (!(await findHostedWorkshop(req.params.id))) {
      return res.status(404).json({ error: 'Workshop not found.' });
    }
    await db.insert(workshopRegistrations).values({
      id: generateId('wreg'),
      workshopId: req.params.id,
      userId: authUser.id,
    }).onConflictDoNothing();
    const result = await pool.query<{ participant_count: number }>(
      'SELECT COUNT(*)::int AS participant_count FROM workshop_registrations WHERE workshop_id = $1',
      [req.params.id],
    );
    return res.json({ registered: true, participantCount: result.rows[0]?.participant_count ?? 0 });
  } catch (error) {
    console.error('Unable to register for workshop', error);
    return res.status(500).json({ error: 'Unable to complete workshop registration right now.' });
  }
});

app.get('/api/workshops/:id/participants', async (req, res) => {
  const authUser = (req as any).authUser as { id: string; role: string } | undefined;
  if (!authUser?.id) return res.status(401).json({ error: 'Sign in to continue.' });

  try {
    const workshop = await findHostedWorkshop(req.params.id);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found.' });
    }
    if (authUser.role !== 'admin' && workshop?.hostUserId !== authUser.id) {
      return res.status(403).json({ error: 'Only this workshop’s host or an admin can view participant details.' });
    }
    const participants = await db.select({
      networkId: users.id,
      name: users.fullName,
      email: users.email,
      college: users.college,
      schoolName: users.schoolName,
      branch: users.branch,
      year: users.year,
      registeredAt: workshopRegistrations.registeredAt,
    })
      .from(workshopRegistrations)
      .innerJoin(users, eq(users.id, workshopRegistrations.userId))
      .where(eq(workshopRegistrations.workshopId, req.params.id))
      .orderBy(desc(workshopRegistrations.registeredAt));
    return res.json({
      participants: participants.map((participant) => ({
        ...participant,
        registeredAt: participant.registeredAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Unable to load workshop participants', error);
    return res.status(500).json({ error: 'Unable to load participant details right now.' });
  }
});

app.get('/api/events', async (_req, res) => {
  try {
    const all = await db.select().from(events).orderBy(desc(events.createdAt));
    return res.json(all.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, description, category, date, time, venue, organizer, organizerId, college, maxSeats, isOnline, link } = req.body;
    const created = await db.insert(events).values({
      id: generateId('evt'),
      title, description,
      category: category || 'General',
      date, time: time || '',
      venue: venue || '',
      organizer: organizer || '',
      organizerId,
      college: college || '',
      registeredIds: [],
      maxSeats: maxSeats || null,
      isOnline: isOnline || false,
      link: link || '',
    }).returning();
    return res.json({ ...created[0], createdAt: created[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const found = await db.select().from(events).where(eq(events.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Event not found' });
    const { title, description, category, date, time, venue, organizer, college, maxSeats, isOnline, link } = req.body;
    const updated = await db.update(events).set({
      title: title ?? found[0].title,
      description: description ?? found[0].description,
      category: category ?? found[0].category,
      date: date ?? found[0].date,
      time: time ?? found[0].time,
      venue: venue ?? found[0].venue,
      organizer: organizer ?? found[0].organizer,
      college: college ?? found[0].college,
      maxSeats: maxSeats ?? found[0].maxSeats,
      isOnline: isOnline ?? found[0].isOnline,
      link: link ?? found[0].link,
    }).where(eq(events.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id/register', async (req, res) => {
  try {
    const { userId } = req.body;
    const found = await db.select().from(events).where(eq(events.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Event not found' });
    const ids = found[0].registeredIds as string[];
    if (!ids.includes(userId)) {
      const updated = await db.update(events).set({ registeredIds: [...ids, userId] }).where(eq(events.id, req.params.id)).returning();
      return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
    }
    return res.json({ ...found[0], createdAt: found[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id/unregister', async (req, res) => {
  try {
    const { userId } = req.body;
    const found = await db.select().from(events).where(eq(events.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Event not found' });
    const ids = (found[0].registeredIds as string[]).filter((id: string) => id !== userId);
    const updated = await db.update(events).set({ registeredIds: ids }).where(eq(events.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    await db.delete(events).where(eq(events.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── STORIES ─────────────────────────────────────────────────────────────────

app.get('/api/stories', async (_req, res) => {
  try {
    // Use raw SQL to fetch metadata + a boolean for image presence — avoids loading 32 MB of blobs
    const result = await pool.query<{
      id: string; author_id: string; content: string;
      viewed_by: unknown; reactions: unknown; created_at: Date; has_image: boolean;
    }>(
      `SELECT id, author_id, content, viewed_by, reactions, likes, created_at,
              (image IS NOT NULL AND image <> '') AS has_image
       FROM stories ORDER BY created_at DESC`
    );
    return res.json(result.rows.map(s => ({
      id: s.id,
      authorId: s.author_id,
      content: s.content,
      viewedBy: s.viewed_by,
      reactions: s.reactions,
      likes: Array.isArray((s as any).likes) ? (s as any).likes : [],
      createdAt: s.created_at.toISOString(),
      image: s.has_image ? `/api/stories/${s.id}/image` : null,
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Serve individual story image (binary) — browser caches this independently
app.get('/api/stories/:id/image', async (req, res) => {
  try {
    const found = await db.select({ image: stories.image }).from(stories).where(eq(stories.id, req.params.id));
    if (!found.length || !found[0].image) return res.status(404).send('Not found');
    const raw = found[0].image;
    if (!raw || raw.length < 5) return res.status(404).send('Not found');
    // Case 1: Standard data URL — data:<mime>;base64,<data>
    const dataMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataMatch) {
      res.setHeader('Content-Type', dataMatch[1]);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(dataMatch[2], 'base64'));
    }
    // Case 2: Malformed — URL prefix then embedded base64 (e.g. `https://...\"data:video/mp4;base64,...`)
    const embeddedMatch = raw.match(/data:([^;]+);base64,(.+)$/s);
    if (embeddedMatch) {
      res.setHeader('Content-Type', embeddedMatch[1]);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(embeddedMatch[2], 'base64'));
    }
    // Case 3: Plain external URL — redirect only if it's a reasonable URL length
    if (/^https?:\/\//.test(raw)) {
      if (raw.length > 2048) return res.status(404).send('Image not available');
      return res.redirect(302, raw);
    }
    return res.status(404).send('Image not available');
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/stories', async (req, res) => {
  try {
    const { authorId, content, image } = req.body;
    const newStory = await db.insert(stories).values({
      id: generateId('story'),
      authorId, content,
      image: image || null,
      viewedBy: [],
      reactions: {},
    }).returning();
    bust('bootstrap');
    return res.json({ ...newStory[0], createdAt: newStory[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/stories/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const found = await db.select().from(stories).where(eq(stories.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Story not found' });
    const story = found[0];
    const likesArr = Array.isArray(story.likes) ? (story.likes as string[]) : [];
    const isLiking = !likesArr.includes(userId);
    const newLikes = isLiking ? [...likesArr, userId] : likesArr.filter((id: string) => id !== userId);
    const updated = await db.update(stories).set({ likes: newLikes }).where(eq(stories.id, req.params.id)).returning();
    return res.json({
      ...updated[0],
      likes: newLikes,
      createdAt: updated[0].createdAt.toISOString(),
      image: story.image ? `/api/stories/${story.id}/image` : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/stories/:id/react', async (req, res) => {
  try {
    const { emoji } = req.body;
    const found = await db.select().from(stories).where(eq(stories.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Story not found' });
    const current = (found[0].reactions as Record<string, number>) || {};
    const updated = await db.update(stories).set({
      reactions: { ...current, [emoji]: (current[emoji] || 0) + 1 }
    }).where(eq(stories.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

app.get('/api/reports', async (req, res) => {
  try {
    const viewerId = (req as any).authUser.id as string;
    const all = await db.select().from(reports)
      .where((req as any).authUser.role === 'admin' ? undefined : eq(reports.reporterId, viewerId))
      .orderBy(desc(reports.createdAt));
    return res.json(all.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const reporterId = (req as any).authUser.id as string;
    const { reportedUserId, reason, description } = req.body;
    if (typeof reportedUserId !== 'string' || !reportedUserId || reportedUserId === reporterId || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'A reported account and reason are required.' });
    }
    if (reason.trim().length > 120 || (typeof description === 'string' && description.length > 2_000)) {
      return res.status(400).json({ error: 'The report details are too long.' });
    }
    const [target] = await db.select({ id: users.id }).from(users)
      .where(eq(users.id, reportedUserId)).limit(1);
    if (!target) return res.status(404).json({ error: 'Reported account not found.' });
    const newReport = await db.insert(reports).values({
      id: generateId('rep'),
      reporterId, reportedUserId,
      reason: reason.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      status: 'pending',
    }).returning();
    return res.json({ ...newReport[0], createdAt: newReport[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await db.update(reports).set({ status }).where(eq(reports.id, req.params.id)).returning();
    if (!updated.length) return res.status(404).json({ error: 'Report not found.' });
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── OTP CHALLENGES ──────────────────────────────────────────────────────────
function otpFailureMessage(status: Exclude<OtpConsumeStatus, 'ok'>): string {
  switch (status) {
    case 'expired':
      return 'OTP expired. Please request a new one.';
    case 'incorrect':
      return 'Incorrect OTP. Please try again.';
    case 'too_many_attempts':
      return 'Too many incorrect attempts. Please request a new code.';
    default:
      return 'No OTP requested for this email. Please request a new one.';
  }
}

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, purpose, data } = req.body as { email: string; purpose: 'register' | 'forgot-password'; data?: any };
    if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'Email is required' });
    const normalizedEmail = normalizeOtpEmail(email);

    // OTP is only for registration and password reset — never for login
    if (purpose === 'forgot-password') {
      const found = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (found.length === 0) return res.status(404).json({ error: 'No account found with this email' });
      if (found[0].isSuspended) {
        return res.status(403).json({ error: SUSPENSION_NOTICE, code: 'ACCOUNT_SUSPENDED' });
      }
    }
    if (purpose !== 'register' && purpose !== 'forgot-password') {
      return res.status(400).json({ error: 'Invalid OTP purpose' });
    }
    if (purpose === 'register') {
      const existing = await db.select({ isSuspended: users.isSuspended })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing[0]?.isSuspended) {
        return res.status(403).json({ error: SUSPENSION_NOTICE, code: 'ACCOUNT_SUSPENDED' });
      }
    }

    let challengeData: Record<string, unknown> = {};
    if (purpose === 'register') {
      const fullName = typeof data?.fullName === 'string' ? data.fullName.trim() : '';
      const password = typeof data?.password === 'string' ? data.password : '';
      if (!fullName || password.length < 8) {
        return res.status(400).json({ error: 'Please enter your name and a password of at least 8 characters.' });
      }
      challengeData = {
        fullName,
        passwordHash: await hashPassword(password),
        college: typeof data?.college === 'string' ? data.college.trim() : '',
        branch: typeof data?.branch === 'string' ? data.branch.trim() : '',
        degree: typeof data?.degree === 'string' ? data.degree.trim() : '',
        year: Number.isFinite(Number(data?.year)) && Number(data?.year) > 0 ? Number(data.year) : 1,
        avatar: typeof data?.avatar === 'string' ? data.avatar : '',
        ...(typeof data?.referralCode === 'string' && data.referralCode.trim()
          ? { referralCode: data.referralCode.trim() }
          : {}),
      };
    }

    const otp = generateOtpCode();
    const challenge = await storeOtpChallenge({
      email: normalizedEmail,
      purpose,
      otp,
      data: challengeData,
    });

    try {
      await sendBrevoEmail({
        to: normalizedEmail,
        subject: `Your OTP for The Network — ${otp}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 20px 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">The Network</h1>
              <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 12px;">Campus Co-founder Hub</p>
            </div>
            <div style="background: #f9f9fb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 32px 24px; text-align: center;">
              <p style="font-size: 14px; color: #374151; margin: 0 0 16px;">Your one-time verification code is:</p>
              <div style="background: white; border: 2px solid #6366f1; border-radius: 12px; padding: 16px 24px; display: inline-block; margin: 0 0 16px;">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #6366f1; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      // Never leave an OTP usable when the user did not receive it.
      await deleteOtpChallenge(challenge).catch(() => {
        console.error('[auth] undelivered OTP challenge cleanup failed');
      });
      return respondToEmailFailure(res, 'OTP delivery', error);
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[auth] send-otp failed code=unexpected');
    return res.status(500).json({ error: 'Unable to send verification code. Please try again shortly.' });
  }
});

app.post('/api/auth/send-email-change-otp', async (req, res) => {
  try {
    const { currentEmail, newEmail } = req.body as { currentEmail: string; newEmail: string };
    if (!currentEmail || !newEmail) return res.status(400).json({ error: 'Both current and new email are required' });
    const current = normalizeOtpEmail(currentEmail);
    const next = normalizeOtpEmail(newEmail);
    const found = await db.select().from(users).where(eq(users.email, current));
    if (found.length === 0) return res.status(404).json({ error: 'No account found with that institute email' });
    if (found[0].id !== (req as any).authUser.id) {
      return res.status(403).json({ error: 'You can only change the email on your own account.' });
    }
    if (found[0].isSuspended) return res.status(403).json({ error: 'Your account has been suspended.' });
    const taken = await db.select().from(users).where(eq(users.email, next));
    if (taken.length > 0) return res.status(409).json({ error: 'That email is already used by another account' });
    const otp = generateOtpCode();
    const challenge = await storeOtpChallenge({
      email: current,
      purpose: 'email-change',
      otp,
      data: { currentEmail: current, newEmail: next },
    });
    try {
      await sendBrevoEmail({
        to: next,
        subject: `Verify your new email for The Network — ${otp}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 20px 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">The Network</h1>
            </div>
            <div style="background: #f9f9fb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 32px 24px; text-align: center;">
              <p style="font-size: 14px; color: #374151; margin: 0 0 16px;">Your email change verification code is:</p>
              <div style="background: white; border: 2px solid #6366f1; border-radius: 12px; padding: 16px 24px; display: inline-block; margin: 0 0 16px;">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #6366f1; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">Expires in <strong>10 minutes</strong>. Do not share it.</p>
            </div>
          </div>`,
      });
    } catch (error) {
      await deleteOtpChallenge(challenge).catch(() => {
        console.error('[auth] undelivered email-change challenge cleanup failed');
      });
      return respondToEmailFailure(res, 'email change OTP delivery', error);
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[auth] send-email-change-otp failed code=unexpected');
    return res.status(500).json({ error: 'Unable to send verification code. Please try again shortly.' });
  }
});

app.post('/api/auth/confirm-email-change', async (req, res) => {
  try {
    const { currentEmail, otp } = req.body as { currentEmail: string; otp: string };
    if (typeof currentEmail !== 'string' || !currentEmail.trim() || typeof otp !== 'string' || !otp.trim()) {
      return res.status(400).json({ error: 'Current email and OTP are required' });
    }
    const current = normalizeOtpEmail(currentEmail);
    const authenticatedUser = await db.select({ email: users.email })
      .from(users)
      .where(eq(users.id, (req as any).authUser.id))
      .limit(1);
    if (!authenticatedUser.length || authenticatedUser[0].email !== current) {
      return res.status(403).json({ error: 'You can only change the email on your own account.' });
    }
    const result = await consumeOtpChallenge({ email: current, purpose: 'email-change', otp });
    if (result.status !== 'ok') return res.status(400).json({ error: otpFailureMessage(result.status) });
    const { newEmail } = result.data as { newEmail?: string };
    if (!newEmail) return res.status(400).json({ error: 'This email-change code is invalid. Please request a new one.' });
    const taken = await db.select({ id: users.id }).from(users).where(eq(users.email, newEmail)).limit(1);
    if (taken.length) return res.status(409).json({ error: 'That email is already used by another account' });
    const updated = await db.update(users).set({ email: newEmail }).where(eq(users.email, current)).returning();
    if (!updated.length) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, email: newEmail });
  } catch (err: any) {
    console.error('confirm-email-change error', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body as { email: string; otp: string; newPassword: string };
    if (typeof email !== 'string' || !email.trim() || typeof otp !== 'string' || !otp.trim() || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Email, OTP and new password are required' });
    }
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const key = normalizeOtpEmail(email);
    const result = await consumeOtpChallenge({ email: key, purpose: 'forgot-password', otp });
    if (result.status !== 'ok') return res.status(400).json({ error: otpFailureMessage(result.status) });
    const found = await db.select().from(users).where(eq(users.email, key));
    if (!found.length) return res.status(404).json({ error: 'User not found' });
    const updated = await db.update(users)
      .set({ passwordHash: await hashPassword(newPassword) })
      .where(eq(users.id, found[0].id))
      .returning();
    await pool.query(
      `UPDATE auth_sessions SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [found[0].id],
    );
    await sendPasswordSecurityNotice(updated[0]);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('reset-password error', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body as { email: string; otp: string };
    if (typeof email !== 'string' || !email.trim() || typeof otp !== 'string' || !otp.trim()) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    const key = normalizeOtpEmail(email);
    const existing = await db.select().from(users).where(eq(users.email, key));
    if (existing.length > 0) {
      if (existing[0].isSuspended) {
        return res.status(403).json({ error: SUSPENSION_NOTICE, code: 'ACCOUNT_SUSPENDED' });
      }
      return res.status(409).json({ error: 'Email already registered' });
    }

    const result = await consumeOtpChallenge({ email: key, purpose: 'register', otp });
    if (result.status !== 'ok') return res.status(400).json({ error: otpFailureMessage(result.status) });
    const d = result.data as {
      fullName: string;
      passwordHash: string;
      college?: string;
      branch?: string;
      degree?: string;
      year?: number;
      avatar?: string;
      referralCode?: string;
    };
    if (!d.fullName || !d.passwordHash) {
      return res.status(400).json({ error: 'Registration details are incomplete. Please request a new code.' });
    }

    const initials = d.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const newUserId = generateId('user');
    const newUser = await db.insert(users).values({
      id: newUserId,
      fullName: d.fullName,
       college: d.college || '',
       branch: d.branch || '',
      degree: d.degree ?? '',
      year: Number(d.year) || 1,
      email: key,
      passwordHash: d.passwordHash,
      avatar: d.avatar || initials,
      aboutMe: '',
      interests: [],
      skills: [],
      lookingFor: [],
      isVerified: true,
      isSuspended: false,
      role: key === PRIMARY_ADMIN_EMAIL ? 'admin' : 'student',
      privacySettings: { showEmail: true, onlyAllowVerifiedConnections: false, hideProfileFromSearch: false, directMessages: 'connections' },
    }).returning();
    const session = await createAuthSession(newUserId);
    // Credit referral if code was provided at registration
    if (d.referralCode) {
      try {
        const allU = await db.select({ id: users.id }).from(users);
        const referrer = allU.find((u: { id: string }) => u.id.slice(-8).toUpperCase() === String(d.referralCode).toUpperCase());
        if (referrer && referrer.id !== newUserId) {
          await db.insert(referrals).values({
            id: generateId('ref'),
            referrerId: referrer.id,
            referredUserId: newUserId,
          });
        }
      } catch (_) {}
    }
    const welcomeTitle = `Welcome to The Network, ${newUser[0].fullName}`;
    const welcomeBody = 'Your account is verified and ready. Start by exploring your campus feed and finding people to learn with.';
    await Promise.all([
      createNotification(newUserId, newUserId, 'welcome', welcomeTitle, welcomeBody, true),
      dispatchPush(newUserId, {
        title: '🎉 Welcome to The Network',
        body: 'Your account is verified. Explore your campus network and find your people.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `welcome-${newUserId}`,
        view: 'feed',
        type: 'welcome',
        data: { welcome: 'verified-signup' },
      }),
      sendImmediateSecurityEmail({
        recipient: newUser[0],
        subject: 'Welcome to The Network',
        title: welcomeTitle,
        body: welcomeBody,
        context: 'welcome email',
      }),
    ]);
    return res.json({ ...session, user: toUserProfile(newUser[0]) });
  } catch (err: any) {
    console.error('verify-otp error', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─── EMAIL ───────────────────────────────────────────────────────────────────

// ─── Session Tracking ─────────────────────────────────────────────────────────
app.post('/api/sessions/start', async (req, res) => {
  try {
    const { userId, userAgent = '' } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.execute(sql`
      INSERT INTO user_sessions (id, user_id, user_agent, started_at, last_heartbeat)
      VALUES (${sessionId}, ${userId}, ${userAgent}, now(), now())
    `);
    res.json({ sessionId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/:id/heartbeat', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`
      UPDATE user_sessions
      SET last_heartbeat = now(),
          duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::int
      WHERE id = ${id} AND ended_at IS NULL
    `);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`
      UPDATE user_sessions
      SET ended_at = now(),
          duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::int
      WHERE id = ${id} AND ended_at IS NULL
    `);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Online users (heartbeat within last 3 minutes) ──────────────────────────
app.get('/api/sessions/online', async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT DISTINCT user_id
      FROM user_sessions
      WHERE ended_at IS NULL AND last_heartbeat >= now() - interval '3 minutes'
    `);
    const raw = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
    return res.json(raw.map((r: any) => r.user_id));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Admin Analytics ──────────────────────────────────────────────────────────
app.get('/api/admin/analytics/overview', async (_req, res) => {
  try {
    const n = (row: any, key: string) => Number(row?.[key] ?? row?.rows?.[0]?.[key] ?? 0);

    const [
      totalUsers, activeToday, activeWeek, avgSession,
      totalSessions, totalPosts, totalConnections,
      newToday, newWeek, sessionsToday, sessionsWeek,
      timeTodayRow, liveNowRow,
    ] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM users`),
      db.execute(sql`SELECT COUNT(DISTINCT user_id) as cnt FROM user_sessions WHERE started_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`),
      db.execute(sql`SELECT COUNT(DISTINCT user_id) as cnt FROM user_sessions WHERE started_at >= now() - interval '7 days'`),
      db.execute(sql`SELECT COALESCE(AVG(duration_seconds), 0)::int as avg_sec FROM user_sessions WHERE duration_seconds > 0`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM user_sessions`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM posts`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM connections WHERE status = 'accepted'`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM users WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM users WHERE created_at >= now() - interval '7 days'`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM user_sessions WHERE started_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM user_sessions WHERE started_at >= now() - interval '7 days'`),
      db.execute(sql`SELECT COALESCE(SUM(duration_seconds), 0)::int as total_sec FROM user_sessions WHERE started_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM user_sessions WHERE ended_at IS NULL AND last_heartbeat >= now() - interval '2 minutes'`),
    ]);

    const topUsersRaw = await db.execute(sql`
      SELECT s.user_id, u.full_name, u.college,
             CASE
               WHEN u.avatar LIKE 'data:%'
                 OR (u.avatar NOT LIKE 'http%' AND length(u.avatar) > 200000)
               THEN '/api/users/' || u.id || '/avatar'
               ELSE u.avatar
             END AS avatar,
             COUNT(s.id)::int as session_count,
             COALESCE(SUM(s.duration_seconds), 0)::int as total_seconds,
             MAX(s.started_at) as last_seen
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      GROUP BY s.user_id, u.id, u.full_name, u.college, u.avatar
      ORDER BY total_seconds DESC
      LIMIT 10
    `);
    const topUsers: any[] = Array.isArray(topUsersRaw) ? topUsersRaw : (topUsersRaw as any).rows ?? [];

    const topUsersWeekRaw = await db.execute(sql`
      SELECT s.user_id, u.full_name, u.college,
             CASE
               WHEN u.avatar LIKE 'data:%'
                 OR (u.avatar NOT LIKE 'http%' AND length(u.avatar) > 200000)
               THEN '/api/users/' || u.id || '/avatar'
               ELSE u.avatar
             END AS avatar,
             COUNT(s.id)::int as session_count,
             COALESCE(SUM(s.duration_seconds), 0)::int as total_seconds
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.started_at >= now() - interval '7 days'
      GROUP BY s.user_id, u.id, u.full_name, u.college, u.avatar
      ORDER BY total_seconds DESC
      LIMIT 10
    `);
    const topUsersWeek: any[] = Array.isArray(topUsersWeekRaw) ? topUsersWeekRaw : (topUsersWeekRaw as any).rows ?? [];

    res.json({
      totalUsers: n(totalUsers, 'cnt'),
      activeToday: n(activeToday, 'cnt'),
      activeWeek: n(activeWeek, 'cnt'),
      avgSessionSeconds: n(avgSession, 'avg_sec'),
      totalSessions: n(totalSessions, 'cnt'),
      totalPosts: n(totalPosts, 'cnt'),
      totalConnections: n(totalConnections, 'cnt'),
      newToday: n(newToday, 'cnt'),
      newWeek: n(newWeek, 'cnt'),
      sessionsToday: n(sessionsToday, 'cnt'),
      sessionsWeek: n(sessionsWeek, 'cnt'),
      timeTodaySeconds: n(timeTodayRow, 'total_sec'),
      liveNow: n(liveNowRow, 'cnt'),
      topUsers,
      topUsersWeek,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/sessions', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const raw = await db.execute(sql`
      SELECT s.id, s.user_id, u.full_name, u.college,
             CASE
               WHEN u.avatar LIKE 'data:%'
                 OR (u.avatar NOT LIKE 'http%' AND length(u.avatar) > 200000)
               THEN '/api/users/' || u.id || '/avatar'
               ELSE u.avatar
             END AS avatar,
             s.started_at, s.ended_at, s.last_heartbeat,
             s.duration_seconds, s.page
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.started_at DESC
      LIMIT ${limit}
    `);
    const list = Array.isArray(raw) ? raw : (raw as any).rows ?? [];
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const raw = await db.execute(sql`
      SELECT id, started_at, ended_at, duration_seconds, page, last_heartbeat
      FROM user_sessions WHERE user_id = ${userId}
      ORDER BY started_at DESC LIMIT 50
    `);
    const list = Array.isArray(raw) ? raw : (raw as any).rows ?? [];
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/daily-active', async (_req, res) => {
  try {
    const raw = await db.execute(sql`
      SELECT date_trunc('day', started_at AT TIME ZONE 'Asia/Kolkata')::date as day,
             COUNT(DISTINCT user_id)::int as dau,
             COUNT(id)::int as sessions
      FROM user_sessions
      WHERE started_at >= now() - interval '30 days'
      GROUP BY 1 ORDER BY 1 ASC
    `);
    const list = Array.isArray(raw) ? raw : (raw as any).rows ?? [];
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/hourly-today', async (_req, res) => {
  try {
    const raw = await db.execute(sql`
      SELECT EXTRACT(HOUR FROM started_at AT TIME ZONE 'Asia/Kolkata')::int as hour,
             COUNT(DISTINCT user_id)::int as visitors,
             COUNT(id)::int as sessions,
             COALESCE(SUM(duration_seconds), 0)::int as total_seconds
      FROM user_sessions
      WHERE started_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
      GROUP BY 1 ORDER BY 1 ASC
    `);
    const list = Array.isArray(raw) ? raw : (raw as any).rows ?? [];
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/weekly-stats', async (_req, res) => {
  try {
    const [daysRaw, nuRaw, luRaw] = await Promise.all([
      db.execute(sql`
        SELECT date_trunc('day', started_at AT TIME ZONE 'Asia/Kolkata')::date as day,
               COUNT(DISTINCT user_id)::int as visitors,
               COUNT(id)::int as sessions,
               COALESCE(SUM(duration_seconds), 0)::int as total_seconds,
               COALESCE(AVG(NULLIF(duration_seconds,0)), 0)::int as avg_seconds
        FROM user_sessions
        WHERE started_at >= now() - interval '7 days'
        GROUP BY 1 ORDER BY 1 ASC
      `),
      db.execute(sql`
        SELECT date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata')::date as day,
               COUNT(*)::int as new_users
        FROM users
        WHERE created_at >= now() - interval '7 days'
        GROUP BY 1 ORDER BY 1 ASC
      `),
      db.execute(sql`
        SELECT s.user_id, u.full_name, u.college,
               CASE
                 WHEN u.avatar LIKE 'data:%'
                   OR (u.avatar NOT LIKE 'http%' AND length(u.avatar) > 200000)
                 THEN '/api/users/' || u.id || '/avatar'
                 ELSE u.avatar
               END AS avatar,
               s.started_at, s.last_heartbeat
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.ended_at IS NULL AND s.last_heartbeat >= now() - interval '2 minutes'
        ORDER BY s.last_heartbeat DESC
        LIMIT 50
      `),
    ]);
    res.json({
      days: Array.isArray(daysRaw) ? daysRaw : (daysRaw as any).rows ?? [],
      newUsersPerDay: Array.isArray(nuRaw) ? nuRaw : (nuRaw as any).rows ?? [],
      liveUsers: Array.isArray(luRaw) ? luRaw : (luRaw as any).rows ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/email-inbox', async (req, res) => {
  try {
    if (!(await isAdminUser(req.query.userId))) {
      return res.status(403).json({ error: 'Administrative access required' });
    }
    const result = await listInboxThreads({ days: 90, pageSize: 50 });
    return res.json(result);
  } catch (err: any) {
    console.error('[gmail] inbox list failed');
    return res.status(502).json({ error: 'Unable to load the Gmail inbox right now.' });
  }
});

app.get('/api/admin/email-inbox/:threadId', async (req, res) => {
  try {
    if (!(await isAdminUser(req.query.userId))) {
      return res.status(403).json({ error: 'Administrative access required' });
    }
    const thread = await getInboxThread(req.params.threadId);
    return res.json(thread);
  } catch (err: any) {
    console.error('[gmail] inbox thread load failed');
    return res.status(502).json({ error: 'Unable to load this email thread right now.' });
  }
});

app.post('/api/admin/email-inbox/reply', async (req, res) => {
  try {
    const { userId, threadId, body } = req.body as {
      userId?: string;
      threadId?: string;
      body?: string;
    };
    if (!(await isAdminUser(userId))) {
      return res.status(403).json({ error: 'Administrative access required' });
    }
    if (!threadId || !body?.trim()) {
      return res.status(400).json({ error: 'threadId and reply body are required' });
    }
    const result = await replyToInboxThread(threadId, body.trim());
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[gmail] reply send failed');
    return res.status(502).json({ error: 'Unable to send the reply right now.' });
  }
});

app.post('/api/admin/send-email', async (req, res) => {
  try {
    const { to, subject, body, sendToAll, provider } = req.body as {
      to?: string[];
      subject: string;
      body: string;
      sendToAll?: boolean;
      provider?: 'smtp' | 'brevo';
    };

    if (!subject || !body) {
      return res.status(400).json({ error: 'subject and body are required' });
    }

    let recipients: string[] = [];
    if (sendToAll) {
      const allUsers = await db.select({ email: users.email }).from(users);
      recipients = allUsers.map(u => u.email).filter(Boolean);
    } else {
      recipients = (to || []).filter(Boolean);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found' });
    }

    const results = { sent: 0, failed: 0, errors: [] as string[] };
    const sendAdminEmail = provider === 'brevo' ? sendBrevoEmail : sendSmtpEmail;

    // Send in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (email) => {
          try {
            await sendAdminEmail({
              to: email,
              subject,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                  <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 20px 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">The Network</h1>
                    <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 12px;">Campus Co-founder Hub</p>
                  </div>
                  <div style="background: #f9f9fb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
                    <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #374151;">${body.replace(/\n/g, '<br/>')}</div>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                    <p style="font-size: 11px; color: #9ca3af; margin: 0;">This email was sent from The Network platform. Please do not reply to this email.</p>
                  </div>
                </div>
              `,
            });
            results.sent++;
          } catch (err: any) {
            results.failed++;
            logEmailFailure('admin email delivery', err);
            results.errors.push(`${email}: Email delivery failed`);
          }
        })
      );
    }

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── BULK USER IMPORT ────────────────────────────────────────────────────────

app.post('/api/admin/import-users', async (req, res) => {
  try {
    const { rows } = req.body as {
      rows: { fullName: string; email: string; password: string; college?: string; branch?: string; year?: number; role?: string }[]
    };
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    const results = { inserted: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      if (!row.email || !row.fullName) {
        results.errors.push(`Skipped row — missing name or email: ${JSON.stringify(row)}`);
        results.skipped++;
        continue;
      }
      try {
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, row.email.toLowerCase().trim()));
        if (existing.length > 0) {
          results.skipped++;
          continue;
        }
        const initials = row.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        await db.insert(users).values({
          id: generateId('user'),
          fullName: row.fullName.trim(),
          college: row.college?.trim() || '',
          branch: row.branch?.trim() || '',
          year: Number(row.year) || 1,
          email: row.email.toLowerCase().trim(),
          passwordHash: await hashPassword(row.password || row.email.split('@')[0]),
          avatar: initials,
          aboutMe: '',
          interests: [],
          skills: [],
          lookingFor: [],
          isVerified: false,
          isSuspended: false,
          role: (row.role === 'admin' ? 'admin' : 'student') as 'student' | 'admin',
          privacySettings: { showEmail: true, onlyAllowVerifiedConnections: false, hideProfileFromSearch: false, directMessages: 'connections' },
        });
        results.inserted++;
      } catch (rowErr: any) {
        results.errors.push(`${row.email}: ${rowErr.message}`);
        results.skipped++;
      }
    }

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── AUTO-SEED DOMAIN COMMUNITIES ────────────────────────────────────────────

const DOMAIN_COMMUNITIES_SEED = [
  // ── Academics ──
  { id: 'domain-upsc-2025',       name: 'UPSC Aspirants 2025',      category: 'Government Exams',              icon: 'Award',       tags: ['upsc','ias','ips','civil services','prelims','mains'],    description: 'India\'s largest UPSC preparation community. Share strategy, resources, answer-writing tips, and motivation. For IAS / IPS / IFS aspirants at all stages.' },
  { id: 'domain-gate-2026',       name: 'GATE 2026 Prep',           category: 'Government Exams',              icon: 'Cpu',         tags: ['gate','psu','m.tech','rank','cs','ee','me'],               description: 'GATE 2026 discussion hub — previous papers, subject-wise resources, rank predictions, PSU cutoffs, and peer study groups.' },
  { id: 'domain-cat-prep',        name: 'CAT Aspirants',            category: 'Management & Business',         icon: 'TrendingUp',  tags: ['cat','mba','iim','xat','snap','quant','dilr','varc'],      description: 'Crack CAT and get into IIMs. QA shortcuts, DILR puzzles, VARC reads, mock analysis, and IIM interview prep in one place.' },
  { id: 'domain-clat-prep',       name: 'CLAT & Law Entrance',      category: 'Law & Public Policy',           icon: 'BookOpen',    tags: ['clat','law','nlsiu','nalsar','legal','judiciary'],         description: 'CLAT, AILET, and LSAT preparation. Legal reasoning practice, GK updates, NLU cutoffs, and mock test discussions.' },
  // ── JEE / NEET ──
  { id: 'domain-jee-prep',        name: 'JEE Aspirants',            category: 'Engineering & Technology',      icon: 'Zap',         tags: ['jee','jee mains','jee advanced','iit','nit','bitsat'],    description: 'JEE Mains & Advanced prep community. Physics, Chemistry, Math PYQs, rank predictors, chapter-wise resources and peer doubt-solving.' },
  { id: 'domain-neet-prep',       name: 'NEET Aspirants',           category: 'Medical & Healthcare',          icon: 'Heart',       tags: ['neet','aiims','mbbs','biology','chemistry','medical'],    description: 'NEET UG prep space — Biology mastery, Chemistry PYQs, Physics traps, AIIMS cutoffs, and motivation for medical aspirants.' },
  // ── Coaching institutes ──
  { id: 'coaching-physics-wallah', name: 'Physics Wallah (PW) Aspirants', category: 'Exam Preparation',         icon: 'BookOpen',    tags: ['physics wallah','pw','jee','neet','gate','coaching'],       description: 'A focused space for Physics Wallah learners to compare study plans, discuss lectures, solve doubts, and support one another across JEE, NEET, and GATE.' },
  { id: 'coaching-allen',          name: 'Allen Aspirants',          category: 'Exam Preparation',              icon: 'GraduationCap', tags: ['allen','jee','neet','kota','coaching'],                 description: 'Community for Allen students preparing for JEE and NEET — module discussions, test analysis, revision plans, and peer doubt-solving.' },
  { id: 'coaching-vedantu',        name: 'Vedantu Learners',         category: 'Exam Preparation',              icon: 'MonitorPlay',  tags: ['vedantu','jee','neet','online learning','coaching'],       description: 'Connect with Vedantu learners for JEE and NEET class discussions, mock-test reviews, revision accountability, and exam strategy.' },
  { id: 'coaching-unacademy',      name: 'Unacademy Learners',       category: 'Exam Preparation',              icon: 'Video',        tags: ['unacademy','jee','neet','gate','upsc','coaching'],         description: 'A peer space for Unacademy learners to share educator notes, test-series strategies, revision routines, and exam preparation wins.' },
  { id: 'coaching-fiitjee',        name: 'FIITJEE Aspirants',        category: 'Exam Preparation',              icon: 'Target',       tags: ['fiitjee','jee','olympiad','coaching'],                     description: 'FIITJEE student community for JEE preparation, classroom and test-series discussions, problem-solving, and peer support.' },
  { id: 'coaching-aakash',         name: 'Aakash Students',          category: 'Exam Preparation',              icon: 'Stethoscope',  tags: ['aakash','neet','jee','medical','coaching'],                description: 'Aakash student hub for NEET and JEE preparation, NCERT revision, test analysis, chapter doubts, and consistent study routines.' },
  { id: 'coaching-resonance',      name: 'Resonance Aspirants',      category: 'Exam Preparation',              icon: 'Atom',         tags: ['resonance','jee','neet','kota','coaching'],                 description: 'Resonance learners can share module solutions, test reviews, revision schedules, and honest preparation advice here.' },
  { id: 'coaching-motion',         name: 'Motion Education',         category: 'Exam Preparation',              icon: 'Rocket',       tags: ['motion education','motion','jee','neet','coaching'],       description: 'Motion Education peer community for JEE and NEET study plans, lecture discussions, mock analysis, and motivation.' },
  { id: 'coaching-narayana',       name: 'Narayana Students',        category: 'Exam Preparation',              icon: 'School',       tags: ['narayana','jee','neet','coaching'],                        description: 'Narayana students can exchange test-series learnings, problem-solving approaches, revision plans, and exam-day guidance.' },
  // ── IIT / NIT guidance ──
  { id: 'guidance-iit-nit',         name: 'IIT & NIT Guidance',       category: 'College Guidance',             icon: 'GraduationCap', tags: ['iit','nit','jee','college choice','guidance','counselling'], description: 'Ask IIT and NIT seniors about branches, JoSAA counselling, campus life, scholarships, placements, and how to choose your best option.' },
  { id: 'guidance-iit',             name: 'IIT Seniors & Mentors',    category: 'College Guidance',             icon: 'Award',        tags: ['iit','jee advanced','mentorship','branch','guidance'],       description: 'Guidance from IIT students and alumni on JEE Advanced choices, branches, academics, research, internships, and campus life.' },
  { id: 'guidance-nit',             name: 'NIT Seniors & Mentors',    category: 'College Guidance',             icon: 'Building2',    tags: ['nit','jee mains','mentorship','josaa','guidance'],          description: 'Talk with NIT students and alumni about JoSAA choices, branches, hostels, academics, placements, and life at an NIT.' },
  { id: 'guidance-nit-trichy',      name: 'NIT Trichy Seniors & Guidance', category: 'College Guidance',      icon: 'Building2',    tags: ['nit trichy','nitt','jee','mentorship','guidance'],          description: 'A guidance space for NIT Tiruchirappalli aspirants and students — branch choices, JoSAA, campus life, academics, and senior advice.' },
  // ── Placements ──
  { id: 'domain-placement-hub',   name: 'Placement Prep Hub',       category: 'Opportunities',                 icon: 'Briefcase',   tags: ['placement','campus','hr','aptitude','oa','gd','pi'],      description: 'End-to-end campus placement prep — aptitude, GD, PI, HR rounds, company-wise experiences, and offer letters shared by seniors.' },
  { id: 'domain-interview-ready', name: 'Interview Ready',          category: 'Opportunities',                 icon: 'Users',       tags: ['interview','behavioral','system design','lld','hld'],    description: 'Technical + behavioral interview prep. Mock interviews, system design walkthroughs, behavioral STAR stories, and salary negotiation.' },
  { id: 'domain-internship-hunt', name: 'Internship Hunt',          category: 'Opportunities',                 icon: 'Rocket',      tags: ['internship','intern','stipend','off-campus','ppo'],       description: 'Find and share internship opportunities — off-campus openings, PPO tips, stipend insights, referrals, and cold-email templates.' },
  { id: 'domain-off-campus',      name: 'Off-Campus Drives',        category: 'Opportunities',                 icon: 'Globe',       tags: ['off campus','referral','job','drive','opening','2025'],   description: 'Off-campus job and internship drives for 2024/2025 grads. Referrals, applications, and direct company links aggregated by community.' },
  // ── Coding & Tech ──
  { id: 'domain-dsa-corner',      name: 'DSA Corner',               category: 'Engineering & Technology',      icon: 'Code',        tags: ['dsa','leetcode','codeforces','arrays','dp','graphs'],     description: 'Data Structures & Algorithms practice hub. LeetCode daily challenges, concept discussions, company-tagged problems, and contest strategies.' },
  { id: 'domain-web-dev',         name: 'Web Developers India',     category: 'Engineering & Technology',      icon: 'Globe',       tags: ['web','react','nextjs','fullstack','frontend','backend'],  description: 'India\'s student web dev community. React, Next.js, Node, full-stack projects, open PRs, freelance gigs, and portfolio reviews.' },
  { id: 'domain-aiml',            name: 'AI / ML Enthusiasts',      category: 'Engineering & Technology',      icon: 'Cpu',         tags: ['ai','ml','deep learning','pytorch','kaggle','llm'],       description: 'Machine learning, deep learning, LLMs, and AI research. Kaggle competitions, paper readings, project showcases, and GPU tips.' },
  { id: 'domain-cp-club',         name: 'Competitive Programming',  category: 'Engineering & Technology',      icon: 'Award',       tags: ['cp','codeforces','atcoder','icpc','codechef','rating'],   description: 'Competitive programming for students — contest editorials, rating-improvement strategies, ICPC team formation, and CP resources.' },
  // ── School study partners & programming foundations ──
  { id: 'school-class-10-india',  name: 'Class 10 Students India',   category: 'School & Exams',              icon: 'School',      tags: ['class 10','school','boards','study partner','india'],       description: 'A supportive India-wide space for Class 10 students to find study partners, share board resources, clear doubts, and build strong foundations before choosing a stream.' },
  { id: 'school-class-11-india',  name: 'Class 11 Students India',   category: 'School & Exams',              icon: 'School',      tags: ['class 11','school','jee','neet','study partner','india'],   description: 'Find Class 11 study partners across India, discuss PCM/PCB and other streams, stay accountable, and prepare for JEE, NEET, boards, or your next step.' },
  { id: 'school-class-12-india',  name: 'Class 12 Students India',   category: 'School & Exams',              icon: 'School',      tags: ['class 12','school','boards','jee','neet','india'],         description: 'A focused Class 12 community for board preparation, JEE/NEET support, revision plans, doubt-solving, and finding serious study partners across India.' },
  { id: 'tech-python-india',      name: 'Python Learners India',     category: 'Engineering & Technology',    icon: 'Code',        tags: ['python','programming','ai','data science','students','india'], description: 'Learn Python together through beginner projects, automation, AI/ML foundations, problem-solving practice, and peer code reviews.' },
  { id: 'tech-java-india',        name: 'Java Learners India',       category: 'Engineering & Technology',    icon: 'Code',        tags: ['java','programming','oops','dsa','students','india'],      description: 'A student community for Java fundamentals, OOP, DSA practice, backend projects, interview preparation, and peer learning.' },
  { id: 'tech-cpp-india',         name: 'C++ Learners India',        category: 'Engineering & Technology',    icon: 'Code',        tags: ['c++','cpp','programming','dsa','competitive programming','india'], description: 'Build strong C++ foundations with peers through DSA, competitive programming, problem-solving sessions, and beginner-friendly projects.' },
  // ── Robotics, aerospace & maker learning ──
  { id: 'tech-robotics-india',    name: 'Robotics & Automation India', category: 'Engineering & Technology',   icon: 'Cpu',        tags: ['robotics','robots','automation','arduino','raspberry pi','embedded','electronics','india'], description: 'Learn robotics and automation through Arduino, Raspberry Pi, embedded systems, sensors, control systems, and student build projects.' },
  { id: 'tech-aerospace-india',   name: 'Aerospace & Space Tech India', category: 'Engineering & Technology',  icon: 'Rocket',     tags: ['aerospace','aeronautics','space','satellite','rocketry','drones','india'], description: 'Explore aerospace and space technology with peers through rocketry, satellites, drones, aerodynamics, missions, and student research.' },
  { id: 'tech-embedded-india',    name: 'Embedded & IoT Builders',     category: 'Engineering & Technology',  icon: 'Zap',        tags: ['embedded','iot','electronics','microcontroller','arduino','robotics','india'], description: 'Build connected devices with microcontrollers, electronics, IoT, sensors, firmware, and practical projects shared by student makers.' },
  // ── Subject classrooms ──
  { id: 'subject-physics-india',          name: 'Physics Learners India',              category: 'School & Exams',           icon: 'BookOpen', tags: ['physics','jee','neet','boards','numericals','india'],                    description: 'A focused Physics classroom for JEE, NEET, boards, and competitive-exam learners to solve doubts, share notes, and practice numericals together.' },
  { id: 'subject-mathematics-india',      name: 'Mathematics Learners India',          category: 'School & Exams',           icon: 'BookOpen', tags: ['mathematics','maths','jee','boards','algebra','calculus','india'],       description: 'Practice Mathematics with peers through algebra, calculus, coordinate geometry, board questions, and entrance-exam problem solving.' },
  { id: 'subject-chemistry-india',        name: 'Chemistry Learners India',            category: 'School & Exams',           icon: 'BookOpen', tags: ['chemistry','jee','neet','boards','organic','inorganic','india'],         description: 'Learn Physical, Organic, and Inorganic Chemistry with revision notes, PYQs, reaction discussions, and peer doubt-solving.' },
  { id: 'subject-biology-india',          name: 'Biology Learners India',              category: 'School & Exams',           icon: 'BookOpen', tags: ['biology','neet','boards','ncert','medical','india'],                    description: 'An NCERT-first Biology room for NEET, school, and medical-entrance learners to revise diagrams, concepts, and high-yield chapters together.' },
  { id: 'subject-commerce-india',         name: 'Commerce Learners India',             category: 'School & Exams',           icon: 'BookOpen', tags: ['commerce','accountancy','economics','business studies','india'],          description: 'A Commerce classroom for Accountancy, Economics, Business Studies, board preparation, and commerce-entrance discussions.' },
  { id: 'subject-arts-culture-india',     name: 'Arts & Culture Learners India',       category: 'School & Exams',           icon: 'BookOpen', tags: ['arts','humanities','culture','history','political science','india'],       description: 'A space for Arts and Humanities learners to discuss History, Political Science, Sociology, languages, culture, and entrance preparation.' },
  { id: 'subject-aptitude-india',         name: 'Aptitude & Reasoning India',           category: 'Competitive Exams',       icon: 'BookOpen', tags: ['quantitative aptitude','reasoning','dilr','cat','gate','ssc','india'],   description: 'Practice quantitative aptitude, logical reasoning, DI, and timed question sets with peers preparing for competitive exams.' },
  { id: 'subject-reasoning-india',        name: 'Reasoning Practice India',             category: 'Competitive Exams',       icon: 'BookOpen', tags: ['reasoning','logical reasoning','analytical reasoning','puzzles','india'],             description: 'Practice logical and analytical reasoning through puzzles, timed question sets, and peer explanations for competitive exams.' },
  { id: 'subject-english-languages-india',name: 'English & Languages India',            category: 'Competitive Exams',       icon: 'BookOpen', tags: ['english','languages','verbal ability','reading comprehension','india'],  description: 'Build reading comprehension, vocabulary, grammar, verbal ability, and language confidence for boards and entrance exams.' },
  { id: 'subject-general-awareness-india',name: 'General Awareness India',              category: 'Competitive Exams',       icon: 'BookOpen', tags: ['general awareness','current affairs','gk','upsc','ssc','india'],         description: 'Discuss current affairs, history, polity, geography, and general knowledge for UPSC, SSC, banking, and other competitive exams.' },
  // ── Design & Startups ──
  { id: 'domain-uiux',            name: 'UI/UX Designers',          category: 'Design & Creativity',           icon: 'Palette',     tags: ['ui','ux','figma','design','wireframe','product'],         description: 'Design thinking, Figma workflows, portfolio critiques, UX case studies, and design internship opportunities for student designers.' },
  { id: 'domain-startup-founders',name: 'Startup Founders',         category: 'Startups & Entrepreneurship',   icon: 'Rocket',      tags: ['startup','founder','pitch','vc','product','gtm'],         description: 'Student founders community — ideation, validation, fundraising, co-founder matching, pitch deck reviews, and startup job board.' },
  { id: 'domain-entrepreneurship-india', name: 'Entrepreneurship & Innovation India', category: 'Startups & Entrepreneurship', icon: 'Lightbulb', tags: ['entrepreneurship','innovation','startup','founder','business','product','india'], description: 'Learn entrepreneurship with student builders through idea validation, customer discovery, product thinking, business models, and founder feedback.' },
];

// Course communities are intentionally seeded with public, stable learning links.
// They are shared starting points; members can add college-specific notes and links.
const COURSE_COMMUNITIES_SEED = [
  {
    id: 'course-computer-science',
    name: 'Computer Science & Engineering',
    category: 'Course Community',
    icon: 'Code',
    tags: ['cse', 'computer science', 'dsa', 'web development', 'ai', 'programming'],
    description: 'A practical home for CSE students: semester help, DSA, projects, internships, and guidance from seniors who have already taken the path.',
    resources: [
      { id: 'seed-cse-nptel', title: 'NPTEL Computer Science Courses', link: 'https://nptel.ac.in/courses', description: 'Free IIT and IISc lectures for core subjects. Start with one course that matches your current semester.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'seed-cse-roadmap', title: 'roadmap.sh — Computer Science', link: 'https://roadmap.sh/computer-science', description: 'A visual map for foundations, systems, development, and interview preparation. Use it to choose your next step, not to rush everything at once.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'seed-cse-ocw', title: 'MIT OpenCourseWare: Intro to Algorithms', link: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/', description: 'University-level algorithms lectures, notes, and problem sets.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
    ],
  },
  {
    id: 'course-cybersecurity',
    name: 'Cybersecurity & Ethical Hacking',
    category: 'Course Community',
    icon: 'ShieldCheck',
    tags: ['cybersecurity', 'ethical hacking', 'network security', 'web security', 'ctf', 'soc', 'linux'],
    description: 'A safe, practical space for students learning cybersecurity, ethical hacking, secure development, CTFs, incident response, and security careers.',
    resources: [
      { id: 'seed-cyber-roadmap', title: 'Cybersecurity Roadmap', link: 'https://roadmap.sh/cyber-security', description: 'A visual path from networking and Linux foundations through web security, blue team, red team, and career projects.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-tryhackme', title: 'TryHackMe learning paths', link: 'https://tryhackme.com/paths', description: 'Browser-based guided rooms and paths for beginners, SOC analysts, penetration testers, and more.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-portswigger', title: 'PortSwigger Web Security Academy', link: 'https://portswigger.net/web-security', description: 'Free interactive labs for learning web vulnerabilities safely, including SQL injection, XSS, authentication, and access control.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-overthewire', title: 'OverTheWire Wargames', link: 'https://overthewire.org/wargames/', description: 'Start with Bandit for Linux and command-line fundamentals, then progress to web, crypto, and binary challenges.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-owasp', title: 'OWASP Web Security Testing Guide', link: 'https://owasp.org/www-project-web-security-testing-guide/', description: 'An open testing methodology for understanding and assessing web application security.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-mitre', title: 'MITRE ATT&CK', link: 'https://attack.mitre.org/', description: 'A globally used knowledge base for mapping adversary tactics, techniques, detections, and defensive research.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-professor-messer', title: 'Professor Messer — Security+', link: 'https://www.professormesser.com/', description: 'Free certification-focused lessons for networking, security fundamentals, and CompTIA Security+ preparation. YouTube: @professormesser.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-david-bombal', title: 'David Bombal — networking & Linux', link: 'https://davidbombal.com/', description: 'Networking, Linux, Python, labs, and ethical-hacking tutorials for building strong technical foundations. YouTube: David Bombal.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-john-hammond', title: 'John Hammond — malware & CTF research', link: 'https://jh.live/', description: 'Practical malware analysis, CTFs, threat research, and security engineering walkthroughs. YouTube: John Hammond.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-tcm', title: 'TCM Security — penetration testing', link: 'https://tcm-sec.com/academy', description: 'Hands-on penetration-testing training, labs, and certification paths from The Cyber Mentor and the TCM team. YouTube: TCM Security.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'seed-cyber-liveoverflow', title: 'LiveOverflow — binary exploitation', link: 'https://liveoverflow.com/', description: 'Deep technical videos on binary exploitation, reverse engineering, and capture-the-flag concepts. YouTube: LiveOverflow.', authorId: 'system', createdAt: '2026-09-01T00:00:00.000Z' },
    ],
  },
  {
    id: 'course-electronics',
    name: 'Electronics & Communication',
    category: 'Course Community',
    icon: 'Cpu',
    tags: ['ece', 'electronics', 'communication', 'embedded', 'vlsi', 'signals'],
    description: 'For ECE students learning circuits, communication, embedded systems, VLSI, coding, and how seniors turned coursework into projects and placements.',
    resources: [
      { id: 'seed-ece-nptel', title: 'NPTEL Electronics & Communication', link: 'https://nptel.ac.in/courses', description: 'Searchable IIT/IISc lecture library for signals, networks, digital systems, and communication.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'seed-ece-allabout', title: 'All About Circuits Textbook', link: 'https://www.allaboutcircuits.com/textbook/', description: 'Free reference chapters for circuit analysis, semiconductors, and digital electronics.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
    ],
  },
  {
    id: 'course-mechanical',
    name: 'Mechanical Engineering',
    category: 'Course Community',
    icon: 'Settings',
    tags: ['mechanical', 'me', 'thermodynamics', 'cad', 'manufacturing', 'design'],
    description: 'Semester notes, CAD and manufacturing projects, GATE guidance, internships, and honest advice from Mechanical seniors.',
    resources: [
      { id: 'seed-me-nptel', title: 'NPTEL Mechanical Engineering', link: 'https://nptel.ac.in/courses', description: 'Find lectures for thermodynamics, mechanics, manufacturing, design, and materials.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'seed-me-mit', title: 'MIT OCW: Engineering Mechanics', link: 'https://ocw.mit.edu/search/?d=Mechanical%20Engineering', description: 'Open course notes and lectures across mechanical engineering subjects.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
    ],
  },
  {
    id: 'course-civil',
    name: 'Civil Engineering',
    category: 'Course Community',
    icon: 'Layers',
    tags: ['civil', 'ce', 'structures', 'construction', 'geotech', 'environmental'],
    description: 'A shared space for Civil students: core subjects, site experience, software, competitive exams, projects, and senior-to-junior advice.',
    resources: [
      { id: 'seed-civil-nptel', title: 'NPTEL Civil Engineering', link: 'https://nptel.ac.in/courses', description: 'Lecture series for structures, geotechnical, transportation, and environmental engineering.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'seed-civil-ocw', title: 'MIT OCW: Civil & Environmental Engineering', link: 'https://ocw.mit.edu/search/?d=Civil%20Engineering', description: 'Open lecture notes and assignments from a leading engineering school.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
    ],
  },
  {
    id: 'course-business',
    name: 'Management, BBA & Commerce',
    category: 'Course Community',
    icon: 'Briefcase',
    tags: ['bba', 'bcom', 'commerce', 'management', 'mba', 'finance', 'marketing'],
    description: 'Case studies, Excel and finance practice, internships, CAT/MBA planning, and career lessons from seniors in business courses.',
    resources: [
      { id: 'seed-business-khan', title: 'Khan Academy: Finance & Capital Markets', link: 'https://www.khanacademy.org/economics-finance-domain/core-finance', description: 'Clear fundamentals for accounting, finance, and markets before advanced coursework.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'seed-business-nptel', title: 'NPTEL Management Courses', link: 'https://nptel.ac.in/courses/110', description: 'Lectures covering marketing, operations, finance, and organizational behavior.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
    ],
  },
  {
    id: 'course-medical',
    name: 'Medicine & Healthcare',
    category: 'Course Community',
    icon: 'Heart',
    tags: ['mbbs', 'medical', 'medicine', 'neet', 'healthcare', 'biology'],
    description: 'A supportive space for medical and healthcare students to exchange study systems, clinical learning tips, resources, and senior guidance.',
    resources: [
      { id: 'seed-med-openstax', title: 'OpenStax Anatomy & Physiology', link: 'https://openstax.org/details/books/anatomy-and-physiology-2e', description: 'Free, peer-reviewed anatomy and physiology textbook for building a strong base.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'seed-med-khan', title: 'Khan Academy: Health & Medicine', link: 'https://www.khanacademy.org/science/health-and-medicine', description: 'Accessible videos for physiology, biology, and clinical foundations.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
    ],
  },
  {
    id: 'course-law',
    name: 'Law & Legal Studies',
    category: 'Course Community',
    icon: 'Scale',
    tags: ['law', 'llb', 'ba llb', 'clat', 'legal research', 'policy'],
    description: 'Case reading, legal research, internships, moots, entrance preparation, and practical advice from law students further along.',
    resources: [
      { id: 'seed-law-india', title: 'India Code', link: 'https://www.indiacode.nic.in/', description: 'The official repository for central Acts and legislation. Verify primary sources here.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'seed-law-legal', title: 'Legal Information Institute', link: 'https://www.law.cornell.edu/', description: 'A reliable reference for legal concepts and case-law vocabulary.', authorId: 'system', createdAt: '2026-08-20T00:00:00.000Z' },
    ],
  },
];

const CYBERSECURITY_POST_SEED = [
  {
    id: 'seed-cyber-question-roadmap',
    academicTag: 'question',
    projectTitle: 'What should I learn first: SOC or ethical hacking?',
    content: 'I am new to cybersecurity and want a clear starting point. Should I begin with networking, Linux, and a SOC path, or go directly into ethical hacking? Please share a realistic weekly plan and the first labs I should complete.',
    tags: ['beginner', 'roadmap', 'career'],
    websiteUrl: 'https://roadmap.sh/cyber-security',
    createdAt: new Date('2026-09-01T06:00:00.000Z'),
  },
  {
    id: 'seed-cyber-question-web-labs',
    academicTag: 'question',
    projectTitle: 'How do I practice web security safely?',
    content: 'I understand basic HTML and JavaScript but want to learn web security without touching real systems. Which PortSwigger labs, OWASP topics, and local practice apps should I follow first?',
    tags: ['web security', 'owasp', 'safe practice'],
    websiteUrl: 'https://portswigger.net/web-security',
    createdAt: new Date('2026-09-01T05:30:00.000Z'),
  },
  {
    id: 'seed-cyber-question-labs',
    academicTag: 'question',
    projectTitle: 'Which beginner labs are worth completing?',
    content: 'I want to build a public learning log instead of collecting random tools. Has anyone completed Bandit, a TryHackMe beginner path, and a few PortSwigger labs in sequence? What should I document for a portfolio?',
    tags: ['labs', 'portfolio', 'beginner'],
    websiteUrl: 'https://overthewire.org/wargames/',
    createdAt: new Date('2026-09-01T05:00:00.000Z'),
  },
  {
    id: 'seed-cyber-project-soc',
    academicTag: 'project',
    projectTitle: 'Build a Home SOC Lab with Wazuh',
    content: 'Build a small defensive lab with a Linux or Windows endpoint, Wazuh, Sysmon, and a sample event dataset. Document the alert pipeline, map detections to MITRE ATT&CK, and write a short incident report. Keep every test inside your own lab.',
    tags: ['blue team', 'soc', 'wazuh', 'mitre att&ck'],
    websiteUrl: 'https://wazuh.com/',
    createdAt: new Date('2026-09-01T04:30:00.000Z'),
  },
  {
    id: 'seed-cyber-project-juice-shop',
    academicTag: 'project',
    projectTitle: 'OWASP Juice Shop security assessment',
    content: 'Run OWASP Juice Shop locally and complete a small, ethical assessment. Pick five vulnerabilities, reproduce them only in the local app, explain the root cause, and propose a secure code fix with references to the OWASP Testing Guide.',
    tags: ['web security', 'owasp', 'appsec', 'portfolio'],
    websiteUrl: 'https://owasp.org/www-project-juice-shop/',
    createdAt: new Date('2026-09-01T04:00:00.000Z'),
  },
  {
    id: 'seed-cyber-project-phishing',
    academicTag: 'project',
    projectTitle: 'Phishing awareness and URL triage tool',
    content: 'Create a defensive tool that explains why a URL may be suspicious using transparent rules such as punycode, lookalike domains, HTTPS state, and redirect chains. Use synthetic examples only, add tests, and include a clear disclaimer that it is not a final verdict.',
    tags: ['defensive security', 'python', 'phishing', 'secure development'],
    websiteUrl: null,
    createdAt: new Date('2026-09-01T03:30:00.000Z'),
  },
];

const JEE_WELCOME_POST_ID = 'seed-jee-welcome-niraj';

async function autoSeedDomainCommunities() {
  try {
    for (const comm of [...DOMAIN_COMMUNITIES_SEED, ...COURSE_COMMUNITIES_SEED]) {
      const existing = await db.select().from(communities).where(eq(communities.id, comm.id));
      if (existing.length === 0) {
        await db.insert(communities).values({
          id: comm.id,
          name: comm.name,
          description: comm.description,
          icon: comm.icon,
          memberIds: [] as string[],
          tags: comm.tags as string[],
          category: comm.category,
          threads: [] as any[],
          resources: (('resources' in comm ? comm.resources : []) || []) as any[],
          polls: [] as any[],
          creatorId: 'system',
        });
        console.log(`[Seed] Created community: ${comm.name}`);
      } else if ('resources' in comm && (!existing[0].resources || (existing[0].resources as any[]).length === 0)) {
        await db.update(communities)
          .set({ resources: comm.resources as any[] })
          .where(eq(communities.id, comm.id));
      }
    }

    await syncJeeAspirantsMembership();

    const jeeCommunity = await db.select({ id: communities.id })
      .from(communities)
      .where(eq(communities.id, JEE_COMMUNITY_ID));
    const niraj = (await db.select({
      id: users.id,
      fullName: users.fullName,
      college: users.college,
      year: users.year,
      isSuspended: users.isSuspended,
    }).from(users)).find(user =>
      !user.isSuspended &&
      /^niraj\b/i.test(user.fullName.trim()) &&
      /nit tiruchirappalli/i.test(user.college) &&
      user.year === 3
    );

    if (jeeCommunity.length > 0 && niraj) {
      const existingWelcomePost = await db.select({ id: posts.id, authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, JEE_WELCOME_POST_ID));
      if (existingWelcomePost.length === 0) {
        await db.insert(posts).values({
          id: JEE_WELCOME_POST_ID,
          authorId: niraj.id,
          isAnonymous: false,
          content: 'Hey everyone, this is Niraj, a 3rd-year student at NIT Tiruchirappalli. I’ll be guiding you throughout your JEE journey, sharing useful resources, helping you build a focused study plan, and supporting you as you work to crack the exam. Feel free to ask questions, share your progress, and learn together. We have limited time left, so let’s make every day count!',
          likes: [],
          communityId: jeeCommunity[0].id,
          academicTag: 'JEE Guidance',
          projectTitle: 'Welcome to the JEE Aspirants community',
          feeling: null,
          websiteUrl: null,
          tags: ['jee', 'guidance', 'resources', 'study plan'],
        });
        console.log(`[Seed] JEE welcome post created (author: ${niraj.fullName.trim()})`);
      } else if (existingWelcomePost[0].authorId !== niraj.id) {
        await db.update(posts)
          .set({ authorId: niraj.id })
          .where(eq(posts.id, JEE_WELCOME_POST_ID));
      }
    }

    const cyberCommunity = await db.select({ id: communities.id })
      .from(communities)
      .where(eq(communities.id, 'course-cybersecurity'));
    const seedUsers = await db.select({ id: users.id, fullName: users.fullName }).from(users);
    const seedAuthor = seedUsers.find((user) => /^vikram\b.*dvi/i.test(user.fullName.trim())) || seedUsers[0];
    if (cyberCommunity.length > 0 && seedAuthor) {
      for (const seedPost of CYBERSECURITY_POST_SEED) {
        const existingPost = await db.select({ id: posts.id, authorId: posts.authorId }).from(posts).where(eq(posts.id, seedPost.id));
        if (existingPost.length === 0) {
          await db.insert(posts).values({
            id: seedPost.id,
            authorId: seedAuthor.id,
            isAnonymous: false,
            content: seedPost.content,
            likes: [],
            communityId: cyberCommunity[0].id,
            academicTag: seedPost.academicTag,
            projectTitle: seedPost.projectTitle,
            feeling: null,
            websiteUrl: seedPost.websiteUrl || null,
            tags: seedPost.tags,
            createdAt: seedPost.createdAt,
          });
        } else if (existingPost[0].authorId !== seedAuthor.id) {
          await db.update(posts)
            .set({ authorId: seedAuthor.id })
            .where(eq(posts.id, seedPost.id));
        }
      }
      console.log(`[Seed] Cybersecurity community content checked (author: ${seedAuthor.fullName.trim()})`);
    }
  } catch (err) {
    console.error('[Seed] Domain community seed error:', err);
  }
}

// ─── SEED COMMUNITIES (first run) ────────────────────────────────────────────

app.post('/api/seed/communities', async (req, res) => {
  try {
    const existing = await db.select().from(communities);
    if (existing.length > 0) return res.json({ skipped: true, count: existing.length });
    const { chapters } = req.body;
    if (!chapters || !Array.isArray(chapters)) return res.status(400).json({ error: 'chapters array required' });
    const inserted = await db.insert(communities).values(
      chapters.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        icon: ch.icon || 'Users',
        memberIds: ch.memberIds || [],
        tags: ch.tags || [],
        category: ch.category || 'General',
        threads: ch.threads || [],
        resources: ch.resources || [],
      }))
    ).returning();
    return res.json({ seeded: inserted.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

app.get('/api/notifications/:userId/stream', (req, res) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : '';
  if (!userId) return res.status(400).json({ error: 'A user is required for the notification stream.' });

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`event: ready\ndata: ${JSON.stringify({ userId })}\n\n`);

  const streams = notificationStreams.get(userId) || new Set<Response>();
  streams.add(res);
  notificationStreams.set(userId, streams);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
      (res as Response & { flush?: () => void }).flush?.();
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    streams.delete(res);
    if (!streams.size) notificationStreams.delete(userId);
  };
  req.on('close', cleanup);
});

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const all = await db.select().from(notifications)
      .where(eq(notifications.userId, req.params.userId))
      .orderBy(desc(notifications.createdAt));
    return res.json(all.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/conversation-read', async (req, res) => {
  try {
    const userId = authenticatedChatUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign in to update conversation read state.' });
    const { type, conversationId } = req.body as { type?: string; conversationId?: string };
    if ((type !== 'community' && type !== 'study_group') || typeof conversationId !== 'string' || !conversationId) {
      return res.status(400).json({ error: 'A valid chat and conversation ID are required.' });
    }

    let marker: string;
    let notificationTypes: string[];
    if (type === 'study_group') {
      const [group] = await db.select().from(groupChats).where(eq(groupChats.id, conversationId));
      if (!group) return res.status(404).json({ error: 'Group not found.' });
      const members = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
      if (!members.includes(userId)) return res.status(403).json({ error: 'You are not a member of this group.' });
      marker = `[[group:${conversationId}]]`;
      notificationTypes = ['group_message'];
    } else {
      const [community] = await db.select().from(communities).where(eq(communities.id, conversationId));
      if (!community) return res.status(404).json({ error: 'Community not found.' });
      const members = Array.isArray(community.memberIds) ? community.memberIds as string[] : [];
      if (!members.includes(userId)) return res.status(403).json({ error: 'You are not a member of this community.' });
      marker = `[[community:${conversationId}]]`;
      notificationTypes = ['community_message', 'mention'];
    }

    const unread = await db.select({ id: notifications.id, body: notifications.body })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
        inArray(notifications.type, notificationTypes),
      ));
    const matchingIds = unread.filter((item) => item.body.includes(marker)).map((item) => item.id);
    if (matchingIds.length) {
      await db.update(notifications).set({ isRead: true }).where(and(
        eq(notifications.userId, userId),
        inArray(notifications.id, matchingIds),
      ));
    }
    return res.json({ ok: true, updated: matchingIds.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const userId = authenticatedChatUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign in to update notifications.' });
    await db.update(notifications).set({ isRead: true }).where(and(
      eq(notifications.id, req.params.id),
      eq(notifications.userId, userId),
    ));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const userId = authenticatedChatUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign in to update notifications.' });
    if (req.params.userId !== userId) return res.status(403).json({ error: 'You can only update your own notifications.' });
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PROJECTS ────────────────────────────────────────────────────────────────

app.get('/api/projects', async (_req, res) => {
  try {
    const all = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return res.json(all.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, creatorId, stage, tags, lookingFor } = req.body;
    const newProject = await db.insert(projects).values({
      id: generateId('proj'),
      title, description, creatorId,
      stage: stage || 'Idea',
      tags: tags || [],
      lookingFor: lookingFor || [],
      memberIds: [creatorId],
    }).returning();
    return res.json({ ...newProject[0], createdAt: newProject[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { title, description, stage, tags, lookingFor } = req.body;
    const found = await db.select().from(projects).where(eq(projects.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Project not found' });
    const updated = await db.update(projects).set({
      title: title ?? found[0].title,
      description: description ?? found[0].description,
      stage: stage ?? found[0].stage,
      tags: tags ?? found[0].tags,
      lookingFor: lookingFor ?? found[0].lookingFor,
    }).where(eq(projects.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const found = await db.select().from(projects).where(eq(projects.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Project not found' });
    const memberIds = (found[0].memberIds as string[]) || [];
    if (!memberIds.includes(userId)) {
      const updated = await db.update(projects).set({ memberIds: [...memberIds, userId] }).where(eq(projects.id, req.params.id)).returning();
      return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
    }
    return res.json({ ...found[0], createdAt: found[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id/leave', async (req, res) => {
  try {
    const { userId } = req.body;
    const found = await db.select().from(projects).where(eq(projects.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Project not found' });
    const memberIds = ((found[0].memberIds as string[]) || []).filter(id => id !== userId);
    const updated = await db.update(projects).set({ memberIds }).where(eq(projects.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await db.delete(projects).where(eq(projects.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── THE NETWORK COLLEGE BUILD CHALLENGE ─────────────────────────────────────

const NETWORK_CHALLENGE_ID = 'network-college-build-2026-dsa';

function safeCompetitionUrl(value: unknown, required = false): string {
  const candidate = String(value || '').trim();
  if (!candidate) {
    if (required) throw new Error('A project URL is required');
    return '';
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Project links must be valid URLs');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Project links must use http or https');
  }
  return parsed.toString();
}

function challengeDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function competitionReadiness(submission: {
  title: string;
  summary: string;
  githubUrl: string;
  demoUrl: string;
  videoUrl: string;
  techStack: unknown;
}) {
  const techStack = Array.isArray(submission.techStack) ? submission.techStack : [];
  return [
    submission.title.trim().length >= 5,
    submission.summary.trim().length >= 80,
    Boolean(submission.githubUrl),
    Boolean(submission.demoUrl),
    Boolean(submission.videoUrl),
    techStack.length >= 2,
  ].filter(Boolean).length * 10;
}

async function getCollegeChallengeSnapshot(userId?: string) {
  const [competition] = await db.select().from(networkCompetitions)
    .where(eq(networkCompetitions.id, NETWORK_CHALLENGE_ID));
  if (!competition) throw new Error('The Network challenge is not available');

  const [teamRows, submissionRows] = await Promise.all([
    db.select().from(networkCompetitionTeams)
      .where(eq(networkCompetitionTeams.competitionId, competition.id))
      .orderBy(desc(networkCompetitionTeams.createdAt)),
    db.select().from(networkCompetitionSubmissions)
      .where(eq(networkCompetitionSubmissions.competitionId, competition.id))
      .orderBy(desc(networkCompetitionSubmissions.updatedAt)),
  ]);

  const memberIds = [...new Set(teamRows.flatMap((team) =>
    Array.isArray(team.memberIds) ? team.memberIds as string[] : [],
  ))];
  const memberRows = memberIds.length
    ? await db.select({
      id: users.id,
      fullName: users.fullName,
      college: users.college,
      branch: users.branch,
      avatar: users.avatar,
      isSuspended: users.isSuspended,
    }).from(users).where(inArray(users.id, memberIds))
    : [];
  const memberMap = new Map(memberRows.map((member) => [member.id, member]));

  const voteResult = await pool.query<{ submission_id: string; count: string }>(
    `SELECT submission_id, COUNT(*)::text AS count
     FROM network_competition_votes
     WHERE submission_id = ANY($1::text[])
     GROUP BY submission_id`,
    [submissionRows.map((submission) => submission.id)],
  );
  const votesBySubmission = new Map(voteResult.rows.map((row) => [row.submission_id, Number(row.count)]));
  const submissionMap = new Map(submissionRows.map((submission) => [submission.teamId, submission]));

  const teams = teamRows.map((team) => {
    const submission = submissionMap.get(team.id);
    const communityVotes = submission ? (votesBySubmission.get(submission.id) || 0) : 0;
    const readinessScore = submission ? competitionReadiness(submission) : 0;
    return {
      id: team.id,
      name: team.name,
      college: team.college,
      captainId: team.captainId,
      memberIds: Array.isArray(team.memberIds) ? team.memberIds : [],
      members: (Array.isArray(team.memberIds) ? team.memberIds : [])
        .map((id) => memberMap.get(String(id)))
        .filter(Boolean)
        .map((member) => ({
          id: member!.id,
          name: member!.fullName,
          college: member!.college,
          branch: member!.branch,
          avatar: userAvatarReference(member!.id, member!.avatar) || '',
        })),
      createdAt: challengeDate(team.createdAt),
      submission: submission ? {
        id: submission.id,
        title: submission.title,
        summary: submission.summary,
        githubUrl: submission.githubUrl,
        demoUrl: submission.demoUrl,
        videoUrl: submission.videoUrl,
        techStack: Array.isArray(submission.techStack) ? submission.techStack : [],
        status: submission.status,
        createdAt: challengeDate(submission.createdAt),
        updatedAt: challengeDate(submission.updatedAt),
        communityVotes,
        readinessScore,
        score: Number(submission.judgeScore || 0) + readinessScore + communityVotes * 5,
        hasVoted: false,
      } : null,
    };
  });

  if (userId) {
    const votedSubmissionIds = await db.select({ submissionId: networkCompetitionVotes.submissionId })
      .from(networkCompetitionVotes)
      .where(eq(networkCompetitionVotes.voterId, userId));
    const voted = new Set(votedSubmissionIds.map((row) => row.submissionId));
    for (const team of teams) {
      if (team.submission) team.submission.hasVoted = voted.has(team.submission.id);
    }
  }

  const leaderboard = teams
    .filter((team) => team.submission)
    .sort((a, b) => (b.submission?.score || 0) - (a.submission?.score || 0))
    .map((team, index) => ({ rank: index + 1, ...team }));

  const myTeam = userId
    ? teams.find((team) => team.memberIds.includes(userId)) || null
    : null;

  return {
    competition: {
      id: competition.id,
      title: competition.title,
      slug: competition.slug,
      description: competition.description,
      track: competition.track,
      status: competition.status,
      teamSize: competition.teamSize,
      registrationDeadline: challengeDate(competition.registrationDeadline),
      buildStartsAt: challengeDate(competition.buildStartsAt),
      submissionDeadline: challengeDate(competition.submissionDeadline),
      judgingEndsAt: challengeDate(competition.judgingEndsAt),
    },
    teams,
    leaderboard,
    myTeamId: myTeam?.id || null,
  };
}

app.get('/api/college-competition', async (req, res) => {
  try {
    return res.json(await getCollegeChallengeSnapshot(
      typeof req.query.userId === 'string' ? req.query.userId : undefined,
    ));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/college-competition/teams', async (req, res) => {
  try {
    const { userId, name } = req.body as { userId?: string; name?: string };
    const memberIds: string[] = Array.isArray(req.body.memberIds)
      ? [...new Set((req.body.memberIds as unknown[]).map((id) => String(id)))]
      : [];
    if (!userId || !name?.trim()) return res.status(400).json({ error: 'Team name and userId are required' });
    if (memberIds.length !== 3 || !memberIds.includes(userId)) {
      return res.status(400).json({ error: 'Every team must contain exactly three students, including you' });
    }
    const [competition] = await db.select().from(networkCompetitions)
      .where(eq(networkCompetitions.id, NETWORK_CHALLENGE_ID));
    if (!competition) return res.status(404).json({ error: 'Challenge not found' });
    if (new Date() > competition.registrationDeadline) {
      return res.status(409).json({ error: 'Team registration has closed' });
    }

    const memberRows = await db.select({
      id: users.id,
      college: users.college,
      isSuspended: users.isSuspended,
    }).from(users).where(inArray(users.id, memberIds));
    if (memberRows.length !== 3 || memberRows.some((member) => member.isSuspended)) {
      return res.status(400).json({ error: 'All three team members must be active Network students' });
    }
    const captain = memberRows.find((member) => member.id === userId);
    const college = canonicalizeCollegeName(captain?.college);
    if (!college) return res.status(400).json({ error: 'Your profile needs a college before you can represent it' });
    if (memberRows.some((member) => canonicalizeCollegeName(member.college) !== college)) {
      return res.status(400).json({ error: 'All three teammates must be from the same college for college rankings' });
    }

    const existingTeams = await db.select().from(networkCompetitionTeams)
      .where(eq(networkCompetitionTeams.competitionId, competition.id));
    if (existingTeams.some((team) =>
      (Array.isArray(team.memberIds) ? team.memberIds as string[] : []).some((id) => memberIds.includes(id)),
    )) {
      return res.status(409).json({ error: 'One of these students is already registered on a challenge team' });
    }

    const created = await db.insert(networkCompetitionTeams).values({
      id: generateId('challenge-team'),
      competitionId: competition.id,
      name: name.trim().slice(0, 80),
      college,
      captainId: userId,
      memberIds,
    }).returning();

    for (const memberId of memberIds.filter((id) => id !== userId)) {
      await createNotification(
        memberId,
        userId,
        'competition_team',
        'Challenge team registered',
        `${captain?.college || 'Your college'} is represented by ${name.trim()}.`,
      );
    }
    return res.status(201).json({
      team: created[0],
      snapshot: await getCollegeChallengeSnapshot(userId),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/college-competition/submissions', async (req, res) => {
  try {
    const {
      userId, teamId, title, summary, githubUrl, demoUrl, videoUrl, techStack,
    } = req.body as {
      userId?: string; teamId?: string; title?: string; summary?: string;
      githubUrl?: string; demoUrl?: string; videoUrl?: string; techStack?: unknown;
    };
    if (!userId || !teamId || !title?.trim() || !summary?.trim()) {
      return res.status(400).json({ error: 'Team, project title, and project description are required' });
    }
    const [competition] = await db.select().from(networkCompetitions)
      .where(eq(networkCompetitions.id, NETWORK_CHALLENGE_ID));
    if (!competition) return res.status(404).json({ error: 'Challenge not found' });
    if (new Date() > competition.submissionDeadline) {
      return res.status(409).json({ error: 'Project submissions are closed' });
    }
    const [team] = await db.select().from(networkCompetitionTeams)
      .where(and(eq(networkCompetitionTeams.id, teamId), eq(networkCompetitionTeams.competitionId, competition.id)));
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const teamMemberIds = Array.isArray(team.memberIds) ? team.memberIds as string[] : [];
    if (!teamMemberIds.includes(userId)) return res.status(403).json({ error: 'Only a team member can submit this project' });

    const cleanedTechStack = Array.isArray(techStack)
      ? [...new Set(techStack.map((item) => String(item).trim()).filter(Boolean))].slice(0, 8)
      : [];
    const cleaned = {
      title: title.trim().slice(0, 120),
      summary: summary.trim().slice(0, 5000),
      githubUrl: safeCompetitionUrl(githubUrl, true),
      demoUrl: safeCompetitionUrl(demoUrl, true),
      videoUrl: safeCompetitionUrl(videoUrl),
      techStack: cleanedTechStack,
      updatedAt: new Date(),
    };
    const [existing] = await db.select().from(networkCompetitionSubmissions)
      .where(eq(networkCompetitionSubmissions.teamId, teamId));
    const saved = existing
      ? await db.update(networkCompetitionSubmissions).set(cleaned)
        .where(eq(networkCompetitionSubmissions.id, existing.id)).returning()
      : await db.insert(networkCompetitionSubmissions).values({
        id: generateId('challenge-submission'),
        competitionId: competition.id,
        teamId,
        ...cleaned,
      }).returning();
    return res.json({
      submission: saved[0],
      snapshot: await getCollegeChallengeSnapshot(userId),
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/college-competition/submissions/:id/vote', async (req, res) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const [submission] = await db.select().from(networkCompetitionSubmissions)
      .where(eq(networkCompetitionSubmissions.id, req.params.id));
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    const [team] = await db.select().from(networkCompetitionTeams)
      .where(eq(networkCompetitionTeams.id, submission.teamId));
    const teamMemberIds = Array.isArray(team?.memberIds) ? team.memberIds as string[] : [];
    if (teamMemberIds.includes(userId)) return res.status(403).json({ error: 'Team members cannot vote for their own project' });
    const [existingVote] = await db.select().from(networkCompetitionVotes).where(and(
      eq(networkCompetitionVotes.submissionId, submission.id),
      eq(networkCompetitionVotes.voterId, userId),
    ));
    if (existingVote) {
      await db.delete(networkCompetitionVotes).where(eq(networkCompetitionVotes.id, existingVote.id));
    } else {
      await db.insert(networkCompetitionVotes).values({
        id: generateId('challenge-vote'),
        submissionId: submission.id,
        voterId: userId,
      });
    }
    return res.json(await getCollegeChallengeSnapshot(userId));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GROUP CHATS ─────────────────────────────────────────────────────────────

app.get('/api/group-chats', async (req, res) => {
  try {
    const userId = authenticatedChatUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign in to view group chats.' });
    const membership = JSON.stringify([userId]);
    const all = await db.select().from(groupChats).where(sql`
      ${groupChats.memberIds} @> ${membership}::jsonb
      OR ${groupChats.pendingIds} @> ${membership}::jsonb
    `).orderBy(desc(groupChats.createdAt));
    return res.json(all.map(g => ({ ...g, createdAt: g.createdAt.toISOString() })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/group-chats/community/:communityId', async (req, res) => {
  try {
    const userId = authenticatedChatUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign in to browse community groups.' });
    const communityId = Array.isArray(req.params.communityId) ? req.params.communityId[0] : req.params.communityId;
    const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
    if (!community) return res.status(404).json({ error: 'Community not found.' });
    const communityMemberIds = Array.isArray(community.memberIds) ? community.memberIds as string[] : [];
    if (!communityMemberIds.includes(userId) && !isCommunityAdmin(community, userId)) {
      return res.status(403).json({ error: 'Join this community to browse its groups.' });
    }
    const publicGroups = await db.select().from(groupChats).where(and(
      eq(groupChats.communityId, communityId),
      eq(groupChats.visibility, 'public'),
    )).orderBy(desc(groupChats.createdAt));
    return res.json(publicGroups.map(group => {
      const memberIds = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
      const isMember = memberIds.includes(userId);
      return {
        ...group,
        memberIds: isMember ? memberIds : [],
        pendingIds: [],
        memberCount: memberIds.length,
        isMember,
        createdAt: group.createdAt.toISOString(),
      };
    }));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/group-chats', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to create a group.' });
    const {
      name, type, creatorId, college, branch, inviteUserIds,
      communityId: requestedCommunityId, description, purpose, visibility,
    } = req.body;
    if (creatorId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Groups can only be created from your signed-in account.' });
    }
    const normalizedName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    const normalizedCollege = typeof college === 'string' ? college.trim().slice(0, 160) : '';
    const normalizedDescription = typeof description === 'string' ? description.trim().slice(0, 500) : '';
    const normalizedCommunityId = typeof requestedCommunityId === 'string' ? requestedCommunityId.trim() : '';
    const normalizedPurpose = purpose === undefined ? 'chat' : purpose;
    const normalizedVisibility = visibility === undefined ? 'private' : visibility;
    if (!normalizedName || !normalizedCollege) return res.status(400).json({ error: 'A group name and college are required.' });
    if (!['study', 'chat'].includes(normalizedPurpose)) return res.status(400).json({ error: 'Choose study or chat as the group purpose.' });
    if (!['public', 'private'].includes(normalizedVisibility)) return res.status(400).json({ error: 'Choose public or private group visibility.' });

    let communityMemberIds: string[] | null = null;
    if (normalizedCommunityId) {
      const [community] = await db.select().from(communities).where(eq(communities.id, normalizedCommunityId));
      if (!community) return res.status(404).json({ error: 'Community not found.' });
      communityMemberIds = Array.isArray(community.memberIds) ? community.memberIds as string[] : [];
      const isAdmin = isCommunityAdmin(community, authenticatedUserId);
      if (!communityMemberIds.includes(authenticatedUserId) && !isAdmin) {
        return res.status(403).json({ error: 'Join this community before creating one of its groups.' });
      }
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only community admins can create groups in this community.' });
      }
    }
    const requestedInvites = Array.isArray(inviteUserIds)
      ? [...new Set(inviteUserIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0 && id !== creatorId))].slice(0, 100)
      : [];
    if (communityMemberIds && requestedInvites.some(id => !communityMemberIds!.includes(id))) {
      return res.status(400).json({ error: 'Only members of this community can be invited to its groups.' });
    }
    const pending = requestedInvites;
    const created = await db.insert(groupChats).values({
      id: generateId('grp'),
      name: normalizedName,
      type: typeof type === 'string' && type.trim()
        ? type.trim().slice(0, 40)
        : normalizedPurpose === 'study' ? 'course' : 'interest',
      creatorId, college: normalizedCollege,
      branch: branch || null,
      communityId: normalizedCommunityId || null,
      description: normalizedDescription,
      purpose: normalizedPurpose,
      visibility: normalizedVisibility,
      memberIds: [creatorId],
      pendingIds: pending,
    }).returning();
    // Notify invited users
    for (const uid of pending) {
      await createNotification(uid, creatorId, 'group_invite', '👥 Group Invite', `You've been invited to join "${name}" [[group:${created[0].id}]]`);
       await dispatchPush(uid, {
        title: '👥 Group Invite',
        body: `You've been invited to join "${name}"`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `group-invite-${created[0].id}`,
        view: 'messages',
        type: 'group_invite',
        data: { groupId: created[0].id },
      });
    }
    return res.json({ ...created[0], createdAt: created[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/group-chats/:id/public-preview', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to open a group link.' });
    const [group] = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.visibility !== 'public') {
      return res.status(403).json({ error: 'This group is private. Ask a member to invite you.' });
    }
    if (group.communityId) {
      const [community] = await db.select().from(communities).where(eq(communities.id, group.communityId));
      const communityMemberIds = Array.isArray(community?.memberIds) ? community.memberIds as string[] : [];
      if (!community || !communityMemberIds.includes(authenticatedUserId)) {
        return res.status(403).json({ error: 'Join the community before opening its group.' });
      }
    }
    const memberIds = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
    return res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      purpose: group.purpose,
      visibility: group.visibility,
      memberCount: memberIds.length,
      createdAt: group.createdAt.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/group-chats/:id/visibility', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to change group access.' });
    const visibility = req.body.visibility;
    if (visibility !== 'public' && visibility !== 'private') {
      return res.status(400).json({ error: 'Choose public or private group visibility.' });
    }
    const [group] = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.creatorId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Only the group creator can change its access.' });
    }
    if (group.communityId) {
      const [community] = await db.select().from(communities).where(eq(communities.id, group.communityId));
      if (!community || !isCommunityAdmin(community, authenticatedUserId)) {
        return res.status(403).json({ error: 'Only a community admin can change this group’s access.' });
      }
    }
    const [updated] = await db.update(groupChats)
      .set({ visibility })
      .where(eq(groupChats.id, group.id))
      .returning();
    return res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      memberCount: Array.isArray(updated.memberIds) ? updated.memberIds.length : 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/group-chats/:id/join', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to join a group.' });
    const [group] = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.visibility !== 'public') {
      return res.status(403).json({ error: 'This is a private group. Ask a member to invite you.' });
    }
    if (group.communityId) {
      const [community] = await db.select().from(communities).where(eq(communities.id, group.communityId));
      const communityMemberIds = Array.isArray(community?.memberIds) ? community.memberIds as string[] : [];
      if (!community || !communityMemberIds.includes(authenticatedUserId)) {
        return res.status(403).json({ error: 'Join the community before joining its group.' });
      }
    }
    const members = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
    if (members.includes(authenticatedUserId)) {
      return res.json({ ...group, createdAt: group.createdAt.toISOString(), memberCount: members.length, isMember: true });
    }
    const updated = await db.update(groupChats).set({
      memberIds: [...members, authenticatedUserId],
      pendingIds: (Array.isArray(group.pendingIds) ? group.pendingIds as string[] : [])
        .filter(id => id !== authenticatedUserId),
    }).where(eq(groupChats.id, group.id)).returning();
    const updatedMembers = Array.isArray(updated[0].memberIds) ? updated[0].memberIds as string[] : [];
    return res.json({
      ...updated[0],
      createdAt: updated[0].createdAt.toISOString(),
      memberCount: updatedMembers.length,
      isMember: true,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/group-chats/:id/accept', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to accept a group invite.' });
    if (req.body.userId !== authenticatedUserId) {
      return res.status(403).json({ error: 'You can only accept your own group invite.' });
    }
    const found = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Group not found' });
    const g = found[0];
    const members = (g.memberIds as string[]) || [];
    const pendingIds = (g.pendingIds as string[]) || [];
    if (g.communityId) {
      const [community] = await db.select().from(communities).where(eq(communities.id, g.communityId));
      const communityMemberIds = Array.isArray(community?.memberIds) ? community.memberIds as string[] : [];
      if (!community || !communityMemberIds.includes(authenticatedUserId)) {
        return res.status(403).json({ error: 'Join the community before accepting this group invitation.' });
      }
    }
    if (!members.includes(authenticatedUserId) && !pendingIds.includes(authenticatedUserId)) {
      return res.status(403).json({ error: 'You do not have an invitation to this group.' });
    }
    const pending = pendingIds.filter(id => id !== authenticatedUserId);
    if (!members.includes(authenticatedUserId)) {
      const updated = await db.update(groupChats).set({
        memberIds: [...members, authenticatedUserId],
        pendingIds: pending,
      }).where(eq(groupChats.id, req.params.id)).returning();
      return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
    }
    return res.json({ ...g, createdAt: g.createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/group-chats/:id/decline', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to decline a group invite.' });
    if (req.body.userId !== authenticatedUserId) {
      return res.status(403).json({ error: 'You can only decline your own group invite.' });
    }
    const found = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Group not found' });
    const g = found[0];
    const currentPending = (g.pendingIds as string[]) || [];
    if (!currentPending.includes(authenticatedUserId)) {
      return res.status(403).json({ error: 'You do not have an invitation to this group.' });
    }
    const pending = currentPending.filter(id => id !== authenticatedUserId);
    const updated = await db.update(groupChats).set({ pendingIds: pending }).where(eq(groupChats.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/group-chats/:id/invite', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to invite group members.' });
    const { inviteUserIds, actorId } = req.body;
    if (actorId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Invites must be sent from your signed-in account.' });
    }
    const found = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Group not found' });
    const g = found[0];
    const members = (g.memberIds as string[]) || [];
    if (!members.includes(authenticatedUserId) && g.creatorId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Only group members can invite new members.' });
    }
    const requestedInviteIds = Array.isArray(inviteUserIds)
      ? [...new Set(inviteUserIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]
      : [];
    if (g.communityId) {
      const [community] = await db.select().from(communities).where(eq(communities.id, g.communityId));
      const communityMemberIds = Array.isArray(community?.memberIds) ? community.memberIds as string[] : [];
      if (!community || requestedInviteIds.some(id => !communityMemberIds.includes(id))) {
        return res.status(400).json({ error: 'Only members of this community can be invited to its groups.' });
      }
    }
    const pending = (g.pendingIds as string[]) || [];
    const newPending = [...new Set([...pending, ...requestedInviteIds.filter(id => !members.includes(id))])];
    const updated = await db.update(groupChats).set({ pendingIds: newPending }).where(eq(groupChats.id, req.params.id)).returning();
    // Only notify users who are genuinely newly invited (not already members, not already pending, not the actor)
    const trulyNew = requestedInviteIds.filter(
      (id: string) => id !== actorId && !members.includes(id) && !pending.includes(id)
    );
    for (const uid of trulyNew) {
      await createNotification(uid, actorId, 'group_invite', '👥 Group Invite', `You've been invited to join "${g.name}" [[group:${req.params.id}]]`);
       await dispatchPush(uid, {
        title: '👥 Group Invite',
        body: `You've been invited to join "${g.name}"`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `group-invite-${req.params.id}`,
        view: 'messages',
        type: 'group_invite',
        data: { groupId: req.params.id },
      });
    }
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/group-chats/:id/add-member', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to join a group.' });
    const { userId } = req.body;
    if (typeof userId !== 'string' || !userId) return res.status(400).json({ error: 'A user ID is required.' });
    const found = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Group not found' });
    const g = found[0];
    const members = (g.memberIds as string[]) || [];
    if (userId === authenticatedUserId && !members.includes(userId)) {
      return res.status(403).json({ error: 'Use the public join action or accept an invitation to join this group.' });
    }
    if (userId !== authenticatedUserId && !members.includes(authenticatedUserId) && g.creatorId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Only a group member can add someone else.' });
    }
    if (g.communityId) {
      const [community] = await db.select().from(communities).where(eq(communities.id, g.communityId));
      const communityMemberIds = Array.isArray(community?.memberIds) ? community.memberIds as string[] : [];
      if (!community || !communityMemberIds.includes(userId)) {
        return res.status(400).json({ error: 'Only members of this community can join its groups.' });
      }
    }
    if (members.includes(userId)) return res.json({ ...g, createdAt: g.createdAt.toISOString() });
    const updated = await db.update(groupChats).set({
      memberIds: [...members, userId],
      pendingIds: ((g.pendingIds as string[]) || []).filter((id: string) => id !== userId),
    }).where(eq(groupChats.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

app.put('/api/group-chats/:id/remove-member', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to leave a group.' });
    const { userId } = req.body;
    const found = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Group not found' });
    const g = found[0];
    const members = (g.memberIds as string[]) || [];
    if (!members.includes(authenticatedUserId) && g.creatorId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Only group members can change membership.' });
    }
    if (userId !== authenticatedUserId && g.creatorId !== authenticatedUserId) {
      return res.status(403).json({ error: 'You can only remove yourself from this group.' });
    }
    const updated = await db.update(groupChats).set({
      memberIds: members.filter((id: string) => id !== userId),
      pendingIds: ((g.pendingIds as string[]) || []).filter((id: string) => id !== userId),
    }).where(eq(groupChats.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

app.delete('/api/group-chats/:id', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to delete a group.' });
    const [group] = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.creatorId !== authenticatedUserId && (req as any).authUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Only the group creator can delete this group.' });
    }
    await db.delete(groupMessages).where(eq(groupMessages.groupId, req.params.id));
    await db.delete(groupChats).where(eq(groupChats.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/group-chats/:id/stream', async (req, res) => {
  try {
    const userId = authenticatedChatUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign in to open group chat.' });
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (requestedUserId && requestedUserId !== userId) {
      return res.status(403).json({ error: 'You can only open your own group chat stream.' });
    }
    const found = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Group not found' });
    const memberIds = Array.isArray(found[0].memberIds) ? found[0].memberIds as string[] : [];
    if (!userId || !memberIds.includes(userId)) {
      return res.status(403).json({ error: 'Join this group to use live chat' });
    }

    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    res.write(`event: ready\ndata: ${JSON.stringify({ groupId: req.params.id })}\n\n`);

    const streams = groupMessageStreams.get(req.params.id) || new Set<Response>();
    streams.add(res);
    groupMessageStreams.set(req.params.id, streams);
    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 25_000);
    const cleanup = () => {
      clearInterval(heartbeat);
      streams.delete(res);
      if (!streams.size) groupMessageStreams.delete(req.params.id);
    };
    req.on('close', cleanup);
  } catch (err: any) {
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    res.end();
  }
});

app.get('/api/group-chats/:id/messages', async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate');
    const userId = authenticatedChatUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign in to view group messages.' });
    const [group] = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    const memberIds = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
    if (!memberIds.includes(userId)) return res.status(403).json({ error: 'You are not a member of this group.' });
    const beforeId = typeof req.query.beforeId === 'string' ? req.query.beforeId : '';
    const limit = chatPageLimit(req.query.limit);
    let cursorFilter: ReturnType<typeof and> | undefined;
    if (beforeId) {
      const [cursor] = await db.select({
        id: groupMessages.id,
        createdAt: groupMessages.createdAt,
      }).from(groupMessages).where(and(
        eq(groupMessages.id, beforeId),
        eq(groupMessages.groupId, req.params.id),
      )).limit(1);
      if (!cursor) return res.status(400).json({ error: 'Invalid message history cursor.' });
      cursorFilter = or(
        lt(groupMessages.createdAt, cursor.createdAt),
        and(eq(groupMessages.createdAt, cursor.createdAt), lt(groupMessages.id, cursor.id)),
      );
    }
    const where = cursorFilter
      ? and(eq(groupMessages.groupId, req.params.id), cursorFilter)
      : eq(groupMessages.groupId, req.params.id);
    const msgs = await db.select().from(groupMessages)
      .where(where)
      .orderBy(desc(groupMessages.createdAt), desc(groupMessages.id))
      .limit(limit);
    const orderedMessages = msgs.reverse();
    const ownMessageIds = orderedMessages
      .filter((message) => message.senderId === userId)
      .map((message) => message.id);
    const seenByMessage = new Map<string, Array<{ id: string; name: string }>>();
    if (ownMessageIds.length) {
      const readPositions = await pool.query<{
        messageId: string;
        readerId: string;
        readerName: string | null;
      }>(
        `SELECT
           message.id AS "messageId",
           reader.id AS "readerId",
           reader.full_name AS "readerName"
         FROM group_messages AS message
         JOIN entity_chat_read_cursors AS read_position
           ON read_position.group_id = message.group_id
         JOIN group_messages AS seen_message
           ON seen_message.id = read_position.last_seen_message_id
          AND seen_message.group_id = read_position.group_id
         JOIN users AS reader
           ON reader.id = read_position.user_id
         WHERE message.group_id = $1
           AND message.sender_id = $2
           AND message.id = ANY($3::text[])
           AND read_position.user_id = ANY($4::text[])
           AND read_position.user_id <> message.sender_id
           AND (seen_message.created_at, seen_message.id) >= (message.created_at, message.id)
         ORDER BY read_position.seen_at DESC, reader.full_name`,
        [req.params.id, userId, ownMessageIds, memberIds],
      );
      for (const row of readPositions.rows) {
        const readers = seenByMessage.get(row.messageId) || [];
        readers.push({
          id: row.readerId,
          name: row.readerName?.trim() || 'Group member',
        });
        seenByMessage.set(row.messageId, readers);
      }
    }
    return res.json(orderedMessages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
      ...(message.senderId === userId
        ? { seenBy: seenByMessage.get(message.id) || [] }
        : {}),
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/group-chats/:id/seen', async (req, res) => {
  try {
    const userId = authenticatedChatUserId(req);
    if (!userId) return res.status(401).json({ error: 'Sign in to update group read receipts.' });
    const [group] = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    const memberIds = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
    if (!memberIds.includes(userId)) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }
    const upToMessageId = typeof req.body?.upToMessageId === 'string'
      ? req.body.upToMessageId.trim()
      : '';
    if (!upToMessageId || upToMessageId.length > 160) {
      return res.status(400).json({ error: 'A valid message ID is required.' });
    }
    const [targetMessage] = await db.select({ id: groupMessages.id })
      .from(groupMessages)
      .where(and(
        eq(groupMessages.id, upToMessageId),
        eq(groupMessages.groupId, req.params.id),
      ))
      .limit(1);
    if (!targetMessage) {
      return res.status(404).json({ error: 'That message could not be found in this group.' });
    }
    await pool.query(
      `INSERT INTO entity_chat_read_cursors
         (group_id, user_id, last_seen_message_id, seen_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (group_id, user_id) DO UPDATE
         SET last_seen_message_id = EXCLUDED.last_seen_message_id,
             seen_at = now()
       WHERE EXISTS (
         SELECT 1
         FROM group_messages AS next_message
         JOIN group_messages AS current_message
           ON current_message.id = entity_chat_read_cursors.last_seen_message_id
          AND current_message.group_id = entity_chat_read_cursors.group_id
         WHERE next_message.id = EXCLUDED.last_seen_message_id
           AND next_message.group_id = EXCLUDED.group_id
           AND (next_message.created_at, next_message.id)
             >= (current_message.created_at, current_message.id)
       )`,
      [req.params.id, userId, targetMessage.id],
    );
    return res.json({ ok: true, lastSeenMessageId: targetMessage.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/group-chats/:id/messages', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to send group messages.' });
    const {
      senderId,
      content,
      attachmentName,
      attachmentData,
      attachmentMimeType,
      pollOptions,
      replyToId,
      clientMessageId,
    } = req.body;
    const normalizedContent = typeof content === 'string' ? content.trim() : '';
    if (senderId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Messages can only be sent from your signed-in account.' });
    }
    if (normalizedContent.length > MAX_CHAT_CONTENT_LENGTH) {
      return res.status(413).json({ error: `Messages must be ${MAX_CHAT_CONTENT_LENGTH} characters or fewer.` });
    }
    const normalizedPollOptions = Array.isArray(pollOptions)
      ? pollOptions.map((option: unknown) => String(option).trim()).filter(Boolean).slice(0, 6)
      : [];
    if (!senderId || (!normalizedContent && !attachmentData && normalizedPollOptions.length < 2)) {
      return res.status(400).json({ error: 'A message, attachment, or poll is required.' });
    }
    if (typeof attachmentData === 'string' && attachmentData.length > 14_000_000) {
      return res.status(413).json({ error: 'Attachments must be 10 MB or smaller.' });
    }
    const found = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Group not found' });
    const group = found[0];
    const memberIds = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
    if (!memberIds.includes(authenticatedUserId)) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }
    const normalizedReplyToId = typeof replyToId === 'string' ? replyToId.trim().slice(0, 160) : '';
    if (normalizedReplyToId) {
      const [replyTarget] = await db.select({ id: groupMessages.id, groupId: groupMessages.groupId })
        .from(groupMessages).where(eq(groupMessages.id, normalizedReplyToId));
      if (!replyTarget || replyTarget.groupId !== req.params.id) {
        return res.status(400).json({ error: 'The message you are replying to is not in this circle.' });
      }
    }
    const normalizedClientMessageId = typeof clientMessageId === 'string'
      ? clientMessageId.trim().slice(0, 120)
      : '';
    const persistedMessageId = normalizedClientMessageId
      ? idempotentChatMessageId('gmsg', req.params.id, authenticatedUserId, normalizedClientMessageId)
      : generateId('gmsg');
    const created = await db.insert(groupMessages).values({
      id: persistedMessageId,
      groupId: req.params.id,
      senderId,
      content: normalizedContent,
      attachmentName: typeof attachmentName === 'string' ? attachmentName.trim() || null : null,
      attachmentData: typeof attachmentData === 'string' ? attachmentData : null,
      attachmentMimeType: typeof attachmentMimeType === 'string' ? attachmentMimeType : null,
      pollOptions: normalizedPollOptions.length >= 2 ? normalizedPollOptions : null,
      pollVotes: normalizedPollOptions.length >= 2 ? {} : null,
      replyToId: normalizedReplyToId || null,
    }).onConflictDoNothing().returning();
    if (!created.length) {
      const [existing] = await db.select().from(groupMessages).where(and(
        eq(groupMessages.id, persistedMessageId),
        eq(groupMessages.groupId, req.params.id),
        eq(groupMessages.senderId, authenticatedUserId),
      )).limit(1);
      if (!existing) return res.status(409).json({ error: 'Message could not be created.' });
      return res.json({
        ...existing,
        createdAt: existing.createdAt.toISOString(),
        ...(normalizedClientMessageId ? { clientMessageId: normalizedClientMessageId } : {}),
      });
    }
    const savedMessage = {
      ...created[0],
      createdAt: created[0].createdAt.toISOString(),
      ...(normalizedClientMessageId ? { clientMessageId: normalizedClientMessageId } : {}),
    };
    broadcastGroupMessage(req.params.id, savedMessage, memberIds, true);
    const sender = await db.select().from(users).where(eq(users.id, senderId));
    if (sender.length) {
      const senderName = sender[0].fullName;
      const notificationContent = normalizedContent || (
        normalizedPollOptions.length >= 2 ? `Poll: ${normalizedPollOptions[0]}` : `Shared ${attachmentName || 'a file'}`
      );
      const bodyPreview = notificationContent.length > 80 ? notificationContent.substring(0, 80) + '…' : notificationContent;
      const members = (Array.isArray(group.memberIds) ? group.memberIds : []) as string[];
      const deliveries = await Promise.allSettled(members.filter(uid => uid !== senderId).map(async uid => {
        await createNotification(
          uid,
          senderId,
          'group_message',
          `💬 ${group.name}`,
          `${senderName}: ${bodyPreview} [[group:${req.params.id}]]`,
        );
        await dispatchPush(uid, {
          title: group.name,
          body: `${senderName}: ${bodyPreview}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `grpmsg-${created[0].id}`,
          view: 'messages',
          type: 'group_message',
          senderAvatar: sender[0].avatar || null,
           data: { groupId: req.params.id, senderId, receiverId: uid, messageId: created[0].id },
        });
      }));
      if (deliveries.some(result => result.status === 'rejected')) {
        (req as any).log?.warn({ messageId: savedMessage.id }, 'Some group chat notifications could not be delivered');
      }
    }
    return res.json(savedMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/group-chats/:id/messages/:messageId/poll-vote', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to vote.' });
    const { optionIndex } = req.body;
    const [group] = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const memberIds = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
    if (!memberIds.includes(authenticatedUserId)) return res.status(403).json({ error: 'You are not a group member.' });
    const [message] = await db.select().from(groupMessages).where(eq(groupMessages.id, req.params.messageId));
    if (!message || message.groupId !== req.params.id) return res.status(404).json({ error: 'Message not found' });
    const options = Array.isArray(message.pollOptions) ? message.pollOptions : [];
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ error: 'Invalid poll option.' });
    }
    const updated = await db.update(groupMessages)
      .set({ pollVotes: { ...((message.pollVotes as Record<string, number>) || {}), [authenticatedUserId]: optionIndex } })
      .where(eq(groupMessages.id, req.params.messageId))
      .returning();
    const savedMessage = { ...updated[0], createdAt: updated[0].createdAt.toISOString() };
    broadcastGroupMessage(req.params.id, savedMessage);
    return res.json(savedMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/group-chats/:id/messages/:messageId/reaction', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to react.' });
    const { emoji } = req.body as { emoji?: string };
    if (!isChatReaction(emoji)) {
      return res.status(400).json({ error: 'Choose a supported reaction.' });
    }
    const [group] = await db.select().from(groupChats).where(eq(groupChats.id, req.params.id));
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const memberIds = Array.isArray(group.memberIds) ? group.memberIds as string[] : [];
    if (!memberIds.includes(authenticatedUserId)) return res.status(403).json({ error: 'You are not a group member.' });
    const [message] = await db.select().from(groupMessages).where(eq(groupMessages.id, req.params.messageId));
    if (!message || message.groupId !== req.params.id) return res.status(404).json({ error: 'Message not found' });
    const reactions = (message.reactions && typeof message.reactions === 'object'
      ? message.reactions
      : {}) as Record<string, unknown>;
    const users = Array.isArray(reactions[emoji])
      ? (reactions[emoji] as unknown[]).map(String)
      : [];
    const nextUsers = users.includes(authenticatedUserId)
      ? users.filter(id => id !== authenticatedUserId)
      : [...new Set([...users, authenticatedUserId])];
    const nextReactions = { ...reactions };
    if (nextUsers.length) nextReactions[emoji] = nextUsers;
    else delete nextReactions[emoji];
    const [updated] = await db.update(groupMessages)
      .set({ reactions: nextReactions })
      .where(eq(groupMessages.id, req.params.messageId))
      .returning();
    const savedMessage = { ...updated, createdAt: updated.createdAt.toISOString() };
    broadcastGroupMessage(req.params.id, savedMessage);
    return res.json(savedMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── COMMUNITY & PROJECT ENTITY MESSAGES ──────────────────────────────────────
// Reuses the group_messages table; groupId = "community:ID" or "project:ID"

app.get('/api/entity-messages/:type/:id/stream', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to open community chat.' });
    const { type, id } = req.params;
    if (type !== 'community' && type !== 'project') {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const entity = type === 'community'
      ? (await db.select().from(communities).where(eq(communities.id, id)))[0]
      : (await db.select().from(projects).where(eq(projects.id, id)))[0];
    if (!entity) return res.status(404).json({ error: `${type} not found` });

    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: 'You can only open your own chat stream.' });
    }
    const memberIds = [
      ...(Array.isArray(entity.memberIds) ? entity.memberIds as string[] : []),
      ...(type === 'project' && entity.creatorId ? [entity.creatorId] : []),
    ];
    if (!memberIds.includes(authenticatedUserId)) {
      return res.status(403).json({ error: 'Join this community to use live chat' });
    }

    const gid = `${type}:${id}`;
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    res.write(`event: ready\ndata: ${JSON.stringify({ groupId: gid })}\n\n`);

    const streams = entityChatStreams.get(gid) || new Set<Response>();
    streams.add(res);
    entityChatStreams.set(gid, streams);

    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 25_000);

    const cleanup = () => {
      clearInterval(heartbeat);
      streams.delete(res);
      if (!streams.size) entityChatStreams.delete(gid);
    };
    req.on('close', cleanup);
  } catch (err: any) {
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    res.end();
  }
});

app.get('/api/entity-messages/:type/:id', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate');
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to view community messages.' });
    const { type, id } = req.params;
    if (type !== 'community' && type !== 'project') {
      return res.status(400).json({ error: 'Invalid entity type.' });
    }
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: 'You can only view your own chat history.' });
    }
    const entity = type === 'community'
      ? (await db.select().from(communities).where(eq(communities.id, id)))[0]
      : (await db.select().from(projects).where(eq(projects.id, id)))[0];
    if (!entity) return res.status(404).json({ error: `${type} not found.` });
    const memberIds = [
      ...(Array.isArray(entity.memberIds) ? entity.memberIds as string[] : []),
      ...(type === 'project' && entity.creatorId ? [entity.creatorId] : []),
    ];
    if (!memberIds.includes(authenticatedUserId)) {
      return res.status(403).json({ error: 'You are not a member of this chat.' });
    }
    const gid = `${type}:${id}`;
    const beforeId = typeof req.query.beforeId === 'string' ? req.query.beforeId : '';
    const limit = chatPageLimit(req.query.limit);
    let cursorFilter: ReturnType<typeof and> | undefined;
    if (beforeId) {
      const [cursor] = await db.select({
        id: groupMessages.id,
        createdAt: groupMessages.createdAt,
      }).from(groupMessages).where(and(
        eq(groupMessages.id, beforeId),
        eq(groupMessages.groupId, gid),
      )).limit(1);
      if (!cursor) return res.status(400).json({ error: 'Invalid message history cursor.' });
      cursorFilter = or(
        lt(groupMessages.createdAt, cursor.createdAt),
        and(eq(groupMessages.createdAt, cursor.createdAt), lt(groupMessages.id, cursor.id)),
      );
    }
    const where = cursorFilter
      ? and(eq(groupMessages.groupId, gid), cursorFilter)
      : eq(groupMessages.groupId, gid);
    const msgs = await db.select().from(groupMessages)
      .where(where)
      .orderBy(desc(groupMessages.createdAt), desc(groupMessages.id))
      .limit(limit);
    const hydratedMessages = await hydrateEntityChatMessages(msgs.reverse());
    const ownMessageIds = hydratedMessages
      .filter((message) => message.senderId === authenticatedUserId)
      .map((message) => message.id);
    const seenByMessage = new Map<string, Array<{ id: string; name: string }>>();
    if (ownMessageIds.length) {
      const readPositions = await pool.query<{
        messageId: string;
        readerId: string;
        readerName: string | null;
      }>(
        `SELECT
           message.id AS "messageId",
           reader.id AS "readerId",
           reader.full_name AS "readerName"
         FROM group_messages AS message
         JOIN entity_chat_read_cursors AS read_position
           ON read_position.group_id = message.group_id
         JOIN group_messages AS seen_message
           ON seen_message.id = read_position.last_seen_message_id
          AND seen_message.group_id = read_position.group_id
         JOIN users AS reader
           ON reader.id = read_position.user_id
         WHERE message.group_id = $1
           AND message.sender_id = $2
           AND message.id = ANY($3::text[])
           AND read_position.user_id <> message.sender_id
           AND (seen_message.created_at, seen_message.id) >= (message.created_at, message.id)
         ORDER BY read_position.seen_at DESC, reader.full_name`,
        [gid, authenticatedUserId, ownMessageIds],
      );
      for (const row of readPositions.rows) {
        const readers = seenByMessage.get(row.messageId) || [];
        readers.push({
          id: row.readerId,
          name: row.readerName?.trim() || 'Community member',
        });
        seenByMessage.set(row.messageId, readers);
      }
    }
    return res.json(hydratedMessages.map((message) => ({
      ...message,
      ...(message.senderId === authenticatedUserId
        ? { seenBy: seenByMessage.get(message.id) || [] }
        : {}),
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/entity-messages/:type/:id/seen', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to update chat read receipts.' });
    const { type, id } = req.params;
    const upToMessageId = typeof req.body?.upToMessageId === 'string'
      ? req.body.upToMessageId.trim()
      : '';
    if (type !== 'community' && type !== 'project') {
      return res.status(400).json({ error: 'Invalid entity type.' });
    }
    if (!upToMessageId || upToMessageId.length > 160) {
      return res.status(400).json({ error: 'A valid message ID is required.' });
    }
    const entity = type === 'community'
      ? (await db.select().from(communities).where(eq(communities.id, id)))[0]
      : (await db.select().from(projects).where(eq(projects.id, id)))[0];
    if (!entity) return res.status(404).json({ error: `${type} not found.` });
    const memberIds = [
      ...(Array.isArray(entity.memberIds) ? entity.memberIds as string[] : []),
      ...(type === 'project' && entity.creatorId ? [entity.creatorId] : []),
    ];
    if (!memberIds.includes(authenticatedUserId)) {
      return res.status(403).json({ error: 'Join this community to update read receipts.' });
    }
    const groupId = `${type}:${id}`;
    const [targetMessage] = await db.select({ id: groupMessages.id })
      .from(groupMessages)
      .where(and(
        eq(groupMessages.id, upToMessageId),
        eq(groupMessages.groupId, groupId),
      ))
      .limit(1);
    if (!targetMessage) return res.status(404).json({ error: 'That message could not be found in this chat.' });
    await pool.query(
      `INSERT INTO entity_chat_read_cursors
         (group_id, user_id, last_seen_message_id, seen_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (group_id, user_id) DO UPDATE
         SET last_seen_message_id = EXCLUDED.last_seen_message_id,
             seen_at = now()
       WHERE EXISTS (
         SELECT 1
         FROM group_messages AS next_message
         JOIN group_messages AS current_message
           ON current_message.id = entity_chat_read_cursors.last_seen_message_id
          AND current_message.group_id = entity_chat_read_cursors.group_id
         WHERE next_message.id = EXCLUDED.last_seen_message_id
           AND next_message.group_id = EXCLUDED.group_id
           AND (next_message.created_at, next_message.id)
             >= (current_message.created_at, current_message.id)
       )`,
      [groupId, authenticatedUserId, targetMessage.id],
    );
    return res.json({ ok: true, lastSeenMessageId: targetMessage.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/entity-messages/:type/:id', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to send community messages.' });
    const {
      senderId,
      content,
      attachmentName,
      attachmentData,
      attachmentMimeType,
      replyToId,
      sharedPostId,
      clientMessageId,
    } = req.body;
    if (req.params.type !== 'community' && req.params.type !== 'project') {
      return res.status(400).json({ error: 'Invalid entity type' });
    }
    const normalizedSharedPostId = typeof sharedPostId === 'string' ? sharedPostId.trim() : '';
    const userContent = typeof content === 'string'
      ? content.replace(/\[\[shared-post:[^\]]{1,160}\]\]/g, '').trim()
      : '';
    if (senderId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Messages can only be sent from your signed-in account.' });
    }
    if (userContent.length > MAX_CHAT_CONTENT_LENGTH) {
      return res.status(413).json({ error: `Messages must be ${MAX_CHAT_CONTENT_LENGTH} characters or fewer.` });
    }
    if (normalizedSharedPostId && req.params.type !== 'community') {
      return res.status(400).json({ error: 'Posts can only be shared in community chats.' });
    }
    if (typeof attachmentData === 'string' && attachmentData.length > 14_000_000) {
      return res.status(413).json({ error: 'Attachments must be 10 MB or smaller.' });
    }
    let sharedPost: EntitySharedPostPreview | null = null;
    if (normalizedSharedPostId) {
      sharedPost = (await loadSharedPostPreviews([normalizedSharedPostId])).get(normalizedSharedPostId) || null;
      if (!sharedPost) return res.status(404).json({ error: 'That post could not be found.' });
    }
    const normalizedContent = [
      userContent,
      ...(normalizedSharedPostId ? [`[[shared-post:${normalizedSharedPostId}]]`] : []),
    ].filter(Boolean).join('\n');
    if (!senderId || (!normalizedContent && !attachmentData)) {
      return res.status(400).json({ error: 'A message, attachment, or shared post is required.' });
    }
    const gid = `${req.params.type}:${req.params.id}`;
    const entity = req.params.type === 'community'
      ? (await db.select().from(communities).where(eq(communities.id, req.params.id)))[0]
      : (await db.select().from(projects).where(eq(projects.id, req.params.id)))[0];
    if (!entity) return res.status(404).json({ error: `${req.params.type} not found` });

    const memberIds = [
      ...(Array.isArray(entity.memberIds) ? entity.memberIds as string[] : []),
      ...(req.params.type === 'project' && entity.creatorId ? [entity.creatorId] : []),
    ];
    if (!memberIds.includes(senderId)) {
      return res.status(403).json({ error: 'Join this community to send messages' });
    }

    const normalizedReplyToId = typeof replyToId === 'string' ? replyToId.trim().slice(0, 160) : '';
    if (normalizedReplyToId) {
      const [replyTarget] = await db.select({
        id: groupMessages.id,
        groupId: groupMessages.groupId,
      }).from(groupMessages).where(eq(groupMessages.id, normalizedReplyToId));
      if (!replyTarget || replyTarget.groupId !== gid) {
        return res.status(400).json({ error: 'The message you are replying to is not in this chat.' });
      }
    }

    const normalizedClientMessageId = typeof clientMessageId === 'string'
      ? clientMessageId.trim().slice(0, 120)
      : '';
    const persistedMessageId = normalizedClientMessageId
      ? idempotentChatMessageId('emsg', gid, authenticatedUserId, normalizedClientMessageId)
      : generateId('emsg');
    const created = await db.insert(groupMessages).values({
      id: persistedMessageId,
      groupId: gid,
      senderId,
      content: normalizedContent,
      attachmentName: typeof attachmentName === 'string' ? attachmentName.trim() || null : null,
      attachmentData: typeof attachmentData === 'string' ? attachmentData : null,
      attachmentMimeType: typeof attachmentMimeType === 'string' ? attachmentMimeType : null,
      replyToId: normalizedReplyToId || null,
    }).onConflictDoNothing().returning();
    if (!created.length) {
      const [existing] = await db.select().from(groupMessages).where(and(
        eq(groupMessages.id, persistedMessageId),
        eq(groupMessages.groupId, gid),
        eq(groupMessages.senderId, authenticatedUserId),
      )).limit(1);
      if (!existing) return res.status(409).json({ error: 'Message could not be created.' });
      const [existingMessage] = await hydrateEntityChatMessages([existing]);
      return res.json({
        ...existingMessage,
        ...(normalizedClientMessageId ? { clientMessageId: normalizedClientMessageId } : {}),
      });
    }
    const [createdMessage] = await hydrateEntityChatMessages(created);
    const responseMessage = {
      ...createdMessage,
      ...(normalizedClientMessageId ? { clientMessageId: normalizedClientMessageId } : {}),
    };
    broadcastEntityMessage(gid, responseMessage, memberIds, true);

    const sender = (await db.select().from(users).where(eq(users.id, senderId)))[0];
    if (sender) {
      const rawMembers = Array.isArray(entity.memberIds) ? entity.memberIds as string[] : [];
      const memberIds = [...new Set([
        ...rawMembers,
        ...(req.params.type === 'project' ? [entity.creatorId] : []),
      ])].filter((id): id is string => typeof id === 'string' && id.length > 0 && id !== senderId);
      const notificationText = sharedPost
        ? `Shared a post: ${sharedPost.title}`
        : normalizedContent || (
        typeof attachmentMimeType === 'string' && attachmentMimeType.startsWith('image/')
          ? 'Photo'
          : (typeof attachmentName === 'string' && attachmentName.trim()) || 'Attachment'
      );
      const preview = notificationText.length > 80 ? notificationText.substring(0, 80) + '…' : notificationText;
      const entityName = (entity as { name?: string; title?: string }).name
        || (entity as { name?: string; title?: string }).title
        || 'The Network';
      const type = req.params.type === 'community' ? 'community_message' : 'project_message';
      const view = req.params.type === 'community' ? 'messages' : 'projects';
      const mentionCandidates = req.params.type === 'community' && memberIds.length &&
        /(?:^|[\s([{])@[a-z0-9][a-z0-9._-]*/i.test(normalizedContent)
        ? await db.select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
          }).from(users).where(inArray(users.id, memberIds))
        : [];
      const broadcastMention = req.params.type === 'community'
        && hasBroadcastMention(normalizedContent);
      const mentionedMemberIds = new Set(
        broadcastMention
          ? memberIds
          : extractMentionedUserIds(normalizedContent, mentionCandidates)
            .filter(userId => memberIds.includes(userId)),
      );

      if (broadcastMention) {
        await sendCommunityPostActivityEmail({
          recipientEmails: mentionCandidates.map(candidate => candidate.email),
          subject: `${sender.fullName} mentioned everyone in ${entityName}`,
          title: `${sender.fullName} mentioned everyone`,
          body: `${sender.fullName} mentioned everyone in ${entityName}:\n\n${preview}`,
          view: 'messages',
          params: { communityId: req.params.id },
          ctaLabel: 'Open community chat',
          context: 'community-wide chat mention email',
        }).catch(() => {
          (req as any).log?.warn({ messageId: created[0].id }, 'Community mention email could not be delivered');
        });
      }

      const deliveryResults = await Promise.allSettled(memberIds.map(async userId => {
        const isMentioned = mentionedMemberIds.has(userId);
        const notificationType = isMentioned ? 'mention' : type;
        const mentionTitle = broadcastMention
          ? `🔔 ${sender.fullName} mentioned everyone`
          : `🔔 ${sender.fullName} mentioned you`;
        const notificationTitle = isMentioned
          ? mentionTitle
          : `💬 ${entityName}`;
        const marker = req.params.type === 'community'
          ? ` [[community:${req.params.id}]]`
          : ` [[project:${req.params.id}]]`;
        const notificationBody = isMentioned
          ? `${sender.fullName} ${broadcastMention ? 'mentioned everyone' : 'mentioned you'} in ${entityName}: ${preview}${marker}`
          : `${sender.fullName}: ${preview}${marker}`;
        await createNotification(userId, senderId, notificationType, notificationTitle, notificationBody);
        await dispatchPush(userId, {
          title: isMentioned ? notificationTitle : entityName,
          body: isMentioned
            ? `${sender.fullName} ${broadcastMention ? 'mentioned everyone' : 'mentioned you'} in ${entityName}: ${preview}`
            : `${sender.fullName}: ${preview}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `${notificationType}-${req.params.id}-${created[0].id}-${userId}`,
          view,
          type: notificationType,
          senderAvatar: sender.avatar || null,
          data: {
            entityId: req.params.id,
            communityId: req.params.type === 'community' ? req.params.id : undefined,
            projectId: req.params.type === 'project' ? req.params.id : undefined,
            senderId,
              messageId: created[0].id,
          },
        });
          if (isMentioned && !broadcastMention) {
           const mentionedUser = mentionCandidates.find(candidate => candidate.id === userId);
           await sendImmediateActivityEmail({
             recipient: mentionedUser || {},
             subject: `${sender.fullName} mentioned you in ${entityName}`,
             title: `${sender.fullName} mentioned you`,
             body: `${sender.fullName} mentioned you in ${entityName}:\n\n${preview}`,
             view,
             params: req.params.type === 'community'
                ? { communityId: req.params.id }
                : { projectId: req.params.id },
           }).catch(() => {
             (req as any).log?.warn({ messageId: created[0].id, userId }, 'Chat mention email could not be delivered');
           });
         }
      }));
      if (deliveryResults.some(result => result.status === 'rejected')) {
        (req as any).log?.warn({ messageId: created[0].id }, 'Some community chat notifications could not be delivered');
      }
    }

    return res.json(responseMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/entity-messages/:type/:id/messages/:messageId/reaction', async (req, res) => {
  try {
    const authenticatedUserId = authenticatedChatUserId(req);
    if (!authenticatedUserId) return res.status(401).json({ error: 'Sign in to react.' });
    const { type, id, messageId } = req.params;
    const { emoji } = req.body as { emoji?: string };
    if (type !== 'community' && type !== 'project') {
      return res.status(400).json({ error: 'Invalid entity type' });
    }
    if (!isChatReaction(emoji)) {
      return res.status(400).json({ error: 'Choose a supported reaction.' });
    }

    const entity = type === 'community'
      ? (await db.select().from(communities).where(eq(communities.id, id)))[0]
      : (await db.select().from(projects).where(eq(projects.id, id)))[0];
    if (!entity) return res.status(404).json({ error: `${type} not found` });

    const memberIds = [
      ...(Array.isArray(entity.memberIds) ? entity.memberIds as string[] : []),
      ...(type === 'project' && entity.creatorId ? [entity.creatorId] : []),
    ];
    if (!memberIds.includes(authenticatedUserId)) {
      return res.status(403).json({ error: 'Join this chat to react to messages.' });
    }

    const gid = `${type}:${id}`;
    const [message] = await db.select().from(groupMessages).where(eq(groupMessages.id, messageId));
    if (!message || message.groupId !== gid) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = message.reactions && typeof message.reactions === 'object'
      ? message.reactions as Record<string, unknown>
      : {};
    const users = Array.isArray(reactions[emoji])
      ? (reactions[emoji] as unknown[]).map(String)
      : [];
    const nextUsers = users.includes(authenticatedUserId)
      ? users.filter((id) => id !== authenticatedUserId)
      : [...new Set([...users, authenticatedUserId])];
    const nextReactions = { ...reactions };
    if (nextUsers.length) nextReactions[emoji] = nextUsers;
    else delete nextReactions[emoji];

    const [updated] = await db.update(groupMessages)
      .set({ reactions: nextReactions })
      .where(eq(groupMessages.id, messageId))
      .returning();
    const savedMessage = { ...updated, createdAt: updated.createdAt.toISOString() };
    broadcastEntityMessage(gid, savedMessage);
    return res.json(savedMessage);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────────

// Public VAPID material is safe to expose to browsers; the private key never
// leaves this process. Firebase Hosting clients use this same backend.
app.get('/api/push/capabilities', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json({
    fcm: Boolean(fcmApp),
    webPush: Boolean(VAPID_PUBLIC && vapidEnabled),
  });
});

app.get('/api/push/vapid-public', (_req, res) => {
  if (!VAPID_PUBLIC || !vapidEnabled) {
    return res.status(503).json({ error: 'Web Push is not configured.' });
  }
  return res.json({ publicKey: VAPID_PUBLIC });
});

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { userId, endpoint, p256dh, auth } = req.body;
    if (!userId || !endpoint || !p256dh || !auth) return res.status(400).json({ error: 'Missing fields' });
    // Reject corrupted subscriptions before they pollute the DB
    if (!isValidP256dh(p256dh)) {
      console.warn('[push] rejected subscription with invalid p256dh for user', userId);
      return res.status(400).json({ error: 'Invalid p256dh key — please re-subscribe' });
    }
    await db.insert(pushSubscriptions).values({
      id: generateId('psub'),
      userId, endpoint, p256dh, auth,
    }).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh, auth } });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/push/subscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Check if an endpoint is already registered in the DB
app.post('/api/push/check', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return res.json({ registered: subs.length > 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Inline reply from push notification (Android messaging style)
app.post('/api/push/reply', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    if (!senderId || !receiverId || !content) return res.status(400).json({ error: 'senderId, receiverId and content required' });
    const newMsg = await db.insert(messages).values({
      id: generateId('msg'),
      senderId, receiverId, content,
      isRead: false,
    }).returning();
    const sender = await db.select().from(users).where(eq(users.id, senderId));
    if (sender.length) {
      const receiver = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, receiverId));
      const preview = content.length > 80 ? content.substring(0, 80) + '…' : content;
      await createNotification(receiverId, senderId, 'message', sender[0].fullName, preview);
      await Promise.all([
        dispatchPush(receiverId, {
          title: sender[0].fullName,
          body: preview,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `msg-${newMsg[0].id}`,
          view: 'messages',
          type: 'message',
          senderAvatar: sender[0].avatar || null,
          data: { userId: senderId, senderId, receiverId, messageId: newMsg[0].id },
        }),
        sendActivityEmail({
          recipient: receiver[0] || {},
          subject: `${sender[0].fullName} sent you a message`,
          title: `New message from ${sender[0].fullName}`,
          body: preview,
          view: 'messages',
          params: { userId: senderId },
          context: 'push reply message email',
        }),
      ]);
    }
    return res.json({ ...newMsg[0], createdAt: newMsg[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Test push — sends a test notification to the requesting user
app.post('/api/push/test', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    if (!subs.length) return res.status(404).json({ error: 'No push subscription found. Please enable notifications first.' });
    await sendPushToUser(userId, {
      title: '🔔 Test Notification',
      body: 'Push notifications are working on The Network! You\'ll get alerts for messages, connections & more.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-push',
      view: 'notifications',
    });
    return res.json({ ok: true, subscriptionCount: subs.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── COLLEGE ADMIN ────────────────────────────────────────────────────────────

// Assign or revoke college admin (super-admin only)
app.put('/api/admin/college-admin', async (req, res) => {
  try {
    const { userId, college } = req.body; // college = null to revoke
    const updated = await db.update(users)
      .set({
        role: college ? 'college_admin' : 'student',
        collegeAdminOf: college || null,
      })
      .where(eq(users.id, userId))
      .returning();
    if (!updated.length) return res.status(404).json({ error: 'User not found' });
    return res.json(toUserProfile(updated[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get announcements for a college
app.get('/api/college-announcements/:college', async (req, res) => {
  try {
    const college = decodeURIComponent(req.params.college);
    const all = await db.select().from(collegeAnnouncements)
      .where(eq(collegeAnnouncements.college, college))
      .orderBy(desc(collegeAnnouncements.createdAt));
    return res.json(all.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create announcement
app.post('/api/college-announcements', async (req, res) => {
  try {
    const { college, authorId, title, body, isPinned } = req.body;
    if (!college || !authorId || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const created = await db.insert(collegeAnnouncements).values({
      id: generateId('ann'),
      college, authorId, title, body,
      isPinned: isPinned || false,
    }).returning();

    // Push + in-app notification to all users in this college
    const bodyPreview = body.length > 100 ? body.substring(0, 100) + '…' : body;
    const collegeUsers = await db.select({ id: users.id }).from(users).where(eq(users.college, college));
    for (const u of collegeUsers) {
      if (u.id === authorId) continue;
      await createNotification(u.id, authorId, 'announcement', `📢 ${title}`, bodyPreview);
         await dispatchPush(u.id, {
        title: `📢 ${title}`,
        body: bodyPreview,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `ann-${created[0].id}`,
        view: 'announcements',
      });
    }

    return res.json({ ...created[0], createdAt: created[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update announcement (pin/unpin or edit)
app.put('/api/college-announcements/:id', async (req, res) => {
  try {
    const { title, body, isPinned } = req.body;
    const found = await db.select().from(collegeAnnouncements).where(eq(collegeAnnouncements.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Not found' });
    const updated = await db.update(collegeAnnouncements).set({
      title: title ?? found[0].title,
      body: body ?? found[0].body,
      isPinned: isPinned ?? found[0].isPinned,
    }).where(eq(collegeAnnouncements.id, req.params.id)).returning();
    return res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete announcement
app.delete('/api/college-announcements/:id', async (req, res) => {
  try {
    await db.delete(collegeAnnouncements).where(eq(collegeAnnouncements.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── COLLEGE SETTINGS (cover photo) ──────────────────────────────────────────

app.get('/api/college-settings', async (_req, res) => {
  try {
    const rows = await db.select().from(collegeSettings);
    const map: Record<string, string | null> = {};
    rows.forEach(r => { map[r.college] = r.coverImage ?? null; });
    return res.json(map);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

app.put('/api/college-settings/:college', async (req, res) => {
  try {
    const { coverImage } = req.body;
    const col = decodeURIComponent(req.params.college);
    await db.insert(collegeSettings)
      .values({ college: col, coverImage: coverImage ?? null })
      .onConflictDoUpdate({ target: collegeSettings.college, set: { coverImage: coverImage ?? null, updatedAt: new Date() } });
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ─── ATTENDANCE TRACKER ───────────────────────────────────────────────────────

app.get('/api/attendance/:userId', async (req, res) => {
  try {
    const rows = await db.select().from(attendanceSubjects)
      .where(eq(attendanceSubjects.userId, req.params.userId))
      .orderBy(attendanceSubjects.createdAt);
    return res.json(rows);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { userId, name, targetPercent } = req.body;
    const created = await db.insert(attendanceSubjects).values({
      id: generateId('att'),
      userId, name,
      totalClasses: 0,
      presentClasses: 0,
      targetPercent: targetPercent ?? 75,
    }).returning();
    return res.json(created[0]);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

app.put('/api/attendance/:id/mark', async (req, res) => {
  try {
    const { present } = req.body;
    const found = await db.select().from(attendanceSubjects).where(eq(attendanceSubjects.id, req.params.id));
    if (!found.length) return res.status(404).json({ error: 'Not found' });
    const s = found[0];
    const updated = await db.update(attendanceSubjects).set({
      totalClasses: s.totalClasses + 1,
      presentClasses: present ? s.presentClasses + 1 : s.presentClasses,
    }).where(eq(attendanceSubjects.id, req.params.id)).returning();
    return res.json(updated[0]);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

app.delete('/api/attendance/:id', async (req, res) => {
  try {
    await db.delete(attendanceSubjects).where(eq(attendanceSubjects.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ─── BATCH GROUP AUTO-ENSURE ──────────────────────────────────────────────────

app.post('/api/batch-group/ensure', async (req, res) => {
  try {
    const { userId } = req.body;
    const userRows = await db.select().from(users).where(eq(users.id, userId));
    if (!userRows.length) return res.status(404).json({ error: 'User not found' });
    const u = userRows[0];

    const batchName = `${u.college} · ${u.branch} · Year ${u.year}`;
    const all = await db.select().from(groupChats);
    let batchGroup = all.find(g => g.type === 'batch' && g.name === batchName);

    if (!batchGroup) {
      const created = await db.insert(groupChats).values({
        id: generateId('batch'),
        name: batchName,
        type: 'batch',
        creatorId: userId,
        college: u.college,
        branch: u.branch ?? null,
        memberIds: [userId],
        pendingIds: [],
      }).returning();
      batchGroup = created[0];
    } else {
      const members = (batchGroup.memberIds as string[]) || [];
      if (!members.includes(userId)) {
        const updated = await db.update(groupChats)
          .set({ memberIds: [...members, userId] })
          .where(eq(groupChats.id, batchGroup.id))
          .returning();
        batchGroup = updated[0];
      }
    }
    return res.json({ ...batchGroup, createdAt: batchGroup.createdAt.toISOString() });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ─── REFERRAL ENDPOINTS ──────────────────────────────────────────────────────

// GET /api/referral/stats/:userId — get referral code + count + who they invited
app.get('/api/referral/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (!user.length) return res.status(404).json({ error: 'User not found' });
    const code = userId.slice(-8).toUpperCase();
    const myReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, userId));
    const invitedIds = myReferrals.map(r => r.referredUserId);
    const invitedUsers = invitedIds.length
      ? await db.select({ id: users.id, fullName: users.fullName, avatar: users.avatar, college: users.college })
          .from(users).where(or(...invitedIds.map(id => eq(users.id, id))))
      : [];
    return res.json({ code, count: myReferrals.length, invitedUsers });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ── FIND PEOPLE ──────────────────────────────────────────────────────────────

// List requests (exclude own, active only)
app.get('/api/find-people/requests', async (req, res) => {
  try {
    const { userId, purpose } = req.query as { userId?: string; purpose?: string };

    // Single aggregation query for counts + has-applied flag — avoids fetching all rows
    const aggRows = await db.execute(sql`
      SELECT
        request_id,
        COUNT(*)::int                                                         AS cnt,
        bool_or(applicant_id = ${userId ?? ''})                               AS has_applied
      FROM find_people_applications
      GROUP BY request_id
    `);
    const agg = aggRows.rows as { request_id: string; cnt: number; has_applied: boolean }[];
    const countMap: Record<string, number>   = {};
    const appliedSet = new Set<string>();
    for (const a of agg) {
      countMap[a.request_id] = a.cnt;
      if (a.has_applied) appliedSet.add(a.request_id);
    }

    // Fetch only active requests, excluding the current user's own
    let rows = await db.select().from(findPeopleRequests)
      .where(eq(findPeopleRequests.status, 'active'))
      .orderBy(desc(findPeopleRequests.createdAt));
    if (userId) rows = rows.filter(r => r.hostId !== userId);
    if (purpose && purpose !== 'All') rows = rows.filter(r => r.purpose === purpose);

    // Batch-fetch hosts in one query
    const hostIds = [...new Set(rows.map(r => r.hostId))];
    const hosts = hostIds.length
      ? await db.select().from(users).where(or(...hostIds.map(id => eq(users.id, id))))
      : [];
    const hostMap = Object.fromEntries(hosts.map(h => [h.id, h]));

    const enriched = rows.map(r => ({
      ...r,
      host: hostMap[r.hostId]
        ? (() => { const { passwordHash: _, ...rest } = hostMap[r.hostId] as any; return rest; })()
        : null,
      applicantCount: countMap[r.id] || 0,
      hasApplied: appliedSet.has(r.id),
    }));
    return res.json(enriched);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Create a request
app.post('/api/find-people/requests', async (req, res) => {
  try {
    const { hostId, purpose, title, description, eligibilityCollege, eligibilityYear,
      eligibilityBranch, genderPreference, maxApplicants, preferredTime, meetingLocation } = req.body;
    if (!hostId || !purpose || !title || !description) return res.status(400).json({ error: 'Missing required fields' });
    const host = await db.select().from(users).where(eq(users.id, hostId)).then(r => r[0]);
    if (!host) return res.status(404).json({ error: 'User not found' });
    const id = generateId('fpr');
    await db.insert(findPeopleRequests).values({
      id, hostId, purpose, title, description,
      eligibilityCollege: eligibilityCollege || 'same',
      eligibilityYear: eligibilityYear || 'Any',
      eligibilityBranch: eligibilityBranch || 'Any',
      genderPreference: genderPreference || 'Anyone',
      maxApplicants: maxApplicants || 5,
      preferredTime: preferredTime || '',
      meetingLocation: meetingLocation || '',
      status: 'active',
      college: host.college,
    });
    await db.update(users)
      .set({ connectPreference: connectPreferenceForPurpose(purpose) })
      .where(eq(users.id, hostId));
    return res.json({ id });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Edit a request (host only)
app.patch('/api/find-people/requests/:id', async (req, res) => {
  try {
    const { userId, purpose, title, description, eligibilityCollege, eligibilityYear,
      eligibilityBranch, genderPreference, maxApplicants, preferredTime, meetingLocation } = req.body;
    if (!userId || !purpose || !title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const row = await db.select().from(findPeopleRequests).where(eq(findPeopleRequests.id, req.params.id)).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.hostId !== userId) return res.status(403).json({ error: 'Not authorized' });
    await db.update(findPeopleRequests).set({
      purpose,
      title: title.trim(),
      description: description.trim(),
      eligibilityCollege: eligibilityCollege || 'same',
      eligibilityYear: eligibilityYear || 'Any',
      eligibilityBranch: eligibilityBranch || 'Any',
      genderPreference: genderPreference || 'Anyone',
      maxApplicants: Number(maxApplicants) || 5,
      preferredTime: preferredTime || '',
      meetingLocation: meetingLocation || '',
    }).where(eq(findPeopleRequests.id, req.params.id));
    await db.update(users)
      .set({ connectPreference: connectPreferenceForPurpose(purpose) })
      .where(eq(users.id, userId));
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Get a single request
app.get('/api/find-people/requests/:id', async (req, res) => {
  try {
    const row = await db.select().from(findPeopleRequests).where(eq(findPeopleRequests.id, req.params.id)).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const host = await db.select().from(users).where(eq(users.id, row.hostId)).then(r => r[0]);
    const appCount = await db.select().from(findPeopleApplications).where(eq(findPeopleApplications.requestId, row.id)).then(r => r.length);
    const { passwordHash: _, ...hostSafe } = host as any;
    return res.json({ ...row, host: hostSafe, applicantCount: appCount });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Delete a request
app.delete('/api/find-people/requests/:id', async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    const row = await db.select().from(findPeopleRequests).where(eq(findPeopleRequests.id, req.params.id)).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.hostId !== userId) return res.status(403).json({ error: 'Not authorized' });
    await db.delete(findPeopleApplications).where(eq(findPeopleApplications.requestId, req.params.id));
    await db.delete(findPeopleRequests).where(eq(findPeopleRequests.id, req.params.id));
    const remainingActive = await db.select({ id: findPeopleRequests.id })
      .from(findPeopleRequests)
      .where(and(eq(findPeopleRequests.hostId, row.hostId), eq(findPeopleRequests.status, 'active')));
    if (remainingActive.length === 0) {
      await db.update(users).set({ connectPreference: null }).where(eq(users.id, row.hostId));
    }
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Apply to a request
app.post('/api/find-people/requests/:requestId/apply', async (req, res) => {
  try {
    const { applicantId, intro } = req.body;
    const { requestId } = req.params;
    const row = await db.select().from(findPeopleRequests).where(eq(findPeopleRequests.id, requestId)).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    if (row.hostId === applicantId) return res.status(403).json({ error: 'Cannot apply to own request' });
    const existing = await db.select().from(findPeopleApplications)
      .where(and(eq(findPeopleApplications.requestId, requestId), eq(findPeopleApplications.applicantId, applicantId)))
      .then(r => r[0]);
    if (existing) return res.status(409).json({ error: 'Already applied' });
    const id = generateId('fpa');
    await db.insert(findPeopleApplications).values({ id, requestId, applicantId, intro: intro || '', status: 'pending' });
    // Notify host
    const applicant = await db.select().from(users).where(eq(users.id, applicantId)).then(r => r[0]);
    if (applicant) {
      const emoji = FIND_PEOPLE_EMOJI[row.purpose] || '👥';
      const pushTitle = `${emoji} New ${row.purpose} Request`;
      const pushBody = `${applicant.fullName} wants to ${row.purpose === 'Coffee Chat' ? 'have a coffee chat' : row.purpose === 'Study Partner' ? 'study with you' : 'connect'} — "${row.title}"`;
      await createNotification(row.hostId, applicantId, 'find_people_apply', pushTitle, pushBody);
      await dispatchPush(row.hostId, {
        title: pushTitle,
        body: pushBody,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `apply-${id}`,
        view: 'find-people',
        type: 'find_people_apply',
        senderAvatar: applicant.avatar || null,
        data: { tab: 'host-dashboard', userId: applicantId },
      });
    }
    return res.json({ id });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Get applicants for a request (host only)
app.get('/api/find-people/requests/:requestId/applications', async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    const row = await db.select().from(findPeopleRequests).where(eq(findPeopleRequests.id, req.params.requestId)).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.hostId !== userId) return res.status(403).json({ error: 'Not authorized' });
    const apps = await db.select().from(findPeopleApplications)
      .where(eq(findPeopleApplications.requestId, req.params.requestId))
      .orderBy(desc(findPeopleApplications.createdAt));
    const applicantIds = apps.map(a => a.applicantId);
    const applicants = applicantIds.length
      ? await db.select().from(users).where(or(...applicantIds.map(id => eq(users.id, id))))
      : [];
    const applicantMap = Object.fromEntries(applicants.map(u => [u.id, u]));
    const enriched = apps.map(a => {
      const u = applicantMap[a.applicantId] as any;
      if (u) { const { passwordHash: _, ...safe } = u; return { ...a, applicant: safe }; }
      return { ...a, applicant: null };
    });
    return res.json(enriched);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Accept / reject an application
app.patch('/api/find-people/applications/:appId', async (req, res) => {
  try {
    const { status, userId } = req.body; // status: 'accepted' | 'rejected'
    const app_ = await db.select().from(findPeopleApplications).where(eq(findPeopleApplications.id, req.params.appId)).then(r => r[0]);
    if (!app_) return res.status(404).json({ error: 'Not found' });
    const row = await db.select().from(findPeopleRequests).where(eq(findPeopleRequests.id, app_.requestId)).then(r => r[0]);
    if (!row || row.hostId !== userId) return res.status(403).json({ error: 'Not authorized' });
    await db.update(findPeopleApplications).set({ status }).where(eq(findPeopleApplications.id, req.params.appId));
    // Notify applicant if accepted
    if (status === 'accepted') {
      const host = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
      if (host) {
        // In-app notification
         await createNotification(
           app_.applicantId,
           userId,
           'find_people_accept',
           '🎉 Application Accepted!',
           `${host.fullName} accepted your application for "${row.title}"`,
         );
        // Push notification
         await dispatchPush(app_.applicantId, {
          title: '🎉 Application Accepted!',
          body: `${host.fullName} accepted your request for "${row.title}"`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `accepted-${app_.id}`,
          view: 'messages',
          type: 'find_people_accept',
          senderAvatar: host.avatar || null,
          data: { userId: userId },
        });
        // Auto-send a DM from host to applicant so they can start chatting
        const dmContent = `Hey! 👋 I've accepted your application for "${row.title}". Looking forward to connecting with you!`;
        const dmId = generateId('msg');
        await db.insert(messages).values({
          id: dmId,
          senderId: userId,
          receiverId: app_.applicantId,
          content: dmContent,
          isRead: false,
        });
        // DM notification + push
        await createNotification(app_.applicantId, userId, 'message', `💬 ${host.fullName}`, dmContent);
         await dispatchPush(app_.applicantId, {
          title: host.fullName,
          body: dmContent,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
           tag: `msg-${dmId}`,
          view: 'messages',
          type: 'message',
          senderAvatar: host.avatar || null,
          data: { userId: userId, senderId: userId, receiverId: app_.applicantId },
        });
      }
    }
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// My applications
app.get('/api/find-people/my-applications', async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const apps = await db.select().from(findPeopleApplications)
      .where(eq(findPeopleApplications.applicantId, userId))
      .orderBy(desc(findPeopleApplications.createdAt));
    const requestIds = apps.map(a => a.requestId);
    const requests = requestIds.length
      ? await db.select().from(findPeopleRequests).where(or(...requestIds.map(id => eq(findPeopleRequests.id, id))))
      : [];
    const hostIds = [...new Set(requests.map(r => r.hostId))];
    const hosts = hostIds.length
      ? await db.select().from(users).where(or(...hostIds.map(id => eq(users.id, id))))
      : [];
    const requestMap = Object.fromEntries(requests.map(r => [r.id, r]));
    const hostMap = Object.fromEntries(hosts.map(h => [h.id, h]));
    const enriched = apps.map(a => {
      const req_ = requestMap[a.requestId];
      const host = req_ ? hostMap[req_.hostId] as any : null;
      const hostSafe = host ? (({ passwordHash: _, ...rest }: any) => rest)(host) : null;
      return { ...a, request: req_ ? { ...req_, host: hostSafe } : null };
    });
    return res.json(enriched);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// My hosted requests
app.get('/api/find-people/my-requests', async (req, res) => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const rows = await db.select().from(findPeopleRequests)
      .where(eq(findPeopleRequests.hostId, userId))
      .orderBy(desc(findPeopleRequests.createdAt));
    const allApps = await db.select().from(findPeopleApplications)
      .where(or(...(rows.length ? rows.map(r => eq(findPeopleApplications.requestId, r.id)) : [sql`1=0`])));
    const countMap: Record<string, number> = {};
    const acceptedMap: Record<string, number> = {};
    allApps.forEach(a => {
      countMap[a.requestId] = (countMap[a.requestId] || 0) + 1;
      if (a.status === 'accepted') acceptedMap[a.requestId] = (acceptedMap[a.requestId] || 0) + 1;
    });
    const enriched = rows.map(r => ({ ...r, applicantCount: countMap[r.id] || 0, acceptedCount: acceptedMap[r.id] || 0 }));
    return res.json(enriched);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Close / reopen a request
app.patch('/api/find-people/requests/:id/status', async (req, res) => {
  try {
    const { userId, status } = req.body;
    const row = await db.select().from(findPeopleRequests).where(eq(findPeopleRequests.id, req.params.id)).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.hostId !== userId) return res.status(403).json({ error: 'Not authorized' });
    await db.update(findPeopleRequests).set({ status }).where(eq(findPeopleRequests.id, req.params.id));
    if (status === 'active') {
      await db.update(users)
        .set({ connectPreference: connectPreferenceForPurpose(row.purpose) })
        .where(eq(users.id, userId));
    } else if (status === 'closed') {
      const remainingActive = await db.select({ id: findPeopleRequests.id })
        .from(findPeopleRequests)
        .where(and(eq(findPeopleRequests.hostId, userId), eq(findPeopleRequests.status, 'active')));
      if (remainingActive.length === 0) {
        await db.update(users).set({ connectPreference: null }).where(eq(users.id, userId));
      }
    }
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// ── DB MIGRATIONS + SERVER STARTUP ───────────────────────────────────────────
// Export app for Vercel serverless runtime (api/index.ts imports this)
export default app;

// Migration is awaited before app.listen so tables exist before first request.
await (async () => {
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    full_name text NOT NULL,
    college text NOT NULL,
    school_name text NOT NULL DEFAULT '',
    coaching_name text NOT NULL DEFAULT '',
    location text NOT NULL DEFAULT '',
    branch text NOT NULL,
     degree text NOT NULL DEFAULT '',
     academic_stream text NOT NULL DEFAULT '',
     program_group text NOT NULL DEFAULT '',
     fields jsonb NOT NULL DEFAULT '[]',
    year integer NOT NULL,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    avatar text NOT NULL,
    cover_image text,
    about_me text NOT NULL DEFAULT '',
    interests jsonb NOT NULL DEFAULT '[]',
    skills jsonb NOT NULL DEFAULT '[]',
    looking_for jsonb NOT NULL DEFAULT '[]',
    connect_preference text,
    is_verified boolean NOT NULL DEFAULT false,
    is_suspended boolean NOT NULL DEFAULT false,
    role text NOT NULL DEFAULT 'student',
    college_admin_of text,
    privacy_settings jsonb NOT NULL DEFAULT '{"showEmail":true,"onlyAllowVerifiedConnections":false,"hideProfileFromSearch":false,"directMessages":"connections"}',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id text PRIMARY KEY,
    token_hash text NOT NULL UNIQUE,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz
  );
  CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS connect_preference text;
  ALTER TABLE users ALTER COLUMN privacy_settings SET DEFAULT '{"showEmail":true,"onlyAllowVerifiedConnections":false,"hideProfileFromSearch":false,"directMessages":"connections"}'::jsonb;
  CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (blocker_id, blocked_user_id),
    CHECK (blocker_id <> blocked_user_id)
  );
  CREATE INDEX IF NOT EXISTS user_blocks_blocked_user_id_idx ON user_blocks(blocked_user_id);
  CREATE TABLE IF NOT EXISTS hosted_workshops (
    id text PRIMARY KEY,
    host_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    scheduled_date text NOT NULL DEFAULT '',
    venue text NOT NULL DEFAULT '',
    is_online boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS hosted_workshops_host_user_id_idx ON hosted_workshops(host_user_id);
  CREATE TABLE IF NOT EXISTS workshop_registrations (
    id text PRIMARY KEY,
    workshop_id text NOT NULL,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registered_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workshop_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS workshop_registrations_workshop_id_idx
    ON workshop_registrations(workshop_id);
  CREATE TABLE IF NOT EXISTS community_merge_audits (
    id text PRIMARY KEY,
    actor_id text NOT NULL,
    source_id text NOT NULL,
    source_name text NOT NULL,
    destination_id text NOT NULL,
    destination_name text NOT NULL,
    summary jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name text NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS coaching_name text NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
  CREATE TABLE IF NOT EXISTS posts (
    id text PRIMARY KEY,
    author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL,
    likes jsonb NOT NULL DEFAULT '[]',
    community_id text,
    academic_tag text,
    project_title text,
    post_image text,
    feeling text,
    poll_options jsonb,
    poll_votes jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS comments (
    id text PRIMARY KEY,
    post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS connections (
    id text PRIMARY KEY,
    sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type text NOT NULL,
    message text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS messages (
    id text PRIMARY KEY,
    sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS communities (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL DEFAULT 'Users',
    member_ids jsonb NOT NULL DEFAULT '[]',
    tags jsonb NOT NULL DEFAULT '[]',
    category text NOT NULL DEFAULT 'General',
    threads jsonb NOT NULL DEFAULT '[]',
    resources jsonb NOT NULL DEFAULT '[]',
    college text,
    creator_id text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE communities ADD COLUMN IF NOT EXISTS polls jsonb NOT NULL DEFAULT '[]';
  CREATE TABLE IF NOT EXISTS stories (
    id text PRIMARY KEY,
    author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image text,
    content text NOT NULL,
    viewed_by jsonb NOT NULL DEFAULT '[]',
    reactions jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS reports (
    id text PRIMARY KEY,
    reporter_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    actor_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS notification_email_queue (
    id text PRIMARY KEY,
    recipient_id text NOT NULL,
    event_type text NOT NULL,
    dedupe_key text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    scheduled_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    locked_at timestamptz,
    sent_at timestamptz,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS notification_email_queue_dedupe_idx
    ON notification_email_queue (dedupe_key);
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS projects (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL,
    creator_id text NOT NULL,
    stage text NOT NULL DEFAULT 'Idea',
    tags jsonb NOT NULL DEFAULT '[]',
    looking_for jsonb NOT NULL DEFAULT '[]',
    member_ids jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS events (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL DEFAULT 'General',
    date text NOT NULL,
    time text NOT NULL DEFAULT '',
    venue text NOT NULL DEFAULT '',
    organizer text NOT NULL DEFAULT '',
    organizer_id text NOT NULL,
    college text NOT NULL DEFAULT '',
    registered_ids jsonb NOT NULL DEFAULT '[]',
    max_seats integer,
    is_online boolean NOT NULL DEFAULT false,
    link text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS group_chats (
    id text PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL DEFAULT 'fun',
    creator_id text NOT NULL,
    college text NOT NULL,
    branch text,
    community_id text,
    description text NOT NULL DEFAULT '',
    purpose text NOT NULL DEFAULT 'chat',
    visibility text NOT NULL DEFAULT 'private',
    member_ids jsonb NOT NULL DEFAULT '[]',
    pending_ids jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE group_chats ADD COLUMN IF NOT EXISTS community_id text;
  ALTER TABLE group_chats ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
  ALTER TABLE group_chats ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'chat';
  ALTER TABLE group_chats ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';
  CREATE TABLE IF NOT EXISTS group_messages (
    id text PRIMARY KEY,
    group_id text NOT NULL,
    sender_id text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS entity_chat_read_cursors (
    group_id text NOT NULL,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_seen_message_id text NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    seen_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS college_announcements (
    id text PRIMARY KEY,
    college text NOT NULL,
    author_id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS college_settings (
    college text PRIMARY KEY,
    cover_image text,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS attendance_subjects (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    name text NOT NULL,
    total_classes integer NOT NULL DEFAULT 0,
    present_classes integer NOT NULL DEFAULT 0,
    target_percent integer NOT NULL DEFAULT 75,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS referrals (
    id text PRIMARY KEY,
    referrer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS college_admin_of text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image text;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS degree text NOT NULL DEFAULT '';
   ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_stream text NOT NULL DEFAULT '';
   ALTER TABLE users ADD COLUMN IF NOT EXISTS program_group text NOT NULL DEFAULT '';
   ALTER TABLE users ADD COLUMN IF NOT EXISTS fields jsonb NOT NULL DEFAULT '[]';
  ALTER TABLE communities ADD COLUMN IF NOT EXISTS college text;
  ALTER TABLE communities ADD COLUMN IF NOT EXISTS creator_id text;
  ALTER TABLE communities ADD COLUMN IF NOT EXISTS admin_ids jsonb NOT NULL DEFAULT '[]';
  ALTER TABLE communities ADD COLUMN IF NOT EXISTS blocked_member_ids jsonb NOT NULL DEFAULT '[]';
  CREATE TABLE IF NOT EXISTS aptitude_exams (
    id text PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    description text NOT NULL,
    duration_seconds integer NOT NULL DEFAULT 900,
    max_marks integer NOT NULL DEFAULT 15,
    questions jsonb NOT NULL DEFAULT '[]',
    source_note text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS aptitude_attempts (
    id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES aptitude_exams(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    submitted_at timestamptz,
    answers jsonb NOT NULL DEFAULT '{}',
    score integer NOT NULL DEFAULT 0,
    max_marks integer NOT NULL DEFAULT 15,
    status text NOT NULL DEFAULT 'in_progress',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS aptitude_attempts_exam_user_idx ON aptitude_attempts (exam_id, user_id);
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_options jsonb;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_votes jsonb;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS votes jsonb NOT NULL DEFAULT '{}';
  UPDATE posts
  SET votes = COALESCE(
    (
      SELECT jsonb_object_agg(liked_user_id, 1)
      FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(likes) = 'array' THEN likes ELSE '[]'::jsonb END
      ) AS liked_user_id
    ),
    '{}'::jsonb
  )
  WHERE votes = '{}'::jsonb
    AND jsonb_typeof(likes) = 'array'
    AND jsonb_array_length(likes) > 0;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS website_url text;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS attachment_name text;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS attachment_data text;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS attachment_mime_type text;
   ALTER TABLE posts ADD COLUMN IF NOT EXISTS reshared_from_id text;
   ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
  ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
  ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_to_id text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS anonymous_post_id text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_data text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_mime_type text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS poll_options jsonb;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS poll_votes jsonb;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}';
  CREATE UNIQUE INDEX IF NOT EXISTS messages_client_message_id_idx
    ON messages (client_message_id)
    WHERE client_message_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS messages_sender_created_idx
    ON messages (sender_id, created_at);
  CREATE INDEX IF NOT EXISTS messages_receiver_created_idx
    ON messages (receiver_id, created_at);
  ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_name text;
  ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_data text;
  ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS attachment_mime_type text;
  ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS poll_options jsonb;
  ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS poll_votes jsonb;
  ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reply_to_id text;
  ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}';
  CREATE INDEX IF NOT EXISTS group_messages_group_created_idx
    ON group_messages (group_id, created_at);
  CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON notifications (user_id, created_at);
  ALTER TABLE stories ADD COLUMN IF NOT EXISTS likes jsonb NOT NULL DEFAULT '[]';
  CREATE TABLE IF NOT EXISTS saved_items (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type text NOT NULL,
    item_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, item_type, item_id)
  );
  CREATE TABLE IF NOT EXISTS user_sessions (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    last_heartbeat timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    duration_seconds integer NOT NULL DEFAULT 0,
    user_agent text NOT NULL DEFAULT '',
    page text NOT NULL DEFAULT 'feed'
  );
  CREATE TABLE IF NOT EXISTS find_people_requests (
    id text PRIMARY KEY,
    host_id text NOT NULL,
    purpose text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    eligibility_college text NOT NULL DEFAULT 'same',
    eligibility_year text NOT NULL DEFAULT 'Any',
    eligibility_branch text NOT NULL DEFAULT 'Any',
    gender_preference text NOT NULL DEFAULT 'Anyone',
    max_applicants integer NOT NULL DEFAULT 5,
    preferred_time text NOT NULL DEFAULT '',
    meeting_location text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'active',
    college text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS find_people_applications (
    id text PRIMARY KEY,
    request_id text NOT NULL,
    applicant_id text NOT NULL,
    intro text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS network_competitions (
    id text PRIMARY KEY,
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text NOT NULL,
    track text NOT NULL DEFAULT 'DSA & Build',
    status text NOT NULL DEFAULT 'registration',
    team_size integer NOT NULL DEFAULT 3,
    registration_deadline timestamptz NOT NULL,
    build_starts_at timestamptz NOT NULL,
    submission_deadline timestamptz NOT NULL,
    judging_ends_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS network_competition_teams (
    id text PRIMARY KEY,
    competition_id text NOT NULL REFERENCES network_competitions(id) ON DELETE CASCADE,
    name text NOT NULL,
    college text NOT NULL,
    captain_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_ids jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS network_competition_submissions (
    id text PRIMARY KEY,
    competition_id text NOT NULL REFERENCES network_competitions(id) ON DELETE CASCADE,
    team_id text NOT NULL UNIQUE REFERENCES network_competition_teams(id) ON DELETE CASCADE,
    title text NOT NULL,
    summary text NOT NULL,
    github_url text NOT NULL DEFAULT '',
    demo_url text NOT NULL DEFAULT '',
    video_url text NOT NULL DEFAULT '',
    tech_stack jsonb NOT NULL DEFAULT '[]',
    judge_score integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'submitted',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS network_competition_votes (
    id text PRIMARY KEY,
    submission_id text NOT NULL REFERENCES network_competition_submissions(id) ON DELETE CASCADE,
    voter_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (submission_id, voter_id)
  );
  INSERT INTO network_competitions (
    id, title, slug, description, track, status, team_size,
    registration_deadline, build_starts_at, submission_deadline, judging_ends_at
  ) VALUES (
    'network-college-build-2026-dsa',
    'The Network Inter-College DSA & Build Challenge',
    'network-inter-college-dsa-build-challenge',
    'Form a three-student team, choose a real student problem, and ship a useful project with a clear data-structures-and-algorithms story.',
    'DSA & Build',
    'registration',
    3,
    '2026-09-30T23:59:00+05:30',
    '2026-10-01T09:00:00+05:30',
    '2026-10-14T23:59:00+05:30',
    '2026-10-18T23:59:00+05:30'
  ) ON CONFLICT (id) DO NOTHING;
`).then(async () => {
  await ensureAptitudeCommunity();
  await ensureAptitudeExam();
  console.log('[Seed] Aptitude community and GATE General Aptitude exam checked');
}).catch((err: any) => console.error('[startup migration]', err.message));

// Don't call app.listen() on Vercel or Firebase — they use the exported handler instead
if (!IS_SERVERLESS_RUNTIME) {
  const PORT = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 3001));
  const httpServer = createServer(app);
  attachChatRealtime(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    autoSeedDomainCommunities();
  });

  // ── Engagement Push Notification Jobs ──────────────────────────────────────
  // Only run on long-lived servers (Replit / VPS).
  // Firebase Cloud Functions are stateless — setInterval dies after each request.

  const lastMsgReminder   = new Map<string, number>(); // userId → timestamp
  const lastConnReminder  = new Map<string, number>(); // userId → timestamp
  const lastReengagement  = new Map<string, number>(); // userId → timestamp

// ── 1. Unread message reminders — every 22 minutes ──────────────────────────
setInterval(async () => {
  if (!vapidEnabled) return;
  try {
    // Get all users who have push subscriptions
    const subs = await db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions);
    const now = Date.now();
    for (const { userId } of subs) {
      // Throttle: max once per 20 min per user
      if ((lastMsgReminder.get(userId) ?? 0) + 20 * 60 * 1000 > now) continue;

      // Count unread messages for this user
      const unreadResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false`,
        [userId]
      );
      const unread = parseInt(unreadResult.rows[0]?.count ?? '0', 10);
      if (unread === 0) continue;

      // Get first sender's name for personalisation
      const senderRow = await pool.query<{ full_name: string }>(
        `SELECT u.full_name FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.receiver_id = $1 AND m.is_read = false
         ORDER BY m.created_at DESC LIMIT 1`,
        [userId]
      );
      const senderName = senderRow.rows[0]?.full_name ?? 'Someone';
      const body = unread === 1
        ? `${senderName} sent you a message`
        : `${senderName} and ${unread - 1} other${unread - 1 > 1 ? 's' : ''} messaged you`;

      await sendPushToUser(userId, {
        title: `💬 ${unread} unread message${unread > 1 ? 's' : ''}`,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'unread-msgs',
        view: 'messages',
        type: 'message',
      });
      lastMsgReminder.set(userId, now);
    }
  } catch (e: any) {
    console.error('[cron:msg-reminder]', e.message);
  }
}, 22 * 60 * 1000);

// ── 2. Pending connection request reminders — every 35 minutes ───────────────
setInterval(async () => {
  if (!vapidEnabled) return;
  try {
    const subs = await db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions);
    const now = Date.now();
    for (const { userId } of subs) {
      if ((lastConnReminder.get(userId) ?? 0) + 35 * 60 * 1000 > now) continue;

      const pendingResult = await pool.query<{ count: string; full_name: string }>(
        `SELECT COUNT(*) as count,
                (SELECT u.full_name FROM connections c2
                 JOIN users u ON u.id = c2.sender_id
                 WHERE c2.receiver_id = $1 AND c2.status = 'pending'
                 ORDER BY c2.created_at DESC LIMIT 1) as full_name
         FROM connections c
         WHERE c.receiver_id = $1 AND c.status = 'pending'`,
        [userId]
      );
      const pending = parseInt(pendingResult.rows[0]?.count ?? '0', 10);
      if (pending === 0) continue;

      const firstName = pendingResult.rows[0]?.full_name ?? 'Someone';
      const body = pending === 1
        ? `${firstName} wants to connect with you`
        : `${firstName} and ${pending - 1} other${pending - 1 > 1 ? 's' : ''} want to connect`;

      await sendPushToUser(userId, {
        title: `🤝 ${pending} connection request${pending > 1 ? 's' : ''} waiting`,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'pending-conns',
        view: 'dashboard',
        type: 'connection_request',
      });
      lastConnReminder.set(userId, now);
    }
  } catch (e: any) {
    console.error('[cron:conn-reminder]', e.message);
  }
}, 35 * 60 * 1000);

// ── 3. Re-engagement digest — every 4 hours for users with unread notifs ─────
setInterval(async () => {
  if (!vapidEnabled) return;
  try {
    const subs = await db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions);
    const now = Date.now();
    for (const { userId } of subs) {
      if ((lastReengagement.get(userId) ?? 0) + 4 * 60 * 60 * 1000 > now) continue;

      // Count unread in-app notifications created in the last 4 hours
      const unreadNotifResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM notifications
         WHERE user_id = $1 AND is_read = false
         AND created_at > NOW() - INTERVAL '4 hours'`,
        [userId]
      );
      const unreadCount = parseInt(unreadNotifResult.rows[0]?.count ?? '0', 10);
      if (unreadCount === 0) continue;

      // Summarise what happened
      const typesResult = await pool.query<{ type: string; cnt: string }>(
        `SELECT type, COUNT(*) as cnt FROM notifications
         WHERE user_id = $1 AND is_read = false
         AND created_at > NOW() - INTERVAL '4 hours'
         GROUP BY type ORDER BY cnt DESC LIMIT 3`,
        [userId]
      );
      const typeLabels: Record<string, string> = {
        like: '❤️ likes', comment: '💬 comments', message: '📩 messages',
        connection_request: '🤝 requests', connection_accepted: '✅ connections',
        profile_view: '👀 profile views', post: '📢 posts', find_people_apply: '📋 applications',
      };
      const parts = typesResult.rows.map(r => typeLabels[r.type] || r.type);
      const body = parts.length
        ? `You have ${parts.join(', ')} while you were away`
        : `You have ${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`;

      await sendPushToUser(userId, {
        title: `🔔 ${unreadCount} thing${unreadCount > 1 ? 's' : ''} happened while you were away`,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'digest',
        view: 'notifications',
        type: 'digest',
      });
      lastReengagement.set(userId, now);
    }
  } catch (e: any) {
    console.error('[cron:reengagement]', e.message);
  }
}, 4 * 60 * 60 * 1000);

// ── 4. Morning boost — daily at 9 AM IST for active users ────────────────────
// Run check every 60 seconds; fire once per day per user at 9 AM IST (UTC+5:30)
const lastDailyBoost = new Map<string, string>(); // userId → 'YYYY-MM-DD'
setInterval(async () => {
  if (!vapidEnabled) return;
  try {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // IST offset
    const hourIST  = nowIST.getUTCHours();
    const minIST   = nowIST.getUTCMinutes();
    if (hourIST !== 9 || minIST > 4) return; // Only fire between 09:00 and 09:04 IST

    const today = nowIST.toISOString().slice(0, 10);
    const subs = await db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions);

    for (const { userId } of subs) {
      if (lastDailyBoost.get(userId) === today) continue;

      // Only ping users who have activity (connections or posts) — skip brand-new accounts
      const activityResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM connections WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted'`,
        [userId]
      );
      const connCount = parseInt(activityResult.rows[0]?.count ?? '0', 10);
      if (connCount === 0) continue;

      const userRow = await pool.query<{ full_name: string }>(
        `SELECT full_name FROM users WHERE id = $1`, [userId]
      );
      const firstName = (userRow.rows[0]?.full_name ?? '').split(' ')[0] || 'Hey';

      const tips = [
        `Your network has ${connCount} connection${connCount > 1 ? 's' : ''} — share something today!`,
        `Start your day strong — check what your network is up to 🚀`,
        `Someone might be looking for exactly your skills today 👀`,
        `New opportunities are waiting — open the app and explore 🎯`,
        `Stay top of mind — post an update to your network today 📣`,
      ];
      const body = tips[Math.floor(Math.random() * tips.length)];

      await sendPushToUser(userId, {
        title: `☀️ Good morning, ${firstName}!`,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'morning-boost',
        view: 'feed',
        type: 'digest',
      });
      lastDailyBoost.set(userId, today);
    }
  } catch (e: any) {
    console.error('[cron:morning-boost]', e.message);
  }
  }, 60 * 1000); // check every minute

} // end !isServerless

// ── SEO Public API Routes ─────────────────────────────────────────────────────
// Helper: convert college/community name to URL slug
function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

// GET /api/seo/colleges — list all colleges with student/community counts
app.get('/api/seo/colleges', async (_req, res) => {
  try {
    const rows = await pool.query<{ college: string; student_count: string }>(`
      SELECT college, COUNT(*) as student_count
      FROM users
      WHERE is_suspended = false AND college != ''
      GROUP BY college
      ORDER BY COUNT(*) DESC
      LIMIT 500
    `);
    const communityRows = await pool.query<{ college: string; count: string }>(`
      SELECT college, COUNT(*) as count FROM communities WHERE college IS NOT NULL AND college != '' GROUP BY college
    `);
    const commMap: Record<string, number> = {};
    communityRows.rows.forEach(r => { commMap[r.college] = parseInt(r.count, 10); });

    const colleges = rows.rows.map(r => ({
      name: r.college,
      slug: toSlug(r.college),
      studentCount: parseInt(r.student_count, 10),
      communityCount: commMap[r.college] || 0,
    }));
    res.json(colleges);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/seo/college/:slug — single college detail page
app.get('/api/seo/college/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    // Find college name by matching slug
    const allColleges = await pool.query<{ college: string }>(`SELECT DISTINCT college FROM users WHERE is_suspended = false AND college != ''`);
    const match = allColleges.rows.find(r => toSlug(r.college) === slug);
    if (!match) return res.status(404).json({ error: 'College not found' });

    const collegeName = match.college;
    const [studentsResult, communityResult, eventsResult] = await Promise.all([
      pool.query<{ id: string; full_name: string; branch: string; avatar: string; count: string }>(
        `SELECT id, full_name, branch, avatar FROM users
         WHERE college = $1 AND is_suspended = false
           AND (privacy_settings->>'hideProfileFromSearch')::boolean IS NOT TRUE
         ORDER BY created_at DESC LIMIT 12`, [collegeName]
      ),
      pool.query<{ id: string; name: string; description: string; member_ids: any }>(
        `SELECT id, name, description, member_ids FROM communities WHERE college = $1 ORDER BY array_length(ARRAY(SELECT jsonb_array_elements_text(member_ids)), 1) DESC NULLS LAST LIMIT 10`, [collegeName]
      ),
      pool.query<{ id: string; title: string; date: string; category: string }>(
        `SELECT id, title, date, category FROM events WHERE college = $1 ORDER BY created_at DESC LIMIT 6`, [collegeName]
      ),
    ]);
    const studentCount = await pool.query<{ count: string }>(`SELECT COUNT(*) as count FROM users WHERE college = $1 AND is_suspended = false`, [collegeName]);

    res.json({
      name: collegeName,
      slug,
      studentCount: parseInt(studentCount.rows[0]?.count ?? '0', 10),
      communities: communityResult.rows.map(c => ({
        name: c.name,
        slug: toSlug(c.name),
        memberCount: Array.isArray(c.member_ids) ? c.member_ids.length : 0,
      })),
      recentEvents: eventsResult.rows,
      topStudents: studentsResult.rows.map(s => ({
        id: s.id,
        fullName: s.full_name,
        branch: s.branch,
        avatar: userAvatarReference(s.id, s.avatar),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/seo/communities — list all communities
app.get('/api/seo/communities', async (_req, res) => {
  try {
    const rows = await pool.query<{ id: string; name: string; description: string; category: string; member_ids: any; college: string }>(
      `SELECT id, name, description, category, member_ids, college FROM communities ORDER BY jsonb_array_length(member_ids) DESC LIMIT 200`
    );
    res.json(rows.rows.map(c => ({
      id: c.id,
      name: c.name,
      slug: toSlug(c.name),
      description: c.description || '',
      category: c.category || 'General',
      memberCount: Array.isArray(c.member_ids) ? c.member_ids.length : (c.member_ids?.length ?? 0),
      college: c.college || null,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/seo/community/:slug — single community detail
app.get('/api/seo/community/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const requestedSlug = toSlug(decodeURIComponent(slug));
    const compactRequestedSlug = requestedSlug.replace(/-/g, '');
    const allComms = await pool.query<{ id: string; name: string; description: string; category: string; member_ids: any; college: string }>(
      `SELECT id, name, description, category, member_ids, college FROM communities`
    );
    // Shared links sometimes contain the readable community name with spaces
    // (for example, "LPU study group") instead of a pre-slugified value.
    // Match the canonical slug first, then tolerate missing separators and a
    // descriptive suffix such as "group" for older custom communities whose
    // stored name was abbreviated (for example, "LPUstudy").
    const match = allComms.rows.find(r => toSlug(r.name) === requestedSlug) ||
      allComms.rows.find(r => {
        const compactName = toSlug(r.name).replace(/-/g, '');
        return compactName.length >= 4 && compactRequestedSlug.startsWith(compactName);
      });
    if (!match) return res.status(404).json({ error: 'Community not found' });

    const memberIds: string[] = Array.isArray(match.member_ids) ? match.member_ids : [];
    let members: any[] = [];
    if (memberIds.length > 0) {
      const membersResult = await pool.query(
        `SELECT id, full_name, branch, college, avatar FROM users
         WHERE id = ANY($1) AND is_suspended = false
           AND (privacy_settings->>'hideProfileFromSearch')::boolean IS NOT TRUE
         LIMIT 12`,
        [memberIds.slice(0, 50)]
      );
      members = membersResult.rows.map((m: any) => ({
        id: m.id,
        fullName: m.full_name,
        branch: m.branch,
        college: m.college,
        avatar: userAvatarReference(m.id, m.avatar),
      }));
    }

    res.json({
      id: match.id,
      name: match.name,
      slug: toSlug(match.name),
      description: match.description || '',
      category: match.category || 'General',
      memberCount: memberIds.length,
      college: match.college || null,
      members,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/seo/students — public student listing (name, college, branch, skills only)
app.get('/api/seo/students', async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT id, full_name, college, branch, avatar, skills, is_verified
       FROM users WHERE is_suspended = false AND (privacy_settings->>'hideProfileFromSearch')::boolean IS NOT TRUE
       ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows.rows.map((s: any) => ({
      id: s.id,
      fullName: s.full_name,
      college: s.college,
      branch: s.branch,
      avatar: userAvatarReference(s.id, s.avatar),
      skills: Array.isArray(s.skills) ? s.skills : [],
      isVerified: s.is_verified,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/seo/student/:id — public student profile
app.get('/api/seo/student/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.college, u.branch, u.degree, u.year, u.about_me, u.skills, u.interests, u.avatar, u.is_verified, u.privacy_settings,
              COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)) FROM communities c WHERE u.id = ANY(ARRAY(SELECT jsonb_array_elements_text(c.member_ids))::text[])), '[]'::jsonb) as communities
       FROM users u
       WHERE u.id = $1 AND u.is_suspended = false`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const s: any = result.rows[0];
    // Respect privacy: don't expose if hidden from search
    if (s.privacy_settings?.hideProfileFromSearch === true) return res.status(404).json({ error: 'Profile private' });

    // Fetch communities this user is in
    const commsResult = await pool.query(
      `SELECT id, name FROM communities WHERE $1 = ANY(ARRAY(SELECT jsonb_array_elements_text(member_ids))::text[]) LIMIT 10`, [id]
    );

    res.json({
      id: s.id,
      fullName: s.full_name,
      college: s.college,
      branch: s.branch,
      degree: s.degree,
      year: s.year,
      aboutMe: s.about_me || '',
      skills: Array.isArray(s.skills) ? s.skills : [],
      interests: Array.isArray(s.interests) ? s.interests : [],
      avatar: userAvatarReference(s.id, s.avatar) || '',
      isVerified: s.is_verified,
      communities: commsResult.rows.map((c: any) => ({ id: c.id, name: c.name, slug: toSlug(c.name) })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/seo/events — public events listing
app.get('/api/seo/events', async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT id, title, description, category, date, venue, college, is_online, organizer, link
       FROM events ORDER BY created_at DESC LIMIT 100`
    );
    res.json(rows.rows.map((e: any) => ({
      id: e.id, title: e.title, description: e.description, category: e.category,
      date: e.date, venue: e.venue, college: e.college, isOnline: e.is_online,
      organizer: e.organizer, link: e.link,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /sitemap.xml — dynamic sitemap for Google
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const BASE = 'https://the-network.co.in';
    const staticUrls = [
      { loc: `${BASE}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${BASE}/about`, priority: '0.8', changefreq: 'monthly' },
      { loc: `${BASE}/story`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${BASE}/colleges`, priority: '0.9', changefreq: 'daily' },
      { loc: `${BASE}/communities`, priority: '0.9', changefreq: 'daily' },
      { loc: `${BASE}/students`, priority: '0.8', changefreq: 'daily' },
      { loc: `${BASE}/study-partners`, priority: '0.9', changefreq: 'weekly' },
      { loc: `${BASE}/project-teammates`, priority: '0.9', changefreq: 'weekly' },
      { loc: `${BASE}/resources`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${BASE}/jee`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/neet`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/gate`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/jee/study-partner`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/neet/study-partner`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/looking-for/study-partner`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${BASE}/looking-for/project-teammate`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${BASE}/looking-for/hackathon-team`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/looking-for/mentor`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${BASE}/looking-for/dsa-partner`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${BASE}/events`, priority: '0.8', changefreq: 'daily' },
      { loc: `${BASE}/opportunities`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${BASE}/blog`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${BASE}/campus-ambassador`, priority: '0.7', changefreq: 'weekly' },
      // Blog posts
      ...['best-hackathons-india-2025','how-to-find-startup-cofounder-college','placement-preparation-engineering-students','top-ai-communities-india-students','engineering-internships-india-2025','how-iit-students-prepare-placements','college-startup-guide-india','nit-vs-iit-which-better-placements','open-source-contribution-beginners-india','campus-ambassador-programs-india'].map(s => ({ loc: `${BASE}/blog/${s}`, priority: '0.6', changefreq: 'monthly' })),
      // Opportunities
      ...['smart-india-hackathon','flipkart-grid','google-summer-of-code','microsoft-engage','amazon-sde-internship','fossasia-hackathon','icpc-asia','tata-imagination-challenge','goldman-sachs-internship','adobe-gensolve','scholarship-prime-minister','kvpy'].map(s => ({ loc: `${BASE}/opportunity/${s}`, priority: '0.7', changefreq: 'monthly' })),
    ];

    const [collegeRows, communityRows] = await Promise.all([
      pool.query<{ college: string }>(`SELECT DISTINCT college FROM users WHERE is_suspended = false AND college != '' LIMIT 1000`),
      pool.query<{ name: string }>(`SELECT name FROM communities WHERE jsonb_array_length(member_ids) > 0 LIMIT 2000`),
    ]);

    const collegeUrls = collegeRows.rows.map(r => ({ loc: `${BASE}/college/${toSlug(r.college)}`, priority: '0.8', changefreq: 'weekly' }));
    const communityUrls = communityRows.rows.map(r => ({ loc: `${BASE}/community/${toSlug(r.name)}`, priority: '0.7', changefreq: 'weekly' }));

    const allUrls = [...staticUrls, ...collegeUrls, ...communityUrls];
    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e: any) {
    res.status(500).send('Error generating sitemap');
  }
});

// Serve the built frontend only after all API and SEO routes above have matched.
// This keeps deep links such as /community/:slug working without intercepting
// their backing /api/seo/* requests.
if (process.env.SERVE_LEGACY_FRONTEND === 'true' && process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
  const seoBaseUrl = 'https://the-network.co.in';
  const publicSeoPaths = new Set([
    '/',
    '/about',
    '/story',
    '/resources',
    '/colleges',
    '/communities',
    '/students',
    '/events',
    '/opportunities',
    '/blog',
    '/campus-ambassador',
    '/study-partners',
    '/project-teammates',
    '/jee',
    '/neet',
    '/gate',
    '/jee/study-partner',
    '/neet/study-partner',
    '/looking-for/study-partner',
    '/looking-for/project-teammate',
    '/looking-for/hackathon-team',
    '/looking-for/mentor',
    '/looking-for/dsa-partner',
  ]);
  const publicSeoPrefixes = ['/college/', '/community/', '/opportunity/', '/blog/'];

  function isPublicSeoPath(req: express.Request): boolean {
    const pathname = req.path;
    if (pathname === '/' && Object.keys(req.query).length > 0) return false;
    return publicSeoPaths.has(pathname) || publicSeoPrefixes.some(prefix => pathname.startsWith(prefix));
  }

  function escapeHtmlAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function sendPrivateShell(req: express.Request, res: express.Response) {
    const canonical = escapeHtmlAttribute(`${seoBaseUrl}${req.path}`);
    const privateHtml = indexHtml
      .replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex, nofollow" />')
      .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`)
      .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
    res.type('html').send(privateHtml);
  }

  // Query-driven app states such as "/?community=..." must not inherit the
  // homepage's indexable shell. Leave ordinary paths to static serving so
  // generated directories like /resources/ resolve to their index.html.
  app.get('/', (req, res, next) => {
    if (Object.keys(req.query).length > 0) {
      sendPrivateShell(req, res);
      return;
    }
    next();
  });
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (isPublicSeoPath(req)) {
      res.sendFile(path.join(distPath, 'index.html'));
      return;
    }

    sendPrivateShell(req, res);
  });
}

})();
