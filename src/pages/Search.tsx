
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, GalleryHorizontal, Search as SearchIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
  user_id: string;
}

const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredArtworks, setFilteredArtworks] = useState<Artwork[]>([]);
  
  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setArtworks(data || []);
        setFilteredArtworks(data || []);
      } catch (error: any) {
        toast({
          title: "Error fetching artworks",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchArtworks();
  }, []);
  
  // Filter artworks based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredArtworks(artworks);
    } else {
      const filtered = artworks.filter(artwork => 
        artwork.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredArtworks(filtered);
    }
  }, [searchTerm, artworks]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Discover</h1>
      
      <div className="sticky top-0 pb-2 pt-1 bg-background z-10">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search artworks..." 
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
        ) : filteredArtworks.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredArtworks.map((artwork) => (
              <Card key={artwork.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  {artwork.image_url ? (
                    <img 
                      src={artwork.image_url} 
                      alt={artwork.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Image className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm truncate">{artwork.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(artwork.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchTerm.trim() !== "" ? (
          <div className="text-center py-8 text-muted-foreground">
            <SearchIcon className="h-10 w-10 mx-auto mb-2 text-muted" />
            <p>No artworks found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <GalleryHorizontal className="h-10 w-10 mx-auto mb-2 text-muted" />
            <p>No artworks have been uploaded yet</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default Search;
