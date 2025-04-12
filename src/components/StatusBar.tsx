
import React from "react";
import { PaintBrush, Music } from "lucide-react";

const StatusBar: React.FC = () => {
  return (
    <div className="h-14 flex items-center justify-between px-4 bg-background border-b">
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <PaintBrush className="w-5 h-5 text-purple-500" />
          <Music className="w-5 h-5 text-purple-500" />
        </div>
        <div className="text-lg font-semibold">Inspyr Art</div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-green-500"></div>
      </div>
    </div>
  );
};

export default StatusBar;
