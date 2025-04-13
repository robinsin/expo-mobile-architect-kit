
import React from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface GenreSelectProps {
  type: 'visual' | 'music';
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const GenreSelect: React.FC<GenreSelectProps> = ({ 
  type, 
  value, 
  onChange, 
  label = "Genre" 
}) => {
  const visualGenres = [
    "Abstract", 
    "Portrait", 
    "Landscape", 
    "Still Life", 
    "Conceptual", 
    "Digital Art", 
    "Photography", 
    "Sculpture", 
    "Installation", 
    "Mixed Media",
    "Illustration",
    "Comics",
    "Pixel Art",
    "3D Rendering",
    "Other"
  ];
  
  const musicGenres = [
    "Pop", 
    "Rock", 
    "Hip Hop", 
    "R&B", 
    "Jazz", 
    "Classical", 
    "Electronic", 
    "Ambient", 
    "Folk", 
    "Country",
    "Indie",
    "Metal",
    "Blues",
    "Experimental",
    "Lo-fi",
    "Other"
  ];
  
  const genres = type === 'visual' ? visualGenres : musicGenres;
  
  return (
    <div className="space-y-2">
      <Label htmlFor="genre">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="genre">
          <SelectValue placeholder="Select a genre" />
        </SelectTrigger>
        <SelectContent>
          {genres.map((genre) => (
            <SelectItem key={genre} value={genre}>
              {genre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default GenreSelect;
