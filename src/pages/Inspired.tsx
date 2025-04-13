
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Heart, Music, Image, Link2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  fetchProfiles, 
  fetchUserLikes,
  fetchComments,
  likeContent, 
  addComment 
} from "@/utils/databaseUtils";
import { Inspiration, Profile, Content, Comment } from "@/types/social";

interface InspirationWithDetails extends Inspiration {
  source_item?: Content;
  inspired_item?: Content;
  source_user?: Profile;
  inspired_user?: Profile;
}

const Inspired: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inspirations, setInspirations] = useState<InspirationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspiration, setSelectedInspiration] = useState<InspirationWithDetails | null>(null);
  const [likedContent, setLikedContent] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"source" | "inspired" | "comments">("source");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [contentStats, setContentStats] = useState<Record<string, { likes: number, comments: number }>>({});

  useEffect(() => {
    const fetchInspirations = async () => {
      try {
        setLoading(true);
        
        // Get all inspiration connections
        const { data, error } = await supabase
          .from('inspirations')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;

        if (data && data.length > 0) {
          // Create a map to store IDs of all artworks and music tracks we need to fetch
          const artworkIds = new Set<string>();
          const musicIds = new Set<string>();
          const userIds = new Set<string>();
          
          // Collect all IDs from the inspiration data
          data.forEach(inspiration => {
            if (inspiration.source_type === 'artwork') {
              artworkIds.add(inspiration.source_id);
            } else if (inspiration.source_type === 'music') {
              musicIds.add(inspiration.source_id);
            }
            
            if (inspiration.inspired_type === 'artwork') {
              artworkIds.add(inspiration.inspired_id);
            } else if (inspiration.inspired_type === 'music') {
              musicIds.add(inspiration.inspired_id);
            }
          });
          
          // Fetch all artworks in one request
          const { data: artworksData, error: artworksError } = await supabase
            .from('artworks')
            .select('*')
            .in('id', Array.from(artworkIds));
            
          if (artworksError) throw artworksError;
          
          // Fetch all music tracks in one request
          const { data: musicData, error: musicError } = await supabase
            .from('music_tracks')
            .select('*')
            .in('id', Array.from(musicIds));
            
          if (musicError) throw musicError;
          
          // Create maps for easy lookup
          const artworksMap: Record<string, Content> = {};
          const musicMap: Record<string, Content> = {};
          
          (artworksData || []).forEach(artwork => {
            artworksMap[artwork.id] = { ...artwork, type: 'artwork' as const };
            userIds.add(artwork.user_id);
          });
          
          (musicData || []).forEach(track => {
            musicMap[track.id] = { ...track, type: 'music' as const };
            userIds.add(track.user_id);
          });
          
          // Fetch all profiles in one request
          const profilesMap = await fetchProfiles(Array.from(userIds));
          setProfiles(profilesMap);
          
          // Fetch user likes if logged in
          if (user) {
            const userLikes = await fetchUserLikes(user.id);
            setLikedContent(userLikes);
          }
          
          // Enhance inspirations with full data
          const enhancedInspirations = data.map(inspiration => {
            let sourceItem: Content | undefined;
            let inspiredItem: Content | undefined;
            
            if (inspiration.source_type === 'artwork') {
              sourceItem = artworksMap[inspiration.source_id];
            } else if (inspiration.source_type === 'music') {
              sourceItem = musicMap[inspiration.source_id];
            }
            
            if (inspiration.inspired_type === 'artwork') {
              inspiredItem = artworksMap[inspiration.inspired_id];
            } else if (inspiration.inspired_type === 'music') {
              inspiredItem = musicMap[inspiration.inspired_id];
            }
            
            return {
              ...inspiration,
              source_item: sourceItem,
              inspired_item: inspiredItem,
              source_user: sourceItem ? profilesMap[sourceItem.user_id] : undefined,
              inspired_user: inspiredItem ? profilesMap[inspiredItem.user_id] : undefined
            };
          });
          
          // Filter out inspirations where either source or inspired item is missing
          const validInspirations = enhancedInspirations.filter(
            item => item.source_item && item.inspired_item
          );
          
          setInspirations(validInspirations);
          
          // Get stats for each content item
          await fetchContentStatsForInspiration(validInspirations);
        } else {
          setInspirations([]);
        }
      } catch (error: any) {
        toast({
          title: "Error loading inspirations",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchInspirations();
  }, [user]);

  const fetchContentStatsForInspiration = async (inspirations: InspirationWithDetails[]) => {
    const statsMap: Record<string, { likes: number, comments: number }> = {};
    const contentIds = new Set<string>();
    
    // Collect all content IDs
    inspirations.forEach(inspiration => {
      if (inspiration.source_item) contentIds.add(inspiration.source_item.id);
      if (inspiration.inspired_item) contentIds.add(inspiration.inspired_item.id);
    });
    
    // Fetch likes counts for all content
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('content_id, count(*)')
      .in('content_id', Array.from(contentIds))
      .group('content_id');
      
    if (!likesError && likesData) {
      likesData.forEach(item => {
        if (!statsMap[item.content_id]) {
          statsMap[item.content_id] = { likes: 0, comments: 0 };
        }
        statsMap[item.content_id].likes = parseInt(item.count);
      });
    }
    
    // Fetch comments counts for all content
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('content_id, count(*)')
      .in('content_id', Array.from(contentIds))
      .group('content_id');
      
    if (!commentsError && commentsData) {
      commentsData.forEach(item => {
        if (!statsMap[item.content_id]) {
          statsMap[item.content_id] = { likes: 0, comments: 0 };
        }
        statsMap[item.content_id].comments = parseInt(item.count);
      });
    }
    
    setContentStats(statsMap);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const handleViewInspiration = async (inspiration: InspirationWithDetails) => {
    setSelectedInspiration(inspiration);
    setActiveTab("source");
    
    // Fetch comments for the source content
    if (inspiration.source_item) {
      const sourceComments = await fetchComments(
        inspiration.source_item.id, 
        inspiration.source_type
      );
      setComments(sourceComments);
    }
  };
  
  const handleTabChange = async (value: string) => {
    if (!selectedInspiration) return;
    
    if (value === "comments") {
      // We'll load comments for whichever tab was previously active
      const contentItem = activeTab === "source" 
        ? selectedInspiration.source_item 
        : selectedInspiration.inspired_item;
        
      const contentType = activeTab === "source"
        ? selectedInspiration.source_type
        : selectedInspiration.inspired_type;
        
      if (contentItem) {
        const commentsData = await fetchComments(contentItem.id, contentType);
        setComments(commentsData);
      }
    } else if (value === "source" && selectedInspiration.source_item) {
      const sourceComments = await fetchComments(
        selectedInspiration.source_item.id, 
        selectedInspiration.source_type
      );
      setComments(sourceComments);
    } else if (value === "inspired" && selectedInspiration.inspired_item) {
      const inspiredComments = await fetchComments(
        selectedInspiration.inspired_item.id, 
        selectedInspiration.inspired_type
      );
      setComments(inspiredComments);
    }
    
    setActiveTab(value as "source" | "inspired" | "comments");
  };
  
  const handleLike = async (contentItem: Content, contentType: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to like content",
        variant: "default",
      });
      return;
    }
    
    const isLiked = likedContent[contentItem.id] || false;
    const result = await likeContent(user.id, contentItem, isLiked);
    
    // Update local state
    setLikedContent(prev => ({
      ...prev,
      [contentItem.id]: result
    }));
    
    // Update stats
    setContentStats(prev => ({
      ...prev,
      [contentItem.id]: {
        ...prev[contentItem.id],
        likes: result 
          ? (prev[contentItem.id]?.likes || 0) + 1 
          : Math.max((prev[contentItem.id]?.likes || 0) - 1, 0)
      }
    }));
  };
  
  const handleComment = async () => {
    if (!user || !selectedInspiration || !newComment.trim()) {
      return;
    }
    
    const contentItem = activeTab === "source" 
      ? selectedInspiration.source_item 
      : selectedInspiration.inspired_item;
      
    const contentType = activeTab === "source"
      ? selectedInspiration.source_type
      : selectedInspiration.inspired_type;
    
    if (!contentItem) return;
    
    const newCommentObj = await addComment(
      user.id,
      contentItem.id,
      contentType,
      newComment,
      profiles[user.id]
    );
    
    if (newCommentObj) {
      // Update comments list
      setComments(prev => [newCommentObj, ...prev]);
      
      // Update stats
      setContentStats(prev => ({
        ...prev,
        [contentItem.id]: {
          ...prev[contentItem.id],
          comments: (prev[contentItem.id]?.comments || 0) + 1
        }
      }));
      
      // Clear input
      setNewComment("");
    }
  };
  
  const handleViewArtistProfile = (userId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    navigate(`/artist/${userId}`);
  };

  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Inspiration Connections</h1>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex gap-4 items-center mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-3 justify-between">
                  <Skeleton className="h-32 w-32" />
                  <div className="flex-1 flex items-center justify-center">
                    <Skeleton className="h-6 w-6" />
                  </div>
                  <Skeleton className="h-32 w-32" />
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
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewInspiration(inspiration)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                  <div className="flex gap-2 items-center">
                    <Heart className="h-5 w-5 text-red-400" />
                    <span className="text-sm">Inspiration Connection</span>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(inspiration.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Source Content */}
                  <div className="flex-1 flex flex-col items-center p-2 rounded-md">
                    <div className="relative w-full aspect-square max-w-[180px] mb-2 rounded-md overflow-hidden bg-muted">
                      {inspiration.source_type === 'artwork' && inspiration.source_item && 'image_url' in inspiration.source_item ? (
                        <img 
                          src={inspiration.source_item.image_url} 
                          alt={inspiration.source_item.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : inspiration.source_type === 'music' ? (
                        <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900">
                          <Music className="h-12 w-12 text-purple-500" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-sm truncate max-w-full">
                      {inspiration.source_item?.title || "Untitled"}
                    </h3>
                    
                    <div 
                      className="flex items-center mt-1 cursor-pointer hover:underline"
                      onClick={(e) => inspiration.source_item && handleViewArtistProfile(inspiration.source_item.user_id, e)}
                    >
                      <Avatar className="h-5 w-5 mr-1">
                        {inspiration.source_user?.avatar_url ? (
                          <AvatarImage src={inspiration.source_user.avatar_url} />
                        ) : (
                          <AvatarFallback>
                            {getInitials(inspiration.source_user?.name || 'U')}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {inspiration.source_user?.name || "Unknown"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <div className="flex items-center text-xs">
                        <Heart 
                          className={`h-3 w-3 mr-1 ${inspiration.source_item && likedContent[inspiration.source_item.id] ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} 
                        />
                        <span>{contentStats[inspiration.source_item?.id || '']?.likes || 0}</span>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span>{contentStats[inspiration.source_item?.id || '']?.comments || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Connection Icon */}
                  <div className="py-2">
                    <Link2 className="h-6 w-6 rotate-90 md:rotate-0 text-purple-400" />
                  </div>
                  
                  {/* Inspired Content */}
                  <div className="flex-1 flex flex-col items-center p-2 rounded-md">
                    <div className="relative w-full aspect-square max-w-[180px] mb-2 rounded-md overflow-hidden bg-muted">
                      {inspiration.inspired_type === 'artwork' && inspiration.inspired_item && 'image_url' in inspiration.inspired_item ? (
                        <img 
                          src={inspiration.inspired_item.image_url} 
                          alt={inspiration.inspired_item.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : inspiration.inspired_type === 'music' ? (
                        <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900">
                          <Music className="h-12 w-12 text-purple-500" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-sm truncate max-w-full">
                      {inspiration.inspired_item?.title || "Untitled"}
                    </h3>
                    
                    <div
                      className="flex items-center mt-1 cursor-pointer hover:underline"
                      onClick={(e) => inspiration.inspired_item && handleViewArtistProfile(inspiration.inspired_item.user_id, e)}
                    >
                      <Avatar className="h-5 w-5 mr-1">
                        {inspiration.inspired_user?.avatar_url ? (
                          <AvatarImage src={inspiration.inspired_user.avatar_url} />
                        ) : (
                          <AvatarFallback>
                            {getInitials(inspiration.inspired_user?.name || 'U')}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {inspiration.inspired_user?.name || "Unknown"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <div className="flex items-center text-xs">
                        <Heart 
                          className={`h-3 w-3 mr-1 ${inspiration.inspired_item && likedContent[inspiration.inspired_item.id] ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} 
                        />
                        <span>{contentStats[inspiration.inspired_item?.id || '']?.likes || 0}</span>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span>{contentStats[inspiration.inspired_item?.id || '']?.comments || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-3 bg-muted/30 flex justify-between">
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (inspiration.source_item) {
                        handleLike(inspiration.source_item, inspiration.source_type, e);
                      }
                    }}
                  >
                    <Heart 
                      className={`h-4 w-4 mr-1 ${inspiration.source_item && likedContent[inspiration.source_item.id] ? "fill-red-500 text-red-500" : ""}`}
                    />
                    Like Source
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (inspiration.inspired_item) {
                        handleLike(inspiration.inspired_item, inspiration.inspired_type, e);
                      }
                    }}
                  >
                    <Heart 
                      className={`h-4 w-4 mr-1 ${inspiration.inspired_item && likedContent[inspiration.inspired_item.id] ? "fill-red-500 text-red-500" : ""}`}
                    />
                    Like Inspired
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewInspiration(inspiration);
                    setActiveTab("comments");
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Comment
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-4">
                <Heart className="h-16 w-16 text-purple-400" />
              </div>
              <p className="text-muted-foreground mb-4">No inspiration connections found.</p>
              <p className="text-sm mb-4">Browse the discover page to find art and music that inspires you.</p>
              <Button onClick={() => navigate('/search')}>
                Discover Content
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Inspiration Detail Dialog */}
      <Dialog 
        open={!!selectedInspiration} 
        onOpenChange={(open) => !open && setSelectedInspiration(null)}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              Inspiration Connection
              <DialogClose className="h-7 w-7" />
            </DialogTitle>
          </DialogHeader>
          
          {selectedInspiration && (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="source">Source</TabsTrigger>
                <TabsTrigger value="inspired">Inspired</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="source" className="mt-4 space-y-4">
                {selectedInspiration.source_item && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {selectedInspiration.source_user?.avatar_url ? (
                          <AvatarImage src={selectedInspiration.source_user.avatar_url} />
                        ) : (
                          <AvatarFallback>
                            {getInitials(selectedInspiration.source_user?.name || 'U')}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div 
                        className="font-medium text-sm cursor-pointer hover:underline"
                        onClick={() => handleViewArtistProfile(selectedInspiration.source_item!.user_id)}
                      >
                        {selectedInspiration.source_user?.name || "Unknown Artist"}
                      </div>
                    </div>
                    
                    {selectedInspiration.source_type === 'artwork' && 'image_url' in selectedInspiration.source_item ? (
                      <div className="flex justify-center">
                        <img 
                          src={selectedInspiration.source_item.image_url} 
                          alt={selectedInspiration.source_item.title} 
                          className="max-h-[50vh] w-auto object-contain rounded"
                        />
                      </div>
                    ) : selectedInspiration.source_type === 'music' ? (
                      <div className="h-40 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded">
                        <Music className="h-20 w-20 text-purple-500" />
                      </div>
                    ) : null}
                    
                    <div>
                      <h3 className="font-medium">{selectedInspiration.source_item.title}</h3>
                      {selectedInspiration.source_item.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedInspiration.source_item.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleLike(selectedInspiration.source_item!, selectedInspiration.source_type)}
                      >
                        <Heart 
                          className={`h-4 w-4 mr-2 ${likedContent[selectedInspiration.source_item.id] ? "fill-red-500 text-red-500" : ""}`} 
                        />
                        {likedContent[selectedInspiration.source_item.id] ? "Liked" : "Like"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTab("comments")}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comment
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="inspired" className="mt-4 space-y-4">
                {selectedInspiration.inspired_item && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {selectedInspiration.inspired_user?.avatar_url ? (
                          <AvatarImage src={selectedInspiration.inspired_user.avatar_url} />
                        ) : (
                          <AvatarFallback>
                            {getInitials(selectedInspiration.inspired_user?.name || 'U')}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div 
                        className="font-medium text-sm cursor-pointer hover:underline"
                        onClick={() => handleViewArtistProfile(selectedInspiration.inspired_item!.user_id)}
                      >
                        {selectedInspiration.inspired_user?.name || "Unknown Artist"}
                      </div>
                    </div>
                    
                    {selectedInspiration.inspired_type === 'artwork' && 'image_url' in selectedInspiration.inspired_item ? (
                      <div className="flex justify-center">
                        <img 
                          src={selectedInspiration.inspired_item.image_url} 
                          alt={selectedInspiration.inspired_item.title} 
                          className="max-h-[50vh] w-auto object-contain rounded"
                        />
                      </div>
                    ) : selectedInspiration.inspired_type === 'music' ? (
                      <div className="h-40 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded">
                        <Music className="h-20 w-20 text-purple-500" />
                      </div>
                    ) : null}
                    
                    <div>
                      <h3 className="font-medium">{selectedInspiration.inspired_item.title}</h3>
                      {selectedInspiration.inspired_item.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedInspiration.inspired_item.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleLike(selectedInspiration.inspired_item!, selectedInspiration.inspired_type)}
                      >
                        <Heart 
                          className={`h-4 w-4 mr-2 ${likedContent[selectedInspiration.inspired_item.id] ? "fill-red-500 text-red-500" : ""}`} 
                        />
                        {likedContent[selectedInspiration.inspired_item.id] ? "Liked" : "Like"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTab("comments")}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comment
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="comments" className="mt-4 space-y-4">
                {user ? (
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Add a comment..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="resize-none"
                    />
                    <Button 
                      onClick={handleComment} 
                      disabled={!newComment.trim()}
                    >
                      Post
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-center py-2 text-muted-foreground">
                    <Button variant="link" onClick={() => navigate('/auth')}>
                      Login to comment
                    </Button>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-4">
                  {comments.length > 0 ? (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          {comment.user_profile?.avatar_url ? (
                            <AvatarImage src={comment.user_profile.avatar_url} />
                          ) : (
                            <AvatarFallback>
                              {getInitials(comment.user_profile?.name || 'U')}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span 
                              className="font-medium text-sm cursor-pointer hover:underline"
                              onClick={() => handleViewArtistProfile(comment.user_id)}
                            >
                              {comment.user_profile?.name || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No comments yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inspired;
