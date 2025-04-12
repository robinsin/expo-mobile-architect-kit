
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, GalleryHorizontal, Search as SearchIcon, Music, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
  user_id: string;
}

interface MusicTrack {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
  user_id: string;
  duration: number;
}

type Content = Artwork | MusicTrack & { type: 'artwork' | 'music' };

const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allContent, setAllContent] = useState<(Artwork | MusicTrack & { type: string })[]>([]);
  const [filteredContent, setFilteredContent] = useState<(Artwork | MusicTrack & { type: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<(Artwork | MusicTrack) | null>(null);
  const [isArtwork, setIsArtwork] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
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
        const artworksWithType = artworks?.map(art => ({ ...art, type: 'artwork' })) || [];
        const musicWithType = musicTracks?.map(track => ({ ...track, type: 'music' })) || [];
        
        // Combine both types of content and sort by creation date
        const combined = [...artworksWithType, ...musicWithType].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setAllContent(combined);
        setFilteredContent(combined);
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
  }, []);
  
  // Filter content based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredContent(allContent);
    } else {
      const filtered = allContent.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContent(filtered);
    }
  }, [searchTerm, allContent]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleItemClick = (item: Artwork | MusicTrack & { type: string }) => {
    setSelectedItem(item);
    setIsArtwork(item.type === 'artwork');
    
    // Reset audio state if selecting a new music track
    if (item.type === 'music') {
      setIsPlaying(false);
    }
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
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                    {item.type === 'music' && (
                      <p className="text-xs text-purple-500 flex items-center">
                        <Music className="h-3 w-3 mr-1" />
                        {formatDuration((item as MusicTrack).duration)}
                      </p>
                    )}
                  </div>
                </CardContent>
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
          </DialogHeader>
          
          <div className="mt-2">
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
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Created on {selectedItem && new Date(selectedItem.created_at).toLocaleDateString()}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Search;
