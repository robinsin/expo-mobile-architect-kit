
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const Profile: React.FC = () => {
  return (
    <div className="flex flex-col">
      <div className="bg-primary/10 p-6 flex flex-col items-center">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarImage src="" alt="Profile" />
          <AvatarFallback>👤</AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-bold">John Doe</h1>
        <p className="text-muted-foreground">@johndoe</p>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex justify-between">
          <div className="text-center">
            <div className="font-bold">250</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="font-bold">12.5k</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-bold">1,865</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="font-semibold mb-2">About</h2>
          <p className="text-sm text-muted-foreground">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.
          </p>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="font-semibold mb-2">Recent Activity</h2>
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-muted/50 p-3 rounded-md">
                Activity item {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
