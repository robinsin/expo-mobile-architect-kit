
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { 
  Heart, 
  MessageSquare, 
  ArrowLeft, 
  Share2, 
  Trash2, 
  Link,
  UserPlus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  fetchComments, 
  fetchProfiles, 
  fetchUserLikes, 
  fetchUserFollows,
  likeContent,
  followUser,
  addComment,
  saveInspirationSource 
} from "@/utils/databaseUtils";
import { Comment, Content, Profile } from "@/types/social";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ArtworkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [artwork, setArtwork] = useState<Content | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [stats, setStats] = useState({ likes: 0, comments: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchArtwork = async () => {
      if (!id) return;
      
      try {
        // Try to fetch artwork
        const { data: artworkData, error: artworkError } = await supabase
          .from("artworks")
          .select("*")
          .eq("id", id)
          .single();
          
        if (artworkError) {
          // If artwork not found, try to fetch music track
          const { data: musicData, error: musicError } = await supabase
            .from("music_tracks")
            .select("*")
            .eq("id", id)
            .single();
            
          if (musicError) throw new Error("Content not found");
          
          setArtwork({ ...musicData, type: "music" });
          
          // Fetch creator profile
          const creatorProfile = await fetchProfiles([musicData.user_id]);
          setCreator(creatorProfile[musicData.user_id] || null);
        } else {
          setArtwork({ ...artworkData, type: "artwork" });
          
          // Fetch creator profile
          const creatorProfile = await fetchProfiles([artworkData.user_id]);
          setCreator(creatorProfile[artworkData.user_id] || null);
        }
        
        // Fetch like status if user is logged in
        if (user) {
          const userLikes = await fetchUserLikes(user.id);
          setIsLiked(!!userLikes[id]);
          
          // Fetch following status
          const userFollows = await fetchUserFollows(user.id);
          if (artwork?.user_id) {
            setIsFollowing(!!userFollows[artwork.user_id]);
          }
        }
        
        // Fetch comments
        await loadComments();
        
        // Fetch stats
        fetchStats();
      } catch (error: any) {
        toast({
          title: "Error loading content",
          description: error.message,
          variant: "destructive",
        });
        navigate(-1);
      }
    };
    
    fetchArtwork();
  }, [id, user]);

  const loadComments = async () => {
    if (!id) return;
    
    try {
      setIsLoadingComments(true);
      const commentsData = await fetchComments(id, artwork?.type || "artwork");
      setComments(commentsData);
      setStats(prev => ({ ...prev, comments: commentsData.length }));
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const fetchStats = async () => {
    if (!id) return;
    
    try {
      // Fetch likes count
      const { count: likesCount, error } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("content_id", id);
        
      if (!error) {
        setStats(prev => ({ ...prev, likes: likesCount || 0 }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLike = async () => {
    if (!user || !artwork) {
      if (!user) navigate("/auth");
      return;
    }
    
    const result = await likeContent(user.id, artwork, isLiked);
    setIsLiked(result);
    
    // Update likes count
    fetchStats();
  };

  const handleFollow = async () => {
    if (!user || !creator) {
      if (!user) navigate("/auth");
      return;
    }
    
    const result = await followUser(user.id, creator.id, isFollowing);
    setIsFollowing(result);
  };

  const handleSubmitComment = async () => {
    if (!user || !artwork || !newComment.trim()) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    const userProfile = user ? {
      id: user.id,
      name: user.user_metadata?.name || "User",
      avatar_url: user.user_metadata?.avatar_url,
    } as Profile : undefined;
    
    const comment = await addComment(
      user.id,
      artwork.id,
      artwork.type,
      newComment,
      userProfile
    );
    
    if (comment) {
      setComments(prev => [comment, ...prev]);
      setNewComment("");
      setStats(prev => ({ ...prev, comments: prev.comments + 1 }));
    }
  };

  const handleDelete = async () => {
    if (!user || !artwork) return;
    
    try {
      setIsDeleting(true);
      
      // Check if user owns the artwork
      if (user.id !== artwork.user_id) {
        toast({
          title: "Permission denied",
          description: "You can only delete your own content",
          variant: "destructive",
        });
        return;
      }
      
      // Delete artwork
      const { error } = await supabase
        .from(artwork.type === "artwork" ? "artworks" : "music_tracks")
        .delete()
        .eq("id", artwork.id);
        
      if (error) throw error;
      
      toast({
        title: "Content deleted",
        description: "Your content has been deleted successfully",
      });
      
      // Navigate back to profile
      navigate("/profile");
    } catch (error: any) {
      toast({
        title: "Error deleting content",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveAsInspiration = async () => {
    if (!artwork) return;
    
    const success = await saveInspirationSource(
      artwork.id,
      artwork.title,
      artwork.type
    );
    
    if (success) {
      toast({
        title: "Saved as inspiration",
        description: "Now you can create something inspired by this!",
      });
      
      // Navigate to upload page
      navigate("/upload");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase();
  };

  if (!artwork || !creator) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-3 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-medium">Artwork Details</h1>
      </div>
      
      {/* Artwork Image or Music Player */}
      <div className="w-full">
        {artwork.type === "artwork" ? (
          <img 
            src={artwork.image_url} 
            alt={artwork.title}
            className="w-full h-auto"
          />
        ) : (
          <div className="p-4 bg-muted/20 flex items-center justify-center h-48">
            <audio 
              src={artwork.audio_url} 
              controls 
              className="w-full"
            />
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex justify-between p-4">
        <div className="flex gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center"
            onClick={handleLike}
          >
            <Heart className={`h-6 w-6 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs mt-1">{stats.likes}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center"
            onClick={() => document.getElementById("comments-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            <MessageSquare className="h-6 w-6" />
            <span className="text-xs mt-1">{stats.comments}</span>
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveAsInspiration}
          >
            <Link className="h-5 w-5 mr-1" />
            Use as Inspiration
          </Button>
          
          {user && user.id === artwork.user_id && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Artwork Details */}
      <div className="p-4">
        <h2 className="text-xl font-bold">{artwork.title}</h2>
        
        <div className="flex items-center mt-3 mb-4">
          <Avatar 
            className="h-10 w-10 mr-3 cursor-pointer" 
            onClick={() => navigate(`/artist/${creator.id}`)}
          >
            {creator.avatar_url ? (
              <AvatarImage src={creator.avatar_url} alt={creator.name} />
            ) : (
              <AvatarFallback>{getInitials(creator.name)}</AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1">
            <div 
              className="font-medium cursor-pointer"
              onClick={() => navigate(`/artist/${creator.id}`)}
            >
              {creator.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(artwork.created_at)}
            </div>
          </div>
          
          {user && user.id !== creator.id && (
            <Button 
              variant={isFollowing ? "outline" : "default"} 
              size="sm"
              onClick={handleFollow}
            >
              {isFollowing ? "Following" : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>
        
        {artwork.description && (
          <p className="text-muted-foreground mb-4">{artwork.description}</p>
        )}
        
        {artwork.tags && artwork.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 mb-4">
            {artwork.tags.map((tag, i) => (
              <Badge key={i} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {artwork.genre && (
          <div className="text-sm mb-2">
            <span className="text-muted-foreground">Genre: </span>
            <span>{artwork.genre}</span>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Comments Section */}
      <div id="comments-section" className="p-4">
        <h3 className="text-lg font-medium mb-4">Comments ({stats.comments})</h3>
        
        {user ? (
          <div className="flex gap-3 mb-6">
            <Avatar className="h-8 w-8">
              {user.user_metadata?.avatar_url ? (
                <AvatarImage src={user.user_metadata.avatar_url} />
              ) : (
                <AvatarFallback>
                  {getInitials(user.user_metadata?.name || "User")}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-1 flex flex-col gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none"
              />
              
              <div className="self-end">
                <Button 
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 text-center py-3 bg-muted/20 rounded-md">
            <p className="text-muted-foreground mb-2">
              Sign in to leave a comment
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        )}
        
        {isLoadingComments ? (
          <div className="text-center py-4">Loading comments...</div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar 
                  className="h-8 w-8 cursor-pointer" 
                  onClick={() => navigate(`/artist/${comment.user_id}`)}
                >
                  {comment.user_profile?.avatar_url ? (
                    <AvatarImage src={comment.user_profile.avatar_url} />
                  ) : (
                    <AvatarFallback>
                      {getInitials(comment.user_profile?.name || "User")}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span 
                      className="font-medium cursor-pointer"
                      onClick={() => navigate(`/artist/${comment.user_id}`)}
                    >
                      {comment.user_profile?.name || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {artwork.type === "artwork" ? "Artwork" : "Music"}</DialogTitle>
          </DialogHeader>
          
          <p>
            Are you sure you want to delete this {artwork.type === "artwork" ? "artwork" : "music"}? 
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtworkDetail;
