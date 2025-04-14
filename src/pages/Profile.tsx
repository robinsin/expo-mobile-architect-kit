
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilIcon, Music, Heart, Users, Trash2, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Content, Profile as ProfileType } from "@/types/social";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import ProfileInfoEdit from "@/components/ProfileInfoEdit";
import GridViewToggle from "@/components/GridViewToggle";

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [likesCredit, setLikesCredit] = useState(0);
  const [likesPoints, setLikesPoints] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [gridView, setGridView] = useState<'single' | 'double'>('double');
  
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        setProfile(profileData);
        setLikesCredit(profileData.likes_credit ?? 5);
        setLikesPoints(profileData.likes_points ?? 0);
        
        // Fetch user's content
        const [artworksResponse, musicResponse] = await Promise.all([
          supabase
            .from('artworks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('music_tracks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ]);
        
        if (artworksResponse.error) throw artworksResponse.error;
        if (musicResponse.error) throw musicResponse.error;
        
        const artworks = (artworksResponse.data || []).map(artwork => ({
          ...artwork,
          type: 'artwork' as const
        }));
        
        const musicTracks = (musicResponse.data || []).map(track => ({
          ...track,
          type: 'music' as const
        }));
        
        setContent([...artworks, ...musicTracks]);
        
      } catch (error: any) {
        toast({
          title: "Error fetching profile",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);
  
  const handleUpdateProfile = (updatedProfile: ProfileType) => {
    setProfile(updatedProfile);
    setLikesCredit(updatedProfile.likes_credit ?? likesCredit);
    setLikesPoints(updatedProfile.likes_points ?? likesPoints);
  };
  
  const confirmDeleteContent = (content: Content) => {
    setContentToDelete(content);
    setShowDeleteDialog(true);
  };
  
  const handleDeleteContent = async () => {
    if (!contentToDelete) return;
    
    try {
      // Delete the content
      const { error } = await supabase
        .from(contentToDelete.type === 'artwork' ? 'artworks' : 'music_tracks')
        .delete()
        .eq('id', contentToDelete.id);
        
      if (error) throw error;
      
      // Remove from state
      setContent(prevContent => 
        prevContent.filter(item => item.id !== contentToDelete.id)
      );
      
      toast({
        title: "Content deleted",
        description: "Your content has been successfully deleted.",
      });
      
      setShowDeleteDialog(false);
      setContentToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error deleting content",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Profile Header */}
      <div className="relative">
        {/* Background Image */}
        <div className="h-32 bg-gradient-to-r from-purple-500 to-indigo-500 relative overflow-hidden">
          {profile?.background_url && (
            <img 
              src={profile.background_url} 
              alt="Background" 
              className="w-full h-full object-cover"
            />
          )}
          
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute top-2 right-2 bg-background/70 backdrop-blur-sm"
            onClick={() => setIsEditing(true)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Avatar positioned over the background */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
          <Avatar className="h-32 w-32 border-4 border-background">
            {profile?.avatar_url ? (
              <AvatarImage 
                src={profile.avatar_url} 
                alt={profile.name}
              />
            ) : (
              <AvatarFallback className="text-2xl">
                {getInitials(profile?.name || 'User')}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      </div>
      
      {/* Profile Info */}
      <div className="mt-20 text-center px-4">
        <div className="flex justify-center items-center">
          <h1 className="text-2xl font-bold">
            {profile?.name || user.user_metadata?.name || 'User'}
          </h1>
          <Button 
            size="icon" 
            variant="ghost" 
            className="ml-1"
            onClick={() => setIsEditingInfo(true)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground">{profile?.artist_type || 'Artist'}</p>
        {profile?.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        
        {/* User Stats */}
        <div className="flex justify-center space-x-8 mt-6">
          <div className="text-center">
            <div className="text-lg font-semibold">{content.length}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{likesPoints}</div>
            <div className="text-xs text-muted-foreground">Likes Received</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{likesCredit}</div>
            <div className="text-xs text-muted-foreground">Likes Credit</div>
          </div>
        </div>
        
        <div className="mt-6">
          <Button onClick={() => navigate('/upload')}>Upload New Content</Button>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      {/* Content Tabs */}
      <div className="px-4">
        <Tabs defaultValue="artwork">
          <div className="flex justify-between items-center">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="artwork">Artwork</TabsTrigger>
              <TabsTrigger value="music">Music</TabsTrigger>
            </TabsList>
            <GridViewToggle gridView={gridView} setGridView={setGridView} />
          </div>
          
          <TabsContent value="artwork">
            {loading ? (
              <div className={`grid ${gridView === 'double' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {Array(4).fill(0).map((_, i) => (
                  <Skeleton key={i} className="aspect-square h-40" />
                ))}
              </div>
            ) : content.filter(item => item.type === 'artwork').length > 0 ? (
              <div className={`grid ${gridView === 'double' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {content
                  .filter(item => item.type === 'artwork')
                  .map((artwork) => (
                    <Card
                      key={artwork.id}
                      className="overflow-hidden cursor-pointer relative group"
                      onClick={() => navigate(`/artwork/${artwork.id}`)}
                    >
                      <div className="aspect-square">
                        <img 
                          src={(artwork as any).image_url} 
                          alt={artwork.title}
                          className="w-full h-full object-cover"
                        />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                          <div className="p-2 text-white w-full">
                            <div className="font-medium text-sm truncate">{artwork.title}</div>
                            <div className="flex justify-between items-center mt-1">
                              <div className="flex items-center space-x-2">
                                <Heart className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-xs">0</span>
                              </div>
                              <Button
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 text-white hover:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteContent(artwork);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Image className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>You haven't uploaded any artwork yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/upload')}
                >
                  Upload Artwork
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="music">
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : content.filter(item => item.type === 'music').length > 0 ? (
              <div className="space-y-3">
                {content
                  .filter(item => item.type === 'music')
                  .map((track) => (
                    <Card 
                      key={track.id} 
                      className="relative overflow-hidden group"
                    >
                      <CardContent className="p-3 flex items-center">
                        <div className="flex-shrink-0 w-12 h-12 bg-primary/20 rounded-md flex items-center justify-center mr-3">
                          <Music className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{track.title}</h3>
                          <div className="text-xs text-muted-foreground">
                            {new Date(track.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/artwork/${track.id}`)}
                          >
                            <Music className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-red-400"
                            onClick={() => confirmDeleteContent(track)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                      
                      {/* Audio Preview */}
                      <div className="px-3 pb-3">
                        <audio 
                          src={(track as any).audio_url} 
                          controls 
                          className="w-full h-8"
                        />
                      </div>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Music className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>You haven't uploaded any music yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/upload')}
                >
                  Upload Music
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Profile Image Upload Dialog */}
      <ProfileImageUpload
        open={isEditing}
        onOpenChange={setIsEditing}
        userId={user.id}
        onUploadComplete={(imageUrl, type) => {
          if (type === 'avatar') {
            setProfile(prev => prev ? { ...prev, avatar_url: imageUrl } : null);
          } else {
            setProfile(prev => prev ? { ...prev, background_url: imageUrl } : null);
          }
        }}
      />
      
      {/* Profile Info Edit Dialog */}
      {profile && (
        <ProfileInfoEdit
          profile={profile}
          onProfileUpdate={handleUpdateProfile}
          open={isEditingInfo}
          onOpenChange={setIsEditingInfo}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {contentToDelete?.type === 'artwork' ? 'Artwork' : 'Music'}</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this {contentToDelete?.type === 'artwork' ? 'artwork' : 'music track'}? 
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteContent}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
