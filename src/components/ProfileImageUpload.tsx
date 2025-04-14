
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ProfileImageUploadProps {
  currentImageUrl: string | null;
  onImageUpdated: (newUrl: string) => void;
  type: "avatar" | "background";
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  currentImageUrl,
  onImageUpdated,
  type,
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Upload to Supabase Storage
      const fileName = `${type}_${user.id}_${Date.now()}`;
      const filePath = `${type}s/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from("profile_images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });
        
      if (error) throw error;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("profile_images")
        .getPublicUrl(filePath);
        
      if (publicUrlData) {
        // Update profile with new image URL
        onImageUpdated(publicUrlData.publicUrl);
        
        toast({
          title: "Image updated",
          description: `Your ${type} has been updated successfully`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      // Restore previous image preview on error
      setPreviewUrl(currentImageUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async () => {
    if (!user) return;
    
    try {
      setIsUploading(true);
      
      // Update profile with empty string to remove image
      onImageUpdated("");
      setPreviewUrl(null);
      
      toast({
        title: "Image removed",
        description: `Your ${type} has been removed`,
      });
    } catch (error: any) {
      toast({
        title: "Error removing image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {previewUrl ? (
        <div className="relative">
          <img 
            src={previewUrl} 
            alt={`Profile ${type}`} 
            className={`rounded-md object-cover ${type === 'avatar' ? 'w-24 h-24' : 'w-full h-32'}`}
          />
          <Button 
            variant="destructive" 
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 rounded-full"
            onClick={removeImage}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div 
          className={`flex items-center justify-center bg-muted ${
            type === 'avatar' ? 'w-24 h-24 rounded-full' : 'w-full h-32 rounded-md'
          }`}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex justify-center">
        <input
          type="file"
          id={`${type}-upload`}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <label
          htmlFor={`${type}-upload`}
          className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors 
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
            disabled:pointer-events-none disabled:opacity-50 
            ${previewUrl ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'} 
            h-9 px-3`}
        >
          {isUploading ? "Uploading..." : previewUrl ? "Change" : "Upload"}
        </label>
      </div>
    </div>
  );
};

export default ProfileImageUpload;
