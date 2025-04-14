import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageSquare, Music, UserPlus, GalleryHorizontal } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Content, Profile } from "@/types/social";
import { 
  fetchProfiles, 
  fetchUserLikes, 
  fetchUserFollows,
  followUser,
  likeContent,
  fetchMostLikedContent,
  fetchContentStats
} from "@/utils/databaseUtils";
import { supabase } from "@/integrations/supabase/client";
import GridViewToggle from "@/components/GridViewToggle";

const Search: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [highlightId, setHighlightId] = useState(searchParams.get("highlight") || "");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Content[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedContent, setLikedContent] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"search" | "popular">("search");
  const [popularContent, setPopularContent] = useState<Content[]>([]);
  const [gridView, setGridView] = useState<'single' | 'double'>('double');
  const [contentStats, setContentStats] = useState<Record<string, { likes: number, comments: number }>>({});

  useEffect(() => {
    if (!user) return;

    const fetchUserInteractions = async () => {
      if (user) {
        const userLikes = await fetchUserLikes(user.id);
        setLikedContent(userLikes);
        
        const userFollows = await fetchUserFollows(user.id);
        setFollowedUsers(userFollows);
      }
    };

    fetchUserInteractions();
  }, [user]);

  useEffect(() => {
    const loadSearchResults = async () => {
      try {
        setLoading(true);
        
        let artworksQuery = supabase
          .from('artworks')
          .select('*')
          .ilike('title', `%${searchTerm}%`);
          
        let musicQuery = supabase
          .from('music_tracks')
          .select('*')
          .ilike('title', `%${searchTerm}%`);
          
        if (highlightId) {
          artworksQuery = artworksQuery.or(`id.eq.${highlightId}`);
          musicQuery = musicQuery.or(`id.eq.${highlightId}`);
        }
        
        const [artworksResult, musicResult] = await Promise.all([
          artworksQuery,
          musicQuery
        ]);
        
        if (artworksResult.error) throw artworksResult.error;
        if (musicResult.error) throw musicResult.error;
        
        const artworks: Content[] = (artworksResult.data || []).map(art => ({ ...art, type: 'artwork' as const }));
        const music: Content[] = (musicResult.data || []).map(track => ({ ...track, type: 'music' as const }));
        
        const combinedResults = [...artworks, ...music];
        setSearchResults(combinedResults);
        
        const userIds = new Set<string>();
        combinedResults.forEach(content => {
          userIds.add(content.user_id);
        });
        
        if (userIds.size > 0) {
          const profilesMap = await fetchProfiles(Array.from(userIds));
          setProfiles(profilesMap);
        }
        
      } catch (error) {
        console.error('Error loading search results:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSearchResults();
  }, [searchTerm, highlightId, user]);
  
  useEffect(() => {
    const loadPopularContent = async () => {
      try {
        if (activeTab === 'popular') {
          setLoading(true);
          const popularItems = await fetchMostLikedContent(20);
          setPopularContent(popularItems);
          
          const userIds = new Set<string>();
          popularItems.forEach(content => {
            userIds.add(content.user_id);
          });
          
          if (userIds.size > 0) {
            const profilesMap = await fetchProfiles(Array.from(userIds));
            setProfiles(prev => ({ ...prev, ...profilesMap }));
          }
        }
      } catch (error) {
        console.error('Error loading popular content:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPopularContent();
  }, [activeTab]);
  
  useEffect(() => {
    const fetchStats = async () => {
      const allContent = [...searchResults, ...popularContent];
      if (allContent.length === 0) return;
      
      const statsMap: Record<string, { likes: number, comments: number }> = {};
      
      for (const content of allContent) {
        const stats = await fetchContentStats(content.id);
        statsMap[content.id] = stats;
      }
      
      setContentStats(statsMap);
    };
    
    fetchStats();
  }, [searchResults, popularContent]);

  useEffect(() => {
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      (searchInput as HTMLInputElement).focus();
    }
  }, []);

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
    navigate(`/artwork/${content.id}`);
  };
  
  const handleViewArtistProfile = (userId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    navigate(`/artist/${userId}`);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`?q=${searchTerm}`);
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
        <h1 className="text-3xl font-bold mb-2">Discover</h1>
        <p className="text-muted-foreground">
          Explore artwork and music from artists around the world
        </p>
      </div>
      
      <form onSubmit={handleSearch} className="mb-4">
        <Input 
          type="search" 
          id="search-input"
          placeholder="Search for artwork, music, and artists" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="search" className="flex-1">Search Results</TabsTrigger>
          <TabsTrigger value="popular" className="flex-1">Popular</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Search Results</h2>
            <GridViewToggle gridView={gridView} setGridView={setGridView} />
          </div>
          
          {loading ? (
            <div className={`grid ${gridView === 'double' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
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
          ) : searchResults.length > 0 ? (
            <div className={`grid ${gridView === 'double' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {searchResults.map((content) => (
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
                    <div className="flex items-center">
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
                      <span className="text-xs ml-1">{contentStats[content.id]?.likes || 0}</span>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/artwork/${content.id}`);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <span className="text-xs ml-1">{contentStats[content.id]?.comments || 0}</span>
                    </div>
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
              <p>No results found for "{searchTerm}"</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="popular">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Popular Content</h2>
            <GridViewToggle gridView={gridView} setGridView={setGridView} />
          </div>
          
          {loading ? (
            <div className={`grid ${gridView === 'double' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
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
            <div className={`grid ${gridView === 'double' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
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
                    <div className="flex items-center">
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
                      <span className="text-xs ml-1">{contentStats[content.id]?.likes || 0}</span>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/artwork/${content.id}`);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <span className="text-xs ml-1">{contentStats[content.id]?.comments || 0}</span>
                    </div>
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
              <p>No popular content available right now</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Search;
