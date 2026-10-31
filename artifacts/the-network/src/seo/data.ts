import { API_ORIGIN, IS_STATIC_SITE_HOST } from '../api';

function apiUrl(path: string): string {
  return `${API_ORIGIN.replace(/\/$/, '')}${path}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`SEO data request failed (${response.status})`);
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error('SEO data endpoint returned a non-JSON response');
  }
  return response.json() as Promise<T>;
}

export async function loadSeoData<T>(resource: string): Promise<T> {
  const urls = [
    ...(IS_STATIC_SITE_HOST ? [`/seo-data/${encodeURIComponent(resource)}.json`] : []),
    apiUrl(`/api/seo/${encodeURIComponent(resource)}`),
  ];
  let lastError: unknown;
  for (const url of urls) {
    try {
      return await fetchJson<T>(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not load SEO data');
}

export async function loadSeoDetail<T>(resource: 'college' | 'community', slug: string): Promise<T> {
  const encodedSlug = encodeURIComponent(slug);
  const urls = [
    ...(IS_STATIC_SITE_HOST ? [`/seo-data/${resource}-details/${encodedSlug}.json`] : []),
    apiUrl(`/api/seo/${resource}/${encodedSlug}`),
  ];
  let lastError: unknown;
  for (const url of urls) {
    try {
      return await fetchJson<T>(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not load SEO detail');
}