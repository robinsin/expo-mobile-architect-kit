
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface ProfileData {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  artist_type: string;
  website: string | null;
}

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
}

interface MusicTrack {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
}

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postCount, setPostCount] = useState(0);

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
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex justify-between">
          <div className="text-center">
            <div className="font-bold">{postCount}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="font-bold">0</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-bold">0</div>
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
                      <div key={artwork.id} className="relative aspect-square rounded-md overflow-hidden">
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
                        className="bg-muted/50 p-3 rounded-md flex items-center"
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
    </div>
  );
};

export default Profile;
