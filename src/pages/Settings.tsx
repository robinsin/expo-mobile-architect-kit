
import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Moon, Bell, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface UserSettings {
  dark_mode: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  privacy_mode: "public" | "followers" | "private";
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    dark_mode: false,
    push_notifications: false,
    email_notifications: false,
    privacy_mode: "public"
  });
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const privacyForm = useForm({
    defaultValues: {
      privacy_mode: "public" as "public" | "followers" | "private"
    }
  });

  useEffect(() => {
    const getInitialTheme = () => {
      if (typeof window !== 'undefined') {
        return document.documentElement.classList.contains('dark');
      }
      return false;
    };
    
    const fetchSettings = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        // If settings exist, use them
        if (data) {
          setSettings({
            dark_mode: data.dark_mode || getInitialTheme(),
            push_notifications: data.push_notifications || false,
            email_notifications: data.email_notifications || false,
            privacy_mode: data.privacy_mode || "public"
          });
          
          privacyForm.setValue('privacy_mode', data.privacy_mode || "public");
        } else {
          // Create default settings
          const defaultSettings = {
            user_id: user.id,
            dark_mode: getInitialTheme(),
            push_notifications: false,
            email_notifications: false,
            privacy_mode: "public" as "public" | "followers" | "private"
          };
          
          const { error: insertError } = await supabase
            .from('user_settings')
            .insert(defaultSettings);
            
          if (insertError) throw insertError;
          
          setSettings(defaultSettings);
        }
      } catch (error: any) {
        toast({
          title: "Error loading settings",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [user, privacyForm]);

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user) return;
    
    try {
      // If the key is dark_mode, update the theme
      if (key === 'dark_mode') {
        if (value) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      // Update local state
      setSettings(prev => ({
        ...prev,
        [key]: value
      }));
      
      // Update in database
      const { error } = await supabase
        .from('user_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      toast({
        title: "Settings updated",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
      
      // Revert local state on error
      setSettings(prev => ({
        ...prev,
        [key]: !value
      }));
    }
  };

  const handlePrivacySubmit = async (formData: { privacy_mode: "public" | "followers" | "private" }) => {
    if (!user) return;
    
    try {
      // Update local state
      setSettings(prev => ({
        ...prev,
        privacy_mode: formData.privacy_mode
      }));
      
      // Update in database
      const { error } = await supabase
        .from('user_settings')
        .update({ privacy_mode: formData.privacy_mode })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      toast({
        title: "Privacy settings updated",
        variant: "default",
      });
      
      setPrivacyDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating privacy settings",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPrivacyText = () => {
    switch (settings.privacy_mode) {
      case "public":
        return "Everyone can see your content";
      case "followers":
        return "Only followers can see your content";
      case "private":
        return "Only you can see your content";
      default:
        return "Public";
    }
  };

  if (loading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-2">Appearance</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-card rounded-md">
              <div className="flex items-center">
                <Moon className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>Dark Mode</span>
              </div>
              <Switch 
                checked={settings.dark_mode} 
                onCheckedChange={(checked) => updateSetting('dark_mode', checked)}
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-medium mb-2">Notifications</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-card rounded-md">
              <div className="flex items-center">
                <Bell className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>Push Notifications</span>
              </div>
              <Switch 
                checked={settings.push_notifications}
                onCheckedChange={(checked) => updateSetting('push_notifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-card rounded-md">
              <div className="flex items-center">
                <svg 
                  className="h-5 w-5 mr-3 text-muted-foreground" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email Notifications</span>
              </div>
              <Switch 
                checked={settings.email_notifications}
                onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-medium mb-2">Privacy</h2>
          <div className="space-y-2">
            <div 
              className="flex items-center justify-between p-2 bg-card rounded-md cursor-pointer"
              onClick={() => setPrivacyDialogOpen(true)}
            >
              <div className="flex items-center">
                <ShieldAlert className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>Privacy Settings</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">
                  {getPrivacyText()}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Privacy Settings Dialog */}
      <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy Settings</DialogTitle>
            <DialogDescription>
              Choose who can view your content
            </DialogDescription>
          </DialogHeader>
          
          <Form {...privacyForm}>
            <form onSubmit={privacyForm.handleSubmit(handlePrivacySubmit)} className="space-y-4">
              <FormField
                control={privacyForm.control}
                name="privacy_mode"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-2 border p-3 rounded-md">
                          <RadioGroupItem value="public" id="public" />
                          <FormLabel htmlFor="public" className="font-normal cursor-pointer flex-1">
                            <div>Public</div>
                            <div className="text-xs text-muted-foreground">Everyone can see your content</div>
                          </FormLabel>
                        </div>
                        
                        <div className="flex items-center space-x-2 border p-3 rounded-md">
                          <RadioGroupItem value="followers" id="followers" />
                          <FormLabel htmlFor="followers" className="font-normal cursor-pointer flex-1">
                            <div>Followers Only</div>
                            <div className="text-xs text-muted-foreground">Only followers can see your content</div>
                          </FormLabel>
                        </div>
                        
                        <div className="flex items-center space-x-2 border p-3 rounded-md">
                          <RadioGroupItem value="private" id="private" />
                          <FormLabel htmlFor="private" className="font-normal cursor-pointer flex-1">
                            <div>Private</div>
                            <div className="text-xs text-muted-foreground">Only you can see your content</div>
                          </FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
