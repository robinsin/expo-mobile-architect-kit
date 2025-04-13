
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Music, Image, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Inspiration {
  id: string;
  source_id: string;
  source_type: string;
  inspired_id: string;
  inspired_type: string;
  created_at: string;
  source_item?: {
    id: string;
    title: string;
    user_id: string;
    image_url?: string;
    audio_url?: string;
  };
  inspired_item?: {
    id: string;
    title: string;
    user_id: string;
    image_url?: string;
    audio_url?: string;
  };
  source_user?: {
    name: string;
    avatar_url: string | null;
  };
  inspired_user?: {
    name: string;
    avatar_url: string | null;
  };
}

const Inspired: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);

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
          const enhancedInspirations = await Promise.all(
            data.map(async (inspiration) => {
              let sourceItem;
              let inspiredItem;
              let sourceUserData;
              let inspiredUserData;
              
              // Fetch source item details
              if (inspiration.source_type === 'artwork') {
                const { data: artworkData } = await supabase
                  .from('artworks')
                  .select('id, title, image_url, user_id')
                  .eq('id', inspiration.source_id)
                  .single();
                  
                sourceItem = artworkData;
                
                if (artworkData) {
                  const { data: userData } = await supabase
                    .from('profiles')
                    .select('name, avatar_url')
                    .eq('id', artworkData.user_id)
                    .single();
                    
                  sourceUserData = userData;
                }
              } else if (inspiration.source_type === 'music') {
                const { data: musicData } = await supabase
                  .from('music_tracks')
                  .select('id, title, audio_url, user_id')
                  .eq('id', inspiration.source_id)
                  .single();
                  
                sourceItem = musicData;
                
                if (musicData) {
                  const { data: userData } = await supabase
                    .from('profiles')
                    .select('name, avatar_url')
                    .eq('id', musicData.user_id)
                    .single();
                    
                  sourceUserData = userData;
                }
              }
              
              // Fetch inspired item details
              if (inspiration.inspired_type === 'artwork') {
                const { data: artworkData } = await supabase
                  .from('artworks')
                  .select('id, title, image_url, user_id')
                  .eq('id', inspiration.inspired_id)
                  .single();
                  
                inspiredItem = artworkData;
                
                if (artworkData) {
                  const { data: userData } = await supabase
                    .from('profiles')
                    .select('name, avatar_url')
                    .eq('id', artworkData.user_id)
                    .single();
                    
                  inspiredUserData = userData;
                }
              } else if (inspiration.inspired_type === 'music') {
                const { data: musicData } = await supabase
                  .from('music_tracks')
                  .select('id, title, audio_url, user_id')
                  .eq('id', inspiration.inspired_id)
                  .single();
                  
                inspiredItem = musicData;
                
                if (musicData) {
                  const { data: userData } = await supabase
                    .from('profiles')
                    .select('name, avatar_url')
                    .eq('id', musicData.user_id)
                    .single();
                    
                  inspiredUserData = userData;
                }
              }
              
              return {
                ...inspiration,
                source_item: sourceItem,
                inspired_item: inspiredItem,
                source_user: sourceUserData,
                inspired_user: inspiredUserData
              };
            })
          );
          
          setInspirations(enhancedInspirations.filter(
            item => item.source_item && item.inspired_item
          ));
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
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const handleViewContent = (id: string, type: string) => {
    // In a real app, you might navigate to a detailed view
    // For now we'll just show a toast
    toast({
      title: "View Content",
      description: `Viewing ${type} with ID ${id}`,
    });
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
            <Card key={inspiration.id} className="overflow-hidden">
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
                  <div 
                    className="flex-1 flex flex-col items-center p-2 rounded-md cursor-pointer hover:bg-muted/50"
                    onClick={() => inspiration.source_item && handleViewContent(inspiration.source_item.id, inspiration.source_type)}
                  >
                    <div className="relative w-full aspect-square max-w-[180px] mb-2 rounded-md overflow-hidden bg-muted">
                      {inspiration.source_type === 'artwork' && inspiration.source_item?.image_url ? (
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
                    
                    <div className="flex items-center mt-1">
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
                        By: {inspiration.source_user?.name || "Unknown"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Connection Icon */}
                  <div className="py-2">
                    <Link2 className="h-6 w-6 rotate-90 md:rotate-0 text-purple-400" />
                  </div>
                  
                  {/* Inspired Content */}
                  <div 
                    className="flex-1 flex flex-col items-center p-2 rounded-md cursor-pointer hover:bg-muted/50"
                    onClick={() => inspiration.inspired_item && handleViewContent(inspiration.inspired_item.id, inspiration.inspired_type)}
                  >
                    <div className="relative w-full aspect-square max-w-[180px] mb-2 rounded-md overflow-hidden bg-muted">
                      {inspiration.inspired_type === 'artwork' && inspiration.inspired_item?.image_url ? (
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
                    
                    <div className="flex items-center mt-1">
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
                        By: {inspiration.inspired_user?.name || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
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
    </div>
  );
};

export default Inspired;
