
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Welcome to Mobile App</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="overflow-hidden">
            <div className="bg-muted h-32 flex items-center justify-center">
              <span className="text-4xl">📱</span>
            </div>
            <CardContent className="p-3">
              <h3 className="font-medium">Feature {item}</h3>
              <p className="text-sm text-muted-foreground">
                Description for feature {item}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button className="mt-4 w-full">Get Started</Button>
    </div>
  );
};

export default Index;
