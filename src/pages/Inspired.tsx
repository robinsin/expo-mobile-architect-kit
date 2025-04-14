
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageSquare, Music, UserPlus, GalleryHorizontal, Link2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Content, Profile, Inspiration } from "@/types/social";
import { 
  fetchProfiles, 
  fetchUserLikes, 
  fetchUserFollows,
  followUser,
  likeContent
} from "@/utils/databaseUtils";
import { supabase } from "@/integrations/supabase/client";

const Inspired: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [inspirations, setInspirations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedContent, setLikedContent] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});
  const highlightId = searchParams.get('highlight');

  useEffect(() => {
    const loadInspirations = async () => {
      try {
        setLoading(true);
        
        // Fetch inspirations
        let query = supabase
          .from('inspirations')
          .select('*, source_id, source_type, inspired_id, inspired_type')
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (highlightId) {
          query = query.eq('id', highlightId);
        }
        
        const { data: inspirationsData } = await query;
          
        if (inspirationsData) {
          // Collect all content IDs
          const artworkIds = new Set<string>();
          const musicIds = new Set<string>();
          const userIds = new Set<string>();
          
          inspirationsData.forEach(insp => {
            if (insp.source_type === 'artwork') artworkIds.add(insp.source_id);
            if (insp.source_type === 'music') musicIds.add(insp.source_id);
            if (insp.inspired_type === 'artwork') artworkIds.add(insp.inspired_id);
            if (insp.inspired_type === 'music') musicIds.add(insp.inspired_id);
          });
          
          // Fetch artworks
          const { data: artworksData } = await supabase
            .from('artworks')
            .select('*')
            .in('id', Array.from(artworkIds));
            
          // Fetch music
          const { data: musicData } = await supabase
            .from('music_tracks')
            .select('*')
            .in('id', Array.from(musicIds));
            
          // Create maps for lookups
          const artworksMap: Record<string, any> = {};
          const musicMap: Record<string, any> = {};
          
          if (artworksData) {
            artworksData.forEach(artwork => {
              artworksMap[artwork.id] = { ...artwork, type: 'artwork' };
              userIds.add(artwork.user_id);
            });
          }
          
          if (musicData) {
            musicData.forEach(track => {
              musicMap[track.id] = { ...track, type: 'music' };
              userIds.add(track.user_id);
            });
          }
          
          // Enhance inspirations with content data
          const enhancedInspirations = inspirationsData.map(insp => {
            const sourceItem = insp.source_type === 'artwork' 
              ? artworksMap[insp.source_id] 
              : musicMap[insp.source_id];
              
            const inspiredItem = insp.inspired_type === 'artwork' 
              ? artworksMap[insp.inspired_id] 
              : musicMap[insp.inspired_id];
              
            return {
              ...insp,
              sourceItem,
              inspiredItem
            };
          }).filter(insp => insp.sourceItem && insp.inspiredItem);
          
          setInspirations(enhancedInspirations);
          
          // Collect user IDs from content
          enhancedInspirations.forEach(inspiration => {
            userIds.add(inspiration.sourceItem.user_id);
            userIds.add(inspiration.inspiredItem.user_id);
          });
          
          // Fetch profiles for all creators
          if (userIds.size > 0) {
            const profilesMap = await fetchProfiles(Array.from(userIds));
            setProfiles(profilesMap);
          }
        }
        
        // Fetch user likes and follows if logged in
        if (user) {
          const userLikes = await fetchUserLikes(user.id);
          setLikedContent(userLikes);
          
          const userFollows = await fetchUserFollows(user.id);
          setFollowedUsers(userFollows);
        }
        
      } catch (error) {
        console.error('Error loading inspirations:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInspirations();
  }, [user, highlightId]);
  
  const handleLike = async (content: Content, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const isLiked = likedContent[content.id] || false;
    const result = await likeContent(user.id, content, isLiked);
    
    setLikedContent(prev => ({
      ...prev,
      [content.id]: result
    }));
  };
  
  const handleFollow = async (userId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const isFollowing = followedUsers[userId] || false;
    const result = await followUser(user.id, userId, isFollowing);
    
    setFollowedUsers(prev => ({
      ...prev,
      [userId]: result
    }));
  };
  
  const handleViewContent = (content: Content) => {
    if (content.type === 'artwork') {
      navigate(`/artwork/${content.id}`);
    } else {
      navigate(`/search?highlight=${content.id}`);
    }
  };
  
  const handleViewArtistProfile = (userId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    navigate(`/artist/${userId}`);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Inspiration Stories</h1>
        <p className="text-muted-foreground">
          Discover the stories behind the art and music
        </p>
      </div>
      
      {user ? (
        <div className="flex gap-3 justify-center mb-6">
          <Button onClick={() => navigate('/upload')}>
            Share Your Inspiration
          </Button>
          <Button variant="outline" onClick={() => navigate('/search')}>
            Discover More
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 justify-center mb-6">
          <Button onClick={() => navigate('/auth')}>
            Sign In / Create Account
          </Button>
          <Button variant="outline" onClick={() => navigate('/search')}>
            Browse as Guest
          </Button>
        </div>
      )}
      
      <h2 className="text-xl font-semibold mb-4">Latest Inspiration Stories</h2>
      
      {loading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-40 mb-4" />
                <div className="flex gap-3 justify-between">
                  <Skeleton className="h-20 w-20" />
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-20 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : inspirations.length > 0 ? (
        <div className="space-y-4">
          {inspirations.map((inspiration) => (
            <Card 
              key={inspiration.id} 
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardContent className="p-3">
                <div className="flex flex-col md:flex-row items-center gap-3 mb-3">
                  <div className="flex gap-2 items-center">
                    <Heart className="h-4 w-4 text-red-400" />
                    <span className="text-xs">Inspiration Story</span>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <span className="text-xs text-muted-foreground">
                      {new Date(inspiration.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => handleViewContent(inspiration.sourceItem)}
                  >
                    {inspiration.sourceItem.type === 'artwork' ? (
                      <div className="aspect-square h-32 w-full rounded overflow-hidden">
                        <img 
                          src={inspiration.sourceItem.image_url} 
                          alt="" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-32 w-full flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded">
                        <Music className="h-12 w-12 text-purple-500" />
                      </div>
                    )}
                    <div className="text-sm mt-1 font-medium truncate">{inspiration.sourceItem.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      by {profiles[inspiration.sourceItem.user_id]?.name || 'Artist'}
                    </div>
                  </div>
                  
                  <Link2 className="h-6 w-6 text-purple-400 mx-1" />
                  
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => handleViewContent(inspiration.inspiredItem)}
                  >
                    {inspiration.inspiredItem.type === 'artwork' ? (
                      <div className="aspect-square h-32 w-full rounded overflow-hidden">
                        <img 
                          src={inspiration.inspiredItem.image_url} 
                          alt="" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-32 w-full flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded">
                        <Music className="h-12 w-12 text-purple-500" />
                      </div>
                    )}
                    <div className="text-sm mt-1 font-medium truncate">{inspiration.inspiredItem.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      by {profiles[inspiration.inspiredItem.user_id]?.name || 'Artist'}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-2 pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => handleViewContent(inspiration.sourceItem)}
                  >
                    View Original
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => handleViewContent(inspiration.inspiredItem)}
                  >
                    View Inspired
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Heart className="h-10 w-10 mx-auto mb-2 text-muted" />
          <p>No inspiration stories available right now</p>
        </div>
      )}
      
      <div className="mt-6 text-center">
        <Button variant="link" onClick={() => navigate('/search')}>
          Explore all content
        </Button>
      </div>
      
      <Separator className="my-8" />
      
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">Share your own inspiration story!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Connect your creations with the works that inspired you.
        </p>
      </div>
      
      {!user && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => navigate('/auth')}>
            Sign Up Now
          </Button>
        </div>
      )}
    </div>
  );
};

export default Inspired;
