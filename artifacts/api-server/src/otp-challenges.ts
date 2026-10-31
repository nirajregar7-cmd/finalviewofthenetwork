import crypto from 'crypto';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from './db.js';
import { emailOtpChallenges } from '@workspace/db/schema';

export type OtpPurpose = 'register' | 'forgot-password' | 'email-change';
export type OtpConsumeStatus = 'ok' | 'missing' | 'expired' | 'incorrect' | 'too_many_attempts';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

export interface StoredOtpChallengeRef {
  challengeKey: string;
  otpHash: string;
}

export function normalizeOtpEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function otpSigningSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('OTP signing secret is not configured');
  return secret;
}

function makeChallengeKey(email: string, purpose: OtpPurpose): string {
  return crypto
    .createHmac('sha256', otpSigningSecret())
    .update(`email-otp-key\0${purpose}\0${normalizeOtpEmail(email)}`)
    .digest('hex');
}

function hashOtp(challengeKey: string, otp: string): string {
  return crypto
    .createHmac('sha256', otpSigningSecret())
    .update(`email-otp-code\0${challengeKey}\0${otp}`)
    .digest('hex');
}

function matchesHash(storedHash: string, candidateHash: string): boolean {
  const stored = Buffer.from(storedHash, 'hex');
  const candidate = Buffer.from(candidateHash, 'hex');
  return stored.length === candidate.length && stored.length > 0 && crypto.timingSafeEqual(stored, candidate);
}

export async function storeOtpChallenge({
  email,
  purpose,
  otp,
  data = {},
}: {
  email: string;
  purpose: OtpPurpose;
  otp: string;
  data?: Record<string, unknown>;
}): Promise<StoredOtpChallengeRef> {
  const challengeKey = makeChallengeKey(email, purpose);
  const otpHash = hashOtp(challengeKey, otp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await db.delete(emailOtpChallenges).where(lt(emailOtpChallenges.expiresAt, now));
  await db.insert(emailOtpChallenges).values({
    challengeKey,
    purpose,
    otpHash,
    data,
    attempts: 0,
    expiresAt,
    createdAt: now,
  }).onConflictDoUpdate({
    target: emailOtpChallenges.challengeKey,
    set: { purpose, otpHash, data, attempts: 0, expiresAt, createdAt: now },
  });

  return { challengeKey, otpHash };
}

export async function deleteOtpChallenge(ref: StoredOtpChallengeRef): Promise<void> {
  await db.delete(emailOtpChallenges).where(and(
    eq(emailOtpChallenges.challengeKey, ref.challengeKey),
    eq(emailOtpChallenges.otpHash, ref.otpHash),
  ));
}

export async function consumeOtpChallenge({
  email,
  purpose,
  otp,
}: {
  email: string;
  purpose: OtpPurpose;
  otp: string;
}): Promise<{ status: 'ok'; data: Record<string, unknown> } | { status: Exclude<OtpConsumeStatus, 'ok'> }> {
  const challengeKey = makeChallengeKey(email, purpose);
  const [record] = await db.select().from(emailOtpChallenges)
    .where(eq(emailOtpChallenges.challengeKey, challengeKey))
    .limit(1);

  if (!record || record.purpose !== purpose) return { status: 'missing' };

  const now = new Date();
  if (record.expiresAt.getTime() <= now.getTime()) {
    await db.delete(emailOtpChallenges).where(and(
      eq(emailOtpChallenges.challengeKey, challengeKey),
      eq(emailOtpChallenges.otpHash, record.otpHash),
    ));
    return { status: 'expired' };
  }

  const candidateHash = hashOtp(challengeKey, String(otp ?? '').trim());
  if (!matchesHash(record.otpHash, candidateHash)) {
    const [attempt] = await db.update(emailOtpChallenges)
      .set({ attempts: sql`${emailOtpChallenges.attempts} + 1` })
      .where(and(
        eq(emailOtpChallenges.challengeKey, challengeKey),
        eq(emailOtpChallenges.otpHash, record.otpHash),
        gt(emailOtpChallenges.expiresAt, now),
      ))
      .returning({ attempts: emailOtpChallenges.attempts });

    if (!attempt) return { status: 'missing' };
    if (attempt.attempts >= OTP_MAX_ATTEMPTS) {
      await db.delete(emailOtpChallenges).where(and(
        eq(emailOtpChallenges.challengeKey, challengeKey),
        eq(emailOtpChallenges.otpHash, record.otpHash),
      ));
      return { status: 'too_many_attempts' };
    }
    return { status: 'incorrect' };
  }

  // Delete with the hash and expiry in the predicate: simultaneous verifies
  // can consume this code only once, and a resend cannot be consumed by an
  // in-flight verification of the previous code.
  const [consumed] = await db.delete(emailOtpChallenges).where(and(
    eq(emailOtpChallenges.challengeKey, challengeKey),
    eq(emailOtpChallenges.purpose, purpose),
    eq(emailOtpChallenges.otpHash, record.otpHash),
    gt(emailOtpChallenges.expiresAt, now),
  )).returning({ challengeKey: emailOtpChallenges.challengeKey });

  if (!consumed) return { status: 'missing' };
  return { status: 'ok', data: (record.data || {}) as Record<string, unknown> };
}