
import React from "react";

const StatusBar: React.FC = () => {
  return (
    <div className="h-12 flex items-center justify-between px-4 bg-background border-b">
      <div className="text-lg font-semibold">Mobile App</div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-green-500"></div>
      </div>
    </div>
  );
};

export default StatusBar;
