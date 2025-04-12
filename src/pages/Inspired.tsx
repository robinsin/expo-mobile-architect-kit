
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";

const Inspired: React.FC = () => {
  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Inspiration Connections</h1>
      
      <div className="flex items-center justify-center mb-8 text-gray-400">
        <Heart className="h-16 w-16 text-purple-400" />
      </div>
      
      <p className="text-center text-muted-foreground mb-8">
        Connect with other artists and explore the works that inspire each other.
      </p>
      
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't connected with any inspirations yet.</p>
            <p className="text-sm">Browse the discover page to find art and music that inspires you.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inspired;
