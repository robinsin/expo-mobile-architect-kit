
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, User, Heart, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Discover", path: "/search" },
    { icon: Upload, label: "Upload", path: "/upload" },
    { icon: Heart, label: "Inspired", path: "/inspired" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around">
      {navItems.map((item) => (
        <button
          key={item.path}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full",
            location.pathname === item.path ? "text-purple-500" : "text-muted-foreground"
          )}
          onClick={() => navigate(item.path)}
        >
          <item.icon className="h-5 w-5 mb-1" />
          <span className="text-xs">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomNavigation;
