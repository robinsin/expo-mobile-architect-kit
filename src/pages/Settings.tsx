
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Moon, Bell, ShieldAlert, Globe } from "lucide-react";

const Settings: React.FC = () => {
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
              <Switch />
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
              <Switch />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-medium mb-2">Privacy</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-card rounded-md">
              <div className="flex items-center">
                <ShieldAlert className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>Privacy Settings</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex items-center justify-between p-2 bg-card rounded-md">
              <div className="flex items-center">
                <Globe className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>Language</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">English</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
