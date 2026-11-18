import { Client } from 'pg';

const userProfileSql = `
  SELECT
    u.id,
    u.full_name AS "fullName",
    u.college,
    u.school_name AS "schoolName",
    u.coaching_name AS "coachingName",
    u.location,
    u.branch,
    u.degree,
    u.academic_stream AS "academicStream",
    u.program_group AS "programGroup",
    u.fields,
    u.year,
    u.email,
    CASE
      WHEN u.avatar LIKE 'data:%'
        OR (u.avatar NOT LIKE 'http%' AND length(u.avatar) > 200000)
        OR u.avatar LIKE '%' || '/api/users/' || u.id || '/avatar%'
      THEN '/api/users/' || u.id || '/avatar'
      ELSE u.avatar
    END AS avatar,
    u.cover_image AS "coverImage",
    u.about_me AS "aboutMe",
    u.interests,
    u.skills,
    u.looking_for AS "lookingFor",
    COALESCE(
      (
        SELECT CASE r.purpose
          WHEN 'Study Partner' THEN 'DSA Partner'
          WHEN 'Coding Partner' THEN 'DSA Partner'
          WHEN 'Project Partner' THEN 'Project Teammate'
          WHEN 'Hackathon Teammates' THEN 'Hackathon Team'
          WHEN 'Senior Guidance' THEN 'Mentor'
          WHEN 'Internship Partner' THEN 'Internship Guidance'
          ELSE r.purpose
        END
        FROM find_people_requests r
        WHERE r.host_id = u.id AND r.status = 'active'
        ORDER BY r.created_at DESC
        LIMIT 1
      ),
      NULL
    ) AS "connectPreference",
    u.is_verified AS "isVerified",
    u.is_suspended AS "isSuspended",
    u.role,
    u.college_admin_of AS "collegeAdminOf",
    u.privacy_settings AS "privacySettings",
    u.created_at AS "createdAt"
  FROM users u
`;

const postsSql = `
  SELECT
    id,
    author_id AS "authorId",
    is_anonymous AS "isAnonymous",
    content,
    likes,
    votes,
    community_id AS "communityId",
    academic_tag AS "academicTag",
    project_title AS "projectTitle",
    feeling,
    website_url AS "websiteUrl",
    tags,
    attachment_name AS "attachmentName",
    attachment_mime_type AS "attachmentMimeType",
    poll_options AS "pollOptions",
    poll_votes AS "pollVotes",
    reshared_from_id AS "resharedFromId",
    created_at AS "createdAt",
    (post_image IS NOT NULL AND post_image <> '') AS "hasImage",
    (attachment_data IS NOT NULL AND attachment_data <> '') AS "hasAttachment"
  FROM posts
  ORDER BY created_at DESC
`;

const commentsSql = `
  SELECT
    id,
    post_id AS "postId",
    author_id AS "authorId",
    is_anonymous AS "isAnonymous",
    reply_to_id AS "replyToId",
    content,
    created_at AS "createdAt"
  FROM comments
  ORDER BY created_at
`;

const connectionsSql = `
  SELECT
    id,
    sender_id AS "senderId",
    receiver_id AS "receiverId",
    type,
    message,
    status,
    created_at AS "createdAt"
  FROM connections
  WHERE sender_id = $1 OR receiver_id = $1
  ORDER BY created_at DESC
`;

const storiesSql = `
  SELECT
    id,
    author_id AS "authorId",
    content,
    viewed_by AS "viewedBy",
    reactions,
    likes,
    created_at AS "createdAt",
    (image IS NOT NULL AND image <> '') AS "hasImage"
  FROM stories
  ORDER BY created_at DESC
`;

const communitiesSql = `
  SELECT
    id, name, description, icon,
    member_ids AS "memberIds",
    tags, category, threads, resources, polls,
    college,
    creator_id AS "creatorId",
    admin_ids AS "adminIds",
    blocked_member_ids AS "blockedMemberIds",
    created_at AS "createdAt"
  FROM communities
  ORDER BY created_at
`;

function logDatabaseError(message, error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  const sanitize = (value) => value
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[database-url]')
    .replace(/\b(password|token|secret)=\S+/gi, '$1=[redacted]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]');
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;

  console.error(message, {
    name: error instanceof Error ? error.name : 'UnknownError',
    code,
    message: sanitize(errorMessage),
    stack: errorStack ? sanitize(errorStack) : undefined,
  });
}

async function queryHyperdrive(env, sql, parameters = []) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
  });

  try {
    await client.connect();
    return await client.query(sql, parameters);
  } finally {
    try {
      await client.end();
    } catch (error) {
      logDatabaseError('Cloudflare database client close failed.', error);
    }
  }
}

function serializable(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function mapUserProfile(row) {
  return {
    ...row,
    collegeAdminOf: row.collegeAdminOf ?? null,
    createdAt: serializable(row.createdAt),
  };
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function ids(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function mergeEngagement(rows, key, rootId) {
  const merged = {};
  const ordered = rows
    .filter((row) => row.id !== rootId)
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt)
      || left.id.localeCompare(right.id));
  const root = rows.find((row) => row.id === rootId);

  for (const row of [...ordered, ...(root ? [root] : [])]) {
    Object.assign(merged, record(row[key]));
  }
  return merged;
}

export function buildPostEngagement(posts, comments) {
  const postById = new Map(posts.map((post) => [post.id, post]));
  const rootForPost = (postId) => {
    let current = postById.get(postId);
    if (!current) return postId;

    const visited = new Set();
    while (current.resharedFromId) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const parent = postById.get(current.resharedFromId);
      if (!parent) return current.resharedFromId;
      current = parent;
    }
    return current.id;
  };

  const rowsByRoot = new Map();
  for (const post of posts) {
    const rootId = rootForPost(post.id);
    const group = rowsByRoot.get(rootId) || [];
    group.push(post);
    rowsByRoot.set(rootId, group);
  }

  const commentsByRoot = new Map();
  const commentIdsByRoot = new Map();
  for (const comment of comments) {
    const rootId = rootForPost(comment.postId);
    const seen = commentIdsByRoot.get(rootId) || new Set();
    if (seen.has(comment.id)) continue;
    seen.add(comment.id);
    commentIdsByRoot.set(rootId, seen);
    const group = commentsByRoot.get(rootId) || [];
    group.push(comment);
    commentsByRoot.set(rootId, group);
  }

  const byPostId = new Map();
  for (const [rootId, group] of rowsByRoot) {
    const engagement = {
      likes: [...new Set(group.flatMap((post) => ids(post.likes)))],
      votes: mergeEngagement(group, 'votes', rootId),
      pollVotes: mergeEngagement(group, 'pollVotes', rootId),
      comments: commentsByRoot.get(rootId) || [],
    };
    for (const post of group) byPostId.set(post.id, engagement);
  }
  return byPostId;
}

export function normalizePost(post, engagement) {
  const image = post.hasImage ? `/api/posts/${encodeURIComponent(post.id)}/image?index=0` : null;
  const postComments = (engagement?.comments || []).map((comment) => ({
    id: comment.id,
    postId: comment.postId,
    authorId: comment.isAnonymous ? `anonymous:${comment.id}` : comment.authorId,
    isAnonymous: comment.isAnonymous,
    replyToId: comment.replyToId,
    content: comment.content,
    createdAt: serializable(comment.createdAt),
  }));
  return {
    id: post.id,
    authorId: post.authorId,
    isAnonymous: post.isAnonymous,
    content: post.content,
    likes: engagement?.likes || ids(post.likes),
    votes: engagement?.votes || record(post.votes),
    communityId: post.communityId,
    academicTag: post.academicTag,
    projectTitle: post.projectTitle,
    feeling: post.feeling,
    websiteUrl: post.websiteUrl,
    tags: post.tags,
    attachmentName: post.hasAttachment ? post.attachmentName : null,
    attachmentMimeType: post.attachmentMimeType,
    attachment: post.hasAttachment && post.attachmentName
      ? {
          name: post.attachmentName,
          mimeType: post.attachmentMimeType ?? null,
          url: `/api/posts/${encodeURIComponent(post.id)}/attachment`,
        }
      : null,
    pollOptions: post.pollOptions,
    pollVotes: engagement?.pollVotes || record(post.pollVotes),
    resharedFromId: post.resharedFromId,
    createdAt: serializable(post.createdAt),
    postImage: image,
    postImages: image ? [image] : [],
    comments: postComments,
  };
}

export function normalizeCommunity(community) {
  const memberIds = ids(community.memberIds);
  const creatorId = typeof community.creatorId === 'string' ? community.creatorId : '';
  const headId = creatorId && creatorId !== 'system'
    ? creatorId
    : memberIds.find((id) => id.length > 0) || null;
  if (!headId) {
    return {
      ...community,
      createdAt: serializable(community.createdAt),
    };
  }
  const adminIds = [...new Set([
    headId,
    ...ids(community.adminIds).filter((id) => id !== 'system'),
  ])];

  return {
    ...community,
    ...(headId ? { creatorId: headId } : {}),
    adminIds,
    createdAt: serializable(community.createdAt),
  };
}

export function sanitizeApiResponse(value, userId, isAdmin, exposeOwnEmail = false) {
  if (value instanceof Date || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeApiResponse(item, userId, isAdmin, exposeOwnEmail));
  }

  const recordId = typeof value.id === 'string' ? value.id : null;
  const safe = {};
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if ([
      'passwordhash', 'password_hash', 'tokenhash', 'token_hash', 'otphash', 'otp_hash',
    ].includes(normalizedKey)) continue;
    if (
      normalizedKey === 'email'
      && !isAdmin
      && !exposeOwnEmail
      && (!userId || recordId !== userId)
    ) continue;
    safe[key] = sanitizeApiResponse(item, userId, isAdmin, exposeOwnEmail);
  }
  return safe;
}

export async function readAuthSession(tokenHash, env) {
  if (!env.HYPERDRIVE?.connectionString) throw new Error('Database connection is not configured.');
  const { rows } = await queryHyperdrive(env, `
    SELECT s.user_id AS "userId", s.revoked_at AS "revokedAt",
           u.role, u.is_suspended AS "isSuspended"
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > NOW()
    LIMIT 1
  `, [tokenHash]);
  return rows[0] || null;
}

export async function readAuthUserProfile(userId, env) {
  const { rows } = await queryHyperdrive(env, `${userProfileSql} WHERE u.id = $1 LIMIT 1`, [userId]);
  return rows[0] ? mapUserProfile(rows[0]) : null;
}

export async function readBootstrap(userId, role, env) {
  if (!env.HYPERDRIVE?.connectionString) throw new Error('Database connection is not configured.');
  const [
    usersResult,
    postsResult,
    commentsResult,
    connectionsResult,
    storiesResult,
    communitiesResult,
  ] = await Promise.all([
    queryHyperdrive(env, userProfileSql),
    queryHyperdrive(env, postsSql),
    queryHyperdrive(env, commentsSql),
    queryHyperdrive(env, connectionsSql, [userId]),
    queryHyperdrive(env, storiesSql),
    queryHyperdrive(env, communitiesSql),
  ]);

  const isAdmin = role === 'admin';
  const visibleUsers = usersResult.rows
    .filter((user) => isAdmin
      || user.id === userId
      || (user.isSuspended !== true && user.privacySettings?.hideProfileFromSearch !== true))
    .map(mapUserProfile);
  const engagementByPostId = buildPostEngagement(postsResult.rows, commentsResult.rows);
  const result = {
    users: visibleUsers,
    posts: postsResult.rows.map((post) => normalizePost(post, engagementByPostId.get(post.id))),
    connections: connectionsResult.rows.map((connection) => ({
      ...connection,
      createdAt: serializable(connection.createdAt),
    })),
    stories: storiesResult.rows.map((story) => ({
      id: story.id,
      authorId: story.authorId,
      content: story.content,
      viewedBy: story.viewedBy,
      reactions: story.reactions,
      likes: Array.isArray(story.likes) ? story.likes : [],
      createdAt: serializable(story.createdAt),
      image: story.hasImage ? `/api/stories/${encodeURIComponent(story.id)}/image` : null,
    })),
    communities: communitiesResult.rows.map(normalizeCommunity),
  };

  return sanitizeApiResponse(result, userId, isAdmin);
}

export function hashBearerToken(token) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    .then((digest) => [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(''));
}

export function logNativeApiError(message, error) {
  logDatabaseError(message, error);
}
