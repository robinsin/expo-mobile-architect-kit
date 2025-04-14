
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Profile } from '@/types/social';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProfileInfoEditProps {
  profile: Profile;
  onProfileUpdate: (updatedProfile: Profile) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileInfoEdit: React.FC<ProfileInfoEditProps> = ({ 
  profile, 
  onProfileUpdate, 
  open, 
  onOpenChange 
}) => {
  const [name, setName] = useState(profile.name || '');
  const [artistType, setArtistType] = useState(profile.artist_type || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name,
          artist_type: artistType,
          bio
        })
        .eq('id', profile.id)
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        onProfileUpdate(data as Profile);
        toast({
          title: "Profile updated",
          description: "Your profile information has been updated successfully.",
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile Information</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right text-sm">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Your name"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="artistType" className="text-right text-sm">
              Artist Type
            </label>
            <Input
              id="artistType"
              value={artistType}
              onChange={(e) => setArtistType(e.target.value)}
              className="col-span-3"
              placeholder="Visual, Music, etc."
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="bio" className="text-right text-sm">
              Bio
            </label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="col-span-3"
              placeholder="A short description about yourself"
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileInfoEdit;
