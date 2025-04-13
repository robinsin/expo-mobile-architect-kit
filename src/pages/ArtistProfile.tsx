
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Music, User, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchUserProfile, 
  fetchUserStats, 
  fetchFollowers, 
  fetchFollowing,
  fetchUserFollows,
  followUser
} from "@/utils/databaseUtils";
import { Profile, Content, UserStats, FollowConnection } from "@/types/social";

const ArtistProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [artworks, setArtworks] = useState<Content[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalLikes: 0, totalFollowers: 0, totalFollowing: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isViewingFollowers, setIsViewingFollowers] = useState(false);
  const [isViewingFollowing, setIsViewingFollowing] = useState(false);
  const [followers, setFollowers] = useState<FollowConnection[]>([]);
  const [following, setFollowing] = useState<FollowConnection[]>([]);
  
  useEffect(() => {
    if (!userId) return;
    
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        // Load profile
        const profileData = await fetchUserProfile(userId);
        setProfile(profileData);
        
        // Load stats
        const statsData = await fetchUserStats(userId);
        setStats(statsData);
        
        // Check if current user is following this artist
        if (user) {
          const userFollows = await fetchUserFollows(user.id);
          setIsFollowing(!!userFollows[userId]);
        }
        
        // Fetch artist's content
        const { data: artworksData, error: artworksError } = await supabase
          .from('artworks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (artworksError) throw artworksError;
        
        const { data: musicData, error: musicError } = await supabase
          .from('music_tracks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (musicError) throw musicError;
        
        // Combine content
        const artworksWithType = artworksData?.map(art => ({ ...art, type: 'artwork' as const })) || [];
        const musicWithType = musicData?.map(track => ({ ...track, type: 'music' as const })) || [];
        
        setArtworks([...artworksWithType, ...musicWithType].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
        
      } catch (error: any) {
        toast({
          title: "Error loading profile",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, [userId, user]);
  
  const handleFollow = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to follow artists",
        variant: "default",
      });
      return;
    }
    
    if (!profile) return;
    
    const result = await followUser(user.id, profile.id, isFollowing);
    setIsFollowing(result);
    
    // Update follower count
    setStats(prev => ({
      ...prev,
      totalFollowers: result ? prev.totalFollowers + 1 : prev.totalFollowers - 1
    }));
  };
  
  const handleViewFollowers = async () => {
    if (!profile) return;
    
    try {
      const followerData = await fetchFollowers(profile.id);
      setFollowers(followerData);
      setIsViewingFollowers(true);
    } catch (error: any) {
      toast({
        title: "Error loading followers",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleViewFollowing = async () => {
    if (!profile) return;
    
    try {
      const followingData = await fetchFollowing(profile.id);
      setFollowing(followingData);
      setIsViewingFollowing(true);
    } catch (error: any) {
      toast({
        title: "Error loading following",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleViewContent = (content: Content) => {
    // Navigate to content view or open detail dialog
    navigate(`/search?highlight=${content.id}`);
  };
  
  const handleViewProfile = (profileId: string) => {
    // Close dialog and navigate to profile
    setIsViewingFollowers(false);
    setIsViewingFollowing(false);
    
    if (profileId !== userId) {
      navigate(`/artist/${profileId}`);
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex flex-col items-center">
          <Skeleton className="h-24 w-24 rounded-full mb-4" />
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        <div className="flex justify-between mt-4">
          <Skeleton className="h-16 w-20" />
          <Skeleton className="h-16 w-20" />
          <Skeleton className="h-16 w-20" />
        </div>
        
        <Skeleton className="h-10 w-full" />
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold">Artist not found</h1>
        <p className="mt-2 text-muted-foreground">
          This artist profile doesn't exist or has been removed.
        </p>
        <Button className="mt-4" onClick={() => navigate('/search')}>
          Back to Discover
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col">
      {/* Profile Header */}
      <div className="bg-primary/10 p-6 flex flex-col items-center">
        <Avatar className="h-24 w-24 mb-4">
          {profile.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile.name} />
          ) : (
            <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
          )}
        </Avatar>
        <h1 className="text-xl font-bold">{profile.name}</h1>
        <p className="text-muted-foreground">{profile.artist_type} artist</p>
        
        {user && user.id !== profile.id && (
          <Button 
            variant={isFollowing ? "default" : "outline"} 
            size="sm" 
            className="mt-4"
            onClick={handleFollow}
          >
            <Users className="h-4 w-4 mr-2" />
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </div>
      
      {/* Stats */}
      <div className="p-4 space-y-4">
        <div className="flex justify-between">
          <div className="text-center">
            <div className="font-bold">{artworks.length}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div 
            className="text-center cursor-pointer" 
            onClick={handleViewFollowers}
          >
            <div className="font-bold">{stats.totalFollowers}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div 
            className="text-center cursor-pointer" 
            onClick={handleViewFollowing}
          >
            <div className="font-bold">{stats.totalFollowing}</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </div>
        </div>
        
        <Separator />
        
        {profile.bio && (
          <div>
            <h2 className="font-semibold mb-2">About</h2>
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
            <Separator className="my-4" />
          </div>
        )}
        
        {/* Content Tabs */}
        <Tabs defaultValue="artwork">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="artwork">Artwork</TabsTrigger>
            <TabsTrigger value="music">Music</TabsTrigger>
          </TabsList>
          
          <TabsContent value="artwork">
            {artworks.filter(item => item.type === 'artwork').length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {artworks
                  .filter(item => item.type === 'artwork')
                  .map((artwork) => (
                    <div 
                      key={artwork.id} 
                      className="relative aspect-square rounded-md overflow-hidden cursor-pointer"
                      onClick={() => handleViewContent(artwork)}
                    >
                      <img 
                        src={(artwork as any).image_url} 
                        alt={artwork.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <div className="text-white text-sm font-medium truncate">{artwork.title}</div>
                        <div className="flex items-center">
                          <Heart className="h-3 w-3 text-red-400 mr-1" />
                          <span className="text-xs text-white">{Math.floor(Math.random() * 50)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No artwork has been uploaded yet</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="music">
            {artworks.filter(item => item.type === 'music').length > 0 ? (
              <div className="space-y-2">
                {artworks
                  .filter(item => item.type === 'music')
                  .map((track) => (
                    <div 
                      key={track.id} 
                      className="bg-muted/50 p-3 rounded-md flex items-center cursor-pointer"
                      onClick={() => handleViewContent(track)}
                    >
                      <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center mr-3">
                        <Music className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{track.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <span>{new Date(track.created_at).toLocaleDateString()}</span>
                          <div className="flex items-center ml-2">
                            <Heart className="h-3 w-3 text-red-400 mr-1" />
                            <span>{Math.floor(Math.random() * 30)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No music has been uploaded yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Followers Dialog */}
      <Dialog open={isViewingFollowers} onOpenChange={setIsViewingFollowers}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {followers.length > 0 ? (
              <div className="space-y-3 py-2">
                {followers.map(follow => (
                  <div 
                    key={follow.id} 
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => handleViewProfile(follow.profile.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {follow.profile.avatar_url ? (
                          <AvatarImage src={follow.profile.avatar_url} />
                        ) : (
                          <AvatarFallback>{getInitials(follow.profile.name)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium">{follow.profile.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {follow.profile.artist_type} artist
                        </div>
                      </div>
                    </div>
                    
                    {user && user.id !== follow.profile.id && (
                      <Button variant="outline" size="sm">
                        <User className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No followers yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Following Dialog */}
      <Dialog open={isViewingFollowing} onOpenChange={setIsViewingFollowing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {following.length > 0 ? (
              <div className="space-y-3 py-2">
                {following.map(follow => (
                  <div 
                    key={follow.id} 
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => handleViewProfile(follow.profile.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {follow.profile.avatar_url ? (
                          <AvatarImage src={follow.profile.avatar_url} />
                        ) : (
                          <AvatarFallback>{getInitials(follow.profile.name)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium">{follow.profile.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {follow.profile.artist_type} artist
                        </div>
                      </div>
                    </div>
                    
                    {user && user.id !== follow.profile.id && (
                      <Button variant="outline" size="sm">
                        <User className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Not following anyone yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistProfile;
