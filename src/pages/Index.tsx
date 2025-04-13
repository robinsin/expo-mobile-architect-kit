
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageSquare, Music, UserPlus, GalleryHorizontal, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Content, Profile, Inspiration } from "@/types/social";
import { 
  fetchMostLikedContent, 
  fetchProfiles, 
  fetchUserLikes, 
  fetchUserFollows,
  followUser,
  likeContent
} from "@/utils/databaseUtils";
import { supabase } from "@/integrations/supabase/client";

const Index: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [popularContent, setPopularContent] = useState<Content[]>([]);
  const [trendingInspirations, setTrendingInspirations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedContent, setLikedContent] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"trending" | "inspirations">("trending");

  useEffect(() => {
    const loadHomeContent = async () => {
      try {
        setLoading(true);
        
        // Fetch most liked content
        const mostLikedContent = await fetchMostLikedContent(10);
        setPopularContent(mostLikedContent);
        
        // Fetch trending inspirations
        const { data: inspirationsData } = await supabase
          .from('inspirations')
          .select('*, source_id, source_type, inspired_id, inspired_type')
          .order('created_at', { ascending: false })
          .limit(5);
          
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
          
          setTrendingInspirations(enhancedInspirations);
          
          // Collect user IDs from content
          mostLikedContent.forEach(content => {
            userIds.add(content.user_id);
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
        console.error('Error loading home content:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadHomeContent();
  }, [user]);
  
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
    navigate(`/search?highlight=${content.id}`);
  };
  
  const handleViewInspiration = (inspiration: any) => {
    navigate(`/inspired?highlight=${inspiration.id}`);
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
        <h1 className="text-3xl font-bold mb-2">Art & Music Hub</h1>
        <p className="text-muted-foreground">
          Discover and connect with creative artists around the world
        </p>
      </div>
      
      {user ? (
        <div className="flex gap-3 justify-center mb-6">
          <Button onClick={() => navigate('/upload')}>
            Upload Your Work
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
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="trending" className="flex-1">Trending Content</TabsTrigger>
          <TabsTrigger value="inspirations" className="flex-1">Inspiration Stories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trending">
          <h2 className="text-xl font-semibold mb-4">Most Liked Creations</h2>
          
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-40" />
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : popularContent.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {popularContent.map((content) => (
                <Card 
                  key={content.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewContent(content)}
                >
                  <div className="aspect-square relative">
                    {content.type === 'artwork' && 'image_url' in content ? (
                      <img 
                        src={content.image_url} 
                        alt={content.title}
                        className="w-full h-full object-cover"
                      />
                    ) : content.type === 'music' ? (
                      <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900">
                        <Music className="h-16 w-16 text-purple-500" />
                      </div>
                    ) : null}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate">{content.title}</h3>
                    <div 
                      className="flex items-center text-xs text-muted-foreground hover:underline"
                      onClick={(e) => handleViewArtistProfile(content.user_id, e)}
                    >
                      <span>By: {profiles[content.user_id]?.name || "Unknown Artist"}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-2 pt-0 flex justify-between">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleLike(content, e)}
                    >
                      <Heart 
                        className={`h-4 w-4 ${likedContent[content.id] ? "fill-red-500 text-red-500" : ""}`} 
                      />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleFollow(content.user_id, e)}
                    >
                      <UserPlus 
                        className={`h-4 w-4 ${followedUsers[content.user_id] ? "text-purple-500" : ""}`} 
                      />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <GalleryHorizontal className="h-10 w-10 mx-auto mb-2 text-muted" />
              <p>No trending content available right now</p>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate('/search')}>
              See all content
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="inspirations">
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
          ) : trendingInspirations.length > 0 ? (
            <div className="space-y-4">
              {trendingInspirations.map((inspiration) => (
                <Card 
                  key={inspiration.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewInspiration(inspiration)}
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
                    
                    <div className="flex gap-2 items-center justify-between">
                      <div className="flex-1">
                        {inspiration.sourceItem.type === 'artwork' ? (
                          <div className="aspect-square h-16 w-16 rounded overflow-hidden">
                            <img 
                              src={inspiration.sourceItem.image_url} 
                              alt="" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded">
                            <Music className="h-8 w-8 text-purple-500" />
                          </div>
                        )}
                        <div className="text-xs mt-1 truncate w-16 text-center">{inspiration.sourceItem.title}</div>
                      </div>
                      
                      <Link2 className="h-5 w-5 text-purple-400" />
                      
                      <div className="flex-1">
                        {inspiration.inspiredItem.type === 'artwork' ? (
                          <div className="aspect-square h-16 w-16 rounded overflow-hidden">
                            <img 
                              src={inspiration.inspiredItem.image_url} 
                              alt="" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded">
                            <Music className="h-8 w-8 text-purple-500" />
                          </div>
                        )}
                        <div className="text-xs mt-1 truncate w-16 text-center">{inspiration.inspiredItem.title}</div>
                      </div>
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
            <Button variant="link" onClick={() => navigate('/inspired')}>
              Explore all inspiration stories
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <Separator className="my-8" />
      
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">Join our creative community today!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Upload your artwork or music, get inspired, and connect with other artists.
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

export default Index;
