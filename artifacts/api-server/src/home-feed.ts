export const HOME_FEED_FILTERS = ['looking-for', 'beyond-campus', 'college', 'learn'] as const;
export type HomeFeedFilter = (typeof HOME_FEED_FILTERS)[number];

export interface HomeFeedScope {
  where: string[];
  params: unknown[];
}

export function normalizeHomeFeedRequest(
  requestedFilter: unknown,
  requestedLimit: unknown,
  requestedOffset: unknown,
) {
  const filterValue = String(requestedFilter || 'looking-for');
  const filter: HomeFeedFilter = HOME_FEED_FILTERS.includes(filterValue as HomeFeedFilter)
    ? filterValue as HomeFeedFilter
    : 'looking-for';
  const limitValue = Number.parseInt(String(requestedLimit || '12'), 10);
  const offsetValue = Number.parseInt(String(requestedOffset || '0'), 10);
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 20) : 12;
  const offset = Number.isFinite(offsetValue) ? Math.max(offsetValue, 0) : 0;
  return { filter, limit, offset };
}

/**
 * Builds the SQL predicates that define the viewer's Home feed scope.
 * Returning null means the viewer cannot have results for this filter.
 */
export function buildHomeFeedScope(
  filter: HomeFeedFilter,
  viewerId: string,
  viewerCollege?: string | null,
): HomeFeedScope | null {
  const where = ['u.is_suspended = false'];
  const params: unknown[] = [];
  const addParam = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filter === 'college' || filter === 'beyond-campus') {
    const college = viewerCollege?.trim();
    if (!viewerId) return null;
    if (filter === 'college' && !college) return null;
    if (college) {
      const collegeParam = addParam(college);
      const collegeScope = `(
        lower(trim(u.college)) = lower(trim(${collegeParam}))
        OR lower(trim(COALESCE(c.college, ''))) = lower(trim(${collegeParam}))
      )`;
      where.push(filter === 'college' ? collegeScope : `NOT ${collegeScope}`);
    }
  }

  if (filter === 'learn') {
    where.push(`(
      lower(COALESCE(p.academic_tag, '')) IN ('resource', 'question', 'discussion', 'learning')
      OR lower(COALESCE(p.tags::text, '')) ~ '(dsa|algorithm|coding|programming|machine learning|ai|cyber|web development|roadmap|resource|study|exam|placement)'
      OR lower(COALESCE(p.content, '')) ~ '(dsa|algorithm|coding|programming|machine learning|cybersecurity|web development|roadmap|study group|exam preparation|placement)'
    )`);
  }

  return { where, params };
}

export function sanitizeHomeFeedAuthorId(row: { id: string; authorId: string; isAnonymous?: boolean }) {
  return row.isAnonymous ? `anonymous:${row.id}` : row.authorId;
}