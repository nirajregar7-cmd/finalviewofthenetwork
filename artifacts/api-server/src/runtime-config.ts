const DEFAULT_PUBLIC_APP_URL = 'https://www.the-network.co.in';

export function getPublicAppBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const configuredUrl = env.PUBLIC_APP_URL?.trim();
  const vercelUrl = env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || env.VERCEL_URL?.trim();
  const candidate = configuredUrl || vercelUrl || DEFAULT_PUBLIC_APP_URL;
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('PUBLIC_APP_URL must use HTTPS outside localhost.');
  }

  return parsed.origin;
}

