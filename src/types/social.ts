
export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  artist_type?: string;
  bio?: string | null;
  website?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  content_id: string;
  content_type: string;
  user_profile?: Profile;
}

export interface Like {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
}

export interface Artwork {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
  user_id: string;
  genre?: string;
  description?: string;
  tags?: string[];
  type: 'artwork';
}

export interface MusicTrack {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
  user_id: string;
  duration: number;
  genre?: string;
  description?: string;
  tags?: string[];
  type: 'music';
}

export type Content = Artwork | MusicTrack;

export interface Inspiration {
  id: string;
  source_id: string;
  source_type: string;
  inspired_id: string;
  inspired_type: string;
  created_at: string;
}

export type PrivacyMode = "public" | "followers" | "private";

export interface UserSettings {
  id?: string;
  user_id: string;
  dark_mode: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  privacy_mode: PrivacyMode;
  created_at?: string;
  updated_at?: string;
}

// Add proper interface for the inspired by source
export interface InspiredBy {
  id: string;
  title: string;
  type: string;
}

// New interfaces for notifications
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  content_id?: string;
  content_type?: string;
  actor_id: string;
  read: boolean;
  created_at: string;
}

export type NotificationType = 'like' | 'comment' | 'follow';

// Interface for user stats
export interface UserStats {
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
}

// Interface for displaying followers/following
export interface FollowConnection {
  id: string;
  profile: Profile;
  created_at: string;
}
