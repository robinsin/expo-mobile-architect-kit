
import React from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const Search: React.FC = () => {
  const dummyResults = Array(20).fill(0).map((_, i) => `Search Result ${i + 1}`);
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Search</h1>
      
      <div className="sticky top-0 pb-2 pt-1 bg-background z-10">
        <Input placeholder="Search..." className="w-full" />
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {dummyResults.map((result, index) => (
            <div 
              key={index} 
              className="p-3 bg-card rounded-md border"
            >
              {result}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Search;
