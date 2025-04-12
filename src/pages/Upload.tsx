
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Paintbrush, Music, Upload as UploadIcon } from "lucide-react";

const Upload: React.FC = () => {
  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Share Your Creation</h1>
      
      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Paintbrush className="h-4 w-4" />
            Visual Art
          </TabsTrigger>
          <TabsTrigger value="music" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Music
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="visual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Visual Artwork</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
                  <UploadIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    JPG, PNG, SVG (max 10MB)
                  </p>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.svg" />
                  <Button size="sm" className="mt-4">Select File</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="music" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Music</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
                  <UploadIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    MP3, WAV (max 30MB)
                  </p>
                  <input type="file" className="hidden" accept=".mp3,.wav" />
                  <Button size="sm" className="mt-4">Select File</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Upload;
