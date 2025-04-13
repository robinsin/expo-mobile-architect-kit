
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Settings, Music, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { fetchUserStats, fetchFollowers, fetchFollowing, getUnreadNotificationsCount } from "@/utils/databaseUtils";
import { UserStats, Profile as ProfileType, FollowConnection } from "@/types/social";
import NotificationsDialog from "@/components/NotificationsDialog";

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

  if (isLoading) {
    return <div className="flex justify-center items-center h-[80vh]">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-[80vh]">Profile not found</div>;
  }

  return (
    <div className="flex flex-col">
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
          <h2 className="font-semibold mb-2">Recent Uploads</h2>
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
                  <div className="grid grid-cols-2 gap-2">
                    {artworks.slice(0, 4).map((artwork) => (
                      <div 
                        key={artwork.id} 
                        className="relative aspect-square rounded-md overflow-hidden cursor-pointer"
                        onClick={() => navigate(`/search?highlight=${artwork.id}`)}
                      >
                        <img 
                          src={artwork.image_url}
                          alt={artwork.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
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
