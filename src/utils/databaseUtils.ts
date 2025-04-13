import { supabase } from "@/integrations/supabase/client";
import { Like, Comment, Follow, Profile, Content, UserSettings, PrivacyMode } from "@/types/social";
import { toast } from "@/hooks/use-toast";

export const fetchProfiles = async (userIds: string[]): Promise<Record<string, Profile>> => {
  try {
    if (userIds.length === 0) return {};
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, artist_type, bio, website')
      .in('id', userIds);
      
    if (error) throw error;
    
    const profilesMap = (data || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, Profile>);
    
    return profilesMap;
  } catch (error: any) {
    console.error('Error fetching profiles:', error);
    return {};
  }
};

export const fetchUserLikes = async (userId: string): Promise<Record<string, boolean>> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('content_id')
      .eq('user_id', userId);
      
    if (error) throw error;
    
    const likedMap = (data || []).reduce((acc, like) => {
      acc[like.content_id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    return likedMap;
  } catch (error: any) {
    console.error('Error fetching user likes:', error);
    return {};
  }
};

export const fetchUserFollows = async (userId: string): Promise<Record<string, boolean>> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', userId);
      
    if (error) throw error;
    
    const followsMap = (data || []).reduce((acc, follow) => {
      acc[follow.followed_id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    return followsMap;
  } catch (error: any) {
    console.error('Error fetching user follows:', error);
    return {};
  }
};

export const fetchComments = async (contentId: string, contentType: string): Promise<Comment[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, content_id, content_type')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    const userIds = [...new Set((data || []).map(comment => comment.user_id))];
    const profiles = await fetchProfiles(userIds);
    
    const commentsWithProfiles = (data || []).map(comment => {
      return {
        ...comment,
        user_profile: profiles[comment.user_id]
      };
    });
    
    return commentsWithProfiles;
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const likeContent = async (
  userId: string, 
  content: Content,
  isLiked: boolean
): Promise<boolean> => {
  try {
    if (isLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('content_id', content.id);
        
      if (error) throw error;
      
      toast({
        title: "Like removed",
        variant: "default",
      });
      
      return false;
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: userId,
          content_id: content.id,
          content_type: content.type
        });
        
      if (error) throw error;
      
      toast({
        title: "Content liked!",
        variant: "default",
      });
      
      return true;
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
    return isLiked;
  }
};

export const followUser = async (
  currentUserId: string,
  targetUserId: string,
  isFollowing: boolean
): Promise<boolean> => {
  try {
    if (currentUserId === targetUserId) {
      toast({
        title: "Cannot follow yourself",
        variant: "default",
      });
      return isFollowing;
    }
    
    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('followed_id', targetUserId);
        
      if (error) throw error;
      
      toast({
        title: "Unfollowed user",
        variant: "default",
      });
      
      return false;
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUserId,
          followed_id: targetUserId
        });
        
      if (error) throw error;
      
      toast({
        title: "Following user!",
        variant: "default",
      });
      
      return true;
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
    return isFollowing;
  }
};

export const addComment = async (
  userId: string,
  contentId: string,
  contentType: string,
  content: string,
  userProfile?: Profile
): Promise<Comment | null> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        content: content.trim()
      })
      .select();
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      const newComment: Comment = {
        ...data[0],
        user_profile: userProfile
      };
      
      toast({
        title: "Comment added",
        variant: "default",
      });
      
      return newComment;
    }
    
    return null;
  } catch (error: any) {
    toast({
      title: "Error adding comment",
      description: error.message,
      variant: "destructive",
    });
    return null;
  }
};

export const saveInspirationSource = async (contentId: string, contentTitle: string, contentType: string) => {
  try {
    localStorage.setItem('inspired_by', JSON.stringify({
      id: contentId,
      title: contentTitle,
      type: contentType
    }));
    return true;
  } catch (error) {
    console.error('Error saving inspiration source:', error);
    return false;
  }
};

export const fetchUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) throw error;
    
    if (data) {
      const privacyMode = validatePrivacyMode(data.privacy_mode);
      
      return {
        ...data,
        privacy_mode: privacyMode
      } as UserSettings;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error fetching user settings:', error);
    return null;
  }
};

const validatePrivacyMode = (mode: any): PrivacyMode => {
  if (mode === "public" || mode === "followers" || mode === "private") {
    return mode;
  }
  return "public";
};

export const updateUserSetting = async <T extends keyof UserSettings>(
  userId: string,
  key: T,
  value: UserSettings[T]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_settings')
      .update({ [key]: value })
      .eq('user_id', userId);
      
    if (error) throw error;
    
    return true;
  } catch (error: any) {
    console.error(`Error updating ${key}:`, error);
    return false;
  }
};
