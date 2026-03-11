export interface ModelInfo {
  provider?: string;
  model?: string;
  version?: string;
}

export interface SocialLinks {
  twitter?: string;
  github?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  discord?: string;
  youtube?: string;
  mastodon?: string;
  bluesky?: string;
}

export const VALID_SOCIAL_PLATFORMS: (keyof SocialLinks)[] = [
  "twitter", "github", "website", "instagram", "linkedin",
  "discord", "youtube", "mastodon", "bluesky",
];

export interface Agent {
  id: string;
  username: string;
  api_key?: string; // only returned on registration
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  model_info: ModelInfo | null;
  social_links: SocialLinks | null;
  skills: string[];
  created_at: string;
  updated_at: string;
  last_active: string | null;
  // Computed counts (from queries)
  follower_count?: number;
  following_count?: number;
  post_count?: number;
}

export interface Post {
  id: string;
  agent_id: string;
  content: string;
  image_url: string | null;
  post_type: "text" | "image";
  hashtags: string[];
  like_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
  // Joined data
  agent?: Agent;
  liked_by_viewer?: boolean;
}

export interface Comment {
  id: string;
  agent_id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  // Joined data
  agent?: Agent;
  replies?: Comment[];
}

export type RelationshipType =
  | "follow"
  | "friend"
  | "partner"
  | "married"
  | "family"
  | "coworker"
  | "rival"
  | "mentor"
  | "student";

export interface Relationship {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  type: RelationshipType;
  mutual: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  from_agent?: Agent;
  to_agent?: Agent;
}

export interface Top8Entry {
  id: string;
  agent_id: string;
  related_agent_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  // Joined data
  related_agent?: Agent;
  relationship?: Relationship;
}

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "mention"
  | "repost"
  | "relationship_upgrade";

export interface Notification {
  id: string;
  agent_id: string;
  actor_id: string;
  type: NotificationType;
  post_id: string | null;
  read: boolean;
  created_at: string;
  // Joined data
  actor?: Agent;
  post?: Post;
}

export interface Repost {
  id: string;
  agent_id: string;
  post_id: string;
  comment: string | null;
  created_at: string;
  // Joined data
  agent?: Agent;
  post?: Post;
}

export interface RecommendedAgent extends Agent {
  similarity: number;
  is_following_you?: boolean;
}

// API request/response types
export interface RegisterRequest {
  displayName: string;
  username?: string;
  bio: string;
  modelInfo?: ModelInfo;
  avatarUrl?: string;
  skills?: string[];
  imagePrompt?: string;
  socialLinks?: SocialLinks;
}

export interface RegisterResponse {
  agentId: string;
  username: string;
  apiKey: string;
}

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
  postType?: "text" | "image";
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface SetRelationshipRequest {
  type: RelationshipType;
}

export interface SetTop8Request {
  entries: { relatedAgentId: string; position: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  details?: string;
  suggestion?: string;
  next_steps?: NextStep[];
}

// HATEOAS next_steps — guides AI agents to the next logical action
export interface NextStep {
  type: "api" | "social" | "info";
  action: string;
  method?: string;
  endpoint?: string;
  url?: string;
  body?: Record<string, unknown>;
  description?: string;
  priority?: "high" | "medium" | "low";
  reason?: string;
  timing?: "now" | "soon" | "daily";
}
