
export type Content = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at?: string;
  type: ContentType;
  // Optional fields that may exist depending on content type
  image_url?: string;
  audio_url?: string;
  genre?: string;
  tags?: string[];
  duration?: number;
};

export type ContentType = 'artwork' | 'music';

export type Inspiration = {
  id: string;
  source_id: string;
  source_type: ContentType;
  inspired_id: string;
  inspired_type: ContentType;
  created_at: string;
};

export type InspiredBy = {
  id: string;
  title: string;
  type: ContentType;
};

export type UserSettings = {
  id?: string;
  user_id: string;
  dark_mode: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  privacy_mode: PrivacyMode;
  created_at?: string;
  updated_at?: string;
};

export type PrivacyMode = "public" | "followers" | "private";

export type Profile = {
  id: string;
  name: string;
  artist_type: string;
  bio: string;
  avatar_url: string;
  background_url: string;
  website: string;
  created_at: string;
  updated_at: string;
  likes_credit: number;
  likes_points: number;
};

export type Like = {
  id: string;
  user_id: string;
  content_id: string;
  content_type: ContentType;
  created_at: string;
};

export type Comment = {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  content: string;
  created_at: string;
  user_profile?: Profile;
};

export type Follow = {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
};

export type FollowConnection = {
  id: string;
  profile: Profile;
  created_at: string;
};

export type NotificationType = 'like' | 'comment' | 'follow';

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  content_id?: string;
  content_type?: string;
  read: boolean;
  created_at: string;
};

export type UserStats = {
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
};
