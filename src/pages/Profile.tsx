
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Settings, Music, Bell, Grid, List, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { fetchUserStats, fetchFollowers, fetchFollowing, getUnreadNotificationsCount } from "@/utils/databaseUtils";
import { UserStats, Profile as ProfileType, FollowConnection } from "@/types/social";
import NotificationsDialog from "@/components/NotificationsDialog";
import ProfileImageUpload from "@/components/ProfileImageUpload";

const DisplayMode = {
  GRID: 'grid',
  LIST: 'list'
};

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [musicTracks, setMusicTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postCount, setPostCount] = useState(0);
  const [stats, setStats] = useState<UserStats>({ totalLikes: 0, totalFollowers: 0, totalFollowing: 0 });
  const [isViewingFollowers, setIsViewingFollowers] = useState(false);
  const [isViewingFollowing, setIsViewingFollowing] = useState(false);
  const [followers, setFollowers] = useState<FollowConnection[]>([]);
  const [following, setFollowing] = useState<FollowConnection[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState(DisplayMode.GRID);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        setProfile(profileData);
        
        // Check for background image
        if (profileData.background_url) {
          setBackgroundImage(profileData.background_url);
        }
        
        // Fetch artworks
        const { data: artworksData, error: artworksError } = await supabase
          .from('artworks')
          .select('id, title, image_url, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (artworksError) throw artworksError;
        setArtworks(artworksData || []);
        
        // Fetch music tracks
        const { data: musicData, error: musicError } = await supabase
          .from('music_tracks')
          .select('id, title, audio_url, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (musicError) throw musicError;
        setMusicTracks(musicData || []);
        
        // Calculate total post count
        setPostCount((artworksData?.length || 0) + (musicData?.length || 0));
        
        // Fetch user stats
        const userStats = await fetchUserStats(user.id);
        setStats(userStats);
        
        // Check for unread notifications
        const unreadCount = await getUnreadNotificationsCount(user.id);
        setUnreadNotifications(unreadCount);
        
      } catch (error: any) {
        toast({
          title: "Error fetching profile",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
    
    // Set up polling for notifications
    const checkNotificationsInterval = setInterval(async () => {
      if (user) {
        const unreadCount = await getUnreadNotificationsCount(user.id);
        setUnreadNotifications(unreadCount);
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(checkNotificationsInterval);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  const handleViewFollowers = async () => {
    if (!user) return;
    
    try {
      const followerData = await fetchFollowers(user.id);
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
    if (!user) return;
    
    try {
      const followingData = await fetchFollowing(user.id);
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
  
  const handleViewProfile = (profileId: string) => {
    // Close dialog and navigate to profile if it's not the current user
    setIsViewingFollowers(false);
    setIsViewingFollowing(false);
    
    if (profileId !== user?.id) {
      navigate(`/artist/${profileId}`);
    }
  };
  
  const handleDeleteArtwork = async (artworkId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', artworkId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update artworks list
      setArtworks(prev => prev.filter(artwork => artwork.id !== artworkId));
      setPostCount(prev => prev - 1);
      
      toast({
        title: "Artwork deleted",
        description: "Your artwork has been deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting artwork",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const updateProfileImage = async (newUrl: string) => {
    if (!user) return;
    
    try {
      setIsUpdatingProfile(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: newUrl } : null);
      
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  
  const updateBackgroundImage = async (newUrl: string) => {
    if (!user) return;
    
    try {
      setIsUpdatingProfile(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ background_url: newUrl })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setBackgroundImage(newUrl);
      setProfile(prev => prev ? { ...prev, background_url: newUrl } : null);
      
    } catch (error: any) {
      toast({
        title: "Error updating background",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-[80vh]">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-[80vh]">Profile not found</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="relative">
        {/* Background Image */}
        <div className="h-32 bg-primary/10 relative">
          {backgroundImage ? (
            <img 
              src={backgroundImage} 
              alt="Profile background" 
              className="w-full h-full object-cover"
            />
          ) : null}
          
          <div className="absolute bottom-2 right-2">
            <ProfileImageUpload
              currentImageUrl={backgroundImage}
              onImageUpdated={updateBackgroundImage}
              type="background"
            />
          </div>
        </div>
        
        {/* Profile Info */}
        <div className="px-6 pb-6 flex flex-col items-center">
          <div className="relative -mt-12 mb-4">
            <Avatar className="h-24 w-24 border-4 border-background">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.name} />
              ) : (
                <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
              )}
            </Avatar>
            <div className="absolute bottom-0 right-0">
              <ProfileImageUpload
                currentImageUrl={profile.avatar_url || null}
                onImageUpdated={updateProfileImage}
                type="avatar"
              />
            </div>
          </div>
          
          <h1 className="text-xl font-bold">{profile.name}</h1>
          <p className="text-muted-foreground">{profile.artist_type} artist</p>
          
          <div className="flex gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setNotificationsOpen(true)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex justify-between">
          <div className="text-center">
            <div className="font-bold">{postCount}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div className="text-center cursor-pointer" onClick={handleViewFollowers}>
            <div className="font-bold">{stats.totalFollowers}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div className="text-center cursor-pointer" onClick={handleViewFollowing}>
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
        
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Recent Uploads</h2>
            
            <div className="flex gap-1">
              <Button 
                variant={displayMode === DisplayMode.GRID ? "default" : "outline"} 
                size="icon"
                className="h-8 w-8"
                onClick={() => setDisplayMode(DisplayMode.GRID)}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={displayMode === DisplayMode.LIST ? "default" : "outline"} 
                size="icon"
                className="h-8 w-8"
                onClick={() => setDisplayMode(DisplayMode.LIST)}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {artworks.length === 0 && musicTracks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              You haven't uploaded any content yet.
              <br />
              <Button 
                variant="link" 
                onClick={() => navigate('/upload')} 
                className="mt-2"
              >
                Get started by uploading your first creation
              </Button>
            </p>
          ) : (
            <div className="space-y-4">
              {artworks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Visual Art</h3>
                  
                  {displayMode === DisplayMode.GRID ? (
                    <div className="grid grid-cols-2 gap-2">
                      {artworks.map((artwork) => (
                        <div 
                          key={artwork.id} 
                          className="relative aspect-square rounded-md overflow-hidden group"
                        >
                          <img 
                            src={artwork.image_url}
                            alt={artwork.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-white rounded-full bg-black/30"
                              onClick={() => navigate(`/artwork/${artwork.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-white rounded-full bg-black/30"
                              onClick={() => setShowDeleteConfirm(artwork.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {artworks.map((artwork) => (
                        <div 
                          key={artwork.id}
                          className="flex items-center p-2 rounded-md border hover:bg-muted/50"
                        >
                          <div className="h-12 w-12 mr-3 rounded overflow-hidden">
                            <img 
                              src={artwork.image_url}
                              alt={artwork.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{artwork.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(artwork.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => navigate(`/artwork/${artwork.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => setShowDeleteConfirm(artwork.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {musicTracks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Music</h3>
                  <div className="space-y-2">
                    {musicTracks.slice(0, 3).map((track) => (
                      <div 
                        key={track.id} 
                        className="bg-muted/50 p-3 rounded-md flex items-center cursor-pointer"
                        onClick={() => navigate(`/search?highlight=${track.id}`)}
                      >
                        <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center mr-3">
                          <Music className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{track.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(track.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
                    className="flex items-center p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => handleViewProfile(follow.profile.id)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
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
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
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
                    className="flex items-center p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => handleViewProfile(follow.profile.id)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
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
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>Not following anyone yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Artwork</DialogTitle>
          </DialogHeader>
          
          <p>
            Are you sure you want to delete this artwork? This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDeleteArtwork(showDeleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Notifications */}
      {user && (
        <NotificationsDialog 
          open={notificationsOpen} 
          onOpenChange={setNotificationsOpen} 
          userId={user.id} 
        />
      )}
    </div>
  );
};

export default Profile;
