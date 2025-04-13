
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Paintbrush, Music, Upload as UploadIcon, Loader2, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import GenreSelect from "@/components/GenreSelect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InspiredBy {
  id: string;
  title: string;
  type: string;
}

const Upload: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [genre, setGenre] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'visual' | 'music'>('visual');
  const [inspiredBy, setInspiredBy] = useState<InspiredBy | null>(null);
  const visualFileInputRef = useRef<HTMLInputElement>(null);
  const musicFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for inspired by data in localStorage
    const inspiredData = localStorage.getItem('inspired_by');
    if (inspiredData) {
      try {
        const parsed = JSON.parse(inspiredData) as InspiredBy;
        setInspiredBy(parsed);
        // Clear localStorage after retrieving
        localStorage.removeItem('inspired_by');
      } catch (e) {
        // Invalid JSON, clear it
        localStorage.removeItem('inspired_by');
      }
    }
  }, []);

  const handleTabChange = (value: string) => {
    setUploadType(value as 'visual' | 'music');
    setSelectedFile(null);
    setGenre("");  // Reset genre when changing tabs
  };

  const handleFileSelection = (type: 'visual' | 'music') => {
    if (type === 'visual' && visualFileInputRef.current) {
      visualFileInputRef.current.click();
    } else if (type === 'music' && musicFileInputRef.current) {
      musicFileInputRef.current.click();
    }
  };

  const handleVisualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleMusicFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFile = async (type: 'visual' | 'music') => {
    if (!selectedFile || !user) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create a unique file path including the user ID
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const bucketName = type === 'visual' ? 'artwork-images' : 'music-files';
      
      // Set up upload options
      const options = {
        cacheControl: '3600',
        upsert: false
      };
      
      // Use XMLHttpRequest to track progress manually
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });
      
      // Upload the file to storage
      const { error: uploadError, data } = await supabase.storage
        .from(bucketName)
        .upload(fileName, selectedFile, options);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
        
      // Insert record into the appropriate table
      if (type === 'visual') {
        const { error: insertError } = await supabase
          .from('artworks')
          .insert({
            title: title,
            description: description,
            tags: tags.split(',').map(tag => tag.trim()),
            image_url: publicUrl,
            user_id: user.id,
            genre: genre || undefined
          });
          
        if (insertError) throw insertError;
        
        // If this was inspired by another work, create the inspiration relationship
        if (inspiredBy) {
          const { error: inspiredError } = await supabase
            .from('inspirations')
            .insert({
              source_id: inspiredBy.id,
              source_type: inspiredBy.type,
              inspired_id: data?.path || '', // This might need to be adjusted to get the actual ID
              inspired_type: 'artwork'
            });
            
          if (inspiredError) throw inspiredError;
        }
      } else {
        // Duration calculation for audio is approximated here
        // In a real app, you might want to analyze the audio file to get the actual duration
        const approximateDuration = 180; // 3 minutes in seconds
        
        const { error: insertError } = await supabase
          .from('music_tracks')
          .insert({
            title: title,
            description: description,
            tags: tags.split(',').map(tag => tag.trim()),
            audio_url: publicUrl,
            user_id: user.id,
            duration: approximateDuration,
            genre: genre || undefined
          });
          
        if (insertError) throw insertError;
        
        // If this was inspired by another work, create the inspiration relationship
        if (inspiredBy) {
          const { error: inspiredError } = await supabase
            .from('inspirations')
            .insert({
              source_id: inspiredBy.id,
              source_type: inspiredBy.type,
              inspired_id: data?.path || '', // This might need to be adjusted to get the actual ID
              inspired_type: 'music'
            });
            
          if (inspiredError) throw inspiredError;
        }
      }
      
      toast({
        title: "Upload successful",
        description: "Your creation has been uploaded successfully",
      });
      
      // Reset form
      setTitle("");
      setDescription("");
      setTags("");
      setGenre("");
      setSelectedFile(null);
      setUploadProgress(0);
      setInspiredBy(null);
      
      // Redirect to profile page
      navigate('/profile');
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeInspiration = () => {
    setInspiredBy(null);
    localStorage.removeItem('inspired_by');
  };

  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Share Your Creation</h1>
      
      {inspiredBy && (
        <Alert className="mb-4">
          <AlertTitle className="flex items-center">
            <Link className="h-4 w-4 mr-2" />
            Inspired Creation
          </AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>
              This upload will be linked as inspired by "{inspiredBy.title}"
            </span>
            <Button variant="ghost" size="sm" onClick={removeInspiration}>
              Remove Link
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={uploadType} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Paintbrush className="h-4 w-4" />
            Visual Art
          </TabsTrigger>
          <TabsTrigger value="music" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Music
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="visual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Visual Artwork</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter artwork title" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your artwork" 
                    rows={3}
                  />
                </div>
                
                <GenreSelect 
                  type="visual" 
                  value={genre} 
                  onChange={setGenre} 
                />
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input 
                    id="tags" 
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="abstract, digital, portrait" 
                  />
                </div>
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 transition-colors ${
                    selectedFile ? 'border-green-500' : 'border-gray-300'
                  }`}
                  onClick={() => handleFileSelection('visual')}
                >
                  {selectedFile ? (
                    <div className="text-center">
                      <div className="text-green-500 mb-2">File selected:</div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <UploadIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        JPG, PNG, SVG (max 10MB)
                      </p>
                    </>
                  )}
                  <input 
                    ref={visualFileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".jpg,.jpeg,.png,.svg" 
                    onChange={handleVisualFileChange}
                  />
                </div>
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                <Button 
                  onClick={() => uploadFile('visual')} 
                  disabled={!selectedFile || !title || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Upload Artwork
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="music" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Music</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="musicTitle">Title</Label>
                  <Input 
                    id="musicTitle" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter track title" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="musicDescription">Description</Label>
                  <Textarea 
                    id="musicDescription" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your music" 
                    rows={3}
                  />
                </div>
                
                <GenreSelect 
                  type="music" 
                  value={genre} 
                  onChange={setGenre} 
                />
                
                <div className="space-y-2">
                  <Label htmlFor="musicTags">Tags (comma separated)</Label>
                  <Input 
                    id="musicTags" 
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="electronic, ambient, jazz" 
                  />
                </div>
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 transition-colors ${
                    selectedFile ? 'border-green-500' : 'border-gray-300'
                  }`}
                  onClick={() => handleFileSelection('music')}
                >
                  {selectedFile ? (
                    <div className="text-center">
                      <div className="text-green-500 mb-2">File selected:</div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <UploadIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        MP3, WAV (max 30MB)
                      </p>
                    </>
                  )}
                  <input 
                    ref={musicFileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".mp3,.wav" 
                    onChange={handleMusicFileChange}
                  />
                </div>
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                <Button 
                  onClick={() => uploadFile('music')} 
                  disabled={!selectedFile || !title || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Upload Music
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Upload;
