
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, GalleryHorizontal, Search as SearchIcon, Music, X, Heart, MessageSquare, UserPlus } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Artwork, MusicTrack, Content, Profile, Comment } from "@/types/social";
import { 
  fetchProfiles, 
  fetchUserLikes, 
  fetchUserFollows, 
  fetchComments, 
  likeContent, 
  followUser, 
  addComment, 
  saveInspirationSource,
  fetchContentStats
} from "@/utils/databaseUtils";

const Search: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [filteredContent, setFilteredContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Content | null>(null);
  const [isArtwork, setIsArtwork] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedContent, setLikedContent] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"view" | "comments">("view");
  const [contentStats, setContentStats] = useState<Record<string, { likes: number, comments: number }>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Process the URL query parameter for highlighting a specific item
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const highlightId = searchParams.get('highlight');
    
    if (highlightId && allContent.length > 0) {
      const itemToHighlight = allContent.find(item => item.id === highlightId);
      if (itemToHighlight) {
        handleItemClick(itemToHighlight);
      }
    }
  }, [location.search, allContent]);
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        
        // Fetch artworks
        const { data: artworks, error: artworksError } = await supabase
          .from('artworks')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (artworksError) throw artworksError;
        
        // Fetch music tracks
        const { data: musicTracks, error: musicError } = await supabase
          .from('music_tracks')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (musicError) throw musicError;
        
        // Combine and add type property
        const artworksWithType = artworks?.map(art => ({ ...art, type: 'artwork' as const })) || [];
        const musicWithType = musicTracks?.map(track => ({ ...track, type: 'music' as const })) || [];
        
        // Combine both types of content and sort by creation date
        const combined = [...artworksWithType, ...musicWithType].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setAllContent(combined);
        setFilteredContent(combined);
        
        // Fetch all user profiles for the content
        const userIds = [...new Set(combined.map(item => item.user_id))];
        if (userIds.length > 0) {
          const profilesMap = await fetchProfiles(userIds);
          setProfiles(profilesMap);
        }
        
        // Fetch user likes if logged in
        if (user) {
          const likedMap = await fetchUserLikes(user.id);
          setLikedContent(likedMap);
          
          // Fetch user follows
          const followsMap = await fetchUserFollows(user.id);
          setFollowedUsers(followsMap);
        }
        
        // Fetch stats for all content
        const statsMap: Record<string, { likes: number, comments: number }> = {};
        
        // Batch fetch likes counts
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('content_id, count(*)')
          .group('content_id');
          
        if (!likesError && likesData) {
          likesData.forEach(item => {
            if (!statsMap[item.content_id]) {
              statsMap[item.content_id] = { likes: 0, comments: 0 };
            }
            statsMap[item.content_id].likes = parseInt(item.count);
          });
        }
        
        // Batch fetch comments counts
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('content_id, count(*)')
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
      } catch (error: any) {
        toast({
          title: "Error fetching content",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContent();
  }, [user]);
  
  // Filter content based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredContent(allContent);
    } else {
      const filtered = allContent.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.genre && item.genre.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredContent(filtered);
    }
  }, [searchTerm, allContent]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleItemClick = async (item: Content) => {
    setSelectedItem(item);
    setIsArtwork(item.type === 'artwork');
    setActiveTab("view");
    
    // Reset audio state if selecting a new music track
    if (item.type === 'music') {
      setIsPlaying(false);
    }
    
    // Fetch comments for the selected item
    const commentsData = await fetchComments(item.id, item.type);
    setComments(commentsData);
  };
  
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };
  
  const closeDialog = () => {
    setSelectedItem(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  const handleLike = async (item: Content, event?: React.MouseEvent) => {
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
    
    const isLiked = likedContent[item.id] || false;
    const result = await likeContent(user.id, item, isLiked);
    
    // Update local state
    setLikedContent(prev => ({
      ...prev,
      [item.id]: result
    }));
    
    // Update content stats
    setContentStats(prev => ({
      ...prev,
      [item.id]: {
        ...prev[item.id] || { likes: 0, comments: 0 },
        likes: result 
          ? (prev[item.id]?.likes || 0) + 1 
          : Math.max((prev[item.id]?.likes || 0) - 1, 0)
      }
    }));
  };
  
  const handleFollow = async (userId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to follow users",
        variant: "default",
      });
      return;
    }
    
    const isFollowing = followedUsers[userId] || false;
    const result = await followUser(user.id, userId, isFollowing);
    
    // Update local state
    setFollowedUsers(prev => ({
      ...prev,
      [userId]: result
    }));
  };
  
  const handleComment = async () => {
    if (!user || !selectedItem || !newComment.trim()) {
      return;
    }
    
    const newCommentObj = await addComment(
      user.id,
      selectedItem.id,
      selectedItem.type,
      newComment,
      profiles[user.id]
    );
    
    if (newCommentObj) {
      // Update comments list
      setComments(prev => [newCommentObj, ...prev]);
      
      // Update content stats
      setContentStats(prev => ({
        ...prev,
        [selectedItem.id]: {
          ...prev[selectedItem.id] || { likes: 0, comments: 0 },
          comments: (prev[selectedItem.id]?.comments || 0) + 1
        }
      }));
      
      // Clear input
      setNewComment("");
    }
  };
  
  const handleInspiredByClick = async (item: Content, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to mark as inspiration",
        variant: "default",
      });
      return;
    }
    
    // Store inspiration in local storage before redirecting
    saveInspirationSource(item.id, item.title, item.type);
    
    // Redirect to upload page
    navigate('/upload');
  };
  
  const handleViewArtistProfile = (userId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    navigate(`/artist/${userId}`);
  };
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Discover</h1>
      
      <div className="sticky top-0 pb-2 pt-1 bg-background z-10">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search artworks & music..." 
            className="w-full pl-10" 
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredContent.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredContent.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleItemClick(item)}
              >
                <div className="aspect-square relative">
                  {item.type === 'artwork' && (item as Artwork).image_url ? (
                    <img 
                      src={(item as Artwork).image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : item.type === 'music' ? (
                    <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900">
                      <Music className="h-16 w-16 text-purple-500" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Image className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm truncate">{item.title}</h3>
                  <div 
                    className="flex items-center text-xs text-muted-foreground hover:underline"
                    onClick={(e) => handleViewArtistProfile(item.user_id, e)}
                  >
                    <span>By: {profiles[item.user_id]?.name || "Unknown Artist"}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {item.genre && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {item.genre}
                      </span>
                    )}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Heart className="h-3 w-3 mr-1 text-red-400" />
                      <span>{contentStats[item.id]?.likes || 0}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      <span>{contentStats[item.id]?.comments || 0}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-2 pt-0 flex justify-between">
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleLike(item, e)}
                    >
                      <Heart 
                        className={`h-4 w-4 ${likedContent[item.id] ? "fill-red-500 text-red-500" : ""}`} 
                      />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                        setActiveTab("comments");
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleInspiredByClick(item, e)}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 4L3 10M3 10L9 16M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleFollow(item.user_id, e)}
                    >
                      <UserPlus 
                        className={`h-4 w-4 ${followedUsers[item.user_id] ? "text-purple-500" : ""}`} 
                      />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : searchTerm.trim() !== "" ? (
          <div className="text-center py-8 text-muted-foreground">
            <SearchIcon className="h-10 w-10 mx-auto mb-2 text-muted" />
            <p>No content found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <GalleryHorizontal className="h-10 w-10 mx-auto mb-2 text-muted" />
            <p>No content has been uploaded yet</p>
          </div>
        )}
      </ScrollArea>
      
      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span className="truncate pr-4">{selectedItem?.title}</span>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </DialogTitle>
            {selectedItem && (
              <div className="flex items-center mt-1 text-sm text-muted-foreground">
                <Avatar className="h-5 w-5 mr-2">
                  {profiles[selectedItem.user_id]?.avatar_url ? (
                    <AvatarImage src={profiles[selectedItem.user_id].avatar_url || ''} />
                  ) : (
                    <AvatarFallback>
                      {getInitials(profiles[selectedItem.user_id]?.name || 'U')}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span 
                  className="cursor-pointer hover:underline"
                  onClick={() => handleViewArtistProfile(selectedItem.user_id)}
                >
                  {profiles[selectedItem.user_id]?.name || "Unknown Artist"}
                </span>
                {selectedItem.genre && (
                  <span className="ml-2 bg-muted px-2 py-0.5 rounded-full text-xs">
                    {selectedItem.genre}
                  </span>
                )}
              </div>
            )}
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "view" | "comments")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="comments">
                Comments ({comments.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="view" className="mt-2">
              {isArtwork && selectedItem && 'image_url' in selectedItem ? (
                <div className="flex justify-center">
                  <img 
                    src={(selectedItem as Artwork).image_url} 
                    alt={selectedItem.title} 
                    className="max-h-[70vh] w-auto object-contain rounded"
                  />
                </div>
              ) : selectedItem && 'audio_url' in selectedItem ? (
                <div className="space-y-4">
                  <div className="h-40 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded">
                    <Music className="h-20 w-20 text-purple-500" />
                  </div>
                  <audio 
                    ref={audioRef} 
                    src={(selectedItem as MusicTrack).audio_url} 
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center">
                    <Button onClick={handlePlayPause} className="px-8">
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                  </div>
                </div>
              ) : null}
              
              <div className="flex justify-between mt-4">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={likedContent[selectedItem?.id || ''] ? "text-red-500 border-red-500" : ""}
                    onClick={() => selectedItem && handleLike(selectedItem)}
                  >
                    <Heart 
                      className={`h-4 w-4 mr-2 ${likedContent[selectedItem?.id || ''] ? "fill-red-500" : ""}`} 
                    />
                    {likedContent[selectedItem?.id || ''] ? "Liked" : "Like"}
                    {selectedItem && (
                      <span className="ml-1">
                        ({contentStats[selectedItem.id]?.likes || 0})
                      </span>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab("comments")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comments
                    {selectedItem && (
                      <span className="ml-1">
                        ({contentStats[selectedItem.id]?.comments || 0})
                      </span>
                    )}
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedItem && handleInspiredByClick(selectedItem)}
                >
                  Get Inspired
                </Button>
              </div>
              
              {selectedItem?.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="comments" className="mt-2 space-y-4">
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Search;
