
import { supabase } from "@/integrations/supabase/client";
import { Like, Comment, Follow, Profile, Content, UserSettings, PrivacyMode, InspiredBy, Notification, NotificationType, UserStats, FollowConnection } from "@/types/social";
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
    // First, check if user has likes credit
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('likes_credit')
      .eq('id', userId)
      .single();
      
    if (!userProfile) {
      toast({
        title: "Error",
        description: "User profile not found.",
        variant: "destructive",
      });
      return isLiked;
    }
    
    // Default to 5 if likes_credit is null
    const likesCredit = userProfile.likes_credit ?? 5;
    
    if (isLiked) {
      // If already liked, remove the like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('content_id', content.id);
        
      if (error) throw error;
      
      // Increase user's likes credit by 1
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ likes_credit: likesCredit + 1 })
        .eq('id', userId);
        
      if (updateError) throw updateError;
      
      // Decrease content owner's likes points by 1
      const { error: ownerUpdateError } = await supabase
        .from('profiles')
        .update({ 
          likes_points: supabase.sql`likes_points - 1` 
        })
        .eq('id', content.user_id);
        
      if (ownerUpdateError) throw ownerUpdateError;
      
      toast({
        title: "Like removed",
        description: "You've received 1 like credit back.",
        variant: "default",
      });
      
      return false;
    } else {
      // Check if user has enough credits
      if (likesCredit <= 0) {
        toast({
          title: "Not enough like credits",
          description: "You need at least 1 like credit to like content.",
          variant: "destructive",
        });
        return isLiked;
      }
      
      // Add a new like
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: userId,
          content_id: content.id,
          content_type: content.type
        });
        
      if (error) throw error;
      
      // Decrease user's likes credit
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ likes_credit: likesCredit - 1 })
        .eq('id', userId);
        
      if (updateError) throw updateError;
      
      // Increase content owner's likes points by 1
      const { error: ownerUpdateError } = await supabase
        .from('profiles')
        .update({ 
          likes_points: supabase.sql`COALESCE(likes_points, 0) + 1` 
        })
        .eq('id', content.user_id);
        
      if (ownerUpdateError) throw ownerUpdateError;
      
      // Create notification for the content owner if not the same user
      if (userId !== content.user_id) {
        createNotification(content.user_id, userId, 'like', content.id, content.type);
      }
      
      toast({
        title: "Content liked!",
        description: "You used 1 like credit.",
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
      
      // Create notification
      createNotification(targetUserId, currentUserId, 'follow');
      
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
      
      // Create notification for content owner
      // First get the content to find its owner
      const { data: contentData } = await supabase
        .from(contentType === 'artwork' ? 'artworks' : 'music_tracks')
        .select('user_id')
        .eq('id', contentId)
        .single();
        
      if (contentData && contentData.user_id !== userId) {
        createNotification(contentData.user_id, userId, 'comment', contentId, contentType);
      }
      
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

export const saveInspirationSource = async (contentId: string, contentTitle: string, contentType: string): Promise<boolean> => {
  try {
    const inspirationData: InspiredBy = {
      id: contentId,
      title: contentTitle,
      type: contentType
    };
    
    localStorage.setItem('inspired_by', JSON.stringify(inspirationData));
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

export const fetchContentStats = async (contentId: string): Promise<{ likes: number, comments: number }> => {
  try {
    // Fetch likes count
    const { count: likesCount, error: likesError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('content_id', contentId);
      
    if (likesError) throw likesError;
    
    // Fetch comments count
    const { count: commentsCount, error: commentsError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('content_id', contentId);
      
    if (commentsError) throw commentsError;
    
    return {
      likes: likesCount || 0,
      comments: commentsCount || 0
    };
  } catch (error: any) {
    console.error('Error fetching content stats:', error);
    return { likes: 0, comments: 0 };
  }
};

export const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const fetchUserStats = async (userId: string): Promise<UserStats> => {
  try {
    // Fetch total likes received on user's content
    const { data: artworks } = await supabase
      .from('artworks')
      .select('id')
      .eq('user_id', userId);
      
    const { data: musicTracks } = await supabase
      .from('music_tracks')
      .select('id')
      .eq('user_id', userId);
      
    let contentIds: string[] = [
      ...(artworks || []).map(a => a.id),
      ...(musicTracks || []).map(m => m.id)
    ];
    
    let totalLikes = 0;
    
    if (contentIds.length > 0) {
      const { data, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .in('content_id', contentIds);
        
      if (!error && data) {
        totalLikes = data.length;
      }
    }
    
    // Fetch followers count
    const { data: followersData, error: followersError } = await supabase
      .from('follows')
      .select('*', { count: 'exact' })
      .eq('followed_id', userId);
      
    const followersCount = followersData?.length || 0;
    
    // Fetch following count
    const { data: followingData, error: followingError } = await supabase
      .from('follows')
      .select('*', { count: 'exact' })
      .eq('follower_id', userId);
      
    const followingCount = followingData?.length || 0;
    
    return {
      totalLikes,
      totalFollowers: followersCount,
      totalFollowing: followingCount
    };
  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    return { totalLikes: 0, totalFollowers: 0, totalFollowing: 0 };
  }
};

export const fetchMostLikedContent = async (limit = 5): Promise<Content[]> => {
  try {
    // Get most liked content IDs with counts
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('content_id, content_type')
      .select('content_id, content_type');
      
    if (likesError) throw likesError;
    
    if (!likesData || likesData.length === 0) {
      return [];
    }
    
    // Count likes per content and sort
    const likesCount: Record<string, number> = {};
    likesData.forEach(like => {
      if (likesCount[like.content_id]) {
        likesCount[like.content_id]++;
      } else {
        likesCount[like.content_id] = 1;
      }
    });
    
    // Convert to array and sort by count
    const sortedLikes = Object.entries(likesCount)
      .map(([contentId, count]) => ({
        contentId,
        count,
        contentType: likesData.find(l => l.content_id === contentId)?.content_type || 'artwork'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit * 2); // Fetch more than needed in case some content is no longer available
    
    // Separate artwork and music IDs
    const artworkIds = sortedLikes
      .filter(item => item.contentType === 'artwork')
      .map(item => item.contentId);
      
    const musicIds = sortedLikes
      .filter(item => item.contentType === 'music')
      .map(item => item.contentId);
    
    let artworks: any[] = [];
    let musicTracks: any[] = [];
    
    // Fetch artworks
    if (artworkIds.length > 0) {
      const { data: artworksData } = await supabase
        .from('artworks')
        .select('*')
        .in('id', artworkIds);
        
      if (artworksData) {
        artworks = artworksData.map(art => ({ ...art, type: 'artwork' as const }));
      }
    }
    
    // Fetch music
    if (musicIds.length > 0) {
      const { data: musicData } = await supabase
        .from('music_tracks')
        .select('*')
        .in('id', musicIds);
        
      if (musicData) {
        musicTracks = musicData.map(track => ({ ...track, type: 'music' as const }));
      }
    }
    
    // Combine and sort by likes count
    const content = [...artworks, ...musicTracks];
    
    // Sort content by the like counts from earlier
    const sortedContent = content
      .map(item => ({
        content: item,
        likeCount: likesCount[item.id] || 0
      }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, limit)
      .map(item => item.content);
    
    return sortedContent;
  } catch (error) {
    console.error('Error fetching most liked content:', error);
    return [];
  }
};

export const fetchFollowers = async (userId: string): Promise<FollowConnection[]> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id, follower_id, created_at')
      .eq('followed_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Get all follower profiles
    const followerIds = data.map(follow => follow.follower_id);
    const profiles = await fetchProfiles(followerIds);
    
    return data.map(follow => ({
      id: follow.id,
      profile: profiles[follow.follower_id],
      created_at: follow.created_at
    }));
  } catch (error: any) {
    console.error('Error fetching followers:', error);
    return [];
  }
};

export const fetchFollowing = async (userId: string): Promise<FollowConnection[]> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id, followed_id, created_at')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Get all followed profiles
    const followedIds = data.map(follow => follow.followed_id);
    const profiles = await fetchProfiles(followedIds);
    
    return data.map(follow => ({
      id: follow.id,
      profile: profiles[follow.followed_id],
      created_at: follow.created_at
    }));
  } catch (error: any) {
    console.error('Error fetching following:', error);
    return [];
  }
};

export const createNotification = async (
  userId: string,
  actorId: string,
  type: NotificationType,
  contentId?: string,
  contentType?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        content_id: contentId,
        content_type: contentType,
        read: false
      });
      
    if (error) throw error;
    
    return true;
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return false;
  }
};

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) throw error;
    
    // Convert string type to NotificationType
    const typedNotifications: Notification[] = (data || []).map(notification => ({
      ...notification,
      type: notification.type as NotificationType
    }));
    
    return typedNotifications;
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
      
    if (error) throw error;
    
    return true;
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error: any) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};
