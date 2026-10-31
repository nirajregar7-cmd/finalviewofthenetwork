import { UserProfile, Post, Community, Connection, DirectMessage, UserReport, Story } from '../types';

export const INITIAL_STORIES: Story[] = [];
export const INITIAL_COMMUNITIES: Community[] = [];
export const INITIAL_USERS: UserProfile[] = [];
export const INITIAL_POSTS: Post[] = [];
export const INITIAL_CONNECTIONS: Connection[] = [];
export const INITIAL_MESSAGES: DirectMessage[] = [];
export const MOCK_REPORTS: UserReport[] = [];

export function getSimulatedReply(_partnerId: string, _userMessage: string): string {
  return "Thanks for your message! Let's connect.";
}
