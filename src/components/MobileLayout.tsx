
import React from "react";
import { Outlet } from "react-router-dom";
import BottomNavigation from "./BottomNavigation";
import StatusBar from "./StatusBar";

const MobileLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <StatusBar />
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};

export default MobileLayout;
