export type Content = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  image_url: string;
  audio_url: string;
  created_at: string;
  type: ContentType;
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
