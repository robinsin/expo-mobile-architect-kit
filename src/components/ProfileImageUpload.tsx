
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProfileImageUploadProps {
  userId: string;
  onUploadComplete: (imageUrl: string, type: "avatar" | "background") => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  userId,
  onUploadComplete,
  open,
  onOpenChange,
}) => {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "background") => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

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
      if (type === "avatar") {
        setIsUploadingAvatar(true);
      } else {
        setIsUploadingBackground(true);
      }
      
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      if (type === "avatar") {
        setAvatarPreview(objectUrl);
      } else {
        setBackgroundPreview(objectUrl);
      }
      
      // Upload to Supabase Storage
      const fileName = `${type}_${userId}_${Date.now()}`;
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
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            [type === "avatar" ? "avatar_url" : "background_url"]: publicUrlData.publicUrl
          })
          .eq('id', userId);
          
        if (updateError) throw updateError;
        
        onUploadComplete(publicUrlData.publicUrl, type);
        
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
      // Reset preview on error
      if (type === "avatar") {
        setAvatarPreview(null);
      } else {
        setBackgroundPreview(null);
      }
    } finally {
      if (type === "avatar") {
        setIsUploadingAvatar(false);
      } else {
        setIsUploadingBackground(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Profile Images</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Profile Picture</h3>
            <div className="flex flex-col items-center space-y-2">
              <div className={`w-24 h-24 rounded-full overflow-hidden ${!avatarPreview ? 'bg-muted flex items-center justify-center' : ''}`}>
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "avatar")}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
                <label
                  htmlFor="avatar-upload"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                >
                  {isUploadingAvatar ? "Uploading..." : "Upload Avatar"}
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Background Image</h3>
            <div className="flex flex-col items-center space-y-2">
              <div className={`w-full h-32 rounded-md overflow-hidden ${!backgroundPreview ? 'bg-muted flex items-center justify-center' : ''}`}>
                {backgroundPreview ? (
                  <img 
                    src={backgroundPreview} 
                    alt="Background Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              <div>
                <input
                  type="file"
                  id="background-upload"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "background")}
                  className="hidden"
                  disabled={isUploadingBackground}
                />
                <label
                  htmlFor="background-upload"
                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                >
                  {isUploadingBackground ? "Uploading..." : "Upload Background"}
                </label>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileImageUpload;
