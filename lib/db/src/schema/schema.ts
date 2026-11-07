import { pgTable, text, boolean, integer, timestamp, jsonb, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().default('General'), // Hackathon, Study Group, Seminar, Workshop, Social, Sports, Cultural
  date: text('date').notNull(),   // ISO string or human-readable
  time: text('time').notNull().default(''),
  venue: text('venue').notNull().default(''),
  organizer: text('organizer').notNull().default(''),
  organizerId: text('organizer_id').notNull(),
  college: text('college').notNull().default(''),
  registeredIds: jsonb('registered_ids').notNull().default([]),
  maxSeats: integer('max_seats'),
  isOnline: boolean('is_online').notNull().default(false),
  link: text('link').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  actorId: text('actor_id').notNull(),
  type: text('type').notNull(), // 'like' | 'comment' | 'connection_request' | 'connection_accepted' | 'message'
  title: text('title').notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notificationEmailQueue = pgTable('notification_email_queue', {
  id: text('id').primaryKey(),
  recipientId: text('recipient_id').notNull(),
  eventType: text('event_type').notNull(),
  dedupeKey: text('dedupe_key').notNull(),
  payload: jsonb('payload').notNull().default({}),
  scheduledAt: timestamp('scheduled_at').notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lockedAt: timestamp('locked_at'),
  sentAt: timestamp('sent_at'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  dedupeKeyUnique: uniqueIndex('notification_email_queue_dedupe_idx').on(table.dedupeKey),
}));

export const emailOtpChallenges = pgTable('email_otp_challenges', {
  challengeKey: text('challenge_key').primaryKey(),
  purpose: text('purpose').notNull(),
  otpHash: text('otp_hash').notNull(),
  data: jsonb('data').notNull().default({}),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  expiresAtIdx: index('email_otp_challenges_expires_at_idx').on(table.expiresAt),
}));

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  creatorId: text('creator_id').notNull(),
  stage: text('stage').notNull().default('Idea'),
  tags: jsonb('tags').notNull().default([]),
  lookingFor: jsonb('looking_for').notNull().default([]),
  memberIds: jsonb('member_ids').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  college: text('college').notNull(),
  schoolName: text('school_name').notNull().default(''),
  coachingName: text('coaching_name').notNull().default(''),
  location: text('location').notNull().default(''),
  branch: text('branch').notNull(),
  degree: text('degree').notNull().default(''),
  academicStream: text('academic_stream').notNull().default(''),
  programGroup: text('program_group').notNull().default(''),
  fields: jsonb('fields').notNull().default([]),
  year: integer('year').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar').notNull(),
  coverImage: text('cover_image'),
  aboutMe: text('about_me').notNull().default(''),
  interests: jsonb('interests').notNull().default([]),
  skills: jsonb('skills').notNull().default([]),
  lookingFor: jsonb('looking_for').notNull().default([]),
  connectPreference: text('connect_preference'),
  isVerified: boolean('is_verified').notNull().default(false),
  isSuspended: boolean('is_suspended').notNull().default(false),
  role: text('role').notNull().default('student'),
  collegeAdminOf: text('college_admin_of'),
  privacySettings: jsonb('privacy_settings').notNull().default({
    showEmail: true,
    onlyAllowVerifiedConnections: false,
    hideProfileFromSearch: false,
    directMessages: 'connections',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const workshopRegistrations = pgTable('workshop_registrations', {
  id: text('id').primaryKey(),
  workshopId: text('workshop_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  registeredAt: timestamp('registered_at').notNull().defaultNow(),
}, (table) => ({
  workshopUserUnique: uniqueIndex('workshop_registrations_workshop_id_user_id_key').on(table.workshopId, table.userId),
  workshopIdIdx: index('workshop_registrations_workshop_id_idx').on(table.workshopId),
}));

export const hostedWorkshops = pgTable('hosted_workshops', {
  id: text('id').primaryKey(),
  hostUserId: text('host_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  scheduledDate: text('scheduled_date').notNull().default(''),
  venue: text('venue').notNull().default(''),
  isOnline: boolean('is_online').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  hostUserIdIdx: index('hosted_workshops_host_user_id_idx').on(table.hostUserId),
}));

export const collegeAnnouncements = pgTable('college_announcements', {
  id: text('id').primaryKey(),
  college: text('college').notNull(),
  authorId: text('author_id').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  content: text('content').notNull(),
  likes: jsonb('likes').notNull().default([]),
  votes: jsonb('votes').notNull().default({}),
  communityId: text('community_id'),
  academicTag: text('academic_tag'),
  projectTitle: text('project_title'),
  postImage: text('post_image'),
  feeling: text('feeling'),
  websiteUrl: text('website_url'),
  tags: jsonb('tags').notNull().default([]),
  attachmentName: text('attachment_name'),
  attachmentData: text('attachment_data'),
  attachmentMimeType: text('attachment_mime_type'),
  pollOptions: jsonb('poll_options'),
  pollVotes: jsonb('poll_votes'),
  resharedFromId: text('reshared_from_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const savedItems = pgTable('saved_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(),
  itemId: text('item_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userItemUnique: uniqueIndex('saved_items_user_item_idx').on(table.userId, table.itemType, table.itemId),
}));

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  replyToId: text('reply_to_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const connections = pgTable('connections', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  message: text('message').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userBlocks = pgTable('user_blocks', {
  blockerId: text('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedUserId: text('blocked_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
  userBlockUnique: uniqueIndex('user_blocks_pair_idx').on(table.blockerId, table.blockedUserId),
}));

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  attachmentName: text('attachment_name'),
  attachmentData: text('attachment_data'),
  attachmentMimeType: text('attachment_mime_type'),
  pollOptions: jsonb('poll_options'),
  pollVotes: jsonb('poll_votes'),
  replyToId: text('reply_to_id'),
  reactions: jsonb('reactions').notNull().default({}),
  isRead: boolean('is_read').notNull().default(false),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  anonymousPostId: text('anonymous_post_id'),
  clientMessageId: text('client_message_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull().default('Users'),
  memberIds: jsonb('member_ids').notNull().default([]),
  tags: jsonb('tags').notNull().default([]),
  category: text('category').notNull().default('General'),
  threads: jsonb('threads').notNull().default([]),
  resources: jsonb('resources').notNull().default([]),
  polls: jsonb('polls').notNull().default([]),
  college: text('college'),
  creatorId: text('creator_id'),
  adminIds: jsonb('admin_ids').notNull().default([]),
  blockedMemberIds: jsonb('blocked_member_ids').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const aptitudeExams = pgTable('aptitude_exams', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  durationSeconds: integer('duration_seconds').notNull().default(900),
  maxMarks: integer('max_marks').notNull().default(15),
  questions: jsonb('questions').notNull().default([]),
  sourceNote: text('source_note').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const aptitudeAttempts = pgTable('aptitude_attempts', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull().references(() => aptitudeExams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  submittedAt: timestamp('submitted_at'),
  answers: jsonb('answers').notNull().default({}),
  score: integer('score').notNull().default(0),
  maxMarks: integer('max_marks').notNull().default(15),
  status: text('status').notNull().default('in_progress'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const dailyCommunityQuizzes = pgTable('daily_community_quizzes', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  quizDate: date('quiz_date', { mode: 'string' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  questions: jsonb('questions').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  communityDateUnique: uniqueIndex('daily_community_quizzes_community_date_idx')
    .on(table.communityId, table.quizDate),
  quizDateIdx: index('daily_community_quizzes_date_idx').on(table.quizDate),
}));

export const dailyCommunityQuizAttempts = pgTable('daily_community_quiz_attempts', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull().references(() => dailyCommunityQuizzes.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  answers: jsonb('answers').notNull().default({}),
  score: integer('score').notNull().default(0),
  maxScore: integer('max_score').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  quizUserUnique: uniqueIndex('daily_community_quiz_attempts_quiz_user_idx')
    .on(table.quizId, table.userId),
  quizLeaderboardIdx: index('daily_community_quiz_attempts_leaderboard_idx')
    .on(table.quizId, table.score, table.submittedAt),
}));

export const stories = pgTable('stories', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  image: text('image'),
  content: text('content').notNull(),
  viewedBy: jsonb('viewed_by').notNull().default([]),
  reactions: jsonb('reactions').notNull().default({}),
  likes: jsonb('likes').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reportedUserId: text('reported_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupChats = pgTable('group_chats', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('fun'),
  creatorId: text('creator_id').notNull(),
  college: text('college').notNull(),
  branch: text('branch'),
  communityId: text('community_id'),
  description: text('description').notNull().default(''),
  purpose: text('purpose').notNull().default('chat'),
  visibility: text('visibility').notNull().default('private'),
  memberIds: jsonb('member_ids').notNull().default([]),
  pendingIds: jsonb('pending_ids').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupMessages = pgTable('group_messages', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull(),
  senderId: text('sender_id').notNull(),
  content: text('content').notNull(),
  attachmentName: text('attachment_name'),
  attachmentData: text('attachment_data'),
  attachmentMimeType: text('attachment_mime_type'),
  pollOptions: jsonb('poll_options'),
  pollVotes: jsonb('poll_votes'),
  replyToId: text('reply_to_id'),
  reactions: jsonb('reactions').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const attendanceSubjects = pgTable('attendance_subjects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  totalClasses: integer('total_classes').notNull().default(0),
  presentClasses: integer('present_classes').notNull().default(0),
  targetPercent: integer('target_percent').notNull().default(75),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  stories: many(stories),
  sentConnections: many(connections, { relationName: 'sender' }),
  receivedConnections: many(connections, { relationName: 'receiver' }),
  sentMessages: many(messages, { relationName: 'msgSender' }),
  receivedMessages: many(messages, { relationName: 'msgReceiver' }),
  filedReports: many(reports, { relationName: 'reporter' }),
  receivedReports: many(reports, { relationName: 'reportedUser' }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  sender: one(users, { fields: [connections.senderId], references: [users.id], relationName: 'sender' }),
  receiver: one(users, { fields: [connections.receiverId], references: [users.id], relationName: 'receiver' }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: 'msgSender' }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id], relationName: 'msgReceiver' }),
}));

export const storiesRelations = relations(stories, ({ one }) => ({
  author: one(users, { fields: [stories.authorId], references: [users.id] }),
}));

export const collegeSettings = pgTable('college_settings', {
  college: text('college').primaryKey(),
  coverImage: text('cover_image'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, { fields: [reports.reporterId], references: [users.id], relationName: 'reporter' }),
  reportedUser: one(users, { fields: [reports.reportedUserId], references: [users.id], relationName: 'reportedUser' }),
}));

export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  lastHeartbeat: timestamp('last_heartbeat').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  userAgent: text('user_agent').notNull().default(''),
  page: text('page').notNull().default('feed'),
});

export const referrals = pgTable('referrals', {
  id: text('id').primaryKey(),
  referrerId: text('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredUserId: text('referred_user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const findPeopleRequests = pgTable('find_people_requests', {
  id: text('id').primaryKey(),
  hostId: text('host_id').notNull(),
  purpose: text('purpose').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  eligibilityCollege: text('eligibility_college').notNull().default('same'),
  eligibilityYear: text('eligibility_year').notNull().default('Any'),
  eligibilityBranch: text('eligibility_branch').notNull().default('Any'),
  genderPreference: text('gender_preference').notNull().default('Anyone'),
  maxApplicants: integer('max_applicants').notNull().default(5),
  preferredTime: text('preferred_time').notNull().default(''),
  meetingLocation: text('meeting_location').notNull().default(''),
  status: text('status').notNull().default('active'),
  college: text('college').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const findPeopleApplications = pgTable('find_people_applications', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull(),
  applicantId: text('applicant_id').notNull(),
  intro: text('intro').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const customColleges = pgTable('custom_colleges', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const networkCompetitions = pgTable('network_competitions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  track: text('track').notNull().default('DSA & Build'),
  status: text('status').notNull().default('registration'),
  teamSize: integer('team_size').notNull().default(3),
  registrationDeadline: timestamp('registration_deadline').notNull(),
  buildStartsAt: timestamp('build_starts_at').notNull(),
  submissionDeadline: timestamp('submission_deadline').notNull(),
  judgingEndsAt: timestamp('judging_ends_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const networkCompetitionTeams = pgTable('network_competition_teams', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id').notNull(),
  name: text('name').notNull(),
  college: text('college').notNull(),
  captainId: text('captain_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  memberIds: jsonb('member_ids').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const networkCompetitionSubmissions = pgTable('network_competition_submissions', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id').notNull(),
  teamId: text('team_id').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  githubUrl: text('github_url').notNull().default(''),
  demoUrl: text('demo_url').notNull().default(''),
  videoUrl: text('video_url').notNull().default(''),
  techStack: jsonb('tech_stack').notNull().default([]),
  judgeScore: integer('judge_score').notNull().default(0),
  status: text('status').notNull().default('submitted'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const networkCompetitionVotes = pgTable('network_competition_votes', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull(),
  voterId: text('voter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
